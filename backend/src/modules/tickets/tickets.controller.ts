import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TicketStatus, TicketPriority } from './ticket.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}

  @Post()
  @RequirePermission('tickets.write')
  create(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: any) { return this.svc.create(t, u.id, dto); }

  @Get()
  @RequirePermission('tickets.read')
  findAll(@CurrentTenant() t: string, @Query() p: PaginationDto, @Query('status') status?: TicketStatus, @Query('priority') priority?: TicketPriority, @Query('assignedTo') assignedTo?: string, @Query('assignedTeam') assignedTeam?: string) {
    return this.svc.findAll(t, p, { status, priority, assignedTo, assignedTeam });
  }

  // ── Canned Responses (BEFORE :id to avoid route collision) ──────

  @Get('canned-responses')
  @RequirePermission('tickets.read')
  getCannedResponses(@CurrentTenant() t: string) { return this.svc.getCannedResponses(t); }

  @Post('canned-responses')
  @RequirePermission('tickets.write')
  createCannedResponse(@CurrentTenant() t: string, @Body() dto: any) { return this.svc.createCannedResponse(t, dto); }

  @Put('canned-responses/:id')
  @RequirePermission('tickets.write')
  updateCannedResponse(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.svc.updateCannedResponse(t, id, dto);
  }

  @Delete('canned-responses/:id')
  @RequirePermission('tickets.write')
  deleteCannedResponse(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteCannedResponse(t, id);
  }

  // ── Ticket by ID ────────────────────────────────────────────────

  @Get(':id')
  @RequirePermission('tickets.read')
  findById(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t, id); }

  @Get(':id/messages')
  @RequirePermission('tickets.read')
  getMessages(@Param('id', ParseUUIDPipe) id: string, @Query('includeInternal') includeInternal?: string) {
    return this.svc.getMessages(id, includeInternal === 'true');
  }

  @Post(':id/reply')
  @RequirePermission('tickets.write')
  addMessage(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: any, @Body() dto: { content: string; isInternal?: boolean }) {
    return this.svc.addMessage(t, id, u.id, u.type === 'client' ? 'customer' : 'agent', dto.content, dto.isInternal || false);
  }

  @Put(':id/status')
  @RequirePermission('tickets.write')
  changeStatus(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { status: TicketStatus }) {
    return this.svc.changeStatus(t, u.id, id, dto.status);
  }

  @Post(':id/assign')
  @RequirePermission('tickets.write')
  assign(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { assignedTo: string; assignedTeam?: string }) {
    return this.svc.assign(t, u.id, id, dto.assignedTo, dto.assignedTeam);
  }

  @Post(':id/merge')
  @RequirePermission('tickets.write')
  mergeTickets(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { mergeTicketId: string }) {
    return this.svc.mergeTickets(t, u.id, id, dto.mergeTicketId);
  }

  @Delete(':id')
  @RequirePermission('tickets.write')
  remove(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t, u.id, id); }
}
