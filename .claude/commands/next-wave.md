---
description: Run the next checkpoint + wave cycle on an existing parallel-build project
---

Continue the wave loop. $ARGUMENTS

1. RECONSTRUCT: read FEATURES.md, CONTRACTS.md, BACKLOG.md. Audit FEATURES.md
   against the code (delegate the mechanical sweep to the auditor agent).
   Verify the app boots. If a previous wave is unmerged, finishing that
   checkpoint IS this session's first job.
2. CHECKPOINT: process BACKLOG.md (accept/reject with reasons), apply pending
   shared-change requests, run the design-critic if the last integrated result
   was never reviewed, update FEATURES.md.
3. Report to the user: current MVP %, "but wait - we haven't built" list,
   the next wave's 3-4 slices, and any blocked decisions (with your defaults).
4. LAUNCH the next wave per the parallel-build protocol: frozen specs,
   worktree-isolated wave-implementers, founder running in the background.
5. When the wave completes, run the full checkpoint again and end the session
   with a merged, booting app - never leave worktrees dangling for the next
   session to archaeology.
