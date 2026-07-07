import type { Locale } from '@/i18n';

/**
 * Domain amounts remain integer Macedonian denars (MKD) — exact, no floats.
 * The v3 design displays prices in EUR (the quoting currency Macedonian
 * venues actually use with couples), converted at a pinned display rate.
 * When the backend lands, venues will set their own quote currency and the
 * rate moves server-side; every screen already formats through this module.
 */

/** Pinned display rate (MKD per EUR). The denar is pegged; drift is minimal. */
export const MKD_PER_EUR = 61.5;

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

export function mkdToEur(amountMkd: number): number {
  return Math.round(amountMkd / MKD_PER_EUR);
}

/** "€3,200" (en) / "€3.200" (mk, sq) — takes MKD, displays EUR. */
export function formatMkd(amountMkd: number, locale: Locale): string {
  return `€${groupDigits(mkdToEur(amountMkd), locale)}`;
}

/** EUR number without the symbol — for strings that place € themselves. */
export function formatMkdBare(amountMkd: number, locale: Locale): string {
  return groupDigits(mkdToEur(amountMkd), locale);
}
