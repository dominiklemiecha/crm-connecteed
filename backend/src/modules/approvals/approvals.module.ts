import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Approval } from './approval.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { Quote } from '../quotes/quote.entity';
import { Contract } from '../contracts/contract.entity';
import { Notification } from '../notifications/notification.entity';
import { Company } from '../companies/company.entity';
import { User } from '../auth/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Approval, Quote, Contract, Notification, Company, User])],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
