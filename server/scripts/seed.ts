/**
 * Seeds the database from the app's seed catalogue (src/data/venues.ts +
 * generated reviews) — the same 14 venues the mock served, now in Postgres.
 * Idempotent: wipes and reinserts catalogue tables (never touches bookings).
 */
import { VENUES } from '../../src/data/venues.js';
import { REVIEWS } from '../../src/data/reviews.js';
import { db, pool } from '../src/db/client.js';
import { halls, menuTiers, reviews, venues } from '../src/db/schema.js';

await db.transaction(async (tx) => {
  await tx.delete(reviews);
  await tx.delete(menuTiers);
  await tx.delete(halls);
  await tx.delete(venues);

  for (const v of VENUES) {
    await tx.insert(venues).values({
      id: v.id,
      slug: v.slug,
      published: v.published,
      name: v.name,
      city: v.city,
      venueType: v.venueType,
      address: v.address,
      phone: v.phone,
      photos: v.photos,
      capacityMin: v.capacityMin,
      capacityMax: v.capacityMax,
      amenities: v.amenities,
      included: v.included,
      foodOptions: v.foodOptions,
      scores: v.scores,
      houseRules: v.houseRules,
      coords: v.coords,
      nearby: v.nearby,
      description: v.description,
      rating: v.rating,
      reviewCount: v.reviewCount,
      verified: v.verified,
      responseTimeHours: v.responseTimeHours,
      featured: v.featured,
      kaparPolicy: v.kaparPolicy,
      bookedDates: v.bookedDates,
    });
    for (const [i, h] of v.halls.entries()) {
      await tx.insert(halls).values({
        id: h.id,
        venueId: v.id,
        name: h.name,
        capacityMin: h.capacityMin,
        capacityMax: h.capacityMax,
        indoor: h.indoor,
        areaM2: h.areaM2,
        pricePerGuestAdjMkd: h.pricePerGuestAdjMkd,
        sort: i,
      });
    }
    for (const [i, m] of v.menuTiers.entries()) {
      await tx.insert(menuTiers).values({
        id: m.id,
        venueId: v.id,
        name: m.name,
        description: m.description,
        pricePerGuestMkd: m.pricePerGuestMkd,
        sort: i,
      });
    }
  }

  for (const r of REVIEWS) {
    await tx.insert(reviews).values({
      id: r.id,
      venueId: r.venueId,
      author: r.author,
      score: r.score,
      eventDate: r.eventDateISO,
      guestCount: r.guestCount,
      positive: r.positive,
      negative: r.negative ?? null,
    });
  }
});

const count = await db.$count(venues);
console.log(`seeded ${count} venues (+halls/menus/reviews)`);
await pool.end();
