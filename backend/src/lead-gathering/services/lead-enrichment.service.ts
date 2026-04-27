import { Injectable, Logger } from '@nestjs/common';
import type { InternalLeadCandidate } from '../interfaces/lead-provider.interface';

const SERVICE_KEYWORDS = [
  'landscaping',
  'landscape',
  'garden design',
  'garden maintenance',
  'gardener',
  'paving',
  'driveway',
  'patio',
  'block paving',
  'hedge trimming',
  'hedge cutting',
  'tree surgery',
  'tree surgeon',
  'arborist',
  'power washing',
  'pressure washing',
  'jet washing',
  'exterior cleaning',
];

@Injectable()
export class LeadEnrichmentService {
  private readonly logger = new Logger(LeadEnrichmentService.name);

  async enrichMany(
    candidates: InternalLeadCandidate[],
  ): Promise<InternalLeadCandidate[]> {
    const enriched: InternalLeadCandidate[] = [];
    const batchSize = 5;

    for (let index = 0; index < candidates.length; index += batchSize) {
      const batch = candidates.slice(index, index + batchSize);
      enriched.push(...(await Promise.all(batch.map((lead) => this.enrich(lead)))));
    }

    return enriched;
  }

  async enrich(candidate: InternalLeadCandidate): Promise<InternalLeadCandidate> {
    if (!candidate.website) {
      return candidate;
    }

    const html = await this.fetchHomepage(candidate.website);
    if (!html) {
      return candidate;
    }

    const emails = this.extractEmails(html);
    const websiteKeywords = this.extractKeywords(html);

    return {
      ...candidate,
      email: candidate.email ?? emails[0],
      websiteKeywords,
      websiteSignals: {
        hasContactPageHint: /\b(contact|contact us|get in touch)\b/i.test(html),
        hasQuoteHint: /\b(quote|estimate|free call|call out|book now)\b/i.test(
          html,
        ),
        hasServiceKeyword: websiteKeywords.length > 0,
      },
      description:
        candidate.description ??
        this.extractMetaDescription(html) ??
        this.extractTitle(html),
      categories: Array.from(
        new Set([
          ...(candidate.categories ?? []),
          ...websiteKeywords.map((keyword) => keyword.toLowerCase()),
        ]),
      ),
      businessName:
        candidate.businessName === 'Unknown Business'
          ? this.extractTitle(html) ?? candidate.businessName
          : candidate.businessName,
    };
  }

  private async fetchHomepage(url: string): Promise<string | undefined> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'TradeezLeadGatheringBot/1.0',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        return undefined;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('text/html')) {
        return undefined;
      }

      const text = await response.text();
      return text.slice(0, 250_000);
    } catch (error) {
      this.logger.debug(
        `Website enrichment failed for ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractEmails(html: string): string[] {
    const matches =
      html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

    return Array.from(
      new Set(
        matches
          .map((email) => email.toLowerCase())
          .filter((email) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email)),
      ),
    );
  }

  private extractKeywords(html: string): string[] {
    const text = this.stripHtml(html).toLowerCase();

    return SERVICE_KEYWORDS.filter((keyword) => text.includes(keyword));
  }

  private extractMetaDescription(html: string): string | undefined {
    const match = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    return this.cleanText(match?.[1]);
  }

  private extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return this.cleanText(match?.[1]);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanText(value: string | undefined): string | undefined {
    const cleaned = value
      ?.replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || undefined;
  }
}
