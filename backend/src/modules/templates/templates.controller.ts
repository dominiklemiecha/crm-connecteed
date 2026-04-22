import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { DocumentTemplateType } from './document-template.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  @RequirePermission('templates.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: DocumentTemplateType,
  ) {
    return this.service.findAll(tenantId, type);
  }

  // static routes before :id
  @Get('variables/:type')
  @RequirePermission('templates.read')
  getVariables(@Param('type') type: DocumentTemplateType) {
    return this.service.getAvailableVariables(type);
  }

  @Post('preview')
  @RequirePermission('templates.read')
  preview(
    @CurrentTenant() tenantId: string,
    @Body() body: { templateId: string; sampleData?: Record<string, string> },
  ) {
    return this.service
      .previewTemplate(tenantId, body.templateId, body.sampleData)
      .then((html) => ({ html }));
  }

  @Post('ensure-defaults')
  @RequirePermission('templates.write')
  ensureDefaults(@CurrentTenant() tenantId: string) {
    return this.service.ensureDefaults(tenantId).then(() => ({ ok: true }));
  }

  @Get(':id')
  @RequirePermission('templates.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermission('templates.write')
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: { type: DocumentTemplateType; name: string; htmlContent: string; isDefault?: boolean },
  ) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermission('templates.write')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; htmlContent?: string },
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('templates.write')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }

  @Put(':id/set-default')
  @RequirePermission('templates.write')
  setDefault(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setAsDefault(tenantId, id);
  }
}
