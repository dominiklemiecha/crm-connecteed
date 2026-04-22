import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Post()
  @RequirePermission('departments.write')
  create(@CurrentTenant() tenantId: string, @Body() dto: any) {
    return this.deptService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('departments.read')
  findAll(@CurrentTenant() tenantId: string) {
    return this.deptService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('departments.read')
  findById(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deptService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('departments.write')
  update(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.deptService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('departments.write')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deptService.remove(tenantId, id);
  }
}
