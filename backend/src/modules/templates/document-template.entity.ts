import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum DocumentTemplateType {
  QUOTE = 'quote',
  CONTRACT = 'contract',
}

@Entity('document_templates')
export class DocumentTemplate extends BaseEntity {
  @Column({ type: 'enum', enum: DocumentTemplateType })
  type: DocumentTemplateType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, string>[];
}
