import { PLATFORM_REFUND_TIERS, type Booking, type CityKey, type Venue, type VenueType } from '@kapar/domain';

import { API_MODE, API_URL } from './api';
import { usePreferences } from '@/stores/preferences';

export class VenueExistsError extends Error {
  constructor() {
    super('venue_exists');
    this.name = 'VenueExistsError';
  }
}

export class DateBookedError extends Error {
  constructor() {
    super('date_booked');
    this.name = 'DateBookedError';
  }
}

export interface VendorVenueInput {
  name: string;
  city: CityKey;
  venueType: VenueType;
  capacityMin: number;
  capacityMax: number;
  pricePerGuestMkd: number;
  address?: string;
  phone?: string;
  description?: string;
}

export interface VendorVenuePatch {
  name?: string;
  description?: Partial<Record<'mk' | 'sq' | 'en', string>>;
  address?: string;
  phone?: string;
  venueType?: VenueType;
  capacityMin?: number;
  capacityMax?: number;
  pricePerGuestMkd?: number;
}

export interface VendorCalendar {
  booked: { date: string; bookingId: string; status: string; contactName: string; guestCount: number }[];
  blocked: string[];
}

/** The vendor's extranet repository boundary (Wave 3). */
export interface VendorApi {
  createVenue(input: VendorVenueInput): Promise<Venue>;
  /** undefined = this vendor has no listing yet. */
  myVenue(): Promise<Venue | undefined>;
  updateVenue(patch: VendorVenuePatch): Promise<Venue>;
  setPublished(published: boolean): Promise<Venue>;
  calendar(fromISO?: string, toISO?: string): Promise<VendorCalendar>;
  setBlocked(dateISO: string, blocked: boolean): Promise<VendorCalendar>;
  bookings(): Promise<Booking[]>;
}

function authHeaders(): Record<string, string> {
  const token = usePreferences.getState().authToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

class HttpVendorApi implements VendorApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ status: number; body: T }> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...authHeaders(),
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    return { status: res.status, body: (await res.json().catch(() => undefined)) as T };
  }

  async createVenue(input: VendorVenueInput): Promise<Venue> {
    const { status, body } = await this.request<Venue>('/v1/vendor/venues', { method: 'POST', body: input });
    if (status === 409) throw new VenueExistsError();
    if (status !== 201) throw new Error(`createVenue failed: ${status}`);
    return body;
  }

  async myVenue(): Promise<Venue | undefined> {
    const { status, body } = await this.request<Venue>('/v1/vendor/my-venue');
    if (status === 404) return undefined;
    if (status !== 200) throw new Error(`myVenue failed: ${status}`);
    return body;
  }

  async updateVenue(patch: VendorVenuePatch): Promise<Venue> {
    const { status, body } = await this.request<Venue>('/v1/vendor/my-venue', { method: 'PATCH', body: patch });
    if (status !== 200) throw new Error(`updateVenue failed: ${status}`);
    return body;
  }

  async setPublished(published: boolean): Promise<Venue> {
    const { status, body } = await this.request<Venue>('/v1/vendor/my-venue/publish', { method: 'POST', body: { published } });
    if (status !== 200) throw new Error(`setPublished failed: ${status}`);
    return body;
  }

  async calendar(fromISO?: string, toISO?: string): Promise<VendorCalendar> {
    const params = new URLSearchParams();
    if (fromISO) params.set('from', fromISO);
    if (toISO) params.set('to', toISO);
    const qs = params.toString();
    const { status, body } = await this.request<VendorCalendar>(`/v1/vendor/my-venue/calendar${qs ? `?${qs}` : ''}`);
    if (status !== 200) throw new Error(`calendar failed: ${status}`);
    return body;
  }

  async setBlocked(dateISO: string, blocked: boolean): Promise<VendorCalendar> {
    const { status, body } = await this.request<VendorCalendar>('/v1/vendor/my-venue/blocked-dates', {
      method: 'PUT',
      body: { date: dateISO, blocked },
    });
    if (status === 409) throw new DateBookedError();
    if (status !== 200) throw new Error(`setBlocked failed: ${status}`);
    return body;
  }

  async bookings(): Promise<Booking[]> {
    const { status, body } = await this.request<Booking[]>('/v1/vendor/my-venue/bookings');
    if (status !== 200) throw new Error(`vendor bookings failed: ${status}`);
    return body;
  }
}

