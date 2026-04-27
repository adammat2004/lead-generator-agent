'use client';

import { isAxiosError } from 'axios';
import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { gatherLeads } from '@/lib/api';
import type {
  GatherLeadSource,
  GatherLeadsRequest,
  GatherLeadsResponse,
  ImportLeadsResponse,
  LeadCandidate,
} from '@/lib/types';

type Props = {
  onClose: () => void;
  onImportSelected: (candidates: LeadCandidate[]) => Promise<ImportLeadsResponse>;
};

export function FindTradesmenModal({ onClose, onImportSelected }: Props) {
  const [serviceType, setServiceType] = useState('landscaping');
  const [area, setArea] = useState('Dublin 6');
  const [source, setSource] = useState<GatherLeadSource>('google');
  const [requestedCount, setRequestedCount] = useState<number>(10);
  const [minRating, setMinRating] = useState('');
  const [minReviewCount, setMinReviewCount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GatherLeadsResponse | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportLeadsResponse | null>(
    null,
  );

  const candidateKey = (candidate: LeadCandidate) =>
    `${candidate.businessName}-${candidate.area}-${candidate.phone ?? candidate.website ?? candidate.email ?? 'none'}`;

  const toggleCandidate = (candidate: LeadCandidate) => {
    const key = candidateKey(candidate);
    setSelectedCandidates((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key],
    );
  };

  const selectAll = () => {
    if (!result) return;
    setSelectedCandidates(result.candidates.map((candidate) => candidateKey(candidate)));
  };

  const clearSelection = () => setSelectedCandidates([]);

  const selectedLeadCandidates =
    result?.candidates.filter((candidate) =>
      selectedCandidates.includes(candidateKey(candidate)),
    ) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!serviceType.trim() || !area.trim()) {
      setError('Service type and area are required.');
      return;
    }

    const payload: GatherLeadsRequest = {
      serviceType: serviceType.trim(),
      area: area.trim(),
      source,
      requestedCount,
      ...(minRating.trim() ? { minRating: Number(minRating) } : {}),
      ...(minReviewCount.trim()
        ? { minReviewCount: Number(minReviewCount) }
        : {}),
    };

    try {
      setIsLoading(true);
      setImportSummary(null);
      const response = await gatherLeads(payload);
      setResult(response);
      setSelectedCandidates([]);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
              ? message
              : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Could not gather leads.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSelected = async () => {
    if (selectedLeadCandidates.length === 0) {
      return;
    }

    setError(null);
    setImportSummary(null);

    try {
      setIsImporting(true);
      const summary = await onImportSelected(selectedLeadCandidates);
      setImportSummary(summary);
      setSelectedCandidates([]);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
              ? message
              : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Could not import leads.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const priorityClass: Record<string, string> = {
    HIGH: 'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-gray-200 text-gray-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-tradesmen-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2
            id="find-tradesmen-title"
            className="text-lg font-semibold text-gray-900"
          >
            Find Tradesmen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4 overflow-y-auto border-r border-gray-100 p-5"
          >
            <p className="text-sm text-gray-500">
              Search external sources and preview lead candidates before import.
            </p>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Service type</span>
              <input
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Area</span>
              <input
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Source</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as GatherLeadSource)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="google">google</option>
                <option value="mock">mock</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Requested count</span>
              <select
                value={requestedCount}
                onChange={(e) => setRequestedCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? 'Hide advanced' : 'Show advanced'}
            </button>

            {showAdvanced && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Min rating</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    placeholder="e.g. 4.0"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">
                    Min review count
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={minReviewCount}
                    onChange={(e) => setMinReviewCount(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Find Leads
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {isLoading && (
              <p className="text-sm text-gray-500">Finding tradesmen in {area}…</p>
            )}
          </form>

          <section className="min-h-0 overflow-y-auto p-5">
            {!result && !isLoading && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Run a search to preview lead candidates here.
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Candidate preview
                    </h3>
                    <p className="text-sm text-gray-500">
                      {result.count} found for {result.query.serviceType} in{' '}
                      {result.query.area}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.candidates.map((candidate) => {
                    const key = candidateKey(candidate);
                    const checked = selectedCandidates.includes(key);

                    return (
                      <label
                        key={key}
                        className={`block rounded-lg border p-3 ${
                          checked
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={checked}
                            onChange={() => toggleCandidate(candidate)}
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {candidate.businessName}
                              </p>
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                {candidate.serviceType}
                              </span>
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                {candidate.area}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              <span>
                                Rating: {candidate.rating ?? 'n/a'} ({candidate.reviewCount ?? 0}{' '}
                                reviews)
                              </span>
                              <span>Score: {candidate.score}</span>
                              <span
                                className={`rounded px-2 py-0.5 font-medium ${
                                  priorityClass[candidate.priority]
                                }`}
                              >
                                {candidate.priority}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                              {candidate.phone ? <span>Phone: {candidate.phone}</span> : null}
                              {candidate.email ? <span>Email: {candidate.email}</span> : null}
                              {candidate.website ? (
                                <a
                                  className="text-blue-600 hover:underline"
                                  href={
                                    candidate.website.startsWith('http')
                                      ? candidate.website
                                      : `https://${candidate.website}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Website
                                </a>
                              ) : null}
                              {candidate.sourceUrl ? (
                                <a
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                  href={candidate.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Source
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>

                            {candidate.description ? (
                              <p className="text-xs text-gray-600">{candidate.description}</p>
                            ) : null}

                            {candidate.reasons.length > 0 ? (
                              <ul className="flex flex-wrap gap-1 text-xs text-gray-600">
                                {candidate.reasons.map((reason) => (
                                  <li
                                    key={reason}
                                    className="rounded bg-gray-100 px-2 py-0.5"
                                  >
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    disabled={selectedLeadCandidates.length === 0 || isImporting}
                    onClick={() => void handleImportSelected()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                  >
                    {isImporting
                      ? `Importing (${selectedLeadCandidates.length})...`
                      : `Import Selected (${selectedLeadCandidates.length})`}
                  </button>
                  {importSummary ? (
                    <p className="mt-2 text-xs text-gray-600">
                      Imported {importSummary.inserted} of {importSummary.received}. Skipped{' '}
                      {importSummary.skippedDuplicate} duplicates and rejected{' '}
                      {importSummary.invalid} invalid leads.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Already-imported leads are automatically excluded from search results.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
