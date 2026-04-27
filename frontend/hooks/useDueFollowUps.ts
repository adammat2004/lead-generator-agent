'use client';

import { useQuery } from '@tanstack/react-query';
import { getDueFollowUps } from '@/lib/api';

export function useDueFollowUps(enabled: boolean, includeFuture?: boolean) {
  return useQuery({
    queryKey: ['outreach-followups-due', includeFuture ?? false],
    queryFn: () => getDueFollowUps({ includeFuture }),
    enabled,
  });
}
