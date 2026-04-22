import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationTriggerService } from './notification-triggers.service';
import { User } from '../auth/user.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Invoice, InvoiceSchedule } from '../invoices/invoice.entity';
import { FileRecord } from '../files/file.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Ticket, Invoice, InvoiceSchedule, FileRecord])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationTriggerService],
  exports: [NotificationsService, NotificationTriggerService],
})
export class NotificationsModule {}
