import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { userFromRequest } from '../auth.js';
import { db } from '../db/client.js';
import { bookings, notifications, venues } from '../db/schema.js';

type NotificationRow = typeof notifications.$inferSelect;

const LIST_LIMIT = 50;

interface NotificationBookingSummary {
  venueName: string;
  contactName: string;
  eventDateISO: string;
  status: string;
}

interface NotificationItem {
  id: string;
  kind: string;
  bookingId: string | null;
  createdAtISO: string;
  readAtISO?: string;
  booking?: NotificationBookingSummary;
}

/**
 * Batches the booking (+ venue) lookups for a page of notification rows —
 * one query per table regardless of how many rows reference a booking, never
 * N+1. Rows whose booking has since vanished (shouldn't happen: bookingId
 * cascades on delete, so the notification would be gone too) just omit
 * `booking` rather than 500ing.
 */
async function loadBookingSummaries(rows: NotificationRow[]): Promise<Map<string, NotificationBookingSummary>> {
  const bookingIds = [...new Set(rows.map((r) => r.bookingId).filter((id): id is string => id !== null))];
  const summaries = new Map<string, NotificationBookingSummary>();
  if (bookingIds.length === 0) return summaries;

  const bookingRows = await db
    .select({
      id: bookings.id,
      venueId: bookings.venueId,
      contactName: bookings.contactName,
      eventDate: bookings.eventDate,
      status: bookings.status,
    })
    .from(bookings)
    .where(inArray(bookings.id, bookingIds));

  const venueIds = [...new Set(bookingRows.map((b) => b.venueId))];
  const venueRows = venueIds.length
    ? await db.select({ id: venues.id, name: venues.name }).from(venues).where(inArray(venues.id, venueIds))
    : [];
  const venueNameById = new Map(venueRows.map((v) => [v.id, v.name]));

  for (const b of bookingRows) {
    summaries.set(b.id, {
      venueName: venueNameById.get(b.venueId) ?? '',
      contactName: b.contactName,
      eventDateISO: b.eventDate,
      status: b.status,
    });
  }
  return summaries;
}

function toItem(row: NotificationRow, bookingSummaries: Map<string, NotificationBookingSummary>): NotificationItem {
  const booking = row.bookingId ? bookingSummaries.get(row.bookingId) : undefined;
  return {
    id: row.id,
    kind: row.kind,
    bookingId: row.bookingId,
    createdAtISO: row.createdAt.toISOString(),
    ...(row.readAt ? { readAtISO: row.readAt.toISOString() } : {}),
    ...(booking ? { booking } : {}),
  };
}

/**
 * Wave 5: the in-app notification center's read side + mark-read. Rows are
 * fanned out elsewhere (bookings.ts's applyTransition + create path) — this
 * module only ever reads and mutates readAt, never inserts.
 */
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/notifications', async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.code(401).send({ error: 'unauthorized' });

    const [rows, unreadRows] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(LIST_LIMIT),
      db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    ]);

    const bookingSummaries = await loadBookingSummaries(rows);
    return {
      unreadCount: unreadRows.length,
      items: rows.map((r) => toItem(r, bookingSummaries)),
    };
  });

  app.post<{ Body: { ids?: string[] } }>('/v1/notifications/read', async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.code(401).send({ error: 'unauthorized' });

    const rawIds = req.body?.ids;
    // Absent `ids` = mark every unread row of the caller's read; a present
    // array (even empty) scopes to exactly those ids. Either way the WHERE
    // always pins userId — a client can never mark someone else's row read.
    const idList = Array.isArray(rawIds) ? rawIds.filter((id): id is string => typeof id === 'string') : undefined;
    // An explicit empty array means "nothing to mark" — skip the query
    // rather than hand drizzle an empty inArray() (which some versions turn
    // into invalid SQL rather than a no-op).
    if (idList && idList.length === 0) return reply.code(200).send({ ok: true });

    const conditions = [eq(notifications.userId, user.id), isNull(notifications.readAt)];
    if (idList) conditions.push(inArray(notifications.id, idList));

    await db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
    return reply.code(200).send({ ok: true });
  });
}
