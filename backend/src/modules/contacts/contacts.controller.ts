import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermission('contacts.write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.contactsService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('contacts.read')
  findAll(@CurrentTenant() tenantId: string, @Query() pagination: PaginationDto, @Query('companyId') companyId?: string) {
    return this.contactsService.findAll(tenantId, pagination, companyId);
  }

  @Get(':id')
  @RequirePermission('contacts.read')
  findById(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('contacts.write')
  update(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.contactsService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('contacts.write')
  remove(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.remove(tenantId, user.id, id);
  }
}
