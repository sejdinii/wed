import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/db/client.js';

/**
 * Vendor/extranet endpoints against the REAL (migrated + seeded) database.
 * Mirrors auth.test.ts style: unique email per run via randomUUID, sign up
 * through the real auth endpoints, then become-vendor to get the role.
 */
const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

// A date namespace unlikely to collide with seeds or other test files' 2027 range.
const day = String((Date.now() % 27) + 1).padStart(2, '0');

function uniqueEmail(): string {
  return `test-vendor-${randomUUID()}@example.com`;
}

async function signUp(email: string): Promise<string> {
  const { devCode } = (
    await app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { channel: 'email', destination: email } })
  ).json();
  const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { destination: email, code: devCode } })).json();
  return token;
}

async function becomeVendor(token: string): Promise<void> {
  await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: authHeaders(token) });
}

async function signUpVendor(): Promise<string> {
  const token = await signUp(uniqueEmail());
  await becomeVendor(token);
  return token;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

function venueBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Vendor Hall',
    city: 'bitola',
    venueType: 'ballroom',
    capacityMin: 80,
    capacityMax: 300,
    pricePerGuestMkd: 1400,
    address: 'Test address 1',
    phone: '+38970009999',
    description: 'A lovely test hall.',
    ...overrides,
  };
}

async function bookVenue(venueId: string, eventDateISO: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/v1/bookings',
    payload: {
      deviceId: `test-${randomUUID()}`,
      venueId,
      eventDateISO,
      guestCount: 100,
      menuTierId: 'classic',
      contactName: 'Vendor Test Couple',
      contactPhone: '+38970001234',
      ...overrides,
    },
  });
}

