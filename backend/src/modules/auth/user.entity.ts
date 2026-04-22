import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../tenant/tenant.entity';

export enum UserRole {
  // Ruoli interni
  ADMIN = 'admin',
  CEO = 'ceo',
  COMMERCIALE = 'commerciale',
  PM = 'pm',
  DEV = 'dev',
  DESIGN = 'design',
  SUPPORT = 'support',
  ADMIN_LEGAL = 'admin_legal',
  // Ruoli cliente
  CLIENT_ADMIN = 'client_admin',
  CLIENT_REFERENTE_OPERATIVO = 'client_referente_operativo',
  CLIENT_REFERENTE_ADMIN = 'client_referente_admin',
}

export enum UserType {
  INTERNAL = 'internal',
  CLIENT = 'client',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User extends BaseEntity {
  @Column()
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserType })
  type: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, boolean>;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string;

  // Security
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'refresh_token_hash', nullable: true })
  refreshTokenHash: string;

  // Microsoft SSO
  @Column({ name: 'ms_oid', nullable: true })
  microsoftOid: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
