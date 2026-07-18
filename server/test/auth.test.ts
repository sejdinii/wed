import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { pool } from '../src/db/client.js';

/**
 * Auth lifecycle against the real (migrated + seeded) database. Unique email
 * per run (randomUUID) so reruns never collide with prior test users.
 */
const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

function uniqueEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

// Derived from a fresh UUID's char codes (not Date.now()%n) — Date.now()%27
// repeats whenever two runs land in the same millisecond-modulo window (this
// flake has bitten twice), colliding with leftover rows from a prior run.
// Mirrors the pattern bookings.test.ts/vendor.test.ts already use.
function uuidDay(): string {
  const u = randomUUID();
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += u.charCodeAt(i);
  return String((sum % 27) + 1).padStart(2, '0');
}

async function requestCode(destination: string) {
  return app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { channel: 'email', destination } });
}

async function verify(destination: string, code: string, deviceId?: string) {
  return app.inject({ method: 'POST', url: '/v1/auth/verify', payload: { destination, code, deviceId } });
}

describe('POST /v1/auth/request-code', () => {
  it('returns devCode outside production', async () => {
    const res = await requestCode(uniqueEmail());
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.devCode).toMatch(/^\d{6}$/);
  });

  it('rejects a non-email channel', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { channel: 'sms', destination: uniqueEmail() } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unsupported_channel');
  });

  it('rejects a malformed email', async () => {
    const res = await requestCode('not-an-email');
    expect(res.statusCode).toBe(400);
  });

  it('rate-limits after 3 unconsumed codes within the window', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    await requestCode(email);
    await requestCode(email);
    const fourth = await requestCode(email);
    expect(fourth.statusCode).toBe(429);
    expect(fourth.json().error).toBe('too_many_codes');
  });
});

describe('POST /v1/auth/verify', () => {
  it('rejects a wrong code', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const res = await verify(email, '000000');
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('bad_code');
  });

  it('accepts the right code and returns a token + user', async () => {
    const email = uniqueEmail();
    const { devCode } = (await requestCode(email)).json();
    const res = await verify(email, devCode);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toMatch(/^[0-9a-f]{48}$/);
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe('couple');
  });

  it('cannot reuse a consumed code', async () => {
    const email = uniqueEmail();
    const { devCode } = (await requestCode(email)).json();
    const first = await verify(email, devCode);
    expect(first.statusCode).toBe(200);
    const second = await verify(email, devCode);
    expect(second.statusCode).toBe(401);
    expect(second.json().error).toBe('bad_code');
  });
});

describe('GET /v1/me', () => {
  it('round-trips the authenticated user', async () => {
    const email = uniqueEmail();
    const { devCode } = (await requestCode(email)).json();
    const { token } = (await verify(email, devCode)).json();
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
  });

  it('401s on a garbage token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer garbage' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('401s with no Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /v1/me/become-vendor', () => {
  it('flips couple -> both', async () => {
    const email = uniqueEmail();
    const { devCode } = (await requestCode(email)).json();
    const { token } = (await verify(email, devCode)).json();

    const res = await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('both');

    // Idempotent: calling again on an already-'both' user is a no-op.
    const again = await app.inject({ method: 'POST', url: '/v1/me/become-vendor', headers: { authorization: `Bearer ${token}` } });
    expect(again.json().user.role).toBe('both');
  });
});

describe('device-booking claim on verify', () => {
  it('claims device bookings into the account and they show up bearer-only', async () => {
    const deviceId = `test-${randomUUID()}`;
    const email = uniqueEmail();
    const day = uuidDay();

    const created = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        deviceId,
        venueId: 'ezerski-raj',
        eventDateISO: `2027-09-${day}`,
        guestCount: 100,
        menuTierId: 'classic',
        contactName: 'Auth Test',
        contactPhone: '+38970000099',
      },
    });
    expect(created.statusCode).toBe(201);
    const bookingId = created.json().id;

    const { devCode } = (await requestCode(email)).json();
    const { token } = (await verify(email, devCode, deviceId)).json();

    const res = await app.inject({ method: 'GET', url: '/v1/bookings', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const ids = res.json().map((b: { id: string }) => b.id);
    expect(ids).toContain(bookingId);
  });

  it('400s when neither deviceId nor bearer is present', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/bookings' });
    expect(res.statusCode).toBe(400);
  });
});
