import axios from 'axios';
import type {
  AddMessagePayload,
  AddNotePayload,
  CreateLeadPayload,
  ImportLeadsRequest,
  ImportLeadsResponse,
  GatherLeadsRequest,
  GatherLeadsResponse,
  GenerateMessagePayload,
  ScheduleFollowUpPayload,
  OutreachLead,
  OutreachLeadDetail,
  OutreachMessage,
  LeadsQueryParams,
  DueFollowUpsQuery,
  UpdateLeadPayload,
} from './types';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export async function getLeads(
  params?: LeadsQueryParams,
): Promise<OutreachLead[]> {
  const { data } = await api.get<OutreachLead[]>('/outreach-leads', {
    params: {
      ...(params?.status && { status: params.status }),
      ...(params?.area && { area: params.area }),
      ...(params?.serviceType && { serviceType: params.serviceType }),
    },
  });
  return data;
}

export async function getLeadById(id: string): Promise<OutreachLeadDetail> {
  const { data } = await api.get<OutreachLeadDetail>(`/outreach-leads/${id}`);
  return data;
}

export async function createLead(
  payload: CreateLeadPayload,
): Promise<OutreachLead> {
  const { data } = await api.post<OutreachLead>('/outreach-leads', payload);
  return data;
}

export async function updateLead(
  id: string,
  payload: UpdateLeadPayload,
): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}`,
    payload,
  );
  return data;
}

export async function markLeadContacted(id: string): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}/mark-contacted`,
  );
  return data;
}

export async function markLeadReplied(id: string): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}/mark-replied`,
  );
  return data;
}

export async function markLeadInterested(id: string): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}/mark-interested`,
  );
  return data;
}

export async function markLeadNotInterested(id: string): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}/mark-not-interested`,
  );
  return data;
}

export async function scheduleFollowUp(
  id: string,
  payload: ScheduleFollowUpPayload,
): Promise<OutreachLead> {
  const { data } = await api.patch<OutreachLead>(
    `/outreach-leads/${id}/schedule-follow-up`,
    payload,
  );
  return data;
}

export async function getDueFollowUps(
  query: DueFollowUpsQuery = {},
): Promise<OutreachLead[]> {
  const { data } = await api.get<OutreachLead[]>('/outreach-leads/follow-ups/due', {
    params: {
      ...(query.includeFuture !== undefined
        ? { includeFuture: query.includeFuture }
        : {}),
    },
  });
  return data;
}

export async function addNote(
  id: string,
  payload: AddNotePayload,
): Promise<{ id: string; leadId: string; content: string; createdAt: string }> {
  const { data } = await api.post(`/outreach-leads/${id}/notes`, payload);
  return data;
}

export async function addMessage(
  id: string,
  payload: AddMessagePayload,
): Promise<{
  id: string;
  leadId: string;
  type: string;
  content: string;
  createdAt: string;
}> {
  const { data } = await api.post(`/outreach-leads/${id}/messages`, payload);
  return data;
}

export async function generateMessage(
  leadId: string,
  payload: GenerateMessagePayload,
): Promise<OutreachMessage> {
  const { data } = await api.post<OutreachMessage>(
    `/outreach-leads/${leadId}/generate-message`,
    payload,
  );
  return data;
}

export async function generateFollowUpMessage(
  leadId: string,
  payload: GenerateMessagePayload,
): Promise<OutreachMessage> {
  const { data } = await api.post<OutreachMessage>(
    `/outreach-leads/${leadId}/generate-follow-up`,
    payload,
  );
  return data;
}

export async function gatherLeads(
  payload: GatherLeadsRequest,
): Promise<GatherLeadsResponse> {
  const { data } = await api.post<GatherLeadsResponse>(
    '/lead-gathering/gather',
    payload,
  );
  return data;
}

export async function importLeads(
  payload: ImportLeadsRequest,
): Promise<ImportLeadsResponse> {
  const { data } = await api.post<ImportLeadsResponse>(
    '/outreach-leads/import',
    payload,
  );
  return data;
}
