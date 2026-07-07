# Kapar — Свадбени сали, резервирани со капар

**The Booking.com for wedding venues in North Macedonia — built mobile-only, around the local
reservation deposit (капар / kapar) instead of full upfront payment.**

Couples browse venues, check real availability for *their* date, and lock it by paying only the
**kapar** through the app. The balance is paid directly to the venue on the venue's own terms.
Kapar is not a payment feature — it is the product.

## Why kapar-first wins

| | Full-payment platforms | Kapar |
|---|---|---|
| Commitment asked on mobile | 300.000–900.000+ ден. | 15.000–40.000 ден. |
| Venue's incentive to join | Loses control of pricing & payments | Keeps its own payment terms, gets guaranteed deposits + a full calendar |
| Trust model | Foreign platform holds everything | Deposit held in escrow ("Kapar Protection") until the venue confirms |
| Cultural fit | Imported | Formalises what every Macedonian venue already does with cash |

## Stack

- **Expo SDK 54 · React Native 0.81 · TypeScript (strict, `noUncheckedIndexedAccess`)**
- **Expo Router** (file-based navigation), **Zustand** (+ AsyncStorage persistence)
- Custom design system — no UI kit. Playfair Display + Manrope (both Cyrillic-complete), light & dark themes
- i18n: **Macedonian (primary), Albanian, English** — typed dictionaries; a missing key is a compile error
- No Reanimated/gesture-handler in v1 — all motion uses the built-in `Animated` API (deliberate: fewer fragile native deps until we need shared-element transitions)

## Getting started

```bash
npm install
npm run typecheck   # tsc --noEmit
npm start           # Expo dev server → scan with Expo Go (iOS/Android)
```

> Note: this repository was authored in a sandboxed environment without npm registry access;
> dependency versions are pinned to Expo SDK 54 ranges. If `npm install` reports a peer conflict,
> run `npx expo install --fix` to align versions.

## Project structure

```
app/                    # Expo Router routes
  (tabs)/               #   Explore · Saved · Bookings · Profile
  venue/[id].tsx        #   Venue detail (sticky kapar bar)
  booking/              #   3-step checkout: date → review → pay → confirmed
src/
  design/               # Tokens, themes, primitive components (the design system)
  components/           # Feature components (VenueCard, KaparBreakdown, RefundTimeline, …)
  domain/               # Types + kapar business rules (pure, testable)
  data/                 # Repository-pattern API (mock now, HTTP later)
  stores/               # Zustand stores (preferences, favorites, bookings, draft)
  i18n/                 # mk / sq / en dictionaries
  lib/                  # money, dates, haptics
docs/
  PRODUCT.md            # Market, kapar deep-dive, booking lifecycle, roadmap
  ARCHITECTURE.md       # Client architecture + backend/expansion plan
```

## Status

v0.1 — full consumer flow working end-to-end against seeded data: discovery (date-first search),
venue detail, kapar checkout with refund-ladder transparency, wallet-style confirmation, booking
ledger, trilingual UI, dark mode. Payments are a marked mock (CaSys cPay / Stripe integration
point). Venue-partner portal, accounts and backend are next — see `docs/PRODUCT.md`.
