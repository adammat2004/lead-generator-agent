/** Aligned with backend Prisma enums / API responses */

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NOT_INTERESTED';

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type MessageType = 'INITIAL' | 'FOLLOW_UP';

export type ActivityType =
  | 'CREATED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'FOLLOW_UP_SCHEDULED'
  | 'FOLLOW_UP_MESSAGE_CREATED';

export interface OutreachLead {
  id: string;
  businessName: string;
  serviceType: string;
  area: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  sourceUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  status: LeadStatus;
  priority: LeadPriority;
  nextAction: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachNote {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
}

export interface OutreachMessage {
  id: string;
  leadId: string;
  type: MessageType;
  content: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type OutreachLeadDetail = OutreachLead & {
  notes: OutreachNote[];
  messages: OutreachMessage[];
  activities: LeadActivity[];
};

export interface CreateLeadPayload {
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
  status?: LeadStatus;
  priority?: LeadPriority;
  nextAction?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export interface AddNotePayload {
  content: string;
}

export interface AddMessagePayload {
  type: MessageType;
  content: string;
}

export type OutreachTone = 'casual' | 'professional' | 'direct';

export interface GenerateMessagePayload {
  tone: OutreachTone;
  instruction?: string;
}

export interface ScheduleFollowUpPayload {
  nextFollowUpAt: string;
}

export type GatherLeadSource = 'mock' | 'google' | 'facebook' | 'manual';

export type LeadCandidatePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LeadCandidate {
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
  score: number;
  priority: LeadCandidatePriority;
  reasons: string[];
}

export interface GatherLeadsRequest {
  serviceType: string;
  area: string;
  source: GatherLeadSource;
  requestedCount: number;
  minRating?: number;
  minReviewCount?: number;
}

export interface GatherLeadsResponse {
  query: {
    serviceType: string;
    area: string;
    source: GatherLeadSource;
    requestedCount: number;
  };
  count: number;
  candidates: LeadCandidate[];
}

export interface LeadsQueryParams {
  status?: LeadStatus;
  area?: string;
  serviceType?: string;
}

export interface ImportLeadItemPayload extends CreateLeadPayload {
  score?: number;
}

export interface ImportLeadsRequest {
  leads: ImportLeadItemPayload[];
}

export interface ImportLeadsResponse {
  received: number;
  inserted: number;
  skippedDuplicate: number;
  invalid: number;
}

export interface DueFollowUpsQuery {
  includeFuture?: boolean;
}
