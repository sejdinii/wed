import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { authRoutes } from './routes/auth.js';
import { bookingRoutes } from './routes/bookings.js';
import { messageRoutes } from './routes/messages.js';
import { notificationRoutes } from './routes/notifications.js';
import { vendorRoutes } from './routes/vendor.js';
import { venueRoutes } from './routes/venues.js';

/** App factory — shared by `src/index.ts` (listen) and tests (inject). */
export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  // Wide-open CORS for the dev catalogue. Tighten to the app's origins when
  // real deployment lands. methods must be explicit: the plugin's default
  // allow-list stops at POST, silently blocking the vendor PUT endpoints.
  app.register(cors, { origin: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] });

  // Per-IP rate limiting (Wave 6 hardening). Skipped under test: vitest's
  // inject() traffic would trip any meaningful ceiling. The auth-code
  // endpoint keeps its own per-destination counter on top of this.
  if (process.env.NODE_ENV !== 'test') {
    app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  }

  app.get('/health', async () => ({ ok: true }));
  app.register(venueRoutes);
  app.register(bookingRoutes);
  app.register(authRoutes);
  app.register(vendorRoutes);
  app.register(messageRoutes);
  app.register(notificationRoutes);

  return app;
}
