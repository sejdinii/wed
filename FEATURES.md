# FEATURES.md — single source of truth for what exists
# The agent maintains this file. Humans read it. Neither trusts memory.
# Status values: DONE (built + verified running) | PARTIAL (built, missing states/edge cases)
#                STUB (placeholder/mock only) | MISSING (not started) | BLOCKED (needs user decision)
# RULE: nothing gets marked DONE without being run/tested in this session.
#
# AUDIT 2026-07-09 (/gap-check): statuses below reconciled against the actual code.
# This file was created AFTER the first 14 build commits and never initialized, so
# it claimed MISSING for flows that exist. Now fixed.
# SESSION 2026-07-09b: npm registry unblocked — install + typecheck + web boot all
# work now (see ENVIRONMENT note in DISCOVERED GAPS for the two required tweaks).
# "run-verified (web)" below means: driven in headless Chromium against Metro this
# session, zero console errors.

## STANDING OBJECTIVE (set 2026-07-10 — supersedes the old MVP definition)
Kapar is DONE when it is a **two-sided marketplace at Booking.com-grade
completeness and polish**:

- **Couple side**: search with real filters, map view, venue detail, booking,
  cancellation — every screen with loading/empty/error states, all three
  locales (en/mk/sq), zero dead buttons.
- **Venue side ("Business mode")**: vendor auth, listing management (photos,
  halls, menus, pricing), availability calendar, booking-request inbox with
  confirm/decline, kapar-received confirmation, bookings dashboard. Interaction
  patterns are CLONED from Booking.com's extranet/Pulse, researched via
  Mobbin/web per wave — never designed from memory (Rule 2).
- **Backbone**: a real backend (Node.js + PostgreSQL — see DECISIONS LOG for
  the proposed deployment stack), server-side double-booking prevention, real
  auth, and the couple/business mode switch.

Acceptance for any slice: typecheck green, run-verified in a browser/device
with zero console errors, FEATURES.md updated, one commit per slice.

## WAVE ROADMAP (ordered milestones of parallelizable slices — backend first;
## nothing vendor-side is real until bookings live on a server)
| Wave | Theme | Slices (parallel) | Exit criteria |
|---|---|---|---|
| 0 ✅ DONE 2026-07-12 | Server foundation (fully local; deploy → Wave 1) | monorepo split + domain package (orchestrator, SHARED) · Fastify+Drizzle+Postgres schema/migrations/seed · env+CI (docker-compose, cloud setup script, Actions) · app HTTP client behind flag | server boots; GET /v1/venues serves the 14 seeds from Postgres; app renders search/detail against it; CI green |
| 1 ✅ SHIPPED 2026-07-12 (deploy pending Railway) | Bookings on the server (trust core) + first deploy | lifecycle endpoints + audit trail + TTL worker · double-booking prevention (unique index + tx + submit re-check) · date release on cancel/expiry · app store server-backed, venueBot behind DEMO flag · Railway staging deploy | two devices cannot book the same venue+date; cancel frees the date; no client timers |
| 2 ✅ SHIPPED 2026-07-13 (Resend + logout pending) | Real auth + mode switch | email-code auth + sessions + roles · guard all routes · Business-mode shell + switch · transactional email (en/mk/sq) | real accounts; deep links respect auth; vendor accounts exist |
| 3 | Vendor extranet core (GATED: founder research pack, see BACKLOG) | listing editor (content ×3 locales, photos→R2) · halls/menus editor · availability calendar · onboarding funnel + admin publish | a vendor can create a listing a couple can find and book |
| 4 | Vendor booking ops | request inbox confirm/decline · kapar-received flow · bookings dashboard · push notifications both sides | full two-sided loop with zero bots |
| 5 | Couple completeness | map view + server filters · real chat (replaces bot) · dead-button/legal sweep · locale QA (reviews write path CUT 2026-07-12) | no dead buttons; all locales complete |
| 6 | Hardening & launch | design-critic pass + fixes · e2e suite + load smoke · prod deploy (backups, Sentry, rate limits) · photo/content plan executed | staging demo end-to-end on two phones; prod checklist green |

Working agreement for waves: the loop runs via /next-wave under the
/parallel-build protocol — frozen specs, worktree-isolated wave-implementers,
the founder agent researching into BACKLOG.md in the background, and
checkpoints where only the orchestrator touches SHARED files (see
CONTRACTS.md). Every slice lands with run-verification and a FEATURES.md row
update. DISCOVERED GAPS below stays the intake point and is triaged into
BACKLOG.md's gap queue at session end.

