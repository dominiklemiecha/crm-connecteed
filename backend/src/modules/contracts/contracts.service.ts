import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, ContractSignature, ContractStatus, SignatureStatus } from './contract.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalType } from '../approvals/approval.entity';
import { Invoice, InvoiceType, InvoiceStatus } from '../invoices/invoice.entity';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';
import { DocuSignService } from '../docusign/docusign.service';

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [ContractStatus.AWAITING_CEO],
  [ContractStatus.AWAITING_CEO]: [ContractStatus.READY_TO_SIGN, ContractStatus.DRAFT],
  [ContractStatus.READY_TO_SIGN]: [ContractStatus.SIGNING, ContractStatus.VOID],
  [ContractStatus.SIGNING]: [ContractStatus.SIGNED, ContractStatus.VOID],
  [ContractStatus.SIGNED]: [],
  [ContractStatus.VOID]: [],
};

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(ContractSignature)
    private readonly signatureRepo: Repository<ContractSignature>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly notificationTriggers: NotificationTriggerService,
    private readonly docuSignService: DocuSignService,
  ) {}

  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.contractRepo.count({ where: { tenantId } });
    return `C-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: Partial<Contract>): Promise<Contract> {
    const contractNumber = await this.generateContractNumber(tenantId);
    const contract = this.contractRepo.create({
      ...dto,
      tenantId,
      contractNumber,
      status: ContractStatus.DRAFT,
      createdBy: userId,
    });
    const saved = await this.contractRepo.save(contract);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { contractNumber, status: ContractStatus.DRAFT } as any,
    });

    return saved;
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Contract>> {
    const [data, total] = await this.contractRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id, tenantId },
      relations: ['signatures'],
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<Contract>,
  ): Promise<Contract> {
    const contract = await this.findById(tenantId, id);
    const oldValues = { ...contract };
    Object.assign(contract, dto);
    const saved = await this.contractRepo.save(contract);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const contract = await this.findById(tenantId, id);
    await this.contractRepo.remove(contract);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  async transitionStatus(
    tenantId: string,
    userId: string,
    id: string,
    newStatus: ContractStatus,
    extra?: Partial<Contract>,
  ): Promise<Contract> {
    const contract = await this.findById(tenantId, id);
    const allowed = ALLOWED_TRANSITIONS[contract.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition contract from ${contract.status} to ${newStatus}`,
      );
    }

    const oldStatus = contract.status;
    contract.status = newStatus;

    if (newStatus === ContractStatus.SIGNED) {
      contract.signedAt = new Date();
    }
    if (extra) Object.assign(contract, extra);

    const saved = await this.contractRepo.save(contract);

    // Auto-create approval when moving to AWAITING_CEO
    if (newStatus === ContractStatus.AWAITING_CEO) {
      try {
        await this.approvalsService.create(tenantId, userId, {
          type: ApprovalType.CONTRACT,
          entityId: id,
          requestedBy: userId,
        });
      } catch (err) {
        this.logger.error(`Failed to create contract approval: ${err.message}`);
      }
      try {
        await this.notificationTriggers.onContractAwaitingCEO(tenantId, id, saved.contractNumber);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // Send to DocuSign when contract enters SIGNING status
    if (newStatus === ContractStatus.SIGNING) {
      try {
        // Build a minimal PDF buffer from the contract's pdf path or generate one
        const fs = await import('fs');
        const path = await import('path');
        let pdfBuffer: Buffer;
        if (saved.pdfPath && fs.existsSync(saved.pdfPath)) {
          pdfBuffer = fs.readFileSync(saved.pdfPath);
        } else {
          // Use an empty placeholder PDF if no file exists yet
          pdfBuffer = Buffer.from('%PDF-1.4 placeholder', 'utf-8');
          this.logger.warn(`Contract ${saved.contractNumber} has no PDF file — using placeholder for DocuSign`);
        }

        // Get the first signer from signatures, or use a fallback
        const signatures = await this.signatureRepo.find({ where: { contractId: id, tenantId } });
        const signer = signatures[0];
        const signerEmail = signer?.signerEmail || 'signer@example.com';
        const signerName = signer?.signerName || 'Signer';

        const { envelopeId } = await this.docuSignService.createEnvelope(
          pdfBuffer,
          signerEmail,
          signerName,
          `Contract ${saved.contractNumber} — Signature Required`,
        );

        // Persist the envelopeId on the contract
        saved.docusignEnvelopeId = envelopeId;
        await this.contractRepo.save(saved);
        this.logger.log(`DocuSign envelope ${envelopeId} created for contract ${saved.contractNumber}`);
      } catch (err) {
        this.logger.error(`Failed to create DocuSign envelope for contract ${saved.contractNumber}: ${err.message}`);
      }
    }

    // Notify when contract is ready to sign
    if (newStatus === ContractStatus.READY_TO_SIGN) {
      try {
        await this.notificationTriggers.onContractReadyToSign(tenantId, id, saved.contractNumber);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // Notify when contract is signed
    if (newStatus === ContractStatus.SIGNED) {
      try {
        await this.notificationTriggers.onContractSigned(tenantId, id, saved.contractNumber, saved.createdBy);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // Auto-create proforma invoice when contract is signed
    if (newStatus === ContractStatus.SIGNED) {
      try {
        const year = new Date().getFullYear();
        const invoiceCount = await this.invoiceRepo.count({ where: { tenantId } });
        const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(5, '0')}`;
        // Get total from linked quote if available
        let totalCents = 0;
        if (saved.quoteId) {
          const quoteRow = await this.invoiceRepo.query(
            `SELECT total_cents FROM quotes WHERE id = $1`, [saved.quoteId],
          );
          if (quoteRow?.[0]) totalCents = Number(quoteRow[0].total_cents) || 0;
        }
        const proforma = this.invoiceRepo.create({
          tenantId,
          invoiceNumber,
          type: InvoiceType.PROFORMA,
          contractId: saved.id,
          opportunityId: saved.opportunityId,
          companyId: saved.companyId,
          status: InvoiceStatus.DRAFT,
          subtotalCents: totalCents,
          totalCents: totalCents,
          createdBy: userId,
        } as Partial<Invoice>);
        const savedProforma = await this.invoiceRepo.save(proforma);
        this.logger.log(`Auto-created proforma invoice ${invoiceNumber} from signed contract ${saved.contractNumber}`);

        // Copy quote items to invoice items
        if (saved.quoteId) {
          try {
            const versionRows = await this.invoiceRepo.query(
              `SELECT id FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC LIMIT 1`,
              [saved.quoteId],
            );
            if (versionRows?.[0]?.id) {
              await this.invoiceRepo.query(
                `INSERT INTO invoice_items (id, tenant_id, invoice_id, description, quantity, unit_price_cents, tax_rate, total_cents)
                 SELECT gen_random_uuid(), $1, $2, description, quantity, unit_price_cents, 22, total_cents
                 FROM quote_items WHERE quote_version_id = $3`,
                [tenantId, savedProforma.id, versionRows[0].id],
              );
            }
          } catch (itemErr) {
            this.logger.error(`Failed to copy quote items to proforma: ${itemErr.message}`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to create proforma invoice: ${err.message}`);
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract',
      entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: oldStatus } as any,
      newValues: { status: newStatus } as any,
    });

    return saved;
  }

  generatePdfPath(tenantId: string, contractId: string): string {
    // Placeholder: real implementation would render a PDF template and save to disk
    return `uploads/${tenantId}/contracts/${contractId}/contract.pdf`;
  }

  async assignPdfPath(tenantId: string, userId: string, id: string): Promise<Contract> {
    const pdfPath = this.generatePdfPath(tenantId, id);
    return this.update(tenantId, userId, id, { pdfPath });
  }

  // ─── Signatures ──────────────────────────────────────────────────────────

  async addSignature(
    tenantId: string,
    userId: string,
    contractId: string,
    dto: Partial<ContractSignature>,
  ): Promise<ContractSignature> {
    await this.findById(tenantId, contractId);
    const signature = this.signatureRepo.create({ ...dto, tenantId, contractId });
    const saved = await this.signatureRepo.save(signature);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract_signature',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { contractId, signerEmail: dto.signerEmail } as any,
    });

    return saved;
  }

  async updateSignatureStatus(
    tenantId: string,
    userId: string,
    signatureId: string,
    status: SignatureStatus,
  ): Promise<ContractSignature> {
    const signature = await this.signatureRepo.findOne({
      where: { id: signatureId, tenantId },
    });
    if (!signature) throw new NotFoundException('Signature not found');

    signature.status = status;
    if (status === SignatureStatus.SIGNED) {
      signature.signedAt = new Date();
    }
    const saved = await this.signatureRepo.save(signature);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'contract_signature',
      entityId: signatureId,
      action: AuditAction.UPDATE,
      newValues: { status } as any,
    });

    return saved;
  }
}
