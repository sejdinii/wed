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

// Pure date math moved to the shared @kapar/domain package (the server uses
// it too); re-exported here so app imports stay stable.
export {
  toISODate,
  parseISODate,
  todayISO,
  addDaysISO,
  addMonths,
  daysBetween,
  mondayIndex,
  isSaturday,
  nextFreeSaturdays,
} from '@kapar/domain';
import { mondayIndex, parseISODate } from '@kapar/domain';

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

/**
 * "Sat, 25 May 2024" / "Саб, 25 мај 2026" — search fields.
 * Day-first with a 3-letter month in every locale (per the approved design),
 * capitalized short weekday.
 */
export function formatDowMediumDate(iso: string, locale: Locale): string {
  const date = parseISODate(iso);
  const raw = (WEEKDAYS_LONG[locale][mondayIndex(date)] ?? '').replace(/^e /, '').slice(0, 3);
  const dow = raw.charAt(0).toUpperCase() + raw.slice(1);
  const month = (MONTHS[locale][date.getMonth()] ?? '').slice(0, 3);
  return `${dow}, ${date.getDate()} ${month} ${date.getFullYear()}`;
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

