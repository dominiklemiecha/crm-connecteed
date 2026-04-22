import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Quote,
  QuoteVersion,
  QuoteItem,
  QuoteTextLibrary,
  QuoteStatus,
} from './quote.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalType } from '../approvals/approval.entity';
import { Opportunity, OpportunityStatus } from '../opportunities/opportunity.entity';
import { Contract } from '../contracts/contract.entity';
import { EmailSenderService } from '../email-sender/email-sender.service';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';

const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.AWAITING_CEO, QuoteStatus.REVISION],
  [QuoteStatus.REVISION]: [QuoteStatus.AWAITING_CEO, QuoteStatus.DRAFT],
  [QuoteStatus.AWAITING_CEO]: [QuoteStatus.APPROVED, QuoteStatus.REVISION],
  [QuoteStatus.APPROVED]: [QuoteStatus.SENT],
  [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.DECLINED, QuoteStatus.REVISION],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.DECLINED]: [QuoteStatus.DRAFT],
};

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(QuoteVersion)
    private readonly versionRepo: Repository<QuoteVersion>,
    @InjectRepository(QuoteItem)
    private readonly itemRepo: Repository<QuoteItem>,
    @InjectRepository(QuoteTextLibrary)
    private readonly textLibRepo: Repository<QuoteTextLibrary>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly dataSource: DataSource,
    private readonly emailSenderService: EmailSenderService,
    private readonly notificationTriggers: NotificationTriggerService,
  ) {}

  // ─── Quotes ────────────────────────────────────────────────────────────────

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.quoteRepo.count({ where: { tenantId } });
    return `Q-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(
    tenantId: string,
    userId: string,
    dto: Partial<Quote> & { items?: Partial<QuoteItem>[]; deliverables?: any; terms?: string },
  ): Promise<Quote> {
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    return this.dataSource.transaction(async (manager) => {
      const quote = manager.create(Quote, {
        ...dto,
        tenantId,
        quoteNumber,
        currentVersion: 1,
        status: QuoteStatus.DRAFT,
        createdBy: userId,
      });
      const savedQuote = await manager.save(quote);

      const version = manager.create(QuoteVersion, {
        tenantId,
        quoteId: savedQuote.id,
        versionNumber: 1,
        deliverables: dto.deliverables || undefined,
        terms: dto.terms || undefined,
        createdBy: userId,
        totalCents: 0,
      });
      const savedVersion = await manager.save(version);

      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item, index) =>
          manager.create(QuoteItem, {
            ...item,
            tenantId,
            quoteVersionId: savedVersion.id,
            sortOrder: item.sortOrder ?? index,
            totalCents: this.computeItemTotal(item),
          }),
        );
        await manager.save(items);
        savedVersion.totalCents = items.reduce((s, i) => s + Number(i.totalCents), 0);
        await manager.save(savedVersion);
        savedQuote.totalCents = savedVersion.totalCents;
        await manager.save(savedQuote);
      }

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'quote',
        entityId: savedQuote.id,
        action: AuditAction.CREATE,
        newValues: { quoteNumber, status: QuoteStatus.DRAFT } as any,
      });

      return savedQuote;
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Quote>> {
    const [data, total] = await this.quoteRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Quote> {
    const quote = await this.quoteRepo.findOne({
      where: { id, tenantId },
      relations: ['versions'],
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<Quote>,
  ): Promise<Quote> {
    const quote = await this.findById(tenantId, id);
    const oldValues = { ...quote };
    Object.assign(quote, dto);
    const saved = await this.quoteRepo.save(quote);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const quote = await this.findById(tenantId, id);
    await this.quoteRepo.remove(quote);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  // ─── Status Transitions ────────────────────────────────────────────────────

  async transitionStatus(
    tenantId: string,
    userId: string,
    id: string,
    newStatus: QuoteStatus,
  ): Promise<Quote> {
    const quote = await this.findById(tenantId, id);
    const allowed = ALLOWED_TRANSITIONS[quote.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${quote.status} to ${newStatus}`,
      );
    }
    const oldStatus = quote.status;
    quote.status = newStatus;
    const saved = await this.quoteRepo.save(quote);

    // Auto-create approval when moving to AWAITING_CEO
    if (newStatus === QuoteStatus.AWAITING_CEO) {
      await this.approvalsService.create(tenantId, userId, {
        type: ApprovalType.QUOTE,
        entityId: id,
        requestedBy: userId,
      });
      try {
        await this.notificationTriggers.onQuoteAwaitingCEO(tenantId, id, saved.quoteNumber);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // Send email to company when quote is sent
    if (newStatus === QuoteStatus.SENT) {
      try {
        const companyEmail = (saved as any).company?.email as string | undefined;
        const companyName = (saved as any).company?.name as string | undefined;
        if (companyEmail) {
          await this.emailSenderService.sendTemplateEmail(companyEmail, 'quote_sent', {
            quoteNumber: saved.quoteNumber,
            recipientName: companyName ?? '',
            quoteLink: '',
            senderName: 'Connecteed CRM',
          });
        }
        await this.notificationTriggers.onQuoteSent(tenantId, id, saved.quoteNumber, companyEmail || '', companyName || '');
      } catch (err) {
        this.logger.warn(`Failed to send quote_sent email/notification: ${err.message}`);
      }
    }

    // Notify owner when quote accepted
    if (newStatus === QuoteStatus.ACCEPTED) {
      try {
        await this.notificationTriggers.onQuoteAccepted(tenantId, id, saved.quoteNumber, saved.createdBy);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // When quote accepted: update opportunity + auto-create contract
    if (newStatus === QuoteStatus.ACCEPTED && saved.opportunityId) {
      try {
        await this.opportunityRepo.update(
          { id: saved.opportunityId, tenantId },
          { status: OpportunityStatus.ACCEPTED },
        );
        // Auto-create contract from quote
        const year = new Date().getFullYear();
        const contractCount = await this.contractRepo.count({ where: { tenantId } });
        const contractNumber = `C-${year}-${String(contractCount + 1).padStart(4, '0')}`;
        const contract = this.contractRepo.create({
          tenantId,
          contractNumber,
          opportunityId: saved.opportunityId,
          quoteId: saved.id,
          companyId: saved.companyId,
          status: 'draft' as any,
          createdBy: userId,
        });
        await this.contractRepo.save(contract);
        this.logger.log(`Auto-created contract ${contractNumber} from accepted quote ${saved.quoteNumber}`);
      } catch (err) {
        this.logger.error(`Failed to process accepted quote side-effects: ${err.message}`);
      }
    }

    // Notify owner when quote declined
    if (newStatus === QuoteStatus.DECLINED) {
      try {
        await this.notificationTriggers.onQuoteRejected(tenantId, id, saved.quoteNumber, 'Rifiutato dal cliente', saved.createdBy);
      } catch (err) { /* notification failure must not break main flow */ }
    }

    // When quote declined: update opportunity to lost
    if (newStatus === QuoteStatus.DECLINED && saved.opportunityId) {
      try {
        await this.opportunityRepo.update(
          { id: saved.opportunityId, tenantId },
          { status: OpportunityStatus.LOST, lostReason: 'Preventivo rifiutato dal cliente' },
        );
      } catch (err) {
        this.logger.error(`Failed to update opportunity on quote decline: ${err.message}`);
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote',
      entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: oldStatus } as any,
      newValues: { status: newStatus } as any,
    });

    return saved;
  }

  // ─── Versioning ────────────────────────────────────────────────────────────

  async createNewVersion(
    tenantId: string,
    userId: string,
    quoteId: string,
    dto: { deliverables?: any; terms?: string; items?: Partial<QuoteItem>[] },
  ): Promise<QuoteVersion> {
    const quote = await this.findById(tenantId, quoteId);

    const newVersionNumber = quote.currentVersion + 1;

    return this.dataSource.transaction(async (manager) => {
      const version = manager.create(QuoteVersion, {
        tenantId,
        quoteId,
        versionNumber: newVersionNumber,
        deliverables: dto.deliverables || undefined,
        terms: dto.terms || undefined,
        createdBy: userId,
        totalCents: 0,
      });
      const savedVersion = await manager.save(version);

      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item, index) =>
          manager.create(QuoteItem, {
            ...item,
            tenantId,
            quoteVersionId: savedVersion.id,
            sortOrder: item.sortOrder ?? index,
            totalCents: this.computeItemTotal(item),
          }),
        );
        await manager.save(items);
        savedVersion.totalCents = items.reduce((s, i) => s + Number(i.totalCents), 0);
        await manager.save(savedVersion);
      }

      quote.currentVersion = newVersionNumber;
      quote.totalCents = savedVersion.totalCents;
      await manager.save(quote);

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'quote',
        entityId: quoteId,
        action: AuditAction.UPDATE,
        newValues: { newVersion: newVersionNumber } as any,
        description: `Created version ${newVersionNumber}`,
      });

      return savedVersion;
    });
  }

  async getVersion(tenantId: string, quoteId: string, versionNumber: number): Promise<QuoteVersion> {
    const version = await this.versionRepo.findOne({
      where: { tenantId, quoteId, versionNumber },
      relations: ['items'],
    });
    if (!version) throw new NotFoundException('Quote version not found');
    return version;
  }

  async listVersions(tenantId: string, quoteId: string): Promise<QuoteVersion[]> {
    await this.findById(tenantId, quoteId);
    return this.versionRepo.find({
      where: { tenantId, quoteId },
      order: { versionNumber: 'DESC' },
    });
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  private computeItemTotal(item: Partial<QuoteItem>): number {
    const qty = Number(item.quantity ?? 1);
    const unit = Number(item.unitPriceCents ?? 0);
    const discount = Number(item.discountPercent ?? 0);
    return Math.round(qty * unit * (1 - discount / 100));
  }

  async calculateTotal(tenantId: string, versionId: string): Promise<number> {
    const items = await this.itemRepo.find({ where: { tenantId, quoteVersionId: versionId } });
    return items.reduce((sum, i) => sum + Number(i.totalCents), 0);
  }

  // ─── Text Library ─────────────────────────────────────────────────────────

  async createTextLibraryEntry(
    tenantId: string,
    userId: string,
    dto: Partial<QuoteTextLibrary>,
  ): Promise<QuoteTextLibrary> {
    const entry = this.textLibRepo.create({ ...dto, tenantId });
    const saved = await this.textLibRepo.save(entry);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote_text_library',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: dto as any,
    });

    return saved;
  }

  async findTextLibrary(tenantId: string, category?: string): Promise<QuoteTextLibrary[]> {
    const where: any = { tenantId };
    if (category) where.category = category;
    return this.textLibRepo.find({ where, order: { category: 'ASC', title: 'ASC' } });
  }

  async updateTextLibraryEntry(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<QuoteTextLibrary>,
  ): Promise<QuoteTextLibrary> {
    const entry = await this.textLibRepo.findOne({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Text library entry not found');
    Object.assign(entry, dto);
    const saved = await this.textLibRepo.save(entry);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote_text_library',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: dto as any,
    });

    return saved;
  }

  async removeTextLibraryEntry(tenantId: string, userId: string, id: string): Promise<void> {
    const entry = await this.textLibRepo.findOne({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Text library entry not found');
    await this.textLibRepo.remove(entry);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'quote_text_library',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }
}
