import { Module } from '@nestjs/common';
import { LeadGatheringModule } from './lead-gathering/lead-gathering.module';
import { PrismaModule } from './prisma/prisma.module';
import { OutreachLeadsModule } from './outreach-leads/outreach-leads.module';

@Module({
  imports: [PrismaModule, OutreachLeadsModule, LeadGatheringModule],
})
export class AppModule {}
