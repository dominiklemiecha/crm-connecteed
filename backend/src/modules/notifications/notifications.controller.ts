import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findByUser(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationsService.findByUser(tenantId, user.id, pagination);
  }

  @Get('unread-count')
  getUnreadCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.getUnreadCount(tenantId, user.id);
  }

  @Post('read-all')
  markAllRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAllRead(tenantId, user.id);
  }

  @Post(':id/read')
  markAsRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, user.id, id);
  }
}
