import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../companies/company.entity';
import { Contact } from '../contacts/contact.entity';

export enum LeadStatus {
  NEW = 'new',
  QUALIFYING = 'qualifying',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
}

@Entity('leads')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'ownerId'])
export class Lead extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string;

  @Column({ name: 'next_due_date', type: 'timestamp', nullable: true })
  nextDueDate: Date;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ name: 'value_estimate_cents', type: 'bigint', nullable: true })
  valueEstimateCents: number;

  @Column({ type: 'int', nullable: true })
  probability: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ name: 'contact_name', nullable: true })
  contactName: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @OneToMany(() => LeadProduct, (lp) => lp.lead, { cascade: true })
  leadProducts: LeadProduct[];
}

@Entity('lead_products')
export class LeadProduct {
  @Column({ primary: true, name: 'lead_id', type: 'uuid' })
  leadId: string;

  @Column({ primary: true, name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Lead, (lead) => lead.leadProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
}
