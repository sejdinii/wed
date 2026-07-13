import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import {
  clearAttempts,
  consumeCode,
  countActiveCodes,
  CODE_TTL_MINUTES,
  findActiveCode,
  findOrCreateUserByEmail,
  generateCode,
  isValidEmail,
  MAX_VERIFY_ATTEMPTS,
  RATE_LIMIT_MAX_CODES,
  recordFailedAttempt,
  createSession,
  sendCode,
  setUserRole,
  userFromRequest,
} from '../auth.js';
import { db } from '../db/client.js';
import { authCodes, bookings } from '../db/schema.js';

interface RequestCodeBody {
  channel?: string;
  destination?: string;
}

interface VerifyBody {
  destination?: string;
  code?: string;
  deviceId?: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: RequestCodeBody }>('/v1/auth/request-code', async (req, reply) => {
    const { channel, destination } = req.body ?? {};
    // Channel-pluggable by design: only 'email' exists today, SMS is a
    // fast-follow behind the same endpoint shape.
    if (channel !== 'email') return reply.code(400).send({ error: 'unsupported_channel' });
    if (!isValidEmail(destination)) return reply.code(400).send({ error: 'invalid_destination' });

    if ((await countActiveCodes(destination)) >= RATE_LIMIT_MAX_CODES) {
      return reply.code(429).send({ error: 'too_many_codes' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
    await db.insert(authCodes).values({ destination, channel, code, expiresAt });
    sendCode(req.log, channel, destination, code);

    return reply.send({
      ok: true,
      // devCode lets dev builds + tests read the code without a real
      // provider; NEVER sent once NODE_ENV is production.
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  });

  app.post<{ Body: VerifyBody }>('/v1/auth/verify', async (req, reply) => {
    const { destination, code, deviceId } = req.body ?? {};
    if (!destination || !code) return reply.code(401).send({ error: 'bad_code' });

    const row = await findActiveCode(destination);
    if (!row || row.code !== code) {
      if (row) {
        const attempts = recordFailedAttempt(row.id);
        if (attempts >= MAX_VERIFY_ATTEMPTS) {
          await consumeCode(row.id);
          clearAttempts(row.id);
        }
      }
      return reply.code(401).send({ error: 'bad_code' });
    }
    clearAttempts(row.id);
    await consumeCode(row.id);

    const user = await findOrCreateUserByEmail(destination);
    const token = await createSession(user.id);

    if (deviceId) {
      await db.update(bookings).set({ userId: user.id }).where(and(eq(bookings.deviceId, deviceId), isNull(bookings.userId)));
    }

    return reply.send({ token, user });
  });

  app.get('/v1/me', async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    return reply.send({ user });
  });

  app.post('/v1/me/become-vendor', async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    // 'couple' -> 'both'; 'vendor'/'both' are already-vendor states, no-op.
    const role = user.role === 'couple' ? 'both' : user.role;
    if (role !== user.role) await setUserRole(user.id, role);
    return reply.send({ user: { ...user, role } });
  });
}
