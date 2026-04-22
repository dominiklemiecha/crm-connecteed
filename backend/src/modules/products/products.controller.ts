import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission('products.write')
  create(@CurrentTenant() tenantId: string, @Body() dto: any) {
    return this.productsService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('products.read')
  findAll(@CurrentTenant() tenantId: string, @Query() pagination: PaginationDto) {
    return this.productsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @RequirePermission('products.read')
  findById(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('products.write')
  update(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('products.write')
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(tenantId, id);
  }
}
