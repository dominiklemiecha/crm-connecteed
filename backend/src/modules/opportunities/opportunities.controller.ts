import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto, UpdateOpportunityDto, ChangeOpportunityStatusDto } from './dto/opportunity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OpportunityStatus } from './opportunity.entity';
import { AuditService } from '../audit/audit.service';

@Controller('opportunities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpportunitiesController {
  constructor(
    private readonly oppService: OpportunitiesService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission('opportunities.write')
  create(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: CreateOpportunityDto) {
    return this.oppService.create(t, u.id, dto);
  }

  @Get()
  @RequirePermission('opportunities.read')
  findAll(@CurrentTenant() t: string, @Query() p: PaginationDto, @Query('status') status?: OpportunityStatus, @Query('ownerId') ownerId?: string) {
    return this.oppService.findAll(t, p, { status, ownerId });
  }

  @Get('pipeline')
  @RequirePermission('opportunities.read')
  getPipeline(@CurrentTenant() t: string) {
    return this.oppService.getPipeline(t);
  }

  @Get(':id/timeline')
  @RequirePermission('opportunities.read')
  getTimeline(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.findByEntity(t, 'opportunity', id);
  }

  @Get(':id')
  @RequirePermission('opportunities.read')
  findById(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.oppService.findById(t, id);
  }

  @Put(':id')
  @RequirePermission('opportunities.write')
  update(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOpportunityDto) {
    return this.oppService.update(t, u.id, id, dto);
  }

  @Put(':id/status')
  @RequirePermission('opportunities.write')
  changeStatus(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeOpportunityStatusDto) {
    return this.oppService.changeStatus(t, u.id, id, dto.status, dto.lostReason);
  }

  @Delete(':id')
  @RequirePermission('opportunities.write')
  remove(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.oppService.remove(t, u.id, id);
  }
}
