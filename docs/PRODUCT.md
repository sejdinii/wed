# Kapar — Product

## 1. The market reality we build for

- **Weddings in North Macedonia are large** (200–500 guests is normal) and **venue-centric**: the
  сала is the single biggest decision and cost.
- **Pricing is per guest (куверт)** — menu included, typically 1.100–2.400 MKD/guest. Venues do not
  quote per-event prices; a platform that models per-event pricing is unusable to them.
- **The date comes before the venue.** Families fix the date (church calendar, relatives from
  abroad, "our Saturday"), then hunt for a free hall. Peak season (May–October) Saturdays sell out
  a year or more ahead.
- **Kapar (капар) is the universal mechanism**: a cash deposit, often handed over in person, that
  locks the date. It is legally recognised (Law on Obligations — капар/задаток provisions) but in
  practice undocumented: no receipt beyond a handshake, unclear refund terms, disputes resolved by
  shouting.
- **Diaspora is a first-class segment**: couples in CH/DE/AT/US planning a wedding "back home",
  booking remotely, months ahead — they *cannot* hand over cash and need exactly what we build.

**The wedge:** we don't ask the market to change its behaviour. We take the existing kapar ritual
and make it digital, documented, protected, and bookable at 23:00 on a Tuesday from Zürich.

## 2. Why not clone Booking.com

Full payment through a platform fails here on three fronts: couples won't put 6.000 € through a
mobile app; venues refuse to surrender pricing control and cash flow to an intermediary; and card
penetration/limits make it impractical. The kapar model sidesteps all three — the platform touches
only the deposit (~5–10% of event value), which is simultaneously the venue's guarantee and the
couple's commitment device.

**Revenue model (target):** commission on kapar (venue-side, ~10–15% of the deposit) +
subscription tier for venues (calendar/CRM tools, promoted placement). The couple pays **zero
platform fees** — trust demands it, and the venue funds the marketplace as the party receiving
guaranteed, dispute-free deposits.

## 3. Kapar as a product system

### 3.1 Booking lifecycle (the state machine in `src/domain/types.ts`)

```
pending_kapar ──pay──▶ reserved ──venue confirms (≤24h)──▶ confirmed ──event──▶ completed
      │                    │                                   │
      ▼ hold expires       ├── couple cancels ──▶ cancelled_by_couple (refund per ladder)
   expired                 └── venue declines/cancels ──▶ cancelled_by_venue (100% refund)
```

### 3.2 Kapar Protection (the trust engine)

1. The kapar is **held by the platform**, not wired straight to the venue.
2. The venue must **confirm within 24 hours** or the couple is refunded in full, automatically.
3. If the venue ever cancels, **100% refund, immediately** (and the venue's ranking suffers).
4. Payout to the venue happens on confirmation (later: split payout schedules).

This converts the single scariest moment in wedding planning — handing money to a business you
met once — into the platform's strongest argument. It is also why venues accept the commission:
a platform-guaranteed deposit is worth more than a cash promise.

### 3.3 Kapar policy per venue

- `fixed` (traditional: "30.000 денари го држи датумот") or `percent` of the estimated total with
  a floor (`minAmountMkd`).
- Percent amounts are rounded to 500 MKD so quotes look like real kapar figures.
- **Refund ladder** (`refundTiers`): e.g. 100% refund ≥180 days out, 50% ≥90, 0% after — rendered
  everywhere as a green/amber/red timeline with *actual calendar dates*, never prose.

### 3.4 Where every screen earns its place

| Screen | Conversion job | Trust job |
|---|---|---|
| Explore | Date-first search → instant "free on your date" list | Kapar amount visible on every card — no bait pricing |
| Venue detail | Sticky CTA anchored on the *kapar*, not the scary total | Kapar terms + refund ladder + protection, above the fold of intent |
| Checkout step 1 | Calendar leads; guests step by tables of 10; live estimate | Blocked dates struck through — availability is honest |
| Checkout step 2 | One tap from money | The entire screen is the terms: pay-now vs pay-at-venue, dated refund ladder, explicit consent |
| Payment | Only the kapar amount on screen | 3-D Secure note; card never stored |
| Confirmation | Ends in the Bookings ledger, not a dead end | Wallet-style Kapar Card = the digital receipt culture never had; honest "venue confirms in 24h" state |

## 4. Personas

1. **The couple (26–34, Skopje/diaspora)** — mobile-native, price-aware, terrified of losing the
   date. Needs: real availability, total cost clarity, proof of reservation.
2. **The venue owner (45–60, family business)** — runs the calendar in a paper notebook; fears
   double bookings and no-shows; loves deposits. Needs: guaranteed kapar, filled off-peak dates,
   zero forced discounting. (Partner portal — next release.)

## 5. Roadmap

- **v0.2 — Backend + accounts**: NestJS/Postgres (see ARCHITECTURE.md), phone-OTP auth, server
  availability, push notifications (venue confirmed / refund windows closing).
- **v0.3 — Payments**: CaSys cPay (domestic cards, 3-D Secure) + Stripe (diaspora), escrow ledger,
  automated refunds per ladder.
- **v0.4 — Venue partner app**: calendar management, booking inbox, kapar payouts, contract
  templates (bilingual mk/sq PDF).
- **v0.5 — Marketplace depth**: reviews (verified — only completed bookings), photographers/bands
  /decor as attach-rate categories, seasonal pricing.
- **Expansion**: Kosovo & Albania first (kapar/kapari is the same word and ritual; sq locale
  already ships), then Serbia/Montenegro/Bosnia. Architecture is multi-country from day one:
  country config = currency + payment provider + legal pack + locale set.

## 6. Non-goals (v1)

- No in-app payment of the **balance** — that stays venue-direct by design (it's the moat, not a gap).
- No lead-gen/"request a quote" mode — Kapar sells *reservations*, not contact forms.
- No web app — the couple's journey is mobile; venues get web later where it belongs (back office).
