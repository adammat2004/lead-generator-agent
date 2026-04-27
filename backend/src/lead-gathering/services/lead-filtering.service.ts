import { Injectable } from '@nestjs/common';
import type {
  GatherLeadsInput,
  InternalLeadCandidate,
} from '../interfaces/lead-provider.interface';

const SERVICE_TERMS: Record<string, string[]> = {
  landscaping: ['landscape', 'landscaping', 'garden design', 'garden'],
  paving: ['paving', 'driveway', 'patio', 'tarmac', 'block paving'],
  'garden maintenance': [
    'garden maintenance',
    'gardener',
    'garden',
    'lawn',
    'grass cutting',
  ],
  'hedge trimming': ['hedge', 'hedge trimming', 'hedge cutting'],
  'power washing': [
    'power washing',
    'pressure washing',
    'jet washing',
    'exterior cleaning',
  ],
  'tree surgery': ['tree surgery', 'tree surgeon', 'tree care', 'arborist'],
};

const IRRELEVANT_CATEGORIES = [
  'restaurant',
  'food',
  'lodging',
  'bar',
  'cafe',
  'store',
  'school',
  'hospital',
  'bank',
  'real estate agency',
  'travel agency',
];

const CORPORATE_CHAIN_HINTS = [
  'b&q',
  'woodies',
  'homebase',
  'ikea',
  'tesco',
  'aldi',
  'lidl',
];

@Injectable()
export class LeadFilteringService {
  filter(
    candidates: InternalLeadCandidate[],
    input: GatherLeadsInput,
  ): InternalLeadCandidate[] {
    return candidates.filter((candidate) => this.isValid(candidate, input));
  }

  private isValid(
    candidate: InternalLeadCandidate,
    input: GatherLeadsInput,
  ): boolean {
    if (!this.hasAnyContactMethod(candidate)) {
      return false;
    }

    if (this.isClosed(candidate)) {
      return false;
    }

    if (
      input.minRating !== undefined &&
      (candidate.rating === undefined || candidate.rating < input.minRating)
    ) {
      return false;
    }

    if (
      input.minReviewCount !== undefined &&
      (candidate.reviewCount === undefined ||
        candidate.reviewCount < input.minReviewCount)
    ) {
      return false;
    }

    if (!this.isRelevantToService(candidate, input.serviceType)) {
      return false;
    }

    if (!this.isInRequestedArea(candidate, input.area)) {
      return false;
    }

    return !this.isLikelyCorporateChain(candidate);
  }

  private hasAnyContactMethod(candidate: InternalLeadCandidate): boolean {
    return Boolean(candidate.phone || candidate.email || candidate.website);
  }

  private isClosed(candidate: InternalLeadCandidate): boolean {
    const status = candidate.businessStatus?.toUpperCase();
    return Boolean(status && status !== 'OPERATIONAL');
  }

  private isRelevantToService(
    candidate: InternalLeadCandidate,
    requestedServiceType: string,
  ): boolean {
    const requested = requestedServiceType.trim().toLowerCase();
    const terms = this.getServiceTerms(requested);
    const categories = (candidate.categories ?? []).join(' ').toLowerCase();
    const categoryMismatch = IRRELEVANT_CATEGORIES.some((category) =>
      categories.includes(category),
    );
    const evidenceText = [
      candidate.businessName,
      candidate.description,
      ...(candidate.categories ?? []),
      ...(candidate.websiteKeywords ?? []),
    ]
      .join(' ')
      .toLowerCase();

    if (terms.some((term) => evidenceText.includes(term))) {
      return true;
    }

    if (categoryMismatch) {
      return false;
    }

    return terms.some((term) => candidate.serviceType.toLowerCase().includes(term));
  }

  private isInRequestedArea(
    candidate: InternalLeadCandidate,
    requestedArea: string,
  ): boolean {
    const tokens = requestedArea
      .toLowerCase()
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);

    if (tokens.length === 0) {
      return true;
    }

    const locationText = [candidate.area, candidate.address]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => locationText.includes(token));
  }

  private isLikelyCorporateChain(candidate: InternalLeadCandidate): boolean {
    const name = candidate.businessName.toLowerCase();
    const domain = candidate.website ? this.getDomain(candidate.website) : '';

    return CORPORATE_CHAIN_HINTS.some(
      (hint) => name.includes(hint) || domain.includes(hint.replace('&', '')),
    );
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

  private getDomain(value: string): string {
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return '';
    }
  }
}
