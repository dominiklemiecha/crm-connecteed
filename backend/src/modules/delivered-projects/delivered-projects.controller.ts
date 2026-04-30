import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DeliveredProjectsService } from './delivered-projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('delivered-projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveredProjectsController {
  constructor(private readonly service: DeliveredProjectsService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string, @Query() pagination: PaginationDto) {
    return this.service.findAll(tenantId, pagination);
  }

  @Get(':id')
  findById(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermission('delivered_projects.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: any,
  ) {
    return this.service.create(tenantId, user?.id, dto);
  }

  @Patch(':id')
  @RequirePermission('delivered_projects.write')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('delivered_projects.write')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(tenantId, id);
  }
}
