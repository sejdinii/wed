import type { CityKey, Hall, Venue } from '@/domain/types';
import { VENUES } from './venues';

/**
 * Repository boundary between UI and data. Screens depend only on `VenueApi`;
 * swapping `MockVenueApi` for an HTTP client (against the future backend)
 * is a one-line change at the bottom of this file.
 *
 * REST mapping (v0.2 backend):
 *   listVenues  → GET /v1/venues?city=&date=&minGuests=
 *   getVenue    → GET /v1/venues/:id   (unpublished → 410 Gone)
 *   listHalls   → GET /v1/venues/:id/halls
 */

export interface VenueFilters {
  city?: CityKey;
  /** Only venues free on this ISO date. */
  dateISO?: string;
  /** Only venues that can seat at least this many guests. */
  minGuests?: number;
}

export interface VenueApi {
  listVenues(filters?: VenueFilters): Promise<Venue[]>;
  /** Returns unpublished venues too — the detail screen renders the 410 state. */
  getVenue(id: string): Promise<Venue | undefined>;
  listHalls(venueId: string): Promise<Hall[]>;
}

/** Simulated network latency keeps loading states honest during development. */
const LATENCY_MS = 420;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockVenueApi implements VenueApi {
  async listVenues(filters?: VenueFilters): Promise<Venue[]> {
    await delay(LATENCY_MS);
    let result = VENUES.filter((v) => v.published);
    if (filters?.city) {
      result = result.filter((v) => v.city === filters.city);
    }
    if (filters?.dateISO) {
      const date = filters.dateISO;
      result = result.filter((v) => !v.bookedDates.includes(date));
    }
    if (filters?.minGuests !== undefined) {
      const guests = filters.minGuests;
      result = result.filter((v) => v.capacityMax >= guests);
    }
    return result;
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    await delay(LATENCY_MS / 2);
    // Deep links use the slug (kapar.mk/v/{slug}); ids and slugs both resolve.
    return VENUES.find((v) => v.id === id || v.slug === id);
  }

  async listHalls(venueId: string): Promise<Hall[]> {
    await delay(LATENCY_MS / 2);
    return VENUES.find((v) => v.id === venueId)?.halls ?? [];
  }
}

export const venueApi: VenueApi = new MockVenueApi();
