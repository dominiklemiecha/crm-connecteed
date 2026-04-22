import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../companies/company.entity';

export enum OpportunityStatus {
  SCOPING = 'scoping',
  PRESALES = 'presales',
  QUOTE_PREPARING = 'quote_preparing',
  AWAITING_CEO = 'awaiting_ceo',
  SENT_TO_CLIENT = 'sent_to_client',
  NEGOTIATION = 'negotiation',
  ACCEPTED = 'accepted',
  CONTRACT_SIGNING = 'contract_signing',
  AWAITING_PAYMENT = 'awaiting_payment',
  WON = 'won',
  LOST = 'lost',
}

@Entity('opportunities')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'ownerId'])
export class Opportunity extends BaseEntity {
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string;

  @Column({ name: 'next_due_date', type: 'timestamp', nullable: true })
  nextDueDate: Date;

  @Column({ type: 'enum', enum: OpportunityStatus, default: OpportunityStatus.SCOPING })
  status: OpportunityStatus;

  @Column({ name: 'estimated_value_cents', type: 'bigint', nullable: true })
  estimatedValueCents: number;

  @Column({ type: 'int', nullable: true })
  probability: number;

  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  name: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
