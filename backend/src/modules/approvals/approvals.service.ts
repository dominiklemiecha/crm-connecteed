import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approval, ApprovalStatus, ApprovalType } from './approval.entity';
import { Quote, QuoteStatus } from '../quotes/quote.entity';
import { Contract, ContractStatus } from '../contracts/contract.entity';
import { Notification, NotificationChannel } from '../notifications/notification.entity';
import { Company } from '../companies/company.entity';
import { User } from '../auth/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { EmailSenderService } from '../email-sender/email-sender.service';
import { In } from 'typeorm';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    @InjectRepository(Approval) private readonly approvalRepo: Repository<Approval>,
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  async create(tenantId: string, userId: string, dto: { type: ApprovalType; entityId: string; requestedBy?: string }): Promise<Approval> {
    const existing = await this.approvalRepo.findOne({
      where: { tenantId, type: dto.type, entityId: dto.entityId, status: ApprovalStatus.PENDING },
    });
    if (existing) throw new BadRequestException('An approval request is already pending for this entity');

    const approval = this.approvalRepo.create({
      tenantId, type: dto.type, entityId: dto.entityId,
      requestedBy: dto.requestedBy || userId,
      status: ApprovalStatus.PENDING, requestedAt: new Date(),
    });
    const saved = await this.approvalRepo.save(approval);
    await this.auditService.log({ tenantId, userId, entityType: 'approval', entityId: saved.id, action: AuditAction.CREATE, newValues: { type: dto.type, entityId: dto.entityId } as any });
    return saved;
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const [data, total] = await this.approvalRepo.findAndCount({
      where: { tenantId }, order: { requestedAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20), take: pagination.limit || 20,
    });
    const enriched = await this.enrichApprovals(tenantId, data);
    return new PaginatedResult(enriched, total, pagination.page || 1, pagination.limit || 20);
  }

  async findPending(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const [data, total] = await this.approvalRepo.findAndCount({
      where: { tenantId, status: ApprovalStatus.PENDING }, order: { requestedAt: 'ASC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 50), take: pagination.limit || 50,
    });
    const enriched = await this.enrichApprovals(tenantId, data);
    return new PaginatedResult(enriched, total, pagination.page || 1, pagination.limit || 50);
  }

  private async enrichApprovals(tenantId: string, approvals: Approval[]): Promise<any[]> {
    if (approvals.length === 0) return [];

    // Collect entity IDs by type
    const quoteIds = approvals.filter((a) => a.type === ApprovalType.QUOTE).map((a) => a.entityId);
    const contractIds = approvals.filter((a) => a.type === ApprovalType.CONTRACT).map((a) => a.entityId);
    const requesterIds = [...new Set(approvals.map((a) => a.requestedBy).filter(Boolean))];

    // Fetch related entities in parallel
    const [quotes, contracts, requesters] = await Promise.all([
      quoteIds.length > 0
        ? this.quoteRepo.find({ where: { tenantId, id: In(quoteIds) }, select: ['id', 'quoteNumber', 'companyId', 'totalCents', 'notes'] })
        : [],
      contractIds.length > 0
        ? this.contractRepo.find({ where: { tenantId, id: In(contractIds) }, select: ['id', 'contractNumber', 'companyId'] })
        : [],
      requesterIds.length > 0
        ? this.userRepo.find({ where: { id: In(requesterIds) }, select: ['id', 'firstName', 'lastName', 'email'] })
        : [],
    ]);

    // Fetch company names
    const companyIds = [
      ...new Set([
        ...quotes.map((q) => q.companyId),
        ...contracts.map((c) => c.companyId),
      ].filter(Boolean)),
    ];
    const companies = companyIds.length > 0
      ? await this.companyRepo.find({ where: { id: In(companyIds) }, select: ['id', 'name'] })
      : [];

    // Build lookup maps
    const quoteMap = new Map(quotes.map((q) => [q.id, q]));
    const contractMap = new Map(contracts.map((c) => [c.id, c]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));
    const userMap = new Map(requesters.map((u) => [u.id, u]));

    return approvals.map((a) => {
      const requester = userMap.get(a.requestedBy);
      let entityRef: string | undefined;
      let clientName: string | undefined;
      let amount: number | undefined;
      let entityDetail: any;

      if (a.type === ApprovalType.QUOTE) {
        const quote = quoteMap.get(a.entityId);
        if (quote) {
          entityRef = quote.quoteNumber;
          amount = Number(quote.totalCents) || undefined;
          clientName = companyMap.get(quote.companyId)?.name;
          entityDetail = {
            quoteNumber: quote.quoteNumber,
            totalCents: Number(quote.totalCents),
            notes: quote.notes,
            companyName: clientName,
          };
        }
      } else if (a.type === ApprovalType.CONTRACT) {
        const contract = contractMap.get(a.entityId);
        if (contract) {
          entityRef = contract.contractNumber;
          clientName = companyMap.get(contract.companyId)?.name;
          entityDetail = {
            contractNumber: contract.contractNumber,
            companyName: clientName,
          };
        }
      }

      return {
        ...a,
        entityRef,
        clientName,
        amount,
        entityDetail,
        requestedByName: requester ? `${requester.firstName} ${requester.lastName}` : undefined,
      };
    });
  }

  async findById(tenantId: string, id: string): Promise<Approval> {
    const approval = await this.approvalRepo.findOne({ where: { id, tenantId } });
    if (!approval) throw new NotFoundException('Approval not found');
    return approval;
  }

  async approve(tenantId: string, userId: string, id: string, notes?: string): Promise<Approval> {
    const approval = await this.findById(tenantId, id);
    if (approval.status !== ApprovalStatus.PENDING) throw new BadRequestException('Approval is not pending');

    approval.status = ApprovalStatus.APPROVED;
    approval.decidedBy = userId;
    approval.decidedAt = new Date();
    if (notes) approval.decisionNotes = notes;
    const saved = await this.approvalRepo.save(approval);

    await this.updateLinkedEntity(tenantId, approval, true);
    await this.notifyRequester(tenantId, approval, true);
    await this.auditService.log({ tenantId, userId, entityType: 'approval', entityId: id, action: AuditAction.APPROVAL, newValues: { status: 'approved' } as any });
    return saved;
  }

  async reject(tenantId: string, userId: string, id: string, notes: string): Promise<Approval> {
    if (!notes?.trim()) throw new BadRequestException('Decision notes are required when rejecting');

    const approval = await this.findById(tenantId, id);
    if (approval.status !== ApprovalStatus.PENDING) throw new BadRequestException('Approval is not pending');

    approval.status = ApprovalStatus.REJECTED;
    approval.decidedBy = userId;
    approval.decidedAt = new Date();
    approval.decisionNotes = notes;
    const saved = await this.approvalRepo.save(approval);

    await this.updateLinkedEntity(tenantId, approval, false);
    await this.notifyRequester(tenantId, approval, false);
    await this.auditService.log({ tenantId, userId, entityType: 'approval', entityId: id, action: AuditAction.APPROVAL, newValues: { status: 'rejected', notes } as any });
    return saved;
  }

  private async updateLinkedEntity(tenantId: string, approval: Approval, approved: boolean): Promise<void> {
    switch (approval.type) {
      case ApprovalType.QUOTE: {
        const quote = await this.quoteRepo.findOne({ where: { id: approval.entityId, tenantId } });
        if (quote) {
          quote.status = approved ? QuoteStatus.APPROVED : QuoteStatus.DRAFT;
          await this.quoteRepo.save(quote);
        }
        break;
      }
      case ApprovalType.CONTRACT: {
        const contract = await this.contractRepo.findOne({ where: { id: approval.entityId, tenantId } });
        if (contract) {
          contract.status = approved ? ContractStatus.READY_TO_SIGN : ContractStatus.DRAFT;
          await this.contractRepo.save(contract);
        }
        break;
      }
    }
  }

  private async notifyRequester(tenantId: string, approval: Approval, approved: boolean): Promise<void> {
    if (!approval.requestedBy) return;
    const typeLabel = approval.type === ApprovalType.QUOTE ? 'Preventivo' : approval.type === ApprovalType.CONTRACT ? 'Contratto' : 'Change Request';
    const notif = this.notifRepo.create({
      tenantId,
      userId: approval.requestedBy,
      type: 'approval',
      title: approved ? `${typeLabel} approvato` : `${typeLabel} rifiutato`,
      message: approved
        ? `Il tuo ${typeLabel.toLowerCase()} e stato approvato dal CEO.`
        : `Il tuo ${typeLabel.toLowerCase()} e stato rifiutato. Motivo: ${approval.decisionNotes}`,
      entityType: approval.type,
      entityId: approval.entityId,
      channel: NotificationChannel.IN_APP,
    });
    await this.notifRepo.save(notif);

    // Send email notification if requester has email
    try {
      const requesterEmail = (approval as any).requesterEmail as string | undefined;
      if (requesterEmail) {
        const templateName = approved
          ? (approval.type === ApprovalType.QUOTE ? 'quote_approved' : 'contract_ready')
          : 'quote_rejected';
        await this.emailSenderService.sendTemplateEmail(requesterEmail, templateName, {
          quoteNumber: approval.entityId,
          contractNumber: approval.entityId,
          notes: approval.decisionNotes ?? '',
          senderName: 'Connecteed CRM',
          recipientName: '',
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to send approval email notification: ${err.message}`);
    }
  }
}
