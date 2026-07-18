import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';
import { notifications } from '../src/db/schema.js';

/**
 * Couple<->vendor chat (Wave 5) against the real (migrated + seeded)
 * database. Mirrors vendor.test.ts's style: unique users per run via
 * randomUUID, a fresh vendor + venue per scenario so booking dates never
 * collide with seeds, other suites, or each other (no Date.now()%n needed —
 * every venue here is brand new, so any fixed date on it is collision-free).
 */
const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

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

async function userId(token: string): Promise<string> {
  const me = (await app.inject({ method: 'GET', url: '/v1/me', headers: authHeaders(token) })).json();
  return me.user.id as string;
}

async function signUpVendorWithVenue(): Promise<{ token: string; venueId: string; ownerUserId: string }> {
  const token = await signUp(`test-msg-vendor-${randomUUID()}@example.com`);
  await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: authHeaders(token) });
  const created = await app.inject({
    method: 'POST',
    url: '/v1/vendor/venues',
    headers: authHeaders(token),
    payload: {
      name: 'Message Test Hall',
      city: 'bitola',
      venueType: 'ballroom',
      capacityMin: 80,
      capacityMax: 300,
      pricePerGuestMkd: 1400,
    },
  });
  const venue = created.json();
  await app.inject({ method: 'POST', url: '/v1/vendor/my-venue/publish', headers: authHeaders(token), payload: { published: true } });
  return { token, venueId: venue.id, ownerUserId: await userId(token) };
}

