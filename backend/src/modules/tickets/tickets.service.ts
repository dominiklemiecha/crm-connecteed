import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket, TicketMessage, TicketStatus, TicketPriority, SLAClass, SLAPolicy, Escalation } from './ticket.entity';
import { CannedResponse } from './canned-response.entity';
import { User } from '../auth/user.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';
import { addBusinessMinutes } from '../../common/utils/business-hours';

let ticketCounter = 0;

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly msgRepo: Repository<TicketMessage>,
    @InjectRepository(SLAPolicy) private readonly slaRepo: Repository<SLAPolicy>,
    @InjectRepository(Escalation) private readonly escRepo: Repository<Escalation>,
    @InjectRepository(CannedResponse) private readonly cannedRepo: Repository<CannedResponse>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly notificationTriggers: NotificationTriggerService,
  ) {}

  async create(tenantId: string, userId: string, dto: Partial<Ticket>): Promise<Ticket> {
    ticketCounter++;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCounter).padStart(5, '0')}`;

    const ticket = this.ticketRepo.create({
      ...dto, tenantId, ticketNumber, createdBy: userId, status: TicketStatus.OPEN,
    });

    // Calculate SLA deadline
    if (dto.slaClass && dto.priority) {
      const sla = await this.slaRepo.findOne({ where: { tenantId, slaClass: dto.slaClass, priority: dto.priority } });
      if (sla) {
        ticket.slaDeadline = addBusinessMinutes(new Date(), sla.firstResponseMinutes);
      }
    }

    const saved = await this.ticketRepo.save(ticket);
    await this.auditService.log({ tenantId, userId, entityType: 'ticket', entityId: saved.id, action: AuditAction.CREATE, newValues: dto as any });
    return saved;
  }

  async findAll(tenantId: string, pagination: PaginationDto, filters?: {
    status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; assignedTeam?: string;
  }): Promise<PaginatedResult<Ticket>> {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters?.assignedTeam) where.assignedTeam = filters.assignedTeam;

    const [data, total] = await this.ticketRepo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async getMessages(ticketId: string, includeInternal: boolean) {
    const where: any = { ticketId };
    if (!includeInternal) where.isInternal = false;
    const messages = await this.msgRepo.find({ where, order: { createdAt: 'ASC' } });

    // Resolve author names
    const authorIds = [...new Set(messages.map((m) => m.authorId))];
    const users = authorIds.length
      ? await this.userRepo.find({ where: { id: In(authorIds) }, select: ['id', 'firstName', 'lastName', 'email'] })
      : [];
    const userMap = new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email]));

    return messages.map((m) => ({
      ...m,
      authorName: userMap.get(m.authorId) ?? null,
    }));
  }

  async addMessage(tenantId: string, ticketId: string, authorId: string, authorType: string, content: string, isInternal: boolean): Promise<TicketMessage> {
    const ticket = await this.findById(tenantId, ticketId);

    // Set first response time
    if (!ticket.firstResponseAt && authorType === 'agent') {
      ticket.firstResponseAt = new Date();
      await this.ticketRepo.save(ticket);
    }

    const msg = this.msgRepo.create({ ticketId, authorId, authorType, content, isInternal });
    const savedMsg = await this.msgRepo.save(msg);

    try {
      const notifyUserId = authorType === 'agent' ? ticket.createdBy : ticket.assignedTo;
      if (notifyUserId) {
        await this.notificationTriggers.onTicketReply(tenantId, ticketId, ticket.ticketNumber, authorType, notifyUserId);
      }
    } catch (err) { /* notification failure must not break main flow */ }

    return savedMsg;
  }

  async changeStatus(tenantId: string, userId: string, id: string, newStatus: TicketStatus): Promise<Ticket> {
    const ticket = await this.findById(tenantId, id);
    const oldStatus = ticket.status;
    ticket.status = newStatus;
    if (newStatus === TicketStatus.CLOSED) {
      ticket.closedAt = new Date();
      ticket.resolvedAt = new Date();
    }
    await this.ticketRepo.save(ticket);
    await this.auditService.log({ tenantId, userId, entityType: 'ticket', entityId: id, action: AuditAction.STATUS_CHANGE, oldValues: { status: oldStatus }, newValues: { status: newStatus } });

    try {
      await this.notificationTriggers.onTicketStatusChange(tenantId, id, ticket.ticketNumber, newStatus, ticket.createdBy);
    } catch (err) { /* notification failure must not break main flow */ }

    return ticket;
  }

  async assign(tenantId: string, userId: string, id: string, assignedTo: string, assignedTeam?: string): Promise<Ticket> {
    const ticket = await this.findById(tenantId, id);
    ticket.assignedTo = assignedTo;
    if (assignedTeam) ticket.assignedTeam = assignedTeam;
    if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.IN_PROGRESS;
    await this.ticketRepo.save(ticket);
    await this.auditService.log({ tenantId, userId, entityType: 'ticket', entityId: id, action: AuditAction.ASSIGNMENT, newValues: { assignedTo, assignedTeam } });

    try {
      await this.notificationTriggers.onTicketAssigned(tenantId, id, ticket.ticketNumber, ticket.subject || '', assignedTo);
    } catch (err) { /* notification failure must not break main flow */ }

    return ticket;
  }

  async checkSLABreaches(tenantId: string): Promise<Ticket[]> {
    const breached = await this.ticketRepo.createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.status != :closed', { closed: TicketStatus.CLOSED })
      .andWhere('t.sla_deadline IS NOT NULL')
      .andWhere('t.sla_deadline < NOW()')
      .andWhere('t.first_response_at IS NULL')
      .getMany();

    for (const ticket of breached) {
      const esc = this.escRepo.create({ tenantId, ticketId: ticket.id, reason: 'SLA first response breached' });
      await this.escRepo.save(esc);

      try {
        await this.notificationTriggers.onSLABreached(tenantId, ticket.id, ticket.ticketNumber, ticket.assignedTeam);
      } catch (err) { /* notification failure must not break main flow */ }
    }
    return breached;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const ticket = await this.findById(tenantId, id);
    await this.ticketRepo.remove(ticket);
    await this.auditService.log({ tenantId, userId, entityType: 'ticket', entityId: id, action: AuditAction.DELETE });
  }

  // ── Canned Responses ──────────────────────────────────────────────

  async getCannedResponses(tenantId: string): Promise<CannedResponse[]> {
    return this.cannedRepo.find({ where: { tenantId }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async createCannedResponse(tenantId: string, dto: Partial<CannedResponse>): Promise<CannedResponse> {
    const entity = this.cannedRepo.create({ ...dto, tenantId });
    return this.cannedRepo.save(entity);
  }

  async updateCannedResponse(tenantId: string, id: string, dto: Partial<CannedResponse>): Promise<CannedResponse> {
    const entity = await this.cannedRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException('Canned response not found');
    Object.assign(entity, dto);
    return this.cannedRepo.save(entity);
  }

  async deleteCannedResponse(tenantId: string, id: string): Promise<void> {
    const entity = await this.cannedRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException('Canned response not found');
    await this.cannedRepo.remove(entity);
  }

  // ── Merge Tickets ─────────────────────────────────────────────────

  async mergeTickets(tenantId: string, userId: string, primaryTicketId: string, mergeTicketId: string): Promise<Ticket> {
    if (primaryTicketId === mergeTicketId) {
      throw new BadRequestException('Cannot merge a ticket with itself');
    }

    const primary = await this.findById(tenantId, primaryTicketId);
    const mergeTicket = await this.findById(tenantId, mergeTicketId);

    // Move all messages from mergeTicket to primaryTicket
    const mergeMessages = await this.msgRepo.find({ where: { ticketId: mergeTicketId }, order: { createdAt: 'ASC' } });
    for (const msg of mergeMessages) {
      msg.ticketId = primaryTicketId;
      await this.msgRepo.save(msg);
    }

    // Add a system message noting the merge on the primary ticket
    const systemMsg = this.msgRepo.create({
      ticketId: primaryTicketId,
      authorId: userId,
      authorType: 'system',
      content: `Ticket ${mergeTicket.ticketNumber} è stato unito a questo ticket. ${mergeMessages.length} messaggi trasferiti.`,
      isInternal: true,
    });
    await this.msgRepo.save(systemMsg);

    // Close the merged ticket with a note
    mergeTicket.status = TicketStatus.CLOSED;
    mergeTicket.closedAt = new Date();
    mergeTicket.resolvedAt = new Date();
    await this.ticketRepo.save(mergeTicket);

    const closingMsg = this.msgRepo.create({
      ticketId: mergeTicketId,
      authorId: userId,
      authorType: 'system',
      content: `Questo ticket è stato unito al ticket ${primary.ticketNumber}.`,
      isInternal: true,
    });
    await this.msgRepo.save(closingMsg);

    // Audit log the merge
    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'ticket',
      entityId: primaryTicketId,
      action: AuditAction.UPDATE,
      oldValues: { mergedTicketId: mergeTicketId, mergedTicketNumber: mergeTicket.ticketNumber } as any,
      newValues: { action: 'merge', messagesTransferred: mergeMessages.length } as any,
    });

    return primary;
  }
}
