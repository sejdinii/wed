# CONTRACTS.md — the shared law for parallel wave work
# Read this BEFORE touching code in any wave slice. Facts below were extracted
# from the actual code on 2026-07-10 (post pay-at-visit + cancellation rework).
# If code and this file disagree, the code is right — fix this file in the
# same PR that changed the code.

## How waves use this file
- The wave loop runs via `/next-wave` (checkpoint + launch) per the
  `/parallel-build` protocol: the orchestrator freezes a WAVE spec per slice,
  launches worktree-isolated wave-implementers in parallel, and merges at the
  checkpoint. The `founder` agent researches in the background and writes ONLY
  to BACKLOG.md; its findings enter the build only at checkpoints.
- Each slice OWNS the files listed in its frozen spec, exclusively, for that
  wave. Two slices touching the same screen never ride the same wave.
- Everything in the FILE OWNERSHIP → SHARED list is **orchestrator-only**: a
  slice that needs a SHARED change (route registration, dependency, i18n keys,
  store/domain change) requests it in its result notes; the orchestrator
  applies it at the checkpoint. Never edit SHARED files in a slice.
- Every slice ships loading/empty/error states, all three locales, and
  run-verification (see Verification standard at the bottom). Integration is
  only done when the MERGED app boots and typechecks — per-slice green is not
  enough.

## Stack & commands
- Expo SDK 54 · React Native 0.81 · expo-router 6 (typed file routes)
- TypeScript 5.9 strict · zustand 5 (+ AsyncStorage persist) · @expo/vector-icons
- `npm run typecheck` — tsc --noEmit (the only gate today; CI comes in Wave 0)
- `npx expo start --web --offline` — cloud sessions MUST pass `--offline`
  (api.expo.dev is proxy-blocked) · metro.config.js pins zustand to CJS (do
  not remove) · headless verify: Playwright + `/opt/pw-browsers/chromium`
- Dev switch `globalThis.__KAPAR_API_FAIL__ = true` makes every API call
  reject — use it to drive error states.
- Planned backbone (Wave 0, per DECISIONS LOG): npm workspaces monorepo —
  `server/` (Node 22 + Fastify + Drizzle + PostgreSQL 16) and
  `packages/domain` (shared kapar math + zod schemas); Railway (EU) + R2 +
  Resend + Expo Push proposed.

