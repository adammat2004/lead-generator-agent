import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const LEAD_GATHERING_SOURCES = [
  'mock',
  'google',
  'facebook',
  'manual',
] as const;

export type LeadGatheringSource = (typeof LEAD_GATHERING_SOURCES)[number];

export class GatherLeadsDto {
  @IsString()
  serviceType!: string;

  @IsString()
  area!: string;

  @IsIn(LEAD_GATHERING_SOURCES)
  source!: LeadGatheringSource;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  requestedCount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReviewCount?: number;
}
