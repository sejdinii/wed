import cors from '@fastify/cors';
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

  app.get('/health', async () => ({ ok: true }));
  app.register(venueRoutes);
  app.register(bookingRoutes);
  app.register(authRoutes);
  app.register(vendorRoutes);
  app.register(messageRoutes);
  app.register(notificationRoutes);

  return app;
}
