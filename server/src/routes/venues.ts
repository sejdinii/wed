import { and, eq, inArray, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '../db/client.js';
import { blockedDates, bookings, halls, menuTiers, reviews, venues } from '../db/schema.js';
import { toReview, toVenue } from '../serialize.js';

interface ListQuery {
  city?: string;
  date?: string;
  minGuests?: string;
}

type VenueRow = typeof venues.$inferSelect;

/** Bookings in these statuses hold the date — mirrors the state machine's "active" set (@kapar/domain BOOKING_TRANSITIONS). */
export const ACTIVE_BOOKING_STATUSES = ['pending_kapar', 'reserved', 'confirmed'] as const;

/**
 * Wave 3: the bookedDates the app sees must be the UNION of each venue's seed
 * jsonb column + real ACTIVE bookings + vendor blocked_dates rows — so couple
 * calendars and date filters reflect real availability, not just seed data.
 * Batched per call (2 queries total, keyed by venueId) so list pages never
 * do per-venue N+1s.
 */
export async function augmentBookedDates(rows: Pick<VenueRow, 'id' | 'bookedDates'>[]): Promise<Map<string, string[]>> {
  const ids = rows.map((r) => r.id);
  const [activeBookings, blocked] = await Promise.all([
    ids.length
      ? db
          .select({ venueId: bookings.venueId, eventDate: bookings.eventDate })
          .from(bookings)
          .where(and(inArray(bookings.venueId, ids), inArray(bookings.status, ACTIVE_BOOKING_STATUSES)))
      : [],
    ids.length ? db.select().from(blockedDates).where(inArray(blockedDates.venueId, ids)) : [],
  ]);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const set = new Set(row.bookedDates);
    for (const b of activeBookings) if (b.venueId === row.id) set.add(b.eventDate);
    for (const d of blocked) if (d.venueId === row.id) set.add(d.date);
    map.set(row.id, [...set].sort());
  }
  return map;
}

/**
 * Read endpoints mirroring the app's VenueApi (see src/data/api.ts REST
 * mapping). Responses are exact `@kapar/domain` shapes.
 */
export async function venueRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: ListQuery }>('/v1/venues', async (req) => {
    const { city, date, minGuests } = req.query;
    const rows = await db
      .select()
      .from(venues)
      .where(and(eq(venues.published, true), city ? eq(venues.city, city) : undefined));

    const ids = rows.map((v) => v.id);
    const [allHalls, allTiers, augmented] = await Promise.all([
      ids.length ? db.select().from(halls).where(inArray(halls.venueId, ids)) : [],
      ids.length ? db.select().from(menuTiers).where(inArray(menuTiers.venueId, ids)) : [],
      augmentBookedDates(rows),
    ]);

    let result = rows.map((row) => {
      const venue = toVenue(
        row,
        allHalls.filter((h) => h.venueId === row.id),
        allTiers.filter((t) => t.venueId === row.id),
      );
      venue.bookedDates = augmented.get(row.id) ?? venue.bookedDates;
      return venue;
    });
    // Capacity filter lives in code; date filter now runs against the
    // augmented bookedDates set (seed + real bookings + vendor blocks).
    if (date) result = result.filter((v) => !v.bookedDates.includes(date));
    if (minGuests) {
      const guests = Number(minGuests);
      if (!Number.isNaN(guests)) result = result.filter((v) => v.capacityMax >= guests);
    }
    return result;
  });

  app.get<{ Params: { idOrSlug: string } }>('/v1/venues/:idOrSlug', async (req, reply) => {
    const { idOrSlug } = req.params;
    // Unpublished venues ARE returned — the app renders the 410 state itself
    // (VenueApi contract).
    const row = await db
      .select()
      .from(venues)
      .where(or(eq(venues.id, idOrSlug), eq(venues.slug, idOrSlug)))
      .limit(1)
      .then((r) => r[0]);
    if (!row) return reply.code(404).send({ error: 'venue_not_found' });

    const [hallRows, tierRows, augmented] = await Promise.all([
      db.select().from(halls).where(eq(halls.venueId, row.id)),
      db.select().from(menuTiers).where(eq(menuTiers.venueId, row.id)),
      augmentBookedDates([row]),
    ]);
    const venue = toVenue(row, hallRows, tierRows);
    venue.bookedDates = augmented.get(row.id) ?? venue.bookedDates;
    return venue;
  });

  app.get<{ Params: { id: string } }>('/v1/venues/:id/halls', async (req) => {
    const rows = await db.select().from(halls).where(eq(halls.venueId, req.params.id));
    return rows.sort((a, b) => a.sort - b.sort).map((h) => ({
      id: h.id,
      name: h.name,
      capacityMin: h.capacityMin,
      capacityMax: h.capacityMax,
      indoor: h.indoor,
      areaM2: h.areaM2,
      pricePerGuestAdjMkd: h.pricePerGuestAdjMkd,
    }));
  });

  app.get<{ Params: { id: string } }>('/v1/venues/:id/reviews', async (req) => {
    const rows = await db.select().from(reviews).where(eq(reviews.venueId, req.params.id));
    return rows.map(toReview);
  });
}
