import {
  PLATFORM_REFUND_TIERS,
  addDaysISO,
  canTransition,
  estimateTotalMkd,
  kaparAmountMkd,
  kaparPayByISO,
  makeConfirmationCode,
  todayISO,
  type Booking,
  type BookingStatus,
  type CityKey,
  type Venue,
  type VenueType,
} from '@kapar/domain';

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

/** Thrown when a requested status change is illegal for the booking's current status (HTTP 409). */
export class TransitionError extends Error {
  constructor() {
    super('illegal_transition');
    this.name = 'TransitionError';
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
  /** pending_kapar → reserved; stamps payByISO (+7d, capped at the event date). 409 → TransitionError. */
  confirmBooking(bookingId: string): Promise<Booking>;
  /** pending_kapar → cancelled_by_venue; nothing was paid yet, so no refund is stamped. 409 → TransitionError. */
  declineBooking(bookingId: string, reason?: string): Promise<Booking>;
  /** reserved → confirmed; stamps kaparPaidAtISO. 409 → TransitionError. */
  markKaparReceived(bookingId: string): Promise<Booking>;
  /** venue-initiated cancel; always 100% refund per the state machine. 409 → TransitionError. */
  cancelBooking(bookingId: string, reason?: string): Promise<Booking>;
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

  async confirmBooking(bookingId: string): Promise<Booking> {
    const { status, body } = await this.request<Booking>(`/v1/vendor/bookings/${bookingId}/confirm`, { method: 'POST' });
    if (status === 409) throw new TransitionError();
    if (status !== 200) throw new Error(`confirmBooking failed: ${status}`);
    return body;
  }

  async declineBooking(bookingId: string, reason?: string): Promise<Booking> {
    const { status, body } = await this.request<Booking>(`/v1/vendor/bookings/${bookingId}/decline`, {
      method: 'POST',
      ...(reason ? { body: { reason } } : {}),
    });
    if (status === 409) throw new TransitionError();
    if (status !== 200) throw new Error(`declineBooking failed: ${status}`);
    return body;
  }

  async markKaparReceived(bookingId: string): Promise<Booking> {
    const { status, body } = await this.request<Booking>(`/v1/vendor/bookings/${bookingId}/kapar-received`, { method: 'POST' });
    if (status === 409) throw new TransitionError();
    if (status !== 200) throw new Error(`markKaparReceived failed: ${status}`);
    return body;
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const { status, body } = await this.request<Booking>(`/v1/vendor/bookings/${bookingId}/cancel`, {
      method: 'POST',
      ...(reason ? { body: { reason } } : {}),
    });
    if (status === 409) throw new TransitionError();
    if (status !== 200) throw new Error(`cancelBooking failed: ${status}`);
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
  /** Mock-only fiction: a single demo request so Business mode's inbox is demonstrable offline. */
  private demoBookings: Booking[] = [];

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

  /** Mock-only fiction: seeds one pending_kapar demo request the first time a venue exists. */
  private seedDemoBookingIfNeeded(): void {
    if (!this.venue || this.demoBookings.length > 0) return;
    const tier = this.venue.menuTiers[0];
    if (!tier) return;
    const guestCount = Math.max(this.venue.capacityMin, Math.min(this.venue.capacityMax, 120));
    const eventDateISO = addDaysISO(todayISO(), 45);
    const estimatedTotalMkd = estimateTotalMkd(this.venue, tier.id, guestCount);
    const kaparMkd = kaparAmountMkd(this.venue.kaparPolicy, estimatedTotalMkd);
    const createdAtISO = new Date().toISOString();
    this.demoBookings.push({
      id: `demo-${Date.now().toString(36)}`,
      confirmationCode: makeConfirmationCode(),
      venueId: this.venue.id,
      venueName: this.venue.name,
      venuePhoto: this.venue.photos[0] ?? '',
      city: this.venue.city,
      eventDateISO,
      guestCount,
      menuTierId: tier.id,
      estimatedTotalMkd,
      kaparMkd,
      balanceDueMkd: estimatedTotalMkd - kaparMkd,
      status: 'pending_kapar',
      createdAtISO,
      timeline: [{ status: 'pending_kapar', at: createdAtISO }],
      // Demo data — no real couple is attached to this request.
      contactName: 'Ана и Стефан',
      contactPhone: '070 000 000',
      hallName: this.venue.halls[0]?.name.mk,
    });
  }

  async bookings(): Promise<Booking[]> {
    this.seedDemoBookingIfNeeded();
    return this.demoBookings;
  }

  private transition(bookingId: string, to: BookingStatus, extra?: Partial<Booking>): Booking {
    const idx = this.demoBookings.findIndex((b) => b.id === bookingId);
    const current = idx >= 0 ? this.demoBookings[idx] : undefined;
    if (!current) throw new Error(`booking not found: ${bookingId}`);
    if (!canTransition(current.status, to)) throw new TransitionError();
    const nowISO = new Date().toISOString();
    const updated = {
      ...current,
      ...extra,
      status: to,
      timeline: [...current.timeline, { status: to, at: nowISO }],
    } as Booking;
    this.demoBookings[idx] = updated;
    return updated;
  }

  async confirmBooking(bookingId: string): Promise<Booking> {
    const current = this.demoBookings.find((b) => b.id === bookingId);
    if (!current) throw new Error(`booking not found: ${bookingId}`);
    const nowISO = new Date().toISOString();
    return this.transition(bookingId, 'reserved', { payByISO: kaparPayByISO(nowISO, current.eventDateISO) });
  }

  async declineBooking(bookingId: string, reason?: string): Promise<Booking> {
    return this.transition(bookingId, 'cancelled_by_venue', { cancelReason: reason });
  }

  async markKaparReceived(bookingId: string): Promise<Booking> {
    return this.transition(bookingId, 'confirmed', { kaparPaidAtISO: new Date().toISOString() });
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const current = this.demoBookings.find((b) => b.id === bookingId);
    if (!current) throw new Error(`booking not found: ${bookingId}`);
    return this.transition(bookingId, 'cancelled_by_venue', {
      cancelReason: reason,
      refund: { percent: 100, amountMkd: current.kaparMkd },
    });
  }
}

export const vendorApi: VendorApi = API_MODE ? new HttpVendorApi(API_URL as string) : new MockVendorApi();
