import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { DeliveredProject } from './delivered-project.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { encryptString, decryptString } from '../../common/utils/crypto';

export interface DeliveredProjectDto {
  id: string;
  name: string;
  description: string | null;
  url: string;
  username: string;
  password: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UpsertInput {
  name?: string;
  description?: string | null;
  url?: string;
  username?: string;
  password?: string;
}

@Injectable()
export class DeliveredProjectsService {
  constructor(
    @InjectRepository(DeliveredProject)
    private readonly repo: Repository<DeliveredProject>,
  ) {}

  private toDto(entity: DeliveredProject): DeliveredProjectDto {
    let password = '';
    try {
      password = entity.passwordEncrypted ? decryptString(entity.passwordEncrypted) : '';
    } catch {
      password = '';
    }
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      url: entity.url,
      username: entity.username,
      password,
      createdBy: entity.createdBy ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async create(tenantId: string, userId: string, dto: UpsertInput): Promise<DeliveredProjectDto> {
    const entity = this.repo.create({
      tenantId,
      createdBy: userId,
      name: (dto.name ?? '').trim(),
      description: dto.description ?? undefined,
      url: (dto.url ?? '').trim(),
      username: (dto.username ?? '').trim(),
      passwordEncrypted: encryptString(dto.password ?? ''),
    } as Partial<DeliveredProject>);
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<DeliveredProjectDto>> {
    const where: any = { tenantId };
    if (pagination.search) where.name = ILike(`%${pagination.search}%`);

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const dtos = data.map((e) => this.toDto(e));
    return new PaginatedResult<DeliveredProjectDto>(dtos, total, page, limit);
  }

  async findById(tenantId: string, id: string): Promise<DeliveredProjectDto> {
    const entity = await this.repo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException('Delivered project not found');
    return this.toDto(entity);
  }

  async update(tenantId: string, id: string, dto: UpsertInput): Promise<DeliveredProjectDto> {
    const entity = await this.repo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException('Delivered project not found');

    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.description !== undefined) entity.description = dto.description as string;
    if (dto.url !== undefined) entity.url = dto.url.trim();
    if (dto.username !== undefined) entity.username = dto.username.trim();
    if (dto.password !== undefined && dto.password !== '') {
      entity.passwordEncrypted = encryptString(dto.password);
    }

    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException('Delivered project not found');
    await this.repo.remove(entity);
  }
}
