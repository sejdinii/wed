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
Nothing wave-invalidating found in this pass (2026-07-17) — all three tasked
items below (decline UX/SLA, notification-center patterns, direct-fetch retry)
are refining/confirmatory for Wave 4 polish and the Wave 5 notification story,
not category-shift discoveries. Nothing appended here.

Nothing wave-invalidating found in the 2026-07-12 pass either — all three
items completed that run were confirmatory/refining. Nothing appended then.

Nothing wave-invalidating found in the 2026-07-18 pass either (map-view UX
pack, MK/EU privacy minimums, chat-safety quick pass). All three findings are
gating/refining inputs for the ALREADY-SCHEDULED Wave 6 map slice and the
in-progress Wave 5 chat/notification/dead-button work — not evidence the
current wave is building something the market has abandoned. Filed under
PROPOSED FEATURES / DESIGN INTEL / RISKS below for the next checkpoint.

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

## TASKED RESEARCH (orchestrator → founder, 2026-07-18 — Wave 5 gate + legal
## draft + chat safety) — STATUS: all three items completed this run.
# Research-method note: WebFetch was retested against BOTH a neutral control
# (en.wikipedia.org/wiki/Booking.com) and five direct targets this pass
# (Baymard, Secure Privacy, Schoenherr, Refworld, rm.coe.int) — ALL returned
# HTTP 403, the SAME proxy-level signature confirmed on 2026-07-12 and
# 2026-07-17. This is now the THIRD confirmation; see the updated RISKS →
# "RESEARCH-PROCESS RISK" entry below. No `mcp__Mobbin__*` tools were present
# in this session's toolset either (same as 2026-07-17) — nothing to retry
# there. Every finding below is WebSearch-snippet synthesis with source URL +
# retrieval date, same confidence tier as the two prior passes.
- [x] **Results map-view UX pack (GATES the Wave 6 map slice).** Findings
  under DESIGN INTEL → "RESULTS LIST↔MAP TOGGLE..." and "WEB MAP
  IMPLEMENTATION FOR EXPO...".
- [x] **MK/EU data-privacy minimums for the legal draft.** Findings under
  RISKS → "MK/EU DATA-PRIVACY MINIMUMS...". Framed throughout as drafting
  input, NOT a substitute for a Macedonian lawyer's review — stated explicitly
  in the findings themselves, not just here.
- [x] **Chat safety table-stakes quick pass.** Findings under DESIGN INTEL →
  "CHAT SAFETY TABLE-STAKES FOR A TWO-SIDED MARKETPLACE".

