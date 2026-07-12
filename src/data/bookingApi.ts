import {
  estimateTotalMkd,
  kaparAmountMkd,
  makeConfirmationCode,
  refundAmountFor,
  refundPercentFor,
  type Booking,
  type Venue,
} from '@kapar/domain';

import { API_MODE, API_URL, venueApi } from './api';
import { simulateVenueSide } from './venueBot';
import { getDeviceId } from '@/lib/deviceId';
import { useBookings } from '@/stores/bookings';

/** The venue+date is already held by someone else (server 409). */
export class DateTakenError extends Error {
  constructor() {
    super('date_taken');
    this.name = 'DateTakenError';
  }
}

export interface CreateBookingInput {
  venue: Venue;
  eventDateISO: string;
  guestCount: number;
  menuTierId: string;
  hallId?: string | null;
  contactName: string;
  contactPhone: string;
  specialRequests?: string;
  /** Display name of the booked hall, resolved by the caller's locale. */
  hallName?: string;
}

/**
 * Repository boundary for bookings. Http talks to the Kapar server (which
 * owns the state machine, pricing, and the double-booking guard); Mock keeps
 * the fully-offline demo working against the local store + venueBot.
 */
export interface BookingApi {
  create(input: CreateBookingInput): Promise<Booking>;
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | undefined>;
  /** Couple-initiated cancellation. */
  cancel(id: string): Promise<Booking | undefined>;
}

function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

class HttpBookingApi implements BookingApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'content-type': 'application/json' },
      ...init,
    });
    const body = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
    return { status: res.status, body };
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    const deviceId = await getDeviceId();
    const { status, body } = await this.request<Booking & { error?: string }>('/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        venueId: input.venue.id,
        eventDateISO: input.eventDateISO,
        guestCount: input.guestCount,
        menuTierId: input.menuTierId,
        hallId: input.hallId ?? undefined,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        specialRequests: input.specialRequests,
      }),
    });
    if (status === 409) throw new DateTakenError();
    if (status !== 201) throw new Error(`create booking failed: ${status}`);
    return body;
  }

  async list(): Promise<Booking[]> {
    const deviceId = await getDeviceId();
    const { status, body } = await this.request<Booking[]>(`/v1/bookings?deviceId=${encodeURIComponent(deviceId)}`);
    if (status !== 200) throw new Error(`list bookings failed: ${status}`);
    return body;
  }

  async get(id: string): Promise<Booking | undefined> {
    const { status, body } = await this.request<Booking>(`/v1/bookings/${encodeURIComponent(id)}`);
    if (status === 404) return undefined;
    if (status !== 200) throw new Error(`get booking failed: ${status}`);
    return body;
  }

  async cancel(id: string): Promise<Booking | undefined> {
    const { status, body } = await this.request<Booking>(`/v1/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ by: 'couple' }),
    });
    if (status === 404) return undefined;
    if (status !== 200) throw new Error(`cancel booking failed: ${status}`);
    return body;
  }
}

/** Offline demo path — the pre-Wave-1 behavior, unchanged. */
class MockBookingApi implements BookingApi {
  async create(input: CreateBookingInput): Promise<Booking> {
    const { venue } = input;
    const estimate = estimateTotalMkd(venue, input.menuTierId, input.guestCount, input.hallId);
    const kapar = kaparAmountMkd(venue.kaparPolicy, estimate);
    const now = new Date().toISOString();
    const booking: Booking = {
      id: `bk_${Date.now().toString(36)}`,
      confirmationCode: makeConfirmationCode(),
      venueId: venue.id,
      venueName: venue.name,
      venuePhoto: venue.photos[0] ?? '',
      city: venue.city,
      eventDateISO: input.eventDateISO,
      guestCount: input.guestCount,
      menuTierId: input.menuTierId,
      estimatedTotalMkd: estimate,
      kaparMkd: kapar,
      balanceDueMkd: Math.max(0, estimate - kapar),
      status: 'pending_kapar',
      createdAtISO: now,
      timeline: [{ status: 'pending_kapar', at: now }],
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      ...(input.specialRequests ? { specialRequests: input.specialRequests } : {}),
      ...(input.hallName ? { hallName: input.hallName } : {}),
    };
    useBookings.getState().addBooking(booking);
    simulateVenueSide(booking.id, venue.name, booking.eventDateISO);
    return booking;
  }

  async list(): Promise<Booking[]> {
    return useBookings.getState().bookings;
  }

  async get(id: string): Promise<Booking | undefined> {
    return useBookings.getState().bookings.find((b) => b.id === id);
  }

  async cancel(id: string): Promise<Booking | undefined> {
    const booking = useBookings.getState().bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    const now = new Date().toISOString();
    let patch: Partial<Booking> | undefined;
    if (booking.kaparPaidAtISO) {
      const venue = await venueApi.getVenue(booking.venueId);
      if (venue) {
        const percent = refundPercentFor(venue.kaparPolicy, booking.eventDateISO, now, booking.kaparPaidAtISO);
        patch = { refund: { percent, amountMkd: refundAmountFor(booking, venue.kaparPolicy, now) } };
      }
    }
    useBookings.getState().transition(id, 'cancelled_by_couple', now, patch);
    return useBookings.getState().bookings.find((b) => b.id === id);
  }
}

export const bookingApi: BookingApi = API_MODE ? new HttpBookingApi(API_URL as string) : new MockBookingApi();
