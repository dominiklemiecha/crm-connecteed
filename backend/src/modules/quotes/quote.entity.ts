import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  REVISION = 'revision',
  AWAITING_CEO = 'awaiting_ceo',
  APPROVED = 'approved',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum QuoteItemType {
  FIXED = 'fixed',
  T_AND_M = 't_and_m',
  MILESTONE = 'milestone',
}

@Entity('quotes')
@Index(['tenantId', 'quoteNumber'], { unique: true })
@Index(['tenantId', 'status'])
export class Quote extends BaseEntity {
  @Column({ name: 'quote_number' })
  quoteNumber: string;

  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ name: 'total_cents', type: 'bigint', default: 0 })
  totalCents: number;

  @Column({ name: 'margin_estimated_cents', type: 'bigint', default: 0 })
  marginEstimatedCents: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => QuoteVersion, (v) => v.quote)
  versions: QuoteVersion[];
}

@Entity('quote_versions')
@Index(['tenantId', 'quoteId', 'versionNumber'], { unique: true })
export class QuoteVersion extends BaseEntity {
  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId: string;

  @ManyToOne(() => Quote, (q) => q.versions)
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ type: 'jsonb', nullable: true })
  deliverables: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  terms: string;

  @Column({ name: 'total_cents', type: 'bigint', default: 0 })
  totalCents: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => QuoteItem, (i) => i.quoteVersion)
  items: QuoteItem[];
}

@Entity('quote_items')
@Index(['tenantId', 'quoteVersionId'])
export class QuoteItem extends BaseEntity {
  @Column({ name: 'quote_version_id', type: 'uuid' })
  quoteVersionId: string;

  @ManyToOne(() => QuoteVersion, (v) => v.items)
  @JoinColumn({ name: 'quote_version_id' })
  quoteVersion: QuoteVersion;

  @Column({ type: 'enum', enum: QuoteItemType, default: QuoteItemType.FIXED })
  type: QuoteItemType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price_cents', type: 'bigint', default: 0 })
  unitPriceCents: number;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'total_cents', type: 'bigint', default: 0 })
  totalCents: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}

@Entity('quote_text_library')
@Index(['tenantId', 'category'])
export class QuoteTextLibrary extends BaseEntity {
  @Column()
  category: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;
}
