# Kapar — production deploy checklist (Railway)

Status: READY TO EXECUTE the moment the Railway account exists. Everything
below is already in the repo; nothing needs to be written at deploy time.

## One-time setup (human, ~15 minutes)
1. Create the Railway project (EU region) → add the **PostgreSQL** plugin.
2. New service **from this GitHub repo** — Railway picks up `railway.json`
   (Dockerfile build via `server/Dockerfile`, `/health` healthcheck,
   `db:migrate` as the pre-deploy release step).
3. Service variables:
   - `DATABASE_URL` → reference the Railway Postgres variable.
   - `NODE_ENV=production`
   - `DEMO_MODE=false`  ← non-negotiable: the demo bot must never touch prod.
   - `RESEND_API_KEY` → when the Resend account exists (until then auth codes
     only appear in server logs — sign-in works for the team, not the public).
4. Seed once from a trusted shell: `npm run -w server db:seed`
   (idempotent; loads the 14 catalogue venues).
5. Point the app at it: build the Expo app with
   `EXPO_PUBLIC_API_URL=https://<railway-domain>` (baked at build time).

## Launch gates (product, tracked in FEATURES.md)
- [ ] Replace Unsplash hot-links (venue-supplied photos via the claim flow —
      needs R2; licensing attestation checkbox designed in Wave 3 research).
- [ ] Reviews stay OFF (`REVIEWS_ENABLED=false`, src/lib/launchGates.ts)
      until real reviews exist.
- [ ] Legal drafts (app/legal/*) reviewed by actual counsel; remove the
      draft banner only after.
- [ ] Resend wired + the dev-code caption verified ABSENT in production
      responses (server already gates on NODE_ENV).

## Already handled in code
- Rate limiting: 300 req/min/IP globally (@fastify/rate-limit) + the
  per-destination auth-code counter (3/10min).
- Double-booking: DB-level partial unique index — safe under concurrency.
- Lifecycle: TTL worker runs in-process; restart-safe (state in Postgres).
- Migrations: run as a release step (`preDeployCommand`), never at boot.
- CORS: currently `origin: true` — tighten to the real app origins at
  public launch (server/src/app.ts, one line).

## Post-launch (deliberately NOT now)
- Sentry (free tier) on server + app.
- Postgres automated backups schedule (Railway plugin setting).
- Websocket/SSE for chat + notifications (polling is fine at MVP scale).
- Expo push once a physical device can verify delivery.
