import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

export interface AuditLogInput {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    const entry = this.auditRepo.create(input);
    return this.auditRepo.save(entry);
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters?: {
      entityType?: string;
      userId?: string;
      action?: AuditAction;
      from?: Date;
      to?: Date;
    },
  ): Promise<PaginatedResult<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = { tenantId };

    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.from && filters?.to) {
      where.createdAt = Between(filters.from, filters.to);
    }

    const [data, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });

    return new PaginatedResult(
      data,
      total,
      pagination.page || 1,
      pagination.limit || 20,
    );
  }
}
