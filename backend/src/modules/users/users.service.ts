import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../auth/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  type: string;
  companyId?: string;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  type?: string;
  companyId?: string;
  phone?: string;
  status?: UserStatus;
  departmentId?: string;
}

export interface UserFilterDto {
  role?: UserRole;
  type?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  private sanitize(user: User): Omit<User, 'passwordHash' | 'refreshTokenHash'> {
    const { passwordHash: _pw, refreshTokenHash: _rt, ...safe } = user as any;
    return safe;
  }

  async findAll(
    tenantId: string,
    filters: UserFilterDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Omit<User, 'passwordHash' | 'refreshTokenHash'>>> {
    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.tenant_id = :tenantId', { tenantId })
      .select([
        'u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.phone',
        'u.role', 'u.type', 'u.status', 'u.permissions',
        'u.companyId', 'u.departmentId', 'u.lastLoginAt',
        'u.createdAt', 'u.updatedAt', 'u.tenantId',
      ]);

    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });
    if (filters.type) qb.andWhere('u.type = :type', { type: filters.type });
    if (filters.status) qb.andWhere('u.status = :status', { status: filters.status });

    if (pagination.search) {
      qb.andWhere(
        '(u.email ILIKE :search OR u.firstName ILIKE :search OR u.lastName ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    qb.skip((page - 1) * limit).take(limit).orderBy('u.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data as any[], total, page, limit);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async create(
    tenantId: string,
    actorId: string,
    dto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const existing = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      type: dto.type as any,
      companyId: dto.companyId,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
    });

    const saved = await this.userRepo.save(user) as User;

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'user',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { email: saved.email, role: saved.role } as any,
    });

    return this.sanitize(saved);
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const oldValues = { ...user };
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user) as User;

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'user',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: oldValues as any,
      newValues: dto as any,
    });

    return this.sanitize(saved);
  }

  async deactivate(
    tenantId: string,
    actorId: string,
    id: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (id === actorId) throw new ForbiddenException('Cannot deactivate yourself');

    user.status = UserStatus.INACTIVE;
    await this.userRepo.save(user);

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'user',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: { status: UserStatus.INACTIVE } as any,
    });

    return { message: 'User deactivated' };
  }

  async setPermissions(
    tenantId: string,
    actorId: string,
    id: string,
    permissions: Record<string, boolean>,
  ): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    user.permissions = permissions;
    const saved = await this.userRepo.save(user) as User;

    await this.auditService.log({
      tenantId,
      userId: actorId,
      entityType: 'user',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: { permissions } as any,
    });

    return this.sanitize(saved);
  }
}
