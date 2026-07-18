import { randomInt } from 'node:crypto';

import {
  addDaysISO,
  kaparPayByISO,
  PLATFORM_REFUND_TIERS,
  todayISO,
  type Booking,
  type BookingStatus,
  type CityKey,
  type Locale,
  type VenueType,
} from '@kapar/domain';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { type AuthUser, userFromRequest } from '../auth.js';
import { db } from '../db/client.js';
import { blockedDates, bookingEvents, bookings, halls, menuTiers, venues } from '../db/schema.js';
import { toVenue } from '../serialize.js';
import { applyTransition, loadBooking, toBooking } from './bookings.js';
import { ACTIVE_BOOKING_STATUSES, augmentBookedDates } from './venues.js';

/**
 * Vendor/extranet endpoints (Wave 3). One venue per owner in the MVP — the
 * couple-facing app never sees an unpublished venue unless the vendor who
 * owns it is asking. Wave 4 adds the write path (confirm/decline/kapar-received/
 * cancel) below the read-only inbox — always through applyTransition, never
 * a direct bookings.status write.
 */

type VenueRow = typeof venues.$inferSelect;
type HallRow = typeof halls.$inferSelect;
type MenuTierRow = typeof menuTiers.$inferSelect;
type BookingRow = typeof bookings.$inferSelect;
type EventRow = typeof bookingEvents.$inferSelect;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isISODate(v: unknown): v is string {
  return typeof v === 'string' && ISO_DATE_RE.test(v);
}

// Mirrors CITY_COORDS in src/data/venues.ts (app-side seed helper). Kept as a
// small local literal rather than importing across the app/server boundary;
// both must move together if a city gains a venue.
const CITY_COORDS: Record<CityKey, { lat: number; lng: number }> = {
  skopje: { lat: 41.9981, lng: 21.4254 },
  tetovo: { lat: 42.0106, lng: 20.9714 },
  gostivar: { lat: 41.8, lng: 20.9083 },
  ohrid: { lat: 41.1231, lng: 20.8016 },
  bitola: { lat: 41.0328, lng: 21.3347 },
  struga: { lat: 41.1778, lng: 20.6783 },
  kumanovo: { lat: 42.1322, lng: 21.7144 },
  prilep: { lat: 41.3464, lng: 21.5542 },
  veles: { lat: 41.7153, lng: 21.7753 },
  stip: { lat: 41.7414, lng: 22.195 },
  strumica: { lat: 41.4378, lng: 22.6431 },
  kavadarci: { lat: 41.4328, lng: 22.0117 },
  gevgelija: { lat: 41.1392, lng: 22.5017 },
};

const VENUE_TYPES: readonly VenueType[] = ['garden', 'lake', 'ballroom', 'terrace', 'panoramic', 'restaurant'];

function isCityKey(v: unknown): v is CityKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CITY_COORDS, v);
}

function isVenueType(v: unknown): v is VenueType {
  return typeof v === 'string' && (VENUE_TYPES as readonly string[]).includes(v);
}

function isPartialLocaleText(v: unknown): v is Partial<Record<Locale, string>> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.entries(v).every(([k, val]) => (k === 'mk' || k === 'sq' || k === 'en') && typeof val === 'string');
}

const SLUG_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** slug/id suffix: 4 random [a-z0-9] chars — collision-resistant enough for one-venue-per-owner MVP. */
function randomSlugSuffix(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += SLUG_SUFFIX_ALPHABET[randomInt(0, SLUG_SUFFIX_ALPHABET.length)];
  return s;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'venue';
}

function makeVenueId(name: string): string {
  return `${slugify(name)}-${randomSlugSuffix()}`;
}

/** 401 without a valid session, 403 for a couple-only account — the frozen contract for every /v1/vendor/* route. */
async function requireVendor(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  const user = await userFromRequest(req);
  if (!user) {
    reply.code(401).send({ error: 'unauthorized' });
    return null;
  }
  if (user.role !== 'vendor' && user.role !== 'both') {
    reply.code(403).send({ error: 'vendor_role_required' });
    return null;
  }
  return user;
}

async function getOwnerVenueRow(userId: string): Promise<VenueRow | undefined> {
  return db.select().from(venues).where(eq(venues.ownerUserId, userId)).limit(1).then((r) => r[0]);
}

