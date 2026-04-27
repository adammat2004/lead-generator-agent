import { Injectable } from '@nestjs/common';
import type {
  GatherLeadsInput,
  InternalLeadCandidate,
  ScoredLeadCandidate,
} from '../interfaces/lead-provider.interface';

const SERVICE_TERMS: Record<string, string[]> = {
  landscaping: ['landscape', 'landscaping', 'garden design', 'garden'],
  paving: ['paving', 'driveway', 'patio', 'block paving'],
  'garden maintenance': ['garden maintenance', 'gardener', 'lawn', 'garden'],
  'hedge trimming': ['hedge', 'hedge trimming', 'hedge cutting'],
  'power washing': ['power washing', 'pressure washing', 'jet washing'],
  'tree surgery': ['tree surgery', 'tree surgeon', 'tree care', 'arborist'],
};

@Injectable()
export class LeadScoringService {
  score(
    candidate: InternalLeadCandidate,
    input: GatherLeadsInput,
  ): ScoredLeadCandidate {
    const reasons: string[] = [];
    let score = 0;

    const serviceRelevance = this.serviceRelevance(candidate, input.serviceType);
    score += serviceRelevance.score;
    reasons.push(...serviceRelevance.reasons);

    const locationScore = this.locationScore(candidate, input.area);
    score += locationScore.score;
    reasons.push(...locationScore.reasons);

    const rating = candidate.rating ?? 0;
    if (rating >= 4.7) {
      score += 15;
      reasons.push('Excellent rating');
    } else if (rating >= 4.3) {
      score += 12;
      reasons.push('Strong rating');
    } else if (rating >= 4.0) {
      score += 8;
      reasons.push('Good rating');
    }

    const reviewCount = candidate.reviewCount ?? 0;
    if (reviewCount >= 75) {
      score += 10;
      reasons.push('75+ reviews');
    } else if (reviewCount >= 25) {
      score += 8;
      reasons.push('25+ reviews');
    } else if (reviewCount >= 10) {
      score += 5;
      reasons.push('10+ reviews');
    }

    const contactScore = this.contactScore(candidate);
    score += contactScore.score;
    reasons.push(...contactScore.reasons);

    const websiteScore = this.websiteScore(candidate);
    score += websiteScore.score;
    reasons.push(...websiteScore.reasons);

    const cappedScore = Math.min(100, Math.max(0, score));

    return {
      ...candidate,
      score: cappedScore,
      priority:
        cappedScore >= 75 ? 'HIGH' : cappedScore >= 50 ? 'MEDIUM' : 'LOW',
      reasons,
    };
  }

  private serviceRelevance(
    candidate: InternalLeadCandidate,
    requestedServiceType: string,
  ): { score: number; reasons: string[] } {
    const terms = this.getServiceTerms(requestedServiceType.toLowerCase());
    const evidenceText = [
      candidate.businessName,
      candidate.description,
      candidate.serviceType,
      ...(candidate.categories ?? []),
      ...(candidate.websiteKeywords ?? []),
    ]
      .join(' ')
      .toLowerCase();

    if (terms.some((term) => evidenceText.includes(term))) {
      return { score: 30, reasons: ['Service relevance match'] };
    }

    return { score: 15, reasons: ['Matched Google search query'] };
  }

  private locationScore(
    candidate: InternalLeadCandidate,
    requestedArea: string,
  ): { score: number; reasons: string[] } {
    const requested = requestedArea.trim().toLowerCase();
    const locationText = [candidate.area, candidate.address]
      .join(' ')
      .toLowerCase();

    if (requested && locationText.includes(requested)) {
      return { score: 20, reasons: ['Area match'] };
    }

    const tokens = requested
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);
    const matchedTokens = tokens.filter((token) => locationText.includes(token));

    if (tokens.length > 0 && matchedTokens.length > 0) {
      return { score: 10, reasons: ['Partial area match'] };
    }

    return { score: 0, reasons: [] };
  }

  private contactScore(candidate: InternalLeadCandidate): {
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    if (candidate.phone) {
      score += 7;
      reasons.push('Phone available');
    }

    if (candidate.email) {
      score += 5;
      reasons.push('Email available');
    }

    if (candidate.website) {
      score += 3;
      reasons.push('Website available');
    }

    return { score: Math.min(15, score), reasons };
  }

  private websiteScore(candidate: InternalLeadCandidate): {
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    if (candidate.websiteSignals?.hasServiceKeyword) {
      score += 4;
      reasons.push('Website mentions matching services');
    }

    if (candidate.websiteSignals?.hasContactPageHint) {
      score += 3;
      reasons.push('Website has contact signals');
    }

    if (candidate.websiteSignals?.hasQuoteHint) {
      score += 3;
      reasons.push('Website has quote or booking signals');
    }

    return { score: Math.min(10, score), reasons };
  }

  private getServiceTerms(requestedServiceType: string): string[] {
    for (const [serviceType, terms] of Object.entries(SERVICE_TERMS)) {
      if (
        requestedServiceType.includes(serviceType) ||
        terms.some((term) => requestedServiceType.includes(term))
      ) {
        return Array.from(new Set([serviceType, ...terms]));
      }
    }

    return [requestedServiceType];
  }
}
