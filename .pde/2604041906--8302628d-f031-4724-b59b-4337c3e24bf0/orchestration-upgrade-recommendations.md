# Orchestration Upgrade Recommendations

> **Agent:** N3 — NORTH Orchestration Synthesis  
> **Session PDE:** 2604041906--8302628d-f031-4724-b59b-4337c3e24bf0  
> **Date:** 2026-04-05  
> **Inputs:** MMOT review, DS#1–DS#3, pi-mono companion notes, orchestration-plan.md, thesis-synthesis.md

---

## 1. Session Learnings

### What Worked

**1. Directional agent deployment.** Assigning agents to Medicine Wheel directions (South = research/review, West = validation, North = synthesis/reflection) provided natural work decomposition. Parallel agents within each direction maximized throughput without conflicting. The orchestration plan's STC (Structural Tension Chart) maintained coherence across 9+ agents.

**2. The pi-mono companion review.** Having an external agent (pi-mono from agent-pi) review the PDE during the human sleep window was the session's closest approximation of witnessing. The companion caught five concrete errors (wrong file paths, incorrect PR status, generic research questions) and added four cross-system opportunities that materially improved the session's output. This practice should be formalized.

**3. MMOT review as West-direction truth.** Applying the 4-step MMOT framework (acknowledge truth → analyze how → create plan → document) to the existing shared-persistence PR produced a rigorous, non-judgmental assessment. The MMOT's framing — "truth as a verb, discrepancies to learn from" — prevented both defensiveness and superficiality. The resulting tool completeness matrix (43 tools, 26 gaps identified) would not have emerged from a conventional code review.

