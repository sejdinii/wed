import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/db/client.js';

/**
 * Notification center (Wave 5) — rows are fanned out by bookings.ts on real
 * events; this suite only exercises the read side (GET /v1/notifications,
 * POST /v1/notifications/read) plus enough of the booking flow to earn a
 * couple of real rows. Mirrors vendor.test.ts's signup/venue helpers.
 */
const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

function uuidDay(): string {
  const u = randomUUID();
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += u.charCodeAt(i);
  return String((sum % 27) + 1).padStart(2, '0');
}

function uniqueEmail(prefix: string): string {
  return `test-notif-${prefix}-${randomUUID()}@example.com`;
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

async function signUpVendorWithPublishedVenue(): Promise<{ token: string; venueId: string }> {
  const token = await signUp(uniqueEmail('vendor'));
  await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: authHeaders(token) });
  const created = await app.inject({
    method: 'POST',
    url: '/v1/vendor/venues',
    headers: authHeaders(token),
    payload: {
      name: 'Notif Test Hall',
      city: 'veles',
      venueType: 'garden',
      capacityMin: 60,
      capacityMax: 250,
      pricePerGuestMkd: 1200,
    },
  });
  const venue = created.json();
  await app.inject({ method: 'POST', url: '/v1/vendor/my-venue/publish', headers: authHeaders(token), payload: { published: true } });
  return { token, venueId: venue.id };
}

/** Books as a signed-in couple (bearer set) so the booking gets a userId and can be notified. */
async function bookAsCouple(coupleToken: string, venueId: string, eventDateISO: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/bookings',
    headers: authHeaders(coupleToken),
    payload: {
      deviceId: `test-${randomUUID()}`,
      venueId,
      eventDateISO,
      guestCount: 90,
      menuTierId: 'classic',
      contactName: 'Notif Test Couple',
      contactPhone: '+38970005555',
    },
  });
}

describe('auth gate', () => {
  it('401s GET with no bearer', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/notifications' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401s GET with a garbage bearer', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/notifications', headers: { authorization: 'Bearer garbage' } });
    expect(res.statusCode).toBe(401);
  });

  it('401s POST /read with no bearer', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/notifications/read' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });
});

describe('a fresh account with no events', () => {
  it('returns an honest empty inbox — never a fabricated row', async () => {
    const token = await signUp(uniqueEmail('empty'));
    const res = await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ unreadCount: 0, items: [] });
  });
});

describe('booking_request fan-out + scoping + booking join', () => {
  it('the venue owner (not a stranger, not the couple) sees the request with joined booking fields', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithPublishedVenue();
    const coupleToken = await signUp(uniqueEmail('couple'));
    const eventDateISO = `2027-03-${uuidDay()}`;
    const booking = (await bookAsCouple(coupleToken, venueId, eventDateISO)).json();

    // The couple gets nothing yet — booking_request only fans out to the vendor.
    const coupleInbox = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(coupleToken) })).json();
    expect(coupleInbox.items.find((i: { bookingId: string }) => i.bookingId === booking.id)).toBeUndefined();

    // A totally unrelated vendor sees nothing either — scoping is per caller, not global.
    const { token: strangerToken } = await signUpVendorWithPublishedVenue();
    const strangerInbox = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(strangerToken) })).json();
    expect(strangerInbox.items).toEqual([]);
    expect(strangerInbox.unreadCount).toBe(0);

    // The venue owner sees exactly one unread booking_request row, newest first, with the booking joined in.
    const vendorInbox = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(vendorToken) })).json();
    expect(vendorInbox.unreadCount).toBe(1);
    expect(vendorInbox.items).toHaveLength(1);
    const row = vendorInbox.items[0];
    expect(row.kind).toBe('booking_request');
    expect(row.bookingId).toBe(booking.id);
    expect(row.readAtISO).toBeUndefined();
    expect(row.booking).toEqual({
      venueName: 'Notif Test Hall',
      contactName: 'Notif Test Couple',
      eventDateISO,
      status: 'pending_kapar',
    });
  });
});

describe('transition fan-out reaches the couple', () => {
  it('confirming the hold notifies the couple (booking_reserved), status reflects the live booking', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithPublishedVenue();
    const coupleToken = await signUp(uniqueEmail('couple2'));
    const eventDateISO = `2027-04-${uuidDay()}`;
    const booking = (await bookAsCouple(coupleToken, venueId, eventDateISO)).json();

    const confirmed = await app.inject({
      method: 'POST',
      url: `/v1/vendor/bookings/${booking.id}/confirm`,
      headers: authHeaders(vendorToken),
    });
    expect(confirmed.statusCode).toBe(200);

    const coupleInbox = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(coupleToken) })).json();
    const reservedRow = coupleInbox.items.find((i: { kind: string }) => i.kind === 'booking_reserved');
    expect(reservedRow).toBeTruthy();
    expect(reservedRow.bookingId).toBe(booking.id);
    expect(reservedRow.booking.status).toBe('reserved');
    expect(coupleInbox.unreadCount).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /v1/notifications/read', () => {
  it('marks only the caller\'s own unread rows; absent ids marks all; a foreign id is silently ignored', async () => {
    const { token: vendorToken, venueId } = await signUpVendorWithPublishedVenue();
    const coupleToken = await signUp(uniqueEmail('couple3'));

    // Two bookings -> two booking_request rows for the vendor.
    const bookingA = (await bookAsCouple(coupleToken, venueId, `2027-05-${uuidDay()}`)).json();
    const bookingB = (await bookAsCouple(coupleToken, venueId, `2027-06-${uuidDay()}`)).json();

    const before = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(vendorToken) })).json();
    expect(before.unreadCount).toBe(2);
    const rowA = before.items.find((i: { bookingId: string }) => i.bookingId === bookingA.id);
    const rowB = before.items.find((i: { bookingId: string }) => i.bookingId === bookingB.id);
    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();

    // Mark just rowA read.
    const markOne = await app.inject({
      method: 'POST',
      url: '/v1/notifications/read',
      headers: authHeaders(vendorToken),
      payload: { ids: [rowA.id] },
    });
    expect(markOne.statusCode).toBe(200);

    const afterOne = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(vendorToken) })).json();
    expect(afterOne.unreadCount).toBe(1);
    expect(afterOne.items.find((i: { id: string }) => i.id === rowA.id).readAtISO).toBeTruthy();
    expect(afterOne.items.find((i: { id: string }) => i.id === rowB.id).readAtISO).toBeUndefined();

    // A stranger can't mark this vendor's remaining row read by guessing its id —
    // the WHERE always pins userId, ids only narrow within the caller's own rows.
    const { token: strangerToken } = await signUpVendorWithPublishedVenue();
    await app.inject({
      method: 'POST',
      url: '/v1/notifications/read',
      headers: authHeaders(strangerToken),
      payload: { ids: [rowB.id] },
    });
    const stillUnread = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(vendorToken) })).json();
    expect(stillUnread.unreadCount).toBe(1);
    expect(stillUnread.items.find((i: { id: string }) => i.id === rowB.id).readAtISO).toBeUndefined();

    // Absent ids = mark ALL of the caller's remaining unread.
    const markAll = await app.inject({ method: 'POST', url: '/v1/notifications/read', headers: authHeaders(vendorToken) });
    expect(markAll.statusCode).toBe(200);
    const afterAllRead = (await app.inject({ method: 'GET', url: '/v1/notifications', headers: authHeaders(vendorToken) })).json();
    expect(afterAllRead.unreadCount).toBe(0);
    expect(afterAllRead.items.every((i: { readAtISO?: string }) => i.readAtISO)).toBe(true);
  });
});
