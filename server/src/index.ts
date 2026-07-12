import { buildApp } from './app.js';
import { startDemoVenueBot, startLifecycleWorker } from './workers.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = buildApp();

startLifecycleWorker();
if (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false') {
  startDemoVenueBot();
  app.log.info('DEMO venue bot active (confirms holds ~20s, kapar ~70s)');
}

app
  .listen({ port: PORT, host: HOST })
  .then(() => app.log.info(`kapar server on :${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
