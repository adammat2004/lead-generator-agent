import { MessageType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsEnum(MessageType)
  type!: MessageType;

  @IsString()
  @MinLength(1)
  content!: string;
}