## FILE OWNERSHIP
**SHARED — orchestrator-only (high contention / architectural):**
| File(s) | Why |
|---|---|
| `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | route registration, navigation options, auth gate |
| `package.json`, `package-lock.json`, `tsconfig.json`, `app.json`, `metro.config.js` | dependency + build surface |
| `src/design/tokens.ts`, `src/design/theme.tsx` | the design system's constitution |
| `src/domain/types.ts`, `src/domain/kapar.ts` | data shapes + booking state machine + money math |
| `src/stores/*` | persisted shapes; every change needs a version bump + migrate |
| `src/data/venues.ts` (seed), `src/data/api.ts` (interface) | seed data + repository boundary |
| `src/i18n/mk.ts`, `en.ts`, `sq.ts` | mk is the Dict source of truth; merged centrally (slices PROPOSE keys in their notes; orchestrator lands them) |
| `FEATURES.md`, `CONTRACTS.md`, `BACKLOG.md` | project memory |
| (Wave 0+) `server/db/schema.ts`, migrations, `packages/domain/*` | one schema, one law |

**Slice-ownable:** individual screens under `app/` (except _layouts), individual
components under `src/components/` and `src/design/components/` (new ones
freely; existing ones only if the slice spec grants them), `src/lib/*` helpers
(additive), (Wave 0+) individual server route modules under `server/routes/`.

## Design tokens (actual values)
- **Spacing**: `spacing(n) = n × 4` (4pt grid). spacing(4)=16 is the standard screen padding.
- **Radius**: xs 6 · sm 10 · md 14 · lg 18 · xl 26 · pill 999
- **Type scale** (all Manrope): display 800/26/32 · title 800/20/26 · heading 800/17/22 · subheading 700/15/20 · body 500/14/20 · bodyStrong 700/14/20 · bodySm 500/13/18 · bodySmStrong 700/13/18 · label 600/12/16 · caption 600/11/14 · price 800/16/20 · priceHero 800/30/36
- **Shadows**: `shadow.card` {#3B2E6E, y3, 0.08, r10, elev3} · `shadow.raised` {#3B2E6E, y8, 0.14, r20, elev8} — light mode only; dark mode uses borders.
- **Light palette**: background/surface #FFFFFF · surfaceElevated #F1EFF8 · text #1E1B2E · textSecondary #5A5670 · textTertiary #8D89A3 · primary #5B21B6 · onPrimary #FFF · mint #F0EDFA · onMint #4C1D95 · chip #1E1B2E · onChip #FFF · amber #D97706 / amberSoft #FBF0DC · success #16A34A / successSoft #E8F7EE · danger #DC2626 / dangerSoft #FCE9E9 · urgency #DC2626 · gold #5B21B6 · border #E7E4F0 · borderStrong #CDC8DE · skeleton #ECE9F4 · overlay rgba(30,27,46,.55)
- **Dark palette**: background #141221 · surface #1B1830 · surfaceElevated #232040 · text #EDEBF5 · primary #8B5CF6 · mint #292344 / onMint #C4B5FD · borders #2B2748/#413C66 (full table in `src/design/theme.tsx`)
- **Fonts**: Manrope 400/500/600/700/800 via @expo-google-fonts, loaded in root layout.
- RULE: never hardcode a color/size in a screen — always tokens + `useTheme()`.
  Text only via `AppText`. Pressables via `PressableScale` or `Button`.

## Component inventory
**Design system (`src/design/components/`)** — AppText (variant+color+align);
Button (title/onPress; variants primary|dark|mint|outline|ghost|danger; sizes
sm|md|lg; loading/iconLeft/fullWidth); Badge (label; tones
neutral|success|warning|danger|gold|urgency; dot); Chip (label/selected/icon);
Card (padded surface + shadow); Screen (SafeArea wrapper, `edges` prop);
Divider (inset); PressableScale (spring scale + haptic wrapper); Skeleton
(pulsing placeholder); EmptyState (icon/title/body/action); ErrorState
(onRetry + optional secondary escape); ExpandableSection (accordion);
SegmentedControl (animated thumb, generic key); Stepper (min/max/step=10);
SectionHeader (title + action link); ListItemRow (icon/title/value/chevron);
CalendarMonth (Monday-first, day states available|limited|booked, min date).

**App components (`src/components/`)** — VenueCard (variants
carousel|split|row, urgency pills); ScoreBadge (10-scale violet box);
PhotoCarousel (paged, dots + n/N counter); BrandedImage (failed images →
branded violet gradient — ALWAYS use for venue photos); MonthPager (month nav
around CalendarMonth, a11y-labelled arrows); RefundTimeline (policy ladder,
green→amber→red, concrete dates when eventDateISO given); VenueMap /
VenueMap.web (platform split — web shows a static location card because
react-native-maps is native-only).

## Data shapes (src/domain/types.ts)
- **Venue**: id, slug, published, name, city (13 CityKey values), venueType
  (garden|lake|ballroom|terrace|panoramic|restaurant), halls: Hall[], included:
  IncludedKey[], scores (5 categories, 10-scale), houseRules, foodOptions,
  coords, nearby, address, phone, photos[], capacityMin/Max, menuTiers:
  MenuTier[], amenities: AmenityKey[12], description (per-locale), rating,
  reviewCount, verified, responseTimeHours, featured, kaparPolicy, bookedDates[]
- **Hall**: id, name (per-locale), capacityMin/Max, indoor, areaM2,
  pricePerGuestAdjMkd (per-guest surcharge vs base menus)
- **MenuTier**: id, name/description (per-locale), pricePerGuestMkd — pricing
  is per guest ("куверт"), the local convention; never per-event
- **KaparPolicy**: kind fixed|percent, fixedAmountMkd?, percentOfEstimate?,
  minAmountMkd, refundTiers: RefundTier[] {minDaysBeforeEvent, refundPercent}
- **Booking**: id, confirmationCode ("KPR-XXXXXX"), venueId/Name/Photo, city,
  eventDateISO, guestCount, menuTierId, estimatedTotalMkd, kaparMkd,
  balanceDueMkd, status, createdAtISO, **payByISO?** (kapar deadline once hold
  confirmed), **kaparPaidAtISO?** (venue received kapar in person), **refund?**
  {percent, amountMkd} (stamped at cancellation), timeline:
  {status, at}[], contactName/Phone, specialRequests?, hallName?
- Dates: `YYYY-MM-DD` for event dates (local, never UTC — `src/lib/dates.ts`
  is the only date library); full ISO datetimes for timestamps. Money: integer
  MKD, displayed as € via `src/lib/money.ts` (rounds kapar to 500 MKD).

## Booking state machine (src/domain/kapar.ts — MVP is pay-at-visit; the
## platform NEVER holds money)
```
pending_kapar ──venue confirms hold──▶ reserved ──kapar paid at visit──▶ confirmed ──event──▶ completed
      │                                   │
      ▼ 24h no answer (REQUEST_TTL_HOURS) ▼ payBy missed          any paid state
   expired                             expired          couple cancels → cancelled_by_couple (refund ladder)
                                                        venue cancels  → cancelled_by_venue (ALWAYS 100%)
(pending_kapar and reserved may also be cancelled by either side — free, nothing paid)
```
- Transitions enforced by `BOOKING_TRANSITIONS` + `canTransition()`; the store
  refuses illegal moves. NEVER bypass the store's `transition()`.
- Platform policy constants (single source): `PLATFORM_REFUND_TIERS`
  [{90→100%}, {30→50%}, {0→0%}], `REFUND_GRACE_DAYS 7` (+ event ≥30d away →
  100%), `REQUEST_TTL_HOURS 24`, `KAPAR_PAY_WINDOW_DAYS 7`.
- Pure helpers: `refundPercentFor/refundAmountFor` (grace-aware),
  `kaparPayByISO`, `lifecycleTransitionFor` + store `sweep()` (runs after
  rehydrate; server cron replaces it in Wave 1).
- Copy rule: refunds are always worded as "the VENUE returns X" — the platform
  holds no money in the MVP.

## API surface
Current repository boundary `src/data/api.ts` (screens depend ONLY on this):
`listVenues(filters?)`, `getVenue(id)` (slug or id), `listHalls(venueId)`,
`listReviews(venueId)` — MockVenueApi, 420/210ms latency, documented REST
mapping. Wave 0 adds an HTTP implementation behind a flag; Wave 1 extends the
interface with booking endpoints (`createBookingRequest`, `confirmHold`,
`markKaparReceived`, `cancelBooking`, `listMyBookings`) — interface changes are
SHARED (orchestrator).

## Stores & persistence discipline (all zustand)
| Store | Key | Version | Notes |
|---|---|---|---|
| preferences | kapar.preferences.v2 | 0 | locale/theme/recentCities/phoneVerified(MOCK)/notif toggles |
| bookings | kapar.bookings.v1 | 2 (migrate v1→v2) | ledger + state machine + sweep on rehydrate |
| favorites | kapar.favorites.v1 | 0 | venueIds |
| messages | kapar.messages.v1 | 0 | bookingId-keyed threads |
| bookingDraft | — (in-memory) | — | deliberately dies with the session |
RULE: any change to a persisted shape = version bump + migrate function in the
same commit. Stores are SHARED files.

## Route map (expo-router)
Root Stack (headerless): welcome (fade, no gesture) · verify?phone · search
(fade_from_bottom) · results?city&type&date&guests · venue/[id] ·
reviews/[venueId] · gallery/[venueId]?index (modal) · booking/availability ·
booking/checkout (both read the draft store, redirect to tabs if empty) ·
booking/status?bookingId (fade, no gesture) · booking/cancel?bookingId ·
booking/[id] · messages/[bookingId] · settings · (tabs): index | favorites |
bookings | messages | profile. Auth gate: (tabs) redirects to /welcome unless
`preferences.phoneVerified` — known gap: deep routes are NOT gated (Wave 2).
Business mode (Wave 2+) gets its own route group `(business)` with its own tab
bar — do not overload (tabs).

## i18n contract
- `src/i18n/mk.ts` defines the key set (`Dict = Record<keyof typeof mk, string>`);
  en/sq must satisfy it — a missing key anywhere fails typecheck.
- 366 keys, 38 namespaces today. New features add a NEW namespace (e.g.
  `vendor.*`, `auth.*`); never repurpose existing keys' meaning.
- All three locales land in the same commit. Slices propose keys; orchestrator
  merges (i18n files are SHARED).
- Copy honesty rule (learned the hard way): never claim anything the code
  doesn't do — no "secure payment", no fake social proof, no invented SLAs.

## Verification standard (per slice, non-negotiable)
1. `npm run typecheck` exits 0.
2. The changed flow is DRIVEN in headless Chromium against Metro (web) — zero
   console errors; screenshots for anything visual. Error paths driven via
   `__KAPAR_API_FAIL__` where relevant.
3. FEATURES.md row updated with "Verified how".
4. One slice = one commit; message says what changed and how it was verified.
