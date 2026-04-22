import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { NotificationsService, CreateNotificationInput } from './notifications.service';
import { NotificationChannel } from './notification.entity';
import { EmailSenderService } from '../email-sender/email-sender.service';
import { User } from '../auth/user.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Invoice, InvoiceSchedule, ScheduleStatus } from '../invoices/invoice.entity';
import { FileRecord } from '../files/file.entity';

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailSenderService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceSchedule)
    private readonly scheduleRepo: Repository<InvoiceSchedule>,
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
  ) {}

  // ─── Helper: notify user(s) in-app + optional email ──────────────────────

  private async notify(
    input: CreateNotificationInput & { email?: string; emailTemplate?: string; emailVars?: Record<string, string> },
  ): Promise<void> {
    try {
      await this.notificationsService.create(input);

      if (input.email && input.channel !== NotificationChannel.IN_APP) {
        if (input.emailTemplate) {
          await this.emailService.sendTemplateEmail(input.email, input.emailTemplate, input.emailVars ?? {});
        } else {
          await this.emailService.sendEmail(input.email, input.title, `<p>${input.message}</p>`);
        }
      }
    } catch (err) {
      this.logger.error(`Notification trigger failed: ${err.message}`);
    }
  }

  private async getUsersByRole(tenantId: string, roles: string[]): Promise<User[]> {
    return this.userRepo.find({
      where: { tenantId, role: In(roles) as any, status: 'active' as any },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
  }

  private async getUserById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'tenantId'],
    });
  }

  // ─── TICKET TRIGGERS ─────────────────────────────────────────────────────

  async onTicketAssigned(tenantId: string, ticketId: string, ticketNumber: string, subject: string, assignedTo: string): Promise<void> {
    const user = await this.getUserById(assignedTo);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'ticket_assigned',
      title: `Ticket assegnato: ${ticketNumber}`,
      message: `Ti è stato assegnato il ticket "${subject}".`,
      entityType: 'ticket',
      entityId: ticketId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  async onTicketStatusChange(tenantId: string, ticketId: string, ticketNumber: string, newStatus: string, createdBy?: string): Promise<void> {
    if (!createdBy) return;
    const user = await this.getUserById(createdBy);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'ticket_status_change',
      title: `Ticket ${ticketNumber} aggiornato`,
      message: `Lo stato del ticket è cambiato a: ${newStatus}.`,
      entityType: 'ticket',
      entityId: ticketId,
      channel: NotificationChannel.BOTH,
      email: user.email,
      emailTemplate: 'ticket_update',
      emailVars: { ticketNumber, status: newStatus, recipientName: user.firstName, senderName: 'Connecteed', message: '' },
    });
  }

  async onTicketReply(tenantId: string, ticketId: string, ticketNumber: string, authorType: string, notifyUserId: string): Promise<void> {
    const user = await this.getUserById(notifyUserId);
    if (!user) return;

    const label = authorType === 'customer' ? 'Il cliente ha risposto' : 'Nuovo messaggio dall\'agente';
    await this.notify({
      tenantId,
      userId: user.id,
      type: 'ticket_reply',
      title: `${label} su ${ticketNumber}`,
      message: `C'è una nuova risposta sul ticket "${ticketNumber}".`,
      entityType: 'ticket',
      entityId: ticketId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  // ─── SLA TRIGGERS ────────────────────────────────────────────────────────

  async onSLABreached(tenantId: string, ticketId: string, ticketNumber: string, assignedTeam?: string): Promise<void> {
    // Notify support managers and assigned team
    const roles = ['admin', 'support'];
    const users = await this.getUsersByRole(tenantId, roles);

    for (const user of users) {
      await this.notify({
        tenantId,
        userId: user.id,
        type: 'sla_breached',
        title: `SLA scaduto: ${ticketNumber}`,
        message: `Il ticket ${ticketNumber} ha superato la scadenza SLA.${assignedTeam ? ` Team: ${assignedTeam}` : ''}`,
        entityType: 'ticket',
        entityId: ticketId,
        channel: NotificationChannel.BOTH,
        email: user.email,
      });
    }
  }

  async onSLAWarning(tenantId: string, ticketId: string, ticketNumber: string, minutesLeft: number): Promise<void> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket?.assignedTo) return;

    const user = await this.getUserById(ticket.assignedTo);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'sla_warning',
      title: `SLA in scadenza: ${ticketNumber}`,
      message: `Il ticket ${ticketNumber} scadrà tra ${minutesLeft} minuti.`,
      entityType: 'ticket',
      entityId: ticketId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  // ─── QUOTE / APPROVAL TRIGGERS ───────────────────────────────────────────

  async onQuoteAwaitingCEO(tenantId: string, quoteId: string, quoteNumber: string): Promise<void> {
    const ceos = await this.getUsersByRole(tenantId, ['ceo', 'admin']);

    for (const ceo of ceos) {
      await this.notify({
        tenantId,
        userId: ceo.id,
        type: 'quote_awaiting_ceo',
        title: `Preventivo in attesa approvazione: ${quoteNumber}`,
        message: `Il preventivo ${quoteNumber} è in attesa della tua approvazione.`,
        entityType: 'quote',
        entityId: quoteId,
        channel: NotificationChannel.BOTH,
        email: ceo.email,
      });
    }
  }

  async onQuoteSent(tenantId: string, quoteId: string, quoteNumber: string, clientEmail: string, clientName: string): Promise<void> {
    await this.emailService.sendTemplateEmail(clientEmail, 'quote_sent', {
      recipientName: clientName,
      quoteNumber,
      senderName: 'Connecteed',
      quoteLink: '',
    });
  }

  async onQuoteAccepted(tenantId: string, quoteId: string, quoteNumber: string, ownerId?: string): Promise<void> {
    if (!ownerId) return;
    const user = await this.getUserById(ownerId);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'quote_accepted',
      title: `Preventivo accettato: ${quoteNumber}`,
      message: `Il cliente ha accettato il preventivo ${quoteNumber}.`,
      entityType: 'quote',
      entityId: quoteId,
      channel: NotificationChannel.BOTH,
      email: user.email,
      emailTemplate: 'quote_approved',
      emailVars: { quoteNumber, notes: 'Accettato dal cliente', senderName: 'Connecteed' },
    });
  }

  async onQuoteRejected(tenantId: string, quoteId: string, quoteNumber: string, reason: string, ownerId?: string): Promise<void> {
    if (!ownerId) return;
    const user = await this.getUserById(ownerId);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'quote_rejected',
      title: `Preventivo rifiutato: ${quoteNumber}`,
      message: `Il cliente ha rifiutato il preventivo ${quoteNumber}. Motivo: ${reason}`,
      entityType: 'quote',
      entityId: quoteId,
      channel: NotificationChannel.BOTH,
      email: user.email,
      emailTemplate: 'quote_rejected',
      emailVars: { quoteNumber, notes: reason, senderName: 'Connecteed' },
    });
  }

  // ─── CONTRACT TRIGGERS ───────────────────────────────────────────────────

  async onContractAwaitingCEO(tenantId: string, contractId: string, contractNumber: string): Promise<void> {
    const ceos = await this.getUsersByRole(tenantId, ['ceo', 'admin']);
    for (const ceo of ceos) {
      await this.notify({
        tenantId,
        userId: ceo.id,
        type: 'contract_awaiting_ceo',
        title: `Contratto in attesa approvazione: ${contractNumber}`,
        message: `Il contratto ${contractNumber} è in attesa della tua approvazione.`,
        entityType: 'contract',
        entityId: contractId,
        channel: NotificationChannel.BOTH,
        email: ceo.email,
      });
    }
  }

  async onContractReadyToSign(tenantId: string, contractId: string, contractNumber: string, clientEmail?: string, clientName?: string): Promise<void> {
    if (clientEmail && clientName) {
      await this.emailService.sendTemplateEmail(clientEmail, 'contract_ready', {
        recipientName: clientName,
        contractNumber,
        senderName: 'Connecteed',
      });
    }
  }

  async onContractSigned(tenantId: string, contractId: string, contractNumber: string, ownerId?: string): Promise<void> {
    const users = await this.getUsersByRole(tenantId, ['admin', 'admin_legal', 'commerciale']);
    for (const u of users) {
      await this.notify({
        tenantId,
        userId: u.id,
        type: 'contract_signed',
        title: `Contratto firmato: ${contractNumber}`,
        message: `Il contratto ${contractNumber} è stato firmato. Procedere con fatturazione.`,
        entityType: 'contract',
        entityId: contractId,
        channel: NotificationChannel.BOTH,
        email: u.email,
      });
    }
  }

  // ─── INVOICE TRIGGERS ────────────────────────────────────────────────────

  async onInvoiceOverdue(tenantId: string, invoiceId: string, invoiceNumber: string, companyId?: string): Promise<void> {
    const admins = await this.getUsersByRole(tenantId, ['admin', 'admin_legal', 'ceo']);
    for (const u of admins) {
      await this.notify({
        tenantId,
        userId: u.id,
        type: 'invoice_overdue',
        title: `Fattura scaduta: ${invoiceNumber}`,
        message: `La fattura ${invoiceNumber} è scaduta e non è stata pagata.`,
        entityType: 'invoice',
        entityId: invoiceId,
        channel: NotificationChannel.BOTH,
        email: u.email,
      });
    }
  }

  async onInvoiceScheduleOverdue(tenantId: string, invoiceId: string, invoiceNumber: string, installmentNumber: number): Promise<void> {
    const admins = await this.getUsersByRole(tenantId, ['admin', 'admin_legal']);
    for (const u of admins) {
      await this.notify({
        tenantId,
        userId: u.id,
        type: 'schedule_overdue',
        title: `Rata scaduta: ${invoiceNumber} #${installmentNumber}`,
        message: `La rata ${installmentNumber} della fattura ${invoiceNumber} è scaduta.`,
        entityType: 'invoice',
        entityId: invoiceId,
        channel: NotificationChannel.BOTH,
        email: u.email,
      });
    }
  }

  // ─── PROJECT / GANTT TRIGGERS ─────────────────────────────────────────────

  async onProjectDelayDetected(tenantId: string, projectId: string, projectName: string, taskName: string, delayDays: number): Promise<void> {
    const pmsAndCommerciali = await this.getUsersByRole(tenantId, ['pm', 'commerciale', 'ceo']);
    for (const u of pmsAndCommerciali) {
      await this.notify({
        tenantId,
        userId: u.id,
        type: 'project_delay',
        title: `Ritardo progetto: ${projectName}`,
        message: `Il task "${taskName}" è in ritardo di ${delayDays} giorni.`,
        entityType: 'project',
        entityId: projectId,
        channel: NotificationChannel.BOTH,
        email: u.email,
      });
    }
  }

  async onMilestoneReady(tenantId: string, projectId: string, projectName: string, milestoneName: string, clientUserId?: string): Promise<void> {
    if (!clientUserId) return;
    const user = await this.getUserById(clientUserId);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'milestone_ready',
      title: `Milestone pronta: ${milestoneName}`,
      message: `La milestone "${milestoneName}" del progetto "${projectName}" è pronta per l'approvazione.`,
      entityType: 'project',
      entityId: projectId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  // ─── CHANGE REQUEST TRIGGERS ──────────────────────────────────────────────

  async onChangeRequestAwaitingCEO(tenantId: string, crId: string, crTitle: string): Promise<void> {
    const ceos = await this.getUsersByRole(tenantId, ['ceo', 'admin']);
    for (const ceo of ceos) {
      await this.notify({
        tenantId,
        userId: ceo.id,
        type: 'cr_awaiting_ceo',
        title: `Change Request in attesa: ${crTitle}`,
        message: `La richiesta di modifica "${crTitle}" è in attesa della tua approvazione.`,
        entityType: 'change_request',
        entityId: crId,
        channel: NotificationChannel.BOTH,
        email: ceo.email,
      });
    }
  }

  // ─── DOCUMENT TRIGGERS ───────────────────────────────────────────────────

  async onDocumentRequestedFromClient(tenantId: string, ticketId: string, ticketNumber: string, clientUserId: string, docDescription: string): Promise<void> {
    const user = await this.getUserById(clientUserId);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'document_requested',
      title: `Documento richiesto: ${docDescription}`,
      message: `È stato richiesto il caricamento del documento "${docDescription}". Ref: ${ticketNumber}`,
      entityType: 'ticket',
      entityId: ticketId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  // ─── LEAD TRIGGERS ───────────────────────────────────────────────────────

  async onLeadDueDateExpired(tenantId: string, leadId: string, leadName: string, ownerId: string): Promise<void> {
    const user = await this.getUserById(ownerId);
    if (!user) return;

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'lead_due_expired',
      title: `Lead scaduta: ${leadName}`,
      message: `La data di scadenza della lead "${leadName}" è stata superata.`,
      entityType: 'lead',
      entityId: leadId,
      channel: NotificationChannel.IN_APP,
    });
  }

  // ─── SCHEDULER: Batch checks ─────────────────────────────────────────────

  /** Called by scheduler: check for SLA warnings (tickets approaching deadline) */
  async checkSLAWarnings(tenantId: string): Promise<number> {
    const warningMinutes = 30;
    const now = new Date();
    const threshold = new Date(now.getTime() + warningMinutes * 60 * 1000);

    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.status != :closed', { closed: 'closed' })
      .andWhere('t.sla_deadline IS NOT NULL')
      .andWhere('t.sla_deadline > NOW()')
      .andWhere('t.sla_deadline <= :threshold', { threshold })
      .andWhere('t.first_response_at IS NULL')
      .getMany();

    for (const ticket of tickets) {
      const minutesLeft = Math.round((new Date(ticket.slaDeadline).getTime() - now.getTime()) / 60000);
      await this.onSLAWarning(tenantId, ticket.id, ticket.ticketNumber, minutesLeft);
    }
    return tickets.length;
  }

  /** Called by scheduler: check overdue invoice schedules */
  async checkOverdueSchedules(tenantId: string): Promise<number> {
    const overdue = await this.scheduleRepo.find({
      where: { tenantId, status: ScheduleStatus.PENDING, dueDate: LessThan(new Date()) },
    });

    for (const s of overdue) {
      s.status = ScheduleStatus.OVERDUE;
      await this.scheduleRepo.save(s);

      const invoice = await this.invoiceRepo.findOne({ where: { id: s.invoiceId } });
      if (invoice) {
        await this.onInvoiceScheduleOverdue(tenantId, invoice.id, invoice.invoiceNumber, s.installmentNumber);
      }
    }
    return overdue.length;
  }

  /** Called by scheduler: auto-create ticket for overdue invoices */
  async createOverdueTickets(tenantId: string): Promise<number> {
    const overdueInvoices = await this.invoiceRepo.find({
      where: { tenantId, status: 'overdue' as any },
    });

    let created = 0;
    for (const inv of overdueInvoices) {
      // Check if a solicitation ticket already exists for this invoice
      const existing = await this.ticketRepo.findOne({
        where: { tenantId, relatedEntityType: 'invoice', relatedEntityId: inv.id },
      });
      if (existing) continue;

      const ticketNumber = `TKT-${Date.now()}-${created}`;
      const ticket = this.ticketRepo.create({
        tenantId,
        ticketNumber,
        subject: `Sollecito fattura scaduta: ${inv.invoiceNumber}`,
        description: `La fattura ${inv.invoiceNumber} è scaduta. Procedere con il sollecito al cliente.`,
        status: 'open',
        priority: 'high',
        assignedTeam: 'admin_legal',
        relatedEntityType: 'invoice',
        relatedEntityId: inv.id,
        channel: 'system',
      } as any);
      await this.ticketRepo.save(ticket);
      created++;

      await this.onInvoiceOverdue(tenantId, inv.id, inv.invoiceNumber, inv.companyId);
    }
    return created;
  }

  // ─── DOCUMENT EXPIRY TRIGGERS ────────────────────────────────────────────

  async onDocumentExpiring(tenantId: string, fileId: string, fileName: string, expiryDate: Date, uploadedBy: string): Promise<void> {
    const user = await this.getUserById(uploadedBy);
    if (!user) return;

    const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    await this.notify({
      tenantId,
      userId: user.id,
      type: 'document_expiring',
      title: `Documento in scadenza: ${fileName}`,
      message: `Il documento "${fileName}" scadrà tra ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}.`,
      entityType: 'file',
      entityId: fileId,
      channel: NotificationChannel.BOTH,
      email: user.email,
    });
  }

  /** Called by scheduler: check for documents expiring within 7 days */
  async checkExpiringDocuments(tenantId: string): Promise<number> {
    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const files = await this.fileRepo
      .createQueryBuilder('f')
      .where('f.tenantId = :tenantId', { tenantId })
      .andWhere('f.expiry_date IS NOT NULL')
      .andWhere('f.expiry_date > :now', { now })
      .andWhere('f.expiry_date <= :threshold', { threshold })
      .getMany();

    for (const file of files) {
      if (file.uploadedBy) {
        await this.onDocumentExpiring(tenantId, file.id, file.name || file.originalName, file.expiryDate, file.uploadedBy);
      }
    }
    return files.length;
  }
}
