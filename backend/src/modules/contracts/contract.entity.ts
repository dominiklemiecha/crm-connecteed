import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ContractStatus {
  DRAFT = 'draft',
  AWAITING_CEO = 'awaiting_ceo',
  READY_TO_SIGN = 'ready_to_sign',
  SIGNING = 'signing',
  SIGNED = 'signed',
  VOID = 'void',
}

export enum SignatureStatus {
  PENDING = 'pending',
  SENT = 'sent',
  VIEWED = 'viewed',
  SIGNED = 'signed',
  DECLINED = 'declined',
}

@Entity('contracts')
@Index(['tenantId', 'contractNumber'], { unique: true })
@Index(['tenantId', 'status'])
export class Contract extends BaseEntity {
  @Column({ name: 'contract_number' })
  contractNumber: string;

  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ name: 'pdf_path', nullable: true })
  pdfPath: string;

  @Column({ name: 'signed_pdf_path', nullable: true })
  signedPdfPath: string;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt: Date;

  @Column({ name: 'docusign_envelope_id', nullable: true })
  docusignEnvelopeId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => ContractSignature, (s) => s.contract)
  signatures: ContractSignature[];
}

@Entity('contract_signatures')
@Index(['tenantId', 'contractId'])
export class ContractSignature extends BaseEntity {
  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @ManyToOne(() => Contract, (c) => c.signatures)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'signer_email' })
  signerEmail: string;

  @Column({ name: 'signer_name' })
  signerName: string;

  @Column({ name: 'envelope_id', nullable: true })
  envelopeId: string;

  @Column({ type: 'enum', enum: SignatureStatus, default: SignatureStatus.PENDING })
  status: SignatureStatus;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt: Date;
}
