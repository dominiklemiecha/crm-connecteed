import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  Invoice,
  InvoiceItem,
  Payment,
  InvoiceSchedule,
  InvoiceStatus,
  PaymentStatus,
  ScheduleStatus,
} from './invoice.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { Project, ProjectStatus } from '../projects/project.entity';
import { Opportunity, OpportunityStatus } from '../opportunities/opportunity.entity';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';
import { FattureCloudService } from '../fatture-cloud/fatture-cloud.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(InvoiceSchedule)
    private readonly scheduleRepo: Repository<InvoiceSchedule>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    private readonly auditService: AuditService,
    private readonly notificationTriggers: NotificationTriggerService,
    private readonly fattureCloudService: FattureCloudService,
  ) {}

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.count({ where: { tenantId } });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    dto: Partial<Invoice> & { items?: Partial<InvoiceItem>[] },
  ): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Separate items from invoice data to avoid cascade issues
    const { items: _dtoItems, ...invoiceData } = dto;
    const invoice = this.invoiceRepo.create({
      type: invoiceData.type,
      companyId: invoiceData.companyId,
      contractId: invoiceData.contractId,
      opportunityId: invoiceData.opportunityId,
      dueDate: invoiceData.dueDate,
      notes: invoiceData.notes,
      tenantId,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
      createdBy: userId,
    } as Partial<Invoice>);
    const saved = await this.invoiceRepo.save(invoice) as Invoice;

    if (dto.items && dto.items.length > 0) {
      const items = dto.items.map((item) =>
        this.itemRepo.create({
          ...item,
          tenantId,
          invoiceId: saved.id,
          totalCents: this.computeItemTotal(item),
        }),
      );
      await this.itemRepo.save(items);

      saved.subtotalCents = items.reduce((s, i) => s + Number(i.unitPriceCents) * Number(i.quantity), 0);
      saved.taxCents = items.reduce(
        (s, i) => s + Math.round(Number(i.unitPriceCents) * Number(i.quantity) * Number(i.taxRate) / 100),
        0,
      );
      saved.totalCents = saved.subtotalCents + saved.taxCents;
      await this.invoiceRepo.save(saved);
    }

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'invoice',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { invoiceNumber, status: InvoiceStatus.DRAFT } as any,
    });

    return saved;
  }

  private computeItemTotal(item: Partial<InvoiceItem>): number {
    const qty = Number(item.quantity ?? 1);
    const unit = Number(item.unitPriceCents ?? 0);
    const taxRate = Number(item.taxRate ?? 22);
    return Math.round(qty * unit * (1 + taxRate / 100));
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Invoice>> {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
      relations: ['items', 'payments'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<Invoice>,
  ): Promise<Invoice> {
    const invoice = await this.findById(tenantId, id);
    const oldValues = { ...invoice };
    const oldStatus = invoice.status;
    Object.assign(invoice, dto);
    const saved = await this.invoiceRepo.save(invoice);

    // Sync to Fatture in Cloud when invoice transitions to ISSUED
    if (saved.status === InvoiceStatus.ISSUED && oldStatus !== InvoiceStatus.ISSUED) {
      try {
        const fullInvoice = await this.findById(tenantId, id);
        const { fattureCloudId } = await this.fattureCloudService.syncInvoice(fullInvoice);
        saved.fattureCloudId = fattureCloudId;
        await this.invoiceRepo.update(id, { fattureCloudId });
        this.logger.log(`Invoice ${saved.invoiceNumber} synced to Fatture in Cloud: ${fattureCloudId}`);
      } catch (err) {
        this.logger.error(`Failed to sync invoice ${saved.invoiceNumber} to Fatture in Cloud: ${err.message}`);
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'invoice',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const invoice = await this.findById(tenantId, id);
    await this.invoiceRepo.remove(invoice);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'invoice',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  async registerPayment(
    tenantId: string,
    userId: string,
    invoiceId: string,
    dto: Partial<Payment>,
  ): Promise<Payment> {
    const invoice = await this.findById(tenantId, invoiceId);

    const result = await this.paymentRepo.query(
      `INSERT INTO payments (tenant_id, invoice_id, amount_cents, method, reference, payment_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tenantId, invoiceId, dto.amountCents, dto.method || 'other', dto.reference || '', dto.paymentDate || new Date(), dto.notes || '', PaymentStatus.PAID],
    );
    const payment = result[0] as Payment;

    // Recalculate invoice payment status
    await this.recalculatePaymentStatus(tenantId, userId, invoice);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'payment',
      entityId: payment?.id,
      action: AuditAction.CREATE,
      newValues: { invoiceId, amountCents: dto.amountCents } as any,
    });

    return payment;
  }

  private async recalculatePaymentStatus(
    tenantId: string,
    userId: string,
    invoice: Invoice,
  ): Promise<void> {
    const payments = await this.paymentRepo.find({
      where: { tenantId, invoiceId: invoice.id, status: PaymentStatus.PAID },
    });
    const paidTotal = payments.reduce((s, p) => s + Number(p.amountCents), 0);
    const total = Number(invoice.totalCents);

    let newStatus: InvoiceStatus;
    if (paidTotal >= total) {
      newStatus = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
    } else if (paidTotal > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      return;
    }

    await this.invoiceRepo.update(invoice.id, {
      status: newStatus,
      ...(newStatus === InvoiceStatus.PAID ? { paidAt: new Date() } : {}),
    });

    // GATE: On first payment received (deposit/acconto), auto-create project
    // Works with installment plans: project starts at first payment, not when fully paid.
    // Triggers on any payment status (paid or partially_paid) if opportunity is linked.
    if ((newStatus === InvoiceStatus.PAID || newStatus === InvoiceStatus.PARTIALLY_PAID) && invoice.opportunityId) {
      try {
        // Check if a project already exists for this opportunity
        const existingProject = await this.projectRepo.findOne({
          where: { tenantId, opportunityId: invoice.opportunityId },
        });
        if (!existingProject) {
          const year = new Date().getFullYear();
          const projectCount = await this.projectRepo.count({ where: { tenantId } });
          const projectNumber = `P-${year}-${String(projectCount + 1).padStart(4, '0')}`;

          // Load opportunity for context
          const opportunity = await this.opportunityRepo.findOne({
            where: { id: invoice.opportunityId, tenantId },
          });

          const triggerLabel = newStatus === InvoiceStatus.PAID
            ? 'invoice_fully_paid'
            : 'deposit_received';

          const project = this.projectRepo.create({
            tenantId,
            projectNumber,
            opportunityId: invoice.opportunityId,
            companyId: invoice.companyId,
            contractId: invoice.contractId,
            name: opportunity?.name || `Project ${projectNumber}`,
            status: ProjectStatus.READY,
          } as Partial<Project>);
          await this.projectRepo.save(project);

          // Update opportunity to WON
          if (opportunity) {
            await this.opportunityRepo.update(
              { id: invoice.opportunityId, tenantId },
              { status: OpportunityStatus.WON },
            );
          }

          await this.auditService.log({
            tenantId,
            userId,
            entityType: 'project',
            entityId: project.id,
            action: AuditAction.CREATE,
            newValues: { projectNumber, status: ProjectStatus.READY, trigger: triggerLabel } as any,
            description: `Auto-created project from ${triggerLabel === 'deposit_received' ? 'deposit on' : 'paid'} invoice ${invoice.invoiceNumber}`,
          });
          this.logger.log(`Auto-created project ${projectNumber} (trigger: ${triggerLabel}) from invoice ${invoice.invoiceNumber}`);
        }
      } catch (err) {
        this.logger.error(`Failed to auto-create project from payment: ${err.message}`);
      }
    }
  }

  async checkOverdue(tenantId: string): Promise<Invoice[]> {
    const now = new Date();
    const overdue = await this.invoiceRepo.find({
      where: [
        { tenantId, status: InvoiceStatus.SENT, dueDate: LessThan(now) },
        { tenantId, status: InvoiceStatus.PARTIALLY_PAID, dueDate: LessThan(now) },
      ],
    });

    for (const invoice of overdue) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepo.save(invoice);

      // Block associated project if invoice is overdue
      if (invoice.opportunityId) {
        try {
          const project = await this.projectRepo.findOne({
            where: { tenantId, opportunityId: invoice.opportunityId },
          });
          if (project && project.status !== 'blocked' && project.status !== 'closed') {
            project.status = 'blocked' as any;
            await this.projectRepo.save(project);
            this.logger.warn(`Project ${project.id} blocked due to overdue invoice ${invoice.invoiceNumber}`);
          }
        } catch (err) {
          this.logger.error(`Failed to block project for overdue invoice: ${err.message}`);
        }
      }

      try {
        await this.notificationTriggers.onInvoiceOverdue(tenantId, invoice.id, invoice.invoiceNumber, invoice.companyId);
      } catch { /* notification failure must not break main flow */ }
    }

    return overdue;
  }

  async isPaymentComplete(tenantId: string, invoiceId: string): Promise<boolean> {
    const invoice = await this.findById(tenantId, invoiceId);
    return invoice.status === InvoiceStatus.PAID;
  }

  // ─── Invoice Schedules ────────────────────────────────────────────────────

  async createSchedule(
    tenantId: string,
    userId: string,
    invoiceId: string,
    installments: { dueDate: Date; amountCents: number }[],
  ): Promise<InvoiceSchedule[]> {
    await this.findById(tenantId, invoiceId);

    // Remove existing schedules for this invoice
    await this.scheduleRepo.delete({ tenantId, invoiceId });

    const entries = installments.map((inst, idx) =>
      this.scheduleRepo.create({
        tenantId,
        invoiceId,
        installmentNumber: idx + 1,
        dueDate: inst.dueDate,
        amountCents: inst.amountCents,
        status: ScheduleStatus.PENDING,
      }),
    );

    const saved = await this.scheduleRepo.save(entries);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'invoice_schedule',
      entityId: invoiceId,
      action: AuditAction.CREATE,
      newValues: { installmentCount: installments.length } as any,
    });

    return saved as InvoiceSchedule[];
  }

  async getSchedule(tenantId: string, invoiceId: string): Promise<InvoiceSchedule[]> {
    await this.findById(tenantId, invoiceId);
    return this.scheduleRepo.find({
      where: { tenantId, invoiceId },
      order: { installmentNumber: 'ASC' },
    });
  }

  async markInstallmentPaid(
    tenantId: string,
    userId: string,
    scheduleId: string,
  ): Promise<InvoiceSchedule> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId, tenantId },
    });
    if (!schedule) throw new NotFoundException('Schedule installment not found');

    schedule.status = ScheduleStatus.PAID;
    schedule.paidAt = new Date();
    const saved = await this.scheduleRepo.save(schedule) as InvoiceSchedule;

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'invoice_schedule',
      entityId: scheduleId,
      action: AuditAction.UPDATE,
      newValues: { status: ScheduleStatus.PAID, paidAt: saved.paidAt } as any,
    });

    return saved;
  }
}
