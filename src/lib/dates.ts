import type { Locale } from '@/i18n';

/**
 * Pure date utilities over ISO `YYYY-MM-DD` strings — the only date wire format
 * in the app. We intentionally avoid Intl/date libraries: month and weekday
 * names ship as data so output is identical on every device and testable.
 *
 * Weeks start on Monday (European convention).
 */

export const MONTHS: Record<Locale, readonly string[]> = {
  mk: ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември'],
  sq: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Monday-first. */
export const WEEKDAYS_SHORT: Record<Locale, readonly string[]> = {
  mk: ['По', 'Вт', 'Ср', 'Че', 'Пе', 'Са', 'Не'],
  sq: ['Hë', 'Ma', 'Më', 'En', 'Pr', 'Sh', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export const WEEKDAYS_LONG: Record<Locale, readonly string[]> = {
  mk: ['понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота', 'недела'],
  sq: ['e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë', 'e diel'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses as local time (never UTC — event dates are venue-local). */
export function parseISODate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday-first weekday index: 0 = Monday … 6 = Sunday. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function isSaturday(iso: string): boolean {
  return parseISODate(iso).getDay() === 6;
}

/** "сабота, 12 септември 2026" — the emotional format for the wedding date. */
export function formatLongDate(iso: string, locale: Locale): string {
  const date = parseISODate(iso);
  const weekday = WEEKDAYS_LONG[locale][mondayIndex(date)] ?? '';
  const month = MONTHS[locale][date.getMonth()] ?? '';
  if (locale === 'en') return `${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
  return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** "12 септември 2026" */
export function formatMediumDate(iso: string, locale: Locale): string {
  const date = parseISODate(iso);
  const month = MONTHS[locale][date.getMonth()] ?? '';
  if (locale === 'en') return `${month} ${date.getDate()}, ${date.getFullYear()}`;
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** "12 сеп" — compact chips and lists. */
export function formatShortDate(iso: string, locale: Locale): string {
  const date = parseISODate(iso);
  const month = (MONTHS[locale][date.getMonth()] ?? '').slice(0, 3);
  if (locale === 'en') return `${month} ${date.getDate()}`;
  return `${date.getDate()} ${month}`;
}

/** Month title for calendar header: "Септември 2026". */
export function formatMonthTitle(date: Date, locale: Locale): string {
  const month = MONTHS[locale][date.getMonth()] ?? '';
  const capitalised = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalised} ${date.getFullYear()}`;
}

/**
 * Upcoming Saturdays (the premium wedding day in North Macedonia) that are
 * not blocked. Powers the "next free Saturdays" quick-pick on venue pages.
 */
export function nextFreeSaturdays(fromISO: string, count: number, isBlocked: (iso: string) => boolean): string[] {
  const result: string[] = [];
  let cursor = parseISODate(fromISO);
  cursor.setDate(cursor.getDate() + ((6 - cursor.getDay() + 7) % 7 || 7));
  let safety = 0;
  while (result.length < count && safety < 120) {
    const iso = toISODate(cursor);
    if (!isBlocked(iso)) result.push(iso);
    cursor.setDate(cursor.getDate() + 7);
    safety++;
  }
  return result;
}