/**
 * Ownership guard for the Wave 4 per-booking actions: 404 if the booking
 * doesn't exist, 403 if it exists but belongs to a venue this vendor doesn't
 * own. Never trusts the client — the venue row is re-checked on every call.
 */
async function getOwnedBookingRow(userId: string, bookingId: string): Promise<{ row: BookingRow } | { code: number; error: string }> {
  const row = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1).then((r) => r[0]);
  if (!row) return { code: 404, error: 'booking_not_found' };
  const venue = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1).then((r) => r[0]);
  if (!venue || venue.ownerUserId !== userId) return { code: 403, error: 'not_your_venue' };
  return { row };
}

/** Trim, cap at 500 chars, null if empty — the contract for decline/cancel reasons. */
function sanitizeReason(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

async function loadOwnerVenueFull(
  userId: string,
): Promise<{ row: VenueRow; hallRows: HallRow[]; tierRows: MenuTierRow[] } | undefined> {
  const row = await getOwnerVenueRow(userId);
  if (!row) return undefined;
  const [hallRows, tierRows] = await Promise.all([
    db.select().from(halls).where(eq(halls.venueId, row.id)),
    db.select().from(menuTiers).where(eq(menuTiers.venueId, row.id)),
  ]);
  return { row, hallRows, tierRows };
}

function validateCreateBody(b: Record<string, unknown>): string | null {
  if (typeof b.name !== 'string' || b.name.length < 2 || b.name.length > 80) return 'invalid_name';
  if (!isCityKey(b.city)) return 'invalid_city';
  if (!isVenueType(b.venueType)) return 'invalid_venue_type';
  if (typeof b.capacityMin !== 'number' || b.capacityMin < 10) return 'invalid_capacity_min';
  if (typeof b.capacityMax !== 'number' || b.capacityMax <= b.capacityMin) return 'invalid_capacity_max';
  if (typeof b.pricePerGuestMkd !== 'number' || b.pricePerGuestMkd < 200 || b.pricePerGuestMkd > 10000) return 'invalid_price';
  if (b.address !== undefined && typeof b.address !== 'string') return 'invalid_address';
  if (b.phone !== undefined && typeof b.phone !== 'string') return 'invalid_phone';
  if (b.description !== undefined && typeof b.description !== 'string') return 'invalid_description';
  return null;
}

function validatePatchBody(b: Record<string, unknown>, current: Pick<VenueRow, 'capacityMin' | 'capacityMax'>): string | null {
  if (b.name !== undefined && (typeof b.name !== 'string' || b.name.length < 2 || b.name.length > 80)) return 'invalid_name';
  if (b.city !== undefined && !isCityKey(b.city)) return 'invalid_city';
  if (b.venueType !== undefined && !isVenueType(b.venueType)) return 'invalid_venue_type';
  if (b.capacityMin !== undefined && (typeof b.capacityMin !== 'number' || b.capacityMin < 10)) return 'invalid_capacity_min';
  if (b.capacityMax !== undefined && typeof b.capacityMax !== 'number') return 'invalid_capacity_max';
  if (b.pricePerGuestMkd !== undefined && (typeof b.pricePerGuestMkd !== 'number' || b.pricePerGuestMkd < 200 || b.pricePerGuestMkd > 10000)) {
    return 'invalid_price';
  }
  if (b.address !== undefined && typeof b.address !== 'string') return 'invalid_address';
  if (b.phone !== undefined && typeof b.phone !== 'string') return 'invalid_phone';
  if (b.description !== undefined && !isPartialLocaleText(b.description)) return 'invalid_description';

  const nextMin = typeof b.capacityMin === 'number' ? b.capacityMin : current.capacityMin;
  const nextMax = typeof b.capacityMax === 'number' ? b.capacityMax : current.capacityMax;
  if (nextMax <= nextMin) return 'invalid_capacity_max';
  return null;
}

async function calendarPayload(venueId: string, fromISO: string, toISO: string) {
  const [bookingRows, blockedRows] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.venueId, venueId),
          inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
          gte(bookings.eventDate, fromISO),
          lte(bookings.eventDate, toISO),
        ),
      ),
    db
      .select()
      .from(blockedDates)
      .where(and(eq(blockedDates.venueId, venueId), gte(blockedDates.date, fromISO), lte(blockedDates.date, toISO))),
  ]);
  return {
    booked: bookingRows.map((r) => ({
      date: r.eventDate,
      bookingId: r.id,
      status: r.status,
      contactName: r.contactName,
      guestCount: r.guestCount,
    })),
    blocked: blockedRows.map((r) => r.date),
  };
}

