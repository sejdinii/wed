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

## MVP Definition of Done
An MVP is DONE when: the app boots with zero errors, every CORE flow below is
DONE (not PARTIAL), every screen has loading/empty/error states, and the
critical-path demo (search → view venue → book → confirmation) runs end-to-end
on device/simulator without a crash.

## CORE FLOWS (MVP-blocking)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Venue search + filters | PARTIAL | static code trace 2026-07-09 | home → search → results built vs MockVenueApi (16 seeded venues, src/data/api.ts). Loading+empty states yes; NO error state; "Map view" pill is a dead end (results.tsx:299) |
| Venue detail page (gallery, pricing, availability) | PARTIAL | run-verified (web) 2026-07-09b | Gallery, halls, reviews, map, 410-unpublished state built. `fullRefundDays` crash FIXED + verified on panorama-garden (multi-hall renders). Still no error state |
| Booking flow (date select → request/confirm) | PARTIAL | run-verified (web) 2026-07-10 | REWORKED to pay-at-visit (decision 2026-07-09): card form deleted; checkout = Contact › Event › Review, submit creates a `pending_kapar` request, no money online. Full flow driven in browser. Still missing: availability re-check at submit, error state on the venue fetch, draft store in-memory |
| Double-booking prevention | MISSING | static code trace 2026-07-09 | Client-only filter on static `venue.bookedDates`; a completed booking NEVER writes back to bookedDates, so the same venue+date can be booked twice even on one device. Real fix is server-side |
| Booking confirmation + status screen | PARTIAL | run-verified (web) 2026-07-10 | Now 3-phase (request sent → date held w/ payBy deadline → kapar received); all three verified live in browser. venueBot compresses the venue visit to 75s (documented fiction). Bot timers still die on restart, but the new lifecycle sweep expires stuck requests/holds on next launch. "Add to calendar" still a no-op |
| Auth (signup/login, both user types) | STUB | static code trace 2026-07-09 | welcome (phone) + verify (OTP) screens exist, but ANY 6 digits pass (verify.tsx:33); no SMS, no sessions, no accounts. Wall only guards the (tabs) group — venue/booking routes reachable via deep link unauthenticated. No vendor auth at all |
| Vendor: venue listing creation/edit | MISSING | static code trace 2026-07-09 | Zero vendor-facing code. "Become a Partner" button is a no-op (profile.tsx:87) |
| Vendor: calendar/availability management | MISSING | static code trace 2026-07-09 | bookedDates are hardcoded in src/data/venues.ts |
| Vendor: incoming booking requests | MISSING | static code trace 2026-07-09 | Faked by venueBot auto-confirm + hardcoded Macedonian chat messages |
| Cancellation/refund flow | BLOCKED | static code trace 2026-07-09 | Policy still undecided (user decision). Refund math (domain/kapar.ts:87-98) and read-only RefundTimeline exist, but there is NO cancel button anywhere — `cancelled_by_*` states are unreachable from the UI |

## REQUIRED BUT NOT CORE (post-boot, pre-launch)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Empty states (all list screens) | PARTIAL | static code trace 2026-07-09 | bookings/favorites/messages/results/booking-detail have EmptyState. Missing: home venue rails ((tabs)/index.tsx), reviews list (reviews/[venueId].tsx) |
| Error states + retry (all network screens) | MISSING | static code trace 2026-07-09 | ZERO error UI in the app. 8 unguarded `await venueApi.*` calls (index:46, favorites:26, results:102, venue/[id]:83, gallery:34, reviews:37, availability:43, checkout:84) — a failure = silent infinite skeleton |
| Reviews/ratings | STUB | static code trace 2026-07-09 | Deterministically generated fake reviews (src/data/reviews.ts), display-only; no write path |
| Notifications (booking status changes) | MISSING | static code trace 2026-07-09 | Home notification bell is a no-op ((tabs)/index.tsx:112) |
| Deposits/payments | DONE | run-verified (web) 2026-07-10 | DECIDED 2026-07-09: MVP has NO online payments — kapar is paid in person at the venue visit. Card form + fake gateway deleted (PCI risk gone); all "secure payment" claims reworded in en/mk/sq; profile "Payment methods" row removed. Online rails (CaSys/Stripe) become a post-launch feature |
| Onboarding (first-run) | PARTIAL | static code trace 2026-07-09 | welcome → verify → tabs flow with redirect gate ((tabs)/_layout.tsx:26). Terms/Privacy links are no-ops |
| Profile/settings | PARTIAL | static code trace 2026-07-09 | Profile tab + settings (language en/mk/sq, theme) work. Dead buttons: personal info, payment methods (profile.tsx:61,63), terms/privacy (settings.tsx:128,130), help (booking/[id].tsx:177) |

## DISCOVERED GAPS (agent appends here when it finds unstated requirements)
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
  this session (see next line).
- 2026-07-09 ENVIRONMENT: the remote session's network policy blocks
  registry.npmjs.org → npm ci fails → app cannot boot in cloud sessions.
  RESOLVED 2026-07-09b: registry is now allowlisted; npm install works. Two
  standing quirks: (1) api.expo.dev is still blocked, so `expo start` crashes
  unless run with `--offline`; (2) zustand v5's ESM build uses `import.meta`,
  which kills the classic-script web bundle on boot — metro.config.js now pins
  zustand to CJS (committed). Unsplash photo hosts are also blocked here, so
  venue photos show the BrandedImage fallback in cloud runs.

## DECISIONS LOG
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
