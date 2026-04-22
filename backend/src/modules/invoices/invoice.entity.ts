import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ScheduleStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum InvoiceType {
  PROFORMA = 'proforma',
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  SENT = 'sent',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

@Entity('invoices')
@Index(['tenantId', 'invoiceNumber'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'dueDate'])
export class Invoice extends BaseEntity {
  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ type: 'enum', enum: InvoiceType, default: InvoiceType.INVOICE })
  type: InvoiceType;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId: string;

  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'subtotal_cents', type: 'bigint', default: 0 })
  subtotalCents: number;

  @Column({ name: 'tax_cents', type: 'bigint', default: 0 })
  taxCents: number;

  @Column({ name: 'total_cents', type: 'bigint', default: 0 })
  totalCents: number;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'fatture_cloud_id', nullable: true })
  fattureCloudId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => InvoiceItem, (i) => i.invoice)
  items: InvoiceItem[];

  @OneToMany(() => Payment, (p) => p.invoice)
  payments: Payment[];

  @OneToMany(() => InvoiceSchedule, (s) => s.invoice)
  schedules: InvoiceSchedule[];
}

@Entity('invoice_items')
@Index(['tenantId', 'invoiceId'])
export class InvoiceItem extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (inv) => inv.items)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price_cents', type: 'bigint', default: 0 })
  unitPriceCents: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 22 })
  taxRate: number;

  @Column({ name: 'total_cents', type: 'bigint', default: 0 })
  totalCents: number;
}

@Entity('payments')
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'status'])
export class Payment extends BaseEntity {
  @ManyToOne(() => Invoice, (inv) => inv.payments, { nullable: false })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ nullable: true })
  method: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate: Date;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}

@Entity('invoice_schedules')
@Index(['tenantId', 'invoiceId'])
export class InvoiceSchedule extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (inv) => inv.schedules)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'installment_number', type: 'int' })
  installmentNumber: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents: number;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt: Date;
}
