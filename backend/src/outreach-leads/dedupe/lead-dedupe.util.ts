import { createHash } from 'crypto';

export type LeadDedupeInput = {
  businessName?: string;
  area?: string;
  source?: string;
  phone?: string;
  email?: string;
  website?: string;
  sourceUrl?: string;
};

export function buildLeadDedupeKey(input: LeadDedupeInput): string {
  const normalizedBusinessName = normalizeText(input.businessName) ?? 'unknown';
  const normalizedArea = normalizeText(input.area) ?? 'unknown';
  const normalizedSource = normalizeText(input.source) ?? 'unknown';
  const identity =
    normalizePhone(input.phone) ??
    normalizeEmail(input.email) ??
    normalizeWebsite(input.website) ??
    normalizeWebsite(input.sourceUrl) ??
    'no-contact';

  const payload = [
    normalizedBusinessName.toLowerCase(),
    normalizedArea.toLowerCase(),
    identity.toLowerCase(),
    normalizedSource.toLowerCase(),
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

function normalizeText(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function normalizePhone(value: string | undefined): string | undefined {
  const cleaned = normalizeText(value);
  if (!cleaned) {
    return undefined;
  }

  const compact = cleaned.replace(/[^\d+]/g, '');

  if (compact.startsWith('+')) {
    return `+${compact.slice(1).replace(/[^\d]/g, '')}`;
  }
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`;
  }
  if (compact.startsWith('0')) {
    return `+353${compact.slice(1)}`;
  }

  return compact;
}

function normalizeEmail(value: string | undefined): string | undefined {
  const cleaned = normalizeText(value)?.toLowerCase();
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return undefined;
  }

  return cleaned;
}

function normalizeWebsite(value: string | undefined): string | undefined {
  const cleaned = normalizeText(value);
  if (!cleaned) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  try {
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return undefined;
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}
