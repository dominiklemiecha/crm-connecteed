import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequest, ChangeRequestStatus } from './change-request.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('change-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChangeRequestsController {
  constructor(private readonly crService: ChangeRequestsService) {}

  @Post()
  @RequirePermission('change_requests.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<ChangeRequest>,
  ) {
    return this.crService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('change_requests.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('projectId') projectId?: string,
  ) {
    return this.crService.findAll(tenantId, pagination, projectId);
  }

  @Get(':id')
  @RequirePermission('change_requests.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.crService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('change_requests.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<ChangeRequest>,
  ) {
    return this.crService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('change_requests.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.crService.remove(tenantId, user.id, id);
  }

  @Patch(':id/status')
  @RequirePermission('change_requests.write')
  transitionStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: ChangeRequestStatus } & Partial<ChangeRequest>,
  ) {
    const { status, ...extra } = dto;
    return this.crService.transitionStatus(tenantId, user.id, id, status, extra);
  }
}
