import { and, eq, inArray, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '../db/client.js';
import { halls, menuTiers, reviews, venues } from '../db/schema.js';
import { toReview, toVenue } from '../serialize.js';

interface ListQuery {
  city?: string;
  date?: string;
  minGuests?: string;
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
    const [allHalls, allTiers] = await Promise.all([
      ids.length ? db.select().from(halls).where(inArray(halls.venueId, ids)) : [],
      ids.length ? db.select().from(menuTiers).where(inArray(menuTiers.venueId, ids)) : [],
    ]);

    let result = rows.map((row) =>
      toVenue(
        row,
        allHalls.filter((h) => h.venueId === row.id),
        allTiers.filter((t) => t.venueId === row.id),
      ),
    );
    // Availability + capacity filters live in code until Wave 1 moves
    // bookedDates into the bookings table (then they become SQL).
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

    const [hallRows, tierRows] = await Promise.all([
      db.select().from(halls).where(eq(halls.venueId, row.id)),
      db.select().from(menuTiers).where(eq(menuTiers.venueId, row.id)),
    ]);
    return toVenue(row, hallRows, tierRows);
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
