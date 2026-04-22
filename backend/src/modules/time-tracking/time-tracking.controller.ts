import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TimeTrackingService, CreateTimeEntryDto, TimeEntryFilterDto } from './time-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('time-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimeTrackingController {
  constructor(private readonly timeService: TimeTrackingService) {}

  @Post()
  @RequirePermission('time_tracking.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Body() dto: CreateTimeEntryDto,
  ) {
    return this.timeService.create(tenantId, actor.id, dto);
  }

  @Get()
  @RequirePermission('time_tracking.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filter: TimeEntryFilterDto,
  ) {
    return this.timeService.findAll(tenantId, filter);
  }

  @Get('project/:projectId/summary')
  @RequirePermission('time_tracking.read')
  getProjectSummary(
    @CurrentTenant() tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.timeService.getProjectSummary(tenantId, projectId);
  }

  @Get('user/:userId/summary')
  @RequirePermission('time_tracking.read')
  getUserSummary(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeService.getUserSummary(tenantId, userId, from, to);
  }

  @Put(':id')
  @RequirePermission('time_tracking.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTimeEntryDto>,
  ) {
    return this.timeService.update(tenantId, actor.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('time_tracking.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.timeService.remove(tenantId, actor.id, id);
  }
}
