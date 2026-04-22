import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import { TicketsService } from '../tickets/tickets.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationTriggerService } from '../notifications/notification-triggers.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private slaInterval: ReturnType<typeof setInterval>;
  private overdueInterval: ReturnType<typeof setInterval>;
  private notifyInterval: ReturnType<typeof setInterval>;
  private docExpiryInterval: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly ticketsService: TicketsService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationTriggers: NotificationTriggerService,
  ) {}

  onModuleInit() {
    this.logger.log('Scheduler started: SLA check every 5min, overdue invoices every 15min, notification triggers every 10min, doc expiry every 1h');

    // Check SLA breaches every 5 minutes
    this.slaInterval = setInterval(() => {
      this.runSLACheck().catch((err) =>
        this.logger.error(`SLA check failed: ${err.message}`),
      );
    }, 5 * 60 * 1000);

    // Check overdue invoices every 15 minutes
    this.overdueInterval = setInterval(() => {
      this.runOverdueCheck().catch((err) =>
        this.logger.error(`Overdue invoice check failed: ${err.message}`),
      );
    }, 15 * 60 * 1000);

    // Notification-based checks every 10 minutes (SLA warnings, overdue schedules, overdue ticket creation)
    this.notifyInterval = setInterval(() => {
      this.runNotificationChecks().catch((err) =>
        this.logger.error(`Notification checks failed: ${err.message}`),
      );
    }, 10 * 60 * 1000);

    // Document expiry reminders every hour
    this.docExpiryInterval = setInterval(() => {
      this.runDocumentExpiryCheck().catch((err) =>
        this.logger.error(`Document expiry check failed: ${err.message}`),
      );
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.slaInterval) clearInterval(this.slaInterval);
    if (this.overdueInterval) clearInterval(this.overdueInterval);
    if (this.notifyInterval) clearInterval(this.notifyInterval);
    if (this.docExpiryInterval) clearInterval(this.docExpiryInterval);
    this.logger.log('Scheduler stopped');
  }

  private async getTenantIds(): Promise<string[]> {
    const tenants = await this.tenantRepo.find({ select: ['id'] });
    return tenants.map((t) => t.id);
  }

  async runSLACheck(): Promise<void> {
    const tenantIds = await this.getTenantIds();
    let totalBreached = 0;
    for (const tenantId of tenantIds) {
      try {
        const breached = await this.ticketsService.checkSLABreaches(tenantId);
        totalBreached += breached.length;
      } catch (err) {
        this.logger.warn(`SLA check for tenant ${tenantId} failed: ${err.message}`);
      }
    }
    if (totalBreached > 0) {
      this.logger.log(`SLA check complete: ${totalBreached} ticket(s) breached across ${tenantIds.length} tenant(s)`);
    }
  }

  async runOverdueCheck(): Promise<void> {
    const tenantIds = await this.getTenantIds();
    let totalOverdue = 0;
    for (const tenantId of tenantIds) {
      try {
        const overdue = await this.invoicesService.checkOverdue(tenantId);
        totalOverdue += overdue.length;
      } catch (err) {
        this.logger.warn(`Overdue check for tenant ${tenantId} failed: ${err.message}`);
      }
    }
    if (totalOverdue > 0) {
      this.logger.log(`Overdue check complete: ${totalOverdue} invoice(s) marked overdue across ${tenantIds.length} tenant(s)`);
    }
  }

  async runNotificationChecks(): Promise<void> {
    const tenantIds = await this.getTenantIds();
    for (const tenantId of tenantIds) {
      try {
        // SLA warning notifications (tickets approaching deadline)
        const slaWarnings = await this.notificationTriggers.checkSLAWarnings(tenantId);
        if (slaWarnings > 0) this.logger.log(`SLA warnings: ${slaWarnings} ticket(s) near deadline (tenant ${tenantId})`);

        // Overdue schedule installments
        const overdueSchedules = await this.notificationTriggers.checkOverdueSchedules(tenantId);
        if (overdueSchedules > 0) this.logger.log(`Overdue schedules: ${overdueSchedules} installment(s) (tenant ${tenantId})`);

        // Auto-create solicitation tickets for overdue invoices
        const overdueTickets = await this.notificationTriggers.createOverdueTickets(tenantId);
        if (overdueTickets > 0) this.logger.log(`Auto-created ${overdueTickets} solicitation ticket(s) (tenant ${tenantId})`);
      } catch (err) {
        this.logger.warn(`Notification checks for tenant ${tenantId} failed: ${err.message}`);
      }
    }
  }

  async runDocumentExpiryCheck(): Promise<void> {
    const tenantIds = await this.getTenantIds();
    let totalExpiring = 0;
    for (const tenantId of tenantIds) {
      try {
        const expiring = await this.notificationTriggers.checkExpiringDocuments(tenantId);
        totalExpiring += expiring;
      } catch (err) {
        this.logger.warn(`Document expiry check for tenant ${tenantId} failed: ${err.message}`);
      }
    }
    if (totalExpiring > 0) {
      this.logger.log(`Document expiry check complete: ${totalExpiring} document(s) expiring soon across ${tenantIds.length} tenant(s)`);
    }
  }
}
