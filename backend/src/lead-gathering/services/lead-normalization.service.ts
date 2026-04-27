import { Injectable } from '@nestjs/common';
import type {
  GatherLeadsInput,
  InternalLeadCandidate,
  RawLeadCandidate,
  ScoredLeadCandidate,
} from '../interfaces/lead-provider.interface';

const SERVICE_SYNONYMS: Record<string, string[]> = {
  landscaping: [
    'landscape',
    'landscaping',
    'garden design',
    'garden landscaping',
  ],
  paving: ['paving', 'driveway', 'patio', 'block paving', 'tarmac'],
  'garden maintenance': [
    'garden maintenance',
    'gardener',
    'lawn care',
    'grass cutting',
  ],
  'hedge trimming': ['hedge trimming', 'hedge cutting', 'hedges'],
  'power washing': [
    'power washing',
    'pressure washing',
    'jet washing',
    'exterior cleaning',
  ],
  'tree surgery': ['tree surgery', 'tree surgeon', 'arborist', 'tree care'],
};

@Injectable()
export class LeadNormalizationService {
  normalize(
    candidate: RawLeadCandidate,
    input: GatherLeadsInput,
  ): InternalLeadCandidate {
    const internalCandidate = candidate as InternalLeadCandidate;
    const address = this.cleanText(internalCandidate.address ?? candidate.area);

    return {
      ...internalCandidate,
      businessName:
        this.cleanBusinessName(candidate.businessName) ?? 'Unknown Business',
      serviceType: this.normalizeServiceType(
        candidate.serviceType,
        input.serviceType,
      ),
      area: this.extractArea(candidate.area, input.area),
      phone: this.normalizePhone(candidate.phone),
      email: this.normalizeEmail(candidate.email),
      website: this.normalizeWebsite(candidate.website),
      source: this.cleanText(candidate.source) || 'unknown',
      sourceUrl: this.normalizeWebsite(candidate.sourceUrl),
      rating: this.normalizeRating(candidate.rating),
      reviewCount: this.normalizeReviewCount(candidate.reviewCount),
      description: this.cleanText(candidate.description),
      address,
      categories: this.normalizeCategories(internalCandidate.categories),
      placeId: this.cleanText(internalCandidate.placeId),
      businessStatus: this.cleanText(internalCandidate.businessStatus),
      websiteKeywords: this.normalizeList(internalCandidate.websiteKeywords),
      websiteSignals: internalCandidate.websiteSignals,
    };
  }

  toPublicCandidate(candidate: ScoredLeadCandidate): ScoredLeadCandidate {
    return {
      businessName: candidate.businessName,
      serviceType: candidate.serviceType,
      area: candidate.area,
      phone: candidate.phone,
      email: candidate.email,
      website: candidate.website,
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      description: candidate.description,
      score: candidate.score,
      priority: candidate.priority,
      reasons: candidate.reasons,
    };
  }

  private cleanBusinessName(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return undefined;
    }

    return cleaned
      .replace(/\s+[-|]\s+Google Search$/i, '')
      .replace(/\s+\|\s+.*$/i, '')
      .trim();
  }

  private normalizeServiceType(
    value: string | undefined,
    requestedServiceType: string,
  ): string {
    const requested = this.cleanText(requestedServiceType)?.toLowerCase() ?? '';
    const candidate = this.cleanText(value)?.toLowerCase() ?? '';
    const combined = `${requested} ${candidate}`.trim();

    for (const [serviceType, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      if (
        combined.includes(serviceType) ||
        synonyms.some((synonym) => combined.includes(synonym))
      ) {
        return serviceType;
      }
    }

    return this.cleanText(value) ?? this.cleanText(requestedServiceType) ?? '';
  }

  private extractArea(value: string | undefined, requestedArea: string): string {
    const cleanedValue = this.cleanText(value);
    const cleanedRequest = this.cleanText(requestedArea);

    if (!cleanedValue) {
      return cleanedRequest ?? '';
    }

    if (
      cleanedRequest &&
      cleanedValue.toLowerCase().includes(cleanedRequest.toLowerCase())
    ) {
      return cleanedRequest;
    }

    const addressParts = cleanedValue
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return addressParts[0] ?? cleanedValue;
  }

  private normalizePhone(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return undefined;
    }

    const compact = cleaned.replace(/[^\d+]/g, '');

    if (compact.startsWith('+')) {
      return `+${compact.slice(1).replace(/[^\d]/g, '')}`;
    }

    if (compact.startsWith('00')) {
      return `+${compact.slice(2)}`;
    }

    if (compact.startsWith('0')) {
      return `+353${compact.slice(1)}`;
    }

    return compact;
  }

  private normalizeEmail(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value)?.toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return undefined;
    }

    return cleaned;
  }

  private normalizeWebsite(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return undefined;
    }

    const withProtocol = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;

    try {
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return undefined;
      }

      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      return undefined;
    }
  }

  private normalizeRating(value: number | undefined): number | undefined {
    if (value === undefined || Number.isNaN(value)) {
      return undefined;
    }

    return Math.min(5, Math.max(0, Number(value.toFixed(1))));
  }

  private normalizeReviewCount(value: number | undefined): number | undefined {
    if (value === undefined || Number.isNaN(value)) {
      return undefined;
    }

    return Math.max(0, Math.floor(value));
  }

  private normalizeCategories(value: string[] | undefined): string[] {
    return this.normalizeList(value).map((category) =>
      category.toLowerCase().replace(/_/g, ' '),
    );
  }

  private normalizeList(value: string[] | undefined): string[] {
    return Array.from(
      new Set(
        (value ?? [])
          .map((entry) => this.cleanText(entry)?.toLowerCase())
          .filter((entry): entry is string => Boolean(entry)),
      ),
    );
  }

  private cleanText(value: string | undefined): string | undefined {
    const cleaned = value?.replace(/\s+/g, ' ').trim();
    return cleaned || undefined;
  }
}
