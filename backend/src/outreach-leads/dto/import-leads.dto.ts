import { LeadPriority, LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportLeadItemDto {
  @IsString()
  businessName!: string;

  @IsString()
  serviceType!: string;

  @IsString()
  area!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @Type(() => Date)
  lastContactedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  nextFollowUpAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  score?: number;
}

export class ImportLeadsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportLeadItemDto)
  leads!: ImportLeadItemDto[];
}
