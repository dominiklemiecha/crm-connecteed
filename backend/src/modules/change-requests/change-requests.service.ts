import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequest, ChangeRequestStatus } from './change-request.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalType } from '../approvals/approval.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';
import { Quote, QuoteVersion, QuoteItem, QuoteStatus } from '../quotes/quote.entity';
import { Contract, ContractStatus } from '../contracts/contract.entity';
import { Invoice, InvoiceItem, InvoiceStatus, InvoiceType } from '../invoices/invoice.entity';
import { GanttTask, Project, GanttTaskStatus } from '../projects/project.entity';

const ALLOWED_TRANSITIONS: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  [ChangeRequestStatus.OPEN]: [ChangeRequestStatus.IMPACT_ANALYSIS, ChangeRequestStatus.REJECTED],
  [ChangeRequestStatus.IMPACT_ANALYSIS]: [ChangeRequestStatus.AWAITING_CEO, ChangeRequestStatus.REJECTED],
  [ChangeRequestStatus.AWAITING_CEO]: [ChangeRequestStatus.AWAITING_CLIENT, ChangeRequestStatus.REJECTED],
  [ChangeRequestStatus.AWAITING_CLIENT]: [ChangeRequestStatus.APPROVED, ChangeRequestStatus.REJECTED],
  [ChangeRequestStatus.APPROVED]: [ChangeRequestStatus.IMPLEMENTED],
  [ChangeRequestStatus.IMPLEMENTED]: [],
  [ChangeRequestStatus.REJECTED]: [ChangeRequestStatus.OPEN],
};

@Injectable()
export class ChangeRequestsService {
  private readonly logger = new Logger(ChangeRequestsService.name);

