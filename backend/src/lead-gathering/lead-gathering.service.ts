import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildLeadDedupeKey } from '../outreach-leads/dedupe/lead-dedupe.util';
import {
  GatherLeadsDto,
  type LeadGatheringSource,
} from './dto/gather-leads.dto';
import type {
  GatherLeadsInput,
  LeadProvider,
  RawLeadCandidate,
} from './interfaces/lead-provider.interface';
import { GoogleLeadProvider } from './providers/google-lead.provider';
import { MockLeadProvider } from './providers/mock-lead.provider';
import { LeadEnrichmentService } from './services/lead-enrichment.service';
import { LeadFilteringService } from './services/lead-filtering.service';
import { LeadNormalizationService } from './services/lead-normalization.service';
import { LeadScoringService } from './services/lead-scoring.service';

@Injectable()
export class LeadGatheringService {
  private readonly logger = new Logger(LeadGatheringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockLeadProvider,
    private readonly googleProvider: GoogleLeadProvider,
    private readonly normalizationService: LeadNormalizationService,
    private readonly enrichmentService: LeadEnrichmentService,
    private readonly filteringService: LeadFilteringService,
    private readonly scoringService: LeadScoringService,
  ) {}

  async gatherLeads(dto: GatherLeadsDto) {
    const provider = this.pickProvider(dto.source);
    const input: GatherLeadsInput = {
      serviceType: dto.serviceType,
      area: dto.area,
      requestedCount: dto.requestedCount,
      minRating: dto.minRating,
      minReviewCount: dto.minReviewCount,
    };
    let rawCandidates: RawLeadCandidate[];

    try {
      rawCandidates = await provider.search(input);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Lead gathering failed for source "${dto.source}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to gather leads from provider.',
      );
    }

    const normalizedCandidates = rawCandidates.map((candidate) =>
      this.normalizationService.normalize(candidate, input),
    );
    const enrichedCandidates =
      await this.enrichmentService.enrichMany(normalizedCandidates);
    const filteredCandidates = this.filteringService.filter(
      enrichedCandidates,
      input,
    );
    const dedupeCandidateMap = new Map(
      filteredCandidates.map((candidate) => [
        buildLeadDedupeKey({
          businessName: candidate.businessName,
          area: candidate.area,
          source: candidate.source,
          phone: candidate.phone,
          email: candidate.email,
          website: candidate.website,
          sourceUrl: candidate.sourceUrl,
        }),
        candidate,
      ]),
    );
    const existingLeadKeys = await this.prisma.outreachLead.findMany({
      where: {
        dedupeKey: {
          in: Array.from(dedupeCandidateMap.keys()),
        },
      },
      select: { dedupeKey: true },
    });
    const existingKeySet = new Set(existingLeadKeys.map((lead) => lead.dedupeKey));
    const dedupedCandidates = Array.from(dedupeCandidateMap.entries())
      .filter(([dedupeKey]) => !existingKeySet.has(dedupeKey))
      .map(([, candidate]) => candidate);

    const candidates = dedupedCandidates
      .map((candidate) => this.scoringService.score(candidate, input))
      .sort((a, b) => b.score - a.score)
      .slice(0, dto.requestedCount)
      .map((candidate) =>
        this.normalizationService.toPublicCandidate(candidate),
      );

    return {
      query: {
        serviceType: dto.serviceType,
        area: dto.area,
        source: dto.source,
        requestedCount: dto.requestedCount,
      },
      count: candidates.length,
      candidates,
    };
  }

  private pickProvider(source: LeadGatheringSource): LeadProvider {
    switch (source) {
      case 'mock':
        return this.mockProvider;
      case 'google':
        return this.googleProvider;
      case 'facebook':
      case 'manual':
      default:
        throw new BadRequestException(
          `Unsupported lead source "${source}". Available providers: mock, google.`,
        );
    }
  }
}
