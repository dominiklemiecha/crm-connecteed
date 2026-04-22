import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ProjectStatus {
  PENDING_PAYMENT = 'pending_payment',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  DELIVERED = 'delivered',
  CLOSED = 'closed',
}

export enum WbsItemStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked',
}

export enum GanttTaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  DELAYED = 'delayed',
}

export enum DependencyType {
  FS = 'FS', // Finish-to-Start (default)
  SS = 'SS', // Start-to-Start
  FF = 'FF', // Finish-to-Finish
  SF = 'SF', // Start-to-Finish
}

@Entity('projects')
@Index(['tenantId', 'projectNumber'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'pmId'])
export class Project extends BaseEntity {
  @Column({ name: 'project_number' })
  projectNumber: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PENDING_PAYMENT })
  status: ProjectStatus;

  @Column({ name: 'pm_id', type: 'uuid', nullable: true })
  pmId: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'progress_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  progressPercent: number;

  @Column({ name: 'blocked_at', type: 'timestamptz', nullable: true })
  blockedAt: Date | null;

  @Column({ name: 'blocked_by', type: 'uuid', nullable: true })
  blockedBy: string | null;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason: string | null;

  @OneToMany(() => ProjectWbsItem, (w) => w.project)
  wbsItems: ProjectWbsItem[];

  @OneToMany(() => GanttTask, (g) => g.project)
  ganttTasks: GanttTask[];
}

@Entity('wbs_templates')
@Index(['tenantId', 'productId'])
export class WbsTemplate extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  phases: Array<{
    name: string;
    items: Array<{ name: string; sortOrder: number }>;
  }>;
}

@Entity('project_wbs_items')
@Index(['tenantId', 'projectId'])
export class ProjectWbsItem extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.wbsItems)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  phase: string;

  @Column()
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'enum', enum: WbsItemStatus, default: WbsItemStatus.TODO })
  status: WbsItemStatus;
}

@Entity('gantt_tasks')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'projectId', 'sortOrder'])
export class GanttTask extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p) => p.ganttTasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'wbs_item_id', type: 'uuid', nullable: true })
  wbsItemId: string;

  @Column()
  name: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ name: 'assigned_team', nullable: true })
  assignedTeam: string;

  @Column({ name: 'start_date_planned', type: 'date', nullable: true })
  startDatePlanned: Date;

  @Column({ name: 'end_date_planned', type: 'date', nullable: true })
  endDatePlanned: Date;

  @Column({ name: 'start_date_actual', type: 'date', nullable: true })
  startDateActual: Date;

  @Column({ name: 'end_date_actual', type: 'date', nullable: true })
  endDateActual: Date;

  @Column({ name: 'progress_pct', type: 'numeric', precision: 5, scale: 2, default: 0 })
  progressPct: number;

  @Column({ name: 'dependency_type', type: 'enum', enum: DependencyType, default: DependencyType.FS, nullable: true })
  dependencyType: DependencyType;

  @Column({ name: 'dependency_task_id', type: 'uuid', nullable: true })
  dependencyTaskId: string;

  @Column({ name: 'is_milestone', type: 'boolean', default: false })
  isMilestone: boolean;

  @Column({ type: 'enum', enum: GanttTaskStatus, default: GanttTaskStatus.NOT_STARTED })
  status: GanttTaskStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
