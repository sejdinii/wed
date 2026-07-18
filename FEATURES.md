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
| 3 ✅ CORE SHIPPED 2026-07-17 (halls/menus editor, photos→R2, locale-tab content editor → Wave 4/6 carry-over) | Vendor extranet core (GATED: founder research pack, see BACKLOG) | listing editor (content ×3 locales, photos→R2) · halls/menus editor · availability calendar · onboarding funnel + admin publish | a vendor can create a listing a couple can find and book — MET, run-verified end-to-end 2026-07-17 |
| 4 ✅ CORE SHIPPED 2026-07-18 (push → Wave 5 notification slice; vendor-cancel UI, response-rate stat → Wave 5) | Vendor booking ops | request inbox confirm/decline · kapar-received flow · bookings dashboard · push notifications both sides | full two-sided loop with zero bots — MET, run-verified 2026-07-18: vendor created+published a venue, couple booked it, vendor confirmed/kapar-received/declined-with-reason entirely through the UI; scoped demo bot verifiably kept out |
| 5 ✅ CORE SHIPPED 2026-07-18 (map view → Wave 6 with the founder's reference pack; locale QA rides the Wave 6 critic pass) | Couple completeness | map view + server filters · real chat (replaces bot) · dead-button/legal sweep · locale QA (reviews write path CUT 2026-07-12) | no dead buttons — MET (zero onPress={() => {}} left; map pill and personal-info row honestly REMOVED rather than left dead); real chat + in-app notification center run-verified two-sided 2026-07-18 |
| 6 ✅ BUILDABLE SCOPE SHIPPED 2026-07-18 (deploy/photos/email = the three HUMAN-BLOCKED accounts; final device demo needs staging) | Hardening & launch | design-critic pass + fixes · e2e suite + load smoke · prod deploy (backups, Sentry, rate limits) · photo/content plan executed | map view live · fake reviews GATED OFF · decline categories (RtB) end-to-end · vendor cards show money+phone · rate limiting live · deploy pack ready-to-execute (docs/PRODUCTION.md) — integrated e2e green 2026-07-18. REMAINING = Railway/R2/Resend + counsel + on-device demo |

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
| Venue search + filters | PARTIAL | run-verified (web) 2026-07-10 | home → search → results built vs MockVenueApi (14 published seed venues — earlier "16" was wrong). Loading+empty+error states all present. MAP VIEW LIVE 2026-07-18: list↔map toggle, MapLibre price pins, VenueCard mini-card, same filters both modes (23 pins verified; OpenFreeMap tiles proxy-blocked HERE — interaction layer proven, tile render needs one unproxied look). Known gap: same-city venues stack at identical CITY_COORDS pins |
| Venue detail page (gallery, pricing, availability) | DONE | run-verified (web) 2026-07-10 | Gallery, halls, reviews, map, 410-unpublished state built; `fullRefundDays` crash fixed; error state + retry added and driven in browser (recovers). Loading/empty/error all present |
| Booking flow (date select → request/confirm) | PARTIAL | run-verified (web+server) 2026-07-12 | Pay-at-visit checkout now creates bookings ON THE SERVER (money computed server-side, availability enforced at insert — the re-check gap is closed); 409 surfaces as user copy. Remaining: draft store in-memory |
| Double-booking prevention | DONE | run-verified 2026-07-12 | Server-enforced: partial unique index on active (venue_id,event_date) + transactional insert. Verified in tests (cross-device 409) AND in the browser (duplicate surfaced as 'date just taken' copy; cancel released the date and rebooking succeeded). Requires API mode — the offline mock keeps the old client-only filter |
| Booking confirmation + status screen | DONE | run-verified (web+server) 2026-07-18 | The 3-phase status is now driven by REAL vendor actions on vendor-owned venues (bot only animates ownerless seed venues in DEMO mode): couple's screen flipped to confirmed after the vendor tapped Kapar received in the live e2e. Add-to-calendar is a real .ics download on web since 2026-07-18 (hidden on native pending device verification) |
| Auth (signup/login, both user types) | PARTIAL | run-verified (web+server) 2026-07-13 | REAL email-code auth in API mode: rate-limited 6-digit codes, wrong/expired rejection, 30-day sessions, roles couple/vendor/both, device-booking claim on login; ALL booking routes + chat now guarded (deep-link gap closed). Offline mock keeps any-code sign-in, honestly scoped. Sign-out row SHIPPED 2026-07-17 (works in both modes). Remaining: Resend not wired (dev provider logs codes), personal-info editor |
| Vendor: venue listing creation/edit | PARTIAL | run-verified (web+server) 2026-07-17 | One-form create funnel (name/city/type/capacity/price) → UNPUBLISHED draft → explicit publish toggle on Today. Verified end-to-end in browser: draft hidden from public search, published venue found AND BOOKED by a couple account. Server: one venue per owner (409), PATCH edit endpoint exists. Remaining: edit UI, halls/menus editor, photo upload (needs R2), locale-tab content editing |
| Vendor: calendar/availability management | DONE | run-verified (web+server) 2026-07-17 | 3-state calendar (open / blocked-by-vendor / booked-by-couple — the accepted Booking.com deviation). Verified in browser: block persisted + visible on PUBLIC couple calendars, unblock reopened; booked dates show the booking and cannot be reopened; server rejects bookings on blocked dates and blocking already-booked dates (409). Public bookedDates = union of seed + active bookings + vendor blocks (batched, no N+1) |
| Vendor: incoming booking requests | DONE | run-verified (web+server) 2026-07-18 | Actionable inbox on Business Today: Confirm (sets payBy), Decline with optional reason (required-category upgrade ACCEPTED → Wave 5), Kapar received; 24h SLA countdown (clamped, honest — TTL is a real enforced expiry); per-card busy/error states. Server: /v1/vendor/bookings/* behind vendor-ownership checks; legacy open endpoints locked (403 vendor_only on owned venues); demo bot scoped to ownerless seed venues — no-bot verified live. Vendor bookings dashboard (upcoming/history, refund-owed callout, decline-reason caption) at /venue-bookings |
| Backend API + PostgreSQL (bookings/venues/auth server-side) | PARTIAL | run-verified 2026-07-12 | Waves 0+1 SHIPPED: catalogue AND the full booking lifecycle live on the server (create w/ server-side pricing, confirm w/ payBy, kapar-received, cancel w/ stamped refunds, audit trail, TTL worker, demo bot; 38 tests, CI). Device-scoped until auth. Remaining: auth (Wave 2), deploy (Railway pending) |
| Couple ⇄ Business mode switch | PARTIAL | run-verified (web+server) 2026-07-13 | 'Become a partner' grants the vendor role server-side and opens Business mode; (business) route group role-gated; Today feed shell per the accepted Pulse IA. Listing management (Wave 3) fills it |
| Real couple↔vendor chat | DONE | run-verified (web+server) 2026-07-18 | Server thread per booking (side resolution mirrors booking access; counterpart notification per message), 5s poll, optimistic send with rollback, ?as=vendor renders the vendor side. Verified live: couple sent, vendor read + replied, couple received within one poll. Scripted venueBot is mock-only fiction now. Remaining: report/block affordances (founder: table-stakes → Wave 6), no websocket (poll is fine at MVP scale) |
| Cancellation/refund flow | DONE | run-verified (web) 2026-07-10 | Platform policy decided + built (100/50/0 at 90/30 days, 7-day grace, venue-cancel always 100%). All 14 seed venues aligned to PLATFORM_REFUND_TIERS. Cancel entry on booking detail → dedicated confirm page with exact outcome preview ("{venue} returns €X (Y%)" — venue returns the money, platform holds none). Both paths verified in browser: free cancel before kapar, 100%-tier refund after confirmation; refund stamped on the booking. Venue-initiated cancel has no UI trigger yet (no vendor app) |

## REQUIRED BUT NOT CORE (post-boot, pre-launch)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Empty states (all list screens) | DONE | code + browser 2026-07-10 | All list screens have EmptyState incl. new home-rails and reviews-list ones. Caveat: the two new branches are unreachable with seed data (mock always returns venues/reviews), so they are render-guards verified by code, not driven |
| Error states + retry (all network screens) | DONE | run-verified (web) 2026-07-10 | New ErrorState design component; all 8 previously-unguarded venueApi awaits wrapped with retry wiring. Every screen driven in browser with the new dev switch `globalThis.__KAPAR_API_FAIL__` (api.ts); home/results/venue-detail also verified to RECOVER on retry |
| Reviews/ratings | DONE (gated OFF) | run-verified (web) 2026-07-18 | The launch-honesty gate EXECUTED: REVIEWS_ENABLED=false (src/lib/launchGates.ts) hides every rating/review surface app-wide — verified zero artifacts on home/venue/map mini-card. Flips on only when real reviews exist (post-launch write path) |
| Notifications (booking status changes) | PARTIAL | run-verified (web+server) 2026-07-18 | In-app center SHIPPED: durable notifications table fanned out from every real event (create/transitions/sweeps/messages), bearer-scoped list + mark-read, bells with EARNED badges in both headers (60s poll + focus refetch), settings toggles now actually filter kinds. Verified live both sides. PARTIAL because push delivery (the reason the row exists) still needs a device to verify against — Wave 6+ |
| Deposits/payments | DONE | run-verified (web) 2026-07-10 | DECIDED 2026-07-09: MVP has NO online payments — kapar is paid in person at the venue visit. Card form + fake gateway deleted (PCI risk gone); all "secure payment" claims reworded in en/mk/sq; profile "Payment methods" row removed. Online rails (CaSys/Stripe) become a post-launch feature |
| Onboarding (first-run) | DONE | run-verified (web) 2026-07-18 | welcome → verify → tabs; Terms/Privacy on the consent line now open REAL static legal screens (draft-labelled pending counsel, ×3 locales, MK privacy-law checklist applied from founder research) |
| Profile/settings | DONE | run-verified (web) 2026-07-18 | Zero dead rows: legal screens wired, help → /support (mailto), personal-info row removed until its migration (Wave 6), sign-out works, currency honest, notification toggles genuinely filter the in-app center. Personal-info editor returns Wave 6 |

## DISCOVERED GAPS (agent appends here when it finds unstated requirements)
- 2026-07-18 (Wave 6 close): map pins for same-city venues STACK at identical
  CITY_COORDS (vendor-created venues get the city centroid) — overlapping
  pins intercept each other's taps. Needs coordinate jitter or clustering +
  a real venue-geocoding step in the claim/onboarding flow. → post-launch.
- 2026-07-18 (Wave 6 close): dev-db hygiene — e2e driver venues (kapar.mk
  emails) accumulate outside the test-account sweep (catalogue hit 600+
  before the purge; a few realistic-named stragglers remain). The vitest
  global-setup now also sweeps test-ACCOUNT venues; driver-created ones need
  either the same marker discipline or periodic manual purges. Non-issue in
  production (no drivers).
- 2026-07-18: response-rate caption verified only in its honest-null state in
  the final integrated run (<3 requests in the fresh fixture) — the non-null
  path was live-verified in slice B's own run ("60% (last 30 days)"). Fine,
  recorded for completeness.
- 2026-07-18 CRITIC PASS 2 (Wave 4 surfaces, verdict FIX FIRST). Fixed same
  session: overflowing vendor action row (flexWrap+sm), WRONG no-refund
  boundary (read the wrong end of the descending sort — claimed 90 days,
  real boundary 30), bare vendor listings rendering broken to couples
  ("1/0" photo void, "0.0 · 0 reviews", empty About), dead bookings still
  billing, Badge success violet (twice-flagged), dark danger CTA contrast
  (new onDanger token), sm buttons under the 44px floor, inbox never
  refetching on focus. STILL OPEN → routed to Wave 6:
  - vendor decides blind: no estimate/kapar value, no tappable phone on
    request cards or dashboard rows (Viber-first market; Pulse leads with
    reservation value) — strongest open vendor-side gap.
  - vendor chips wear couple copy ("Awaiting venue confirmation" in the
    vendor's own inbox) — needs a vendorBookingStatus.* namespace.
  - Today renders requests only: after Kapar received the vendor's biggest
    win shows an EMPTY state — needs an activity feed item.
  - action failures speak loading copy; TransitionError (409) needs its own
    copy + a refetch to re-render the card's true state; expired requests
    keep live Confirm/Decline buttons (guaranteed 409).
  - "Limited" calendar days are an adjacency heuristic, not vendor input —
    fabricated scarcity on the core booking surface; drop or make real.
  - hallName is stamped mk-only server-side and leaks into en/sq UIs.
  - SLA line is an 11px caption until <6h — the card's most urgent fact.
  - settings Switch thumbs render RN-web default teal (activeThumbColor).
- 2026-07-18 (slice B finding): role 'both' accounts can misroute their own
  couple-side message/booking notifications to /today — the notification
  API's booking summary carries no venueId to disambiguate. Rare at MVP
  (one venue per owner); fix by adding venueId to the summary. → Wave 6.
- 2026-07-18 RESOLVED: the recurring test-date collision flake was WINDOW
  SATURATION (uuid-derived dates still map to one calendar month per file;
  the shared dev db accumulated 38 active test rows). Fixed structurally:
  vitest globalSetup sweeps test-marked residue (device_id LIKE 'test-%')
  before every suite run; suite green twice consecutively.
- 2026-07-18 (Wave 4 integration): the couple NEVER sees the vendor's decline
  reason — it's stored, returned by the API, and shown on the vendor dashboard,
  but booking/[id].tsx renders no cancelReason and no "suggest another venue"
  escape after a decline. For a trust product the couple-side decline
  experience is one dead status chip. → Wave 5 (pairs with the required-reason
  upgrade).
- 2026-07-18 (route lesson, cost one e2e round): expo-router group segments
  collapse out of URLs — (business)/bookings.tsx SHADOWED (tabs)/bookings.tsx
  on the /bookings deep link (alphabetical win). Renamed to venue-bookings.
  RULE for future screens: never reuse a leaf name that exists in another
  group.
- 2026-07-18 (slice-A finding, FIXED same session): root `typecheck:all`
  silently skipped the server workspace — server type errors could not fail
  CI locally. Now runs all three workspaces.
- 2026-07-18 (recurring, 4 flaky failures this session): bookings/auth tests
  still derive event dates from Date.now()%27 on the shared dev db — stale
  rows collide (birthday paradox). Slice-A's new tests use uuid-derived dates;
  migrate the old ones + add a bookings wipe to test setup. → Wave 6 hygiene.
- 2026-07-17 CRITIC PASS (design-critic, Waves 1–3 surfaces, verdict FIX FIRST).
  The 3 demo-breaking findings were FIXED same session (resend brick, collapsed
  flex CTAs via PressableScale, create-venue error below the fold — commit
  b07b322). The following remain open, triaged into BACKLOG.md wave queues:
  - REPOSITORY-BOUNDARY BUG: booking/cancel.tsx + booking/[id].tsx import the
    static VENUES seed directly — for any vendor-created venue the refund
    preview can assert the OPPOSITE of the server's math (renders no-refund
    copy with a fabricated boundary). Worst open correctness bug. → Wave 4.
  - Profile denies the auth system: signed-in users see "Guest — accounts are
    coming soon — stored on this device" (both directions of the honesty rule
    broken); becomeVendor failure is haptic-only; still no logout. → Wave 4.
  - Nested <button> in <button> (HeartButton inside VenueCard pressables, ×3
    variants) — hydration errors on every list render; violates the zero-
    console-error standard. → Wave 4.
  - Settings overclaims: 3 notification toggles with no notification system,
    "Currency МКД" while all prices render EUR, dead Terms/Privacy rows (also
    dead on the consent line of /welcome). → Wave 4/5.
  - Money-screen arithmetic: estimate line "(100 × 20) — €2,033" doesn't
    multiply out (rounded per-guest EUR, ignores hallAdj). → Wave 4.
  - Dead actions parked on live paths: add-to-calendar (status + detail),
    Help & support, results "Map View" pill (fires only a haptic), home bell
    with a HARDCODED unread dot. Bell dot is a fake signal — remove first. → Wave 5.
  - verify.tsx polish: no visual state while checking; chat-bubble icon for an
    email code; sub-44px back target; welcome shows "*****" (5) for a 6-digit
    code. → Wave 5.
  - Cancel page: outcome box (grace 100%) can contradict the policy ladder
    (50% rung) with no "today" marker — reads as a bug. RefundTimeline needs a
    today marker + applicable-rung highlight (pairs with the ACCEPTED grace-
    row backlog item). → Wave 5.
  - Design-system drift: Badge success = violet mint vs palette green; token
    violations (inline fontSize 20/15, hardcoded FloatingButton rgba/hex);
    emoji a11y labels ("♥", "↥", "🔔") announce garbage to screen readers;
    checkout header "Reserve | Kapar" tab-title pattern; kapar bar shows "€0"
    while venue loads; review step lacks per-section edit links; the no-
    payment fact repeats ×4 on one screen. → Wave 5 polish sweep.
  - Fake reviews re-flagged (already a Wave 6 launch gate) + "Limited"
    day-state is hotel vocabulary for one-wedding-per-date venues. → Wave 6.
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
- 2026-07-18 EXECUTED — the fake-reviews cut is no longer pending: all rating/
  review UI is behind REVIEWS_ENABLED=false. The consumer-protection gap
  flagged 2026-07-12 is closed for launch; the flag flips when a real review
  write path ships post-launch.
- 2026-07-18 DEVIATION (agent, from founder rec) — the per-request 24h SLA
  COUNTDOWN stays. Founder found no category leader showing a ticking clock
  (Airbnb discloses a trailing response-rate %% instead) and recommended
  dropping it; kept because Kapar's 24h TTL is a HARD enforced expiry (the
  request dies), not Airbnb's soft aggregate — hiding a real deadline from
  the vendor would be dishonest. Founder's trailing response-rate stat is
  ACCEPTED for the dashboard (Wave 5/6); the booking_events audit trail
  already contains the data, no new logging needed.
- 2026-07-18 ACCEPTED (founder) — decline reasons upgrade in Wave 5 to
  Booking.com RtB shape: required category + mandatory free text on "other",
  ALWAYS shown to the couple (stricter than Airbnb — cold-start trust vs the
  personal-"no"-over-Viber incumbent). Wave 4 ships optional free text.
- 2026-07-18 ACCEPTED (founder) — Wave 5 notification story: server-backed
  in-app center (notifications table as durable source of truth, unread
  badges only from real events, bell nested in existing headers — no new
  tab); push is a later delivery channel on top, once a device exists to
  verify against.
- 2026-07-17 DEVIATION (agent, reversible) — venue publishing is SELF-SERVE
  for now (draft → publish toggle on Business Today), not admin-approved as
  the Wave 3 roadmap line said. Reason: no admin surface exists yet and none
  is scheduled before Wave 6; blocking vendor onboarding on an unbuilt admin
  tool would dead-end the funnel. The `published` flag + server endpoint are
  unchanged, so inserting an approval step later is additive (BACKLOG Wave 3
  carry-over keeps the admin-review item).
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
