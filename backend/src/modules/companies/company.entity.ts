import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('companies')
@Index(['tenantId', 'vatNumber'])
export class Company extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'vat_number', nullable: true })
  vatNumber: string;

  @Column({ name: 'fiscal_code', nullable: true })
  fiscalCode: string;

  @Column({ name: 'sdi_code', nullable: true })
  sdiCode: string;

  @Column({ nullable: true })
  pec: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'jsonb', nullable: true })
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'storage_limit_bytes', type: 'bigint', nullable: true, default: null })
  storageLimitBytes: number;
}
