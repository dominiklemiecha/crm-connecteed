import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, ChangeLeadStatusDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { LeadStatus } from './lead.entity';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly oppService: OpportunitiesService,
  ) {}

  @Post()
  @RequirePermission('leads.write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('leads.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: LeadStatus,
    @Query('ownerId') ownerId?: string,
    @Query('source') source?: string,
  ) {
    return this.leadsService.findAll(tenantId, pagination, { status, ownerId, source });
  }

  @Get('pipeline')
  @RequirePermission('leads.read')
  getPipeline(@CurrentTenant() tenantId: string) {
    return this.leadsService.getPipeline(tenantId);
  }

  @Get(':id')
  @RequirePermission('leads.read')
  findById(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('leads.write')
  update(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(tenantId, user.id, id, dto);
  }

  @Put(':id/status')
  @RequirePermission('leads.write')
  changeStatus(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeLeadStatusDto) {
    return this.leadsService.changeStatus(tenantId, user.id, id, dto.status);
  }

  @Post(':id/convert')
  @RequirePermission('leads.write')
  async convert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; estimatedValueCents?: number; probability?: number; companyId?: string; productId?: string },
  ) {
    const lead = await this.leadsService.findById(tenantId, id);

    // Mark lead as qualified (skip if already qualified)
    if (lead.status !== LeadStatus.QUALIFIED) {
      try {
        await this.leadsService.changeStatus(tenantId, user.id, id, LeadStatus.QUALIFIED);
      } catch { /* already qualified or can't transition — proceed anyway */ }
    }

    // Resolve companyId: use lead's companyId, or from dto, or create from companyName
    let companyId = lead.companyId || dto.companyId;

    // Resolve productId: from lead products or from dto
    const productId = dto.productId || lead.leadProducts?.[0]?.productId;
    if (!productId) {
      throw new BadRequestException('No product associated with this lead. Provide productId in the request body.');
    }
    if (!companyId) {
      throw new BadRequestException('No company associated with this lead. Provide companyId in the request body.');
    }

    const opp = await this.oppService.create(tenantId, user.id, {
      leadId: lead.id,
      companyId,
      contactId: lead.contactId || undefined,
      productId,
      source: lead.source,
      ownerId: lead.ownerId,
      assignedToUserId: lead.assignedToUserId,
      nextDueDate: lead.nextDueDate?.toISOString(),
      name: dto.name || lead.companyName || 'Opportunita da Lead',
      estimatedValueCents: dto.estimatedValueCents || lead.valueEstimateCents,
      probability: dto.probability || lead.probability,
    });
    return opp;
  }

  @Delete(':id')
  @RequirePermission('leads.write')
  remove(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.remove(tenantId, user.id, id);
  }
}
