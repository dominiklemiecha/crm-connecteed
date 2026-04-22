import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { Lead } from '../leads/lead.entity';
import { Opportunity } from '../opportunities/opportunity.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Quote } from '../quotes/quote.entity';
import { Project } from '../projects/project.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Approval } from '../approvals/approval.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Opportunity, Ticket, Quote, Project, Invoice, Approval])],
  controllers: [DashboardController],
})
export class DashboardModule {}
