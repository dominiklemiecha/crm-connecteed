import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { PdfService } from '../pdf/pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Quote, QuoteItem, QuoteStatus, QuoteTextLibrary } from './quote.entity';

@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @RequirePermission('quotes.write')
  create(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: Partial<Quote> & { items?: Partial<QuoteItem>[]; deliverables?: any; terms?: string }) {
    return this.quotesService.create(t, u.id, dto);
  }

  @Get()
  @RequirePermission('quotes.read')
  findAll(@CurrentTenant() t: string, @Query() p: PaginationDto) {
    return this.quotesService.findAll(t, p);
  }

  // ─── Text Library (MUST be before :id) ──────────────────────────────────

  @Post('text-library')
  @RequirePermission('quotes.write')
  createTextLibraryEntry(@CurrentTenant() t: string, @CurrentUser() u: any, @Body() dto: Partial<QuoteTextLibrary>) {
    return this.quotesService.createTextLibraryEntry(t, u.id, dto);
  }

  @Get('text-library')
  @RequirePermission('quotes.read')
  findTextLibrary(@CurrentTenant() t: string, @Query('category') category?: string) {
    return this.quotesService.findTextLibrary(t, category);
  }

  @Put('text-library/:id')
  @RequirePermission('quotes.write')
  updateTextLibraryEntry(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<QuoteTextLibrary>) {
    return this.quotesService.updateTextLibraryEntry(t, u.id, id, dto);
  }

  @Delete('text-library/:id')
  @RequirePermission('quotes.write')
  removeTextLibraryEntry(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.removeTextLibraryEntry(t, u.id, id);
  }

  // ─── Quote CRUD (parametric routes after static) ────────────────────────

  @Get(':id/pdf')
  @RequirePermission('quotes.read')
  async generatePdf(
    @CurrentTenant() t: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findById(t, id);
    const currentVersion = await this.quotesService.getVersion(t, id, quote.currentVersion);
    const items = (currentVersion as any).items ?? [];
    const company = (quote as any).company ?? {};
    const pdfBuffer = await this.pdfService.generateQuotePdf(quote, items, company);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="preventivo-${quote.quoteNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get(':id/document')
  @RequirePermission('quotes.read')
  async generateDocument(
    @CurrentTenant() t: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findById(t, id);
    const currentVersion = await this.quotesService.getVersion(t, id, quote.currentVersion);
    const items = (currentVersion as any).items ?? [];
    const company = (quote as any).company ?? {};
    const html = await this.pdfService.renderQuoteHtml(quote, items, company);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }

  @Get(':id')
  @RequirePermission('quotes.read')
  findById(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.findById(t, id);
  }

  @Put(':id')
  @RequirePermission('quotes.write')
  update(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Quote>) {
    return this.quotesService.update(t, u.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('quotes.write')
  remove(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.remove(t, u.id, id);
  }

  @Post(':id/status')
  @RequirePermission('quotes.approve')
  transitionStatus(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body('status') status: QuoteStatus) {
    return this.quotesService.transitionStatus(t, u.id, id, status);
  }

  @Get(':id/versions')
  @RequirePermission('quotes.read')
  listVersions(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.listVersions(t, id);
  }

  @Get(':id/versions/:versionNumber')
  @RequirePermission('quotes.read')
  getVersion(@CurrentTenant() t: string, @Param('id', ParseUUIDPipe) id: string, @Param('versionNumber', ParseIntPipe) vn: number) {
    return this.quotesService.getVersion(t, id, vn);
  }

  @Post(':id/versions')
  @RequirePermission('quotes.write')
  createNewVersion(@CurrentTenant() t: string, @CurrentUser() u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { deliverables?: any; terms?: string; items?: Partial<QuoteItem>[] }) {
    return this.quotesService.createNewVersion(t, u.id, id, dto);
  }
}
