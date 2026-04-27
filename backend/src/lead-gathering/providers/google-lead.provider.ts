import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  GatherLeadsInput,
  InternalLeadCandidate,
  LeadProvider,
  RawLeadCandidate,
} from '../interfaces/lead-provider.interface';

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.types',
  'places.primaryType',
  'nextPageToken',
].join(',');
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'reviews',
  'businessStatus',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
].join(',');

interface GoogleLocalizedText {
  text?: string;
  languageCode?: string;
}

interface GoogleReview {
  text?: GoogleLocalizedText;
  originalText?: GoogleLocalizedText;
  rating?: number;
}

interface GooglePlace {
  id?: string;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: GoogleLocalizedText;
}

interface GoogleTextSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: GoogleApiError;
}

interface GoogleApiError {
  code?: number;
  message?: string;
  status?: string;
}

@Injectable()
export class GoogleLeadProvider implements LeadProvider {
  private readonly logger = new Logger(GoogleLeadProvider.name);

  async search(input: GatherLeadsInput): Promise<RawLeadCandidate[]> {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new ServiceUnavailableException(
        'Google Places API key is not configured.',
      );
    }

    const searchResults = await this.searchTextPages(input);
    const places = await this.fetchDetailsInBatches(searchResults);

    return places.map((place) => this.toLeadCandidate(place, input));
  }

  private async searchTextPages(input: GatherLeadsInput): Promise<GooglePlace[]> {
    const targetRawCount = Math.min(
      50,
      Math.max(input.requestedCount, input.requestedCount * 3),
    );
    const pageSize = Math.min(20, targetRawCount);
    const places: GooglePlace[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      const body = {
        textQuery: `${input.serviceType} in ${input.area}`,
        pageSize,
        includePureServiceAreaBusinesses: true,
        ...(input.minRating !== undefined ? { minRating: input.minRating } : {}),
        ...(pageToken ? { pageToken } : {}),
      };

      const response = await this.fetchGoogle<GoogleTextSearchResponse>(
        `${GOOGLE_PLACES_BASE_URL}/places:searchText`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        SEARCH_FIELD_MASK,
      );

      places.push(...(response.places ?? []));
      pageToken = response.nextPageToken;
      pageCount += 1;
    } while (pageToken && places.length < targetRawCount && pageCount < 3);

    return this.uniquePlaces(places).slice(0, targetRawCount);
  }

  private async fetchDetailsInBatches(
    places: GooglePlace[],
  ): Promise<GooglePlace[]> {
    const details: GooglePlace[] = [];
    const batchSize = 5;

    for (let index = 0; index < places.length; index += batchSize) {
      const batch = places.slice(index, index + batchSize);
      const resolved = await Promise.all(
        batch.map((place) => this.fetchPlaceDetails(place)),
      );
      details.push(...resolved);
    }

    return details;
  }

  private async fetchPlaceDetails(place: GooglePlace): Promise<GooglePlace> {
    if (!place.id) {
      return place;
    }

    try {
      const details = await this.fetchGoogle<GooglePlace>(
        `${GOOGLE_PLACES_BASE_URL}/places/${encodeURIComponent(place.id)}`,
        { method: 'GET' },
        DETAILS_FIELD_MASK,
      );

      return {
        ...place,
        ...details,
        id: details.id ?? place.id,
        types: details.types ?? place.types,
      };
    } catch (error) {
      this.logger.warn(
        `Could not fetch details for Google place ${place.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return place;
    }
  }

  private async fetchGoogle<T>(
    url: string,
    init: RequestInit,
    fieldMask: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY ?? '',
          'X-Goog-FieldMask': fieldMask,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
      const data = (await response.json()) as T & { error?: GoogleApiError };

      if (!response.ok || data.error) {
        throw new BadGatewayException(
          data.error?.message ??
            `Google Places request failed with status ${response.status}.`,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        `Google Places request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private uniquePlaces(places: GooglePlace[]): GooglePlace[] {
    const seen = new Set<string>();

    return places.filter((place) => {
      const key = place.id ?? place.displayName?.text ?? place.formattedAddress;
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private toLeadCandidate(
    place: GooglePlace,
    input: GatherLeadsInput,
  ): InternalLeadCandidate {
    return {
      businessName: place.displayName?.text ?? 'Unknown Business',
      serviceType: input.serviceType,
      area: place.formattedAddress ?? input.area,
      phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber,
      website: place.websiteUri,
      source: 'google',
      sourceUrl: place.googleMapsUri,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      description: this.reviewSummary(place),
      address: place.formattedAddress,
      categories: [
        ...(place.types ?? []),
        ...(place.primaryType ? [place.primaryType] : []),
        ...(place.primaryTypeDisplayName?.text
          ? [place.primaryTypeDisplayName.text]
          : []),
      ],
      placeId: place.id,
      businessStatus: place.businessStatus,
    };
  }

  private reviewSummary(place: GooglePlace): string | undefined {
    const reviewText = place.reviews
      ?.map((review) => review.text?.text ?? review.originalText?.text)
      .find((text): text is string => Boolean(text?.trim()));

    return reviewText?.trim();
  }
}
