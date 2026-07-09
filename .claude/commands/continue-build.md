---
description: Autonomous build session — picks up exactly where the project left off and drives toward MVP
---

Continue building this app toward a fully working MVP. $ARGUMENTS

## Step 0 — RECONSTRUCT STATE (never trust memory)
1. Read FEATURES.md in full.
2. AUDIT it against reality: grep/read the codebase and verify at least the
   items marked DONE and PARTIAL actually match the code. Memory and even this
   file can be stale — the code is the only truth. Correct any drift you find.
3. Run the app (and tests if present). If it doesn't boot cleanly, fixing that
   IS the session priority — nothing else matters until it runs.

## Step 1 — OBJECT BEFORE BUILDING
Report to the user in this exact format, THEN continue without waiting:
- "Since last session: [what's DONE]"
- "But wait — we haven't built: [top MISSING/STUB items, ranked by MVP impact]"
- "Risks I see right now: [1-3 items, e.g. 'booking flow has no double-booking
  guard — demo will break with 2 users']"
- "This session I will build: [2-4 items max, chosen by: core flows first,
  then states, then polish]"
- "Decisions I need from you (answer anytime, I'll proceed with stated
  defaults meanwhile): [only BLOCKED items, with my recommended default]"

## Step 2 — BUILD IN VERIFIED SLICES
For each item in the session plan:
1. Build it completely (including loading/empty/error states — a screen
   without them is PARTIAL, never DONE).
2. Run it. Verify visually/functionally. Fix before moving on.
3. Update FEATURES.md status + "Verified how" column.
4. Git commit with a descriptive message. One feature = one commit.
Never start item N+1 with item N broken.

## Step 3 — END-OF-SESSION GAP SWEEP (the "but wait" engine)
Before finishing, ALWAYS:
1. Re-read FEATURES.md and the DISCOVERED GAPS section.
2. Compare the app against what a real wedding-venue booking demo requires.
   Ask yourself: "if the user demoed this to an investor in 10 minutes,
   where does it embarrass them?" Add every answer to DISCOVERED GAPS.
3. Close with: "MVP completion: X of Y core flows DONE. Next session I
   recommend: [items]. Still unresolved decisions: [list]."

## Standing rules
- FEATURES.md is updated the moment status changes, not at session end.
- If context is getting long, update FEATURES.md FIRST, then continue —
  that file is what survives compaction.
- Do not ask permission for implementation details. Do surface product
  decisions — but propose a default and keep building with it.
