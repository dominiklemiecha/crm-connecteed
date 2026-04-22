import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TimeEntry } from './time-entry.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

export interface CreateTimeEntryDto {
  userId: string;
  projectId: string;
  taskId?: string;
  date: Date;
  hours: number;
  description?: string;
  billable?: boolean;
}

export interface TimeEntryFilterDto {
  projectId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class TimeTrackingService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeRepo: Repository<TimeEntry>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    actorId: string,
    dto: CreateTimeEntryDto,
  ): Promise<TimeEntry> {
    const entry = this.timeRepo.create({ ...dto, tenantId });
    const saved = await this.timeRepo.save(entry) as TimeEntry;

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'time_entry',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { projectId: dto.projectId, hours: dto.hours } as any,
    });

    return saved;
  }

  async findAll(tenantId: string, filter: TimeEntryFilterDto): Promise<TimeEntry[]> {
    const qb = this.timeRepo.createQueryBuilder('te')
      .where('te.tenant_id = :tenantId', { tenantId });

    if (filter.projectId) qb.andWhere('te.project_id = :projectId', { projectId: filter.projectId });
    if (filter.userId) qb.andWhere('te.user_id = :userId', { userId: filter.userId });
    if (filter.from) qb.andWhere('te.date >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('te.date <= :to', { to: filter.to });

    return qb.orderBy('te.date', 'DESC').getMany();
  }

  async findById(tenantId: string, id: string): Promise<TimeEntry> {
    const entry = await this.timeRepo.findOne({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Time entry not found');
    return entry;
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    dto: Partial<CreateTimeEntryDto>,
  ): Promise<TimeEntry> {
    const entry = await this.findById(tenantId, id);
    Object.assign(entry, dto);
    const saved = await this.timeRepo.save(entry) as TimeEntry;

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'time_entry',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, actorId: string, id: string): Promise<void> {
    const entry = await this.findById(tenantId, id);
    await this.timeRepo.remove(entry);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'time_entry',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  async getByProject(tenantId: string, projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT user_id, SUM(hours) AS total_hours, COUNT(*) AS entry_count,
              SUM(CASE WHEN billable THEN hours ELSE 0 END) AS billable_hours
       FROM time_entries
       WHERE tenant_id = $1 AND project_id = $2
       GROUP BY user_id ORDER BY total_hours DESC`,
      [tenantId, projectId],
    );
  }

  async getByUser(
    tenantId: string,
    userId: string,
    from?: string,
    to?: string,
  ): Promise<TimeEntry[]> {
    return this.findAll(tenantId, { userId, from, to });
  }

  async getProjectSummary(tenantId: string, projectId: string): Promise<any> {
    const [timeRows, ganttRows] = await Promise.all([
      this.dataSource.query(
        `SELECT
           COALESCE(SUM(hours), 0) AS total_hours,
           COALESCE(SUM(CASE WHEN billable THEN hours ELSE 0 END), 0) AS billable_hours
         FROM time_entries
         WHERE tenant_id = $1 AND project_id = $2`,
        [tenantId, projectId],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(
           EXTRACT(EPOCH FROM (end_date_planned - start_date_planned)) / 3600 * 8
         ), 0) AS estimated_hours
         FROM gantt_tasks
         WHERE tenant_id = $1 AND project_id = $2
           AND start_date_planned IS NOT NULL AND end_date_planned IS NOT NULL`,
        [tenantId, projectId],
      ),
    ]);

    const totalHours = parseFloat(timeRows[0]?.total_hours ?? '0');
    const billableHours = parseFloat(timeRows[0]?.billable_hours ?? '0');
    const estimatedHours = parseFloat(ganttRows[0]?.estimated_hours ?? '0');
    const variance = totalHours - estimatedHours;

    return {
      projectId,
      totalHours,
      billableHours,
      estimatedHours,
      variance,
      utilizationPct: estimatedHours > 0
        ? Math.round((totalHours / estimatedHours) * 10000) / 100
        : null,
    };
  }

  async getUserSummary(
    tenantId: string,
    userId: string,
    from?: string,
    to?: string,
  ): Promise<any> {
    const params: any[] = [tenantId, userId];
    let fromFilter = '';
    let toFilter = '';
    if (from) { params.push(from); fromFilter = ` AND date >= $${params.length}`; }
    if (to) { params.push(to); toFilter = ` AND date <= $${params.length}`; }

    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*) AS entry_count,
         COALESCE(SUM(hours), 0) AS total_hours,
         COALESCE(SUM(CASE WHEN billable THEN hours ELSE 0 END), 0) AS billable_hours,
         COUNT(DISTINCT project_id) AS project_count
       FROM time_entries
       WHERE tenant_id = $1 AND user_id = $2${fromFilter}${toFilter}`,
      params,
    );

    const byProject = await this.dataSource.query(
      `SELECT project_id, SUM(hours) AS total_hours, COUNT(*) AS entry_count
       FROM time_entries
       WHERE tenant_id = $1 AND user_id = $2${fromFilter}${toFilter}
       GROUP BY project_id ORDER BY total_hours DESC`,
      params,
    );

    return {
      userId,
      period: { from, to },
      entryCount: parseInt(rows[0]?.entry_count ?? '0', 10),
      totalHours: parseFloat(rows[0]?.total_hours ?? '0'),
      billableHours: parseFloat(rows[0]?.billable_hours ?? '0'),
      projectCount: parseInt(rows[0]?.project_count ?? '0', 10),
      byProject,
    };
  }
}
