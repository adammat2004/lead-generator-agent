import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ScheduleFollowUpDto {
  @Type(() => Date)
  @IsDate()
  nextFollowUpAt!: Date;
}
