import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum EmailDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum EmailStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RECEIVED = 'received',
}

@Entity('emails')
@Index(['tenantId', 'direction'])
@Index(['tenantId', 'relatedEntityType', 'relatedEntityId'])
export class Email extends BaseEntity {
  @Column({ name: 'from_address' })
  fromAddress: string;

  @Column({ name: 'to_address', type: 'text' })
  toAddress: string;

  @Column({ nullable: true, type: 'text' })
  cc: string;

  @Column({ nullable: true, type: 'text' })
  bcc: string;

  @Column()
  subject: string;

  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText: string;

  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml: string;

  @Column({ type: 'enum', enum: EmailDirection, default: EmailDirection.OUTBOUND })
  direction: EmailDirection;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.DRAFT })
  status: EmailStatus;

  @Column({ name: 'related_entity_type', nullable: true })
  relatedEntityType: string;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt: Date;
}

@Entity('email_templates')
export class EmailTemplate extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'subject_template' })
  subjectTemplate: string;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, any>;
}
