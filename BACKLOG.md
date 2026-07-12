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
Nothing wave-invalidating found in this pass (2026-07-12) — all three tasked
items below are confirmatory/refining, not category-shift discoveries. Nothing
appended here.

## TASKED RESEARCH (orchestrator → founder, 2026-07-10 — highest priority)
# STATUS 2026-07-12: all three items completed this run. Full findings filed
# under DESIGN INTEL / PROPOSED FEATURES / RISKS below. Research-method note:
# partner.booking.com, Mobbin, and even control URLs (en.wikipedia.org) all
# returned HTTP 403 to WebFetch in this environment all session (proxy-level,
# not target-specific — confirmed by testing a neutral Wikipedia URL). No
# direct screenshots or Mobbin captures were obtainable. Every finding below
# is reconstructed from WebSearch's indexed snippets of the same official
# partner.booking.com help-center articles, developer docs, and app-store
# listings, with source URL + retrieval date cited per item. Recommend a
# second research pass with direct WebFetch/Mobbin MCP once proxy access to
# partner.booking.com is restored, before the WAVE 6 design-critic visual
# lock — flagged again under RISKS below.
- [x] **Booking.com extranet research pack (GATES Waves 3–4).** Findings under
  DESIGN INTEL → "VENDOR EXTRANET (Booking.com + Pulse)".
- [x] Cancellation + pay-at-visit checkout patterns, 2025/26 references.
  Findings under DESIGN INTEL → "CANCELLATION & PAY-AT-VISIT PATTERNS".
- [x] Competitor scan for the Balkan wedding-venue market. Findings under
  RISKS → "BALKAN WEDDING-VENUE MARKET".

