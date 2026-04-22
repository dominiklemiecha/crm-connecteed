import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ChangeRequestStatus {
  OPEN = 'open',
  IMPACT_ANALYSIS = 'impact_analysis',
  AWAITING_CEO = 'awaiting_ceo',
  AWAITING_CLIENT = 'awaiting_client',
  APPROVED = 'approved',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected',
}

@Entity('change_requests')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'status'])
export class ChangeRequest extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.OPEN,
  })
  status: ChangeRequestStatus;

  @Column({ name: 'impact_cost_estimate_cents', type: 'bigint', nullable: true })
  impactCostEstimateCents: number;

  @Column({ name: 'impact_days_estimate', type: 'int', nullable: true })
  impactDaysEstimate: number;

  @Column({ name: 'generated_quote_id', type: 'uuid', nullable: true })
  generatedQuoteId: string;

  @Column({ name: 'generated_contract_addendum_id', type: 'uuid', nullable: true })
  generatedContractAddendumId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
