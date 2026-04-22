import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

function isValidPartitaIVA(piva: string): boolean {
  if (!/^\d{11}$/.test(piva)) return false;
  const digits = piva.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let d = digits[i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10 === digits[10];
}

function isValidCodiceFiscale(cf: string): boolean {
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf);
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditService: AuditService,
  ) {}

  private validateCompanyFields(dto: CreateCompanyDto | UpdateCompanyDto) {
    if (dto.vatNumber) {
      if (!isValidPartitaIVA(dto.vatNumber)) {
        throw new BadRequestException(
          'Partita IVA non valida. Deve essere composta da 11 cifre con check digit corretto.',
        );
      }
    }
    if (dto.fiscalCode) {
      if (!isValidCodiceFiscale(dto.fiscalCode)) {
        throw new BadRequestException(
          'Codice Fiscale non valido. Deve essere composto da 16 caratteri alfanumerici nel formato corretto.',
        );
      }
    }
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateCompanyDto,
  ): Promise<Company> {
    this.validateCompanyFields(dto);
    const company = this.companyRepo.create({ ...dto, tenantId });
    const saved = await this.companyRepo.save(company);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'company',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: dto as any,
    });

    return saved;
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Company>> {
    let where: any = { tenantId };

    if (pagination.search) {
      const search = pagination.search;
      where = [
        { tenantId, name: ILike(`%${search}%`) },
        { tenantId, vatNumber: ILike(`%${search}%`) },
        { tenantId, email: ILike(`%${search}%`) },
      ];
    }

    const [data, total] = await this.companyRepo.findAndCount({
      where,
      order: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });

    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id, tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async bulkImport(
    tenantId: string,
    userId: string,
    csvContent: string,
  ): Promise<{ imported: number; errors: { row: number; message: string }[] }> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('Il file CSV deve contenere almeno un\'intestazione e una riga di dati.');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['name'];
    for (const rh of requiredHeaders) {
      if (!headers.includes(rh)) {
        throw new BadRequestException(`Intestazione obbligatoria mancante: "${rh}". Intestazioni trovate: ${headers.join(', ')}`);
      }
    }

    const results: { imported: number; errors: { row: number; message: string }[] } = {
      imported: 0,
      errors: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = (values[idx] || '').trim();
      });

      const rowNum = i + 1;

      if (!rowData.name) {
        results.errors.push({ row: rowNum, message: 'Il campo "name" è obbligatorio.' });
        continue;
      }

      // Map CSV fields to DTO
      const dto: CreateCompanyDto = {
        name: rowData.name,
        vatNumber: rowData.vatnumber || rowData['vat_number'] || rowData['p.iva'] || rowData.piva || undefined,
        fiscalCode: rowData.fiscalcode || rowData['fiscal_code'] || rowData.cf || rowData['codice_fiscale'] || undefined,
        email: rowData.email || undefined,
        phone: rowData.phone || rowData.telefono || undefined,
        pec: rowData.pec || undefined,
        sdiCode: rowData.sdi || rowData.sdicode || rowData['sdi_code'] || undefined,
        notes: rowData.notes || rowData.note || undefined,
      };

      // Build address if any address field present
      const street = rowData.address || rowData.indirizzo || '';
      const city = rowData.city || rowData.citta || rowData['città'] || '';
      if (street || city) {
        dto.address = {
          street,
          city,
          province: rowData.province || rowData.provincia || '',
          postalCode: rowData.postalcode || rowData.cap || '',
          country: rowData.country || rowData.paese || 'IT',
        };
      }

      // Validate P.IVA and CF
      try {
        this.validateCompanyFields(dto);
      } catch (e: any) {
        results.errors.push({ row: rowNum, message: e.message });
        continue;
      }

      try {
        const company = this.companyRepo.create({ ...dto, tenantId });
        await this.companyRepo.save(company);
        results.imported++;
      } catch (e: any) {
        results.errors.push({ row: rowNum, message: e.message || 'Errore durante il salvataggio.' });
      }
    }

    if (results.imported > 0) {
      await this.auditService.log({
        tenantId,
        userId,
        entityType: 'company',
        entityId: 'bulk-import',
        action: AuditAction.CREATE,
        newValues: { imported: results.imported, errors: results.errors.length } as any,
      });
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    this.validateCompanyFields(dto);
    const company = await this.findById(tenantId, id);
    const oldValues = { ...company };
    Object.assign(company, dto);
    const saved = await this.companyRepo.save(company);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'company',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return saved;
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const company = await this.findById(tenantId, id);
    await this.companyRepo.remove(company);

    await this.auditService.log({
      tenantId,
      userId,
      entityType: 'company',
      entityId: id,
      action: AuditAction.DELETE,
    });
  }
}