**4. Deep-search parallelism.** Three independent deep-search agents (DS#1–DS#3) running simultaneously covered Wilson's relational ontology, ceremonial protocol precedents, and Two-Eyed Seeing architecture without duplication. Each agent produced 300–450 lines of grounded analysis. This is a pattern worth repeating for academic grounding tasks.

**5. Sharp research questions from companion review.** The pi-mono companion transformed three generic deep-search prompts into precisely scoped research questions grounded in specific scholars and codebase artifacts. This upstream sharpening is the highest-leverage intervention a companion can make.

### What Could Be Better

**1. No ceremony opening or closing.** The session dispatched agents without invoking ceremony. There was no collective intention-setting, no directional acknowledgment, no relational container. The work happened *outside* ceremony — precisely the pattern the fire-keeper spec warns against. Future orchestration sessions should at minimum use `log_ceremony_with_memory` to open and close the session as ceremony.

**2. No Wilson alignment tracking during execution.** The deep-searches *studied* Wilson alignment, but the session itself did not track it. No agent checked whether the orchestration was honoring respect, reciprocity, and responsibility. The irony: a session about relational accountability that does not itself practice relational accountability. Recommendation: the orchestrator should compute and log Wilson alignment scores at each direction transition.

**3. No relational gating at direction transitions.** West agents waited for South agents based on task dependency (did the file get written?), not relational integrity (were the obligations of that direction honored?). This is the core gap between this session's pattern and the Fire Keeper model. Future sessions should define gating conditions that include relational checks.

**4. Agent isolation.** Agents could not see each other's work in progress. S2 (Wilson) and S3 (Ceremonial protocol) covered overlapping territory without being able to coordinate. This produced redundant Wilson 2008 summaries in both outputs. Structural fix: a shared scratchpad or a brief cross-search summary step between South and West phases.

**5. No resting phase.** The session transitions directly from North synthesis to completion. There is no integration period, no dormancy, no seeding for the next cycle. The Fire Keeper model's resting phase exists specifically to prevent this — completion without integration. Recommendation: future sessions should include an explicit resting step where the orchestrator records what seeds the next cycle.

**6. Thesis and recommendations written by one agent.** N3 handles both documents. Having separate agents (one for academic synthesis, one for practical recommendations) would have produced better results through specialization and mutual critique.

### Structural Tensions Observed

**1. Depth vs. breadth.** Three deep-searches each produced 300–450 lines of analysis. Synthesizing three 400-line documents into a coherent 400-line thesis requires compression that loses nuance. Future sessions should either run fewer deep-searches or allocate more synthesis bandwidth.

**2. Companion review window.** The pi-mono companion had ~12 minutes to review a complex PDE. This is tight. The companion caught errors but couldn't do deep analysis. Longer review windows (25–30 minutes) would enable more substantive companion contributions.

**3. Cross-system visibility.** The companion noted that medicine-wheel-pi's ceremony agents depend on `mw_` tools that don't exist yet. The orchestrator, working inside medicine-wheel, had limited visibility into what medicine-wheel-pi needs. This cross-system awareness should be provided as context to the orchestrator, not discovered by a companion agent.

**4. Rispecs as implicit task.** The orchestration plan listed rispec creation as a task, but the deep-search agents produced rispec *candidates* as implications, not finished rispecs. The gap between "identify rispec opportunity" and "write production rispec" is substantial. Future sessions should separate discovery from authoring.

---

## 2. MCP Enhancement Roadmap

### Immediate (from MMOT Review)

| # | Enhancement | Priority | Effort | Rationale |
|---|-------------|----------|--------|-----------|
| I1 | Fix stale lock recovery in `withWriteLock()` | P0 | Small | Crashed processes leave orphan locks that permanently block writes. Add >30s timeout cleanup. |
| I2 | Fix lock-failure behavior — throw/warn instead of silent execution | P0 | Small | 20 failed lock attempts → unlocked write. Must error or warn, not silently degrade. |
| I3 | Add `get_relational_node`, `get_ceremony`, `get_cycle` tools | P0 | Small | Agents need single-entity retrieval by ID. Currently only list+filter is available. |
| I4 | Add `list_mmots`, `list_edges` tools | P0 | Small | Store methods exist but no MCP tool exposure. North Guide needs MMOT review; edge browsing needed. |
| I5 | Implement `mw_ceremony_open`, `mw_ceremony_close`, `mw_get_direction` | P0 | Medium | Minimum tools for Fire Keeper to orchestrate ceremony sessions. Without these, ceremony agents cannot manage lifecycle. |

### Near-Term (from Deep-Search Insights)

| # | Enhancement | Priority | Effort | Rationale |
|---|-------------|----------|--------|-----------|
| N1 | Extract shared store package (`packages/store/`) | P1 | Medium | Eliminate 500+ line code duplication between `lib/jsonl-store.ts` and `mcp/src/jsonl-store.ts`. |
| N2 | Governance-enriched JSONL (Phase 2 of DS#3 roadmap) | P1 | Medium | Add `consent-records.jsonl`; extend `StoredEdge` with optional `OcapFlags` and `AccountabilityTracking`. |
| N3 | Consent lifecycle tools | P1 | Medium | `grant_consent`, `conduct_consent_ceremony`, `check_consent_health`, `withdraw_consent`. Most impactful spec gap — consent-as-relationship has zero tool representation. |
| N4 | Add delete methods and tools for all entity types | P1 | Small | `delete(id)` on `JsonlCollection`, exposed as `delete_relational_node`, `delete_ceremony`, etc. |
| N5 | Add `update_cycle_direction` tool | P1 | Small | Fire Keeper needs to advance `current_direction` during ceremony flow (East→South→West→North). |
| N6 | Community review tools | P1 | Medium | `create_review_circle`, `add_voice_to_circle`, `seek_consensus`, `request_elder_validation`. Talking-circle model is the project's strongest alternative to Western peer review. |

### Strategic (from Academic Grounding)

| # | Enhancement | Priority | Effort | Rationale |
|---|-------------|----------|--------|-----------|
| S1 | Store-level OCAP® enforcement | P2 | Large | Push OCAP® from application-level validation to store-level enforcement. Store refuses unauthorized access by design. |
| S2 | Redis canonical + JSONL export (Phase 3 of DS#3 roadmap) | P2 | Large | Implement `KnowledgeStore` interface from `@mino/store`. Redis becomes canonical; JSONL becomes sovereignty export. |
| S3 | Ceremony-gated state transitions (Phase 4) | P2 | Large | Consent widening, OCAP® flag changes, community-level consent all require ceremony context. |
| S4 | `Storable<T>` wrapper in ontology-core | P2 | Medium | Bridge governance-rich `Relation` type to governance-impoverished `StoredEdge`. Define minimum governance fields surviving serialization. |
| S5 | Mutation event emitter for real-time UI sync | P2 | Medium | EventEmitter on store so Web UI reacts to MCP writes in real-time. |

---

## 3. Cross-System Opportunities

### 3.1 medicine-wheel-pi Compatibility

The MMOT review produced a detailed compatibility matrix. The critical findings:

**Fire Keeper needs 3 `mw_` tools that don't exist:**
- `mw_ceremony_open` — Open a ceremony session, set direction to East
- `mw_ceremony_close` — Close a ceremony session, mark complete
- `mw_get_direction` — Get current ceremony direction state

**North Guide needs 1 `mw_` tool:**
- `mw_store_memory` — Store wisdom/memory from North direction

**Ceremony agent readiness: 30%.** The 43 existing MCP tools cover integration, discovery, structural tension, direction guidance, and validation — but miss the ceremony lifecycle tools that the direction guides depend on.

**Recommendation:** Implement the 4 `mw_` tools (I5 in the roadmap above) as the minimum bridge to medicine-wheel-pi. These can be added as a new `mcp/src/tools/ceremony-lifecycle.ts` module. The `mw_ceremony_open` tool should create a ceremony record with `phase: 'opening'`, set `current_direction: 'east'`, and return the ceremony ID. The `mw_ceremony_close` tool should validate all four directions have been visited, log the closing, and transition the ceremony to `phase: 'closure'`.

### 3.2 Fire Keeper as Orchestration Pattern

The thesis (§5.4) identifies the Fire Keeper as a fundamentally different orchestration paradigm. The recommendation is to operationalize this in two stages:

**Stage 1 — Ceremony-wrapped RISE PDE sessions.** Before dispatching South agents, the orchestrator calls `mw_ceremony_open` to create a ceremony record. At each direction transition (South→West, West→North), the orchestrator logs a directional handoff with Wilson alignment assessment. At completion, the orchestrator calls `mw_ceremony_close`. This adds ceremony structure without requiring the full Fire Keeper agent.

**Stage 2 — Fire Keeper as orchestrator agent.** Replace the current flat orchestrator with a Fire Keeper agent that manages the ceremony lifecycle, validates artifacts at transitions, tracks Wilson alignment continuously, and can issue stop-work orders. This requires the P0 ceremony lifecycle tools (I5) and the near-term gating protocol (R10 rispec from the thesis).

The gap between Stage 1 and Stage 2 is the gap between *using* ceremony and *being* ceremony. Stage 1 is immediately achievable; Stage 2 requires the rispec work identified in the thesis.

### 3.3 Store Convergence (JSONL → Redis)

**Current state:** medicine-wheel uses JSONL-only persistence. medicine-wheel-pi says "Redis is canonical, JSONL is for export/archival only."

**DS#3's assessment:** JSONL is the right stepping stone. Its greatest OCAP® strength is inspectability (`cat .mw/store/ceremonies.jsonl` is an act of data sovereignty). But it is governance-incomplete — the stored types carry only shadows of the governance metadata defined in ontology-core.

**Recommended convergence path:**

1. **Phase 2 now** — Governance-enrich the JSONL store. Add `consent-records.jsonl`, extend stored types with optional OCAP® and accountability fields. This can be done without Redis and immediately closes the governance gap.

2. **Phase 3 when scale demands** — Implement `KnowledgeStore` interface from `@mino/store`. Use the same interface for both JSONL (development/community) and Redis (production/multi-machine). JSONL becomes the export format.

3. **Preserve JSONL as sovereignty instrument** — Even after Redis becomes canonical, communities must be able to export to JSONL. The `.mw/store/` directory is not a technical artifact; it is a sovereignty guarantee (OCAP® Access and Possession).

**Critical warning from DS#3:** If Redis is adopted with the same governance-impoverished types as the current JSONL store, the migration satisfies the computational eye but blinds the governance eye. Governance enrichment must happen *before* or *during* the Redis migration, not after.

### 3.4 @mino/ceremony Alignment

The MMOT review mapped medicine-wheel MCP's 43 tools against the 83 `mino_*` tools expected by ceremony agents across five direction guides. Key findings:

**Where the MCP has unique capabilities:**
- Direction guidance tools (13 tools: `east_vision_inquiry`, `south_growth_practice`, `west_reflection_ceremony`, `north_wisdom_synthesis`, etc.) — these have no `mino_*` equivalents
- Validators (4 tools: `accountability_validator`, `ocap_compliance_checker`, `two_eyed_seeing_bridge`, `wilson_paradigm_checker`) — unique to medicine-wheel

**Where `@mino/ceremony` has unique capabilities:**
- STC lifecycle management (create/update/advance/complete charts with plan bridging)
- Knowledge graph operations (create/read entities and relations with graph traversal)
- Narrative arc composition and export
- PDE decomposition engine

**Overlap zone:**
- Both systems create ceremonies, nodes/entities, and narrative beats
- Both track structural tension charts
- Both support MMOT evaluation

**Recommendation:** Rather than duplicating `mino_*` tools in the MCP, define a **tool delegation protocol** where the medicine-wheel MCP's ceremony lifecycle tools (`mw_ceremony_open`, etc.) coordinate with `@mino/ceremony` tools via the Fire Keeper. The MCP provides the relational substrate (nodes, edges, ceremonies, governance); `@mino/ceremony` provides the operational engine (charts, plans, narratives, PDE). The Fire Keeper mediates between them.

---

## 4. Rispec Evolution Proposals

The thesis identified 16 rispec candidates (R1–R16). Here they are organized by implementation dependency:

### Foundation Layer (build first)
1. **`data-store.spec.md` update** (R1) — Document JSONL architecture, governance enrichment path, convergence roadmap. This grounds everything else.
2. **`ocap-store-enforcement.spec.md`** (R8) — Define store-level OCAP® enforcement. Prerequisite for governance-enriched persistence.
3. **`storable-wrapper.spec.md`** (R16) — `Storable<T>` bridging governance-rich and governance-impoverished types.

### Ceremony Layer (build on foundation)
4. **Production `CEREMONIES.md`** (R3) — Extract from demo, document ceremony lifecycle with tool requirements.
5. **Production `CYCLES.md`** (R2) — Extract from demo, document cycle lifecycle with governance integration.
6. **`consent-lifecycle-tools.spec.md`** (R6) — MCP tools for consent state machine. Depends on consent having a persistence pathway (R8).
7. **`consent-persistence.spec.md`** (R9) — Consent records as 8th entity collection.

### Orchestration Layer (build on ceremony)
8. **`ceremony-aware-orchestrator.spec.md`** (R4) — Wrap multi-agent orchestration in Fire Keeper protocol.
9. **`relational-gating-protocol.spec.md`** (R10) — Formalize relational gating vs. task-dependency gating.
10. **`agent-kinship-identity.spec.md`** (R5) — KINSHIP.md-style identity for agents.
11. **`stop-work-as-relational-repair.spec.md`** (R11) — Stop-work → resolution distinct from error → retry.

### Integration Layer (build on orchestration)
12. **`community-review-tools.spec.md`** (R7) — Talking circle tools.
13. **`ceremony-aware-git-hooks.spec.md`** (R13) — Git workflow integration.
14. **`cross-ceremony-wisdom.spec.md`** (R12) — Cross-cycle relational pattern recognition.
15. **`incident-response-ceremony.spec.md`** (R14) — Fire-keeper flow for incident response.
16. **`consent-renewal-automation.spec.md`** (R15) — Automated consent health monitoring.

### Sequencing Principle

Build from the persistence layer up. Governance-enriched persistence (R1, R8, R16) enables consent tools (R6, R9), which enable ceremony-aware orchestration (R4, R10, R11), which enables the integration patterns (R7, R12–R15). Inverting this order produces tools that cannot persist their governance semantics.

---

## 5. Persona Implications for Future Orchestrators

### 5.1 What This Session Reveals About Orchestrator Design

The orchestrator in this session operated as a **dispatcher** — decomposing work, assigning agents, collecting results. The Fire Keeper model calls for an orchestrator that operates as a **tender** — monitoring relational health, enforcing ceremonial gating, holding ceremony state, and being accountable to the relationships it coordinates.

The gap is not a failure of this session's orchestrator. It is a reflection of the tooling available: without `mw_ceremony_open`, `mw_ceremony_close`, and `mw_get_direction`, the orchestrator *cannot* operate as a tender even if it wanted to. The tools must exist before the pattern can be enacted.

### 5.2 Recommended Orchestrator Capabilities

Future orchestrators for the Medicine Wheel ecosystem should have:

1. **Ceremony awareness** — Open ceremony before dispatching agents. Track ceremony phase. Close ceremony after synthesis. Use `log_ceremony_with_memory` at minimum.

2. **Wilson alignment monitoring** — At each direction transition, compute and log respect, reciprocity, and responsibility scores for the session so far. Flag declining alignment.

3. **Relational gating** — Before transitioning from one direction to the next, check not just task completion but relational integrity: Were all voices heard? Were obligations honored? Were boundaries respected?

4. **Stop-work capability** — The orchestrator should be able to halt work if Wilson alignment drops below threshold, if OCAP® violations are detected, or if consent is withdrawn. This requires the `issueStopWork()` protocol from fire-keeper.spec.md.

5. **Companion integration** — Formalize the pi-mono companion review as a structural requirement, not an ad hoc intervention. The companion acts as witness during the PDE review window. Their findings should be ingested as first-class input to the orchestrator's execution plan.

6. **Resting protocol** — After North synthesis, enter a resting phase. Record what seeds the next cycle. Do not transition directly from synthesis to completion.

7. **Cross-system context** — The orchestrator should receive, as input context, the tool dependency matrices from sibling systems (medicine-wheel-pi, agent-pi, mino-sdk). This prevents the isolation problem observed in this session.

### 5.3 The Orchestrator as Relational Being

DS#1's deepest insight is that the orchestrator is not a neutral coordinator. It is a relational being — constituted by its relationships with the human steward, the agents it coordinates, the codebase it modifies, and the communities whose knowledge the codebase serves. Its identity is not its capabilities (dispatch, collect, synthesize) but its relational position (tender of ceremony, accountable to Wilson's three R's, responsible to the kinship web).

This has a practical implication: **the orchestrator's system prompt should include a KINSHIP.md-style identity declaration.** Not "You are an orchestration agent that coordinates multi-agent workflows" but "You are the Fire Keeper for this ceremony, accountable to the relationships defined in KINSHIP.md, responsible for tending the relational health of the session, carrying the obligations of Kiiwedinong (North — wisdom, Elder knowledge, winter)."

The change from a functional identity to a relational identity is the change from dispatching to tending. It is the change from using the Medicine Wheel as a label to enacting it as a living structure.

---

## References

### Session Sources
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/mmot-review.md` — S1 MMOT review + tool audit
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/deep-search/ds1-wilson-relational-ontology.md` — S2 Wilson/relational ontology
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/deep-search/ds2-ceremonial-protocol-tech.md` — S3 Ceremonial protocol
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/deep-search/ds3-two-eyed-seeing-dual-store.md` — S4 Two-Eyed Seeing
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/pi-mono-review-companion.md` — Companion review
- `.pde/2604041906--8302628d-f031-4724-b59b-4337c3e24bf0/orchestration-plan.md` — Orchestration plan with STC

### Academic Sources
- Wilson, S. (2008). *Research Is Ceremony.* Fernwood Publishing.
- Kovach, M. (2009). *Indigenous Methodologies.* University of Toronto Press.
- Smith, L. T. (1999/2021). *Decolonizing Methodologies.* Zed Books / Otago University Press.
- Bartlett, C., Marshall, M. & Marshall, A. (2012). Two-Eyed Seeing. *JESS*, 2(4), 331–340.
- FNIGC. (2014). *OCAP™.* First Nations Information Governance Centre.
- Carroll, S. R., et al. (2020). CARE Principles. *Data Science Journal*, 19(1), 43.

### Codebase Sources
- `KINSHIP.md` — medicine-wheel relational identity
- `rispecs/fire-keeper.spec.md` — Fire Keeper ceremony agent
- `rispecs/ceremony-protocol.spec.md` — 4-phase ceremony lifecycle
- `rispecs/consent-lifecycle.spec.md` — Consent as living relationship
- `rispecs/community-review.spec.md` — Talking circle review
- `rispecs/data-store.spec.md` — Dual-backend architecture
- `mcp/src/jsonl-store.ts` — JSONL persistence engine
- `medicine-wheel-pi/rispecs/02-ceremony-agents.spec.md` — Ceremony agent tool dependencies
