import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email, EmailStatus, EmailTemplate } from './email.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class EmailsService {
  constructor(
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly auditService: AuditService,
  ) {}

  // ─── Emails ────────────────────────────────────────────────────────────────

  async createEmail(tenantId: string, userId: string, dto: Partial<Email>): Promise<Email> {
    const email = this.emailRepo.create({ ...dto, tenantId });
    const saved = await this.emailRepo.save(email);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: dto as any,
    });

    return saved;
  }

  async findAllEmails(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Email>> {
    const [data, total] = await this.emailRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findEmailById(tenantId: string, id: string): Promise<Email> {
    const email = await this.emailRepo.findOne({ where: { id, tenantId } });
    if (!email) throw new NotFoundException('Email not found');
    return email;
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Email>> {
    const [data, total] = await this.emailRepo.findAndCount({
      where: { tenantId, relatedEntityType: entityType, relatedEntityId: entityId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async updateEmail(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<Email>,
  ): Promise<Email> {
    const email = await this.findEmailById(tenantId, id);
    const oldValues = { ...email };
    Object.assign(email, dto);
    const saved = await this.emailRepo.save(email);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async markSent(tenantId: string, userId: string, id: string): Promise<Email> {
    return this.updateEmail(tenantId, userId, id, {
      status: EmailStatus.SENT,
      sentAt: new Date(),
    });
  }

  async removeEmail(tenantId: string, userId: string, id: string): Promise<void> {
    const email = await this.findEmailById(tenantId, id);
    await this.emailRepo.remove(email);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  async createTemplate(
    tenantId: string,
    userId: string,
    dto: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const template = this.templateRepo.create({ ...dto, tenantId });
    const saved = await this.templateRepo.save(template);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email_template',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: dto as any,
    });

    return saved;
  }

  async findAllTemplates(tenantId: string): Promise<EmailTemplate[]> {
    return this.templateRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findTemplateById(tenantId: string, id: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Email template not found');
    return template;
  }

  async updateTemplate(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const template = await this.findTemplateById(tenantId, id);
    const oldValues = { ...template };
    Object.assign(template, dto);
    const saved = await this.templateRepo.save(template);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email_template',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async removeTemplate(tenantId: string, userId: string, id: string): Promise<void> {
    const template = await this.findTemplateById(tenantId, id);
    await this.templateRepo.remove(template);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'email_template',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }
}
