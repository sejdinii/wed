/**
 * Core domain model — shared verbatim by the app and the server. Kapar is a
 * first-class concept: a venue is never "bought" through the platform — it is
 * *reserved* with a kapar (deposit), and the balance is settled directly with
 * the venue.
 */

/** Product languages. Per-locale content is stored as Record<Locale, string>. */
export type Locale = 'mk' | 'sq' | 'en';

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

/** Booking-style 10-scale category scores. */
export interface VenueScores {
  food: number;
  service: number;
  organization: number;
  location: number;
  value: number;
}

/** A guest review — shown in its original language, like real review systems. */
export interface Review {
  id: string;
  venueId: string;
  author: string;
  /** 1–10. */
  score: number;
  eventDateISO: string;
  guestCount: number;
  positive: string;
  negative?: string;
}

/** Venue house rules — the "hotel policies" equivalent for wedding venues. */
export interface HouseRules {
  /** Live music curfew, e.g. "01:00". */
  musicUntil: string;
  fireworksAllowed: boolean;
  ownAlcoholAllowed: boolean;
  ownDecorAllowed: boolean;
}

export interface NearbyPlace {
  label: Record<Locale, string>;
  km: number;
}

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
  /** Hall floor area — the "room size m²" equivalent. */
  areaM2: number;
  /** Per-guest surcharge/discount vs. the venue's base menu prices. */
  pricePerGuestAdjMkd: number;
}

/** Food & menu options — the "breakfast included" equivalent for venues. */
export type FoodOptionKey =
  | 'traditional'
  | 'international'
  | 'fishMenu'
  | 'vegetarian'
  | 'kidsMenu'
  | 'lateSnack'
  | 'ownCakeAllowed';

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
  scores: VenueScores;
  houseRules: HouseRules;
  foodOptions: FoodOptionKey[];
  coords: { lat: number; lng: number };
  nearby: NearbyPlace[];
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
 * The kapar-first booking lifecycle (MVP: no online payment — the kapar is
 * paid in person at the venue visit):
 *
 *  pending_kapar ──venue confirms hold──▶ reserved ──kapar paid at visit──▶ confirmed ──event──▶ completed
 *        │                                    │
 *        ▼ (no venue answer in 24h,           ├──couple cancels──▶ cancelled_by_couple
 *           or kapar not paid by payBy)       │     (free before kapar is paid; refund ladder after)
 *      expired ◀──────────────────────────────┘
 *                                             └──venue declines/cancels──▶ cancelled_by_venue (100% back, always)
 *
 * The platform never holds money in the MVP. "Refund" always means the venue
 * returns the kapar to the couple per the agreement shown at booking time.
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
  /** Deadline to visit the venue and pay the kapar; set when the venue confirms the hold. */
  payByISO?: string;
  /** When the venue marked the kapar as received (paid in person at the visit). */
  kaparPaidAtISO?: string;
  /** Stamped at cancellation so the outcome stays stable in the UI. */
  refund?: { percent: number; amountMkd: number };
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
