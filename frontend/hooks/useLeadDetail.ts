'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeadById } from '@/lib/api';

export const leadDetailQueryKey = (id: string) =>
  ['outreach-lead', id] as const;

export function useLeadDetail(leadId: string | null) {
  return useQuery({
    queryKey: leadId
      ? leadDetailQueryKey(leadId)
      : (['outreach-lead', 'none'] as const),
    queryFn: () => getLeadById(leadId!),
    enabled: Boolean(leadId),
  });
}