## CORE FLOWS (MVP-blocking)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Venue search + filters | PARTIAL | run-verified (web) 2026-07-10 | home → search → results built vs MockVenueApi (14 published seed venues — earlier "16" was wrong). Loading+empty+error states all present now; "Map view" pill is still a dead end |
| Venue detail page (gallery, pricing, availability) | DONE | run-verified (web) 2026-07-10 | Gallery, halls, reviews, map, 410-unpublished state built; `fullRefundDays` crash fixed; error state + retry added and driven in browser (recovers). Loading/empty/error all present |
| Booking flow (date select → request/confirm) | PARTIAL | run-verified (web+server) 2026-07-12 | Pay-at-visit checkout now creates bookings ON THE SERVER (money computed server-side, availability enforced at insert — the re-check gap is closed); 409 surfaces as user copy. Remaining: draft store in-memory |
| Double-booking prevention | DONE | run-verified 2026-07-12 | Server-enforced: partial unique index on active (venue_id,event_date) + transactional insert. Verified in tests (cross-device 409) AND in the browser (duplicate surfaced as 'date just taken' copy; cancel released the date and rebooking succeeded). Requires API mode — the offline mock keeps the old client-only filter |
| Booking confirmation + status screen | PARTIAL | run-verified (web+server) 2026-07-12 | 3-phase status now driven by the SERVER (demo bot + lifecycle worker are restart-safe, in Postgres); the screen polls while watched and phases flip live. App venueBot only narrates chat. "Add to calendar" still a no-op |
| Auth (signup/login, both user types) | PARTIAL | run-verified (web+server) 2026-07-13 | REAL email-code auth in API mode: rate-limited 6-digit codes, wrong/expired rejection, 30-day sessions, roles couple/vendor/both, device-booking claim on login; ALL booking routes + chat now guarded (deep-link gap closed). Offline mock keeps any-code sign-in, honestly scoped. Remaining: no logout UI, Resend not wired (dev provider logs codes), personal-info editor |
| Vendor: venue listing creation/edit | MISSING | code trace 2026-07-13 | "Become a Partner" now grants the role + opens the Business shell, but listing creation itself is Wave 3 (gated on the extranet research pack) |
| Vendor: calendar/availability management | MISSING | static code trace 2026-07-09 | bookedDates are hardcoded in src/data/venues.ts |
| Vendor: incoming booking requests | MISSING | static code trace 2026-07-09 | Faked by venueBot auto-confirm + hardcoded Macedonian chat messages |
| Backend API + PostgreSQL (bookings/venues/auth server-side) | PARTIAL | run-verified 2026-07-12 | Waves 0+1 SHIPPED: catalogue AND the full booking lifecycle live on the server (create w/ server-side pricing, confirm w/ payBy, kapar-received, cancel w/ stamped refunds, audit trail, TTL worker, demo bot; 38 tests, CI). Device-scoped until auth. Remaining: auth (Wave 2), deploy (Railway pending) |
| Couple ⇄ Business mode switch | PARTIAL | run-verified (web+server) 2026-07-13 | 'Become a partner' grants the vendor role server-side and opens Business mode; (business) route group role-gated; Today feed shell per the accepted Pulse IA. Listing management (Wave 3) fills it |
| Real couple↔vendor chat | STUB | code trace 2026-07-10 | Wave 5. Scripted one-way bot messages, hardcoded Macedonian |
| Cancellation/refund flow | DONE | run-verified (web) 2026-07-10 | Platform policy decided + built (100/50/0 at 90/30 days, 7-day grace, venue-cancel always 100%). All 14 seed venues aligned to PLATFORM_REFUND_TIERS. Cancel entry on booking detail → dedicated confirm page with exact outcome preview ("{venue} returns €X (Y%)" — venue returns the money, platform holds none). Both paths verified in browser: free cancel before kapar, 100%-tier refund after confirmation; refund stamped on the booking. Venue-initiated cancel has no UI trigger yet (no vendor app) |

## REQUIRED BUT NOT CORE (post-boot, pre-launch)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Empty states (all list screens) | DONE | code + browser 2026-07-10 | All list screens have EmptyState incl. new home-rails and reviews-list ones. Caveat: the two new branches are unreachable with seed data (mock always returns venues/reviews), so they are render-guards verified by code, not driven |
| Error states + retry (all network screens) | DONE | run-verified (web) 2026-07-10 | New ErrorState design component; all 8 previously-unguarded venueApi awaits wrapped with retry wiring. Every screen driven in browser with the new dev switch `globalThis.__KAPAR_API_FAIL__` (api.ts); home/results/venue-detail also verified to RECOVER on retry |
| Reviews/ratings | STUB | static code trace 2026-07-09 | CUT from MVP 2026-07-12 (no write path will be built). Fake generated reviews stay display-only for the demo phase — MUST be hidden or replaced before real users (see gap) |
| Notifications (booking status changes) | MISSING | static code trace 2026-07-09 | Home notification bell is a no-op ((tabs)/index.tsx:112) |
| Deposits/payments | DONE | run-verified (web) 2026-07-10 | DECIDED 2026-07-09: MVP has NO online payments — kapar is paid in person at the venue visit. Card form + fake gateway deleted (PCI risk gone); all "secure payment" claims reworded in en/mk/sq; profile "Payment methods" row removed. Online rails (CaSys/Stripe) become a post-launch feature |
| Onboarding (first-run) | PARTIAL | static code trace 2026-07-09 | welcome → verify → tabs flow with redirect gate ((tabs)/_layout.tsx:26). Terms/Privacy links are no-ops |
| Profile/settings | PARTIAL | code trace 2026-07-10 | Profile tab + settings (language en/mk/sq, theme) work. Payment-methods row REMOVED (no online payments in MVP). Remaining dead buttons: personal info, terms/privacy, help, become-a-partner |

