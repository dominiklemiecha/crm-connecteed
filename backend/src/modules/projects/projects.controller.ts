import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ProjectsService, RescheduleProposal } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Project, GanttTask, WbsTemplate } from './project.entity';
import { UserRole } from '../auth/user.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission('projects.write')
  create(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: Partial<Project>) {
    return this.projectsService.create(t, u.id, dto);
  }

  @Post('from-opportunity')
  @RequirePermission('projects.write')
  createFromOpportunity(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: { opportunityId: string; companyId?: string; contractId?: string; name: string; pmId?: string; productId?: string }) {
    return this.projectsService.createFromOpportunity(t, u.id, dto);
  }

  @Get()
  @RequirePermission('projects.read')
  findAll(@CurrentTenant() t: string, @Query() p: PaginationDto) {
    return this.projectsService.findAll(t, p);
  }

  // ─── WBS Templates (MUST be before :id) ──────────────────────────────────

  @Post('wbs-templates')
  @RequirePermission('projects.write')
  createWbsTemplate(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: Partial<WbsTemplate>) {
    return this.projectsService.createWbsTemplate(t, u.id, dto);
  }

  @Get('wbs-templates')
  @RequirePermission('projects.read')
  findWbsTemplates(@CurrentTenant() t: string, @Query('productId') productId?: string) {
    return this.projectsService.findWbsTemplates(t, productId);
  }

  @Put('wbs-templates/:id')
  @RequirePermission('projects.write')
  updateWbsTemplate(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<WbsTemplate>) {
    return this.projectsService.updateWbsTemplate(t, u.id, id, dto);
  }

  // ─── Gantt (static prefix before :id) ─────────────────────────────────────

  @Put('gantt/:taskId')
  @RequirePermission('projects.write')
  updateGanttTask(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('taskId', ParseUUIDPipe) taskId: string, @Body() dto: Partial<GanttTask>) {
    return this.projectsService.updateGanttTask(t, u.id, taskId, dto);
  }

  @Put('gantt/:taskId/progress')
  @RequirePermission('projects.write')
  updateTaskProgress(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('taskId', ParseUUIDPipe) taskId: string, @Body('progressPct') progressPct: number) {
    return this.projectsService.updateTaskProgress(t, u.id, taskId, progressPct);
  }

  @Delete('gantt/:taskId')
  @RequirePermission('projects.write')
  removeGanttTask(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.projectsService.removeGanttTask(t, u.id, taskId);
  }

  // ─── Gantt Advanced: Delays, Reschedule, Baseline ─────────────────────────

  @Get(':id/delays')
  @RequirePermission('projects.read')
  getDelays(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getDelays(t, id);
  }

  @Post(':id/gantt/propose-reschedule/:taskId')
  @RequirePermission('projects.write')
  proposeReschedule(
    @CurrentTenant() t: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.projectsService.proposeReschedule(t, id, taskId);
  }

  @Post(':id/gantt/apply-reschedule')
  @RequirePermission('projects.write')
  applyReschedule(
    @CurrentTenant() t: string,
    @CurrentUser() u: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() proposal: RescheduleProposal,
  ) {
    return this.projectsService.applyReschedule(t, u.id, id, proposal);
  }

  @Post(':id/gantt/set-baseline')
  @RequirePermission('projects.write')
  setBaseline(
    @CurrentTenant() t: string,
    @CurrentUser() u: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.setBaseline(t, u.id, id);
  }

  // ─── Block / Unblock (CEO + Commerciale only) ────────────────────────────

  @Put(':id/block')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CEO, UserRole.COMMERCIALE, UserRole.ADMIN)
  @RequirePermission('projects.write')
  block(
    @CurrentTenant() t: string,
    @CurrentUser() u: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.projectsService.blockProject(t, u.id, u.email, id, reason || 'Nessun motivo specificato');
  }

  @Put(':id/unblock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CEO, UserRole.COMMERCIALE, UserRole.ADMIN)
  @RequirePermission('projects.write')
  unblock(
    @CurrentTenant() t: string,
    @CurrentUser() u: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.unblockProject(t, u.id, u.email, id);
  }

  // ─── Project CRUD (parametric :id LAST) ──────────────────────────────────

  @Get(':id')
  @RequirePermission('projects.read')
  findById(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findById(t, id);
  }

  @Put(':id')
  @RequirePermission('projects.write')
  update(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Project>) {
    return this.projectsService.update(t, u.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('projects.write')
  remove(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(t, u.id, id);
  }

  @Get(':id/gantt')
  @RequirePermission('projects.read')
  getGantt(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getGantt(t, id);
  }

  @Post(':id/gantt')
  @RequirePermission('projects.write')
  createGanttTask(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<GanttTask>) {
    return this.projectsService.createGanttTask(t, u.id, id, dto);
  }
}
