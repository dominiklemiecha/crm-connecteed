import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('canned_responses')
@Index(['tenantId', 'category'])
export class CannedResponse {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column() title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ nullable: true }) category: string;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
