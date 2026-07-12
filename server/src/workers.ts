import { kaparPayByISO } from '@kapar/domain';
import { and, eq, lt, sql } from 'drizzle-orm';

import { db } from './db/client.js';
import { bookingEvents, bookings } from './db/schema.js';

/**
 * Lifecycle worker — the server-side replacement for the app's on-launch
 * sweep. Restart-safe by construction: state lives in Postgres, the worker
 * just applies the same rules `lifecycleTransitionFor` encodes, in SQL.
 *   pending_kapar older than 24h            → expired
 *   reserved past its pay_by date           → expired
 *   confirmed past its event date           → completed
 */
export function startLifecycleWorker(intervalMs = 30_000): NodeJS.Timeout {
  const tick = async () => {
    const sweeps: { where: ReturnType<typeof and>; to: string }[] = [
      { where: and(eq(bookings.status, 'pending_kapar'), lt(bookings.createdAt, sql`now() - interval '24 hours'`)), to: 'expired' },
      { where: and(eq(bookings.status, 'reserved'), lt(bookings.payBy, sql`CURRENT_DATE`)), to: 'expired' },
      { where: and(eq(bookings.status, 'confirmed'), lt(bookings.eventDate, sql`CURRENT_DATE`)), to: 'completed' },
    ];
    for (const { where, to } of sweeps) {
      const moved = await db.update(bookings).set({ status: to }).where(where).returning({ id: bookings.id });
      if (moved.length) {
        await db.insert(bookingEvents).values(moved.map((m) => ({ bookingId: m.id, status: to })));
      }
    }
  };
  void tick();
  return setInterval(() => void tick().catch((e) => console.error('lifecycle worker:', e)), intervalMs);
}

/**
 * DEMO venue bot — server-side, restart-safe successor to the app's
 * setTimeout venueBot (compressed demo timescale; real venues replace this in
 * Wave 4): confirms holds ~20s after the request, marks the kapar received
 * ~50s after the hold. Runs unless DEMO_MODE=false or production.
 */
export function startDemoVenueBot(intervalMs = 5_000): NodeJS.Timeout {
  const tick = async () => {
    // Requests older than 20s → venue confirms the hold (payBy = +7 days).
    const pending = await db
      .select({ id: bookings.id, eventDate: bookings.eventDate })
      .from(bookings)
      .where(and(eq(bookings.status, 'pending_kapar'), lt(bookings.createdAt, sql`now() - interval '20 seconds'`)));
    for (const row of pending) {
      await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: 'reserved', payBy: kaparPayByISO(new Date().toISOString(), row.eventDate) })
          .where(and(eq(bookings.id, row.id), eq(bookings.status, 'pending_kapar')));
        await tx.insert(bookingEvents).values({ bookingId: row.id, status: 'reserved' });
      });
    }

    // Holds whose reservation event is older than 50s → kapar received.
    const held = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'reserved'),
          sql`(SELECT max(at) FROM booking_events e WHERE e.booking_id = ${bookings.id} AND e.status = 'reserved') < now() - interval '50 seconds'`,
        ),
      );
    for (const row of held) {
      await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: 'confirmed', kaparPaidAt: new Date() })
          .where(and(eq(bookings.id, row.id), eq(bookings.status, 'reserved')));
        await tx.insert(bookingEvents).values({ bookingId: row.id, status: 'confirmed' });
      });
    }
  };
  return setInterval(() => void tick().catch((e) => console.error('demo bot:', e)), intervalMs);
}