## DISCOVERED GAPS (agent appends here when it finds unstated requirements)
- 2026-07-13: no logout — a signed-in session cannot be cleared from the UI
  (clearAuth exists in the store, no button calls it). Wave 3 settings item.
- 2026-07-13: sessions/auth_codes tables only grow (no cleanup job); and the
  verify-attempt counter is in-memory (resets on server restart — documented,
  acceptable: codes expire in 10min anyway).
- 2026-07-13 (implementer finding): server/test/bookings.test.ts derives its
  test date from Date.now()%27 — near-random collisions with leftover rows on
  the shared dev db. Move to a uuid-derived unique date.
- 2026-07-12 LAUNCH-HONESTY: with the reviews write path cut, the seeded fake
  reviews (deterministic, src/data/reviews.ts) will sit on a live marketplace
  as if real. Before ANY real user: hide the reviews UI or seed real
  testimonials. Consumer-protection risk, not just polish. (Wave 6 gate.)
- 2026-07-10: the design-research pass for the cancellation UI could not run
  (subagent hit the session usage limit), so the cancel screen follows the
  Booking.com patterns this app already clones (dedicated confirm page,
  outcome preview, policy ladder) WITHOUT fresh 2025/26 references. Revisit
  with Mobbin research next session per Rule 2.
- 2026-07-10: the booking chat is one-way theatre — the venueBot sends 3
  scripted Macedonian messages on a timer and never replies to anything the
  couple types. Embarrassing in a live demo if the investor types a question.
- 2026-07-10: `checkout.confirmNote` promises "the venue confirms within 24
  hours — if not, the hold lapses"; the sweep enforces the lapse only on next
  app launch, not in the background. True enough for MVP, needs push/cron later.
- 2026-07-10: cancelling does not release the date for other users — same root
  cause as the double-booking gap (bookedDates never written back client-side;
  real fix is server-side).
- 2026-07-09 CRASH: venue/[id].tsx:289 references undefined `fullRefundDays` →
  ReferenceError rendering the halls section; breaks search→detail for all 3
  multi-hall venues. MVP-blocking, trivial fix. FIXED 2026-07-09b (derived from
  sortedRefundTiers), run-verified on panorama-garden.
- 2026-07-09b: results.tsx price-sort referenced un-imported `minEstimateMkd` →
  would crash the moment a user picked "price" sort. Same class of bug as the
  fullRefundDays crash (unimported identifier compiles in Metro, dies at runtime).
  FIXED same session; typecheck now gates this class. Typecheck was ALSO broken
  in availability.tsx (readonly style tuple) and venue/[id].tsx (missing
  `venue.menus` i18n key) — all four fixed, `tsc --noEmit` exits 0.
- 2026-07-09: `expired` and `completed` booking states exist in the state machine
  but NO code path ever sets them — past bookings stay `confirmed`/`reserved` forever.
  Needs a lifecycle job (client-side sweep now, server cron later).
  RESOLVED 2026-07-10: `lifecycleTransitionFor` + store `sweep()` runs after
  rehydration on every cold start (requests >24h → expired, holds past payBy →
  expired, confirmed past event → completed). Server cron still needed later.
- 2026-07-09: venueBot timers don't survive app restart → a booking made then
  app-killed within 22s is stuck `reserved` with no reconciliation on next launch.
- 2026-07-09: no availability re-check at checkout time; user's own booking doesn't
  mark the date locally, so the SAME device can double-book a venue+date.
