'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeads } from '@/lib/api';
import type { LeadsQueryParams } from '@/lib/types';

export const leadsQueryKey = (filters: LeadsQueryParams) =>
  ['outreach-leads', filters] as const;

export function useLeads(filters: LeadsQueryParams) {
  return useQuery({
    queryKey: leadsQueryKey(filters),
    queryFn: () => getLeads(filters),
  });
}
