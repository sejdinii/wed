import type { Booking, BookingStatus, Hall, KaparPolicy, MenuTier, RefundTier, Venue } from './types';
import { addDaysISO, daysBetween } from '@/lib/dates';

/**
 * Kapar business rules — pure functions, no I/O, fully unit-testable.
 * These same rules must be mirrored server-side once the backend exists;
 * the client never invents amounts, it only previews them.
 */

export function cheapestPerGuest(venue: Venue): number {
  return Math.min(...venue.menuTiers.map((t) => t.pricePerGuestMkd));
}

export function hallFor(venue: Venue, hallId: string | null | undefined): Hall | undefined {
  return venue.halls.find((h) => h.id === hallId) ?? venue.halls[0];
}

/**
 * Minimum realistic event total — powers "From €X" on cards and the C3
 * sticky bar. With a hall selected, the price follows the hall (capacity
 * floor and per-guest adjustment).
 */
export function minEstimateMkd(venue: Venue, hallId?: string | null): number {
  const hall = hallFor(venue, hallId);
  const perGuest = cheapestPerGuest(venue) + (hall?.pricePerGuestAdjMkd ?? 0);
  return perGuest * (hall?.capacityMin ?? venue.capacityMin);
}

/** €€–€€€€ price level derived from the cheapest per-guest menu. */
export function priceLevel(venue: Venue): string {
  const price = cheapestPerGuest(venue);
  if (price < 1250) return '€€';
  if (price < 1550) return '€€€';
  return '€€€€';
}

/**
 * Calendar day state: booked = taken outright; limited = adjacent to a
 * booked day (venues juggle setup/teardown around back-to-back weddings);
 * otherwise available.
 */
export function venueDayState(venue: Venue, iso: string): 'available' | 'limited' | 'booked' {
  if (venue.bookedDates.includes(iso)) return 'booked';
  if (venue.bookedDates.includes(addDaysISO(iso, -1)) || venue.bookedDates.includes(addDaysISO(iso, 1))) {
    return 'limited';
  }
  return 'available';
}

export function findTier(venue: Venue, tierId: string): MenuTier | undefined {
  return venue.menuTiers.find((t) => t.id === tierId);
}

/** Estimated event total: (per-guest menu price + hall adjustment) × guests. */
export function estimateTotalMkd(venue: Venue, tierId: string, guestCount: number, hallId?: string | null): number {
  const tier = findTier(venue, tierId) ?? venue.menuTiers[0];
  if (!tier) return 0;
  const hallAdj = hallId !== undefined ? (hallFor(venue, hallId)?.pricePerGuestAdjMkd ?? 0) : 0;
  return (tier.pricePerGuestMkd + hallAdj) * guestCount;
}

/**
 * The kapar amount for a given estimate. Percent policies round to the nearest
 * 500 MKD so quoted deposits look like real-world kapar figures, never "23.417".
 */
export function kaparAmountMkd(policy: KaparPolicy, estimatedTotal: number): number {
  if (policy.kind === 'fixed') {
    return policy.fixedAmountMkd ?? policy.minAmountMkd;
  }
  const raw = (estimatedTotal * (policy.percentOfEstimate ?? 0)) / 100;
  const rounded = Math.round(raw / 500) * 500;
  return Math.max(rounded, policy.minAmountMkd);
}

/** The lowest kapar a venue can be reserved with — used on cards and the sticky bar. */
export function minKaparMkd(venue: Venue): number {
  const minEstimate = cheapestPerGuest(venue) * venue.capacityMin;
  return kaparAmountMkd(venue.kaparPolicy, minEstimate);
}

/**
 * Platform-wide cancellation ladder (MVP decision 2026-07-09). Applies to
 * couple-initiated cancellations only — a venue-initiated cancellation always
 * returns 100% regardless of timing. Per-venue policies come post-launch;
 * until then every seeded venue carries these exact tiers.
 */
export const PLATFORM_REFUND_TIERS: readonly RefundTier[] = [
  { minDaysBeforeEvent: 90, refundPercent: 100 },
  { minDaysBeforeEvent: 30, refundPercent: 50 },
  { minDaysBeforeEvent: 0, refundPercent: 0 },
];

/** Grace window: full refund within 7 days of paying the kapar, if the event is still 30+ days away. */
export const REFUND_GRACE_DAYS = 7;
export const REFUND_GRACE_MIN_DAYS_BEFORE_EVENT = 30;

