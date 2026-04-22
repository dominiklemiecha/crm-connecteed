import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ApprovalType {
  QUOTE = 'quote',
  CONTRACT = 'contract',
  CHANGE_REQUEST = 'change_request',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('approvals')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'type', 'entityId'])
export class Approval extends BaseEntity {
  @Column({ type: 'enum', enum: ApprovalType })
  type: ApprovalType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date;
}
