# Kapar — Design Principles

**Simplicity above everything.** We think like the product teams behind Booking.com, Airbnb,
Apple, Uber and Revolut: incredibly complex business problems, minimum exposed complexity.
Our audience is a couple planning one of the biggest days of their lives, often under stress —
not power users. Every decision must reduce cognitive load.

## The Booking.com principle

Behind the scenes: pricing engines, availability, payment orchestration, escrow, notifications,
contracts, fraud, localization. The user sees: **Search → Results → Details → Book.**
The complexity belongs in the architecture — not the interface.

## Two layers, always

- **Layer 1 — UX:** "What is the absolute minimum the user needs to see to confidently complete
  this task?" Hide everything else.
- **Layer 2 — Business logic:** infinitely sophisticated, invisible. Never expose implementation
  complexity unless it increases trust or prevents mistakes. (Kapar terms and protection are the
  canonical exception: transparency there *is* the product.)

## Progressive disclosure

Never show everything at once.

- **Search results:** venue, one great photo, price, rating, capacity, kapar. Nothing else.
- **Venue details:** only what's needed to decide; everything else expandable
  (`ExpandableSection`: one-line summary + chevron — the Airbnb "More details" pattern,
  simplified to inline accordion).
- **Booking:** ask only what the next step requires. Never long forms.
- **Payment:** only explain kapar. Never payment architecture.

## One screen, one purpose

Search = find a venue. Details = decide. Calendar = choose a date. Payment = pay kapar.
Bookings = track. If a screen develops a second competing purpose, redesign it.

## Every pixel must earn its place

For each element ask: why does it exist? can the task be completed without it? does it reduce
uncertainty, increase trust, or increase conversion? If not — remove it.

Prefer 3 obvious buttons over 12 clever ones. One excellent CTA over five secondary actions.
One expandable section over five visible cards. One settings page over ten.

## Design like Apple, think like Booking.com

Apple: clarity, whitespace, typography, motion, hierarchy.
Booking.com: conversion, trust, confidence, low friction, decision support. We want both.

## Thumb first

Every important interaction reachable with one thumb. Critical actions near the bottom
(sticky bars). Designed for the hand, not adapted from desktop.

## The litmus tests

- **Would Booking.com / Airbnb / Apple expose this?** If no → backend logic, hide it.
- **5-second rule:** a first-time user must understand any screen in under five seconds.
  If it needs explanation, it's too complicated.

## The goal

Not the app with the most features — the app with the **fewest visible features** necessary to
make booking a wedding venue feel effortless. The user should never think "this app can do a
lot." They should think: *"Wow — booking a wedding venue was much easier than I expected."*