/** A new request the venue hasn't answered lapses after this long. */
export const REQUEST_TTL_HOURS = 24;

/** Days the couple has to visit the venue and pay the kapar once the hold is confirmed. */
export const KAPAR_PAY_WINDOW_DAYS = 7;

/** Booking fields carry full ISO datetimes; date math runs on the date part. */
const isoDay = (iso: string): string => iso.slice(0, 10);

/** Refund tiers sorted from most to least generous (descending days-before). */
export function sortedRefundTiers(policy: KaparPolicy): KaparPolicy['refundTiers'] {
  return [...policy.refundTiers].sort((a, b) => b.minDaysBeforeEvent - a.minDaysBeforeEvent);
}

/**
 * Refund percent if the couple cancels `onDateISO` for an event on
 * `eventDateISO`. Pass `kaparPaidAtISO` (when known) so the grace window can
 * apply; before the kapar is paid there is nothing to refund and callers
 * should not be asking.
 */
export function refundPercentFor(
  policy: KaparPolicy,
  eventDateISO: string,
  onDateISO: string,
  kaparPaidAtISO?: string | null,
): number {
  const daysLeft = daysBetween(isoDay(onDateISO), isoDay(eventDateISO));
  if (
    kaparPaidAtISO &&
    daysBetween(isoDay(kaparPaidAtISO), isoDay(onDateISO)) <= REFUND_GRACE_DAYS &&
    daysLeft >= REFUND_GRACE_MIN_DAYS_BEFORE_EVENT
  ) {
    return 100;
  }
  for (const tier of sortedRefundTiers(policy)) {
    if (daysLeft >= tier.minDaysBeforeEvent) return tier.refundPercent;
  }
  return 0;
}

export function refundAmountFor(
  booking: Pick<Booking, 'kaparMkd' | 'eventDateISO' | 'kaparPaidAtISO'>,
  policy: KaparPolicy,
  onDateISO: string,
): number {
  const percent = refundPercentFor(policy, booking.eventDateISO, onDateISO, booking.kaparPaidAtISO);
  return Math.round((booking.kaparMkd * percent) / 100);
}

/** Kapar deadline once the venue confirms the hold — never past the event itself. */
export function kaparPayByISO(confirmedAtISO: string, eventDateISO: string): string {
  const candidate = addDaysISO(isoDay(confirmedAtISO), KAPAR_PAY_WINDOW_DAYS);
  return candidate < isoDay(eventDateISO) ? candidate : isoDay(eventDateISO);
}

/**
 * Time-based lifecycle rules (client-side sweep now, server cron later):
 * unanswered requests and unpaid holds lapse; past confirmed events complete.
 * Returns the status the booking should move to, or null if none applies.
 */
export function lifecycleTransitionFor(
  booking: Pick<Booking, 'status' | 'createdAtISO' | 'payByISO' | 'eventDateISO'>,
  nowISO: string,
): BookingStatus | null {
  const today = isoDay(nowISO);
  if (booking.status === 'pending_kapar') {
    const ageMs = new Date(nowISO).getTime() - new Date(booking.createdAtISO).getTime();
    if (ageMs >= REQUEST_TTL_HOURS * 3_600_000) return 'expired';
  }
  if (booking.status === 'reserved' && booking.payByISO && isoDay(booking.payByISO) < today) return 'expired';
  if (booking.status === 'confirmed' && isoDay(booking.eventDateISO) < today) return 'completed';
  return null;
}

/**
 * Legal state transitions. Enforced here (and later server-side) so no UI
 * bug can ever, say, "complete" an expired booking.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  // Request sent; date soft-held. Couple can withdraw freely, venue can decline.
  pending_kapar: ['reserved', 'expired', 'cancelled_by_couple', 'cancelled_by_venue'],
  // Hold confirmed, kapar unpaid — lapses at payBy, still free to cancel.
  reserved: ['confirmed', 'expired', 'cancelled_by_couple', 'cancelled_by_venue'],
  // Kapar paid at the venue — cancellations now go through the refund ladder.
  confirmed: ['completed', 'cancelled_by_couple', 'cancelled_by_venue'],
  completed: [],
  cancelled_by_couple: [],
  cancelled_by_venue: [],
  expired: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — read over the phone safely

/** "KPR-7F3K9C" — short, unambiguous, easy to dictate to a venue. */
export function makeConfirmationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return `KPR-${code}`;
}
