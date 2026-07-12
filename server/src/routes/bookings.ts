import {
  canTransition,
  estimateTotalMkd,
  kaparAmountMkd,
  kaparPayByISO,
  makeConfirmationCode,
  refundPercentFor,
  type Booking,
  type BookingStatus,
} from '@kapar/domain';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '../db/client.js';
import { bookingEvents, bookings, halls, menuTiers, venues } from '../db/schema.js';

type BookingRow = typeof bookings.$inferSelect;
type EventRow = typeof bookingEvents.$inferSelect;
type VenueRow = typeof venues.$inferSelect;

/** Postgres unique-violation on the one-active-booking-per-venue-date index. */
const UNIQUE_VIOLATION = '23505';

/** Drizzle wraps pg errors (DrizzleQueryError.cause) — walk the chain. */
function isUniqueViolation(err: unknown): boolean {
  let e = err as { code?: string; cause?: unknown } | undefined;
  for (let depth = 0; e && depth < 5; depth++) {
    if (e.code === UNIQUE_VIOLATION) return true;
    e = e.cause as { code?: string; cause?: unknown } | undefined;
  }
  return false;
}

function toBooking(row: BookingRow, events: EventRow[], venue: Pick<VenueRow, 'name' | 'photos' | 'city'>, hallName?: string): Booking {
  return {
    id: row.id,
    confirmationCode: row.confirmationCode,
    venueId: row.venueId,
    venueName: venue.name,
    venuePhoto: venue.photos[0] ?? '',
    city: venue.city as Booking['city'],
    eventDateISO: row.eventDate,
    guestCount: row.guestCount,
    menuTierId: row.menuTierId,
    estimatedTotalMkd: row.estimatedTotalMkd,
    kaparMkd: row.kaparMkd,
    balanceDueMkd: row.balanceDueMkd,
    status: row.status as BookingStatus,
    createdAtISO: row.createdAt.toISOString(),
    ...(row.payBy ? { payByISO: row.payBy } : {}),
    ...(row.kaparPaidAt ? { kaparPaidAtISO: row.kaparPaidAt.toISOString() } : {}),
    ...(row.refundPercent !== null && row.refundAmountMkd !== null
      ? { refund: { percent: row.refundPercent, amountMkd: row.refundAmountMkd } }
      : {}),
    timeline: events
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((e) => ({ status: e.status as BookingStatus, at: e.at.toISOString() })),
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    ...(row.specialRequests ? { specialRequests: row.specialRequests } : {}),
    ...(hallName ? { hallName } : {}),
  };
}

async function loadBooking(id: string): Promise<Booking | undefined> {
  const row = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1).then((r) => r[0]);
  if (!row) return undefined;
  const [events, venue] = await Promise.all([
    db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, id)),
    db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]),
  ]);
  if (!venue) return undefined;
  let hallName: string | undefined;
  if (row.hallId) {
    const hall = await db
      .select()
      .from(halls)
      .where(and(eq(halls.venueId, row.venueId), eq(halls.id, row.hallId)))
      .limit(1)
      .then((r) => r[0]);
    // Wave 1 has no per-request locale; hallName is stored display copy in mk.
    hallName = hall?.name.mk;
  }
  return toBooking(row, events, venue, hallName);
}

/**
 * The transition writer — THE only way a booking changes state. Enforces the
 * domain state machine and appends the audit event in one transaction.
 */
async function applyTransition(
  id: string,
  to: BookingStatus,
  patch: Partial<typeof bookings.$inferInsert> = {},
): Promise<{ ok: true } | { ok: false; code: number; error: string }> {
  return db.transaction(async (tx) => {
    const row = await tx.select().from(bookings).where(eq(bookings.id, id)).limit(1).then((r) => r[0]);
    if (!row) return { ok: false as const, code: 404, error: 'booking_not_found' };
    if (!canTransition(row.status as BookingStatus, to)) {
      return { ok: false as const, code: 409, error: `illegal_transition:${row.status}->${to}` };
    }
    await tx.update(bookings).set({ ...patch, status: to }).where(eq(bookings.id, id));
    await tx.insert(bookingEvents).values({ bookingId: id, status: to });
    return { ok: true as const };
  });
}

interface CreateBody {
  deviceId: string;
  venueId: string;
  eventDateISO: string;
  guestCount: number;
  menuTierId: string;
  hallId?: string;
  contactName: string;
  contactPhone: string;
  specialRequests?: string;
}

