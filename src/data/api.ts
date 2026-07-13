import type { CityKey, Hall, Review, Venue } from '@/domain/types';
import { VENUES } from './venues';
import { REVIEWS } from './reviews';

/**
 * Repository boundary between UI and data. Screens depend only on `VenueApi`;
 * swapping `MockVenueApi` for an HTTP client (against the future backend)
 * is a one-line change at the bottom of this file.
 *
 * REST mapping (v0.2 backend):
 *   listVenues  → GET /v1/venues?city=&date=&minGuests=
 *   getVenue    → GET /v1/venues/:id   (unpublished → 410 Gone)
 *   listHalls   → GET /v1/venues/:id/halls
 *   listReviews → GET /v1/venues/:id/reviews
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
  listReviews(venueId: string): Promise<Review[]>;
}

/** Simulated network latency keeps loading states honest during development. */
const LATENCY_MS = 420;

/**
 * DEV switch — the mock can't fail on its own, which would leave every error
 * state unexercisable. Set `globalThis.__KAPAR_API_FAIL__ = true` (in a dev
 * console or test) and every call rejects like a dead network.
 */
function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail()) reject(new Error('Simulated network failure'));
      else resolve();
    }, ms);
  });
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

  async listReviews(venueId: string): Promise<Review[]> {
    await delay(LATENCY_MS / 2);
    return REVIEWS.filter((r) => r.venueId === venueId);
  }
}

import { HttpVenueApi } from './httpApi';

/**
 * Repository selection: set EXPO_PUBLIC_API_URL (e.g. http://localhost:3000)
 * to run against the real server; unset → the on-device mock. Baked at
 * bundle time by Expo's env inlining.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_MODE = Boolean(API_URL);
export const venueApi: VenueApi = API_URL ? new HttpVenueApi(API_URL) : new MockVenueApi();
