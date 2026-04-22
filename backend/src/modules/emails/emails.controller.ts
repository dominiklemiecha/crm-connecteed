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
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Email, EmailTemplate } from './email.entity';

@Controller('emails')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  // ─── Emails ──────────────────────────────────────────────────────────────

  @Post()
  @RequirePermission('emails.write')
  createEmail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<Email>,
  ) {
    return this.emailsService.createEmail(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('emails.read')
  findAllEmails(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.emailsService.findAllEmails(tenantId, pagination);
  }

  @Get('by-entity')
  @RequirePermission('emails.read')
  findByEntity(
    @CurrentTenant() tenantId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.emailsService.findByEntity(tenantId, entityType, entityId, pagination);
  }

  // ─── Templates (MUST be before :id routes) ─────────────────────────────

  @Post('templates')
  @RequirePermission('emails.write')
  createTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<EmailTemplate>,
  ) {
    return this.emailsService.createTemplate(tenantId, user.id, dto);
  }

  @Get('templates')
  @RequirePermission('emails.read')
  findAllTemplates(@CurrentTenant() tenantId: string) {
    return this.emailsService.findAllTemplates(tenantId);
  }

  @Get('templates/:id')
  @RequirePermission('emails.read')
  findTemplateById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emailsService.findTemplateById(tenantId, id);
  }

  @Put('templates/:id')
  @RequirePermission('emails.write')
  updateTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<EmailTemplate>,
  ) {
    return this.emailsService.updateTemplate(tenantId, user.id, id, dto);
  }

  @Delete('templates/:id')
  @RequirePermission('emails.write')
  removeTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emailsService.removeTemplate(tenantId, user.id, id);
  }

  // ─── Email CRUD (after static routes) ──────────────────────────────────

  @Get(':id')
  @RequirePermission('emails.read')
  findEmailById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emailsService.findEmailById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('emails.write')
  updateEmail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Email>,
  ) {
    return this.emailsService.updateEmail(tenantId, user.id, id, dto);
  }

  @Post(':id/send')
  @RequirePermission('emails.write')
  markSent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emailsService.markSent(tenantId, user.id, id);
  }

  @Delete(':id')
  @RequirePermission('emails.write')
  removeEmail(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emailsService.removeEmail(tenantId, user.id, id);
  }
}
