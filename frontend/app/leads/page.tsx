'use client';

import { Filter, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FilterDropdown } from '@/components/FilterDropdown';
import { FindTradesmenModal } from '@/components/FindTradesmenModal';
import { LeadDetailPanel } from '@/components/LeadDetailPanel';
import { LeadsDataTable } from '@/components/LeadsDataTable';
import { importLeads } from '@/lib/api';
import { useDueFollowUps } from '@/hooks/useDueFollowUps';
import { useLeads } from '@/hooks/useLeads';
import {
  useMarkFollowUpDoneMutation,
  useMarkLeadContactedMutation,
  useScheduleFollowUpRowMutation,
} from '@/hooks/useMutations';
import {
  isFollowUpDue,
  isFollowUpToday,
  leadMatchesOptionalFilters,
} from '@/lib/leadDisplay';
import type {
  ImportLeadsResponse,
  LeadCandidate,
  LeadPriority,
  LeadStatus,
  OutreachLead,
} from '@/lib/types';

function parseNonNegativeIntInput(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = parseInt(t, 10);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

export default function LeadsPage() {
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [priority, setPriority] = useState<LeadPriority | ''>('');
  const [area, setArea] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [followUpsMin, setFollowUpsMin] = useState('');
  const [followUpsMax, setFollowUpsMax] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  const listFilterExtras = useMemo(() => {
    const minFollowUps = parseNonNegativeIntInput(followUpsMin);
    const maxFollowUps = parseNonNegativeIntInput(followUpsMax);
    const priorityVal = priority === '' ? undefined : priority;
    return { minFollowUps, maxFollowUps, priority: priorityVal };
  }, [followUpsMin, followUpsMax, priority]);

  const apiFilters = useMemo(() => {
    const a = area.trim();
    const s = serviceType.trim();
    const base: {
      status?: LeadStatus;
      priority?: LeadPriority;
      area?: string;
      serviceType?: string;
      minFollowUps?: number;
      maxFollowUps?: number;
    } = {};
    if (a) base.area = a;
    if (s) base.serviceType = s;
    if (listFilterExtras.priority != null) {
      base.priority = listFilterExtras.priority;
    }
    if (listFilterExtras.minFollowUps != null) {
      base.minFollowUps = listFilterExtras.minFollowUps;
    }
    if (listFilterExtras.maxFollowUps != null) {
      base.maxFollowUps = listFilterExtras.maxFollowUps;
    }

    if (activeQuickFilter === 'uncontacted') {
      base.status = 'NEW';
      return base;
    }
    if (activeQuickFilter === 'interested') {
      base.status = 'INTERESTED';
      return base;
    }
    if (activeQuickFilter === 'followup-today') {
      return base;
    }
    if (status) base.status = status;
    return base;
  }, [status, area, serviceType, activeQuickFilter, listFilterExtras]);

  const { data: leads, isLoading, isError, error, refetch } =
    useLeads(apiFilters);
  const {
    data: dueFollowUps,
    isLoading: isDueLoading,
    isError: isDueError,
  } = useDueFollowUps(activeQuickFilter === 'followup-due');

  const markContactedMutation = useMarkLeadContactedMutation();
  const scheduleFollowUpRow = useScheduleFollowUpRowMutation();
  const markFollowUpDoneRow = useMarkFollowUpDoneMutation();

  const displayLeads = useMemo(() => {
    let list: OutreachLead[] =
      activeQuickFilter === 'followup-due' ? dueFollowUps ?? [] : leads ?? [];
    if (activeQuickFilter === 'followup-due') {
      const { minFollowUps, maxFollowUps, priority: p } = listFilterExtras;
      if (minFollowUps != null || maxFollowUps != null || p != null) {
        list = list.filter((l) =>
          leadMatchesOptionalFilters(l, {
            minFollowUps,
            maxFollowUps,
            priority: p,
          }),
        );
      }
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          l.serviceType.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q),
      );
    }
    if (activeQuickFilter === 'followup-today') {
      list = list.filter((l) => isFollowUpToday(l.nextFollowUpAt));
    }
    return list;
  }, [
    leads,
    dueFollowUps,
    search,
    activeQuickFilter,
    listFilterExtras,
  ]);

  const quickFilterCounts = useMemo(() => {
    const base = leads ?? [];
    return {
      all: base.length,
      uncontacted: base.filter((l) => l.status === 'NEW').length,
      'followup-today': base.filter((l) =>
        isFollowUpToday(l.nextFollowUpAt),
      ).length,
      'followup-due': base.filter((l) => isFollowUpDue(l.nextFollowUpAt)).length,
      interested: base.filter((l) => l.status === 'INTERESTED').length,
    };
  }, [leads]);

  const quickFilters = [
    { id: 'all', label: 'All', count: quickFilterCounts.all },
    { id: 'uncontacted', label: 'Uncontacted', count: quickFilterCounts.uncontacted },
    {
      id: 'followup-today',
      label: 'Follow-ups today',
      count: quickFilterCounts['followup-today'],
    },
    {
      id: 'followup-due',
      label: 'Follow-ups due',
      count: quickFilterCounts['followup-due'],
    },
    {
      id: 'interested',
      label: 'Interested leads',
      count: quickFilterCounts.interested,
    },
  ] as const;

  const handleCopySnippet = (leadId: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedLeadId(leadId);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  const handleMarkContacted = (id: string) => {
    markContactedMutation.mutate(id);
  };

  const handleScheduleFollowUp = (id: string) => {
    const raw = window.prompt('Follow-up date (YYYY-MM-DD)', '');
    if (!raw) return;
    const d = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      window.alert('Invalid date.');
      return;
    }
    scheduleFollowUpRow.mutate({ id, nextFollowUpAt: d.toISOString() });
  };

  const handleMarkFollowUpDone = (id: string) => {
    markFollowUpDoneRow.mutate(id);
  };

  const handleImportSelected = async (
    candidates: LeadCandidate[],
  ): Promise<ImportLeadsResponse> => {
    const payload = {
      leads: candidates.map((candidate) => ({
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
        priority: candidate.priority,
        score: candidate.score,
      })),
    };

    const result = await importLeads(payload);
    await refetch();
    return result;
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-2xl flex-1 flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tradesmen…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 ${
                  showFilters
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              {showFilters && (
                <FilterDropdown
                  onClose={() => setShowFilters(false)}
                  status={status}
                  priority={priority}
                  area={area}
                  serviceType={serviceType}
                  followUpsMin={followUpsMin}
                  followUpsMax={followUpsMax}
                  onChangeStatus={setStatus}
                  onChangePriority={setPriority}
                  onChangeArea={setArea}
                  onChangeServiceType={setServiceType}
                  onChangeFollowUpsMin={setFollowUpsMin}
                  onChangeFollowUpsMax={setFollowUpsMax}
                  onApply={() => void refetch()}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFindModal(true)}
            className="ml-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            Find Tradesmen
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                setActiveQuickFilter(
                  filter.id === 'all'
                    ? null
                    : activeQuickFilter === filter.id
                      ? null
                      : filter.id,
                )
              }
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                activeQuickFilter === filter.id
                  ? 'border-blue-200 bg-blue-100 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
              <span className="ml-1.5 text-xs opacity-70">
                ({filter.count})
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`min-h-0 overflow-auto ${
            selectedLeadId ? 'min-w-0 flex-1' : 'w-full'
          }`}
        >
          <div className="p-6">
            <h1 className="mb-4 text-xl font-semibold text-gray-900">Leads</h1>

            {(isLoading || isDueLoading) && (
              <p className="text-sm text-gray-500">Loading leads…</p>
            )}
            {(isError || isDueError) && (
              <p className="text-sm text-red-600">
                {(error as Error)?.message ?? 'Failed to load leads.'}
              </p>
            )}

            {!isLoading && !isError && displayLeads.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No leads found
                </h3>
                <p className="mb-6 text-gray-500">
                  Try adjusting filters or add a lead to get started.
                </p>
                <button
                  type="button"
                  onClick={() => setShowFindModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Find Tradesmen
                </button>
              </div>
            )}

            {!isLoading && !isError && displayLeads.length > 0 && (
              <LeadsDataTable
                leads={displayLeads}
                selectedLeadId={selectedLeadId}
                onSelectLead={setSelectedLeadId}
                onMarkContacted={handleMarkContacted}
                onScheduleFollowUp={handleScheduleFollowUp}
                onMarkFollowUpDone={handleMarkFollowUpDone}
                onCopySnippet={handleCopySnippet}
                copiedLeadId={copiedLeadId}
                rowActionPending={
                  markContactedMutation.isPending ||
                  scheduleFollowUpRow.isPending ||
                  markFollowUpDoneRow.isPending
                }
              />
            )}
          </div>
        </div>

        {selectedLeadId && (
          <LeadDetailPanel
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
          />
        )}
      </div>

      {showFindModal && (
        <FindTradesmenModal
          onClose={() => setShowFindModal(false)}
          onImportSelected={handleImportSelected}
        />
      )}
    </div>
  );
}
