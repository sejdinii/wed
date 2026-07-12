# BACKLOG.md - founder's research output, orchestrator's inbox
# The founder appends here continuously. The orchestrator reads it ONLY at
# checkpoints and marks items ACCEPTED (goes into FEATURES.md) or REJECTED
# (stays here with a reason, so it is never re-proposed blind).
# Below the founder sections sits the orchestrator-owned TRIAGED GAP QUEUE
# (seeded 2026-07-10 from FEATURES.md DISCOVERED GAPS) — wave assignments for
# known work. Founder proposes; orchestrator triages; agents build from wave
# specs only, never straight from this file.

## URGENT
(founder: only genuine wave-invalidating discoveries; otherwise leave empty)

## TASKED RESEARCH (orchestrator → founder, 2026-07-10 — highest priority)
# NOTE 2026-07-12: founder launch failed AGAIN on the session usage limit
# (second occurrence). Retry at next session start; if it fails a third time,
# the human research pack (docs/research/) becomes the primary path.
- [ ] **Booking.com extranet research pack (GATES Waves 3–4).** Vendor-side UI
  must be cloned from researched references, never memory (Rule 2). From
  Mobbin first, then web: extranet dashboard home; reservations list +
  reservation detail; availability calendar (open/close dates); property
  content editor; photo manager; rates/policy editor; the **Pulse** mobile
  app's request → confirm/decline flow and new-booking notification. For each:
  source, date, and the concrete pattern (layout, hierarchy, copy). Write
  findings under DESIGN INTEL with enough detail to design from.
- [ ] Cancellation + pay-at-visit checkout patterns, 2025/26 references
  (Booking.com, Airbnb, OpenTable) — Rule 2 debt from 2026-07-10, when the
  agent-side research pass hit a usage limit. The built screens follow
  remembered Booking.com patterns; verify or correct them.
- [ ] Competitor scan for the Balkan wedding-venue market (any direct
  competitors in MK/AL/XK; how venues currently take bookings — Instagram/
  phone norms) → RISKS section.

## PROPOSED FEATURES
| Feature | Evidence (source) | Impact (blocking/valuable/later) | Touches | Verdict |
|---|---|---|---|---|
| | | | | |

## DESIGN INTEL
- (pattern worth cloning - app, source, date)

## RISKS
- (market/competitor/category threats, with source)

## REJECTED (with reasons - do not re-propose without new evidence)
- Reviews write path (was Wave 5 P1) — CUT from MVP by user 2026-07-12.
  Display-only seeded reviews stay for now; see the launch-honesty gap in
  FEATURES.md (fake reviews must be hidden or replaced before real users).

---

# TRIAGED GAP QUEUE (orchestrator-owned)
# Seeded 2026-07-10 from FEATURES.md DISCOVERED GAPS + the standing objective.
# P0 = blocks the wave's exit criteria · P1 = required for Booking.com-grade ·
# P2 = polish. Items graduate into frozen wave specs at checkpoints.

## USER DECISIONS NEEDED (humans, not agents)
- [ ] P0 — create the Railway account (hosting DECIDED 2026-07-12: Railway).
  Blocks the deploy slice, now moved to Wave 1; Wave 0 is fully local.
- [ ] P2 — real venue photo plan (replace Unsplash hot-links before launch);
  licensing + photo requirements for venue onboarding.

## WAVE 0 — server foundation
- [ ] P0 — npm-workspaces monorepo: `server/` + `packages/domain` (shared kapar
  math + types + zod schemas); Expo app stays the root package (metro
  watchFolders update). SHARED files — orchestrator does this slice itself.
- [ ] P0 — Fastify + Drizzle + PostgreSQL 16 scaffold; schema v1 (users, venues,
  halls, menu_tiers, reviews, bookings, booking_events, auth_codes, sessions);
  migrations; seed script importing the 14 seed venues.
- [ ] P0 — env: docker-compose.postgres + cloud-session setup script (apt
  postgres fallback — VERIFIED working in this environment 2026-07-12),
  DATABASE_URL convention; CI (GitHub Actions): typecheck app+server, domain
  unit tests, seed + boot smoke. NO deploy in Wave 0 (Railway account pending
  — deploy slice moved to Wave 1).
