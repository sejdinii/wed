import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/db/client.js';

/**
 * Booking lifecycle against the real (migrated + seeded) database. Uses a
 * far-future date namespace per run so reruns never collide with seeds or
 * each other; created rows are cleaned up by cascade when reseeding.
 */
const app = buildApp();
const device = `test-${randomUUID()}`;
const otherDevice = `test-${randomUUID()}`;

// A date very unlikely to collide with seeds; unique per test run. Derived
// from a fresh UUID's char codes (not Date.now()%n) — Date.now()%27 repeats
// whenever two runs land in the same millisecond-modulo window (this flake
// has bitten twice), colliding with leftover rows from a prior run that
// weren't wiped by a reseed. uuidDay() is declared further down this file;
// the function declaration is hoisted, so calling it here at module scope is
// safe.
const day = uuidDay();
const EVENT_DATE = `2027-03-${day}`;

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: device,
    venueId: 'ezerski-raj',
    eventDateISO: EVENT_DATE,
    guestCount: 120,
    menuTierId: 'classic',
    contactName: 'Test Couple',
    contactPhone: '+38970000001',
    ...overrides,
  };
}

async function create(overrides: Record<string, unknown> = {}) {
  return app.inject({ method: 'POST', url: '/v1/bookings', payload: createBody(overrides) });
}

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('POST /v1/bookings', () => {
  it('creates a pending_kapar request with server-computed money', async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.status).toBe('pending_kapar');
    expect(b.kaparMkd).toBeGreaterThan(0);
    expect(b.estimatedTotalMkd).toBeGreaterThan(b.kaparMkd);
    expect(b.balanceDueMkd).toBe(b.estimatedTotalMkd - b.kaparMkd);
    expect(b.confirmationCode).toMatch(/^KPR-/);
    expect(b.timeline).toHaveLength(1);
    expect(b.venueName).toBeTruthy();
  });

  it('REFUSES a second active booking for the same venue+date — even from another device', async () => {
    const res = await create({ deviceId: otherDevice, contactPhone: '+38970000002' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('date_taken');
  });

  it('refuses seeded blocked dates', async () => {
    const venue = (await app.inject({ method: 'GET', url: '/v1/venues/ezerski-raj' })).json();
    if (venue.bookedDates.length === 0) return; // nothing seeded-blocked for this venue
    const res = await create({ eventDateISO: venue.bookedDates[0] });
    expect(res.statusCode).toBe(409);
  });

  it('validates input', async () => {
    expect((await create({ menuTierId: 'nope', eventDateISO: '2027-04-01' })).statusCode).toBe(400);
    expect((await create({ venueId: 'ghost-venue', eventDateISO: '2027-04-01' })).statusCode).toBe(404);
  });
});

describe('lifecycle: confirm → kapar-received → cancel with refund', () => {
  it('walks the full pay-at-visit lifecycle with server-enforced transitions', async () => {
    const id = (await create({ eventDateISO: `2027-05-${day}` })).json().id;

    // Illegal jump: request → kapar-received must 409.
    const illegal = await app.inject({ method: 'POST', url: `/v1/bookings/${id}/kapar-received` });
    expect(illegal.statusCode).toBe(409);

    const reserved = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/confirm` })).json();
    expect(reserved.status).toBe('reserved');
    expect(reserved.payByISO).toBeTruthy();

    const confirmed = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/kapar-received` })).json();
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.kaparPaidAtISO).toBeTruthy();

    // Event is far out (≥90d) → couple cancel refunds 100%, stamped.
    const cancelled = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/cancel`, payload: { by: 'couple' } })).json();
    expect(cancelled.status).toBe('cancelled_by_couple');
    expect(cancelled.refund).toEqual({ percent: 100, amountMkd: confirmed.kaparMkd });
    expect(cancelled.timeline.map((t: { status: string }) => t.status)).toEqual([
      'pending_kapar',
      'reserved',
      'confirmed',
      'cancelled_by_couple',
    ]);
  });

  it('cancellation RELEASES the date — the same venue+date can be booked again', async () => {
    const date = `2027-06-${day}`;
    const first = (await create({ eventDateISO: date })).json();
    expect((await create({ eventDateISO: date, deviceId: otherDevice })).statusCode).toBe(409);

    await app.inject({ method: 'POST', url: `/v1/bookings/${first.id}/cancel`, payload: { by: 'couple' } });

    const retry = await create({ eventDateISO: date, deviceId: otherDevice });
    expect(retry.statusCode).toBe(201);
  });

  it('venue-initiated cancellation always refunds 100% regardless of timing', async () => {
    // Book ~near-term-ish is impossible far out; emulate by walking to confirmed
    // then venue-cancel: percent must be 100 even though ladder would matter for couple.
    const id = (await create({ eventDateISO: `2027-07-${day}` })).json().id;
    await app.inject({ method: 'POST', url: `/v1/bookings/${id}/confirm` });
    const confirmed = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/kapar-received` })).json();
    const cancelled = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/cancel`, payload: { by: 'venue' } })).json();
    expect(cancelled.status).toBe('cancelled_by_venue');
    expect(cancelled.refund.percent).toBe(100);
    expect(cancelled.refund.amountMkd).toBe(confirmed.kaparMkd);
  });

  it('free cancel before kapar carries no refund stamp', async () => {
    const id = (await create({ eventDateISO: `2027-08-${day}` })).json().id;
    const cancelled = (await app.inject({ method: 'POST', url: `/v1/bookings/${id}/cancel`, payload: { by: 'couple' } })).json();
    expect(cancelled.status).toBe('cancelled_by_couple');
    expect(cancelled.refund).toBeUndefined();
  });
});

describe('GET /v1/bookings?deviceId=', () => {
  it('lists only the device’s bookings, newest first', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/bookings?deviceId=${device}` });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list.length).toBeGreaterThanOrEqual(4);
    for (const b of list) expect(b.venueName).toBeTruthy();
    const other = (await app.inject({ method: 'GET', url: `/v1/bookings?deviceId=${otherDevice}` })).json();
    expect(other.length).toBeGreaterThanOrEqual(1);
    expect(other.length).toBeLessThan(list.length + 5);
  });
});

