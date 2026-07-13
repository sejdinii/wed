import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/db/client.js';

/**
 * Smoke tests against the REAL local database (migrated + seeded) — run
 * `npm run db:migrate && npm run db:seed` first. CI does exactly that.
 */
const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('GET /health', () => {
  it('responds ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe('GET /v1/venues', () => {
  it('serves the seeded catalogue in the domain shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/venues' });
    expect(res.statusCode).toBe(200);
    const venues = res.json();
    expect(venues.length).toBeGreaterThanOrEqual(14);
    const v = venues[0];
    // Domain-shape spot checks — the app consumes this verbatim.
    expect(v).toHaveProperty('kaparPolicy.refundTiers');
    expect(v).toHaveProperty('menuTiers');
    expect(v.halls[0]).toHaveProperty('pricePerGuestAdjMkd');
    expect(v.published).toBe(true);
  });

  it('filters by city', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/venues?city=ohrid' });
    const venues = res.json();
    expect(venues.length).toBeGreaterThan(0);
    for (const v of venues) expect(v.city).toBe('ohrid');
  });

  it('filters out venues booked on a date', async () => {
    const all = (await app.inject({ method: 'GET', url: '/v1/venues' })).json();
    const withBooked = all.find((v: { bookedDates: string[] }) => v.bookedDates.length > 0);
    expect(withBooked).toBeDefined();
    const date = withBooked.bookedDates[0];
    const filtered = (await app.inject({ method: 'GET', url: `/v1/venues?date=${date}` })).json();
    expect(filtered.map((v: { id: string }) => v.id)).not.toContain(withBooked.id);
  });
});

describe('GET /v1/venues/:idOrSlug', () => {
  it('resolves by id and slug, 404s on unknown', async () => {
    const byId = await app.inject({ method: 'GET', url: '/v1/venues/panorama-garden' });
    expect(byId.statusCode).toBe(200);
    expect(byId.json().halls.length).toBeGreaterThan(1);
    const missing = await app.inject({ method: 'GET', url: '/v1/venues/does-not-exist' });
    expect(missing.statusCode).toBe(404);
  });
});

describe('GET /v1/venues/:id/reviews', () => {
  it('serves reviews in the domain shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/venues/panorama-garden/reviews' });
    expect(res.statusCode).toBe(200);
    const reviews = res.json();
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]).toHaveProperty('eventDateISO');
    expect(reviews[0]).toHaveProperty('positive');
  });
});