- [ ] P0 — app HTTP client implementing VenueApi against the server behind a
  flag; MockVenueApi stays as offline/dev fallback.
- [ ] P1 — port refund ladder/grace/payBy/lifecycle math to `packages/domain`
  with unit tests (single source for app + server). (gap: "zero tests, no CI")

## WAVE 1 — bookings on the server (trust core)
- [ ] P0 — booking lifecycle endpoints with server-enforced transitions +
  booking_events audit trail; TTL expiry worker (24h request / payBy lapse)
  (gap: "sweep only runs on next app launch"; gap: "venueBot timers die on
  restart").
- [ ] P0 — double-booking prevention: partial unique index on active
  (venue_id, event_date) + transactional insert + availability re-check at
  submit (gap: "same device can double-book"; gap: "no re-check at checkout").
- [ ] P0 — cancel/expiry releases the date for everyone (gap: "cancelling does
  not release the date").
- [ ] P0 — app bookings store server-backed; venueBot retired behind a DEMO
  flag (gaps: "venueBot compresses visit to 75s", "confirmed state is fiction").
- [ ] P1 — booking draft store survives process death (currently in-memory).

## WAVE 2 — real auth + business-mode switch
- [ ] P0 — email 6-digit-code auth (channel-pluggable endpoint so SMS can be
  added without rework — see DECISIONS LOG), sessions, roles couple|vendor
  (gap: "ANY 6 digits pass, no SMS, no sessions").
- [ ] P0 — guard ALL protected routes, not just (tabs) (gap: "deep-linkable
  unauthenticated").
- [ ] P0 — profile ⇄ Business mode switch scaffold + vendor shell.
- [ ] P1 — transactional email (Resend) templates in en/mk/sq; retire the
  "we'll text you a code" copy (gap: "SMS-code copy overclaim").
- [ ] P1 — personal-info editor (dead button on profile).

## WAVE 3 — vendor extranet core (GATED on the extranet research pack)
- [ ] P0 — listing editor: content ×3 locales, photos (upload → R2), amenities,
  house rules; draft → submit → published flow ("Become a partner" dead button).
- [ ] P0 — halls & menus editor (per-guest pricing, hall adjustments).
- [ ] P0 — availability calendar: open/close dates, see booked dates
  (gap: "bookedDates hardcoded in venues.ts").
- [ ] P1 — admin approve/publish flag + minimal review tooling.

## WAVE 4 — vendor booking operations
- [ ] P0 — request inbox: confirm (sets payBy) / decline with reason.
- [ ] P0 — "kapar received" confirmation at the visit (venue side) — makes the
  `confirmed` state real for the first time.
- [ ] P0 — vendor bookings dashboard (upcoming, cancellations with refund owed
  per the platform ladder).
- [ ] P0 — Expo push notifications both sides for every status change (gap:
  "notification bell is a no-op"; gap: "24h lapse needs background enforcement").
- [ ] P1 — venue-initiated cancellation UI (domain already enforces 100% back).

## WAVE 5 — couple-side completeness (Booking.com-grade)
- [ ] P0 — map view on results (VenueMap exists; the pill is a dead end).
- [ ] P0 — real couple↔vendor chat replacing the scripted bot (gaps: "one-way
  theatre", "hardcoded Macedonian bot messages").
- [ ] P1 — dead-button elimination: terms/privacy static pages, help/support,
  add-to-calendar via expo-calendar; notification preferences wired to real
  push opt-ins.
- [ ] P1 — full locale QA sweep (en/mk/sq) across both modes.

## WAVE 6 — hardening & launch readiness
- [ ] P0 — design-critic full pass (both modes, light/dark, all locales) + fix
  round, incorporating the founder's verified references.
- [ ] P0 — e2e critical-path suite (Playwright web now, native later) + server
  load smoke; CI-gated.
- [ ] P0 — production deploy: EU region, backups, Sentry, rate limiting,
  secrets; staging demo on two physical phones.
- [ ] P1 — replace Unsplash photos (needs the photo plan); offline behavior
  of BrandedImage verified (gap: "offline behavior unverified").
- [ ] P2 — post-launch queue: per-venue cancellation policies; online payments
  (CaSys vs Stripe); per-venue kapar policy editor.
