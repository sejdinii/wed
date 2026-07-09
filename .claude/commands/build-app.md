---
description: Full adversarial app-build workflow from a one-line idea
---

The user wants to build: $ARGUMENTS

Execute this workflow in order. Do not skip phases. Do not write app code before Phase 3 is approved.

## Phase 1 — INTERROGATION (output: objections, not questions-only)
Analyze the request as a skeptical co-founder:
1. State the 3 biggest risks or wrong assumptions in this idea/request.
2. List every feature the app category REQUIRES that the user did not mention
   (booking apps: cancellation/refund policy, double-booking prevention, deposits,
   vendor-side calendar, reviews, dispute handling — reason by category).
3. Identify the ONE differentiator worth innovating on. Everything else gets
   proven patterns.
Ask at most 3 questions — only ones that change the architecture. Propose your
own answers to each so the user can just say "agreed" or correct you.

## Phase 2 — RESEARCH & CLONE MAP (use tools, not memory)
1. Delegate to the design-researcher subagent. It must query Mobbin FIRST
   (flows for the core loops, screens for key screen types), then WebSearch
   only for gaps. A clone map with zero Mobbin-sourced references is
   incomplete — redo it unless Mobbin genuinely returned nothing.
2. Produce a CLONE MAP: for each core flow (e.g. discovery, detail page, booking,
   checkout, confirmation), name the app you're cloning the pattern from and
   describe the flow step-by-step as researched — with source links/dates.
3. Define the design system BEFORE screens: colors, type scale, spacing, radius,
   component inventory. Justify it against the researched references.
STOP. Present Phase 1 + 2 as a build plan. Wait for approval.

## Phase 3 — SCAFFOLD
Project structure, design tokens, navigation shell, mock data layer, core components.

## Phase 4 — BUILD
Implement flows in priority order. Every screen: loading/empty/error states.
Run the app / tests as you go. Fix before proceeding.

## Phase 5 — ADVERSARIAL REVIEW (mandatory, before saying "done")
Invoke the design-critic subagent on the finished build. Then output:
- Rubric scores (1-10, no score above 8 without a stated reason):
  visual polish vs. researched references | feature completeness vs. clone map |
  edge-case coverage | code quality
- The 5 weakest things about the current build, ranked
- What you would do next if the user said "make it excellent"
