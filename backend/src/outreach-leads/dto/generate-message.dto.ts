import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const TONES = ['casual', 'professional', 'direct'] as const;

export type GenerateMessageTone = (typeof TONES)[number];

export class GenerateMessageDto {
  @IsIn(TONES)
  tone!: GenerateMessageTone;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instruction?: string;
}
