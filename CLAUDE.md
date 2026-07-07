# Kapar — project memory

Mobile-only (Expo/React Native) wedding-venue booking app for North Macedonia. The couple pays
only the **kapar** (reservation deposit) through the app; the balance goes directly to the venue.
Kapar is the product, not a payment option. Read `docs/PRODUCT.md` before product decisions.

## Design law (non-negotiable) — full text in docs/DESIGN-PRINCIPLES.md

- **Simplicity above everything.** Complexity lives in `src/domain/` and the future backend —
  never in the interface. If Booking.com/Airbnb/Apple wouldn't expose it, it's backend logic.
- **One screen, one purpose.** If a screen grows a second competing goal, redesign it.
- **Progressive disclosure.** Show only what's needed to decide/act now; everything else goes
  behind an `ExpandableSection` or a later step. Never long forms — ask only what the next step needs.
- **5-second rule.** A first-time user must understand any screen in under 5 seconds.
- **Every pixel earns its place** — it must reduce uncertainty, increase trust, or increase
  conversion; otherwise delete it. Exception that *stays* visible: kapar amounts and kapar
  protection/refund terms (trust is the product).
- **Thumb-first.** Primary actions live at the bottom (sticky bars); one-handed reach always.
- Inspiration set: **Booking.com, Airbnb, Apple, Uber, Revolut** — NOT power-user tools
  (no Notion/Linear/Stripe-dashboard density).

## Mobbin workflow (required before designing/changing any screen)

1. Search Mobbin (`mcp__Mobbin__*`) for the flow across several relevant apps.
2. Compare patterns: what works, what to avoid, which fits a stressed couple on a phone.
3. Extract structure/interaction — never copy branding, layouts, colors, or text.
4. Pick the **simplest** winning pattern; simplify it further.
5. State: "I checked Mobbin; best pattern is X because Y; I'll simplify by removing Z." Then build.

## Engineering conventions

- TypeScript strict + `noUncheckedIndexedAccess`. Run `npm run typecheck` before committing
  (note: the remote sandbox may block npm — then hand-audit and say so honestly).
- i18n: `src/i18n/mk.ts` is the source of truth for keys; every key must exist in mk, sq, en
  (typed — missing keys fail compile). All user-facing strings go through `useI18n().t`.
- Money: integer MKD only, formatted via `src/lib/money.ts`. Dates: ISO `YYYY-MM-DD` local-time
  strings via `src/lib/dates.ts`. Never `toLocaleString`/Intl for either.
- All text via `AppText`; all touchables via `PressableScale`/`Button` (haptics built in);
  spacing via `spacing(n)` 4pt grid; colors only from `useTheme()` — support light AND dark.
- Kapar business rules live in `src/domain/kapar.ts` (pure functions); booking state changes go
  through the store's `transition` (state machine enforced). The client only *previews* amounts.
- No new native dependencies without explicit discussion (v1 deliberately avoids Reanimated).
- Data access only through `src/data/api.ts` (`VenueApi`) — it is the future backend seam.

## Git

- Branch: `claude/kapar-wedding-venues-mk-wl7neo`. Commit + push when a coherent unit of work is done.
