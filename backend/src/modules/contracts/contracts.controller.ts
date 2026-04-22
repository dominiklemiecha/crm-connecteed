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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { PdfService } from '../pdf/pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Contract, ContractSignature, ContractStatus, SignatureStatus } from './contract.entity';

@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @RequirePermission('contracts.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<Contract>,
  ) {
    return this.contractsService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('contracts.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.contractsService.findAll(tenantId, pagination);
  }

  @Get(':id/pdf')
  @RequirePermission('contracts.read')
  async generatePdf(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const contract = await this.contractsService.findById(tenantId, id);
    const quote = (contract as any).quote ?? null;
    const company = (contract as any).company ?? {};
    const pdfBuffer = await this.pdfService.generateContractPdf(contract, quote, company);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contratto-${contract.contractNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get(':id/document')
  @RequirePermission('contracts.read')
  async generateDocument(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const contract = await this.contractsService.findById(tenantId, id);
    const quote = (contract as any).quote ?? null;
    const company = (contract as any).company ?? {};
    const html = await this.pdfService.renderContractHtml(contract, quote, company);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }

  @Get(':id')
  @RequirePermission('contracts.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('contracts.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Contract>,
  ) {
    return this.contractsService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('contracts.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.remove(tenantId, user.id, id);
  }

  @Post(':id/status')
  @RequirePermission('contracts.write')
  transitionStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ContractStatus; signedPdfPath?: string; docusignEnvelopeId?: string },
  ) {
    const { status, ...extra } = body;
    return this.contractsService.transitionStatus(tenantId, user.id, id, status, extra as any);
  }

  @Post(':id/generate-pdf')
  @RequirePermission('contracts.write')
  assignPdfPath(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.assignPdfPath(tenantId, user.id, id);
  }

  // ─── Signatures ──────────────────────────────────────────────────────────

  @Post(':id/signatures')
  @RequirePermission('contracts.write')
  addSignature(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<ContractSignature>,
  ) {
    return this.contractsService.addSignature(tenantId, user.id, id, dto);
  }

  @Put('signatures/:signatureId/status')
  @RequirePermission('contracts.write')
  updateSignatureStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
    @Body('status') status: SignatureStatus,
  ) {
    return this.contractsService.updateSignatureStatus(tenantId, user.id, signatureId, status);
  }
}
