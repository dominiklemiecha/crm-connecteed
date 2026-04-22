import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import 'multer';
import { FileRecord, FileVersion, FileStatus } from './file.entity';
import { Company } from '../companies/company.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class FilesService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
    @InjectRepository(FileVersion)
    private readonly versionRepo: Repository<FileVersion>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditService: AuditService,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async upload(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    meta: {
      projectId?: string;
      entityType?: string;
      entityId?: string;
      name?: string;
      isClientVisible?: boolean;
      tags?: string[];
      description?: string;
      expiryDate?: string;
      companyId?: string;
    },
  ): Promise<FileRecord> {
    // Check storage limit if companyId is provided
    if (meta.companyId) {
      const storageCheck = await this.checkStorageLimit(tenantId, meta.companyId, file.size);
      if (!storageCheck.allowed) {
        const usedMB = (storageCheck.usedBytes / (1024 * 1024)).toFixed(1);
        const limitMB = (Number(storageCheck.limitBytes) / (1024 * 1024)).toFixed(1);
        throw new BadRequestException(
          `Limite di archiviazione superato. Usati: ${usedMB} MB / ${limitMB} MB`,
        );
      }
    }

    const tenantDir = path.join(this.uploadDir, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(tenantDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const relativePath = path.join(tenantId, fileName);

    const record = this.fileRepo.create({
      tenantId,
      projectId: meta.projectId,
      entityType: meta.entityType,
      entityId: meta.entityId,
      name: meta.name || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path: relativePath,
      currentVersion: 1,
      status: FileStatus.DRAFT,
      isClientVisible: meta.isClientVisible || false,
      tags: meta.tags || [],
      description: meta.description || null,
      expiryDate: meta.expiryDate ? new Date(meta.expiryDate) : null,
      companyId: meta.companyId || null,
      uploadedBy: userId,
    } as any);
    const saved = await this.fileRepo.save(record) as any as FileRecord;

    // Save initial version
    const version = this.versionRepo.create({
      tenantId,
      fileId: saved.id,
      versionNumber: 1,
      path: relativePath,
      sizeBytes: file.size,
      uploadedBy: userId,
    });
    await this.versionRepo.save(version);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'file',
      entityId: saved.id,
      action: AuditAction.FILE_UPLOAD,
      newValues: { name: saved.name, originalName: saved.originalName } as any,
    });

    return saved;
  }

  async createVersion(
    tenantId: string,
    userId: string,
    fileId: string,
    file: Express.Multer.File,
    notes?: string,
  ): Promise<FileVersion> {
    const record = await this.findById(tenantId, fileId);

    const tenantDir = path.join(this.uploadDir, tenantId);
    const fileName = `${Date.now()}-v${record.currentVersion + 1}-${file.originalname}`;
    const filePath = path.join(tenantDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const relativePath = path.join(tenantId, fileName);
    const newVersionNumber = record.currentVersion + 1;

    const version = this.versionRepo.create({
      tenantId,
      fileId,
      versionNumber: newVersionNumber,
      path: relativePath,
      sizeBytes: file.size,
      uploadedBy: userId,
      notes,
    });
    const savedVersion = await this.versionRepo.save(version);

    record.currentVersion = newVersionNumber;
    record.path = relativePath;
    record.sizeBytes = file.size;
    await this.fileRepo.save(record);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'file',
      entityId: fileId,
      action: AuditAction.FILE_UPLOAD,
      newValues: { newVersion: newVersionNumber } as any,
    });

    return savedVersion;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<FileRecord>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const term = pagination.search?.trim();

    const qb = this.fileRepo.createQueryBuilder('f')
      .where('f.tenantId = :tenantId', { tenantId });

    if (term) {
      qb.andWhere(
        '(f.originalName ILIKE :search OR f.name ILIKE :search OR f.description ILIKE :search OR f.tags::text ILIKE :search)',
        { search: `%${term}%` },
      );
    }

    qb.orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, page, limit);
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<FileRecord[]> {
    return this.fileRepo.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<FileRecord> {
    const record = await this.fileRepo.findOne({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('File not found');
    return record;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: Partial<FileRecord>,
  ): Promise<FileRecord> {
    const record = await this.findById(tenantId, id);
    const oldValues = { ...record };
    Object.assign(record, dto);
    const saved = await this.fileRepo.save(record);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'file',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const record = await this.findById(tenantId, id);
    await this.fileRepo.remove(record);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'file',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }

  // ─── Download ─────────────────────────────────────────────────────────────

  async getDownloadPath(tenantId: string, userId: string, id: string): Promise<string> {
    const record = await this.findById(tenantId, id);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'file',
      entityId: id,
      action: AuditAction.FILE_DOWNLOAD,
      description: `Downloaded file: ${record.name}`,
    });

    return path.join(this.uploadDir, record.path);
  }

  // ─── Versions ─────────────────────────────────────────────────────────────

  async getVersions(tenantId: string, fileId: string): Promise<FileVersion[]> {
    await this.findById(tenantId, fileId);
    return this.versionRepo.find({
      where: { tenantId, fileId },
      order: { versionNumber: 'DESC' },
    });
  }

  // ─── Storage Limits ───────────────────────────────────────────────────────

  async checkStorageLimit(
    tenantId: string,
    companyId: string,
    additionalBytes: number,
  ): Promise<{ allowed: boolean; usedBytes: number; limitBytes: number | null }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId, tenantId } });
    const limitBytes = company?.storageLimitBytes ? Number(company.storageLimitBytes) : null;

    const result = await this.fileRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.size_bytes), 0)', 'total')
      .where('f.tenantId = :tenantId', { tenantId })
      .andWhere('f.company_id = :companyId', { companyId })
      .getRawOne();

    const usedBytes = Number(result?.total || 0);

    if (limitBytes === null) {
      return { allowed: true, usedBytes, limitBytes: null };
    }

    return {
      allowed: usedBytes + additionalBytes <= limitBytes,
      usedBytes,
      limitBytes,
    };
  }

  async getStorageUsage(tenantId: string, companyId?: string): Promise<{ usedBytes: number; limitBytes: number | null }> {
    const qb = this.fileRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.size_bytes), 0)', 'total')
      .where('f.tenantId = :tenantId', { tenantId });

    if (companyId) {
      qb.andWhere('f.company_id = :companyId', { companyId });
      const company = await this.companyRepo.findOne({ where: { id: companyId, tenantId } });
      const limitBytes = company?.storageLimitBytes ? Number(company.storageLimitBytes) : null;
      const result = await qb.getRawOne();
      return { usedBytes: Number(result?.total || 0), limitBytes };
    }

    const result = await qb.getRawOne();
    return { usedBytes: Number(result?.total || 0), limitBytes: null };
  }

  // ─── Expiring Documents ───────────────────────────────────────────────────

  async findExpiringDocuments(tenantId: string, withinDays: number = 7): Promise<FileRecord[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    return this.fileRepo
      .createQueryBuilder('f')
      .where('f.tenantId = :tenantId', { tenantId })
      .andWhere('f.expiry_date IS NOT NULL')
      .andWhere('f.expiry_date > :now', { now })
      .andWhere('f.expiry_date <= :threshold', { threshold })
      .getMany();
  }
}