export async function bookingRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateBody }>('/v1/bookings', async (req, reply) => {
    const b = req.body;
    if (!b?.deviceId || !b.venueId || !b.eventDateISO || !b.guestCount || !b.menuTierId || !b.contactName || !b.contactPhone) {
      return reply.code(400).send({ error: 'missing_fields' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.eventDateISO)) return reply.code(400).send({ error: 'bad_date' });

    const venueRow = await db.select().from(venues).where(eq(venues.id, b.venueId)).limit(1).then((r) => r[0]);
    if (!venueRow || !venueRow.published) return reply.code(404).send({ error: 'venue_not_found' });
    // Seeded blocks (legacy bookedDates) still count until Wave 3 gives venues
    // a real availability editor.
    if (venueRow.bookedDates.includes(b.eventDateISO)) return reply.code(409).send({ error: 'date_taken' });

    const [hallRows, tierRows] = await Promise.all([
      db.select().from(halls).where(eq(halls.venueId, b.venueId)),
      db.select().from(menuTiers).where(eq(menuTiers.venueId, b.venueId)),
    ]);
    const tier = tierRows.find((t) => t.id === b.menuTierId);
    if (!tier) return reply.code(400).send({ error: 'unknown_menu_tier' });
    const hall = b.hallId ? hallRows.find((h) => h.id === b.hallId) : undefined;
    if (b.hallId && !hall) return reply.code(400).send({ error: 'unknown_hall' });

    // Money is computed HERE, never trusted from the client.
    const domainVenue = {
      menuTiers: tierRows.map((t) => ({ id: t.id, name: t.name, description: t.description, pricePerGuestMkd: t.pricePerGuestMkd })),
      halls: hallRows.map((h) => ({
        id: h.id, name: h.name, capacityMin: h.capacityMin, capacityMax: h.capacityMax,
        indoor: h.indoor, areaM2: h.areaM2, pricePerGuestAdjMkd: h.pricePerGuestAdjMkd,
      })),
      capacityMin: venueRow.capacityMin,
    };
    const estimate = estimateTotalMkd(domainVenue as Parameters<typeof estimateTotalMkd>[0], b.menuTierId, b.guestCount, b.hallId ?? null);
    const kapar = kaparAmountMkd(venueRow.kaparPolicy, estimate);
    const id = `bk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    try {
      await db.transaction(async (tx) => {
        await tx.insert(bookings).values({
          id,
          confirmationCode: makeConfirmationCode(),
          venueId: b.venueId,
          deviceId: b.deviceId,
          eventDate: b.eventDateISO,
          guestCount: b.guestCount,
          menuTierId: b.menuTierId,
          hallId: b.hallId ?? null,
          estimatedTotalMkd: estimate,
          kaparMkd: kapar,
          balanceDueMkd: Math.max(0, estimate - kapar),
          status: 'pending_kapar',
          contactName: b.contactName,
          contactPhone: b.contactPhone,
          specialRequests: b.specialRequests ?? null,
        });
        await tx.insert(bookingEvents).values({ bookingId: id, status: 'pending_kapar' });
      });
    } catch (err) {
      // The partial unique index IS the double-booking guard: a concurrent
      // active booking for the same venue+date lands here, not in user data.
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ error: 'date_taken' });
      }
      throw err;
    }
    return reply.code(201).send(await loadBooking(id));
  });

  app.get<{ Querystring: { deviceId?: string } }>('/v1/bookings', async (req, reply) => {
    const { deviceId } = req.query;
    if (!deviceId) return reply.code(400).send({ error: 'missing_device_id' });
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.deviceId, deviceId))
      .orderBy(desc(bookings.createdAt));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const venueIds = [...new Set(rows.map((r) => r.venueId))];
    const [events, venueRows] = await Promise.all([
      db.select().from(bookingEvents).where(inArray(bookingEvents.bookingId, ids)),
      db.select().from(venues).where(inArray(venues.id, venueIds)),
    ]);
    return rows.map((row) => {
      const venue = venueRows.find((v) => v.id === row.venueId);
      return venue ? toBooking(row, events.filter((e) => e.bookingId === row.id), venue) : null;
    }).filter(Boolean);
  });

  app.get<{ Params: { id: string } }>('/v1/bookings/:id', async (req, reply) => {
    const booking = await loadBooking(req.params.id);
    if (!booking) return reply.code(404).send({ error: 'booking_not_found' });
    return booking;
  });

  // Venue confirms the hold — Wave 4 puts a vendor inbox in front of this.
  app.post<{ Params: { id: string } }>('/v1/bookings/:id/confirm', async (req, reply) => {
    const row = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1).then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });
    const result = await applyTransition(req.params.id, 'reserved', {
      payBy: kaparPayByISO(new Date().toISOString(), row.eventDate),
    });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(req.params.id);
  });

  // Venue marks the kapar received at the visit.
  app.post<{ Params: { id: string } }>('/v1/bookings/:id/kapar-received', async (req, reply) => {
    const result = await applyTransition(req.params.id, 'confirmed', { kaparPaidAt: new Date() });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(req.params.id);
  });

  app.post<{ Params: { id: string }; Body: { by?: 'couple' | 'venue' } }>('/v1/bookings/:id/cancel', async (req, reply) => {
    const by = req.body?.by ?? 'couple';
    const row = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1).then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });

    // Refund is computed server-side at the moment of cancellation and
    // stamped permanently. Venue-initiated is ALWAYS 100% (platform policy).
    let patch: Partial<typeof bookings.$inferInsert> = {};
    if (row.kaparPaidAt) {
      const venueRow = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
      if (!venueRow) return reply.code(500).send({ error: 'venue_missing' });
      const percent =
        by === 'venue'
          ? 100
          : refundPercentFor(venueRow.kaparPolicy, row.eventDate, new Date().toISOString(), row.kaparPaidAt.toISOString());
      patch = { refundPercent: percent, refundAmountMkd: Math.round((row.kaparMkd * percent) / 100) };
    }
    const result = await applyTransition(req.params.id, by === 'venue' ? 'cancelled_by_venue' : 'cancelled_by_couple', patch);
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(req.params.id);
  });
}