- 2026-07-09: auth wall only wraps (tabs); venue/[id], booking/*, checkout are
  deep-linkable without verification (share links make this reachable in practice).
- 2026-07-09: UI copy overclaims — "secure payment · data protected" on a fake
  gateway; "venue confirms within 24h" when it's a 22s bot; "we'll text you a
  code" when no SMS is sent. Must be reworded or made true before any real user.
  PARTIALLY RESOLVED 2026-07-10: every payment/security claim reworded to the
  pay-at-visit truth in all 3 locales; fake trust badges ("thousands of happy
  users") replaced with real product facts. STILL OPEN: SMS-code copy (auth
  scope) and "confirms within 24h" wording (true as policy — the hold now
  genuinely lapses via sweep — but the bot answers in 22s).
- 2026-07-10: venueBot now compresses the whole venue visit into 75s (kapar
  marked received automatically). Fine for demo, but the "confirmed" state is
  fiction until real venues mark kapar receipt in a vendor app.
- 2026-07-09: all 16 venues' photos hot-link Unsplash — licensing + reliability
  risk for production; BrandedImage fallback exists but offline behavior unverified.
- 2026-07-09: venueBot chat messages hardcoded Macedonian regardless of locale.
- 2026-07-09: zero tests, no CI; typecheck is the only gate and was NOT runnable
  this session (see next line). RESOLVED 2026-07-12 (Wave 0): 23 domain tests +
  6 server API tests + GitHub Actions CI (typecheck ×3 workspaces, tests,
  migrate/seed, boot smoke). UI e2e tests still missing (Wave 6).
- 2026-07-09 ENVIRONMENT: the remote session's network policy blocks
  registry.npmjs.org → npm ci fails → app cannot boot in cloud sessions.
  RESOLVED 2026-07-09b: registry is now allowlisted; npm install works. Two
  standing quirks: (1) api.expo.dev is still blocked, so `expo start` crashes
  unless run with `--offline`; (2) zustand v5's ESM build uses `import.meta`,
  which kills the classic-script web bundle on boot — metro.config.js now pins
  zustand to CJS (committed). Unsplash photo hosts are also blocked here, so
  venue photos show the BrandedImage fallback in cloud runs.

## DECISIONS LOG (newest first)
- 2026-07-12 DECIDED — auth: email 6-digit code, channel-pluggable (accepted
  as recommended). Reviews write path CUT from MVP. Photo plan deferred to
  Wave 6. Hosting = Railway, but account not yet created → Wave 0 is fully
  local; the deploy slice moves to Wave 1.

- (agent: record every product decision the user makes, with date, so future
  sessions don't re-ask)
- 2026-07-09 DECIDED — cancellation policy, platform-wide for MVP (per-venue
  post-launch): 100% kapar refund ≥90 days before event, 50% at 30–89 days,
  0% under 30 days. Agent amendments (accepted by default, user may veto):
  (a) tiers apply to couple-initiated cancellations only — venue-initiated is
  always 100% back; (b) 7-day grace window — 100% back within 7 days of paying
  the kapar if the event is still ≥30 days away. Constants live in
  src/domain/kapar.ts (PLATFORM_REFUND_TIERS, REFUND_GRACE_*).
- 2026-07-09 DECIDED — payments for MVP: NO online payment, no card form.
  Booking = request → venue confirms hold (24h TTL) → kapar paid in person at
  the venue visit within 7 days (KAPAR_PAY_WINDOW_DAYS) → confirmed. The
  platform holds no money; "refund" = the venue returns the kapar per the
  agreement. CaSys cPay vs Stripe is now a post-launch decision.
- 2026-07-10 DECIDED — the vendor side IS in scope. Standing objective is the
  two-sided marketplace (see STANDING OBJECTIVE above).
- 2026-07-10 DECIDED — cancellation tiers stay exactly as built (incl. the two
  agent amendments: venue-cancel = 100%, 7-day grace window).
- 2026-07-10 DECIDED — auth for MVP: email-based verification, no SMS costs.
  Agent adjustment within that decision (not a veto): use a 6-digit EMAIL CODE
  rather than a magic link — links open in the phone's browser instead of the
  app unless universal-links plumbing exists, while a code reuses the already-
  built verify screen. Build the endpoint channel-pluggable
  (`POST /v1/auth/otp {channel: 'email'|'sms'}`) because this market is
  phone-first (Viber culture; venue owners live on their phones) and SMS OTP
  should be a cheap fast-follow, not a rework. Phone number stays a required
  profile field regardless — venues coordinate visits by phone.
- 2026-07-10 PROPOSED (agent) — deployment stack for the backbone, pending
  founder sign-off on hosting/billing: Node 22 + Fastify + Drizzle ORM +
  PostgreSQL 16 in an npm-workspaces monorepo (`server/`, `packages/domain`);
  Railway (EU region) for API + managed Postgres; Cloudflare R2 for venue
  photos; Resend for transactional email; Expo Push for notifications; Sentry
  free tier. Drizzle over Prisma partly because it needs no engine-binary
  downloads (works within this environment's egress allowlist).
