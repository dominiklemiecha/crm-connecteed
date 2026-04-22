import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: Partial<Contact>): Promise<Contact> {
    const contact = this.contactRepo.create({ ...dto, tenantId });
    const saved = await this.contactRepo.save(contact);
    await this.auditService.log({
      tenantId, userId, entityType: 'contact', entityId: saved.id,
      action: AuditAction.CREATE, newValues: dto as any,
    });
    return saved;
  }

  async findAll(tenantId: string, pagination: PaginationDto, companyId?: string): Promise<PaginatedResult<Contact>> {
    const where: any = { tenantId };
    if (companyId) where.companyId = companyId;

    const [data, total] = await this.contactRepo.findAndCount({
      where,
      relations: ['company'],
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id, tenantId }, relations: ['company'] });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(tenantId: string, userId: string, id: string, dto: Partial<Contact>): Promise<Contact> {
    const contact = await this.findById(tenantId, id);
    const oldValues = { ...contact };
    Object.assign(contact, dto);
    const saved = await this.contactRepo.save(contact);
    await this.auditService.log({
      tenantId, userId, entityType: 'contact', entityId: id,
      action: AuditAction.UPDATE, oldValues: oldValues as any, newValues: dto as any,
    });
    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const contact = await this.findById(tenantId, id);
    await this.contactRepo.remove(contact);
    await this.auditService.log({ tenantId, userId, entityType: 'contact', entityId: id, action: AuditAction.DELETE });
  }
}
