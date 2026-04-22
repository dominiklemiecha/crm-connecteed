import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Tenant } from '../tenant/tenant.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    TicketsModule,
    InvoicesModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
