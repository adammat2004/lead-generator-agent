import type { LeadPriority, LeadStatus } from './types';

/** Maps API LeadStatus → Figma-style labels and chip colors */
export const statusDisplay: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: 'Uncontacted',
    className: 'bg-gray-100 text-gray-700',
  },
  CONTACTED: {
    label: 'Contacted',
    className: 'bg-blue-100 text-blue-700',
  },
  REPLIED: {
    label: 'Replied',
    className: 'bg-purple-100 text-purple-700',
  },
  INTERESTED: {
    label: 'Interested',
    className: 'bg-green-100 text-green-700',
  },
  NOT_INTERESTED: {
    label: 'Not interested',
    className: 'bg-red-100 text-red-700',
  },
};

export const priorityDisplay: Record<
  LeadPriority,
  { label: string; className: string }
> = {
  HIGH: {
    label: 'High priority',
    className:
      'inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded mt-1',
  },
  MEDIUM: {
    label: 'Medium',
    className:
      'inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded mt-1',
  },
  LOW: {
    label: 'Low',
    className:
      'inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded mt-1',
  },
};

export function isFollowUpToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

export function isFollowUpOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getTime() < now.getTime() && !isFollowUpToday(iso);
}

export function isFollowUpDue(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}
