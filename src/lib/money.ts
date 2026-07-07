import type { Locale } from '@/i18n';

/**
 * All monetary amounts in the app are integer Macedonian denars (MKD).
 * Deni (1/100) are never used in venue pricing, so integers are exact —
 * no floating point, no rounding surprises. Multi-currency support later
 * means introducing a Money = { amount, currency } value object at the
 * domain layer; formatting already goes through this single module.
 *
 * We format manually instead of relying on Intl so output is deterministic
 * across Hermes/ICU builds.
 */

const CURRENCY_SUFFIX: Record<Locale, string> = {
  mk: 'ден.',
  sq: 'den.',
  en: 'MKD',
};

const GROUP_SEPARATOR: Record<Locale, string> = {
  mk: '.',
  sq: '.',
  en: ',',
};

export function groupDigits(value: number, locale: Locale): string {
  const negative = value < 0;
  const digits = Math.round(Math.abs(value)).toString();
  const sep = GROUP_SEPARATOR[locale];
  let grouped = '';
  for (let i = 0; i < digits.length; i++) {
    const posFromEnd = digits.length - i;
    grouped += digits.charAt(i);
    if (posFromEnd > 1 && posFromEnd % 3 === 1) grouped += sep;
  }
  return negative ? `-${grouped}` : grouped;
}

/** "30.000 ден." / "30,000 MKD" */
export function formatMkd(amount: number, locale: Locale): string {
  return `${groupDigits(amount, locale)} ${CURRENCY_SUFFIX[locale]}`;
}

/** Price-per-guest shorthand used on cards: "1.450 ден." (suffix added by caller copy). */
export function formatMkdBare(amount: number, locale: Locale): string {
  return groupDigits(amount, locale);
}
