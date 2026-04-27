'use client';

import type { LeadStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'NEW', label: 'Uncontacted' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
];

type Props = {
  onClose: () => void;
  status: LeadStatus | '';
  area: string;
  serviceType: string;
  onChangeStatus: (v: LeadStatus | '') => void;
  onChangeArea: (v: string) => void;
  onChangeServiceType: (v: string) => void;
  onApply: () => void;
};

export function FilterDropdown({
  onClose,
  status,
  area,
  serviceType,
  onChangeStatus,
  onChangeArea,
  onChangeServiceType,
  onApply,
}: Props) {
  return (
    <div
      className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
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
