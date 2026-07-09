# Adversarial App-Builder Setup for Claude Code

## Install
Copy into your project root:

```
your-project/
├── CLAUDE.md                          # persona + standing rules
└── .claude/
    ├── commands/
    │   └── build-app.md               # /build-app slash command
    └── agents/
        ├── design-researcher.md       # fetches current UI references
        └── design-critic.md           # adversarial review pass
```

Then in Claude Code:

```
/build-app a wedding venue booking marketplace for North Macedonia
```

## Why three layers instead of just CLAUDE.md
- CLAUDE.md instructions decay over long sessions. The slash command re-injects
  the full workflow at the moment you invoke it — fresh context, full strength.
- Subagents run with their own context window and their own narrow persona, so
  the critic stays harsh even when the main agent has drifted agreeable, and the
  researcher can burn tokens on fetching without polluting the build context.

## Enabling the tools
- Allow WebSearch/WebFetch when prompted (or pre-approve in .claude/settings.json).
- Mobbin MCP: the design-researcher subagent has NO `tools:` field on purpose —
  omitting it inherits all tools, including MCP servers. If you ever add a
  `tools:` list to that agent, you must include the Mobbin tools explicitly
  (run /mcp to see exact names, e.g. mcp__mobbin__search_flows) or the agent
  silently loses Mobbin access. Partial allowlists are the #1 silent failure here.
- Verify the wiring once: run /build-app on a test idea and confirm Phase 2
  output cites Mobbin flows/screens by app name. If it only cites web articles,
  the MCP isn't reaching the subagent.

## Tuning the aggression
If it's still too agreeable: the failure is almost always that it started coding
too early. Tighten Phase 1 ("do not proceed until the user has responded to your
objections"). If it's too obstructive after plan approval, strengthen Rule 5.
Edit → retry takes 30 seconds. This file IS your training loop.
