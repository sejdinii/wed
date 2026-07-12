/**
 * Pure date math over ISO `YYYY-MM-DD` strings — the only date wire format in
 * Kapar. No Intl, no libraries: identical output on device, web, and server.
 * Locale-facing FORMATTERS stay in the app (src/lib/dates.ts); only pure math
 * lives here so the server can share it.
 */

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
