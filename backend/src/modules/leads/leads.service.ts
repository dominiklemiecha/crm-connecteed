import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead, LeadStatus, LeadProduct } from './lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.QUALIFYING, LeadStatus.UNQUALIFIED],
  [LeadStatus.QUALIFYING]: [LeadStatus.QUALIFIED, LeadStatus.UNQUALIFIED],
  [LeadStatus.QUALIFIED]: [],
  [LeadStatus.UNQUALIFIED]: [LeadStatus.NEW],
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadProduct)
    private readonly leadProductRepo: Repository<LeadProduct>,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepo.create({
      tenantId,
      companyId: dto.companyId,
      contactId: dto.contactId,
      companyName: dto.companyName,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      source: dto.source,
      ownerId: dto.ownerId,
      assignedToUserId: dto.assignedToUserId,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      valueEstimateCents: dto.valueEstimateCents,
      probability: dto.probability,
      notes: dto.notes,
      status: LeadStatus.NEW,
    });

    const saved = await this.leadRepo.save(lead);

    // Save lead products
    const leadProducts = dto.productIds.map((productId) =>
      this.leadProductRepo.create({ leadId: saved.id, productId }),
    );
    await this.leadProductRepo.save(leadProducts);

    await this.auditService.log({
      tenantId, userId, entityType: 'lead', entityId: saved.id,
      action: AuditAction.CREATE, newValues: dto as any,
    });

    return this.findById(tenantId, saved.id);
  }

  async findAll(tenantId: string, pagination: PaginationDto, filters?: {
    status?: LeadStatus; ownerId?: string; source?: string;
  }): Promise<PaginatedResult<Lead>> {
    const qb = this.leadRepo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.company', 'company')
      .leftJoinAndSelect('lead.contact', 'contact')
      .leftJoinAndSelect('lead.leadProducts', 'leadProducts')
      .where('lead.tenantId = :tenantId', { tenantId });

    if (filters?.status) qb.andWhere('lead.status = :status', { status: filters.status });
    if (filters?.ownerId) qb.andWhere('lead.ownerId = :ownerId', { ownerId: filters.ownerId });
    if (filters?.source) qb.andWhere('lead.source = :source', { source: filters.source });
    if (pagination.search) {
      qb.andWhere('(lead.companyName ILIKE :search OR lead.contactName ILIKE :search OR lead.contactEmail ILIKE :search)', { search: `%${pagination.search}%` });
    }

    qb.orderBy(`lead.${pagination.sortBy || 'createdAt'}`, pagination.sortOrder || 'DESC');
    qb.skip(((pagination.page || 1) - 1) * (pagination.limit || 20));
    qb.take(pagination.limit || 20);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id, tenantId },
      relations: ['company', 'contact', 'leadProducts'],
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findById(tenantId, id);
    const oldValues = { status: lead.status, ownerId: lead.ownerId };

    Object.assign(lead, {
      ...dto,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : lead.nextDueDate,
      productIds: undefined,
    });
    await this.leadRepo.save(lead);

    if (dto.productIds) {
      await this.leadProductRepo.delete({ leadId: id });
      const lps = dto.productIds.map((pid) => this.leadProductRepo.create({ leadId: id, productId: pid }));
      await this.leadProductRepo.save(lps);
    }

    await this.auditService.log({
      tenantId, userId, entityType: 'lead', entityId: id,
      action: AuditAction.UPDATE, oldValues: oldValues as any, newValues: dto as any,
    });

    return this.findById(tenantId, id);
  }

  async changeStatus(tenantId: string, userId: string, id: string, newStatus: LeadStatus): Promise<Lead> {
    const lead = await this.findById(tenantId, id);
    const oldStatus = lead.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[oldStatus];
    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${oldStatus} to ${newStatus}`);
    }

    // Validate required fields to advance
    if (newStatus !== LeadStatus.UNQUALIFIED && newStatus !== LeadStatus.NEW) {
      // Auto-assign current user if missing
      if (!lead.assignedToUserId) {
        lead.assignedToUserId = userId;
      }
      if (!lead.nextDueDate) {
        lead.nextDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
    }

    lead.status = newStatus;
    await this.leadRepo.save(lead);

    await this.auditService.log({
      tenantId, userId, entityType: 'lead', entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      description: `Lead status changed from ${oldStatus} to ${newStatus}`,
    });

    return lead;
  }

  async getPipeline(tenantId: string): Promise<Record<string, { count: number; totalValue: number }>> {
    const result = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(lead.value_estimate_cents), 0)', 'totalValue')
      .where('lead.tenantId = :tenantId', { tenantId })
      .groupBy('lead.status')
      .getRawMany();

    const pipeline: Record<string, { count: number; totalValue: number }> = {};
    for (const s of Object.values(LeadStatus)) {
      const row = result.find((r: any) => r.status === s);
      pipeline[s] = { count: parseInt(row?.count || '0'), totalValue: parseInt(row?.totalValue || '0') };
    }
    return pipeline;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const lead = await this.findById(tenantId, id);
    await this.leadRepo.remove(lead);
    await this.auditService.log({ tenantId, userId, entityType: 'lead', entityId: id, action: AuditAction.DELETE });
  }
}
