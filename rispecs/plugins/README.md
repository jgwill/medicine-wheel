# Medicine Wheel Copilot Plugin Proposal Set

This directory defines a **proposal-grade** specification set for a future dedicated Medicine Wheel GitHub Copilot plugin.

## Status

These documents describe a **proposed plugin**, not current productized architecture. They are grounded in the repository as it exists today:

- `src/prompt-decomposition` supplies the Four Directions vocabulary and `.pde` artifact model.
- `src/ceremony-protocol` supplies ceremony protocol phases and governance framing.
- `src/fire-keeper` supplies active gating, permission tiers, relational check-back, and extended ceremony handling.
- `.pde/` already contains both flat prompt-decomposition artifacts and wave-oriented orchestration directories.

## File Set

| File | Purpose |
| --- | --- |
| `reference-analysis.proposal.md` | Repo-grounded analysis of what exists now, what patterns to reuse, and what must remain proposal scope |
| `medicine-wheel-plugin-layout.proposal.md` | Proposed filesystem layout for a future plugin package, including agent/skill organization |
| `medicine-wheel-plugin-rise.spec.md` | Actionable RISE-style specification for a future plugin MVP and later phases |

## MVP Direction

The strongest proposed MVP centers on:

1. **Fire Keeper orchestration**
2. **Wave orchestration over `.pde` waves**
3. **Direction inquiry grounded in East/South/West/North**
4. **Wave-spec generation for new development waves**

## Explicit Non-MVP Scope

Ceremonial GitOps, issue drafting, PR automation, and review routing are documented only as **Phase 2/3 proposals**, not MVP commitments.
