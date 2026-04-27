export interface RawLeadCandidate {
  businessName: string;
  serviceType: string;
  area: string;
  phone?: string;
  email?: string;
  website?: string;
  source: string;
  sourceUrl?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
}

export type CandidatePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface WebsiteSignals {
  hasContactPageHint?: boolean;
  hasQuoteHint?: boolean;
  hasServiceKeyword?: boolean;
}

export interface InternalLeadCandidate extends RawLeadCandidate {
  address?: string;
  categories?: string[];
  placeId?: string;
  businessStatus?: string;
  websiteKeywords?: string[];
  websiteSignals?: WebsiteSignals;
}

export interface ScoredLeadCandidate extends InternalLeadCandidate {
  score: number;
  priority: CandidatePriority;
  reasons: string[];
}

export interface GatherLeadsInput {
  serviceType: string;
  area: string;
  requestedCount: number;
  minRating?: number;
  minReviewCount?: number;
}

export interface LeadProvider {
  search(input: GatherLeadsInput): Promise<RawLeadCandidate[]>;
}
