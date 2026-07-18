import { Platform } from 'react-native';

import { addDaysISO } from '@/lib/dates';

/**
 * Minimal RFC 5545 .ics builder — no external dependency for a single VEVENT.
 * Used by the booking status screen's "Add to calendar" action (web only;
 * native waits for expo-calendar, which can't be run-verified in this wave).
 */
export interface IcsEventInput {
  /** Stable identifier for the event, e.g. `${bookingId}@kapar.mk`. */
  uid: string;
  /** Venue name — rendered as the calendar event title. */
  summary: string;
  /** Event date, `YYYY-MM-DD` (all-day event, local — never UTC). */
  dateISO: string;
  /** Venue address (falls back to city name when unavailable). */
  location?: string;
  /** Booking code line, shown in the event notes. */
  description?: string;
}

function icsDateStamp(iso: string): string {
  return iso.replace(/-/g, '');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC "now" timestamp in the DTSTAMP format ics requires. */
function dtstampNow(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(
    now.getUTCMinutes(),
  )}${pad(now.getUTCSeconds())}Z`;
}

/** Escapes text per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Builds a single-VEVENT .ics file as a string (CRLF line endings per spec). */
export function buildIcsContent(event: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kapar//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtstampNow()}`,
    // All-day event: DTEND is exclusive, so it's the following day.
    `DTSTART;VALUE=DATE:${icsDateStamp(event.dateISO)}`,
    `DTEND;VALUE=DATE:${icsDateStamp(addDaysISO(event.dateISO, 1))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the .ics content via a Blob + anchor click.
 * No-op off web — native support (expo-calendar) lands separately once it
 * can be run-verified.
 */
export function downloadIcsFile(filename: string, content: string): void {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
