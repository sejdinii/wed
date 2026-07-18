/**
 * Wave 6 LAUNCH-HONESTY gate (FEATURES.md, flagged 2026-07-12, DECIDED CUT at
 * the Wave 6 checkpoint): every seed venue's rating/reviewCount and the
 * generated reviews in src/data/reviews.ts are deterministic fiction, not
 * real guest feedback. Venue.rating/reviewCount stay in the data model
 * (sorting/filtering still uses them), but NO review/rating surface may
 * render to a real user until real reviews exist. Every such surface
 * (ScoreBadge, VenueCard rating chips, venue-detail review section, the
 * reviews screen) checks this flag. Flip to true only when a real reviews
 * write path ships.
 */
export const REVIEWS_ENABLED = false;
