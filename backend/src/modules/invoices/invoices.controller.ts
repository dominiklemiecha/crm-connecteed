import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Invoice, InvoiceItem, Payment } from './invoice.entity';
import { PdfService } from '../pdf/pdf.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  @Post()
  @RequirePermission('invoices.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<Invoice> & { items?: Partial<InvoiceItem>[] },
  ) {
    return this.invoicesService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('invoices.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.invoicesService.findAll(tenantId, pagination);
  }

  @Get('check-overdue')
  @RequirePermission('invoices.read')
  checkOverdue(@CurrentTenant() tenantId: string) {
    return this.invoicesService.checkOverdue(tenantId);
  }

  @Get(':id')
  @RequirePermission('invoices.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findById(tenantId, id);
  }

  @Get(':id/payment-complete')
  @RequirePermission('invoices.read')
  isPaymentComplete(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.isPaymentComplete(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('invoices.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Invoice>,
  ) {
    return this.invoicesService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('invoices.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.remove(tenantId, user.id, id);
  }

  @Post(':id/payments')
  @RequirePermission('invoices.write')
  registerPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Payment>,
  ) {
    return this.invoicesService.registerPayment(tenantId, user.id, id, dto);
  }

  // ─── Invoice Schedule ──────────────────────────────────────────────────────

  @Post(':id/schedule')
  @RequirePermission('invoices.write')
  createSchedule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { installments: { dueDate: Date; amountCents: number }[] },
  ) {
    return this.invoicesService.createSchedule(tenantId, user.id, id, body.installments);
  }

  @Get(':id/schedule')
  @RequirePermission('invoices.read')
  getSchedule(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.getSchedule(tenantId, id);
  }

  @Post('schedule/:scheduleId/pay')
  @RequirePermission('invoices.write')
  markInstallmentPaid(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
  ) {
    return this.invoicesService.markInstallmentPaid(tenantId, user.id, scheduleId);
  }

  // ─── Invoice PDF ───────────────────────────────────────────────────────────

  @Get(':id/pdf')
  @RequirePermission('invoices.read')
  async getInvoicePdf(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format?: string,
  ) {
    const invoice = await this.invoicesService.findById(tenantId, id);
    const items = invoice.items ?? [];
    const schedules = await this.invoicesService.getSchedule(tenantId, id);
    // Load company info
    let company: any = null;
    if (invoice.companyId) {
      company = await this.invoiceRepo.manager
        .getRepository('companies')
        .findOne({ where: { id: invoice.companyId } });
    }

    if (format === 'html') {
      const html = await this.pdfService.renderInvoiceHtml(invoice, items, company, schedules);
      return html;
    }

    const buffer = await this.pdfService.generateInvoicePdf(invoice, items, company);
    return { pdf: buffer.toString('base64'), filename: `fattura-${invoice.invoiceNumber}.pdf` };
  }

  @Get(':id/print')
  @RequirePermission('invoices.read')
  async getInvoiceHtml(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findById(tenantId, id);
    const items = invoice.items ?? [];
    const schedules = await this.invoicesService.getSchedule(tenantId, id);
    let company: any = null;
    if (invoice.companyId) {
      company = await this.invoiceRepo.manager
        .getRepository('companies')
        .findOne({ where: { id: invoice.companyId } });
    }
    const html = await this.pdfService.renderInvoiceHtml(invoice, items, company, schedules);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
