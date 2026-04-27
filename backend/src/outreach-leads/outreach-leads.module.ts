import { Module } from '@nestjs/common';
import { OutreachGenerationService } from './outreach-generation.service';
import { OutreachLeadsController } from './outreach-leads.controller';
import { OutreachLeadsService } from './outreach-leads.service';

@Module({
  controllers: [OutreachLeadsController],
  providers: [OutreachLeadsService, OutreachGenerationService],
})
export class OutreachLeadsModule {}
