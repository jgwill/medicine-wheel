# Follow-Up Session — Post-P0 Enhancement

> **Context:** Session `8302628d-f031-4724-b59b-4337c3e24bf0` is **COMPLETE**. All P0 items were delivered by the orchestrator. The pi-mono review companion added CLI tooling, GitHub Copilot agents, a skill, and an llms document. This follow-up is for the **next session** whenever you choose to continue.

---

## What Is Done (Do NOT Redo)

✅ All 3 parts of the orchestration mission delivered
✅ 54 MCP tools (including 4 ceremony lifecycle: `mw_ceremony_open/close`, `mw_get_direction`, `mw_store_memory`)
✅ Stale lock recovery + lock-failure safety in both jsonl-store files
✅ MMOT review with full tool completeness matrix (26 gaps identified, P0 gaps resolved)
✅ 3 deep-searches grounded in Wilson/Kovach/Smith/Marshall
✅ Thesis synthesis (458 lines) with 6 ontological category shifts
✅ Orchestration upgrade recommendations with 16 rispec candidates (R1–R16)
✅ Production `rispecs/CYCLES.md` and `rispecs/CEREMONIES.md`
✅ 6 new packages (fire-keeper, importance-unit, relational-index, transformation-tracker, consent-lifecycle, community-review)
✅ `.github/agents/` — 5 ceremony-aware agent definitions for Copilot
✅ `bin/mw` CLI wrapper — tested, all commands work
✅ `/home/mia/.claude/skills/medicine-wheel-mcp-usage/` — agent skill
✅ `llms/llms-medicine-wheel-mcp-tools.md` — 54-tool reference document

---

## Recommended Next Session — P1 Items

Pick one or combine several. Each is a focused session.

### Option A: Delete Operations + Shared Store Package

**Goal:** Close the remaining CRUD gap and eliminate the dual-store maintenance debt.

1. Add `delete(id)` to `JsonlCollection` and `EdgeCollection` in both `lib/jsonl-store.ts` and `mcp/src/jsonl-store.ts`
2. Expose as MCP tools: `delete_relational_node`, `delete_ceremony`, `delete_edge`, `delete_narrative_beat`, `delete_cycle`
3. Extract `packages/store/` shared package — single implementation, both `lib/` and `mcp/` import from it
4. Build and test

### Option B: Consent Lifecycle Tools

**Goal:** Consent-as-relationship has zero tool representation. This is the most impactful spec gap.

Reference: `rispecs/consent-lifecycle.spec.md` + `orchestration-upgrade-recommendations.md` §2 N3

1. Add `consent-records.jsonl` as 8th entity collection
2. Implement: `grant_consent`, `conduct_consent_ceremony`, `check_consent_health`, `withdraw_consent`
3. Extend `StoredEdge` with optional `OcapFlags` and `AccountabilityTracking`

### Option C: Community Review Tools (Talking Circle)

**Goal:** The project's strongest alternative to Western peer review — and it has no tools.

Reference: `rispecs/community-review.spec.md` + `orchestration-upgrade-recommendations.md` §2 N6

1. Implement: `create_review_circle`, `add_voice_to_circle`, `seek_consensus`, `request_elder_validation`
2. Each voice carries directional weight
3. Consensus is relational (not majority vote)

### Option D: Ceremony-Wrapped Orchestration

**Goal:** Test the Fire Keeper pattern by wrapping the next RISE PDE session in actual ceremony.

Reference: `orchestration-upgrade-recommendations.md` §3.2 Stage 1

1. Before dispatching agents, call `mw_ceremony_open`
2. At each direction transition, log directional handoff with Wilson alignment assessment
3. At completion, call `mw_ceremony_close` with narrative summary
4. Use the `.github/agents/fire-keeper.agent.md` as the orchestrator's identity

### Option E: Validate the 6 New Packages

**Goal:** The orchestrator created 6 packages (`src/fire-keeper/`, `src/importance-unit/`, etc.) but they haven't been validated.

1. For each package: `cd src/<package> && npx tsc --noEmit`
2. Cross-reference implementation against its rispec
3. Write a validation report
4. Fix any TypeScript errors

---

## GitHub Copilot Agent Usage

When launching the next session in copilot-cli, reference the agents:

```
@fire-keeper orchestrate this session as ceremony
@indigenous-scholar deep-search on consent-as-relationship in software
@mcp-builder implement delete tools for all entity types
@direction-guide work in the South direction on planning the consent lifecycle tools
```

The agent definitions are at `.github/agents/*.agent.md`.

---

*Session 2604041906 is complete. All my relations 🌿*