function lastDayOfMonthISO(dateISO: string): string {
  const [y, m] = dateISO.split('-').map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this one
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

// Local duplicate of bookings.ts's private toBooking — kept unexported there,
// so this wave's read-only vendor inbox gets a small copy rather than a
// cross-file export. Revisit if Wave 4's confirm/decline wants to share it.

export async function vendorRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/vendor/venues', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;

    const b = (req.body ?? {}) as Record<string, unknown>;
    const err = validateCreateBody(b);
    if (err) return reply.code(400).send({ error: err });

    const existing = await getOwnerVenueRow(user.id);
    if (existing) return reply.code(409).send({ error: 'venue_exists' });

    const name = b.name as string;
    const city = b.city as CityKey;
    const venueType = b.venueType as VenueType;
    const capacityMin = b.capacityMin as number;
    const capacityMax = b.capacityMax as number;
    const pricePerGuestMkd = b.pricePerGuestMkd as number;
    // Single-language onboarding (MVP): the vendor writes one description and
    // it's copied to all three locales verbatim. Per-locale translation
    // editing is a later slice.
    const descriptionText = typeof b.description === 'string' ? b.description : '';
    const description: Record<Locale, string> = { mk: descriptionText, sq: descriptionText, en: descriptionText };
    const id = makeVenueId(name);

    await db.transaction(async (tx) => {
      await tx.insert(venues).values({
        id,
        slug: id,
        published: false,
        name,
        city,
        venueType,
        address: typeof b.address === 'string' ? b.address : '',
        phone: typeof b.phone === 'string' ? b.phone : '',
        photos: [],
        capacityMin,
        capacityMax,
        amenities: [],
        included: ['tablesChairs', 'lightingSound', 'parking'],
        foodOptions: ['traditional'],
        scores: { food: 0, service: 0, organization: 0, location: 0, value: 0 },
        houseRules: { musicUntil: '01:00', fireworksAllowed: false, ownAlcoholAllowed: false, ownDecorAllowed: false },
        coords: CITY_COORDS[city],
        nearby: [],
        description,
        rating: 0,
        reviewCount: 0,
        verified: false,
        responseTimeHours: 24,
        featured: false,
        kaparPolicy: { kind: 'percent', percentOfEstimate: 10, minAmountMkd: 15000, refundTiers: [...PLATFORM_REFUND_TIERS] },
        bookedDates: [],
        ownerUserId: user.id,
      });
      await tx.insert(halls).values({
        id: 'main',
        venueId: id,
        name: { mk: 'Главна сала', sq: 'Salla kryesore', en: 'Main Hall' },
        capacityMin,
        capacityMax,
        indoor: venueType === 'ballroom' || venueType === 'restaurant',
        areaM2: Math.max(120, Math.round(capacityMax * 1.1)),
        pricePerGuestAdjMkd: 0,
        sort: 0,
      });
      await tx.insert(menuTiers).values({
        id: 'classic',
        venueId: id,
        name: { mk: 'Класик', sq: 'Klasik', en: 'Classic' },
        description: { mk: '', sq: '', en: '' },
        pricePerGuestMkd,
        sort: 0,
      });
    });

    const full = await loadOwnerVenueFull(user.id);
    return reply.code(201).send(toVenue(full!.row, full!.hallRows, full!.tierRows));
  });

  app.get('/v1/vendor/my-venue', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const full = await loadOwnerVenueFull(user.id);
    if (!full) return reply.code(404).send({ error: 'no_venue' });
    const venue = toVenue(full.row, full.hallRows, full.tierRows);
    const augmented = await augmentBookedDates([full.row]);
    venue.bookedDates = augmented.get(full.row.id) ?? venue.bookedDates;
    return venue;
  });

  app.patch('/v1/vendor/my-venue', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const row = await getOwnerVenueRow(user.id);
    if (!row) return reply.code(404).send({ error: 'no_venue' });

    const b = (req.body ?? {}) as Record<string, unknown>;
    const err = validatePatchBody(b, row);
    if (err) return reply.code(400).send({ error: err });

    const venuePatch: Partial<typeof venues.$inferInsert> = {};
    if (typeof b.name === 'string') venuePatch.name = b.name;
    if (isCityKey(b.city)) venuePatch.city = b.city;
    if (isVenueType(b.venueType)) venuePatch.venueType = b.venueType;
    if (typeof b.capacityMin === 'number') venuePatch.capacityMin = b.capacityMin;
    if (typeof b.capacityMax === 'number') venuePatch.capacityMax = b.capacityMax;
    if (typeof b.address === 'string') venuePatch.address = b.address;
    if (typeof b.phone === 'string') venuePatch.phone = b.phone;
    if (isPartialLocaleText(b.description)) venuePatch.description = { ...row.description, ...b.description };

    await db.transaction(async (tx) => {
      if (Object.keys(venuePatch).length) await tx.update(venues).set(venuePatch).where(eq(venues.id, row.id));
      if (venuePatch.capacityMin !== undefined || venuePatch.capacityMax !== undefined) {
        await tx
          .update(halls)
          .set({
            capacityMin: venuePatch.capacityMin ?? row.capacityMin,
            capacityMax: venuePatch.capacityMax ?? row.capacityMax,
          })
          .where(and(eq(halls.venueId, row.id), eq(halls.id, 'main')));
      }
      if (typeof b.pricePerGuestMkd === 'number') {
        await tx
          .update(menuTiers)
          .set({ pricePerGuestMkd: b.pricePerGuestMkd })
          .where(and(eq(menuTiers.venueId, row.id), eq(menuTiers.id, 'classic')));
      }
    });

    const full = await loadOwnerVenueFull(user.id);
    return toVenue(full!.row, full!.hallRows, full!.tierRows);
  });

  // Self-serve publish for MVP — a DELIBERATE deviation from the admin-review
  // backlog item (BACKLOG.md), until an admin surface exists to gate it.
  app.post('/v1/vendor/my-venue/publish', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const row = await getOwnerVenueRow(user.id);
    if (!row) return reply.code(404).send({ error: 'no_venue' });

    const published = (req.body as { published?: unknown } | undefined)?.published;
    if (typeof published !== 'boolean') return reply.code(400).send({ error: 'invalid_published' });

    await db.update(venues).set({ published }).where(eq(venues.id, row.id));
    const full = await loadOwnerVenueFull(user.id);
    return toVenue(full!.row, full!.hallRows, full!.tierRows);
  });

  app.get<{ Querystring: { from?: string; to?: string } }>('/v1/vendor/my-venue/calendar', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const row = await getOwnerVenueRow(user.id);
    if (!row) return reply.code(404).send({ error: 'no_venue' });

    const fromISO = isISODate(req.query.from) ? req.query.from : todayISO();
    const toISO = isISODate(req.query.to) ? req.query.to : addDaysISO(fromISO, 365);
    return calendarPayload(row.id, fromISO, toISO);
  });

  app.put<{ Body: { date?: string; blocked?: boolean } }>('/v1/vendor/my-venue/blocked-dates', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const row = await getOwnerVenueRow(user.id);
    if (!row) return reply.code(404).send({ error: 'no_venue' });

    const { date, blocked } = req.body ?? {};
    if (!isISODate(date) || typeof blocked !== 'boolean') return reply.code(400).send({ error: 'invalid_body' });

    if (blocked) {
      const activeBooking = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.venueId, row.id), eq(bookings.eventDate, date), inArray(bookings.status, ACTIVE_BOOKING_STATUSES)))
        .limit(1)
        .then((r) => r[0]);
      if (activeBooking) return reply.code(409).send({ error: 'date_booked' });
      await db.insert(blockedDates).values({ venueId: row.id, date }).onConflictDoNothing();
    } else {
      await db.delete(blockedDates).where(and(eq(blockedDates.venueId, row.id), eq(blockedDates.date, date)));
    }

    const monthStart = `${date.slice(0, 7)}-01`;
    return calendarPayload(row.id, monthStart, lastDayOfMonthISO(date));
  });

  app.get('/v1/vendor/my-venue/bookings', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const row = await getOwnerVenueRow(user.id);
    if (!row) return reply.code(404).send({ error: 'no_venue' });

    const bookingRows = await db.select().from(bookings).where(eq(bookings.venueId, row.id)).orderBy(desc(bookings.createdAt));
    if (!bookingRows.length) return [];
    const ids = bookingRows.map((r) => r.id);
    const [events, hallRows] = await Promise.all([
      db.select().from(bookingEvents).where(inArray(bookingEvents.bookingId, ids)),
      db.select().from(halls).where(eq(halls.venueId, row.id)),
    ]);
    return bookingRows.map((r) =>
      toBooking(
        r,
        events.filter((e) => e.bookingId === r.id),
        row,
        r.hallId ? hallRows.find((h) => h.id === r.hallId)?.name.mk : undefined,
      ),
    );
  });

  // Venue confirms the hold — the real-vendor counterpart to the legacy
  // /v1/bookings/:id/confirm (now vendor_only-locked for owned venues).
  app.post<{ Params: { id: string } }>('/v1/vendor/bookings/:id/confirm', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const owned = await getOwnedBookingRow(user.id, req.params.id);
    if ('error' in owned) return reply.code(owned.code).send({ error: owned.error });

    const result = await applyTransition(owned.row.id, 'reserved', {
      payBy: kaparPayByISO(new Date().toISOString(), owned.row.eventDate),
    });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(owned.row.id);
  });

  // Venue declines an unanswered request. Only legal from pending_kapar —
  // once a hold is confirmed or paid, that's a cancel, not a decline.
  app.post<{ Params: { id: string }; Body: { reason?: string } }>('/v1/vendor/bookings/:id/decline', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const owned = await getOwnedBookingRow(user.id, req.params.id);
    if ('error' in owned) return reply.code(owned.code).send({ error: owned.error });

    if (owned.row.status !== 'pending_kapar') {
      return reply.code(409).send({ error: `illegal_transition:${owned.row.status}->cancelled_by_venue` });
    }
    const reason = sanitizeReason((req.body as { reason?: unknown } | undefined)?.reason);
    // Nothing is paid at pending_kapar, so no refund patch — this is a free decline.
    const result = await applyTransition(owned.row.id, 'cancelled_by_venue', { cancelReason: reason });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(owned.row.id);
  });

  // Venue marks the kapar received at the visit — the real-vendor counterpart
  // to the legacy /v1/bookings/:id/kapar-received.
  app.post<{ Params: { id: string } }>('/v1/vendor/bookings/:id/kapar-received', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const owned = await getOwnedBookingRow(user.id, req.params.id);
    if ('error' in owned) return reply.code(owned.code).send({ error: owned.error });

    const result = await applyTransition(owned.row.id, 'confirmed', { kaparPaidAt: new Date() });
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(owned.row.id);
  });

  // Venue cancels a reserved/confirmed booking. Venue-initiated is ALWAYS a
  // 100% refund once the kapar was paid — platform policy, not the ladder.
  app.post<{ Params: { id: string }; Body: { reason?: string } }>('/v1/vendor/bookings/:id/cancel', async (req, reply) => {
    const user = await requireVendor(req, reply);
    if (!user) return;
    const owned = await getOwnedBookingRow(user.id, req.params.id);
    if ('error' in owned) return reply.code(owned.code).send({ error: owned.error });

    const row = owned.row;
    if (row.status !== 'reserved' && row.status !== 'confirmed') {
      return reply.code(409).send({ error: `illegal_transition:${row.status}->cancelled_by_venue` });
    }
    const reason = sanitizeReason((req.body as { reason?: unknown } | undefined)?.reason);
    const patch: Partial<typeof bookings.$inferInsert> = { cancelReason: reason };
    if (row.kaparPaidAt) {
      patch.refundPercent = 100;
      patch.refundAmountMkd = row.kaparMkd;
    }
    const result = await applyTransition(row.id, 'cancelled_by_venue', patch);
    if (!result.ok) return reply.code(result.code).send({ error: result.error });
    return loadBooking(row.id);
  });
}
