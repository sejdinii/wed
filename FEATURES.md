# FEATURES.md — single source of truth for what exists
# The agent maintains this file. Humans read it. Neither trusts memory.
# Status values: DONE (built + verified running) | PARTIAL (built, missing states/edge cases)
#                STUB (placeholder/mock only) | MISSING (not started) | BLOCKED (needs user decision)
# RULE: nothing gets marked DONE without being run/tested in this session.

## MVP Definition of Done
An MVP is DONE when: the app boots with zero errors, every CORE flow below is
DONE (not PARTIAL), every screen has loading/empty/error states, and the
critical-path demo (search → view venue → book → confirmation) runs end-to-end
on device/simulator without a crash.

## CORE FLOWS (MVP-blocking)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Venue search + filters | MISSING | — | |
| Venue detail page (gallery, pricing, availability) | MISSING | — | |
| Booking flow (date select → request/confirm) | MISSING | — | |
| Double-booking prevention | MISSING | — | server-side check required |
| Booking confirmation + status screen | MISSING | — | |
| Auth (signup/login, both user types) | MISSING | — | |
| Vendor: venue listing creation/edit | MISSING | — | |
| Vendor: calendar/availability management | MISSING | — | |
| Vendor: incoming booking requests | MISSING | — | |
| Cancellation/refund flow | BLOCKED | — | policy undecided — known gap |

## REQUIRED BUT NOT CORE (post-boot, pre-launch)
| Feature | Status | Verified how | Notes |
|---|---|---|---|
| Empty states (all list screens) | MISSING | — | |
| Error states + retry (all network screens) | MISSING | — | |
| Reviews/ratings | MISSING | — | |
| Notifications (booking status changes) | MISSING | — | |
| Deposits/payments | MISSING | — | decide: in-MVP or manual? |
| Onboarding (first-run) | MISSING | — | |
| Profile/settings | MISSING | — | |

## DISCOVERED GAPS (agent appends here when it finds unstated requirements)
- (agent: every time you notice a missing requirement mid-build, add it here
  immediately — do not rely on remembering it later)

## DECISIONS LOG
- (agent: record every product decision the user makes, with date, so future
  sessions don't re-ask)