async function bookVenue(venueId: string, eventDateISO: string, opts: { bearer?: string; deviceId?: string } = {}) {
  const deviceId = opts.deviceId ?? `test-msg-${randomUUID()}`;
  const res = await app.inject({
    method: 'POST',
    url: '/v1/bookings',
    ...(opts.bearer ? { headers: authHeaders(opts.bearer) } : {}),
    payload: {
      deviceId,
      venueId,
      eventDateISO,
      guestCount: 100,
      menuTierId: 'classic',
      contactName: 'Message Test Couple',
      contactPhone: '+38970001234',
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe('GET/POST /v1/bookings/:id/messages (Wave 5 chat)', () => {
  it('404s on a booking that does not exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/bookings/ghost-booking/messages' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('booking_not_found');
  });

  it('authorization matrix: couple bearer OK, vendor owner OK, stranger 403', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithVenue();
    const coupleToken = await signUp(`test-msg-couple-${randomUUID()}@example.com`);
    const strangerToken = await signUp(`test-msg-stranger-${randomUUID()}@example.com`);
    const booking = await bookVenue(venueId, '2028-01-10', { bearer: coupleToken });

    const asCouple = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages`, headers: authHeaders(coupleToken) });
    expect(asCouple.statusCode).toBe(200);
    expect(asCouple.json()).toEqual([]);

    const asVendor = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages`, headers: authHeaders(vendorToken) });
    expect(asVendor.statusCode).toBe(200);

    const asStranger = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages`, headers: authHeaders(strangerToken) });
    expect(asStranger.statusCode).toBe(403);
    expect(asStranger.json().error).toBe('access_denied');

    const noAuthWrongDevice = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages?deviceId=wrong-device` });
    expect(noAuthWrongDevice.statusCode).toBe(403);
  });

  it('device-only couples (no userId) keep chat access via a matching deviceId, same as their booking list', async () => {
    const { venueId } = await signUpVendorWithVenue();
    const deviceId = `test-msg-device-${randomUUID()}`;
    const booking = await bookVenue(venueId, '2028-01-11', { deviceId });

    const ok = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages?deviceId=${deviceId}` });
    expect(ok.statusCode).toBe(200);

    const wrongDevice = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages?deviceId=someone-else` });
    expect(wrongDevice.statusCode).toBe(403);
  });

  it('rejects an empty or whitespace-only body with 400 empty_body', async () => {
    const { venueId } = await signUpVendorWithVenue();
    const coupleToken = await signUp(`test-msg-couple-${randomUUID()}@example.com`);
    const booking = await bookVenue(venueId, '2028-01-12', { bearer: coupleToken });

    const blank = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(coupleToken),
      payload: { body: '   ' },
    });
    expect(blank.statusCode).toBe(400);
    expect(blank.json().error).toBe('empty_body');

    const missing = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(coupleToken),
      payload: {},
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json().error).toBe('empty_body');
  });

  it('trims whitespace and caps the body at 2000 chars', async () => {
    const { venueId } = await signUpVendorWithVenue();
    const coupleToken = await signUp(`test-msg-couple-${randomUUID()}@example.com`);
    const booking = await bookVenue(venueId, '2028-01-13', { bearer: coupleToken });

    const long = '  ' + 'x'.repeat(2500) + '  ';
    const res = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(coupleToken),
      payload: { body: long },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().body).toHaveLength(2000);
  });

  it('a couple message notifies the vendor owner; a vendor reply notifies the couple; senders are never notified about their own message', async () => {
    const { token: vendorToken, venueId, ownerUserId } = await signUpVendorWithVenue();
    const coupleToken = await signUp(`test-msg-couple-${randomUUID()}@example.com`);
    const booking = await bookVenue(venueId, '2028-01-14', { bearer: coupleToken });
    const coupleUserId = await userId(coupleToken);

    const fromCouple = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(coupleToken),
      payload: { body: 'Hi, is the date still free?' },
    });
    expect(fromCouple.statusCode).toBe(201);
    expect(fromCouple.json().senderRole).toBe('couple');

    const vendorNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerUserId), eq(notifications.bookingId, booking.id), eq(notifications.kind, 'message')));
    expect(vendorNotifs).toHaveLength(1);
    const coupleNotifsSoFar = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, coupleUserId), eq(notifications.bookingId, booking.id), eq(notifications.kind, 'message')));
    expect(coupleNotifsSoFar).toHaveLength(0); // the sender never notifies itself

    const fromVendor = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(vendorToken),
      payload: { body: 'Yes! Come by for a visit.' },
    });
    expect(fromVendor.statusCode).toBe(201);
    expect(fromVendor.json().senderRole).toBe('vendor');

    const coupleNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, coupleUserId), eq(notifications.bookingId, booking.id), eq(notifications.kind, 'message')));
    expect(coupleNotifs).toHaveLength(1);
    const vendorNotifsAfter = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerUserId), eq(notifications.bookingId, booking.id), eq(notifications.kind, 'message')));
    expect(vendorNotifsAfter).toHaveLength(1); // unchanged — the vendor's own message didn't notify itself
  });

  it('a vendor message on a device-only booking (no userId) skips the couple-side notification without erroring', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithVenue();
    const deviceId = `test-msg-device-${randomUUID()}`;
    const booking = await bookVenue(venueId, '2028-01-15', { deviceId });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/messages`,
      headers: authHeaders(vendorToken),
      payload: { body: 'Following up on your request.' },
    });
    expect(res.statusCode).toBe(201);

    const messageNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.bookingId, booking.id), eq(notifications.kind, 'message')));
    expect(messageNotifs).toHaveLength(0);
  });

  it('returns the thread oldest-first', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithVenue();
    const coupleToken = await signUp(`test-msg-couple-${randomUUID()}@example.com`);
    const booking = await bookVenue(venueId, '2028-01-16', { bearer: coupleToken });

    const exchanges: { token: string; body: string }[] = [
      { token: coupleToken, body: 'first' },
      { token: vendorToken, body: 'second' },
      { token: coupleToken, body: 'third' },
      { token: vendorToken, body: 'fourth' },
    ];
    for (const ex of exchanges) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${booking.id}/messages`,
        headers: authHeaders(ex.token),
        payload: { body: ex.body },
      });
      expect(res.statusCode).toBe(201);
    }

    const thread = await app.inject({ method: 'GET', url: `/v1/bookings/${booking.id}/messages`, headers: authHeaders(coupleToken) });
    expect(thread.statusCode).toBe(200);
    const list = thread.json();
    expect(list.map((m: { body: string }) => m.body)).toEqual(exchanges.map((e) => e.body));
    expect(list.map((m: { senderRole: string }) => m.senderRole)).toEqual(['couple', 'vendor', 'couple', 'vendor']);
  });
});
