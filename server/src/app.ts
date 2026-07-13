import cors from '@fastify/cors';
import Fastify from 'fastify';

import { authRoutes } from './routes/auth.js';
import { bookingRoutes } from './routes/bookings.js';
import { venueRoutes } from './routes/venues.js';

/** App factory — shared by `src/index.ts` (listen) and tests (inject). */
export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  // Wide-open CORS for the dev catalogue. Tighten to the app's origins when
  // auth lands in Wave 2 (credentials change the CORS rules).
  app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true }));
  app.register(venueRoutes);
  app.register(bookingRoutes);
  app.register(authRoutes);

  return app;
}
