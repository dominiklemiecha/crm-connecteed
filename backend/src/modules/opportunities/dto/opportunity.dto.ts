import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { OpportunityStatus } from '../opportunity.entity';

export class CreateOpportunityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() leadId?: string;
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsUUID() productId: string;
  @IsOptional() @IsString() source?: string;
  @IsUUID() ownerId: string;
  @IsOptional() @IsUUID() assignedToUserId?: string;
  @IsOptional() @IsDateString() nextDueDate?: string;
  @IsOptional() @IsNumber() estimatedValueCents?: number;
  @IsOptional() @IsNumber() probability?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateOpportunityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsUUID() assignedToUserId?: string;
  @IsOptional() @IsDateString() nextDueDate?: string;
  @IsOptional() @IsNumber() estimatedValueCents?: number;
  @IsOptional() @IsNumber() probability?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() lostReason?: string;
}

export class ChangeOpportunityStatusDto {
  @IsEnum(OpportunityStatus) status: OpportunityStatus;
  @IsOptional() @IsString() lostReason?: string;
}
