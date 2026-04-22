import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { Opportunity, OpportunityStatus } from '../opportunities/opportunity.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { Quote, QuoteStatus } from '../quotes/quote.entity';
import { Project, ProjectStatus } from '../projects/project.entity';
import { Invoice, InvoiceStatus } from '../invoices/invoice.entity';
import { Approval, ApprovalStatus } from '../approvals/approval.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Quote) private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Approval) private readonly approvalRepo: Repository<Approval>,
  ) {}

  @Get()
  async getKpis(@CurrentTenant() tenantId: string) {
    const [
      leadsActive,
      opportunitiesActive,
      ticketsOpen,
      quotesPending,
      projectsActive,
      invoicesOverdue,
      approvalsPending,
      pipelineValue,
    ] = await Promise.all([
      this.leadRepo.count({ where: [{ tenantId, status: LeadStatus.NEW }, { tenantId, status: LeadStatus.QUALIFYING }] }),
      this.oppRepo.count({
        where: [
          { tenantId, status: OpportunityStatus.SCOPING },
          { tenantId, status: OpportunityStatus.PRESALES },
          { tenantId, status: OpportunityStatus.QUOTE_PREPARING },
          { tenantId, status: OpportunityStatus.NEGOTIATION },
        ],
      }),
      this.ticketRepo.count({
        where: [
          { tenantId, status: TicketStatus.OPEN },
          { tenantId, status: TicketStatus.IN_PROGRESS },
          { tenantId, status: TicketStatus.WAITING },
        ],
      }),
      this.quoteRepo.count({ where: { tenantId, status: QuoteStatus.AWAITING_CEO } }),
      this.projectRepo.count({ where: { tenantId, status: ProjectStatus.IN_PROGRESS } }),
      this.invoiceRepo.count({ where: { tenantId, status: InvoiceStatus.OVERDUE } }),
      this.approvalRepo.count({ where: { tenantId, status: ApprovalStatus.PENDING } }),
      this.oppRepo.createQueryBuilder('o')
        .select('COALESCE(SUM(o.estimated_value_cents), 0)', 'total')
        .where('o.tenant_id = :tenantId', { tenantId })
        .andWhere('o.status NOT IN (:...excluded)', { excluded: [OpportunityStatus.WON, OpportunityStatus.LOST] })
        .getRawOne(),
    ]);

    return {
      leadsActive,
      opportunitiesActive,
      ticketsOpen,
      quotesPending,
      projectsActive,
      invoicesOverdue,
      approvalsPending,
      pipelineValueCents: parseInt(pipelineValue?.total || '0'),
    };
  }
}
