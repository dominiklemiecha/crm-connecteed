import { Entity, Column, OneToMany, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TicketStatus { OPEN = 'open', IN_PROGRESS = 'in_progress', WAITING = 'waiting', CLOSED = 'closed' }
export enum TicketPriority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', URGENT = 'urgent' }
export enum SLAClass { PRESALES = 'presales', DELIVERY = 'delivery', SUPPORT = 'support', ADMIN = 'admin' }

@Entity('tickets')
@Index(['tenantId', 'status'])
export class Ticket extends BaseEntity {
  @Column({ name: 'ticket_number', unique: true }) ticketNumber: string;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) category: string;
  @Column({ nullable: true }) subcategory: string;
  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM }) priority: TicketPriority;
  @Column() subject: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN }) status: TicketStatus;
  @Column({ name: 'assigned_to', type: 'uuid', nullable: true }) assignedTo: string;
  @Column({ name: 'assigned_team', nullable: true }) assignedTeam: string;
  @Column({ name: 'sla_class', type: 'enum', enum: SLAClass, nullable: true }) slaClass: SLAClass;
  @Column({ name: 'sla_deadline', type: 'timestamp', nullable: true }) slaDeadline: Date;
  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true }) firstResponseAt: Date;
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true }) resolvedAt: Date;
  @Column({ nullable: true }) channel: string;
  @Column({ name: 'related_entity_type', nullable: true }) relatedEntityType: string;
  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true }) relatedEntityId: string;
  @Column({ name: 'is_client_visible', default: false }) isClientVisible: boolean;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string;
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true }) closedAt: Date;
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'ticket_id', type: 'uuid' }) ticketId: string;
  @Column({ name: 'author_id', type: 'uuid' }) authorId: string;
  @Column({ name: 'author_type' }) authorType: string;
  @Column({ type: 'text' }) content: string;
  @Column({ type: 'jsonb', nullable: true }) attachments: any;
  @Column({ name: 'is_internal', default: false }) isInternal: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('sla_policies')
export class SLAPolicy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column() name: string;
  @Column({ name: 'sla_class', type: 'enum', enum: SLAClass }) slaClass: SLAClass;
  @Column({ type: 'enum', enum: TicketPriority }) priority: TicketPriority;
  @Column({ name: 'first_response_minutes', type: 'int' }) firstResponseMinutes: number;
  @Column({ name: 'resolution_minutes', type: 'int' }) resolutionMinutes: number;
  @Column({ name: 'business_hours', type: 'jsonb', nullable: true }) businessHours: any;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('escalations')
export class Escalation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'ticket_id', type: 'uuid' }) ticketId: string;
  @Column() reason: string;
  @Column({ name: 'escalated_to', type: 'uuid', nullable: true }) escalatedTo: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