/**
 * Offline demo vendor — a single in-memory venue so Business mode is
 * demonstrable without the server. Deliberately minimal; resets with the JS
 * context (matches the offline demo's other limits).
 */
class MockVendorApi implements VendorApi {
  private venue: Venue | undefined;
  private blocked = new Set<string>();

  async createVenue(input: VendorVenueInput): Promise<Venue> {
    if (this.venue) throw new VenueExistsError();
    const locales = { mk: input.description ?? '', sq: input.description ?? '', en: input.description ?? '' };
    this.venue = {
      id: `my-${Date.now().toString(36)}`,
      slug: `my-${Date.now().toString(36)}`,
      published: false,
      name: input.name,
      city: input.city,
      venueType: input.venueType,
      halls: [
        {
          id: 'main',
          name: { mk: 'Главна сала', sq: 'Salla kryesore', en: 'Main Hall' },
          capacityMin: input.capacityMin,
          capacityMax: input.capacityMax,
          indoor: input.venueType === 'ballroom' || input.venueType === 'restaurant',
          areaM2: Math.max(120, Math.round(input.capacityMax * 1.1)),
          pricePerGuestAdjMkd: 0,
        },
      ],
      included: ['tablesChairs', 'lightingSound', 'parking'],
      scores: { food: 0, service: 0, organization: 0, location: 0, value: 0 },
      houseRules: { musicUntil: '01:00', fireworksAllowed: false, ownAlcoholAllowed: false, ownDecorAllowed: false },
      foodOptions: ['traditional'],
      coords: { lat: 41.9981, lng: 21.4254 },
      nearby: [],
      address: input.address ?? '',
      phone: input.phone ?? '',
      photos: [],
      capacityMin: input.capacityMin,
      capacityMax: input.capacityMax,
      menuTiers: [
        {
          id: 'classic',
          name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
          description: { mk: '', sq: '', en: '' },
          pricePerGuestMkd: input.pricePerGuestMkd,
        },
      ],
      amenities: [],
      description: locales,
      rating: 0,
      reviewCount: 0,
      verified: false,
      responseTimeHours: 24,
      featured: false,
      kaparPolicy: { kind: 'percent', percentOfEstimate: 10, minAmountMkd: 15_000, refundTiers: [...PLATFORM_REFUND_TIERS] },
      bookedDates: [],
    };
    return this.venue;
  }

  async myVenue(): Promise<Venue | undefined> {
    return this.venue;
  }

  async updateVenue(patch: VendorVenuePatch): Promise<Venue> {
    if (!this.venue) throw new Error('no venue');
    this.venue = {
      ...this.venue,
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.venueType ? { venueType: patch.venueType } : {}),
      ...(patch.capacityMin ? { capacityMin: patch.capacityMin } : {}),
      ...(patch.capacityMax ? { capacityMax: patch.capacityMax } : {}),
      description: { ...this.venue.description, ...patch.description },
    };
    return this.venue;
  }

  async setPublished(published: boolean): Promise<Venue> {
    if (!this.venue) throw new Error('no venue');
    this.venue = { ...this.venue, published };
    return this.venue;
  }

  async calendar(): Promise<VendorCalendar> {
    return { booked: [], blocked: [...this.blocked] };
  }

  async setBlocked(dateISO: string, blocked: boolean): Promise<VendorCalendar> {
    if (blocked) this.blocked.add(dateISO);
    else this.blocked.delete(dateISO);
    return this.calendar();
  }

  async bookings(): Promise<Booking[]> {
    return [];
  }
}

export const vendorApi: VendorApi = API_MODE ? new HttpVendorApi(API_URL as string) : new MockVendorApi();
