import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum FileStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  OBSOLETE = 'obsolete',
}

@Entity('file_records')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'status'])
export class FileRecord extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column()
  name: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column()
  path: string;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.DRAFT })
  status: FileStatus;

  @Column({ name: 'is_client_visible', type: 'boolean', default: false })
  isClientVisible: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string;

  @OneToMany(() => FileVersion, (v) => v.fileRecord)
  versions: FileVersion[];
}

@Entity('file_versions')
@Index(['tenantId', 'fileId'])
export class FileVersion extends BaseEntity {
  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne(() => FileRecord, (f) => f.versions)
  @JoinColumn({ name: 'file_id' })
  fileRecord: FileRecord;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column()
  path: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