// Shared by every date namespace in this file (top-level EVENT_DATE plus the
// Wave 4 authorization-lockdown dates below) — see the comment on `day`
// above for why Date.now()%27 was retired.
function uuidDay(): string {
  const u = randomUUID();
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += u.charCodeAt(i);
  return String((sum % 27) + 1).padStart(2, '0');
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function signUp(email: string): Promise<string> {
  const { devCode } = (
    await app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { channel: 'email', destination: email } })
  ).json();
  const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { destination: email, code: devCode } })).json();
  return token;
}

/** A real vendor with their own published venue — the "owned venue" half of the lockdown. */
async function signUpVendorWithVenue(): Promise<{ token: string; venueId: string }> {
  const token = await signUp(`test-lockdown-vendor-${randomUUID()}@example.com`);
  await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: authHeaders(token) });
  const created = await app.inject({
    method: 'POST',
    url: '/v1/vendor/venues',
    headers: authHeaders(token),
    payload: {
      name: 'Lockdown Test Hall',
      city: 'bitola',
      venueType: 'ballroom',
      capacityMin: 80,
      capacityMax: 300,
      pricePerGuestMkd: 1400,
    },
  });
  const venue = created.json();
  await app.inject({ method: 'POST', url: '/v1/vendor/my-venue/publish', headers: authHeaders(token), payload: { published: true } });
  return { token, venueId: venue.id };
}

async function bookOn(venueId: string, eventDateISO: string, extra: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/v1/bookings',
    payload: {
      deviceId: `test-lockdown-${randomUUID()}`,
      venueId,
      eventDateISO,
      guestCount: 100,
      menuTierId: 'classic',
      contactName: 'Lockdown Couple',
      contactPhone: '+38970005555',
      ...extra,
    },
  });
}

describe('authorization lockdown (Wave 4)', () => {
  it('403s the legacy /confirm and /kapar-received routes when the venue has a real owner', async () => {
    const { venueId } = await signUpVendorWithVenue();
    const booking = (await bookOn(venueId, `2027-09-${uuidDay()}`)).json();

    const legacyConfirm = await app.inject({ method: 'POST', url: `/v1/bookings/${booking.id}/confirm` });
    expect(legacyConfirm.statusCode).toBe(403);
    expect(legacyConfirm.json().error).toBe('vendor_only');

    const legacyKapar = await app.inject({ method: 'POST', url: `/v1/bookings/${booking.id}/kapar-received` });
    expect(legacyKapar.statusCode).toBe(403);
    expect(legacyKapar.json().error).toBe('vendor_only');
  });

  it('leaves the legacy routes open for ownerless (seeded) venues — the demo bot keeps working', async () => {
    // Month 11 on ezerski-raj: 03–08 are claimed above in this file, 09 is
    // claimed by auth.test.ts's device-claim test — pick a month nothing else touches.
    const booking = (await create({ eventDateISO: `2027-11-${uuidDay()}` })).json();
    const confirmed = await app.inject({ method: 'POST', url: `/v1/bookings/${booking.id}/confirm` });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json().status).toBe('reserved');
  });

  it('requires the owning couple’s bearer to cancel a user-owned booking (401 then 403 then 200)', async () => {
    const token = await signUp(`test-lockdown-couple-${randomUUID()}@example.com`);
    // Bearer present at creation time stamps userId on the new row (see POST /v1/bookings).
    const withAuth = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: authHeaders(token),
      payload: {
        deviceId: `test-lockdown-${randomUUID()}`,
        venueId: 'ezerski-raj',
        eventDateISO: `2027-10-${uuidDay()}`,
        guestCount: 100,
        menuTierId: 'classic',
        contactName: 'Lockdown Couple',
        contactPhone: '+38970005556',
      },
    });
    expect(withAuth.statusCode).toBe(201);
    const owned = withAuth.json();

    const noAuth = await app.inject({ method: 'POST', url: `/v1/bookings/${owned.id}/cancel` });
    expect(noAuth.statusCode).toBe(401);
    expect(noAuth.json().error).toBe('auth_required');

    const otherToken = await signUp(`test-lockdown-other-${randomUUID()}@example.com`);
    const wrongUser = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${owned.id}/cancel`,
      headers: authHeaders(otherToken),
    });
    expect(wrongUser.statusCode).toBe(403);
    expect(wrongUser.json().error).toBe('not_your_booking');

    const cancelled = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${owned.id}/cancel`,
      headers: authHeaders(token),
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().status).toBe('cancelled_by_couple');
  });

  it('venue-cancel on an owned venue requires the owner’s bearer too', async () => {
    const { token, venueId } = await signUpVendorWithVenue();
    const booking = (await bookOn(venueId, `2027-10-${uuidDay()}`)).json();

    const noAuth = await app.inject({ method: 'POST', url: `/v1/bookings/${booking.id}/cancel`, payload: { by: 'venue' } });
    expect(noAuth.statusCode).toBe(403);
    expect(noAuth.json().error).toBe('vendor_only');

    const withOwner = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/cancel`,
      headers: authHeaders(token),
      payload: { by: 'venue' },
    });
    expect(withOwner.statusCode).toBe(200);
    expect(withOwner.json().status).toBe('cancelled_by_venue');
  });
});
