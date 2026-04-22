import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermission('reports.read')
  getSales(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSalesReport({ tenantId, from, to });
  }

  @Get('pipeline')
  @RequirePermission('reports.read')
  getPipeline(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getPipelineReport({ tenantId, from, to });
  }

  @Get('delivery')
  @RequirePermission('reports.read')
  getDelivery(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getDeliveryReport({ tenantId, from, to });
  }

  @Get('support')
  @RequirePermission('reports.read')
  getSupport(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSupportReport({ tenantId, from, to });
  }

  @Get('financial')
  @RequirePermission('reports.read')
  getFinancial(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getFinancialReport({ tenantId, from, to });
  }

  @Get('export')
  @RequirePermission('reports.read')
  async exportReport(
    @CurrentTenant() tenantId: string,
    @Query('type') type: 'sales' | 'pipeline' | 'delivery' | 'support' | 'financial',
    @Query('format') format: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (format === 'xlsx') {
      const buffer = await this.reportsService.exportExcel(type, { tenantId, from, to });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
      res.send(buffer);
    } else {
      const csv = await this.reportsService.exportCsv(type, { tenantId, from, to });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      res.send(csv);
    }
  }
}
