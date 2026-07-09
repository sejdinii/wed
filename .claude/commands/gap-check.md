---
description: Adversarial audit — what's missing, stubbed, or lying in FEATURES.md
---

Do NOT build anything in this session. You are auditing.

1. Read FEATURES.md, then independently audit the actual codebase:
   - Every screen: does it have loading, empty, and error states? List violations
     with file paths.
   - Every DONE item: find the code that proves it. Downgrade anything that's
     actually PARTIAL or STUB. FEATURES.md optimism is a bug — fix it.
   - Every flow: trace it end to end. Note where it dead-ends, uses mock data,
     or silently swallows errors.
2. Category audit: compare against what a two-sided booking marketplace MUST
   have (auth for both sides, availability integrity, double-booking guards,
   booking state machine, cancellation path, vendor management). List everything
   absent from both the app AND FEATURES.md — those are the dangerous ones,
   because nobody is tracking them. Add them to DISCOVERED GAPS.
3. Run the app and the critical path manually (search → detail → book → confirm).
   Report exactly where it breaks.
4. Output, in order:
   - "But wait — we haven't built:" ranked list (MVP-blocking first)
   - "Marked done but isn't:" list with evidence
   - "Nobody was tracking these:" newly discovered gaps
   - Honest MVP % with one-line justification
   - Recommended next /continue-build session plan
5. Update FEATURES.md to match reality before finishing.
