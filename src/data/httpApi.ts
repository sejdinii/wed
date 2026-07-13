import type { Hall, Review, Venue } from '@kapar/domain';

import type { VenueApi, VenueFilters } from './api';

/**
 * HTTP implementation of the repository boundary, against the Kapar server
 * (server/). Selected in src/data/api.ts when EXPO_PUBLIC_API_URL is set;
 * MockVenueApi remains the offline/dev fallback.
 *
 * Honors the same dev switch as the mock (`globalThis.__KAPAR_API_FAIL__`)
 * so every screen's error state stays drivable without killing the server.
 */

function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

export class HttpVenueApi implements VenueApi {
  constructor(private readonly baseUrl: string) {}

  private async get<T>(path: string): Promise<T> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
    return (await res.json()) as T;
  }

  async listVenues(filters?: VenueFilters): Promise<Venue[]> {
    const params = new URLSearchParams();
    if (filters?.city) params.set('city', filters.city);
    if (filters?.dateISO) params.set('date', filters.dateISO);
    if (filters?.minGuests !== undefined) params.set('minGuests', String(filters.minGuests));
    const qs = params.toString();
    return this.get<Venue[]>(`/v1/venues${qs ? `?${qs}` : ''}`);
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const res = await fetch(`${this.baseUrl}/v1/venues/${encodeURIComponent(id)}`);
    if (res.status === 404) return undefined; // VenueApi contract: unknown → undefined
    if (!res.ok) throw new Error(`API ${res.status} on /v1/venues/${id}`);
    return (await res.json()) as Venue;
  }

  async listHalls(venueId: string): Promise<Hall[]> {
    return this.get<Hall[]>(`/v1/venues/${encodeURIComponent(venueId)}/halls`);
  }

  async listReviews(venueId: string): Promise<Review[]> {
    return this.get<Review[]>(`/v1/venues/${encodeURIComponent(venueId)}/reviews`);
  }
}