## PROPOSED FEATURES
| Feature | Evidence (source) | Impact (blocking/valuable/later) | Touches | Verdict |
|---|---|---|---|---|
| | | | | |
| Surface the grace window as a permanent line on `RefundTimeline`, not only as a conditional note computed after the fact in `cancel.tsx` | Airbnb applies a universal 24h full-refund guarantee on top of ALL four of its policy tiers (Flexible/Limited/Moderate/Firm) and states it as a standing policy fact, not a surprise. Source: [Airbnb Cancellation Policy Guide 2026 – Zeevou](https://zeevou.com/blog/what-you-need-to-know-about-airbnbs-strict-cancellation-policy/), [Airbnb Cancellation Policy 2026: What Replaced Strict – BNBCalc](https://www.bnbcalc.com/blog/airbnb-business/how-to-start-airbnb/airbnb-cancellation-policy-2025-update), retrieved 2026-07-12. Confirmed in-repo: `src/components/RefundTimeline.tsx` renders only the ladder tiers; `REFUND_GRACE_DAYS`/`graceApplies` logic exists only inside `app/booking/cancel.tsx` and is invisible until the couple is already cancelling. | valuable (trust/transparency parity — a couple deciding whether to book should see the grace window on the venue detail page and at checkout step 3, not discover it only mid-cancellation) | `src/components/RefundTimeline.tsx` (add a grace row/note), `packages/domain` kapar constants (already exist, read-only), venue detail page + `app/booking/checkout.tsx` step 3 (both already render `RefundTimeline`, so this is a single-component change surfacing everywhere for free) | |
| Account-level no-show / repeat-cancellation signal for couples | OpenTable auto-deactivates a diner's account after 4 no-shows in 12 months, and assesses no-show fees (2% platform surcharge on top of restaurant-set fees, rolled out H2 2025–early 2026). Source: [OpenTable no-show policy](https://help.opentable.com/s/article/What-is-your-no-show-policy-1505261059461?language=en_US), [OpenTable 2% service fee rollout — The Inquirer, Jan 2026](https://www.inquirer.com/food/restaurants/opentable-service-fee-no-show-restaurant-reservation-20260114.html), retrieved 2026-07-12. | later (trust & safety; needs booking volume before it matters, but vendors will ask for it once the WAVE 4 request inbox ships and they start seeing repeat late-cancellers) | server: new aggregation over `booking_events` per user (cancellation/no-show count); WAVE 4 vendor request-inbox UI (small badge only) — does not touch any couple-side screen | |
| Vendor dashboard home = single "today" action feed (new requests, upcoming visits, messages, reviews together), not a stats/performance page first | Booking.com's Pulse app leads with "Today's activity" — arrivals, departures, new bookings, cancellations, modifications, and reviews shown together on landing, before any performance chart. The desktop Extranet home, by contrast, shows arrivals/departures/stay-overs first, then the calendar, then performance analytics/Opportunities — Pulse's stream-first ordering is the one worth cloning for a mobile-first vendor surface. Source: [Everything you need to know about the Pulse app – Booking.com for Partners](https://partner.booking.com/en-us/help/account-and-log/extranet-pulse/everything-you-need-know-about-pulse-app), [Pulse for Booking.com Partners – App Store](https://apps.apple.com/us/app/pulse-for-booking-com-partners/id992795726), [Extranet – Booking.com for Partners](https://partner.booking.com/en-us/solutions/extranet), retrieved 2026-07-12. | blocking-adjacent — this decides the IA of the vendor shell before WAVE 2's scaffold and WAVE 4's bookings dashboard are built independently and end up disagreeing | WAVE 2 "profile ⇄ Business mode switch scaffold + vendor shell" + WAVE 4 "vendor bookings dashboard" — same home screen, should be spec'd together even though they're different waves | |
| 3-state availability calendar (open / closed-by-vendor / booked-by-a-couple) instead of Booking.com's binary green(open)/red(closed) | Booking.com's Extranet calendar only distinguishes open (green) vs closed (red); a closed date is reopened by clicking the "Rooms to sell" row. There is no visually distinct third state for "unavailable because an existing reservation holds it" vs. "host chose to block it" — those are different actions for a vendor (can't just click to reopen a booked date) and must not be cloned as identical. Source: [Updating your rates and availability – Booking.com for Partners](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/updating-your-rates-and-availability), [Updating your availability calendar on the Extranet](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/setting-availability-planner), retrieved 2026-07-12. | blocking — WAVE 3 P0 "availability calendar: open/close dates, see booked dates" already lists this as a requirement; this finding is the deviation rationale to write into that wave spec (gap already tracked: "bookedDates hardcoded in venues.ts") | WAVE 3 availability calendar screen; WAVE 1 double-booking/availability domain logic (booked-date source of truth) | |
| Per-venue rates/cancellation-policy editor, keyed to calendar date-ranges (seasonal), not one flat per-venue override | Booking.com lets hosts pick Fully-flexible vs. Customized per rate plan and bulk-apply across properties. Airbnb went further in March 2026 with a "Seasonal Cancellation Policy" letting hosts vary the policy by date range directly from the listing calendar. Source: [Setting up cancellation policies – Booking.com for Partners](https://partner.booking.com/en-us/help/policies-payments/policies/setting-cancellation-policies), [Can I set up the same policies for all of my properties at once?](https://partner.booking.com/en-us/help/policies-payments/policies/can-i-set-same-policies-all-my-properties-all-once), [Airbnb Cancellation Policy 2026: What Replaced Strict – BNBCalc](https://www.bnbcalc.com/blog/airbnb-business/how-to-start-airbnb/airbnb-cancellation-policy-2025-update), [Reducing Cancellations & Vacancies – RentLivePlay 2026 guide](https://www.rentliveplay.com/investor-and-owner-resources/reducing-cancellations-and-vacancies-smarter-airbnb-booking-policies), retrieved 2026-07-12. | later — refines the ALREADY-QUEUED WAVE 6 P2 "per-venue kapar policy editor" rather than adding new scope: build it keyed to a date range from day one so wedding-season vs. off-season policies don't require a second migration | WAVE 6 P2 item only — spec refinement, no new wave | |
| Viber as an additive vendor-notification channel (not a replacement for Expo push) | Viber has claimed 90%+ phone penetration in several Balkan markets and is the dominant business-messaging channel regionally (order confirmations, booking receipts); North Macedonia is among the CEFTA markets where >90% of users use a messaging app like Viber/Messenger/WhatsApp, above the EU-27 average of 75%. An older or less tech-savvy venue owner in MK is more likely to reliably see a Viber message than to have the vendor app open. Source: [Viber for Business – messageflow.com](https://messageflow.com/blog/viber-for-business-multi-channel-marketing/), [Internet Activities – North Macedonia, ecommerce4all.mk](https://ecommerce4all.mk/en/ecommerce-data/internet-activities/), [Viber Market: An In-Depth Look — messaggio.com](https://messaggio.com/blog/viber-market-an-in-depth-look-at-messenger-impact-in-europe/), retrieved 2026-07-12. | later (post-MVP; Expo push is the correct WAVE 4 default) | WAVE 4 push notification service only — additive channel; the WAVE 2 auth endpoint is already specced "channel-pluggable" for SMS, the same principle should extend here with no rework | |

## DESIGN INTEL

### VENDOR EXTRANET (Booking.com + Pulse) — sourced via WebSearch synthesis of
### partner.booking.com help-center articles, developer docs, and app-store
### listings, retrieved 2026-07-12 (direct WebFetch to these URLs returned
### HTTP 403 in this environment all session — see TASKED RESEARCH note above)

1. **Extranet dashboard home / nav structure.** Top-level tabs: Reservations,
   Rates & Availability, Property, Finance, plus opt-in Programs (Genius,
   Preferred Partner) and an "Opportunities" tab for personalized
   recommendations. The home screen leads with today's arrivals/departures/
   stay-overs, then a calendar for availability+pricing, then performance
   analytics, then Opportunities. Source: [Extranet – Booking.com for Partners](https://partner.booking.com/en-us/solutions/extranet), [Understanding Booking.com Extranet account types and access rights](https://partner.booking.com/en-us/help/account-and-log/extranet-pulse/understanding-bookingcom-extranet-account-types-and-access), retrieved 2026-07-12.
   Kapar pattern: lead the vendor dashboard with "what needs action today"
   (requests awaiting response, upcoming visits) before any performance/
   stats module — action-oriented triage, not vanity metrics first. (See
   matching PROPOSED FEATURES row above.)

2. **Reservations list + detail.** List view sortable by arrival date;
   columns = guest name, reservation ID, room/unit, arrival/departure dates,
   meal-plan/rate info, price/day, total price. Filters: date-range "From"/
   "Until" fields + "Show" button, scoped to reservation date, arrival,
   departure, invoice, or stay date, plus an expandable "More filters" panel.
   Clicking the Reference number or Guest name opens guest requests/
   messages, contact details, and (for Booking.com) card info. Source:
   [Checking information about reservations made at your property](https://partner.booking.com/en-us/help/first-steps/first-reservations/reviewing-information-about-reservations-made-your-property), [What information about reservations can I see in the extranet? – Partner Help](https://partnerhelp.booking.com/hc/en-gb/articles/360001423048-What-information-about-reservations-can-I-see-in-the-extranet-), retrieved 2026-07-12.
   Kapar mapping: request-inbox row = couple name, event date, guest count,
   hall/menu tier, status chip, request-received timestamp with a visible
   24h-SLA countdown; detail = same fields as the checkout review step, plus
   an internal notes field (no card info — N/A for Kapar) and confirm/
   decline actions.

3. **Availability calendar (open/close dates).** Two views: list and
   monthly/calendar grid. Color coding: green = open/bookable, red = closed.
   A closed date is reopened by clicking the "Rooms to sell" row (flips red
   → green). Hosts can schedule a future reopening date ahead of time (e.g.
   seasonal closures/renovation). Source: [Updating your rates and availability](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/updating-your-rates-and-availability), [Updating your availability calendar on the Extranet](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/setting-availability-planner), [Preparing your property for reopening](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/preparing-your-property-reopening), retrieved 2026-07-12.
   Deliberate deviation for Kapar: 3 states, not 2 (open / closed-by-vendor /
   booked-by-a-couple) — see PROPOSED FEATURES row above for why Booking.com's
   binary model is wrong to clone here.

4. **Property content editor.** Entry point: Property tab → Property
   Details; description text is largely auto-generated from structured
   fields (facilities, room details, location) rather than free-typed —
   hosts request corrections per-section via Property → "View your
   descriptions" → "Request a correction". Facilities are a checkbox list
   under Property → Facilities & services. Source: [Changing your property description or room details](https://partner.booking.com/en-us/help/property-page/general-info/changing-your-property-description-or-room-details), [Updating your property page](https://partner.booking.com/en-us/help/property-page/general-info/updating-your-property-page), [Updating your property's facilities](https://partner.booking.com/en-us/help/property-page/general-info/updating-your-property%E2%80%99s-facilities), retrieved 2026-07-12.
   Deliberate deviation for Kapar: locale tabs (en/mk/sq) for the free-text
   fields rather than a single auto-generated blurb — justified because
   Kapar is multi-locale from day one; Booking.com's single-market-per-listing
   model isn't a fit here.

5. **Photo manager.** Location: Property tab → Photos. Cover/main photo =
   first photo in "Photo Gallery"; changed by dragging a newly uploaded
   photo (via the "Upload more photos" button) into the first slot.
   "Smart ordering" (ML-based) auto-arranges the rest for conversion —
   worth noting as a later nice-to-have, not MVP. Guidance: at least 20
   photos across room types/common areas/amenities; only upload photos the
   host owns or is licensed to use — unlicensed photos get removed. Source:
   [Uploading, deleting, reordering, and editing photos](https://partner.booking.com/en-us/help/property-page/photos-extranet/how-do-i-add-change-and-update-my-property-photos), [Understanding photo requirements for your property](https://partner.booking.com/en-us/help/property-page/photos-extranet/understanding-photo-requirements-your-property), retrieved 2026-07-12.
   Kapar mapping: drag-to-reorder, explicit "set as cover" affordance, a
   minimum-photo-count nudge before submit-for-publish, and a copyright
   attestation checkbox at upload time — ties directly into the standing P2
   item "real venue photo plan" in USER DECISIONS NEEDED.

6. **Rates/policy editor.** Property tab → Policies. Two templates: "Fully
   flexible" (guest pays only at the stay, free cancellation up to a host-
   chosen cutoff) vs. "Customized" (host sets the free-cancel cutoff and the
   charge after it). Policies can be bulk-applied across a host's multiple
   properties. Source: [Setting up cancellation policies](https://partner.booking.com/en-us/help/policies-payments/policies/setting-cancellation-policies), [Can I set up the same policies for all of my properties all at once?](https://partner.booking.com/en-us/help/policies-payments/policies/can-i-set-same-policies-all-my-properties-all-once), retrieved 2026-07-12.
   Validates the existing MVP simplification: Kapar's single platform-wide
   100/50/0 @ 90/30-day ladder is a deliberate, sane starting point (host-
   configurable-per-listing is the category norm, but not required to launch)
   — and confirms the already-queued WAVE 6 P2 "per-venue kapar policy
   editor" as the correct Booking.com-grade end-state, refined further by
   the Airbnb seasonal-policy finding (see PROPOSED FEATURES).

7. **Pulse app — request → confirm/decline flow.** Booking.com's "Request to
   Book" (RtB) model: the partner receives a booking-request notification
   and has 24 hours to accept or decline; if accepted, the guest then has a
   further 24 hours to complete/confirm the booking, or the request expires
   with no reservation made. This is functionally identical in shape to
   Kapar's existing planned flow (request → 24h vendor response → confirmed/
   payBy window). Source: [Request to Book (RtB) API – developers.booking.com](https://developers.booking.com/connectivity/docs/request-to-book/overview), [Booking.com Request to Book – Hostaway support](https://support.hostaway.com/hc/en-us/articles/19131426972571-Booking-com-Request-to-Book), [Booking.com: Request to Book — HOMHERO/Zendesk](https://homstar.zendesk.com/hc/en-us/articles/14124550113167-Booking-com-Request-to-Book), retrieved 2026-07-12.
   This is the single strongest validating reference for the WAVE 1 P0 "24h
   request / payBy lapse" TTL design already in the gap queue — cite this
   pattern explicitly in that wave spec instead of re-deriving the SLA from
   memory (Rule 2 compliance).

8. **Pulse app home screen / notification model.** Home = a single "Today's
   activity" stream combining arrivals, departures, new bookings,
   cancellations, modifications, and reviews — not separated into per-type
   tabs. Inbox = live chat with guests plus pre-translated message templates
   for quick replies. Reviews screen = read + respond post-checkout.
   Reservation detail (in-app) = guest count, room/unit, nights, total rate +
   nightly breakdown, applicable cancellation policy. Real-time push
   notifications are opt-in, covering new bookings, cancellations, guest
   queries, and reviews. Source: [Everything you need to know about the Pulse app](https://partner.booking.com/en-us/help/account-and-log/extranet-pulse/everything-you-need-know-about-pulse-app), [Pulse for Booking.com Partners – App Store listing](https://apps.apple.com/us/app/pulse-for-booking-com-partners/id992795726), [The Ultimate Guide to Using the Pulse App — mara-solutions.com](https://www.mara-solutions.com/post/the-ultimate-guide-to-using-the-pulse-app-for-booking-com-success), retrieved 2026-07-12. App is under active maintenance: iOS last updated 2026-01-13 (v33.8), Android last updated 2026-03-23, per App Store/Play Store metadata surfaced via WebSearch, retrieved 2026-07-12 — confirms this is a current, not legacy, pattern to clone.
   Direct tie to WAVE 4 P0 "Expo push notifications both sides for every
   status change": this finding gives the exact event set to notify on —
   new request, confirm, decline, cancellation, message, review — and
   validates the single-stream "Today" home screen pattern (see PROPOSED
   FEATURES row above).

### CANCELLATION & PAY-AT-VISIT CHECKOUT PATTERNS, 2025/26 — retrieved 2026-07-12

- **Airbnb (Oct 2025 – Mar 2026 changes).** Four policy tiers now: Flexible
  (full refund ≥24h before check-in), Limited (new Oct 2025 — full refund
  ≥14 days out, non-refundable inside 14 days), Moderate (full refund ≥5
  days out), Firm (full refund ≥30 days out, 50% refund 7–30 days out,
  non-refundable inside 7 days). Strict was permanently retired 2025-10-01,
  with every Strict listing migrated to Firm. A universal 24-hour
  free-cancellation guest-protection window applies on top of whichever
  tier a listing uses. March 2026: a new "Seasonal Cancellation Policy"
  feature lets hosts set different policies per date range directly from
  the listing calendar. Source: [Airbnb Cancellation Policy Guide 2026 – Zeevou](https://zeevou.com/blog/what-you-need-to-know-about-airbnbs-strict-cancellation-policy/), [Airbnb Cancellation Policy 2026: What Replaced Strict – BNBCalc](https://www.bnbcalc.com/blog/airbnb-business/how-to-start-airbnb/airbnb-cancellation-policy-2025-update), [Airbnb Cancellation Policy Guide for Hosts (2026) – iGMS](https://www.igms.com/airbnb-cancellation-policy/), [Reducing Cancellations & Vacancies (2026 Guide) – RentLivePlay](https://www.rentliveplay.com/investor-and-owner-resources/reducing-cancellations-and-vacancies-smarter-airbnb-booking-policies), retrieved 2026-07-12.
  Verdict on Kapar's existing ladder: the 100/50/0 @ 90/30-day shape
  (full-refund-far-out / partial-in-a-middle-band / zero-close-in) matches
  the current category-standard "tiered % at day thresholds" structure —
  this is category convention, not a Kapar invention, and needs no
  correction. The universal 24h/7-day grace window already exists in
  `packages/domain` (`REFUND_GRACE_DAYS`, `REFUND_GRACE_MIN_DAYS_BEFORE_EVENT`)
  and is now validated by Airbnb's identical "grace regardless of tier"
  pattern — but per the PROPOSED FEATURES row above, it is currently only
  surfaced conditionally inside `cancel.tsx`, not stated up front as a
  standing policy fact the way Airbnb states it.

- **OpenTable.** Cancellation cutoffs (commonly 24–48h) are printed clearly
  in the reservation confirmation and reminder emails, not just buried in
  policy pages. Restaurants can require a credit card, set custom no-show
  fees, and OpenTable itself began layering on a 2% service fee on
  no-show/cancellation charges through H2 2025–early 2026. Diner accounts
  are auto-deactivated after 4 no-shows in a 12-month period. Source:
  [OpenTable no-show policy](https://help.opentable.com/s/article/What-is-your-no-show-policy-1505261059461?language=en_US), [Set up Booking Policies with credit card requirements – OpenTable support](https://support.opentable.com/s/article/Manage-your-own-Cancellations-and-No-shows?language=en_US), [OpenTable begins adding a 2% service fee — The Inquirer, Jan 2026](https://www.inquirer.com/food/restaurants/opentable-service-fee-no-show-restaurant-reservation-20260114.html), retrieved 2026-07-12.
  Verdict: validates that `checkout.tsx`'s "How it works" numbered steps and
  the cancellation ladder shown at review time (step 3) are the right
  "state it upfront in the same screen as the commitment" pattern. Gap this
  surfaces that Kapar has none of: an account-level signal for repeated
  cancellations/no-shows (see PROPOSED FEATURES row above).

- **Booking.com "pay at the property" / no-prepayment checkout.** When a
  property has no prepayment policy, that fact is "clearly highlighted
  during the reservation process"; Booking.com/the host still typically
  collects card details for a temporary authorization hold (a test charge
  that is released, not an actual charge) to validate identity and
  guarantee the booking, even though the guest is told they pay at check-in/
  check-out. Source: [Managing guest payments – Booking.com for Partners](https://partner.booking.com/en-us/help/policies-payments/guest-payments/how-do-i-handle-guest-payments), [Booking.com FAQ](https://secure.booking.com/faq.en-us.html?aid=330843), retrieved 2026-07-12. Exact on-screen checkout copy/wording could not be retrieved this session (see the 403 note under TASKED RESEARCH) — this is a gap in the pack, not a contradiction of what's built.
  Verdict: `checkout.tsx` step 3's mint "no online payment" banner already
  matches the "clearly highlighted" principle and goes further than
  Booking.com by not collecting a card at all for authorization — this is a
  deliberate, correct MVP deviation (no online payments per the 2026-07-09
  decision already in the file's comments), not a gap, and should stay
  exactly as built. No correction needed to `checkout.tsx` or `cancel.tsx`
  from this research pass — both screens already clone the "dedicated
  outcome-preview page shown before the couple commits/cancels" pattern
  common to all three references above.

## RISKS

### BALKAN WEDDING-VENUE MARKET — retrieved 2026-07-12

- **Termin.mk is a direct, existing MK competitor.** Live since ~2015 (per
  a faktor.mk "1 година онлајн" retrospective), `termin.mk/svadba` lists
  40+ wedding venues/restaurants across Macedonia, offers a free (to
  couples) request form that "sends a request directly to the desired
  wedding location," and cross-sells discounts across 50+ other wedding
  vendors (photographers, gowns, decor, music, invitations, churches).
  It looks like a lead-gen directory + request form, NOT a stateful
  booking system: no evidence of an online deposit/kapar workflow, a
  cancellation-refund ladder, or a vendor-side confirm/decline SLA with a
  timer. Source: [termin.mk/svadba](https://termin.mk/svadba), [termin.mk/svadba/za-termin-svadba](https://termin.mk/svadba/za-termin-svadba), [termin.mk/svadba/lokacii](https://termin.mk/svadba/lokacii), [faktor.mk retrospective article](https://faktor.mk/termin-mk-1-godina-onlajn-dostapni-termini-za-svadba-rodenden-vo-igroteka-i-sport-i-rekreatsija), retrieved 2026-07-12.
  Risk: Termin has ~10 years of vendor relationships and an established MK
  wedding-venue directory habit. Kapar's actual differentiation has to be
  the trust layer Termin appears to lack (deposit protection, a refund
  ladder, an enforced vendor response SLA) — not discovery/listing breadth,
  where Termin already has a head start.
- **weddbooking.me — second MK-region competitor**, a directory + reviews +
  prices product for wedding/special-occasion venues, active on Instagram/
  Facebook/Pinterest. Appears to be discovery-only (no evidence of a
  transactional booking or deposit flow). Source: [weddbooking.me/en](http://weddbooking.me/en/), [instagram.com/weddbooking.me](https://www.instagram.com/weddbooking.me/), retrieved 2026-07-12.
- **No MK/AL/XK transactional wedding-venue marketplace found** with (a) an
  in-app deposit/kapar workflow, (b) a cancellation-refund ladder, or (c) a
  vendor-side confirm/decline lifecycle with an enforced SLA — this is
  Kapar's real white space in the region. The flip side: there is no
  existing user habit of "book a wedding venue through an app" to
  piggyback on either — Kapar has to teach the request → 24h-confirm →
  pay-kapar-in-person model from a cold start. Source: aggregate of the
  searches above (no counter-evidence found), retrieved 2026-07-12.
- **Instagram/phone/Viber DM is the real incumbent, not another app.**
  Individual venues run their booking through Instagram DMs (e.g. a
  14k-follower "Wedding planner In Macedonia" account taking inquiries by
  DM/phone) or bare phone numbers on their own listing pages (Ла Тана за
  свадби, Ресторан Парк, Trokadero, Ксантика — all reachable by phone,
  several with no online request form at all). Source: [instagram.com/wedding_planner_macedonia](https://www.instagram.com/wedding_planner_macedonia/), venue detail pages under [termin.mk/svadba/lokacii](https://termin.mk/svadba/lokacii), retrieved 2026-07-12.
  Risk: this free, zero-commission, high-personal-trust channel is what
  Kapar actually competes with for MVP adoption. Kapar has to win on speed/
  transparency/protection (visible real-time availability, transparent
  pricing, an enforced 24h vendor-response SLA, deposit/cancellation
  protection) — not on discoverability, since Instagram already works fine
  for MK couples finding venues today.
- **Viber, not WhatsApp, is the regionally dominant messaging/business
  channel.** Claimed 90%+ phone penetration in several Balkan markets
  (Greece, Bulgaria, Serbia); North Macedonia sits among the CEFTA
  countries where >90% of internet users use a messaging app (Skype/
  Messenger/WhatsApp/Viber), above the EU-27 average of 75%; Viber is
  explicitly positioned for business transactional messages (order
  confirmations, booking receipts, delivery updates) in the region. Source:
  [Viber for Business – messageflow.com](https://messageflow.com/blog/viber-for-business-multi-channel-marketing/), [Internet Activities – North Macedonia, ecommerce4all.mk](https://ecommerce4all.mk/en/ecommerce-data/internet-activities/), [Viber Market: An In-Depth Look — messaggio.com](https://messaggio.com/blog/viber-market-an-in-depth-look-at-messenger-impact-in-europe/), retrieved 2026-07-12.
  Not urgent, but a category table-stake worth tracking: if the vendor side
  under-adopts the app/push notifications (plausible for older venue
  owners), Viber is the regionally-correct fallback channel, not SMS or
  WhatsApp — see matching PROPOSED FEATURES row.

### RESEARCH-PROCESS RISK
- **This session's WebFetch was non-functional for every target attempted**,
  including a neutral Wikipedia control URL — all returned HTTP 403,
  consistent with a proxy-level block rather than a target-specific one.
  No Mobbin screen captures or direct extranet/Pulse screenshots were
  obtained; every DESIGN INTEL item above is reconstructed from WebSearch's
  indexed snippets of the same official sources, with URLs cited. This is
  good enough to design from (concrete, sourced, dated) but is NOT the same
  confidence level as an actual screenshot walkthrough. Recommend the
  orchestrator schedule a follow-up founder pass with direct WebFetch/Mobbin
  MCP access restored before the WAVE 6 design-critic visual lock, to catch
  any pixel-level layout details (exact spacing, iconography, copy strings)
  that snippet-level search synthesis cannot surface.

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

## WAVE 0 — server foundation — ✅ SHIPPED 2026-07-12 (executed inline by the
## orchestrator: wave-implementer subagents were unavailable — session usage
## limit killed spawns twice; the wave SYSTEM stays in place for Wave 1)
- [x] P0 — npm-workspaces monorepo: `server/` + `packages/domain` (shared kapar
  math + types + zod schemas); Expo app stays the root package (metro
  watchFolders update). SHARED files — orchestrator does this slice itself.
- [x] P0 — Fastify + Drizzle + PostgreSQL 16 scaffold; schema v1 (users, venues,
  halls, menu_tiers, reviews, bookings, booking_events, auth_codes, sessions);
  migrations; seed script importing the 14 seed venues.
- [x] P0 — env: docker-compose.postgres + cloud-session setup script (apt
  postgres fallback — VERIFIED working in this environment 2026-07-12),
  DATABASE_URL convention; CI (GitHub Actions): typecheck app+server, domain
  unit tests, seed + boot smoke. NO deploy in Wave 0 (Railway account pending
  — deploy slice moved to Wave 1).
- [x] P0 — app HTTP client implementing VenueApi against the server behind a
  flag; MockVenueApi stays as offline/dev fallback.
- [x] P1 — port refund ladder/grace/payBy/lifecycle math to `packages/domain`
  with unit tests (single source for app + server). (gap: "zero tests, no CI")

## WAVE 1 — bookings on the server (trust core)
- [ ] P0 — booking lifecycle endpoints with server-enforced transitions +
  booking_events audit trail; TTL expiry worker (24h request / payBy lapse)
  (gap: "sweep only runs on next app launch"; gap: "venueBot timers die on
  restart"). Design-intel cross-ref: Booking.com's "Request to Book" 24h/24h
  dual-timer (accept-or-decline within 24h, then guest confirms within a
  further 24h) is a directly validating reference — see DESIGN INTEL item 7
  above, filed 2026-07-12.
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
  Design-intel cross-ref (2026-07-12): decide the vendor home-screen IA
  together with WAVE 4's bookings dashboard — see PROPOSED FEATURES "Vendor
  dashboard home = single 'today' action feed" — same screen, don't spec the
  two waves' home layout independently.
- [ ] P1 — transactional email (Resend) templates in en/mk/sq; retire the
  "we'll text you a code" copy (gap: "SMS-code copy overclaim").
- [ ] P1 — personal-info editor (dead button on profile).

## WAVE 3 — vendor extranet core (GATED on the extranet research pack)
# GATE CLEARED 2026-07-12 — see DESIGN INTEL "VENDOR EXTRANET" above for the
# sourced reference pack this wave should design from.
- [ ] P0 — listing editor: content ×3 locales, photos (upload → R2), amenities,
  house rules; draft → submit → published flow ("Become a partner" dead button).
  Design-intel cross-ref: Booking.com's property-content editor is a single
  auto-generated description (not multi-locale) — Kapar's locale-tab
  deviation from that pattern is deliberate, see DESIGN INTEL item 4.
- [ ] P0 — halls & menus editor (per-guest pricing, hall adjustments).
- [ ] P0 — availability calendar: open/close dates, see booked dates
  (gap: "bookedDates hardcoded in venues.ts"). Design-intel cross-ref: build
  3 states (open/closed-by-vendor/booked), NOT Booking.com's binary green/red
  — see DESIGN INTEL item 3 and the matching PROPOSED FEATURES row.
- [ ] P1 — admin approve/publish flag + minimal review tooling.

## WAVE 4 — vendor booking operations
- [ ] P0 — request inbox: confirm (sets payBy) / decline with reason.
  Design-intel cross-ref: field/column set validated against Booking.com's
  reservation list + detail — see DESIGN INTEL item 2.
- [ ] P0 — "kapar received" confirmation at the visit (venue side) — makes the
  `confirmed` state real for the first time.
- [ ] P0 — vendor bookings dashboard (upcoming, cancellations with refund owed
  per the platform ladder).
- [ ] P0 — Expo push notifications both sides for every status change (gap:
  "notification bell is a no-op"; gap: "24h lapse needs background enforcement").
  Design-intel cross-ref: Pulse app's event set (new request, confirm,
  decline, cancellation, message, review) — see DESIGN INTEL item 8.
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
  round, incorporating the founder's verified references. Re-run a founder
  research pass with direct WebFetch/Mobbin MCP before this pass locks visual
  detail — see RISKS → "RESEARCH-PROCESS RISK" (2026-07-12): this round's
  extranet/Pulse findings are sourced from search snippets, not screenshots.
- [ ] P0 — e2e critical-path suite (Playwright web now, native later) + server
  load smoke; CI-gated.
- [ ] P0 — production deploy: EU region, backups, Sentry, rate limiting,
  secrets; staging demo on two physical phones.
- [ ] P1 — replace Unsplash photos (needs the photo plan); offline behavior
  of BrandedImage verified (gap: "offline behavior unverified").
- [ ] P2 — post-launch queue: per-venue cancellation policies; online payments
  (CaSys vs Stripe); per-venue kapar policy editor. Design-intel refinement
  (2026-07-12): key this editor by calendar date-range (seasonal), matching
  Airbnb's March 2026 Seasonal Cancellation Policy and Booking.com's
  per-rate-plan model — see DESIGN INTEL item 6 and matching PROPOSED
  FEATURES row.
