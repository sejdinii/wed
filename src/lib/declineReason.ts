/**
 * Wave 6 decline-category shape (RtB-style, ACCEPTED 2026-07-18): a vendor
 * decline/cancel reason is stored as `${categoryKey}|${freeText}` so the
 * couple sees a localized category instead of a raw quote. A reason with no
 * pipe (everything stored before this wave) is legacy free text — parse()
 * reports `categoryKey: null` and the whole string as `text` so callers can
 * fall back to the old "Message from the venue: …" rendering unchanged.
 */
export type DeclineCategoryKey = 'date_unavailable' | 'capacity_mismatch' | 'budget_mismatch' | 'other';

export const DECLINE_CATEGORY_KEYS: readonly DeclineCategoryKey[] = [
  'date_unavailable',
  'capacity_mismatch',
  'budget_mismatch',
  'other',
];

export interface ParsedDeclineReason {
  /** null = legacy free text (no pipe, or an unrecognized category token). */
  categoryKey: DeclineCategoryKey | null;
  /** The free-text part (category case), or the raw legacy string (null case). */
  text: string;
}

function isCategoryKey(value: string): value is DeclineCategoryKey {
  return (DECLINE_CATEGORY_KEYS as readonly string[]).includes(value);
}

/** Builds the stored reason string from a category + optional free text. */
export function format(categoryKey: DeclineCategoryKey, freeText?: string): string {
  return `${categoryKey}|${freeText ?? ''}`;
}

/** Parses a stored reason back into its category (if any) + text. */
export function parse(reason: string): ParsedDeclineReason {
  const pipeIndex = reason.indexOf('|');
  if (pipeIndex === -1) return { categoryKey: null, text: reason };
  const key = reason.slice(0, pipeIndex);
  const text = reason.slice(pipeIndex + 1);
  return isCategoryKey(key) ? { categoryKey: key, text } : { categoryKey: null, text: reason };
}
