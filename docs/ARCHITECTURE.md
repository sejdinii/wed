# Kapar — Architecture

## Client (this repo)

**Expo SDK 54 / React Native 0.81 / TypeScript strict.** One codebase, Android-first market
(~80% Android in North Macedonia), OTA updates via EAS. React Native over Flutter for shared
TypeScript types with the future backend and the regional hiring pool.

### Layering

```
app/            routes only — screens compose, they don't own business logic
src/design/     tokens → theme → primitives (the design system; no feature knowledge)
src/components/ feature components (know the domain, use the design system)
src/domain/     pure business rules: types, kapar math, state machine (no I/O, unit-testable)
src/data/       VenueApi interface + MockVenueApi (swap point for HTTP client)
src/stores/     Zustand: preferences / favorites / bookings (persisted), bookingDraft (ephemeral)
src/i18n/       typed dictionaries; mk is the source of truth for the key set
src/lib/        money (integer MKD, manual grouping), dates (ISO strings, data-driven names), haptics
```

Dependency direction is strictly downward: `app → components → design/domain/data/stores → lib`.
Nothing imports upward; `domain/` imports nothing but `lib/dates`.

### Deliberate decisions

- **Money = integer denars.** Deni don't exist in venue pricing; integers are exact. Multi-currency
  later = introduce `{ amount, currency }` at the domain layer; all formatting already flows
  through `lib/money`.
- **Dates = ISO `YYYY-MM-DD` strings** parsed as *local* time (event dates are venue-local).
  Month/weekday names ship as data per locale — no Intl/ICU variance across devices, trivially
  testable.
- **No Reanimated in v1.** Core `Animated` covers springs/fades/pulses. Cuts the two most
  version-fragile native deps while the project can't yet run CI typechecks; revisit for
  shared-element transitions.
- **Booking state machine enforced in the store** (`canTransition`) so no UI path can produce an
  illegal state; the same table moves server-side verbatim in v0.2.
- **Draft checkout is not persisted.** A half-finished checkout must not resurrect with a stale
  date at the payment step days later.
- **Client never invents amounts.** Kapar/estimate math lives in `domain/kapar.ts` and is treated
  as a preview; the backend will recompute and be authoritative.

### The design system

- Tokens (`src/design/tokens.ts`): 4pt spacing grid, radius scale, type scale, elevation, durations.
- Brand: deep botanical green + gold + ivory ("ceremonial trust") — deliberately not Booking-blue
  or Airbnb-coral. Playfair Display (display serif) + Manrope (UI sans) — **both Cyrillic-complete**,
  a hard requirement for Macedonian.
- Every touchable goes through `PressableScale` (spring scale + haptic) — one physical language.
- Full light/dark themes; dark mode uses hairline borders instead of shadows.
- Text only via `AppText` (type-scale + palette enforced); `allowFontScaling` stays on.

## Backend (v0.2 — not in this repo yet)

- **NestJS + PostgreSQL + Prisma**, deployed EU-region (data locality for MK/EU users).
- Services: catalogue, availability (source of truth; the venue's calendar is a ledger of holds +
  bookings), booking orchestration (the state machine + timers: kapar hold expiry, 24h venue
  confirmation deadline), payments/escrow ledger (double-entry from day one — refund ladders and
  payouts demand it), notifications (push/SMS/email).
- **Payments**: CaSys cPay for domestic cards (3-D Secure), Stripe for diaspora; provider chosen
  per card/country behind one `PaymentGateway` interface — the client already talks to a mock of it.
- **Concurrency rule #1**: date locking is a transactional insert on `(venue_id, date)` — a date
  can be held by exactly one `pending_kapar` booking at a time (short TTL hold).

## Multi-country expansion

Country = configuration, not a fork: currency + formatting, payment providers, legal pack
(kapar/deposit law text, contract templates), locale set, city list, seasonal calendar. The i18n
key system, money module, and domain model already take locale/currency as parameters; nothing in
the client assumes MKD beyond the seed data.

## Testing strategy (next)

- `domain/` and `lib/` are pure — unit-test first (kapar math, refund ladders, state machine,
  date/money formatting across all three locales).
- Component tests for KaparBreakdown/RefundTimeline (the two components where a bug costs trust).
- E2E (Maestro) on the golden path: search → venue → checkout → confirmation.
