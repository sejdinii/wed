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
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { userFromRequest } from '../auth.js';
import { db } from '../db/client.js';
import { blockedDates, bookingEvents, bookings, halls, menuTiers, notifications, venues } from '../db/schema.js';

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

/** Exported for the vendor routes — ONE serializer; field drift between copies already bit us once (cancelReason). */
export function toBooking(row: BookingRow, events: EventRow[], venue: Pick<VenueRow, 'name' | 'photos' | 'city'>, hallName?: string): Booking {
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
    ...(row.cancelReason ? { cancelReason: row.cancelReason } : {}),
    timeline: events
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((e) => ({ status: e.status as BookingStatus, at: e.at.toISOString() })),
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    ...(row.specialRequests ? { specialRequests: row.specialRequests } : {}),
    ...(hallName ? { hallName } : {}),
  };
}

/** Exported for the vendor routes (Wave 4) — single serialization path. */
export async function loadBooking(id: string): Promise<Booking | undefined> {
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
 * Which side(s) get an in-app notification for each transition. The actor
 * never gets notified about their own action — only the counterpart (plus
 * both on system expiries). Device-only couples (no userId) and ownerless
 * seed venues simply produce no row.
 */
const TRANSITION_NOTIFY: Partial<Record<BookingStatus, ('couple' | 'vendor')[]>> = {
  reserved: ['couple'],
  confirmed: ['couple'],
  cancelled_by_venue: ['couple'],
  cancelled_by_couple: ['vendor'],
  expired: ['couple', 'vendor'],
  completed: ['couple'],
};

/**
 * The transition writer — THE only way a booking changes state. Enforces the
 * domain state machine, appends the audit event, and fans out notification
 * rows (Wave 5) in one transaction. Exported for the vendor routes (Wave 4);
 * route modules NEVER update bookings.status directly.
 */
export async function applyTransition(
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

    const targets = TRANSITION_NOTIFY[to];
    if (targets) {
      const rows: (typeof notifications.$inferInsert)[] = [];
      if (targets.includes('couple') && row.userId) {
        rows.push({ userId: row.userId, bookingId: id, kind: `booking_${to}` });
      }
      if (targets.includes('vendor')) {
        const venueRow = await tx
          .select({ ownerUserId: venues.ownerUserId })
          .from(venues)
          .where(eq(venues.id, row.venueId))
          .limit(1)
          .then((r) => r[0]);
        if (venueRow?.ownerUserId) rows.push({ userId: venueRow.ownerUserId, bookingId: id, kind: `booking_${to}` });
      }
      if (rows.length) await tx.insert(notifications).values(rows);
    }
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
    // Seeded blocks (legacy bookedDates) still count.
    if (venueRow.bookedDates.includes(b.eventDateISO)) return reply.code(409).send({ error: 'date_taken' });
    // Wave 3: vendor-blocked dates refuse a new booking the same as a seeded block.
    const blockedRow = await db
      .select()
      .from(blockedDates)
      .where(and(eq(blockedDates.venueId, b.venueId), eq(blockedDates.date, b.eventDateISO)))
      .limit(1)
      .then((r) => r[0]);
    if (blockedRow) return reply.code(409).send({ error: 'date_taken' });

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
    // Optional bearer auth: deviceId-only creation must keep working
    // unchanged — this only additionally stamps an owner when logged in.
    const authUser = await userFromRequest(req);

    try {
      await db.transaction(async (tx) => {
        await tx.insert(bookings).values({
          id,
          confirmationCode: makeConfirmationCode(),
          venueId: b.venueId,
          deviceId: b.deviceId,
          ...(authUser ? { userId: authUser.id } : {}),
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
        // Wave 5: the vendor's inbox bell — a new request is the one event
        // the create path must announce (transitions fan out in applyTransition).
        if (venueRow.ownerUserId) {
          await tx.insert(notifications).values({ userId: venueRow.ownerUserId, bookingId: id, kind: 'booking_request' });
        }
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
    const authUser = await userFromRequest(req);
    if (!deviceId && !authUser) return reply.code(400).send({ error: 'missing_device_id' });

    // Bearer + deviceId both present: union of the account's bookings and
    // that device's bookings (covers a claimed device still browsing locally).
    const conditions = [
      ...(authUser ? [eq(bookings.userId, authUser.id)] : []),
      ...(deviceId ? [eq(bookings.deviceId, deviceId)] : []),
    ];
    const where = conditions.length > 1 ? or(...conditions) : conditions[0];

    const rows = await db
      .select()
      .from(bookings)
      .where(where)
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

  // Venue confirms the hold. Wave 4 lockdown: a real vendor (owned venue)
  // must use /v1/vendor/bookings/:id/confirm instead — this route stays open
  // only for ownerless (seeded) venues, which the demo bot drives via SQL.
  app.post<{ Params: { id: string } }>('/v1/bookings/:id/confirm', async (req, reply) => {
    const row = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1).then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });
    const venueRow = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
    if (venueRow?.ownerUserId) return reply.code(403).send({ error: 'vendor_only' });
    const result = await applyTransition(req.params.id, 'reserved', {
      payBy: kaparPayByISO(new Date().toISOString(), row.eventDate),
    });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(req.params.id);
  });

  // Venue marks the kapar received at the visit. Same Wave 4 lockdown as
  // /confirm above — owned venues answer through /v1/vendor/bookings instead.
  app.post<{ Params: { id: string } }>('/v1/bookings/:id/kapar-received', async (req, reply) => {
    const row = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1).then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });
    const venueRow = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
    if (venueRow?.ownerUserId) return reply.code(403).send({ error: 'vendor_only' });
    const result = await applyTransition(req.params.id, 'confirmed', { kaparPaidAt: new Date() });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(req.params.id);
  });

  app.post<{ Params: { id: string }; Body: { by?: 'couple' | 'venue' } }>('/v1/bookings/:id/cancel', async (req, reply) => {
    const by = req.body?.by ?? 'couple';
    const row = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1).then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });
    const venueRow = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
    if (!venueRow) return reply.code(500).send({ error: 'venue_missing' });

    // Wave 4 lockdown: an owned venue must act through its own bearer — for
    // 'venue' cancels that means the venue owner; for 'couple' cancels (the
    // default) that means the booking's own user, when the booking has one.
    // Ownerless venues and device-only bookings keep the pre-Wave-4 open
    // behavior so nothing else breaks.
    if (by === 'venue') {
      if (venueRow.ownerUserId) {
        const authUser = await userFromRequest(req);
        if (!authUser || authUser.id !== venueRow.ownerUserId) return reply.code(403).send({ error: 'vendor_only' });
      }
    } else if (row.userId) {
      const authUser = await userFromRequest(req);
      if (!authUser) return reply.code(401).send({ error: 'auth_required' });
      if (authUser.id !== row.userId) return reply.code(403).send({ error: 'not_your_booking' });
    }

    // Refund is computed server-side at the moment of cancellation and
    // stamped permanently. Venue-initiated is ALWAYS 100% (platform policy).
    let patch: Partial<typeof bookings.$inferInsert> = {};
    if (row.kaparPaidAt) {
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
