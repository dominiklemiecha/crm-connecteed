import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket, TicketMessage, SLAPolicy, Escalation } from './ticket.entity';
import { CannedResponse } from './canned-response.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketMessage, SLAPolicy, Escalation, CannedResponse, User])],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
