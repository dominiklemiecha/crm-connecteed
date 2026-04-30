import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('delivered_projects')
@Index(['tenantId', 'name'])
export class DeliveredProject extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500 })
  url: string;

  @Column()
  username: string;

  @Column({ name: 'password_encrypted', type: 'text' })
  passwordEncrypted: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;
}
