import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity, OpportunityStatus } from './opportunity.entity';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

const VALID_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  [OpportunityStatus.SCOPING]: [OpportunityStatus.PRESALES, OpportunityStatus.LOST],
  [OpportunityStatus.PRESALES]: [OpportunityStatus.QUOTE_PREPARING, OpportunityStatus.LOST],
  [OpportunityStatus.QUOTE_PREPARING]: [OpportunityStatus.AWAITING_CEO, OpportunityStatus.LOST],
  [OpportunityStatus.AWAITING_CEO]: [OpportunityStatus.SENT_TO_CLIENT, OpportunityStatus.QUOTE_PREPARING, OpportunityStatus.LOST],
  [OpportunityStatus.SENT_TO_CLIENT]: [OpportunityStatus.NEGOTIATION, OpportunityStatus.ACCEPTED, OpportunityStatus.LOST],
  [OpportunityStatus.NEGOTIATION]: [OpportunityStatus.ACCEPTED, OpportunityStatus.QUOTE_PREPARING, OpportunityStatus.LOST],
  [OpportunityStatus.ACCEPTED]: [OpportunityStatus.CONTRACT_SIGNING, OpportunityStatus.LOST],
  [OpportunityStatus.CONTRACT_SIGNING]: [OpportunityStatus.AWAITING_PAYMENT, OpportunityStatus.LOST],
  [OpportunityStatus.AWAITING_PAYMENT]: [OpportunityStatus.WON, OpportunityStatus.LOST],
  [OpportunityStatus.WON]: [],
  [OpportunityStatus.LOST]: [OpportunityStatus.SCOPING, OpportunityStatus.PRESALES, OpportunityStatus.QUOTE_PREPARING, OpportunityStatus.NEGOTIATION],
};

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opRepo: Repository<Opportunity>,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const opp = this.opRepo.create({
      ...dto,
      tenantId,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      status: OpportunityStatus.SCOPING,
    });
    const saved = await this.opRepo.save(opp);
    await this.auditService.log({
      tenantId, userId, entityType: 'opportunity', entityId: saved.id,
      action: AuditAction.CREATE, newValues: dto as any,
    });
    return this.findById(tenantId, saved.id);
  }

  async findAll(tenantId: string, pagination: PaginationDto, filters?: {
    status?: OpportunityStatus; ownerId?: string;
  }): Promise<PaginatedResult<Opportunity>> {
    const qb = this.opRepo.createQueryBuilder('opp')
      .leftJoinAndSelect('opp.company', 'company')
      .where('opp.tenantId = :tenantId', { tenantId });

    if (filters?.status) qb.andWhere('opp.status = :status', { status: filters.status });
    if (filters?.ownerId) qb.andWhere('opp.ownerId = :ownerId', { ownerId: filters.ownerId });
    if (pagination.search) {
      qb.andWhere('(opp.name ILIKE :s OR company.name ILIKE :s)', { s: `%${pagination.search}%` });
    }

    qb.orderBy(`opp.${pagination.sortBy || 'createdAt'}`, pagination.sortOrder || 'DESC');
    qb.skip(((pagination.page || 1) - 1) * (pagination.limit || 20));
    qb.take(pagination.limit || 20);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Opportunity> {
    const opp = await this.opRepo.findOne({ where: { id, tenantId }, relations: ['company'] });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const opp = await this.findById(tenantId, id);
    const old = { status: opp.status };
    Object.assign(opp, { ...dto, nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : opp.nextDueDate });
    const saved = await this.opRepo.save(opp);
    await this.auditService.log({ tenantId, userId, entityType: 'opportunity', entityId: id, action: AuditAction.UPDATE, oldValues: old as any, newValues: dto as any });
    return saved;
  }

  async changeStatus(tenantId: string, userId: string, id: string, newStatus: OpportunityStatus, lostReason?: string): Promise<Opportunity> {
    const opp = await this.findById(tenantId, id);
    const oldStatus = opp.status;

    const allowed = VALID_TRANSITIONS[oldStatus];
    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${oldStatus} to ${newStatus}`);
    }

    if (newStatus === OpportunityStatus.LOST && !lostReason) {
      throw new BadRequestException('lost_reason is required when moving to lost');
    }

    if (![OpportunityStatus.LOST, OpportunityStatus.SCOPING].includes(newStatus)) {
      // Auto-assign current user when reopening from lost
      if (!opp.assignedToUserId && oldStatus === OpportunityStatus.LOST) {
        opp.assignedToUserId = userId;
      }
      if (!opp.nextDueDate && oldStatus === OpportunityStatus.LOST) {
        opp.nextDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // +14 days
      }
      if (!opp.assignedToUserId) throw new BadRequestException('assigned_to_user_id required to advance');
      if (!opp.nextDueDate) throw new BadRequestException('next_due_date required to advance');
    }

    opp.status = newStatus;
    if (lostReason) opp.lostReason = lostReason;
    await this.opRepo.save(opp);

    await this.auditService.log({
      tenantId, userId, entityType: 'opportunity', entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus, lostReason },
      description: `Opportunity ${oldStatus} → ${newStatus}`,
    });

    return opp;
  }

  async getPipeline(tenantId: string): Promise<Record<string, { count: number; totalValue: number }>> {
    const result = await this.opRepo.createQueryBuilder('opp')
      .select('opp.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(opp.estimated_value_cents), 0)', 'totalValue')
      .where('opp.tenantId = :tenantId', { tenantId })
      .groupBy('opp.status')
      .getRawMany();

    const pipeline: Record<string, { count: number; totalValue: number }> = {};
    for (const s of Object.values(OpportunityStatus)) {
      const row = result.find((r: any) => r.status === s);
      pipeline[s] = { count: parseInt(row?.count || '0'), totalValue: parseInt(row?.totalValue || '0') };
    }
    return pipeline;
  }

  async convertFromLead(tenantId: string, userId: string, leadId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const opp = await this.create(tenantId, userId, { ...dto, leadId });
    await this.auditService.log({
      tenantId, userId, entityType: 'opportunity', entityId: opp.id,
      action: AuditAction.CREATE,
      description: `Converted from lead ${leadId}`,
    });
    return opp;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const opp = await this.findById(tenantId, id);
    await this.opRepo.remove(opp);
    await this.auditService.log({ tenantId, userId, entityType: 'opportunity', entityId: id, action: AuditAction.DELETE });
  }
}
