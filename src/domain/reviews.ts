import type { TranslationKey } from '@/i18n';
import type { Venue, VenueScores } from './types';

/**
 * Booking-style scoring: venues rate on a 10 scale with an adjective.
 * Our stored rating is 5-scale (star convention); score10 converts.
 */

export function score10(venue: Pick<Venue, 'rating'>): number {
  return Math.round(venue.rating * 2 * 10) / 10;
}

export function scoreWordKey(score: number): TranslationKey {
  if (score >= 9.5) return 'score.exceptional';
  if (score >= 9.0) return 'score.superb';
  if (score >= 8.5) return 'score.fabulous';
  if (score >= 8.0) return 'score.veryGood';
  if (score >= 7.0) return 'score.good';
  return 'score.pleasant';
}

export const SCORE_CATEGORIES: ReadonlyArray<{ key: keyof VenueScores; labelKey: TranslationKey }> = [
  { key: 'food', labelKey: 'cat.food' },
  { key: 'service', labelKey: 'cat.service' },
  { key: 'organization', labelKey: 'cat.organization' },
  { key: 'location', labelKey: 'cat.location' },
  { key: 'value', labelKey: 'cat.value' },
];
