import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel } from './notification.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepo.create({
      ...input,
      isRead: false,
      channel: input.channel || NotificationChannel.IN_APP,
      sentAt: new Date(),
    });
    return this.notificationRepo.save(notification);
  }

  async findByUser(
    tenantId: string,
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Notification>> {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({ where: { id, tenantId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAsRead(tenantId: string, userId: string, id: string): Promise<Notification> {
    const notification = await this.findById(tenantId, id);
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'notification',
        entityId: id,
        action: AuditAction.UPDATE,
        newValues: { isRead: true } as any,
      });
    }
    return notification;
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('tenant_id = :tenantId AND user_id = :userId AND is_read = false', {
        tenantId,
        userId,
      })
      .execute();

    return { updated: result.affected || 0 };
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { tenantId, userId, isRead: false },
    });
    return { count };
  }
}
