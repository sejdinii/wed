import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { type AuthUser, userFromRequest } from '../auth.js';
import { db } from '../db/client.js';
import { bookings, messages, notifications, venues } from '../db/schema.js';

/**
 * Wave 5: real couple <-> vendor chat, one thread per booking. Replaces the
 * scripted venueBot fiction (mock-only, src/data/venueBot.ts) with a durable
 * server thread. Authorization mirrors the booking-access pattern already
 * established in bookings.ts: a bearer session OR (device-only booking) a
 * matching deviceId.
 */

type BookingRow = typeof bookings.$inferSelect;
type VenueRow = typeof venues.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

interface MessageDTO {
  id: string;
  senderRole: 'couple' | 'vendor';
  body: string;
  createdAtISO: string;
}

function toMessage(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    senderRole: row.senderRole as 'couple' | 'vendor',
    body: row.body,
    createdAtISO: row.createdAt.toISOString(),
  };
}

async function loadBookingRow(id: string): Promise<BookingRow | undefined> {
  return db.select().from(bookings).where(eq(bookings.id, id)).limit(1).then((r) => r[0]);
}

/**
 * Which side of the thread the caller is on, or null (→ 403) if neither:
 *  - vendor: bearer user owns the booking's venue (venue.ownerUserId)
 *  - couple: bearer user matches booking.userId, OR — device-only bookings
 *    (no userId) — the request's deviceId matches booking.deviceId, the same
 *    rule that keeps device-only couples able to see their booking list.
 */
async function resolveSide(
  row: BookingRow,
  authUser: AuthUser | null,
  deviceId: string | undefined,
): Promise<{ side: 'couple' | 'vendor'; venue: VenueRow } | null> {
  const venue = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
  if (!venue) return null;
  if (authUser && venue.ownerUserId === authUser.id) return { side: 'vendor', venue };
  if (authUser && row.userId && row.userId === authUser.id) return { side: 'couple', venue };
  if (!row.userId && deviceId && row.deviceId === deviceId) return { side: 'couple', venue };
  return null;
}

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string }; Querystring: { deviceId?: string } }>('/v1/bookings/:id/messages', async (req, reply) => {
    const row = await loadBookingRow(req.params.id);
    if (!row) return reply.code(404).send({ error: 'booking_not_found' });

    const authUser = await userFromRequest(req);
    const resolved = await resolveSide(row, authUser, req.query.deviceId);
    if (!resolved) return reply.code(403).send({ error: 'access_denied' });

    const rows = await db.select().from(messages).where(eq(messages.bookingId, row.id)).orderBy(asc(messages.createdAt));
    return rows.map(toMessage);
  });

  app.post<{ Params: { id: string }; Querystring: { deviceId?: string }; Body: { body?: unknown } }>(
    '/v1/bookings/:id/messages',
    async (req, reply) => {
      const row = await loadBookingRow(req.params.id);
      if (!row) return reply.code(404).send({ error: 'booking_not_found' });

      const authUser = await userFromRequest(req);
      const resolved = await resolveSide(row, authUser, req.query.deviceId);
      if (!resolved) return reply.code(403).send({ error: 'access_denied' });

      const raw = req.body?.body;
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (!trimmed) return reply.code(400).send({ error: 'empty_body' });
      const capped = trimmed.slice(0, 2000);

      const { side, venue } = resolved;
      const created = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(messages)
          .values({ bookingId: row.id, senderRole: side, body: capped })
          .returning()
          .then((r) => r[0]);
        if (!inserted) throw new Error('message_insert_failed');

        // Notify the COUNTERPART only — never the sender. Skipped when the
        // counterpart has no user id yet (ownerless venue / device-only couple).
        const counterpartUserId = side === 'couple' ? venue.ownerUserId : row.userId;
        if (counterpartUserId) {
          await tx.insert(notifications).values({ userId: counterpartUserId, bookingId: row.id, kind: 'message' });
        }
        return inserted;
      });

      return reply.code(201).send(toMessage(created));
    },
  );
}
