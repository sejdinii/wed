import { randomBytes, randomInt } from 'node:crypto';

import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyBaseLogger, FastifyRequest } from 'fastify';

import { db } from './db/client.js';
import { authCodes, sessions, users } from './db/schema.js';

export type UserRole = 'couple' | 'vendor' | 'both';

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole;
  name: string | null;
}

type UserRow = typeof users.$inferSelect;
type AuthCodeRow = typeof authCodes.$inferSelect;

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const SESSION_TTL_DAYS = 30;
// Window and threshold for request-code rate limiting.
export const RATE_LIMIT_WINDOW_MINUTES = 10;
export const RATE_LIMIT_MAX_CODES = 3;
export const MAX_VERIFY_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(destination: unknown): destination is string {
  return typeof destination === 'string' && EMAIL_RE.test(destination);
}

export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, '0');
}

/** 48 hex chars, per contract. */
export function generateSessionToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Provider abstraction — the only implementation today logs via the fastify
 * logger. Resend (email) plugs in behind this same signature later; SMS
 * channels reuse it too once the channel is added (request-code is already
 * channel-pluggable).
 */
export function sendCode(logger: FastifyBaseLogger, channel: string, destination: string, code: string): void {
  logger.info(`[auth] sendCode channel=${channel} destination=${destination} code=${code}`);
}

function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, role: row.role as UserRole, name: row.name };
}

/**
 * Failed-verify attempts per auth_codes row id. Module-level + in-memory:
 * resets on server restart, which only re-opens a 10min brute-force window
 * at worst since codes expire on their own after CODE_TTL_MINUTES anyway.
 */
const verifyAttempts = new Map<string, number>();

export function recordFailedAttempt(codeRowId: string): number {
  const next = (verifyAttempts.get(codeRowId) ?? 0) + 1;
  verifyAttempts.set(codeRowId, next);
  return next;
}

export function clearAttempts(codeRowId: string): void {
  verifyAttempts.delete(codeRowId);
}

/** Newest unconsumed, unexpired code for a destination — what verify checks against. */
export async function findActiveCode(destination: string): Promise<AuthCodeRow | undefined> {
  return db
    .select()
    .from(authCodes)
    .where(and(eq(authCodes.destination, destination), isNull(authCodes.consumedAt), gt(authCodes.expiresAt, new Date())))
    .orderBy(desc(authCodes.expiresAt))
    .limit(1)
    .then((r) => r[0]);
}

/**
 * auth_codes has no createdAt column; expiresAt is always createdAt +
 * CODE_TTL_MINUTES, so "unconsumed and not yet expired" IS "created within
 * the last CODE_TTL_MINUTES" — the same window the rate limit cares about.
 */
export async function countActiveCodes(destination: string): Promise<number> {
  const rows = await db
    .select()
    .from(authCodes)
    .where(and(eq(authCodes.destination, destination), isNull(authCodes.consumedAt), gt(authCodes.expiresAt, new Date())));
  return rows.length;
}

export async function consumeCode(id: string): Promise<void> {
  await db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, id));
}

export async function findOrCreateUserByEmail(email: string): Promise<AuthUser> {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1).then((r) => r[0]);
  if (existing) return toAuthUser(existing);
  const created = await db.insert(users).values({ email, role: 'couple' }).returning().then((r) => r[0]);
  if (!created) throw new Error('user_insert_failed');
  return toAuthUser(created);
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

/**
 * Optional-auth helper for routes that work with or without a session
 * (bookings). Never throws: missing header, unknown token, and expired
 * sessions all resolve to null rather than rejecting the request.
 */
export async function userFromRequest(req: FastifyRequest): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1)
    .then((r) => r[0]);
  if (!row || row.session.expiresAt.getTime() < Date.now()) return null;
  return toAuthUser(row.user);
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}
