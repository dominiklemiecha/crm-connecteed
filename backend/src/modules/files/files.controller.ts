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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FileRecord } from './file.entity';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @RequirePermission('files.write')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: {
      projectId?: string;
      entityType?: string;
      entityId?: string;
      name?: string;
      isClientVisible?: string;
      tags?: string;
      description?: string;
      expiryDate?: string;
      companyId?: string;
    },
  ) {
    return this.filesService.upload(tenantId, user.id, file, {
      projectId: meta.projectId,
      entityType: meta.entityType,
      entityId: meta.entityId,
      name: meta.name,
      isClientVisible: meta.isClientVisible === 'true',
      tags: meta.tags ? meta.tags.split(',').map((t) => t.trim()) : [],
      description: meta.description,
      expiryDate: meta.expiryDate,
      companyId: meta.companyId,
    });
  }

  @Get('storage')
  @RequirePermission('files.read')
  getStorageUsage(
    @CurrentTenant() tenantId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.filesService.getStorageUsage(tenantId, companyId);
  }

  @Get()
  @RequirePermission('files.read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.filesService.findAll(tenantId, pagination);
  }

  @Get('by-entity')
  @RequirePermission('files.read')
  findByEntity(
    @CurrentTenant() tenantId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.filesService.findByEntity(tenantId, entityType, entityId);
  }

  @Get(':id')
  @RequirePermission('files.read')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.findById(tenantId, id);
  }

  @Get(':id/download')
  @RequirePermission('files.read')
  async download(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const filePath = await this.filesService.getDownloadPath(tenantId, user.id, id);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }
    return res.download(filePath);
  }

  @Get(':id/versions')
  @RequirePermission('files.read')
  getVersions(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getVersions(tenantId, id);
  }

  @Post(':id/versions')
  @RequirePermission('files.write')
  @UseInterceptors(FileInterceptor('file'))
  createVersion(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes?: string,
  ) {
    return this.filesService.createVersion(tenantId, user.id, id, file, notes);
  }

  @Put(':id')
  @RequirePermission('files.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<FileRecord>,
  ) {
    return this.filesService.update(tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('files.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.remove(tenantId, user.id, id);
  }
}
