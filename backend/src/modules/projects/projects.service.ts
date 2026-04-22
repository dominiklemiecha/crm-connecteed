import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import {
  Project,
  ProjectWbsItem,
  GanttTask,
  WbsTemplate,
  ProjectStatus,
  WbsItemStatus,
  GanttTaskStatus,
  DependencyType,
} from './project.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/notification.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

export interface RescheduleAffectedTask {
  taskId: string;
  taskName: string;
  oldStart: string | null;
  oldEnd: string | null;
  newStart: string | null;
  newEnd: string | null;
}

export interface RescheduleProposal {
  sourceTaskId: string;
  shiftDays: number;
  affectedTasks: RescheduleAffectedTask[];
}

export interface DelayedTask {
  task: GanttTask;
  delayDays: number;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectWbsItem)
    private readonly wbsItemRepo: Repository<ProjectWbsItem>,
    @InjectRepository(GanttTask)
    private readonly ganttRepo: Repository<GanttTask>,
    @InjectRepository(WbsTemplate)
    private readonly wbsTemplateRepo: Repository<WbsTemplate>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  private async generateProjectNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.projectRepo.count({ where: { tenantId } });
    return `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  async create(tenantId: string, userId: string, dto: Partial<Project>): Promise<Project> {
    const projectNumber = await this.generateProjectNumber(tenantId);
    const project = this.projectRepo.create({
      ...dto,
      tenantId,
      projectNumber,
      status: ProjectStatus.PENDING_PAYMENT,
    });
    const saved = await this.projectRepo.save(project);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'project',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { projectNumber, status: ProjectStatus.PENDING_PAYMENT } as any,
    });

    return saved;
  }

  async createFromOpportunity(
    tenantId: string,
    userId: string,
    dto: {
      opportunityId: string;
      companyId?: string;
      contractId?: string;
      name: string;
      pmId?: string;
      productId?: string;
    },
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const projectNumber = await this.generateProjectNumber(tenantId);

      const project = manager.create(Project, {
        ...dto,
        tenantId,
        projectNumber,
        status: ProjectStatus.PENDING_PAYMENT,
      });
      const savedProject = await manager.save(project);

      // Auto-populate WBS from template if productId provided
      if (dto.productId) {
        const template = await this.wbsTemplateRepo.findOne({
          where: { tenantId, productId: dto.productId },
        });

        if (template && template.phases) {
          const wbsItems: ProjectWbsItem[] = [];
          for (const phase of template.phases) {
            for (const item of phase.items || []) {
              wbsItems.push(
                manager.create(ProjectWbsItem, {
                  tenantId,
                  projectId: savedProject.id,
                  phase: phase.name,
                  name: item.name,
                  sortOrder: item.sortOrder,
                  status: WbsItemStatus.TODO,
                }),
              );
            }
          }
          if (wbsItems.length > 0) {
            await manager.save(wbsItems);
          }
        }
      }

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'project',
        entityId: savedProject.id,
        action: AuditAction.CREATE,
        newValues: { projectNumber, opportunityId: dto.opportunityId, autoCreated: true } as any,
      });

      return savedProject;
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Project>> {
    const [data, total] = await this.projectRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, tenantId },
      relations: ['wbsItems', 'ganttTasks'],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<Project>,
  ): Promise<Project> {
    const project = await this.findById(tenantId, id);
    const oldValues = { ...project };
    Object.assign(project, dto);
    const saved = await this.projectRepo.save(project);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'project',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const project = await this.findById(tenantId, id);
    await this.projectRepo.remove(project);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'project',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  // ─── Block / Unblock ───────────────────────────────────────────────────────

  async blockProject(
    tenantId: string,
    userId: string,
    userEmail: string,
    id: string,
    reason: string,
  ): Promise<Project> {
    const project = await this.findById(tenantId, id);

    if (project.status === ProjectStatus.BLOCKED) {
      throw new BadRequestException('Il progetto è già bloccato');
    }
    if (project.status === ProjectStatus.CLOSED) {
      throw new BadRequestException('Non è possibile bloccare un progetto chiuso');
    }

    const previousStatus = project.status;
    project.status = ProjectStatus.BLOCKED;
    project.blockedAt = new Date();
    project.blockedBy = userId;
    project.blockedReason = reason;
    const saved = await this.projectRepo.save(project);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'project',
      entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: previousStatus } as any,
      newValues: { status: ProjectStatus.BLOCKED, reason } as any,
    });

    // Notify all users assigned to gantt tasks of this project
    await this.notifyProjectTeam(
      tenantId,
      id,
      project.name,
      'project_blocked',
      'Progetto BLOCCATO',
      `Il progetto "${project.name}" è stato bloccato da ${userEmail}. Motivo: ${reason}. FERMARE tutte le attività in corso.`,
    );

    return saved;
  }

  async unblockProject(
    tenantId: string,
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<Project> {
    const project = await this.findById(tenantId, id);

    if (project.status !== ProjectStatus.BLOCKED) {
      throw new BadRequestException('Il progetto non è bloccato');
    }

    project.status = ProjectStatus.IN_PROGRESS;
    project.blockedAt = null;
    project.blockedBy = null;
    project.blockedReason = null;
    const saved = await this.projectRepo.save(project);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'project',
      entityId: id,
      action: AuditAction.STATUS_CHANGE,
      oldValues: { status: ProjectStatus.BLOCKED } as any,
      newValues: { status: ProjectStatus.IN_PROGRESS } as any,
    });

    await this.notifyProjectTeam(
      tenantId,
      id,
      project.name,
      'project_unblocked',
      'Progetto SBLOCCATO',
      `Il progetto "${project.name}" è stato sbloccato da ${userEmail}. Le attività possono riprendere.`,
    );

    return saved;
  }

  private async notifyProjectTeam(
    tenantId: string,
    projectId: string,
    projectName: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    const tasks = await this.ganttRepo.find({
      where: { tenantId, projectId, assignedTo: Not(IsNull()) },
      select: ['assignedTo'],
    });

    const uniqueUserIds = [...new Set(tasks.map((t) => t.assignedTo))];

    // Also include PM if set
    const project = await this.projectRepo.findOne({ where: { id: projectId, tenantId }, select: ['pmId'] });
    if (project?.pmId && !uniqueUserIds.includes(project.pmId)) {
      uniqueUserIds.push(project.pmId);
    }

    await Promise.all(
      uniqueUserIds.map((uid) =>
        this.notificationsService.create({
          tenantId,
          userId: uid,
          type,
          title,
          message,
          entityType: 'project',
          entityId: projectId,
          channel: NotificationChannel.BOTH,
        }),
      ),
    );
  }

  // ─── Gantt ────────────────────────────────────────────────────────────────

  async getGantt(tenantId: string, projectId: string): Promise<GanttTask[]> {
    await this.findById(tenantId, projectId);
    return this.ganttRepo.find({
      where: { tenantId, projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async createGanttTask(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: Partial<GanttTask>,
  ): Promise<GanttTask> {
    await this.findById(tenantId, projectId);
    const task = this.ganttRepo.create({ ...dto, tenantId, projectId });
    const saved = await this.ganttRepo.save(task);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'gantt_task',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { projectId, name: dto.name } as any,
    });

    return saved;
  }

  async updateTaskProgress(
    tenantId: string,
    userId: string,
    taskId: string,
    progressPct: number,
    dto?: Partial<GanttTask>,
  ): Promise<GanttTask> {
    if (progressPct < 0 || progressPct > 100) {
      throw new BadRequestException('progressPct must be between 0 and 100');
    }

    const task = await this.ganttRepo.findOne({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Gantt task not found');

    Object.assign(task, { ...dto, progressPct });
    const saved = await this.ganttRepo.save(task);

    // Recalculate project progress
    await this.recalculateProjectProgress(tenantId, userId, task.projectId);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'gantt_task',
      entityId: taskId,
      action: AuditAction.UPDATE,
      newValues: { progressPct } as any,
    });

    return saved;
  }

  private async recalculateProjectProgress(
    tenantId: string,
    userId: string,
    projectId: string,
  ): Promise<void> {
    const tasks = await this.ganttRepo.find({
      where: { tenantId, projectId, isMilestone: false },
    });

    if (tasks.length === 0) return;

    const avg = tasks.reduce((s, t) => s + Number(t.progressPct), 0) / tasks.length;
    await this.projectRepo.update({ id: projectId, tenantId }, { progressPercent: Math.round(avg * 100) / 100 });
  }

  async updateGanttTask(
    tenantId: string,
    userId: string,
    taskId: string,
    dto: Partial<GanttTask>,
  ): Promise<GanttTask> {
    const task = await this.ganttRepo.findOne({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Gantt task not found');

    // Dependency validation (warn only, don't block)
    const updatedTask = { ...task, ...dto };
    if (updatedTask.dependencyTaskId) {
      const depTask = await this.ganttRepo.findOne({
        where: { id: updatedTask.dependencyTaskId, tenantId },
      });
      if (depTask) {
        const depType = updatedTask.dependencyType || DependencyType.FS;
        const taskActualStart = updatedTask.startDateActual || updatedTask.startDatePlanned;
        const depActualEnd = depTask.endDateActual || depTask.endDatePlanned;

        if (depType === DependencyType.FS && taskActualStart && depActualEnd) {
          const startMs = new Date(taskActualStart).getTime();
          const depEndMs = new Date(depActualEnd).getTime();
          if (startMs < depEndMs) {
            this.logger.warn(
              `Dependency violation (FS): Task "${updatedTask.name}" (${taskId}) starts before dependency "${depTask.name}" ends. ` +
              `Task start: ${taskActualStart}, Dep end: ${depActualEnd}. Auto-rescheduling recommended.`,
            );
          }
        }
      }
    }

    Object.assign(task, dto);
    const saved = await this.ganttRepo.save(task);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'gantt_task',
      entityId: taskId,
      action: AuditAction.UPDATE,
      newValues: dto as any,
    });

    return saved;
  }

  async removeGanttTask(tenantId: string, userId: string, taskId: string): Promise<void> {
    const task = await this.ganttRepo.findOne({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Gantt task not found');
    await this.ganttRepo.remove(task);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'gantt_task',
      entityId: taskId,
      action: AuditAction.DELETE,
    });
  }

  // ─── Gantt Advanced: Delays, Reschedule, Baseline ─────────────────────────

  async getDelays(tenantId: string, projectId: string): Promise<DelayedTask[]> {
    await this.findById(tenantId, projectId);
    const tasks = await this.ganttRepo.find({
      where: { tenantId, projectId },
      order: { sortOrder: 'ASC' },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const delays: DelayedTask[] = [];

    for (const task of tasks) {
      if (!task.endDatePlanned) continue;

      const plannedEnd = new Date(task.endDatePlanned);
      plannedEnd.setHours(0, 0, 0, 0);

      if (task.endDateActual) {
        // Task completed but late
        const actualEnd = new Date(task.endDateActual);
        actualEnd.setHours(0, 0, 0, 0);
        if (actualEnd > plannedEnd) {
          const diffMs = actualEnd.getTime() - plannedEnd.getTime();
          const delayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          delays.push({ task, delayDays });
        }
      } else if (task.status !== GanttTaskStatus.DONE && now > plannedEnd) {
        // Task not done and past due
        const diffMs = now.getTime() - plannedEnd.getTime();
        const delayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        delays.push({ task, delayDays });
      }
    }

    return delays;
  }

  async proposeReschedule(
    tenantId: string,
    projectId: string,
    taskId: string,
  ): Promise<RescheduleProposal> {
    await this.findById(tenantId, projectId);
    const sourceTask = await this.ganttRepo.findOne({ where: { id: taskId, tenantId, projectId } });
    if (!sourceTask) throw new NotFoundException('Gantt task not found');

    // Calculate how many days this task is delayed
    const plannedEnd = sourceTask.endDatePlanned ? new Date(sourceTask.endDatePlanned) : null;
    const actualEnd = sourceTask.endDateActual ? new Date(sourceTask.endDateActual) : null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!plannedEnd) {
      throw new BadRequestException('Task non ha una data di fine pianificata');
    }

    let referenceEnd: Date;
    if (actualEnd) {
      referenceEnd = actualEnd;
    } else if (sourceTask.status !== GanttTaskStatus.DONE && now > plannedEnd) {
      referenceEnd = now;
    } else {
      throw new BadRequestException('Task non risulta in ritardo');
    }

    plannedEnd.setHours(0, 0, 0, 0);
    referenceEnd.setHours(0, 0, 0, 0);
    const shiftDays = Math.ceil((referenceEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));

    if (shiftDays <= 0) {
      throw new BadRequestException('Task non risulta in ritardo');
    }

    // Find all downstream tasks (recursive)
    const allTasks = await this.ganttRepo.find({ where: { tenantId, projectId } });
    const downstreamIds = new Set<string>();
    this.collectDownstream(taskId, allTasks, downstreamIds);

    const affectedTasks: RescheduleAffectedTask[] = [];
    for (const t of allTasks) {
      if (!downstreamIds.has(t.id)) continue;

      const oldStart = t.startDatePlanned ? new Date(t.startDatePlanned) : null;
      const oldEnd = t.endDatePlanned ? new Date(t.endDatePlanned) : null;

      const newStart = oldStart ? new Date(oldStart.getTime() + shiftDays * 86400000) : null;
      const newEnd = oldEnd ? new Date(oldEnd.getTime() + shiftDays * 86400000) : null;

      affectedTasks.push({
        taskId: t.id,
        taskName: t.name,
        oldStart: oldStart ? oldStart.toISOString().split('T')[0] : null,
        oldEnd: oldEnd ? oldEnd.toISOString().split('T')[0] : null,
        newStart: newStart ? newStart.toISOString().split('T')[0] : null,
        newEnd: newEnd ? newEnd.toISOString().split('T')[0] : null,
      });
    }

    return { sourceTaskId: taskId, shiftDays, affectedTasks };
  }

  private collectDownstream(
    taskId: string,
    allTasks: GanttTask[],
    collected: Set<string>,
  ): void {
    const dependents = allTasks.filter((t) => t.dependencyTaskId === taskId);
    for (const dep of dependents) {
      if (!collected.has(dep.id)) {
        collected.add(dep.id);
        this.collectDownstream(dep.id, allTasks, collected);
      }
    }
  }

  async applyReschedule(
    tenantId: string,
    userId: string,
    projectId: string,
    proposal: RescheduleProposal,
  ): Promise<GanttTask[]> {
    await this.findById(tenantId, projectId);

    const updated: GanttTask[] = [];

    for (const affected of proposal.affectedTasks) {
      const task = await this.ganttRepo.findOne({
        where: { id: affected.taskId, tenantId, projectId },
      });
      if (!task) continue;

      const oldValues = {
        startDatePlanned: task.startDatePlanned,
        endDatePlanned: task.endDatePlanned,
      };

      if (affected.newStart) task.startDatePlanned = new Date(affected.newStart) as any;
      if (affected.newEnd) task.endDatePlanned = new Date(affected.newEnd) as any;

      const saved = await this.ganttRepo.save(task);
      updated.push(saved);

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'gantt_task',
        entityId: task.id,
        action: AuditAction.UPDATE,
        oldValues: oldValues as any,
        newValues: {
          startDatePlanned: affected.newStart,
          endDatePlanned: affected.newEnd,
          rescheduledFrom: proposal.sourceTaskId,
          shiftDays: proposal.shiftDays,
        } as any,
      });
    }

    return updated;
  }

  async setBaseline(
    tenantId: string,
    userId: string,
    projectId: string,
  ): Promise<GanttTask[]> {
    await this.findById(tenantId, projectId);
    const tasks = await this.ganttRepo.find({ where: { tenantId, projectId } });

    const updated: GanttTask[] = [];
    for (const task of tasks) {
      const oldPlannedStart = task.startDatePlanned;
      const oldPlannedEnd = task.endDatePlanned;

      // Copy actual dates to planned (baseline) dates
      // If actual dates are set, use those; otherwise keep current planned
      if (task.startDateActual) {
        task.startDatePlanned = task.startDateActual;
      }
      if (task.endDateActual) {
        task.endDatePlanned = task.endDateActual;
      }

      const saved = await this.ganttRepo.save(task);
      updated.push(saved);

      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'gantt_task',
        entityId: task.id,
        action: AuditAction.UPDATE,
        oldValues: {
          startDatePlanned: oldPlannedStart,
          endDatePlanned: oldPlannedEnd,
        } as any,
        newValues: {
          startDatePlanned: task.startDatePlanned,
          endDatePlanned: task.endDatePlanned,
          baselineSet: true,
        } as any,
      });
    }

    return updated;
  }

  // ─── WBS Templates ────────────────────────────────────────────────────────

  async createWbsTemplate(
    tenantId: string,
    userId: string,
    dto: Partial<WbsTemplate>,
  ): Promise<WbsTemplate> {
    const template = this.wbsTemplateRepo.create({ ...dto, tenantId });
    const saved = await this.wbsTemplateRepo.save(template);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'wbs_template',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: dto as any,
    });

    return saved;
  }

  async findWbsTemplates(tenantId: string, productId?: string): Promise<WbsTemplate[]> {
    const where: any = { tenantId };
    if (productId) where.productId = productId;
    return this.wbsTemplateRepo.find({ where, order: { name: 'ASC' } });
  }

  async updateWbsTemplate(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<WbsTemplate>,
  ): Promise<WbsTemplate> {
    const template = await this.wbsTemplateRepo.findOne({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('WBS template not found');
    Object.assign(template, dto);
    const saved = await this.wbsTemplateRepo.save(template);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'wbs_template',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: dto as any,
    });

    return saved;
  }
}
