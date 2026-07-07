import type { Booking, BookingStatus, KaparPolicy, MenuTier, Venue } from './types';
import { daysBetween } from '@/lib/dates';

/**
 * Kapar business rules — pure functions, no I/O, fully unit-testable.
 * These same rules must be mirrored server-side once the backend exists;
 * the client never invents amounts, it only previews them.
 */

export function cheapestPerGuest(venue: Venue): number {
  return Math.min(...venue.menuTiers.map((t) => t.pricePerGuestMkd));
}

export function findTier(venue: Venue, tierId: string): MenuTier | undefined {
  return venue.menuTiers.find((t) => t.id === tierId);
}

/** Estimated event total: per-guest menu price × guest count. */
export function estimateTotalMkd(venue: Venue, tierId: string, guestCount: number): number {
  const tier = findTier(venue, tierId) ?? venue.menuTiers[0];
  if (!tier) return 0;
  return tier.pricePerGuestMkd * guestCount;
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

/** Refund tiers sorted from most to least generous (descending days-before). */
export function sortedRefundTiers(policy: KaparPolicy): KaparPolicy['refundTiers'] {
  return [...policy.refundTiers].sort((a, b) => b.minDaysBeforeEvent - a.minDaysBeforeEvent);
}

/** Refund percent if the couple cancels `onDateISO` for an event on `eventDateISO`. */
export function refundPercentFor(policy: KaparPolicy, eventDateISO: string, onDateISO: string): number {
  const daysLeft = daysBetween(onDateISO, eventDateISO);
  for (const tier of sortedRefundTiers(policy)) {
    if (daysLeft >= tier.minDaysBeforeEvent) return tier.refundPercent;
  }
  return 0;
}

export function refundAmountFor(booking: Pick<Booking, 'kaparMkd' | 'eventDateISO'>, policy: KaparPolicy, onDateISO: string): number {
  const percent = refundPercentFor(policy, booking.eventDateISO, onDateISO);
  return Math.round((booking.kaparMkd * percent) / 100);
}

/**
 * Legal state transitions. Enforced here (and later server-side) so no UI
 * bug can ever, say, "complete" an expired booking.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending_kapar: ['reserved', 'expired'],
  reserved: ['confirmed', 'cancelled_by_couple', 'cancelled_by_venue'],
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