## PROPOSED FEATURES
| Feature | Evidence (source) | Impact (blocking/valuable/later) | Touches | Verdict |
|---|---|---|---|---|
| | | | | |
| Surface the grace window as a permanent line on `RefundTimeline`, not only as a conditional note computed after the fact in `cancel.tsx` | Airbnb applies a universal 24h full-refund guarantee on top of ALL four of its policy tiers (Flexible/Limited/Moderate/Firm) and states it as a standing policy fact, not a surprise. Source: [Airbnb Cancellation Policy Guide 2026 – Zeevou](https://zeevou.com/blog/what-you-need-to-know-about-airbnbs-strict-cancellation-policy/), [Airbnb Cancellation Policy 2026: What Replaced Strict – BNBCalc](https://www.bnbcalc.com/blog/airbnb-business/how-to-start-airbnb/airbnb-cancellation-policy-2025-update), retrieved 2026-07-12. Confirmed in-repo: `src/components/RefundTimeline.tsx` renders only the ladder tiers; `REFUND_GRACE_DAYS`/`graceApplies` logic exists only inside `app/booking/cancel.tsx` and is invisible until the couple is already cancelling. | valuable (trust/transparency parity — a couple deciding whether to book should see the grace window on the venue detail page and at checkout step 3, not discover it only mid-cancellation) | `src/components/RefundTimeline.tsx` (add a grace row/note), `packages/domain` kapar constants (already exist, read-only), venue detail page + `app/booking/checkout.tsx` step 3 (both already render `RefundTimeline`, so this is a single-component change surfacing everywhere for free) | ACCEPTED 2026-07-12 → Wave 5 P1 (single-component trust win) |
| Account-level no-show / repeat-cancellation signal for couples | OpenTable auto-deactivates a diner's account after 4 no-shows in 12 months, and assesses no-show fees (2% platform surcharge on top of restaurant-set fees, rolled out H2 2025–early 2026). Source: [OpenTable no-show policy](https://help.opentable.com/s/article/What-is-your-no-show-policy-1505261059461?language=en_US), [OpenTable 2% service fee rollout — The Inquirer, Jan 2026](https://www.inquirer.com/food/restaurants/opentable-service-fee-no-show-restaurant-reservation-20260114.html), retrieved 2026-07-12. | later (trust & safety; needs booking volume before it matters, but vendors will ask for it once the WAVE 4 request inbox ships and they start seeing repeat late-cancellers) | server: new aggregation over `booking_events` per user (cancellation/no-show count); WAVE 4 vendor request-inbox UI (small badge only) — does not touch any couple-side screen | ACCEPTED-LATER 2026-07-12 → post-launch queue (needs booking volume) |
| Vendor dashboard home = single "today" action feed (new requests, upcoming visits, messages, reviews together), not a stats/performance page first | Booking.com's Pulse app leads with "Today's activity" — arrivals, departures, new bookings, cancellations, modifications, and reviews shown together on landing, before any performance chart. The desktop Extranet home, by contrast, shows arrivals/departures/stay-overs first, then the calendar, then performance analytics/Opportunities — Pulse's stream-first ordering is the one worth cloning for a mobile-first vendor surface. Source: [Everything you need to know about the Pulse app – Booking.com for Partners](https://partner.booking.com/en-us/help/account-and-log/extranet-pulse/everything-you-need-know-about-pulse-app), [Pulse for Booking.com Partners – App Store](https://apps.apple.com/us/app/pulse-for-booking-com-partners/id992795726), [Extranet – Booking.com for Partners](https://partner.booking.com/en-us/solutions/extranet), retrieved 2026-07-12. | blocking-adjacent — this decides the IA of the vendor shell before WAVE 2's scaffold and WAVE 4's bookings dashboard are built independently and end up disagreeing | WAVE 2 "profile ⇄ Business mode switch scaffold + vendor shell" + WAVE 4 "vendor bookings dashboard" — same home screen, should be spec'd together even though they're different waves | ACCEPTED 2026-07-12 — BINDING on Wave 2 vendor-shell + Wave 4 dashboard specs: Pulse-style today-feed IA |
| 3-state availability calendar (open / closed-by-vendor / booked-by-a-couple) instead of Booking.com's binary green(open)/red(closed) | Booking.com's Extranet calendar only distinguishes open (green) vs closed (red); a closed date is reopened by clicking the "Rooms to sell" row. There is no visually distinct third state for "unavailable because an existing reservation holds it" vs. "host chose to block it" — those are different actions for a vendor (can't just click to reopen a booked date) and must not be cloned as identical. Source: [Updating your rates and availability – Booking.com for Partners](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/updating-your-rates-and-availability), [Updating your availability calendar on the Extranet](https://partner.booking.com/en-us/help/rates-availability/extranet-calendar/setting-availability-planner), retrieved 2026-07-12. | blocking — WAVE 3 P0 "availability calendar: open/close dates, see booked dates" already lists this as a requirement; this finding is the deviation rationale to write into that wave spec (gap already tracked: "bookedDates hardcoded in venues.ts") | WAVE 3 availability calendar screen; WAVE 1 double-booking/availability domain logic (booked-date source of truth) | ACCEPTED 2026-07-12 — written into the Wave 3 calendar spec as the deviation rationale (3 states, booked ≠ closed) |
| Per-venue rates/cancellation-policy editor, keyed to calendar date-ranges (seasonal), not one flat per-venue override | Booking.com lets hosts pick Fully-flexible vs. Customized per rate plan and bulk-apply across properties. Airbnb went further in March 2026 with a "Seasonal Cancellation Policy" letting hosts vary the policy by date range directly from the listing calendar. Source: [Setting up cancellation policies – Booking.com for Partners](https://partner.booking.com/en-us/help/policies-payments/policies/setting-cancellation-policies), [Can I set up the same policies for all of my properties at once?](https://partner.booking.com/en-us/help/policies-payments/policies/can-i-set-same-policies-all-my-properties-all-once), [Airbnb Cancellation Policy 2026: What Replaced Strict – BNBCalc](https://www.bnbcalc.com/blog/airbnb-business/how-to-start-airbnb/airbnb-cancellation-policy-2025-update), [Reducing Cancellations & Vacancies – RentLivePlay 2026 guide](https://www.rentliveplay.com/investor-and-owner-resources/reducing-cancellations-and-vacancies-smarter-airbnb-booking-policies), retrieved 2026-07-12. | later — refines the ALREADY-QUEUED WAVE 6 P2 "per-venue kapar policy editor" rather than adding new scope: build it keyed to a date range from day one so wedding-season vs. off-season policies don't require a second migration | WAVE 6 P2 item only — spec refinement, no new wave | ACCEPTED 2026-07-12 — Wave 6 P2 reworded: policy editor keyed to date ranges from day one |
| Viber as an additive vendor-notification channel (not a replacement for Expo push) | Viber has claimed 90%+ phone penetration in several Balkan markets and is the dominant business-messaging channel regionally (order confirmations, booking receipts); North Macedonia is among the CEFTA markets where >90% of users use a messaging app like Viber/Messenger/WhatsApp, above the EU-27 average of 75%. An older or less tech-savvy venue owner in MK is more likely to reliably see a Viber message than to have the vendor app open. Source: [Viber for Business – messageflow.com](https://messageflow.com/blog/viber-for-business-multi-channel-marketing/), [Internet Activities – North Macedonia, ecommerce4all.mk](https://ecommerce4all.mk/en/ecommerce-data/internet-activities/), [Viber Market: An In-Depth Look — messaggio.com](https://messaggio.com/blog/viber-market-an-in-depth-look-at-messenger-impact-in-europe/), retrieved 2026-07-12. | later (post-MVP; Expo push is the correct WAVE 4 default) | WAVE 4 push notification service only — additive channel; the WAVE 2 auth endpoint is already specced "channel-pluggable" for SMS, the same principle should extend here with no rework | ACCEPTED-LATER 2026-07-12 — Wave 4 spec notes Viber as additive channel, post-MVP |
| Decline requires a REQUIRED reason category (short fixed list) + optional free text — not a fully-optional reason, and not free-text-only | Booking.com's Request-to-Book (RtB) API — the product whose shape Kapar's request→24h-respond flow already clones (see DESIGN INTEL item 7, 2026-07-12) — mandates a reason code on every decline; choosing the `NOT_COMFORTABLE` code additionally REQUIRES a free-text field. Source: [Modifying booking requests – developers.booking.com](https://developers.booking.com/connectivity/docs/request-to-book/modifying-booking-requests) (WebSearch-indexed synthesis; direct WebFetch returned 403 — see RISKS retry note), retrieved 2026-07-17. By contrast Airbnb hosts are NOT required to give guests a reason at all, and Airbnb's own help center admits guests sometimes get no explanation. Source: [Why your home reservation request may have been declined by the host](https://www.airbnb.com/help/article/3592), [What happens if your home reservation request is declined or expires](https://www.airbnb.com/help/article/315), retrieved 2026-07-17. | blocking-adjacent — directly specifies the shape of Wave 4 P0 "request inbox: confirm / decline with reason", which is currently unspecified as required-vs-optional | Wave 4 request-inbox decline UI + the decline API payload/schema (already-queued item — this refines its shape, does not add new scope) | ACCEPTED 2026-07-18 → Wave 5: required category + mandatory text on "other"; Wave 4 shipped optional free text (API stores reasons already — additive upgrade) |
| Kapar should clone Booking.com's Request-to-Book decline model, NOT the standard instant-book Extranet — the two Booking.com surfaces disagree on whether "decline" exists at all | Booking.com's standard Extranet/instant-book flow has NO reject mechanism for a legitimate reservation — bookings are "confirmed instantly" and "have to be honored by the property"; a partner can only cancel in narrow cases (suspected fraud, guest no-show, guest-initiated, payment failure), never a plain "no". Source: [Can I reject a reservation? – Booking.com for Partners](https://partner.booking.com/en-us/help/reservations/manage/can-i-reject-reservation), retrieved 2026-07-17 (WebSearch synthesis; direct WebFetch 403). This is the OPPOSITE of the RtB decline-with-reason-code model cited in the row above. Kapar's flow is inherently request-first (venue must accept before a hold becomes a confirmed booking), so RtB — not instant-book — is the correct reference product; conflating the two would risk designing a decline flow that Booking.com itself doesn't allow on its primary product. | valuable (risk-avoidance / clarifies which of two Booking.com surfaces Wave 4 should actually clone) | Wave 4 request-inbox spec — a clarifying note, no code impact beyond the row above | ACCEPTED 2026-07-18 — RtB is the reference product, noted in DECISIONS LOG |
| Vendor response-rate stat (not just a per-request countdown) reserved on the bookings dashboard from day one | Airbnb Superhost status requires a 90%+ response rate within 24h; response rate (% of inquiries/requests answered within 24h, trailing 30 days) is shown as a persistent percentage on the host's Performance/Insights dashboard and independently affects search-ranking placement, separate from the Superhost badge itself. Status is re-evaluated quarterly (Jan/Apr/Jul/Oct). Source: [Improve your response rate and response time – Airbnb Help Center](https://www.airbnb.com/help/article/430), [Airbnb Superhost Response Time Requirements (2026) – rapideyeinspections.com](https://rapideyeinspections.com/blog/airbnb-superhost-response-time-requirements/), [Airbnb Metrics: How to Read Your Host Dashboard – Hostfully](https://www.hostfully.com/blog/airbnb-metrics/), [Airbnb Superhost Requirements (June 2026) – Avantstay](https://avantstay.com/blog/airbnb-superhost-requirements/), retrieved 2026-07-17. | later (valuable, not Wave 4 P0-blocking) — but the data must start flowing NOW so a future search-ranking or "top responder" badge feature doesn't need a historical backfill | Wave 4 vendor bookings dashboard: log response timestamp per request into the existing `booking_events` audit trail (Wave 1) — cheap addition, no couple-side UI change | ACCEPTED-LATER 2026-07-18 → Wave 5/6 dashboard stat. No new logging needed: booking_events already timestamps every transition since Wave 1, so the trailing response-rate %% is computable retroactively |
| Server-backed in-app notification center — a real `notifications` table + unread count, not the current hardcoded client-side dot | Uber's push-notification architecture persists every notification server-side via a "Persistor" component writing to a sharded, per-user "Push Inbox" database — the in-app inbox is the durable source of truth, independent of whether a push was ever delivered; push is a delivery channel layered on top, not the storage layer. Source: [The Design of Uber's Push Notification System – blog.quastor.org](https://blog.quastor.org/p/design-ubers-push-notification-system), retrieved 2026-07-17. Generic notification-center guidance is explicit that unread badges "should be earned" — an unread indicator not backed by a real event is an attention-tax anti-pattern. Source: [How to Build a Notification Center for Web & Mobile Apps – Courier](https://www.courier.com/blog/how-to-build-a-notification-center-for-web-and-mobile-apps), [In-App Notification Center for SaaS: Design Patterns and Implementation Guide – SuprSend](https://www.suprsend.com/post/in-app-notification-center), retrieved 2026-07-17. | blocking-adjacent for the Wave 5 notification story — this is the direct fix for the already-flagged FEATURES.md gap "home bell with a HARDCODED unread dot ... fake signal — remove first", AND it is scoped to exactly what Kapar can build without push infra (Wave 5's constraint: no device to verify Expo push against) | Wave 5 notification-center slice: new server table + `GET /v1/notifications` + mark-read endpoint, reading off the SAME lifecycle events Wave 1/4 already emit (booking created/confirmed/declined/kapar-received/cancelled/expired — no new event taxonomy to invent); app: couple-home + Business-Today header bell. Does not block Wave 4 — Wave 4's confirm/decline/kapar-received actions become the first event producers, consumed later | ACCEPTED 2026-07-18 — BINDING shape for the Wave 5 notification slice |
| Notification bell nests inside the existing home header — no standalone "Notifications" tab | Airbnb's 2025 host-app redesign ships exactly 5 tabs — Today, Calendar, Listings, Messages, Menu — with no dedicated Notifications tab; the guest-side Airbnb app also nests its bell icon INSIDE the Inbox tab rather than promoting it to top-level nav. Source: [What Airbnb's new Today host tab... says about the company's priorities – Rental Scale-Up](https://www.rentalscaleup.com/what-airbnbs-new-today-host-tab-and-price-comparison-tool-with-booking-com-say-the-companys-priorities/), retrieved 2026-07-17; bell-inside-Inbox placement per Airbnb Community/forum threads ([airbnbase.com](https://airbnbase.com/unread-inbox-messages/), [community.withairbnb.com](https://community.withairbnb.com/t5/Ask-about-your-listing/Iphone-app-notification-won-t-go-away/td-p/190675)), retrieved 2026-07-17 — lower-confidence, forum-sourced, not an official spec page, flagged as such. Booking.com Pulse likewise keeps notification preferences under "More → Notifications" rather than a top-level tab. Source: [How can I set up push notifications in Pulse? – Partner Help](https://partnerhelp.booking.com/hc/en-us/articles/115003802245-How-can-I-set-up-push-notifications-in-Pulse-), retrieved 2026-07-17. | valuable — settles an IA question before Wave 5 builds the notification-center screen, consistent with the already-ACCEPTED Pulse-style "today feed" pattern (2026-07-12 pass) | Wave 5 notification-center slice only: `app/(tabs)/index.tsx` header + Business Today header (both already exist — this is a placement decision, not a new screen/tab) | ACCEPTED 2026-07-18 — bell returns to both headers WITH the center, no new tab |
| Results list↔map toggle: floating pill button (not a tab, not a permanent split) as the entry affordance; pins show price with zoom-based clustering; tapping a pin opens a synced mini-card and scrolls/highlights the matching list row — clone Airbnb mobile + Booking.com's pattern, not a fresh invention | Airbnb mobile's results screen opens a full-screen map via a persistent bottom-area map icon/button, with filters staying editable from inside map view; clusters merge at low zoom and split into individual pins on zoom-in, with lower-ranked listings collapsing to small price-less "mini-pins" to avoid overloading the map. Booking.com reaches its map via a "Show on map" affordance from a property card / persistent map entry, with the list rendered center-screen and a bouncing pinpoint marking the hovered/selected property (zoom range 1–20). Source: [Search for Airbnb home listings – Airbnb Help Center](https://www.airbnb.com/help/article/252), [Airbnb Map Platform – Adam Shutsa](https://adamshutsa.com/map-platform/), [How Airbnb Made Map Search Smarter – techscoop.substack.com](https://techscoop.substack.com/p/how-airbnb-made-map-search-smarter), [Map Widget – Booking.com Affiliate Partner Help](https://affiliates.support.booking.com/kb/s/article/Map-Widget), [How to Show Hotel On Map in Booking.com – HardReset.info](https://www.hardreset.info/devices/apps/apps-bookingcom/show-hotel-on-map/), retrieved 2026-07-18. A "Booking.com Web Map View" screen is catalogued on Mobbin, confirming the pattern is current, but its screen detail could not be fetched directly this session (WebFetch 403 — see RISKS). Source: [Booking.com Web Map View – Mobbin](https://mobbin.com/explore/screens/1029ac77-5899-4f71-8bdb-bc441a16fbe6), retrieved 2026-07-18. | blocking (GATES the Wave 6 map slice per the orchestrator's tasking; Wave 5 already removed the dead "Map View" pill pending exactly this research) | `results.tsx` (existing pill placement + toggle state), `src/components/VenueMap` (native, already exists) — this row is the UX-shape spec; see the paired row below for the web rendering gap | |
| Web map implementation: platform-split component (`.web.tsx` / `.native.tsx`, or a `Platform.OS` branch) — keep `react-native-maps` on native (already wired), add `react-map-gl` + `maplibre-gl` on web against a free OSM vector-tile source | `react-native-maps` dropped web support after v0.31.1 and build-errors under current Expo web (confirmed via the library's own issue tracker). Expo's own first-party `expo-maps` is ALSO native-only (Apple Maps/Google Maps, no web) — Expo's documented cross-platform pattern is exactly the `Platform.OS`/file-extension branch recommended here. The community-validated combo for Expo apps needing maps on BOTH native and web is `@maplibre/maplibre-react-native` (native) + `react-map-gl` wrapping `maplibre-gl` (web), demonstrated end-to-end including Expo config-plugin wiring as recently as January 2025. Tile source options: OpenFreeMap (free, unlimited, no API key, OSM/OpenMapTiles data, donation-funded) vs. MapTiler Cloud free tier (100k tile requests/mo + 5k sessions, but PAUSES service over quota — real risk at a demo/launch spike) vs. self-hosting (the public osm.org tile server explicitly forbids production/commercial use under the OSMF Acceptable Use Policy). Underlying map data is OSM's ODbL (requires attribution); MapLibre GL JS itself is BSD-3, fully open-source with no Mapbox proprietary lock-in. Source: [react-native-maps GitHub Issue #4735](https://github.com/react-native-maps/react-native-maps/issues/4735), [Solving React Native Maps Compatibility Issue for Web Builds in Expo – Medium](https://timchosen.medium.com/solving-react-native-maps-compatibility-issue-for-web-builds-in-expo-5bd94fae8fb1), [Maps – Expo Documentation](https://docs.expo.dev/versions/latest/sdk/maps/), [Getting MapLibre working for both native and web in Expo – GreenAsh, Jan 2025](https://greenash.net.au/thoughts/2025/01/getting-maplibre-working-for-both-native-and-web-in-expo/), [OpenFreeMap](https://openfreemap.org/), [MapTiler Cloud pricing](https://www.maptiler.com/cloud/pricing/), [Raster tile providers – OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Raster_tile_providers), [MapLibre React Native – GitHub](https://github.com/maplibre/maplibre-react-native), retrieved 2026-07-18. | blocking (this is the ONLY viable path to a working web map — without it, "Map view" on the web build is either impossible or requires a paid Google Maps key the project has no billing set up for) | New web-only map component parallel to the existing native `VenueMap`; `results.tsx` import switches per platform; zero change to the native code path; recommend OpenFreeMap as the default tile source (zero cost, zero quota risk) with MapTiler documented as a fallback only | |
| Filters (city/date/hall type/price/capacity) must be a single shared state read by BOTH the list and map renderers, never two independent filter instances that can drift when the user toggles views | Inferred directly from the Airbnb/Booking architecture above — their map and list are two renderings of the SAME underlying result set and filter state, not two independently-filtered views (no separate citation found for this specific failure mode; flagged as an architectural inference, not an externally sourced claim). | valuable (prevents a real, easy-to-ship bug: switching to map view silently resetting the couple's price/date filters) | `results.tsx` filter state + whatever new map component consumes it — a state-plumbing requirement to write into the Wave 6 map slice spec, no new UI | |
| Chat: report + block affordance, built INTO the Wave 5 real-chat slice (not retrofitted onto a shipped screen later) | Airbnb lets either party report a message/conversation with a reason and separately block the other party from messaging, booking, or accepting future reservations — blocking during an active/upcoming reservation still allows the messages needed to complete THAT reservation, tapering off ~2 weeks after it ends. Source: [Report and block a host or guest's messages – Airbnb Help Center](https://www.airbnb.com/help/article/2020), [Report a host or guest for inappropriate behavior – Airbnb Help Center](https://www.airbnb.com/help/article/3806), retrieved 2026-07-18. Booking.com's partner-side equivalent is "report guest misconduct" (type + description + an optional future-booking block), reportable from the day after check-in through 7 days post-checkout. Source: [Report guest misconduct to Booking.com – Cloudbeds help](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/360053613654-Report-guest-misconduct-to-Booking-com-from-Cloudbeds-PMS), retrieved 2026-07-18. | blocking — genuinely MVP-blocking, not later: no category leader ships 1:1 marketplace chat without it, and Wave 5 is building the message thread from scratch RIGHT NOW, making this the cheapest possible moment to add it (a modal + a block-check on the existing auth/booking-guard layer) vs. retrofitting later | The NEW chat screen/component Wave 5 is building this pass; existing auth/booking-guard middleware for the block-check (a blocked counterpart cannot message or book the blocker) | |
| Do NOT clone Airbnb/Booking.com's automatic phone/email masking or link-stripping in chat, and do NOT add an "never pay outside the app" warning banner — explicitly document both as reasoned deviations | Airbnb strips/blocks contact info from messages (regex+heuristic phone/email/link detection) and is piloting per-reservation masked phone aliases specifically to stop bookings moving off-platform (a commission-evasion problem for Airbnb); Booking.com shows partner/guest numbers as an @guest.booking.com/@partner.booking.com alias by default. Both platforms separately warn users never to pay outside the platform's own rails (Venmo/Cash App/PayPal-F&F/wire/crypto named as red flags) because their refund protections are contingent on payment happening ON-platform. Source: [Why we review messages on Airbnb](https://www.airbnb.com/help/article/1121), [Airbnb's New Temporary Phone Numbers](https://yada.ai/blog/airbnbs-new-temporary-phone-numbers-what-changed-and-how-str-owners-should-pivot), [All about our messaging security settings – Booking.com for Partners](https://partner.booking.com/en-us/help/legal-security/security/all-about-our-messaging-security-settings), [Is Booking.com Legit? Safety Guide – AVG](https://www.avg.com/en/signal/is-booking-com-legit), retrieved 2026-07-18. Kapar has NO in-app payment/commission to protect (2026-07-09 no-online-payments decision) and phone number is ALREADY a required profile field specifically because venues coordinate visits by phone (2026-07-10 decision) — masking it or warning against off-platform payment would fight Kapar's own booking model and read as confusing, contradictory copy. | later/skip (reasoned rejection candidate, not an oversight to fix) | None — a scope decision to write into the Wave 5 chat spec's rationale so a future reviewer doesn't flag its absence as a gap | |
| Real privacy notice page (replaces the dead Terms/Privacy rows on /welcome and Settings) drafted to the MK Law on Personal Data Protection's duty-to-inform minimums (Art. 17–18 per the unofficial translation, structurally equivalent to GDPR Art. 13): controller identity + real contact, purposes + legal basis per data category, retention criteria, data-subject rights list, and the right to complain to the Agency for Personal Data Protection (AZLP) + the AZLP's own contact details | See DESIGN INTEL/RISKS → "MK/EU DATA-PRIVACY MINIMUMS" for the full sourced breakdown; framed explicitly there as drafting input, not a substitute for a Macedonian lawyer's sign-off. | blocking-adjacent (real users are the explicit Wave 6 launch target; email+phone+booking data collection already starts at account creation, and the Terms/Privacy links are ALREADY a flagged FEATURES.md dead-button gap — this row gives that gap real content to point to instead of just de-affordancing it) | `/welcome` consent line (already flagged dead), Settings Terms/Privacy rows (already flagged dead) — a content-only addition, no schema/data-model change | |

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
   memory (Rule 2 compliance). UPGRADE 2026-07-17: this RtB product is also
   where the decline-reason mechanism lives — see the new DESIGN INTEL
   subsection "VENDOR DECLINE UX + RESPONSE-SLA PATTERNS" below, which
   confirms RtB (not the standard instant-book Extranet, item 3 above's
   "Can I reject a reservation?" source) is the correct decline-flow
   reference for Kapar.

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
   FEATURES row above). UPGRADE 2026-07-17: notification PREFERENCES in
   Pulse live under "More → Notifications" (settings screen, not a
   top-level tab) — see the new "IN-APP NOTIFICATION CENTER PATTERNS"
   subsection below. Source: [How can I set up push notifications in Pulse? – Partner Help](https://partnerhelp.booking.com/hc/en-us/articles/115003802245-How-can-I-set-up-push-notifications-in-Pulse-), retrieved 2026-07-17.

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

### VENDOR DECLINE UX + RESPONSE-SLA PATTERNS — retrieved 2026-07-17
### (WebSearch synthesis only — direct WebFetch to partner.booking.com and
### developers.booking.com returned HTTP 403 again this session, same as
### 2026-07-12; see RISKS retry note below)

- **Booking.com has two genuinely different products with two different
  decline models — do not conflate them.** (1) The standard instant-book
  Extranet has NO reject mechanism for a legitimate reservation at all:
  "Reservations can't be rejected... All bookings are confirmed instantly
  and have to be honored by the property." A partner may only cancel in
  narrow cases — suspected fraud, guest no-show, guest-initiated, payment
  failure — never a plain "no". Source: [Can I reject a reservation? – Booking.com for Partners](https://partner.booking.com/en-us/help/reservations/manage/can-i-reject-reservation), retrieved 2026-07-17.
  (2) The separate Request-to-Book (RtB) API/product — already Kapar's
  validated reference for the 24h-response TTL shape (DESIGN INTEL item 7,
  2026-07-12) — DOES have a formal decline: "Connectivity providers must
  include an option for partners to select the reason for rejecting a
  request. If a partner chooses the reason NOT_COMFORTABLE, they must also
  provide an additional rejection reason text field." Rejection-reason
  detail is kept private, used only to improve the product. Source:
  [Modifying booking requests – developers.booking.com](https://developers.booking.com/connectivity/docs/request-to-book/modifying-booking-requests), retrieved 2026-07-17.
  Kapar mapping: Kapar's request→24h-respond flow is RtB-shaped, not
  instant-book-shaped, so RtB is the correct decline reference — a fixed,
  required reason category (e.g. date no longer available / capacity
  mismatch / budget mismatch / other) with mandatory free text only on the
  "other"/ambiguous category, mirroring RtB's `NOT_COMFORTABLE` rule.

- **Airbnb: reason disclosure to the guest is inconsistent, not a firm
  requirement.** Hosts are not required to explain a decline; Airbnb's own
  help center states a guest may get no explanation, e.g. when the host's
  calendar is stale or the reason is otherwise undisclosed. When hosts do
  explain, common categories are: guest has no reviews or negative reviews;
  an unaccommodatable special request (early check-in, late checkout,
  extra guests); dates that aren't actually available (stale calendar); or
  unclear/incomplete guest communication. After a decline, the guest's
  authorization hold is released or a charge is refunded automatically, the
  guest is notified by email/app, and they are simply "free to book another
  place" — no evidence was found of Airbnb automatically surfacing a
  "similar listings" carousel specifically triggered by that decline (this
  is an absence-of-evidence finding, not a confirmed non-feature). Source:
  [Why your home reservation request may have been declined by the host](https://www.airbnb.com/help/article/3592), [What happens if your home reservation request is declined or expires](https://www.airbnb.com/help/article/315), retrieved 2026-07-17.
  Kapar mapping: Kapar should be STRICTER than Airbnb here — ALWAYS require
  and show a reason, never allow a silent decline. This is the opposite of
  a Booking.com/Airbnb parity argument: it is a cold-start-trust argument
  specific to Kapar's small MK market (see RISKS → "Instagram/Viber DM is
  the real incumbent" from the 2026-07-12 pass — a personal, explained "no"
  over DM is the norm couples already expect; an unexplained in-app decline
  would read as worse than the free channel Kapar is trying to displace).
  Do NOT build an automated "suggested alternative venues" feature off a
  decline yet — no category leader was found doing this reliably, and it
  would be new, unvalidated scope for Wave 4.

- **Response-rate/response-time SLA surfacing (Airbnb).** Superhost status
  requires a 90%+ response rate within 24 hours PLUS a 4.8+ overall rating,
  evaluated quarterly (January/April/July/October). "Response rate" (%% of
  new inquiries/requests answered within 24h, trailing 30 days) is shown as
  a persistent percentage on the host's Performance/Insights dashboard and
  independently affects search-ranking placement — a host below 90% loses
  Superhost eligibility, gets suppressed in search, and erodes guest trust,
  regardless of whether they keep Superhost status at all. "Response time"
  (how fast, once inside the 24h window) matters less to official status
  but still nudges algorithmic ranking. Source: [Improve your response rate and response time – Airbnb Help Center](https://www.airbnb.com/help/article/430), [Airbnb Superhost Response Time Requirements (2026) – rapideyeinspections.com](https://rapideyeinspections.com/blog/airbnb-superhost-response-time-requirements/), [Airbnb Metrics: How to Read Your Host Dashboard – Hostfully](https://www.hostfully.com/blog/airbnb-metrics/), [Airbnb Superhost Requirements (June 2026) – Avantstay](https://avantstay.com/blog/airbnb-superhost-requirements/), retrieved 2026-07-17.
  No evidence was found of a live per-request "countdown chip" UI on
  Airbnb's or Booking.com Pulse's request screens specifically (searched
  directly, came up empty) — the SLA is enforced by the 24h TTL mechanism
  already built (Wave 1) and disclosed as a trailing aggregate stat, not a
  ticking on-screen clock. Kapar mapping: keep the existing 24h TTL as the
  hard enforcement mechanism (already Wave-1-shipped); ADD a trailing
  response-rate percentage to the Wave 4 vendor dashboard fed by the
  already-existing `booking_events` audit trail, rather than inventing a
  per-card countdown-timer widget with no strong reference basis.

- **OpenTable: diner-side no-show enforcement is well-documented, restaurant-
  side decline-reason UI is not.** Confirmed: 4 no-shows in 12 months
  auto-deactivates a diner's OpenTable account; OpenTable itself layered on
  a 2% service fee on no-show/cancellation charges through H2 2025–early
  2026 (cross-ref the 2026-07-12 pass). No public documentation was found
  describing canned decline-reason categories a restaurant selects when
  turning down a reservation or waitlist request — flagging this as a gap
  in the OpenTable reference pack rather than evidence that no such UI
  exists. Source: [OpenTable no-show policy](https://help.opentable.com/s/article/What-is-your-no-show-policy-1505261059461?language=en_US), [OpenTable 2% service fee rollout — The Inquirer, Jan 2026](https://www.inquirer.com/food/restaurants/opentable-service-fee-no-show-restaurant-reservation-20260114.html), retrieved 2026-07-17 (re-confirmed from 2026-07-12).

### IN-APP NOTIFICATION CENTER PATTERNS (TWO-SIDED MARKETPLACES) — retrieved
### 2026-07-17. Scoped deliberately to what Kapar can build now: an in-app
### center backed by a real server table, no push infra yet (Wave 5's Expo-
### push slice is deferred — no device to verify against in this environment,
### per the orchestrator's framing of this pass).

- **Neither Airbnb nor Booking.com Pulse promotes notifications to a
  standalone top-level tab.** Airbnb's 2025 host-app redesign ships exactly
  5 tabs — Today, Calendar, Listings, Messages, Menu — with no dedicated
  Notifications tab; daily action items surface inside "Today" and
  messages inside "Messages". Source: [What Airbnb's new Today host tab and price comparison tool with Booking.com say about the company's priorities – Rental Scale-Up](https://www.rentalscaleup.com/what-airbnbs-new-today-host-tab-and-price-comparison-tool-with-booking-com-say-the-companys-priorities/), retrieved 2026-07-17. On the guest side, the bell icon lives INSIDE the Inbox tab rather than
  being promoted to top-level nav (lower-confidence: sourced from Airbnb
  Community/forum threads and a third-party how-to page, not an official
  Airbnb spec page — flagged as such). Source: [Airbnb Community – notification won't go away](https://community.withairbnb.com/t5/Ask-about-your-listing/Iphone-app-notification-won-t-go-away/td-p/190675), [How to remove unread message notification from Airbnb inbox – airbnbase.com](https://airbnbase.com/unread-inbox-messages/), retrieved 2026-07-17. Booking.com Pulse keeps notification preferences under "More →
  Notifications" (a settings screen), not a top-level tab either. Source:
  [How can I set up push notifications in Pulse? – Partner Help](https://partnerhelp.booking.com/hc/en-us/articles/115003802245-How-can-I-set-up-push-notifications-in-Pulse-), retrieved 2026-07-17.
  Kapar mapping: put the bell inside the existing couple-home header and
  the Business-Today header — both screens already exist and already
  follow the ACCEPTED Pulse-style "today feed" IA (2026-07-12 pass) — do
  NOT add a 6th bottom tab for this.

- **Pulse's notification event set (cross-referenced from the 2026-07-12
  pass, item 8, now confirmed with the settings-location detail added):**
  new bookings, cancellations, guest queries/messages, and reviews are the
  opt-in push categories, configured under More → Notifications. Source:
  [How can I set up push notifications in Pulse? – Partner Help](https://partnerhelp.booking.com/hc/en-us/articles/115003802245-How-can-I-set-up-push-notifications-in-Pulse-), [Everything you need to know about the Pulse app](https://partner.booking.com/en-us/help/account-and-log/extranet-pulse/everything-you-need-know-about-pulse-app), retrieved 2026-07-17 / 2026-07-12.
  Kapar mapping: this is the same event set Kapar's booking lifecycle
  already produces into `booking_events` — no new taxonomy needs inventing
  for the notification center's content.

- **General notification-center architecture (Courier, SuprSend, PatternFly,
  Uber engineering).** Standard interface pattern across products: a bell
  icon with a count/dot badge in the header/nav, opening a reverse-
  chronological panel or full screen; each item shows content + a relative
  timestamp + read/unread state and deep-links to its source object;
  read/unread state is persisted server-side, not just client-locally, so
  it's consistent across sessions and devices. Guidance is explicit that
  "badges should be earned" — an unread indicator not tied to a genuine
  event is an attention-tax anti-pattern to avoid. Source: [How to Build a Notification Center for Web & Mobile Apps – Courier](https://www.courier.com/blog/how-to-build-a-notification-center-for-web-and-mobile-apps), [In-App Notification Center for SaaS: Design Patterns and Implementation Guide – SuprSend](https://www.suprsend.com/post/in-app-notification-center), [PatternFly – Notification badge design guidelines](https://www.patternfly.org/components/notification-badge/design-guidelines/), retrieved 2026-07-17.
  Uber's production architecture is the most directly useful reference for
  Kapar's specific constraint (in-app now, push later): a "Persistor"
  component writes every notification to a durable, per-user "Push Inbox"
  database FIRST, regardless of whether/how it's delivered; push is a
  delivery channel added on top of that storage layer, not the thing that
  defines whether a notification "happened." Source: [The Design of Uber's Push Notification System – blog.quastor.org](https://blog.quastor.org/p/design-ubers-push-notification-system), retrieved 2026-07-17.
  Kapar mapping (direct build recommendation for whichever wave picks this
  up): a `notifications` table (recipient_user_id, type, payload, read_at,
  created_at) written by the SAME server-side lifecycle events that already
  exist or are landing in Wave 4 (booking created/confirmed/declined/
  kapar-received/cancelled/expired); `GET /v1/notifications` (paginated,
  read/unread) + a mark-read endpoint; app polls/refetches on screen focus
  (no websocket — nothing here needs true real-time, and there's no push
  infra yet to justify the complexity). When Expo push ships later, it
  becomes an additive delivery channel reading the SAME table — zero
  rearchitecture, directly resolving the FEATURES.md gap "home bell with a
  HARDCODED unread dot ... Bell dot is a fake signal — remove first."

### RESULTS LIST↔MAP TOGGLE — mobile entry affordance, pin/cluster design,
### tap-target behavior, and the web split-view degrade — retrieved 2026-07-18

- **Entry affordance (mobile).** Airbnb's mobile results screen surfaces a
  persistent map icon (bottom area of the results list) that opens a
  full-screen map overlay; filters (price, guest capacity, amenities) remain
  editable from within map view itself rather than requiring a return to
  list view to change them. Source: [Search for Airbnb home listings – Airbnb Help Center](https://www.airbnb.com/help/article/252), [Here's Why Airbnb's Search by Map Feature is a Game Changer – rentalrecon.com](https://www.rentalrecon.com/airbnb-booking/why-airbnbs-search-by-map-feature-is-a-game-changer-for-travelers/), retrieved 2026-07-18. Generic UI-pattern guidance (Mobbin's own design glossary, WebSearch-snippet
  confidence only — the glossary page itself could not be fetched directly
  this session) calls out "hybrid map & list view apps like Airbnb &
  Marriott Bonvoy" as the reference case for a floating-action-button
  toggle, and specifically notes a PILL shape reads as "friendlier" than a
  square FAB for this use case. Source: [Floating Action Button UI Design – Mobbin glossary](https://mobbin.com/glossary/floating-action-button), retrieved 2026-07-18.
  Booking.com reaches its map via a "Show on map" affordance on a property
  card, or a persistent map entry on results; the resulting map view shows
  the property list rendered center-screen with a bouncing pinpoint marking
  the hovered/selected property, zoom range 1 (out) to 20 (in). A "Booking.com
  Web Map View" screen is catalogued on Mobbin confirming this is a current
  pattern, but the screen's pixel-level detail could not be fetched directly
  this session (WebFetch 403 — see RISKS). Source: [Map Widget – Booking.com Affiliate Partner Help](https://affiliates.support.booking.com/kb/s/article/Map-Widget), [How to Show Hotel On Map in Booking.com – HardReset.info](https://www.hardreset.info/devices/apps/apps-bookingcom/show-hotel-on-map/), [Booking.com Web Map View – Mobbin](https://mobbin.com/explore/screens/1029ac77-5899-4f71-8bdb-bc441a16fbe6), retrieved 2026-07-18.
  Kapar mapping: a floating pill button ("Map" / "List" with a small icon),
  not a segmented-control tab and not a permanent split — see the paired
  PROPOSED FEATURES row above.

- **Price-pin and cluster design.** Airbnb's search-results map uses
  Mapbox-tinted tiles with custom brand-pink ("Rausch") markers; top-ranked
  listings get "big" price pins showing the nightly rate directly, while
  lower-ranked listings collapse to small price-less "mini-pin" dots so the
  map doesn't visually overload with 200+ price bubbles at once — a
  deliberate 2024/25 redesign choice documented in a design retrospective.
  Clusters merge at low zoom and split into individual pins as the user
  zooms in (standard zoom-based expansion). Source: [Airbnb Map Platform – Adam Shutsa](https://adamshutsa.com/map-platform/), [How Airbnb Made Map Search Smarter – techscoop.substack.com](https://techscoop.substack.com/p/how-airbnb-made-map-search-smarter), retrieved 2026-07-18. No Booking.com-specific clustering documentation was found this pass —
  flagged as a gap in the reference pack, not evidence Booking.com lacks
  clustering.

- **What tapping a pin/cluster shows.** Airbnb's map and list are two
  renderings of the SAME underlying result set, not independent data
  sources: tapping a pin scrolls the list to and highlights the matching
  card, and (per the same architecture) the reverse — hovering/selecting a
  list card highlights its pin — holds on desktop web too. This supports a
  synced mini-card (or auto-scrolled list highlight) on pin-tap rather than
  full navigation away from the map. Source: same as pin/cluster citations
  above, retrieved 2026-07-18.

- **Filter persistence across the toggle.** Because Airbnb's list and map
  share one filter/result state (see above), filters visibly carry across
  the list↔map switch by construction — there is no separate "reset on
  toggle" behavior documented or implied anywhere in the sources reviewed.
  Kapar mapping: implement this as a single shared filter-state object read
  by both renderers (see paired PROPOSED FEATURES row) — flagged there as
  an architectural inference from the sources, not a separately-citable claim.

- **Web degrade (Airbnb desktop split view).** Airbnb previously ran a
  permanent left-list/right-map split by default on desktop web; it now
  defaults to a full-width "Show listings" view with a "Show map" toggle in
  the top-right, and only becomes a left-list/right-map split once map is
  toggled on — hovering a list card highlights/color-shifts its
  corresponding pin, and vice-versa. This is a lower-confidence, forum-
  sourced finding (Airbnb Community threads and a Quora answer, not an
  official Airbnb spec page) — flagged as such. A Baymard Institute article
  titled "The Optimal Layout for Hotel & Property Rental Search Results & 3
  Pitfalls to Avoid" specifically analyzes accommodation split-view design
  and is the right further-reading reference for the Wave 6 spec, but its
  content could not be retrieved this session (WebFetch 403, same standing
  limitation) — only its title/existence is confirmed via search index; a
  future pass with working WebFetch/Mobbin access should read it before the
  Wave 6 visual lock. Source: [Airbnb Community – map alongside listings](https://community.withairbnb.com/t5/Help/what-happened-to-the-map-view-alongside-the-listings/td-p/1607586), [Quora – why did Airbnb move map right](https://www.quora.com/Why-did-Airbnb-move-its-map-from-left-to-right-on-their-search-results-page-on-desktop-web-Does-it-give-better-results-Does-it-solve-any-usability-issues-Was-it-to-optimize-the-load-time), [Baymard – accommodations split view (title/existence only, content unfetched)](https://baymard.com/blog/accommodations-split-view), retrieved 2026-07-18.
  Kapar mapping: the pill-toggle (list OR map full-screen) is the one true
  cross-platform baseline; on wide web viewports a side-by-side split can be
  offered as a progressive enhancement matching Airbnb's CURRENT desktop
  behavior (toggle-activated split, not permanent split — the permanent
  version was tried and walked back), not a P0 requirement.

### WEB MAP IMPLEMENTATION FOR EXPO (react-native-maps has no web target) —
### retrieved 2026-07-18

- `react-native-maps` dropped web support after v0.31.1 and build-errors
  under current Expo web versions — confirmed via the library's own GitHub
  issue tracker, which is still an open, unresolved request as of this
  session. Source: [Please Bring Back Web Support – react-native-maps GitHub Issue #4735](https://github.com/react-native-maps/react-native-maps/issues/4735), [Solving React Native Maps Compatibility Issue for Web Builds in Expo – Medium](https://timchosen.medium.com/solving-react-native-maps-compatibility-issue-for-web-builds-in-expo-5bd94fae8fb1), retrieved 2026-07-18.
- Expo's own first-party alternative, `expo-maps`, is ALSO native-only
  (Apple Maps on iOS, Google Maps on Android — no web target). Expo's
  documented cross-platform pattern for this exact situation is a
  `Platform.OS` branch or a `.web.tsx`/`.native.tsx` file-extension split
  rendering a different component per platform. Source: [Maps – Expo Documentation](https://docs.expo.dev/versions/latest/sdk/maps/), retrieved 2026-07-18.
- The community-validated combo actually demonstrated for Expo apps needing
  BOTH native and web maps: `@maplibre/maplibre-react-native` for native,
  `react-map-gl` wrapping `maplibre-gl` for web — shown end-to-end,
  including the Expo config-plugin wiring, as recently as January 2025.
  Source: [Getting MapLibre working for both native and web in Expo – GreenAsh](https://greenash.net.au/thoughts/2025/01/getting-maplibre-working-for-both-native-and-web-in-expo/), [Getting Started – MapLibre React Native docs](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), retrieved 2026-07-18.
  Kapar already has `react-native-maps` wired for native (`VenueMap`
  component per FEATURES.md) — this finding is purely additive: keep native
  as-is, add a web-only branch.
- **Tile source license/cost comparison** (what the web MapLibre/Leaflet
  layer actually renders):
  - **OpenFreeMap** — free, unlimited map views/requests, no API key, no
    registration, no cookies; serves OSM data via the OpenMapTiles vector
    schema; funded by donations. Best fit for an MVP with zero map-tile
    budget and unpredictable traffic. Source: [OpenFreeMap](https://openfreemap.org/), [Show HN: OpenFreeMap – Hacker News](https://news.ycombinator.com/item?id=41593463), retrieved 2026-07-18.
  - **MapTiler Cloud free tier** — 100,000 tile requests/month + 5,000
    sessions + 100MB hosting, no card required, but the FREE plan's service
    PAUSES until the next month if the quota is exceeded — a real risk at a
    demo or launch traffic spike. This is the tier the GreenAsh Expo
    walkthrough above uses. Source: [MapTiler Cloud pricing](https://www.maptiler.com/cloud/pricing/), retrieved 2026-07-18.
  - **Public osm.org tile server** — explicitly NOT for production/
    commercial use under the OpenStreetMap Foundation's Acceptable Use
    Policy; production use must self-host (osm2pgsql + a renderer) or use a
    third-party provider instead. Source: [Raster tile providers – OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Raster_tile_providers), retrieved 2026-07-18.
  - Underlying map DATA is OpenStreetMap's ODbL either way (requires visible
    attribution, e.g. "© OpenStreetMap contributors"); MapLibre GL JS itself
    is BSD-3, fully open-source, with no Mapbox proprietary lock-in (unlike
    Mapbox GL JS, which went closed/proprietary after v1/v2). Source:
    [OpenMapTiles](https://openmaptiles.org/), [MapLibre React Native – GitHub](https://github.com/maplibre/maplibre-react-native), retrieved 2026-07-18.
  Recommendation: OpenFreeMap as the default web tile source (zero cost,
  zero quota risk, global OSM coverage includes North Macedonia/the Balkans
  at standard fidelity), with MapTiler documented as a fallback only if
  OpenFreeMap's donation-funded public instance ever becomes unavailable.

### CHAT SAFETY TABLE-STAKES FOR A TWO-SIDED MARKETPLACE — retrieved 2026-07-18

- **Report + block is the near-universal minimum, and cheap to build
  alongside Wave 5's real chat.** Airbnb lets either party report a
  message/conversation (with a reason) and separately block the other party
  from messaging, booking, or accepting future reservations from them;
  blocking during an active/upcoming reservation still allows the messages
  needed to complete THAT reservation, tapering off ~2 weeks after it ends
  rather than cutting off mid-booking communication abruptly. Source:
  [Report and block a host or guest's messages – Airbnb Help Center](https://www.airbnb.com/help/article/2020), [Report a host or guest for inappropriate behavior – Airbnb Help Center](https://www.airbnb.com/help/article/3806), retrieved 2026-07-18.
  Booking.com's partner-side equivalent is "report guest misconduct" (type +
  short description + an optional future-booking block), reportable from
  the day after check-in through 7 days after checkout. Source: [Report guest misconduct to Booking.com – Cloudbeds help](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/360053613654-Report-guest-misconduct-to-Booking-com-from-Cloudbeds-PMS), retrieved 2026-07-18.
  Kapar mapping: genuinely MVP-blocking, not later — Wave 5 is building the
  real chat THIS pass, and retrofitting a report/block modal onto an
  already-shipped chat screen is far more expensive than building it into
  the first version of the message thread plus a block-check on the
  existing auth/booking-guard layer. No category leader ships 1:1
  marketplace chat without this.

- **Automated phone/email masking and link-stripping is real at Airbnb/
  Booking scale, but Kapar should NOT clone it.** Airbnb strips/blocks
  contact info (regex + heuristic detection of phone numbers, emails,
  external links) from messages specifically to stop hosts/guests moving
  bookings off-platform (a commission-evasion problem for Airbnb); its
  newer "temporary phone number" system replaces real numbers with a masked
  per-reservation alias (US/Canada pilot only as of late 2025). Booking.com
  does the same: partner/guest numbers show as an @guest.booking.com /
  @partner.booking.com alias by default, with a "Show phone number" reveal
  action. Source: [Why we review messages on Airbnb](https://www.airbnb.com/help/article/1121), [Airbnb's New Temporary Phone Numbers – yada.ai](https://yada.ai/blog/airbnbs-new-temporary-phone-numbers-what-changed-and-how-str-owners-should-pivot), [All about our messaging security settings – Booking.com for Partners](https://partner.booking.com/en-us/help/legal-security/security/all-about-our-messaging-security-settings), retrieved 2026-07-18.
  Kapar mapping: Airbnb/Booking mask contact info because their real
  product risk is commission bypass. Kapar has NO in-app payment and NO
  commission to protect (2026-07-09 decision, already in FEATURES.md) — the
  venue visit and kapar payment happen in person BY DESIGN, and phone
  number is already a required profile field specifically BECAUSE "venues
  coordinate visits by phone" (2026-07-10 decision). Masking phone numbers
  in chat would work against Kapar's own booking model. Recommend explicitly
  SKIPPING contact-masking/link-stripping for MVP as a reasoned deviation,
  written into the Wave 5 chat spec so a future reviewer doesn't flag its
  absence as an oversight.

- **Off-platform PAYMENT warnings matter far less for Kapar than for
  Airbnb/Booking, for the same underlying reason.** Both platforms actively
  warn users never to pay outside the platform's own rails (Venmo/Cash App/
  PayPal-Friends&Family/wire transfers/gift cards/crypto are named red
  flags) because their trust-and-safety and refund protections are
  contingent on payment happening ON the platform. Source: [Is Booking.com Legit? Safety Guide – AVG](https://www.avg.com/en/signal/is-booking-com-legit), retrieved 2026-07-18.
  Kapar's kapar payment ALREADY happens off any digital rail, in person, by
  design (2026-07-09 decision) — there is no "on-platform payment" to steer
  users toward protecting, so an Airbnb-style "never pay outside the app"
  banner would be confusing, contradictory copy for Kapar's own model. The
  one true analog worth keeping is a narrow chat-safety report scope
  (harassment/inappropriate behavior), not a payment-instruction warning.

- **Verdict: MVP-blocking = report + block only.** Contact-masking and an
  off-platform-payment warning banner are reasoned SKIPS for Kapar, not
  gaps — see the three paired PROPOSED FEATURES rows above. This quick pass
  found no other category-standard chat-safety feature (no evidence of
  AI-moderation or canned-reply templates being treated as safety-critical
  rather than UX-nice-to-have at either reference company this session).

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

### MK/EU DATA-PRIVACY MINIMUMS — INPUT TO THE LEGAL DRAFT, NOT A SUBSTITUTE
### FOR COUNSEL — retrieved 2026-07-18

- **Framing, upfront.** North Macedonia's Law on Personal Data Protection
  (Official Gazette 42/20, amended 294/21 and 101/2025), effective 24
  February 2020, is GDPR-aligned/harmonized and overseen by the Agency for
  Personal Data Protection (Агенција за заштита на личните податоци / AZLP,
  also referred to by its older acronym DZLP). Everything below is a
  starting checklist for drafting the privacy notice that currently exists
  only as dead/no-op Terms/Privacy links in the app (see FEATURES.md gap) —
  it is NOT a substitute for a Macedonian lawyer's sign-off before real
  users' data is collected; that caveat is load-bearing, repeat it in
  whatever spec builds this. Source: [Data protection laws in North Macedonia – DLA Piper Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=MK), [Republic of North Macedonia – DataGuidance jurisdiction overview](https://www.dataguidance.com/jurisdictions/north-macedonia), retrieved 2026-07-18.

- **Privacy notice minimum content.** The law's duty-to-inform provisions
  (Articles 17–18 per the unofficial Council of Europe translation) require
  at minimum: the identity and contact details of the controller (and any
  local representative, where applicable); the DPO's contact details where
  a DPO exists; and the purposes of processing plus the legal basis for
  each. Given the confirmed GDPR harmonization, the safe drafting baseline
  is the full GDPR Article 13 checklist this law implements: additionally,
  the retention period (or the criteria used to determine it), the data
  subject's rights, and the right to lodge a complaint with the Agency
  together with the Agency's own contact details. Source: [Unofficial translation, Law on Personal Data Protection – rm.coe.int](https://rm.coe.int/lpdp-republic-of-north-macedonia-2020/1680a9ac8a) (WebSearch-indexed synthesis only; direct WebFetch returned 403, see the updated retry note below), [Art. 13 GDPR – gdpr-info.eu](https://gdpr-info.eu/art-13-gdpr/), retrieved 2026-07-18.
  Kapar's privacy notice draft minimally needs: (1) who Kapar is (legal
  entity/controller identity + a real contact email — not the current dead
  link), (2) what's collected (email, phone, booking/event details, vendor
  listing content) and why (account creation, booking lifecycle, couple-
  vendor coordination), (3) legal basis per purpose (contract performance
  for bookings; consent for any future marketing), (4) how long each
  category is retained (e.g. booking records vs. an expired/never-verified
  auth code), (5) the data-subject rights list (access, rectification,
  erasure, restriction, objection, portability), (6) the right to complain
  to the AZLP + the AZLP's own contact details, (7) whether any data leaves
  North Macedonia (Railway/Cloudflare R2/Resend hosting location — the
  DECISIONS LOG already picks EU-region hosting, which is the right default
  here too).

- **Registration/notification duty — likely NOT triggered at Kapar's
  current data volume, but do not assume so without counsel.** Since the
  2020 law, North Macedonia replaced the old blanket database-registration
  regime with a narrower "high-risk database" registry: controllers must
  notify the Agency only for processing the controller itself assesses (via
  a DPIA) as posing a high risk to data subjects' rights and freedoms — the
  law does not define "high risk" numerically, leaving it to the
  controller's own judgment, and Article 71 of the unofficial translation
  specifically calls out "new technologies" as one high-risk trigger
  requiring notification with prescribed content (filing-system title,
  purpose, legal basis, categories, recipients, transfer info, security
  measures). Ordinary email + phone + booking data, at MVP scale, does not
  resemble the special-category/large-scale/systematic-monitoring fact
  patterns the law and GDPR both use to define "high risk" — but this is a
  judgment call, and the safe MVP move is a short internal DPIA-lite
  rationale for why Kapar is NOT high-risk today, kept on file. Source:
  [Registration in North Macedonia – DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=registration&c=MK), retrieved 2026-07-18.

- **DPO appointment — not required at MVP scale.** Mandatory only for (i)
  processing by a state authority, (ii) regular/systematic large-scale
  monitoring of data subjects, or (iii) large-scale processing of special-
  category/criminal-offence data — none of which describe Kapar's couple/
  vendor marketplace data at launch. Notable local wrinkle if a DPO is ever
  appointed: the law requires the DPO to be fluent in Macedonian, and the
  DPO's contact details must be filed with the Agency. Source: [Data Protection Guide North Macedonia – Multilaw](https://multilaw.com/Multilaw/Multilaw/Data_Protection_Laws_Guide/DataProtection_Guide_North_Macedonia.aspx), retrieved 2026-07-18.

- **Breach notification** exists as a GDPR-equivalent duty (notify the
  Agency without undue delay; notify affected data subjects if the breach
  is likely to result in high risk to them) per the law's general GDPR
  harmonization — the exact deadline/threshold text could not be retrieved
  this session (WebFetch blocked on the primary-source translation); flag
  as an open item for counsel to confirm the precise window before launch
  rather than asserting an unverified number.

- **Bottom line / recommendation.** Ship a real, MK-law-shaped privacy
  notice (replacing the current dead Terms/Privacy links — already flagged
  in FEATURES.md) BEFORE any real (non-seed) user signs up, since email +
  phone + booking data collection already happens at account creation. This
  is squarely a Wave 5/6 item, not a "later" one, given real users are the
  explicit Wave 6 launch target (see FEATURES.md STANDING OBJECTIVE). Get a
  Macedonian-qualified lawyer to review the final copy before it ships to
  real users — everything above is a drafting checklist synthesized from
  public secondary sources (DLA Piper, Multilaw, a WebSearch-indexed
  unofficial law translation), not primary-source-verified article text,
  and not a substitute for that review.

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
  RETRY 2026-07-17 (as tasked): re-tested both a neutral control (WebFetch
  on en.wikipedia.org/wiki/Booking.com) and a direct target
  (partner.booking.com/.../reviewing-information-about-reservations-made-your-property)
  — both returned HTTP 403 again, same proxy-level signature as 2026-07-12.
  Additionally: no `mcp__Mobbin__*` tools (e.g. search_flows, search_screens)
  were present in this session's available toolset at all — this isn't a
  403/permission block to work around, the Mobbin MCP server simply isn't
  wired into this environment this session, so there was nothing to retry
  against for that specific channel. No DESIGN INTEL items could be
  upgraded to screenshot-level fidelity this pass; all three tasked items
  for 2026-07-17 (decline UX/SLA, notification-center patterns, this retry)
  are filed as WebSearch-synthesis-only, same confidence tier as 2026-07-12.
  Per the orchestrator's instruction, NOT retrying again this pass — this
  is now confirmed twice (2026-07-12, 2026-07-17) as a standing environment
  limitation, not a transient blip. If a THIRD pass is scheduled before
  Wave 6's visual lock, check first whether the environment has changed
  (Mobbin MCP tools present in the toolset, or a non-403 response on the
  Wikipedia control) before spending budget on the same retry again.
  RETRY 2026-07-18 (THIRD confirmation, as instructed to check before
  spending budget on a repeat): re-tested the neutral Wikipedia control
  PLUS five direct targets this pass (Baymard's accommodations-split-view
  article, Secure Privacy's MK-law blog post, Schoenherr's MK enforcement
  article, Refworld's consolidated MK law text, and the rm.coe.int
  unofficial law translation PDF) — ALL six returned HTTP 403, the identical
  proxy-level signature seen on both prior passes. `mcp__Mobbin__*` tools
  were STILL absent from this session's toolset. The environment has NOT
  changed across three separate sessions/dates now — this should be treated
  as a durable characteristic of this environment, not something worth
  re-testing again on a routine founder pass. Do not schedule a fourth
  identical retry; only re-test if the orchestrator has specific reason to
  believe the proxy/MCP configuration itself changed (e.g. a session
  environment update, not just calendar time passing).

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

## WAVE 1 — bookings on the server (trust core) — ✅ SHIPPED 2026-07-12
## (inline by the orchestrator — the booking state machine is never delegated
## per CLAUDE.md Rule 7; deploy slice still waits on the Railway account)
- [x] P0 — booking lifecycle endpoints with server-enforced transitions +
  booking_events audit trail; TTL expiry worker (24h request / payBy lapse)
  (gap: "sweep only runs on next app launch"; gap: "venueBot timers die on
  restart"). Design-intel cross-ref: Booking.com's "Request to Book" 24h/24h
  dual-timer (accept-or-decline within 24h, then guest confirms within a
  further 24h) is a directly validating reference — see DESIGN INTEL item 7
  above, filed 2026-07-12.
- [x] P0 — double-booking prevention: partial unique index on active
  (venue_id, event_date) + transactional insert + availability re-check at
  submit (gap: "same device can double-book"; gap: "no re-check at checkout").
- [x] P0 — cancel/expiry releases the date for everyone (gap: "cancelling does
  not release the date").
- [x] P0 — app bookings store server-backed; venueBot retired behind a DEMO
  flag (gaps: "venueBot compresses visit to 75s", "confirmed state is fiction").
- [ ] P1 — booking draft store survives process death (currently in-memory).

## WAVE 2 — real auth + business-mode switch — ✅ P0s SHIPPED 2026-07-13
## (slice A built by a worktree wave-implementer — first successful parallel
## slice; reviewed + merged by the orchestrator)
- [x] P0 — email 6-digit-code auth (channel-pluggable endpoint so SMS can be
  added without rework — see DECISIONS LOG), sessions, roles couple|vendor
  (gap: "ANY 6 digits pass, no SMS, no sessions").
- [x] P0 — guard ALL protected routes, not just (tabs) (gap: "deep-linkable
  unauthenticated").
- [x] P0 — profile ⇄ Business mode switch scaffold + vendor shell.
  Design-intel cross-ref (2026-07-12): decide the vendor home-screen IA
  together with WAVE 4's bookings dashboard — see PROPOSED FEATURES "Vendor
  dashboard home = single 'today' action feed" — same screen, don't spec the
  two waves' home layout independently.
- [ ] P1 — wire Resend behind the existing sendCode() provider abstraction
  (copy rework DONE 2026-07-13 — the SMS overclaim is retired in all locales;
  dev provider logs codes + returns devCode outside production).
- [ ] P1 — personal-info editor (dead button on profile).

## WAVE 3 — vendor extranet core — ✅ CORE SHIPPED 2026-07-17 (server slice by
## a worktree wave-implementer, reviewed + merged; app slice by orchestrator;
## exit criteria met: vendor created a listing a couple could find and book)
- [ ] P1 — logout row in settings (clearAuth exists, nothing calls it).
  CARRY-OVER → Wave 4 (critic re-flagged 2026-07-17, see profile-honesty item).
- [ ] P2 — hygiene: uuid-derived test dates in bookings.test.ts; periodic
  cleanup for sessions/auth_codes tables.
# GATE CLEARED 2026-07-12 — see DESIGN INTEL "VENDOR EXTRANET" above for the
# sourced reference pack this wave should design from.
- [x] P0 — listing CREATION shipped 2026-07-17: one-form funnel → unpublished
  draft → self-serve publish (deviation logged in FEATURES DECISIONS) →
  publicly findable + bookable. NOT YET: edit UI, photos→R2 (blocked on R2
  account), locale-tab content editing — carry-over below.
- [ ] P0 CARRY-OVER → Wave 4 — halls & menus editor (per-guest pricing, hall
  adjustments); listing edit UI (PATCH endpoint exists, no screen); locale-tab
  content editing (DESIGN INTEL item 4).
- [x] P0 — availability calendar SHIPPED 2026-07-17 with the 3-state deviation
  (open/blocked-by-vendor/booked); blocks enforced server-side on the booking
  path; public bookedDates = seed ∪ active bookings ∪ vendor blocks.
- [ ] P1 CARRY-OVER → Wave 6 — admin approve/publish flag + minimal review
  tooling (publishing is self-serve until then, deviation 2026-07-17).

## WAVE 4 — vendor booking operations — ✅ CORE SHIPPED 2026-07-18
## (server slice + app slice by worktree wave-implementers, both reviewed and
## merged; correctness batch by orchestrator; exit criteria met: full
## two-sided loop through the UI with the demo bot verifiably kept out)
# CRITIC INTAKE 2026-07-17 (verdict FIX FIRST; demo-breakers fixed in-session):
- [x] P0 — refund-preview repository violation FIXED 2026-07-17: cancel.tsx +
  booking/[id].tsx fetch via venueApi; paid-cancel blocked until the
  authoritative policy loads. Run-verified on a vendor-created venue.
- [x] P0 — profile honesty + logout SHIPPED 2026-07-17: email identity,
  truthful guest copy ×3, sign-out row (both modes), becomeVendor error.
- [ ] P1 CARRY-OVER → Wave 5 — HeartButton out of the card pressables (nested
  <button> hydration errors ×3 VenueCard variants; zero-console-error standard).
- [ ] P1 CARRY-OVER → Wave 5 — settings honesty remainder: notification
  toggles labelled honestly (wire to the Wave-5 in-app center), Terms/Privacy
  static pages or de-affordanced (also on /welcome). Currency row FIXED
  2026-07-17 (EUR).
- [x] P1 — estimate line FIXED 2026-07-17 (dropped the non-multiplying inline
  arithmetic).
- [x] P0 — request inbox SHIPPED 2026-07-18: confirm (sets payBy) / decline
  with optional reason (required-category upgrade → Wave 5); 24h SLA countdown
  kept as a deliberate deviation (TTL is a hard enforced expiry — see
  DECISIONS LOG 2026-07-18).
  Design-intel cross-ref: field/column set validated against Booking.com's
  reservation list + detail — see DESIGN INTEL item 2. UPGRADE 2026-07-17:
  decline reason must be a REQUIRED fixed category (not optional, not
  free-text-only) per the new "VENDOR DECLINE UX + RESPONSE-SLA PATTERNS"
  DESIGN INTEL — clone Booking.com's Request-to-Book decline-reason-code
  model, NOT the standard Extranet (which has no decline at all) — see the
  two matching PROPOSED FEATURES rows filed 2026-07-17.
- [x] P0 — "kapar received" SHIPPED 2026-07-18 — `confirmed` is real for the
  first time on vendor-owned venues (bot scoped to ownerless seeds).
- [x] P0 — vendor bookings dashboard SHIPPED 2026-07-18 at /venue-bookings
  (upcoming/history, refund-owed callout, decline-reason caption; renamed to
  un-shadow the couple /bookings deep link). ADDITION 2026-07-17: reserve a slot for a
  trailing response-rate stat fed by `booking_events` timestamps (Airbnb
  Superhost-style %, see DESIGN INTEL) — cheap to log now, expensive to
  backfill later; not P0, but land the timestamp logging in this wave's
  server work regardless.
- [ ] P0 MOVED → Wave 5 — notification slice, re-scoped 2026-07-18 to what
  this environment can run-verify: server-backed in-app center (notifications
  table + GET + mark-read off existing lifecycle events, bell in both
  headers — founder pattern ACCEPTED, see DESIGN INTEL "IN-APP NOTIFICATION
  CENTER PATTERNS"); Expo push layers on once a device exists (no device →
  cannot be marked DONE per the verification rule).
  NOTE 2026-07-17 (per orchestrator's Wave 5 framing): this P0 line covers
  ONLY the push-delivery layer once device verification is possible; the
  server-backed `notifications` table + in-app center is scoped as its own
  Wave 5 item below so the notification STORY isn't blocked on push infra.
- [ ] P1 CARRY-OVER → Wave 5 — venue-initiated cancellation UI on the
  dashboard (the /v1/vendor/bookings/:id/cancel endpoint SHIPPED 2026-07-18
  with 100%-refund stamping + reason; no button calls it yet).

## WAVE 5 — couple-side completeness — ✅ CORE SHIPPED 2026-07-18 (three
## worktree slices + orchestrator batch, all reviewed and merged; exit
## criteria met: zero dead buttons, real chat + in-app notification center
## run-verified two-sided; map view deferred to Wave 6 WITH the reference
## pack below)
# CRITIC INTAKE 2026-07-17 — polish batch for the dead-button/honesty sweep:
# home bell's hardcoded unread dot (fake signal — first to go), verify checking
# state + mail icon + back hitSlop + "******" width, RefundTimeline today-marker
# with applicable-rung highlight (pairs with the ACCEPTED grace-row item),
# Badge success → green tokens, inline fontSize/color token violations,
# localized a11y labels replacing "♥ ↥ 🔔", checkout title de-piping +
# reassurance-copy dedupe (×4 → ×2) + kapar-bar skeleton instead of "€0",
# per-section edit links on the review step.
- [ ] P0 MOVED → Wave 6 — map view on results, now GATED on the 2026-07-18
  founder pack (DESIGN INTEL "RESULTS LIST↔MAP TOGGLE" + "WEB MAP
  IMPLEMENTATION FOR EXPO": maplibre-react-native + maplibre-gl/react-map-gl,
  OpenFreeMap tiles). The dead pill was REMOVED this wave — honesty over
  affordance theatre.
  FOUNDER PACK FILED 2026-07-18 (this pass): see DESIGN INTEL → "RESULTS
  LIST↔MAP TOGGLE..." and "WEB MAP IMPLEMENTATION FOR EXPO..." for the
  sourced entry-affordance/pin/cluster/web-alternative research this GATES
  the Wave 6 map slice on, plus the three paired PROPOSED FEATURES rows
  (mobile UX shape, web map component + license/cost, filter persistence).
- [x] P0 (couple half) SHIPPED 2026-07-18 — the couple now sees the decline
  reason quoted on booking detail + a "Find another venue" escape.
  Required-category upgrade (RtB shape) → Wave 6 (deliberate cut, logged).
- [x] P0 — real chat SHIPPED 2026-07-18 (server thread, both sides, verified
  live; bot is mock-only fiction). Report/block (founder: table-stakes)
  → Wave 6 P1.
  CHAT SAFETY PACK FILED 2026-07-18 (this pass): build report + block INTO
  this slice (MVP-blocking per DESIGN INTEL → "CHAT SAFETY TABLE-STAKES...")
  — cheapest possible moment, before the screen ships. Explicitly do NOT add
  Airbnb/Booking-style phone/email masking or an off-platform-payment
  warning banner (reasoned deviation, see the same DESIGN INTEL subsection
  and the paired PROPOSED FEATURES row) — Kapar has no commission/in-app
  payment to protect and phone number is already a required, visit-
  coordination field.
- [ ] P0 — NEW 2026-07-17: server-backed in-app notification center (real
  `notifications` table + unread count) to replace the hardcoded bell dot —
  directly resolves the FEATURES.md gap "Bell dot is a fake signal — remove
  first." See DESIGN INTEL "IN-APP NOTIFICATION CENTER PATTERNS" and the two
  matching PROPOSED FEATURES rows filed 2026-07-17. Scope note: this is the
  in-app/server half of "the notification story" only — Expo push (device-
  verified delivery) stays a separate Wave 4/later line item per the
  orchestrator's framing; build the table + endpoints so push is additive
  later with zero rearchitecture (Uber Push-Inbox reference).
- [x] P1 — dead-button elimination SHIPPED 2026-07-18: legal drafts ×3
  locales (MK privacy checklist applied), /support, .ics add-to-calendar
  (web; native hidden pending device verification), toggles wired to the
  in-app center, map pill + personal-info row honestly removed.
  PRIVACY-NOTICE CONTENT FILED 2026-07-18 (this pass): the terms/privacy
  static page item now has a sourced content checklist — see RISKS → "MK/EU
  DATA-PRIVACY MINIMUMS..." and the paired PROPOSED FEATURES row. Framed
  explicitly as drafting input, not a substitute for counsel review before
  real users sign up.
- [ ] P1 MOVED → Wave 6 — full locale QA sweep rides the design-critic
  launch pass.

## WAVE 6 — hardening & launch readiness
- [ ] P0 — design-critic full pass (both modes, light/dark, all locales) + fix
  round, incorporating the founder's verified references. Re-run a founder
  research pass with direct WebFetch/Mobbin MCP before this pass locks visual
  detail — see RISKS → "RESEARCH-PROCESS RISK": confirmed BLOCKED on THREE
  separate passes now (2026-07-12, 2026-07-17, 2026-07-18) — treat as a
  standing environment limitation, not a transient blip, and check whether
  the environment has actually changed (not just calendar time passing)
  before scheduling a fourth identical retry. Also queue the Baymard
  accommodations-split-view article for a direct read once WebFetch/Mobbin
  access works, per the "RESULTS LIST↔MAP TOGGLE" DESIGN INTEL entry.
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
