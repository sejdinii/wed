import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type {
  AmenityKey,
  FoodOptionKey,
  HouseRules,
  IncludedKey,
  KaparPolicy,
  Locale,
  VenueScores,
} from '@kapar/domain';

/**
 * Schema v1 (Wave 0). Read paths (venues/halls/menus/reviews) are live now;
 * bookings/users/auth tables are defined here so Wave 1–2 migrate, not
 * redesign. Per-locale and deeply-nested content is JSONB (vendors edit those
 * blobs wholesale); halls and menu tiers are rows because vendors manage them
 * individually in the Wave-3 extranet.
 */

type LocaleText = Record<Locale, string>;

export const venues = pgTable('venues', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  published: boolean('published').notNull().default(false),
  name: text('name').notNull(),
  city: text('city').notNull(),
  venueType: text('venue_type').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  photos: jsonb('photos').$type<string[]>().notNull(),
  capacityMin: integer('capacity_min').notNull(),
  capacityMax: integer('capacity_max').notNull(),
  amenities: jsonb('amenities').$type<AmenityKey[]>().notNull(),
  included: jsonb('included').$type<IncludedKey[]>().notNull(),
  foodOptions: jsonb('food_options').$type<FoodOptionKey[]>().notNull(),
  scores: jsonb('scores').$type<VenueScores>().notNull(),
  houseRules: jsonb('house_rules').$type<HouseRules>().notNull(),
  coords: jsonb('coords').$type<{ lat: number; lng: number }>().notNull(),
  nearby: jsonb('nearby').$type<{ label: LocaleText; km: number }[]>().notNull(),
  description: jsonb('description').$type<LocaleText>().notNull(),
  rating: real('rating').notNull(),
  reviewCount: integer('review_count').notNull().default(0),
  verified: boolean('verified').notNull().default(false),
  responseTimeHours: integer('response_time_hours').notNull().default(24),
  featured: boolean('featured').notNull().default(false),
  kaparPolicy: jsonb('kapar_policy').$type<KaparPolicy>().notNull(),
  /** Wave 0 stopgap: seeded blocked dates. Vendor-managed blocks live in
   * blocked_dates (Wave 3); this jsonb remains only for seed venues. */
  bookedDates: jsonb('booked_dates').$type<string[]>().notNull().default([]),
  /** Wave 3: vendor-created venues carry their owner; seeds stay unowned. */
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Vendor-blocked dates — the "closed by the venue" third calendar state
 * (accepted deviation from Booking.com's binary calendar: booked ≠ blocked).
 * Booked dates come from the bookings table; these are manual closures.
 */
export const blockedDates = pgTable(
  'blocked_dates',
  {
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.date] })],
);

export const halls = pgTable(
  'halls',
  {
    id: text('id').notNull(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: jsonb('name').$type<LocaleText>().notNull(),
    capacityMin: integer('capacity_min').notNull(),
    capacityMax: integer('capacity_max').notNull(),
    indoor: boolean('indoor').notNull(),
    areaM2: integer('area_m2').notNull(),
    pricePerGuestAdjMkd: integer('price_per_guest_adj_mkd').notNull().default(0),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.id] })],
);

export const menuTiers = pgTable(
  'menu_tiers',
  {
    id: text('id').notNull(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: jsonb('name').$type<LocaleText>().notNull(),
    description: jsonb('description').$type<LocaleText>().notNull(),
    pricePerGuestMkd: integer('price_per_guest_mkd').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.id] })],
);

/** Display-only seeds for now (reviews write path CUT from MVP 2026-07-12). */
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  venueId: text('venue_id')
    .notNull()
    .references(() => venues.id, { onDelete: 'cascade' }),
  author: text('author').notNull(),
  score: real('score').notNull(),
  eventDate: date('event_date').notNull(),
  guestCount: integer('guest_count').notNull(),
  positive: text('positive').notNull(),
  negative: text('negative'),
});

// ——— Wave 1–2 tables (schema now, endpoints later) ———

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  phone: text('phone'),
  name: text('name'),
  /** couple | vendor | both — refined in Wave 2. */
  role: text('role').notNull().default('couple'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Channel-pluggable OTP (email now, SMS fast-follow — decision 2026-07-12). */
export const authCodes = pgTable('auth_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  destination: text('destination').notNull(),
  channel: text('channel').notNull().default('email'),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    confirmationCode: text('confirmation_code').notNull().unique(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    userId: uuid('user_id').references(() => users.id),
    /** Pre-auth owner scoping (Wave 1). Wave 2 claims device bookings into accounts. */
    deviceId: text('device_id'),
    eventDate: date('event_date').notNull(),
    guestCount: integer('guest_count').notNull(),
    menuTierId: text('menu_tier_id').notNull(),
    hallId: text('hall_id'),
    estimatedTotalMkd: integer('estimated_total_mkd').notNull(),
    kaparMkd: integer('kapar_mkd').notNull(),
    balanceDueMkd: integer('balance_due_mkd').notNull(),
    status: text('status').notNull().default('pending_kapar'),
    contactName: text('contact_name').notNull(),
    contactPhone: text('contact_phone').notNull(),
    specialRequests: text('special_requests'),
    payBy: date('pay_by'),
    kaparPaidAt: timestamp('kapar_paid_at', { withTimezone: true }),
    refundPercent: integer('refund_percent'),
    refundAmountMkd: integer('refund_amount_mkd'),
    // Wave 4: optional vendor-supplied reason on decline/cancel — shown to the
    // couple; free text, never parsed.
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // THE double-booking guard: one active booking per venue+date, enforced
    // by the database, not the client. Cancel/expiry frees the date because
    // the row leaves the partial index.
    uniqueIndex('one_active_booking_per_venue_date')
      .on(t.venueId, t.eventDate)
      .where(sqlActiveStatuses()),
  ],
);

export const bookingEvents = pgTable('booking_events', {
  id: serial('id').primaryKey(),
  bookingId: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Wave 5: real couple↔vendor chat. One thread per booking; sender is a role,
 * not a user id — each booking has exactly one couple and one venue side.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    senderRole: text('sender_role').notNull(), // 'couple' | 'vendor'
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_booking_idx').on(t.bookingId, t.createdAt)],
);

/**
 * Wave 5: durable in-app notification inbox (the Uber "push inbox" pattern —
 * this table is the source of truth; push channels layer on later). Rows are
 * only ever created from REAL events; an unread badge must be earned.
 * kind: 'booking_request' | 'booking_<status>' | 'message'.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookingId: text('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

function sqlActiveStatuses() {
  return sql`status IN ('pending_kapar', 'reserved', 'confirmed')`;
}
