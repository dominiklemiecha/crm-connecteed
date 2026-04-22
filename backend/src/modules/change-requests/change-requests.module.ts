import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequest } from './change-request.entity';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestsController } from './change-requests.controller';
import { Quote, QuoteVersion, QuoteItem } from '../quotes/quote.entity';
import { Contract } from '../contracts/contract.entity';
import { Invoice, InvoiceItem } from '../invoices/invoice.entity';
import { GanttTask, Project } from '../projects/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    ChangeRequest, Quote, QuoteVersion, QuoteItem,
    Contract, Invoice, InvoiceItem, GanttTask, Project,
  ])],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
