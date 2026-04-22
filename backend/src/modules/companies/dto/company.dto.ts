import {
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  province: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  fiscalCode?: string;

  @IsOptional()
  @IsString()
  sdiCode?: string;

  @IsOptional()
  @IsEmail()
  pec?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCompanyDto extends CreateCompanyDto {}
