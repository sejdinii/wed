import type { Hall, MenuTier, Review, Venue } from '@kapar/domain';

import type { halls, menuTiers, reviews, venues } from './db/schema.js';

type VenueRow = typeof venues.$inferSelect;
type HallRow = typeof halls.$inferSelect;
type MenuTierRow = typeof menuTiers.$inferSelect;
type ReviewRow = typeof reviews.$inferSelect;

/**
 * DB rows → the exact `@kapar/domain` wire shapes the app already consumes.
 * The API contract IS the domain type — the client must not need mapping.
 */

export function toHall(row: HallRow): Hall {
  return {
    id: row.id,
    name: row.name,
    capacityMin: row.capacityMin,
    capacityMax: row.capacityMax,
    indoor: row.indoor,
    areaM2: row.areaM2,
    pricePerGuestAdjMkd: row.pricePerGuestAdjMkd,
  };
}

export function toMenuTier(row: MenuTierRow): MenuTier {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pricePerGuestMkd: row.pricePerGuestMkd,
  };
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    venueId: row.venueId,
    author: row.author,
    score: row.score,
    eventDateISO: row.eventDate,
    guestCount: row.guestCount,
    positive: row.positive,
    ...(row.negative ? { negative: row.negative } : {}),
  };
}

export function toVenue(row: VenueRow, hallRows: HallRow[], tierRows: MenuTierRow[]): Venue {
  return {
    id: row.id,
    slug: row.slug,
    published: row.published,
    name: row.name,
    city: row.city as Venue['city'],
    venueType: row.venueType as Venue['venueType'],
    halls: hallRows.sort((a, b) => a.sort - b.sort).map(toHall),
    included: row.included,
    scores: row.scores,
    houseRules: row.houseRules,
    foodOptions: row.foodOptions,
    coords: row.coords,
    nearby: row.nearby,
    address: row.address,
    phone: row.phone,
    photos: row.photos,
    capacityMin: row.capacityMin,
    capacityMax: row.capacityMax,
    menuTiers: tierRows.sort((a, b) => a.sort - b.sort).map(toMenuTier),
    amenities: row.amenities,
    description: row.description,
    rating: row.rating,
    reviewCount: row.reviewCount,
    verified: row.verified,
    responseTimeHours: row.responseTimeHours,
    featured: row.featured,
    kaparPolicy: row.kaparPolicy,
    bookedDates: row.bookedDates,
  };
}
