'use client';

import type { LeadPriority, LeadStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'NEW', label: 'Uncontacted' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
];

const PRIORITY_OPTIONS: { value: LeadPriority | ''; label: string }[] = [
  { value: '', label: 'Any priority' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

type Props = {
  onClose: () => void;
  status: LeadStatus | '';
  priority: LeadPriority | '';
  area: string;
  serviceType: string;
  followUpsMin: string;
  followUpsMax: string;
  onChangeStatus: (v: LeadStatus | '') => void;
  onChangePriority: (v: LeadPriority | '') => void;
  onChangeArea: (v: string) => void;
  onChangeServiceType: (v: string) => void;
  onChangeFollowUpsMin: (v: string) => void;
  onChangeFollowUpsMax: (v: string) => void;
  onApply: () => void;
};

export function FilterDropdown({
  onClose,
  status,
  priority,
  area,
  serviceType,
  followUpsMin,
  followUpsMax,
  onChangeStatus,
  onChangePriority,
  onChangeArea,
  onChangeServiceType,
  onChangeFollowUpsMin,
  onChangeFollowUpsMax,
  onApply,
}: Props) {
  return (
    <div
      className="absolute right-0 z-30 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
      role="dialog"
      aria-label="Filters"
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Status</span>
          <select
            value={status}
            onChange={(e) =>
              onChangeStatus(e.target.value as LeadStatus | '')
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Priority</span>
          <select
            value={priority}
            onChange={(e) =>
              onChangePriority(e.target.value as LeadPriority | '')
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || 'any-p'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Area</span>
          <input
            value={area}
            onChange={(e) => onChangeArea(e.target.value)}
            placeholder="Exact match"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">
            Service type
          </span>
          <input
            value={serviceType}
            onChange={(e) => onChangeServiceType(e.target.value)}
            placeholder="Exact match"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <fieldset className="block space-y-2">
          <legend className="mb-1 block font-medium text-gray-700">
            Follow-ups completed (count)
          </legend>
          <p className="text-xs text-gray-500">
            Inclusive range; leave blank for no bound.
          </p>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-0.5 block text-xs text-gray-600">Min</span>
              <input
                inputMode="numeric"
                value={followUpsMin}
                onChange={(e) => onChangeFollowUpsMin(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-0.5 block text-xs text-gray-600">Max</span>
              <input
                inputMode="numeric"
                value={followUpsMax}
                onChange={(e) => onChangeFollowUpsMax(e.target.value)}
                placeholder="∞"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onApply();
            onClose();
          }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
