import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, ForbiddenException, BadRequestException, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project, GanttTask, GanttTaskStatus } from '../projects/project.entity';
import { Ticket, TicketMessage, TicketStatus } from '../tickets/ticket.entity';
import { FileRecord } from '../files/file.entity';
import { Notification } from '../notifications/notification.entity';
import { Quote, QuoteVersion, QuoteStatus } from '../quotes/quote.entity';
import { QuotesService } from '../quotes/quotes.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { FilesService } from '../files/files.service';

@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(GanttTask) private readonly ganttTaskRepo: Repository<GanttTask>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly msgRepo: Repository<TicketMessage>,
    @InjectRepository(FileRecord) private readonly fileRepo: Repository<FileRecord>,
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(QuoteVersion) private readonly quoteVersionRepo: Repository<QuoteVersion>,
    private readonly quotesService: QuotesService,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
  ) {}

  private ensureClient(user: any) {
    if (user.type !== 'client') throw new ForbiddenException('Portal access is for client users only');
  }

  @Get('projects')
  async getProjects(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    this.ensureClient(user);
    return this.projectRepo.find({
      where: { tenantId, companyId: user.companyId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('projects/:id')
  async getProject(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    this.ensureClient(user);
    const project = await this.projectRepo.findOne({ where: { id, tenantId, companyId: user.companyId } });
    if (!project) throw new ForbiddenException('Project not found');
    return project;
  }

  @Get('projects/:id/tasks')
  async getProjectTasks(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    this.ensureClient(user);
    const project = await this.projectRepo.findOne({ where: { id, tenantId, companyId: user.companyId } });
    if (!project) throw new ForbiddenException('Project not found');
    return this.ganttTaskRepo.find({ where: { tenantId, projectId: id }, order: { sortOrder: 'ASC' } });
  }

  @Get('tickets')
  async getTickets(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    this.ensureClient(user);
    return this.ticketRepo.find({
      where: { tenantId, isClientVisible: true, createdBy: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  @Post('tickets')
  async createTicket(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: { subject: string; description: string; category?: string }) {
    this.ensureClient(user);
    const ticketNumber = `TKT-${Date.now()}`;
    const ticket = this.ticketRepo.create({
      tenantId,
      ticketNumber,
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      status: TicketStatus.OPEN,
      channel: 'portal',
      isClientVisible: true,
      createdBy: user.id,
      assignedTeam: 'support', // Always goes to Support queue
    });
    return this.ticketRepo.save(ticket);
  }

  @Post('tickets/:id/reply')
  async replyToTicket(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { content: string }) {
    this.ensureClient(user);
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId, createdBy: user.id } });
    if (!ticket) throw new ForbiddenException('Ticket not found');

    const msg = this.msgRepo.create({
      ticketId: id,
      authorId: user.id,
      authorType: 'customer',
      content: dto.content,
      isInternal: false,
    });
    return this.msgRepo.save(msg);
  }

  @Get('tickets/:id/messages')
  async getTicketMessages(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    this.ensureClient(user);
    // Client can only see non-internal messages
    return this.msgRepo.find({
      where: { ticketId: id, isInternal: false },
      order: { createdAt: 'ASC' },
    });
  }

  @Get('files')
  async getFiles(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Query('projectId') projectId?: string) {
    this.ensureClient(user);
    const where: any = { tenantId, isClientVisible: true };
    if (projectId) where.projectId = projectId;
    return this.fileRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ─── Quotes (client portal) ──────────────────────────────────────────────

  @Get('quotes')
  async getQuotes(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    this.ensureClient(user);
    return this.quoteRepo.find({
      where: {
        tenantId,
        companyId: user.companyId,
        status: In([QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.DECLINED]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('quotes/:id')
  async getQuote(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    this.ensureClient(user);
    const quote = await this.quoteRepo.findOne({
      where: { id, tenantId, companyId: user.companyId },
      relations: ['versions'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Load items for the current version
    const currentVersion = await this.quoteVersionRepo.findOne({
      where: { tenantId, quoteId: id, versionNumber: quote.currentVersion },
      relations: ['items'],
    });
    return { ...quote, currentVersionDetail: currentVersion };
  }

  @Post('quotes/:id/accept')
  async acceptQuote(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    this.ensureClient(user);
    const quote = await this.quoteRepo.findOne({
      where: { id, tenantId, companyId: user.companyId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException(`Cannot accept quote in status ${quote.status}`);
    }
    // Use QuotesService.transitionStatus to trigger all automations
    // (update opportunity, auto-create contract, etc.)
    return this.quotesService.transitionStatus(tenantId, user.id, id, QuoteStatus.ACCEPTED);
  }

  @Post('quotes/:id/decline')
  async declineQuote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason: string },
  ) {
    this.ensureClient(user);
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required when declining a quote');
    const quote = await this.quoteRepo.findOne({
      where: { id, tenantId, companyId: user.companyId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException(`Cannot decline quote in status ${quote.status}`);
    }
    // Save the decline reason in notes first
    quote.notes = (quote.notes ? quote.notes + '\n' : '') + `Client decline reason: ${dto.reason}`;
    await this.quoteRepo.save(quote);
    // Use QuotesService to trigger automations (opportunity → lost)
    return this.quotesService.transitionStatus(tenantId, user.id, id, QuoteStatus.DECLINED);
  }

  @Post('quotes/:id/request-changes')
  async requestChanges(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason: string },
  ) {
    this.ensureClient(user);
    if (!dto.reason?.trim()) throw new BadRequestException('Descrivi le modifiche richieste');
    const quote = await this.quoteRepo.findOne({
      where: { id, tenantId, companyId: user.companyId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException(`Cannot request changes on quote in status ${quote.status}`);
    }
    // Save the change request in notes
    quote.notes = (quote.notes ? quote.notes + '\n' : '') + `[Richiesta modifiche dal cliente] ${dto.reason}`;
    await this.quoteRepo.save(quote);
    // Move to REVISION — opportunity stays active, commercial creates new version
    return this.quotesService.transitionStatus(tenantId, user.id, id, QuoteStatus.REVISION);
  }

  // ─── Step Approval via Portal ──────────────────────────────────────────────

  @Post('projects/:id/approve-step')
  async approveStep(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { taskId: string; approved: boolean; notes?: string },
  ) {
    this.ensureClient(user);
    if (!dto.taskId) throw new BadRequestException('taskId is required');

    // Validate project belongs to client
    const project = await this.projectRepo.findOne({ where: { id, tenantId, companyId: user.companyId } });
    if (!project) throw new ForbiddenException('Project not found');

    // Validate task belongs to project
    const task = await this.ganttTaskRepo.findOne({ where: { id: dto.taskId, tenantId, projectId: id } });
    if (!task) throw new NotFoundException('Task not found in this project');

    if (dto.approved) {
      task.status = GanttTaskStatus.DONE;
      task.progressPct = 100;
      task.endDateActual = new Date();
      await this.ganttTaskRepo.save(task);
    }

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId: user.id,
      userEmail: user.email,
      entityType: 'gantt_task',
      entityId: dto.taskId,
      action: AuditAction.APPROVAL,
      newValues: { approved: dto.approved, notes: dto.notes },
      description: `Client ${dto.approved ? 'approved' : 'rejected'} milestone: ${task.name}`,
    });

    // Create a ticket message noting the client approval
    const ticketNumber = `TKT-${Date.now()}`;
    const ticket = this.ticketRepo.create({
      tenantId,
      ticketNumber,
      subject: `Approvazione step: ${task.name}`,
      description: dto.approved
        ? `Il cliente ha approvato lo step "${task.name}" del progetto "${project.name}".${dto.notes ? `\nNote: ${dto.notes}` : ''}`
        : `Il cliente ha rifiutato lo step "${task.name}" del progetto "${project.name}".${dto.notes ? `\nNote: ${dto.notes}` : ''}`,
      category: 'approval',
      status: TicketStatus.OPEN,
      channel: 'portal',
      isClientVisible: true,
      createdBy: user.id,
      relatedEntityType: 'project',
      relatedEntityId: id,
      assignedTeam: 'pm',
    });
    await this.ticketRepo.save(ticket);

    return { success: true, task, ticket };
  }

  // ─── Document Requests (for to-do documents list) ─────────────────────────

  @Get('document-requests')
  async getDocumentRequests(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    this.ensureClient(user);
    return this.ticketRepo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.isClientVisible = true')
      .andWhere('t.createdBy = :userId', { userId: user.id })
      .andWhere('t.status IN (:...statuses)', { statuses: ['open', 'in_progress'] })
      .andWhere("(t.type = 'document_request' OR t.subject ILIKE '%richiesta document%' OR t.subject ILIKE '%document%richiest%' OR t.category = 'document_request')")
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  // ─── File Upload from Portal ──────────────────────────────────────────────

  @Post('files/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: { name?: string; projectId?: string; description?: string },
  ) {
    this.ensureClient(user);
    if (!file) throw new BadRequestException('File is required');

    return this.filesService.upload(tenantId, user.id, file, {
      projectId: meta.projectId || undefined,
      entityType: 'company',
      entityId: user.companyId,
      name: meta.name || file.originalname,
      isClientVisible: true,
      tags: ['portal-upload'],
    });
  }
}
