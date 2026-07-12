import Fastify from 'fastify';

import { venueRoutes } from './routes/venues.js';

/** App factory — shared by `src/index.ts` (listen) and tests (inject). */
export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  app.get('/health', async () => ({ ok: true }));
  app.register(venueRoutes);

  return app;
}
