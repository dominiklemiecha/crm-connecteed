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
import { UsersService, CreateUserDto, UpdateUserDto, UserFilterDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: UserFilterDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.usersService.findAll(tenantId, filters, pagination);
  }

  @Get(':id')
  @RequirePermission('users.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findById(tenantId, id);
  }

  @Post()
  @RequirePermission('users.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, actor.id, dto);
  }

  @Put(':id')
  @RequirePermission('users.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, actor.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('users.write')
  deactivate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deactivate(tenantId, actor.id, id);
  }

  @Put(':id/permissions')
  @RequirePermission('users.write')
  setPermissions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { permissions: Record<string, boolean> },
  ) {
    return this.usersService.setPermissions(tenantId, actor.id, id, body.permissions);
  }
}