  constructor(
    @InjectRepository(ChangeRequest)
    private readonly crRepo: Repository<ChangeRequest>,
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(QuoteVersion) private readonly quoteVersionRepo: Repository<QuoteVersion>,
    @InjectRepository(QuoteItem) private readonly quoteItemRepo: Repository<QuoteItem>,
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(GanttTask) private readonly ganttTaskRepo: Repository<GanttTask>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly notificationTriggers: NotificationTriggerService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: Partial<ChangeRequest>,
  ): Promise<ChangeRequest> {
    const cr = this.crRepo.create({
      ...dto,
      tenantId,
      requestedBy: userId,
      status: ChangeRequestStatus.OPEN,
    });
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'change_request',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { title: dto.title, projectId: dto.projectId } as any,
    });

    return saved;
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    projectId?: string,
  ): Promise<PaginatedResult<ChangeRequest>> {
    const where: any = { tenantId };
    if (projectId) where.projectId = projectId;
    const [data, total] = await this.crRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<ChangeRequest> {
    const cr = await this.crRepo.findOne({ where: { id, tenantId } });
    if (!cr) throw new NotFoundException('Change request not found');
    return cr;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<ChangeRequest>,
  ): Promise<ChangeRequest> {
    const cr = await this.findById(tenantId, id);
    const oldValues = { ...cr };
    Object.assign(cr, dto);
    const saved = await this.crRepo.save(cr);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'change_request',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const cr = await this.findById(tenantId, id);
    await this.crRepo.remove(cr);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'change_request',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  async transitionStatus(
    tenantId: string,
    userId: string,
    id: string,
    newStatus: ChangeRequestStatus,
    extra?: Partial<ChangeRequest>,
  ): Promise<ChangeRequest> {
    const cr = await this.findById(tenantId, id);
    const allowed = ALLOWED_TRANSITIONS[cr.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition change request from ${cr.status} to ${newStatus}`,
      );
    }

    const oldStatus = cr.status;
    cr.status = newStatus;
    if (extra) Object.assign(cr, extra);
    const saved = await this.crRepo.save(cr);

    // Auto-create approval when moving to AWAITING_CEO
    if (newStatus === ChangeRequestStatus.AWAITING_CEO) {
      try {
        await this.approvalsService.create(tenantId, userId, {
          type: ApprovalType.CHANGE_REQUEST,
          entityId: id,
          requestedBy: userId,
        });
      } catch (err) {
        this.logger.error(`Failed to create change request approval: ${err.message}`);
      }
      try {
        await this.notificationTriggers.onChangeRequestAwaitingCEO(tenantId, id, saved.title || '');
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // Auto-generate artifacts when CR is approved
    if (newStatus === ChangeRequestStatus.APPROVED) {
      try {
        await this.generateCRArtifacts(tenantId, userId, saved);
      } catch (err) {
        this.logger.error(`CR automation failed for ${id}: ${err.message}`);
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'change_request',
      entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: oldStatus } as any,
      newValues: { status: newStatus } as any,
    });

    return saved;
  }

  /**
   * When a CR is approved: auto-generate extra quote, contract addendum,
   * proforma invoice, and new Gantt tasks.
   */
  private async generateCRArtifacts(tenantId: string, userId: string, cr: ChangeRequest): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: cr.projectId, tenantId } });
    if (!project) return;

    const costCents = Number(cr.impactCostEstimateCents) || 0;
    const extraDays = Number(cr.impactDaysEstimate) || 0;

    // 1. Generate extra quote
    const quoteCount = await this.quoteRepo.count({ where: { tenantId } });
    const quoteNumber = `QT-CR-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(5, '0')}`;
    const quote = this.quoteRepo.create({
      tenantId,
      quoteNumber,
      opportunityId: project.opportunityId,
      companyId: project.companyId,
      status: QuoteStatus.DRAFT,
      title: `Extra: ${cr.title}`,
      description: cr.description,
      currentVersion: 1,
      createdBy: userId,
    } as any);
    const savedQuote = await this.quoteRepo.save(quote) as any;

    // Create version + item
    const version = this.quoteVersionRepo.create({
      tenantId,
      quoteId: savedQuote.id,
      versionNumber: 1,
      notes: `Auto-generated from CR: ${cr.title}`,
    } as any);
    const savedVersion = await this.quoteVersionRepo.save(version) as any;

    if (costCents > 0) {
      const item = this.quoteItemRepo.create({
        tenantId,
        versionId: savedVersion.id,
        name: cr.title,
        description: cr.description,
        type: 'fixed',
        quantity: 1,
        unitPriceCents: costCents,
        totalCents: costCents,
      } as any);
      await this.quoteItemRepo.save(item);
    }

    cr.generatedQuoteId = savedQuote.id;
    this.logger.log(`CR ${cr.id}: generated extra quote ${quoteNumber}`);

    // 2. Generate contract addendum
    const contractCount = await this.contractRepo.count({ where: { tenantId } });
    const contractNumber = `ADD-${new Date().getFullYear()}-${String(contractCount + 1).padStart(5, '0')}`;
    const contract = this.contractRepo.create({
      tenantId,
      contractNumber,
      opportunityId: project.opportunityId,
      quoteId: savedQuote.id,
      companyId: project.companyId,
      status: ContractStatus.DRAFT,
      title: `Addendum: ${cr.title}`,
      description: `Addendum contrattuale per change request: ${cr.description}`,
      totalCents: costCents,
      createdBy: userId,
    } as any);
    const savedContract = await this.contractRepo.save(contract) as any;
    cr.generatedContractAddendumId = savedContract.id;
    this.logger.log(`CR ${cr.id}: generated contract addendum ${contractNumber}`);

    // 3. Generate proforma invoice
    if (costCents > 0) {
      const invoiceCount = await this.invoiceRepo.count({ where: { tenantId } });
      const invoiceNumber = `INV-CR-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;
      const invoice = this.invoiceRepo.create({
        tenantId,
        invoiceNumber,
        type: InvoiceType.PROFORMA,
        companyId: project.companyId,
        contractId: savedContract.id,
        opportunityId: project.opportunityId,
        status: InvoiceStatus.DRAFT,
        subtotalCents: costCents,
        taxCents: Math.round(costCents * 0.22),
        totalCents: Math.round(costCents * 1.22),
        createdBy: userId,
      } as any);
      const savedInvoice = await this.invoiceRepo.save(invoice) as any;

      const invoiceItem = this.invoiceItemRepo.create({
        tenantId,
        invoiceId: savedInvoice.id,
        description: `Change Request: ${cr.title}`,
        quantity: 1,
        unitPriceCents: costCents,
        taxRate: 22,
        totalCents: Math.round(costCents * 1.22),
      } as any);
      await this.invoiceItemRepo.save(invoiceItem);
      this.logger.log(`CR ${cr.id}: generated proforma invoice ${invoiceNumber}`);
    }

    // 4. Add Gantt tasks for CR implementation
    if (extraDays > 0) {
      const maxSortOrder = await this.ganttTaskRepo
        .createQueryBuilder('t')
        .where('t.tenantId = :tenantId AND t.projectId = :projectId', { tenantId, projectId: project.id })
        .select('MAX(t.sortOrder)', 'maxSort')
        .getRawOne();
      const nextSort = (maxSortOrder?.maxSort ?? 0) + 1;

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + extraDays * 24 * 60 * 60 * 1000);

      const task = this.ganttTaskRepo.create({
        tenantId,
        projectId: project.id,
        name: `CR: ${cr.title}`,
        startDate,
        endDate,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        status: GanttTaskStatus.NOT_STARTED,
        progressPct: 0,
        sortOrder: nextSort,
        isMilestone: false,
      } as any);
      await this.ganttTaskRepo.save(task);
      this.logger.log(`CR ${cr.id}: created Gantt task (${extraDays} days)`);
    }

    // Save CR with generated IDs
    await this.crRepo.save(cr);
  }
}