describe('vendor role gate', () => {
  it('403s a couple-role account', async () => {
    const token = await signUp(uniqueEmail());
    const res = await app.inject({ method: 'POST', url: '/v1/vendor/venues', headers: authHeaders(token), payload: venueBody() });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('vendor_role_required');
  });

  it('401s with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401s a garbage token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue', headers: { authorization: 'Bearer garbage' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /v1/vendor/my-venue before any venue exists', () => {
  it('404s no_venue', async () => {
    const token = await signUpVendor();
    const res = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue', headers: authHeaders(token) });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('no_venue');
  });
});

describe('POST /v1/vendor/venues', () => {
  it('creates an unpublished venue with a main hall + classic tier, and refuses a second', async () => {
    const token = await signUpVendor();

    const created = await app.inject({ method: 'POST', url: '/v1/vendor/venues', headers: authHeaders(token), payload: venueBody() });
    expect(created.statusCode).toBe(201);
    const venue = created.json();

    expect(venue.published).toBe(false);
    expect(venue.id).toMatch(/^test-vendor-hall-[a-z0-9]{4}$/);
    expect(venue.slug).toBe(venue.id);
    expect(venue.description).toEqual({ mk: 'A lovely test hall.', sq: 'A lovely test hall.', en: 'A lovely test hall.' });
    expect(venue.included).toEqual(['tablesChairs', 'lightingSound', 'parking']);
    expect(venue.foodOptions).toEqual(['traditional']);
    expect(venue.amenities).toEqual([]);
    expect(venue.bookedDates).toEqual([]);
    expect(venue.coords).toEqual({ lat: 41.0328, lng: 21.3347 }); // bitola

    // Kapar tiers must match the platform ladder exactly.
    expect(venue.kaparPolicy).toEqual({
      kind: 'percent',
      percentOfEstimate: 10,
      minAmountMkd: 15000,
      refundTiers: [
        { minDaysBeforeEvent: 90, refundPercent: 100 },
        { minDaysBeforeEvent: 30, refundPercent: 50 },
        { minDaysBeforeEvent: 0, refundPercent: 0 },
      ],
    });

    expect(venue.halls).toHaveLength(1);
    expect(venue.halls[0]).toMatchObject({ id: 'main', capacityMin: 80, capacityMax: 300, indoor: true, pricePerGuestAdjMkd: 0 });
    expect(venue.menuTiers).toHaveLength(1);
    expect(venue.menuTiers[0]).toMatchObject({ id: 'classic', pricePerGuestMkd: 1400 });

    // One venue per owner (MVP).
    const second = await app.inject({
      method: 'POST',
      url: '/v1/vendor/venues',
      headers: authHeaders(token),
      payload: venueBody({ name: 'Another Hall' }),
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toBe('venue_exists');
  });

  it('validates required fields', async () => {
    const token = await signUpVendor();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/vendor/venues',
      headers: authHeaders(token),
      payload: venueBody({ capacityMax: 5 }), // <= capacityMin
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('vendor venue management + calendar', () => {
  it('walks my-venue → patch → publish → block/booking conflicts → calendar → bookings inbox → public augmentation', async () => {
    const token = await signUpVendor();
    const created = (await app.inject({ method: 'POST', url: '/v1/vendor/venues', headers: authHeaders(token), payload: venueBody() })).json();

    // GET my-venue round-trips the same venue.
    const mine = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue', headers: authHeaders(token) });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().id).toBe(created.id);

    // PATCH: name + price follows to the classic tier; capacity follows to the main hall.
    const patched = await app.inject({
      method: 'PATCH',
      url: '/v1/vendor/my-venue',
      headers: authHeaders(token),
      payload: { name: 'Renamed Hall', pricePerGuestMkd: 1600, capacityMin: 90, capacityMax: 320 },
    });
    expect(patched.statusCode).toBe(200);
    const patchedVenue = patched.json();
    expect(patchedVenue.name).toBe('Renamed Hall');
    expect(patchedVenue.menuTiers[0].pricePerGuestMkd).toBe(1600);
    expect(patchedVenue.capacityMin).toBe(90);
    expect(patchedVenue.capacityMax).toBe(320);
    expect(patchedVenue.halls[0].capacityMin).toBe(90);
    expect(patchedVenue.halls[0].capacityMax).toBe(320);

    // Not published yet — absent from the public catalogue.
    const beforePublish = (await app.inject({ method: 'GET', url: '/v1/venues' })).json();
    expect(beforePublish.map((v: { id: string }) => v.id)).not.toContain(created.id);

    // Publish (self-serve MVP) — now appears publicly.
    const published = await app.inject({
      method: 'POST',
      url: '/v1/vendor/my-venue/publish',
      headers: authHeaders(token),
      payload: { published: true },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().published).toBe(true);

    const afterPublish = (await app.inject({ method: 'GET', url: '/v1/venues' })).json();
    expect(afterPublish.map((v: { id: string }) => v.id)).toContain(created.id);

    // Book an open date (within the calendar's default 365-day window), then
    // vendor tries to block that same date -> 409 date_booked.
    const bookedDate = `2027-01-${day}`;
    const bookingRes = await bookVenue(created.id, bookedDate);
    expect(bookingRes.statusCode).toBe(201);
    const bookingId = bookingRes.json().id;

    const blockBookedDate = await app.inject({
      method: 'PUT',
      url: '/v1/vendor/my-venue/blocked-dates',
      headers: authHeaders(token),
      payload: { date: bookedDate, blocked: true },
    });
    expect(blockBookedDate.statusCode).toBe(409);
    expect(blockBookedDate.json().error).toBe('date_booked');

    // Vendor blocks a different, open date; couple booking on it -> 409 date_taken.
    const blockedOnlyDate = `2027-02-${day}`;
    const blockRes = await app.inject({
      method: 'PUT',
      url: '/v1/vendor/my-venue/blocked-dates',
      headers: authHeaders(token),
      payload: { date: blockedOnlyDate, blocked: true },
    });
    expect(blockRes.statusCode).toBe(200);
    expect(blockRes.json().blocked).toContain(blockedOnlyDate);

    const bookOnBlocked = await bookVenue(created.id, blockedOnlyDate);
    expect(bookOnBlocked.statusCode).toBe(409);
    expect(bookOnBlocked.json().error).toBe('date_taken');

    // Blocking is idempotent.
    const reblock = await app.inject({
      method: 'PUT',
      url: '/v1/vendor/my-venue/blocked-dates',
      headers: authHeaders(token),
      payload: { date: blockedOnlyDate, blocked: true },
    });
    expect(reblock.statusCode).toBe(200);

    // Calendar returns both the booking and the block.
    const calendar = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue/calendar', headers: authHeaders(token) });
    expect(calendar.statusCode).toBe(200);
    const cal = calendar.json();
    expect(cal.booked.map((b: { date: string }) => b.date)).toContain(bookedDate);
    expect(cal.booked.find((b: { bookingId: string }) => b.bookingId === bookingId)).toMatchObject({ status: 'pending_kapar', guestCount: 100 });
    expect(cal.blocked).toContain(blockedOnlyDate);

    // Public venue detail's bookedDates is the augmented union (booked + blocked).
    const detail = (await app.inject({ method: 'GET', url: `/v1/venues/${created.id}` })).json();
    expect(detail.bookedDates).toContain(bookedDate);
    expect(detail.bookedDates).toContain(blockedOnlyDate);

    // Bookings inbox: read-only, newest first, domain Booking shape.
    const inbox = await app.inject({ method: 'GET', url: '/v1/vendor/my-venue/bookings', headers: authHeaders(token) });
    expect(inbox.statusCode).toBe(200);
    const inboxList = inbox.json();
    expect(inboxList.map((b: { id: string }) => b.id)).toContain(bookingId);
    expect(inboxList[0].venueName).toBeTruthy();

    // Unblocking removes it from the calendar's blocked list.
    const unblock = await app.inject({
      method: 'PUT',
      url: '/v1/vendor/my-venue/blocked-dates',
      headers: authHeaders(token),
      payload: { date: blockedOnlyDate, blocked: false },
    });
    expect(unblock.statusCode).toBe(200);
    expect(unblock.json().blocked).not.toContain(blockedOnlyDate);
  });
});
