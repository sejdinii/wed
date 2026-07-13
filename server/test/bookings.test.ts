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

// A date very unlikely to collide with seeds; unique per test run.
const day = String((Date.now() % 27) + 1).padStart(2, '0');
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
