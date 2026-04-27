'use client';

import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import type { OutreachLead } from '@/lib/types';
import {
  isFollowUpOverdue,
  isFollowUpToday,
  priorityDisplay,
  statusDisplay,
} from '@/lib/leadDisplay';

type Props = {
  leads: OutreachLead[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
  onMarkContacted: (id: string) => void;
  onScheduleFollowUp: (id: string) => void;
  onCopySnippet: (id: string, text: string) => void;
  copiedLeadId: string | null;
  rowActionPending?: boolean;
};

export function LeadsDataTable({
  leads,
  selectedLeadId,
  onSelectLead,
  onMarkContacted,
  onScheduleFollowUp,
  onCopySnippet,
  copiedLeadId,
  rowActionPending,
}: Props) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const snippetForLead = (lead: OutreachLead) =>
    lead.nextAction?.trim() ||
    `${lead.businessName} — ${lead.serviceType} (${lead.area})`;

  const formatDate = (iso: string | null) => {
    if (!iso) {
      return '—';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    return date.toLocaleDateString();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {[
              'Business name',
              'Service type',
              'Area',
              'Rating',
              'Source',
              'Status',
              'Next action',
              'Last contacted',
              'Actions',
            ].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {leads.map((lead) => {
            const st = statusDisplay[lead.status];
            const next = lead.nextAction ?? '—';
            const urgent =
              typeof next === 'string' && next.toLowerCase().includes('today');
            const overdue = isFollowUpOverdue(lead.nextFollowUpAt);
            const dueToday = isFollowUpToday(lead.nextFollowUpAt);
            return (
              <tr
                key={lead.id}
                onMouseEnter={() => setHoveredRow(lead.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onSelectLead(lead.id)}
                className={`cursor-pointer transition-colors ${
                  selectedLeadId === lead.id
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="font-medium text-gray-900">
                    {lead.businessName}
                  </div>
                  {lead.priority === 'HIGH' && (
                    <span className={priorityDisplay.HIGH.className}>
                      {priorityDisplay.HIGH.label}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                  {lead.serviceType}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                  {lead.area}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-900">
                      {lead.rating != null ? lead.rating.toFixed(1) : '—'}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({lead.reviewCount ?? 0})
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {lead.sourceUrl ? (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lead.source}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-gray-700">{lead.source}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${st.className}`}
                  >
                    {st.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="space-y-1">
                    <div
                      className={`text-sm ${
                        overdue
                          ? 'font-semibold text-red-600'
                          : urgent || dueToday
                            ? 'font-semibold text-orange-600'
                          : 'font-medium text-gray-800'
                      }`}
                    >
                      {next}
                    </div>
                    {lead.nextFollowUpAt && (
                      <div
                        className={`text-xs ${
                          overdue
                            ? 'font-medium text-red-600'
                            : dueToday
                              ? 'font-medium text-orange-600'
                              : 'text-gray-500'
                        }`}
                      >
                        Follow-up: {formatDate(lead.nextFollowUpAt)}
                        {overdue ? ' (Overdue)' : dueToday ? ' (Due today)' : ''}
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  <span
                    className={`${
                      urgent || isFollowUpToday(lead.nextFollowUpAt)
                        ? 'font-medium text-gray-900'
                        : 'text-gray-700'
                    }`}
                  >
                    {formatDate(lead.lastContactedAt)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div
                    className={`flex items-center gap-1 transition-opacity ${
                      hoveredRow === lead.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <button
                      type="button"
                      title="Copy snippet"
                      disabled={rowActionPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopySnippet(lead.id, snippetForLead(lead));
                      }}
                      className="rounded p-1.5 hover:bg-gray-200 disabled:opacity-40"
                    >
                      {copiedLeadId === lead.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Mark contacted"
                      disabled={rowActionPending || lead.status !== 'NEW'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkContacted(lead.id);
                      }}
                      className="rounded p-1.5 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      title="Schedule follow-up"
                      disabled={rowActionPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleFollowUp(lead.id);
                      }}
                      className="rounded p-1.5 hover:bg-gray-200 disabled:opacity-40"
                    >
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
