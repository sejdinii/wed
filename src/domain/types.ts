import type { Locale } from '@/i18n';

/**
 * Core domain model. Kapar is a first-class concept:
 * a venue is never "bought" through the platform — it is *reserved* with a
 * kapar (deposit), and the balance is settled directly with the venue.
 */

export type CityKey =
  | 'skopje'
  | 'tetovo'
  | 'gostivar'
  | 'ohrid'
  | 'bitola'
  | 'struga'
  | 'kumanovo'
  | 'prilep'
  | 'veles'
  | 'stip'
  | 'strumica'
  | 'kavadarci'
  | 'gevgelija';

export type RegionKey =
  | 'skopski'
  | 'poloski'
  | 'jugozapaden'
  | 'pelagoniski'
  | 'severoistocen'
  | 'vardarski'
  | 'istocen'
  | 'jugoistocen';

/** Category driving home carousels and the type filter. */
export type VenueType = 'garden' | 'lake' | 'ballroom' | 'terrace' | 'panoramic' | 'restaurant';

/** Venue-level "What's included" checklist items (C3 spec). */
export type IncludedKey =
  | 'tablesChairs'
  | 'lightingSound'
  | 'bridalRoom'
  | 'parking'
  | 'basicDecor'
  | 'waitstaff';

/**
 * A bookable hall within a venue. Multi-hall venues get a selector on the
 * detail page and the price follows the selection (C3 spec).
 */
export interface Hall {
  id: string;
  name: Record<Locale, string>;
  capacityMin: number;
  capacityMax: number;
  indoor: boolean;
  /** Per-guest surcharge/discount vs. the venue's base menu prices. */
  pricePerGuestAdjMkd: number;
}

export type AmenityKey =
  | 'parking'
  | 'liveMusic'
  | 'garden'
  | 'lakeView'
  | 'terrace'
  | 'airCon'
  | 'bridalSuite'
  | 'inHouseCatering'
  | 'fireworks'
  | 'accessible'
  | 'childrenArea'
  | 'cityView';

/**
 * Venues in North Macedonia price per guest ("куверт") with the menu included.
 * This is the local convention — modelling per-event prices would be wrong
 * for this market and would block venue adoption.
 */
export interface MenuTier {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  pricePerGuestMkd: number;
}

/**
 * One rung of the cancellation ladder: applies while the event is at least
 * `minDaysBeforeEvent` days away. Tiers are kept sorted descending; the last
 * tier (typically minDaysBeforeEvent 0) is the terminal "no refund" rung.
 */
export interface RefundTier {
  minDaysBeforeEvent: number;
  refundPercent: number;
}

export interface KaparPolicy {
  kind: 'fixed' | 'percent';
  /** Set when kind === 'fixed'. */
  fixedAmountMkd?: number;
  /** Set when kind === 'percent' — % of the estimated total. */
  percentOfEstimate?: number;
  /** Floor for percent policies so tiny guest counts can't trivialise the deposit. */
  minAmountMkd: number;
  refundTiers: RefundTier[];
}

export interface Venue {
  id: string;
  /** URL slug for deep links: kapar.mk/v/{slug}. */
  slug: string;
  /** Unpublished venues 410 on detail and never appear in lists. */
  published: boolean;
  name: string;
  city: CityKey;
  venueType: VenueType;
  halls: Hall[];
  included: IncludedKey[];
  address: string;
  phone: string;
  photos: string[];
  capacityMin: number;
  capacityMax: number;
  menuTiers: MenuTier[];
  amenities: AmenityKey[];
  description: Record<Locale, string>;
  rating: number;
  reviewCount: number;
  verified: boolean;
  responseTimeHours: number;
  featured: boolean;
  kaparPolicy: KaparPolicy;
  /** ISO dates already taken. Source of truth lives with the backend later. */
  bookedDates: string[];
}

/**
 * The kapar-first booking lifecycle:
 *
 *  pending_kapar ──pay──▶ reserved ──venue confirms──▶ confirmed ──event──▶ completed
 *        │                   │
 *        ▼ (hold expires)    ├──couple cancels──▶ cancelled_by_couple (refund per ladder)
 *      expired               └──venue declines/cancels──▶ cancelled_by_venue (100% refund)
 *
 * While `reserved`, the kapar is held by the platform (Kapar Protection) and
 * only released to the venue on confirmation. This is the trust core of the product.
 */
export type BookingStatus =
  | 'pending_kapar'
  | 'reserved'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_couple'
  | 'cancelled_by_venue'
  | 'expired';

export interface BookingTimelineEvent {
  status: BookingStatus;
  /** ISO datetime. */
  at: string;
}

export interface Booking {
  id: string;
  /** Human confirmation code, e.g. "KPR-7F3K9C" — the couple's proof of kapar. */
  confirmationCode: string;
  venueId: string;
  venueName: string;
  venuePhoto: string;
  city: CityKey;
  eventDateISO: string;
  guestCount: number;
  menuTierId: string;
  estimatedTotalMkd: number;
  kaparMkd: number;
  balanceDueMkd: number;
  status: BookingStatus;
  createdAtISO: string;
  timeline: BookingTimelineEvent[];
  /** Sent to the venue for confirmation and the contract. */
  contactName: string;
  contactPhone: string;
  specialRequests?: string;
  /** Display name of the booked hall (multi-hall venues). */
  hallName?: string;
}

/** One message in the couple ↔ venue thread attached to a booking. */
export interface ChatMessage {
  id: string;
  bookingId: string;
  from: 'couple' | 'venue';
  text: string;
  atISO: string;
}
