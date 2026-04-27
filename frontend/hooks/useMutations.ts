'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addMessage,
  addNote,
  createLead,
  generateMessage,
  generateFollowUpMessage,
  scheduleFollowUp,
  getDueFollowUps,
  markLeadContacted,
  markLeadInterested,
  markLeadNotInterested,
  markLeadReplied,
  updateLead,
} from '@/lib/api';
import { leadDetailQueryKey } from '@/hooks/useLeadDetail';
import type {
  AddMessagePayload,
  AddNotePayload,
  CreateLeadPayload,
  GenerateMessagePayload,
  UpdateLeadPayload,
} from '@/lib/types';

export function useAddNoteMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddNotePayload) => {
      if (!leadId) throw new Error('No lead selected');
      return addNote(leadId, payload);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function useAddMessageMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddMessagePayload) => {
      if (!leadId) throw new Error('No lead selected');
      return addMessage(leadId, payload);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function useGenerateMessageMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateMessagePayload) => {
      if (!leadId) throw new Error('No lead selected');
      return generateMessage(leadId, payload);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function useGenerateFollowUpMessageMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateMessagePayload) => {
      if (!leadId) throw new Error('No lead selected');
      return generateFollowUpMessage(leadId, payload);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
      void qc.invalidateQueries({ queryKey: ['outreach-followups-due'] });
    },
  });
}

export function useScheduleFollowUpMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nextFollowUpAt: string) => {
      if (!leadId) throw new Error('No lead selected');
      return scheduleFollowUp(leadId, { nextFollowUpAt });
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
      void qc.invalidateQueries({ queryKey: ['outreach-followups-due'] });
    },
  });
}

export function useUpdateLeadMutation(leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLeadPayload) => {
      if (!leadId) throw new Error('No lead selected');
      return updateLead(leadId, payload);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function usePatchLeadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateLeadPayload;
    }) => updateLead(id, payload),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(id) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function useCreateLeadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => createLead(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

function useLeadActionMutation(
  leadId: string | null,
  action: (id: string) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!leadId) throw new Error('No lead selected');
      return action(leadId);
    },
    onSuccess: () => {
      if (!leadId) return;
      void qc.invalidateQueries({ queryKey: leadDetailQueryKey(leadId) });
      void qc.invalidateQueries({ queryKey: ['outreach-leads'] });
    },
  });
}

export function useMarkLeadContactedMutation(leadId: string | null) {
  return useLeadActionMutation(leadId, markLeadContacted);
}

export function useMarkLeadRepliedMutation(leadId: string | null) {
  return useLeadActionMutation(leadId, markLeadReplied);
}

export function useMarkLeadInterestedMutation(leadId: string | null) {
  return useLeadActionMutation(leadId, markLeadInterested);
}

export function useMarkLeadNotInterestedMutation(leadId: string | null) {
  return useLeadActionMutation(leadId, markLeadNotInterested);
}

export function useGetDueFollowUpsMutation() {
  return useMutation({
    mutationFn: (includeFuture?: boolean) => getDueFollowUps({ includeFuture }),
  });
}
