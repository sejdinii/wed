import type { CityKey, Venue } from '@/domain/types';
import { VENUES } from './venues';

/**
 * Repository boundary between UI and data. Screens depend only on `VenueApi`;
 * swapping `MockVenueApi` for an HTTP client (against the future backend)
 * is a one-line change at the bottom of this file.
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
  getVenue(id: string): Promise<Venue | undefined>;
}

/** Simulated network latency keeps loading states honest during development. */
const LATENCY_MS = 420;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockVenueApi implements VenueApi {
  async listVenues(filters?: VenueFilters): Promise<Venue[]> {
    await delay(LATENCY_MS);
    let result = VENUES;
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
    return VENUES.find((v) => v.id === id);
  }
}

export const venueApi: VenueApi = new MockVenueApi();
