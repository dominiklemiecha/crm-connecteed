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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post('import')
  @RequirePermission('companies.write')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nessun file caricato. Invia un file CSV.');
    }
    const csvContent = file.buffer.toString('utf-8');
    return this.companiesService.bulkImport(tenantId, user.id, csvContent);
  }

  @Post()
  @RequirePermission('companies.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(tenantId, user.id, dto);
  }

  @Get()
  @RequirePermission('companies.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.companiesService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @RequirePermission('companies.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companiesService.findById(tenantId, id);
  }

  @Put(':id')
  @RequirePermission('companies.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('companies.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companiesService.remove(tenantId, user.id, id);
  }
}
