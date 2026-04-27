import { Body, Controller, Post } from '@nestjs/common';
import { GatherLeadsDto } from './dto/gather-leads.dto';
import { LeadGatheringService } from './lead-gathering.service';

@Controller('lead-gathering')
export class LeadGatheringController {
  constructor(private readonly leadGatheringService: LeadGatheringService) {}

  @Post('gather')
  gather(@Body() dto: GatherLeadsDto) {
    return this.leadGatheringService.gatherLeads(dto);
  }
}
