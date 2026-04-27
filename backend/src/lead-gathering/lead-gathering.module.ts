import { Module } from '@nestjs/common';
import { LeadGatheringController } from './lead-gathering.controller';
import { LeadGatheringService } from './lead-gathering.service';
import { GoogleLeadProvider } from './providers/google-lead.provider';
import { MockLeadProvider } from './providers/mock-lead.provider';
import { LeadEnrichmentService } from './services/lead-enrichment.service';
import { LeadFilteringService } from './services/lead-filtering.service';
import { LeadNormalizationService } from './services/lead-normalization.service';
import { LeadScoringService } from './services/lead-scoring.service';

@Module({
  controllers: [LeadGatheringController],
  providers: [
    LeadGatheringService,
    MockLeadProvider,
    GoogleLeadProvider,
    LeadNormalizationService,
    LeadEnrichmentService,
    LeadFilteringService,
    LeadScoringService,
  ],
})
export class LeadGatheringModule {}
