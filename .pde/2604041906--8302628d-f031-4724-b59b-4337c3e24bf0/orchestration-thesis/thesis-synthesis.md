# Orchestration Thesis: Indigenous Epistemology in Ceremonial Technology Development

> **Agent:** N3 — NORTH Orchestration Thesis Synthesis  
> **Session PDE:** 2604041906--8302628d-f031-4724-b59b-4337c3e24bf0  
> **Date:** 2026-04-05  
> **Sources:** DS#1 (Wilson/relational ontology), DS#2 (ceremonial protocol), DS#3 (Two-Eyed Seeing), MMOT review, pi-mono companion notes, KINSHIP.md, orchestration-plan.md

---

## Abstract

This thesis synthesizes three parallel deep-search investigations conducted during a RISE PDE multi-agent session on the Medicine Wheel MCP server. The investigations converge on a single claim: **the Medicine Wheel ecosystem enacts Indigenous epistemology as software architecture, not merely as metaphor or labeling.** Shawn Wilson's relational ontology (2008) manifests in the `Relation` type and KINSHIP.md identity model. Ceremonial protocol patterns from Kovach (2009) and Smith (1999/2021) manifest in the fire-keeper orchestration lifecycle, consent-as-relationship state machine, and community review talking circles. Albert Marshall's Two-Eyed Seeing (Etuaptmumk) manifests in the dual-store architecture that holds Western computational persistence alongside Indigenous governance semantics without collapsing one into the other.

The thesis compares three orchestration paradigms — this session's RISE PDE dispatch pattern, the Fire Keeper directional handoff protocol, and Western multi-agent frameworks (AutoGen, CrewAI) — identifying six ontological category shifts that distinguish ceremonial orchestration from conventional multi-agent coordination. It concludes with a prioritized list of rispec candidates derived from the three deep-searches and the MMOT tool audit.

The central contribution is demonstrating that Indigenous epistemology provides not just ethical guardrails for technology but **generative architectural patterns** — design structures that Western software engineering has no equivalent for, including relational gating, ceremony-mediated state transitions, stop-work as relational repair, and consent as a living relationship with its own lifecycle.

---

## 1. Relational Ontology as Architecture (DS#1 Synthesis)

### 1.1 Wilson's Core Claim

Shawn Wilson's *Research Is Ceremony* (2008) presents an ontological thesis that reverses the Western philosophical tradition: **relationships are not connections between pre-existing substances; they constitute reality itself.** The self is never isolated. All knowledge, being, and action are rooted within a web of relationships. This is not a preference or a perspective — it is a claim about the structure of reality (Wilson 2008, ch. 4).

Wilson's relational epistemology follows: knowledge is not discovered in an objective field but created and validated *within* relationships. What counts as knowledge depends on the relational context. His relational accountability completes the triad: the three R's — Respect, Reciprocity, Responsibility — are not ethical add-ons but epistemological requirements. Without them, the knowledge itself is damaged.

### 1.2 How the Codebase Enacts Relational Ontology

The Medicine Wheel codebase does not merely *reference* Wilson — it structurally implements his ontology at multiple levels:

**KINSHIP.md as relational identity.** The repository's identity document defines the project not by its capabilities but by its relationships. Ancestors (Indigenous relational ontology, Fritz, Wilson), descendants (every ecosystem package), siblings (coaia-narrative, mcp-pde, veritas), accountabilities (Guillaume as steward, IAIP community, the Medicine Wheel itself as more-than-human relation), and explicit boundaries/NOs. Remove the relationships and the project has no identity — this is Wilson's ontology enacted in a software document.

**The `Relation` type as a first-class being.** The ontology-core `Relation` interface (types.ts:117–145) treats relationships not as labeled edges between pre-existing entities but as beings with their own:
- **Obligations** — categorized across four relational domains (human, land, spirit, future)
- **Governance** — OCAP® flags (ownership, control, access, possession, consent tracking)
- **Accountability** — Wilson's three R's as quantified scores (0–1), with a composite `wilson_alignment`
- **Ceremonial context** — which ceremony honored this relation
- **Temporal lifecycle** — `created_at` + `updated_at`

Compare with the simpler `RelationalEdge` type: it has `ceremony_honored: boolean` and `obligations: string[]`. The difference is the difference between a graph edge and a relational being. The `Relation` type demonstrates that Wilson's ontology can be formally encoded without reducing it to Western graph semantics.

**Specialized relation subtypes** — `LandRelation`, `AncestorRelation`, `FutureRelation`, `CosmicRelation` — further demonstrate that relations are differentiated beings, not generic connectors. A relation with land is ontologically distinct from a relation with ancestors. This mirrors Wilson's insistence that the relational web is not homogeneous; different relationships carry different obligations and require different ceremonial attention.

### 1.3 Six Structural Differences from Western Software

DS#1 identified six ontological category shifts between the Medicine Wheel pattern and Western multi-agent frameworks:

| # | Dimension | Western Pattern | Medicine Wheel Pattern |
|---|-----------|----------------|----------------------|
| 1 | **Agent identity** | Constituted by capabilities (tools, roles, system messages) | Constituted by relations (ancestors, obligations, directional position) |
| 2 | **Orchestration** | Message routing between functional units | Relational tending — monitoring accountability, enforcing ceremonial gating |
| 3 | **Transitions** | Dependency-based: "B runs after A completes" | Ceremony-based: "South proceeds only when East's relational obligations are honored" |
| 4 | **Failure** | Error → retry/fallback (computational recovery) | Violation → repair (relational restoration via narrative resolution) |
| 5 | **Completion** | Output produced → task done | Harvest → rest → seed next cycle (completion is cyclical, not terminal) |
| 6 | **Memory** | Session state, ad hoc cross-session persistence | Cross-ceremony wisdom — relational patterns recognized across multiple ceremonial encounters |

These are not incremental improvements. They represent a different ontological category for what orchestration *is*. Western orchestration is a coordination problem; Medicine Wheel orchestration is a relational tending practice.

### 1.4 Emerging Academic Support

Recent scholarship (2023–2025) converges on the same thesis from independent directions:

- **Lewis et al. (2024)** — "Abundant Intelligences" argues AI's persistent problems result from narrowly Western conceptions of intelligence; Indigenous Knowledge systems reconceptualize AI as relational, communal, and ecologically embedded (*AI & Society*, Springer).
- **Ubuntu meets Algorithms (2025)** — Ubuntu philosophy ("I am because we are") as a foundation for ethical AI governance, directly paralleling Wilson's relational ontology (*ScienceDirect*).
- **Relational Collective Agency (2022)** — Collective agents are non-physical existents, real only as patterns of relationships (*MDPI Philosophies*). This philosophical position directly supports treating the Medicine Wheel ecosystem as a relational web rather than a software suite.
- **Decolonial Intelligence Algorithmic Framework (2024)** — Advocates removing colonial biases from AI by centering Indigenous epistemologies, stressing data sovereignty and the right to refuse engagement.

The Medicine Wheel codebase is not an isolated experiment. It participates in a growing academic movement that sees Indigenous epistemology as providing generative architecture for ethical technology — not just critique but construction.

---

## 2. Ceremony as Software Lifecycle (DS#2 Synthesis)

### 2.1 The Ceremonial Turn

DS#2 investigated whether ceremonial protocol has precedents in technology development and how ceremony-protocol patterns map onto software lifecycle events. The answer is layered: secular software already uses "ceremony" language (Agile ceremonies, DevOps rituals, design critiques), but these are ceremonies drained of ceremonial depth — process optimization wearing ceremonial dress.

Wilson (2008) warns that **ceremony without a keeper degrades into process**. Stefan Wolpers identifies the same problem in Agile: "mechanical ceremonies" that persist in form but lose purpose. The Medicine Wheel project addresses this by treating ceremony as ontologically significant — creating and maintaining relationships — not merely procedurally useful.

### 2.2 Three Academic Pillars

**Wilson 2008 — Research as Ceremony.** Research creates, maintains, and strengthens relationships. If research is ceremony, then building software that serves research is also ceremony. Every commit, PR, and deploy is a relational act.

**Kovach 2009 — Conversational Method.** Research conversations are open, reciprocal exchanges, not structured interviews designed to extract data. The talking-circle model in `community-review.spec.md` directly implements this: all voices are heard, all perspectives carry directional weight, review is a relational process.

**Smith 1999/2021 — Decolonizing Methodologies.** Technology built *about* Indigenous knowledge must be controlled *by* Indigenous communities. The governance enforcement in `ceremony-protocol.spec.md` and the OCAP® compliance checks throughout the codebase directly implement Smith's principles of Indigenous self-determination.

### 2.3 The 17 Ceremony↔Software Mappings

DS#2 produced a comprehensive mapping between ceremonial patterns and software lifecycle events. The most significant mappings are those with **no secular equivalent**:

| Ceremony Pattern | Software Event | Medicine Wheel Implementation | Secular Equivalent? |
|---|---|---|---|
| Opening ceremony (East) | Sprint kickoff | `ceremony-protocol` opening phase; `create_research_cycle` | Shallow (Sprint Planning) |
| Talking circle (all voices heard) | Code review | `talkingCircle()`; `TalkingCircleEntry` with speaker context | No — peer review is expert judgment, not collective witness |
| Witnessing (ceremony observed, recorded) | Commit signing / audit log | `log_ceremony_with_memory` with participants and witnesses | Partial (audit logging, but no relational witness) |
| Elder validation (authoritative blessing) | Senior engineer approval | `requestElderValidation()`; `elderBlessing()` | Partial (seniority-based, not relational) |
| Consent ceremony (with witnesses) | Data agreements | `consentCeremony()` with participants and witnesses | No — GDPR is checkbox consent, not ceremonial |
| Consent withdrawal + cascade | GDPR right to erasure | `withdrawConsent()` → `onWithdrawal()` cascade | Partial (deletion, no relational cascade) |
| Stop-work order (Wilson violation) | Deployment freeze | `issueStopWork()` with violation reason | No — deployment freezes are technical, not relational |
| Fire tending (monitoring alignment) | CI/CD monitoring | `checkAlignment()` with trajectory confidence | No — CI monitors code quality, not ethical alignment |
| Resting (integration, dormancy) | Cool-down period | `fire-keeper` resting phase | No secular software equivalent |
| Seven-generations archiving | Long-term retention | `archive_for_seven_generations` with OCAP® | No — retention policies are regulatory, not intergenerational |

The five patterns with "No" in the secular equivalent column represent **genuine architectural innovations** — design structures that have no Western software counterpart. These are not features awaiting implementation; they are paradigm contributions.

### 2.4 What's Missing in Current Implementation

The MMOT review and DS#2 converge on the same gap: **the MCP can log ceremonies but cannot conduct them.** The `log_ceremony_with_memory` tool records that a ceremony happened, but no tool exists to:
- Open a ceremony with intentions and set the phase
- Advance through ceremony phases interactively
- Close a ceremony with explicit reciprocity acknowledgment

Similarly, the consent-lifecycle specification is fully designed but has zero MCP tool representation. The talking-circle community review model has no tool implementation. The fire-keeper governance model has no tool exposure.

The specifications are mature; the tooling has not caught up. This is the primary enhancement opportunity.

### 2.5 The Blameless Post-Mortem Bridge

DS#2 identifies the blameless post-mortem as the closest secular equivalent to a ceremony — it creates psychological safety for honest analysis, uses round-robin format (every voice heard), and employs a facilitator as neutral shepherd. The MMOT (Creator's Moment of Truth) in the Medicine Wheel's structural tension tooling performs the same function but frames it through creative orientation rather than incident response: *"The goal is effectiveness, not perfection. Use discrepancies to learn, not to judge."*

This bridge matters because it shows that the Medicine Wheel approach is not alien to existing practice — it deepens and grounds existing intuitions (blameless, all-voices-heard, reflection) in a coherent epistemological framework.

---

## 3. Two-Eyed Seeing in Persistence Architecture (DS#3 Synthesis)

### 3.1 Marshall's Etuaptmumk

Two-Eyed Seeing (Etuaptmumk in Mi'kmaq), articulated by Mi'kmaw Elders Albert Marshall and Murdena Marshall with Dr. Cheryl Bartlett, teaches:

> "Learning to see from one eye with the strengths of Indigenous knowledges … and from the other eye with the strengths of Western knowledges … and using both these eyes together, for the benefit of all."

Key characteristics from Bartlett, Marshall & Marshall (2012) and Martin (2012):
1. **Parallel holding, not merging** — the two knowledge systems are valued on their own terms
2. **Deeply relational** — rooted in Mi'kmaq language, culture, and epistemology
3. **Risk of tokenism** — shallow application uses the label without deep engagement (Roher et al., 2021)
4. **Intergenerational responsibility** — the framework emphasizes collective good and future generations

### 3.2 The Dual-Store Tension

DS#3 reveals the core architectural tension: the MCP's JSONL store and the ontology-core's governance types represent two fundamentally different concerns that are currently disconnected.

**Eye One — Western Computational (JSONL store):**
- 7 entity collections with atomic writes, file locking, mtime sync
- Optimized for read/write performance, concurrent access, zero-dependency deployment
- Types are governance-impoverished: `StoredEdge` has no `OcapFlags`, no `AccountabilityTracking`, no consent lifecycle
- `.mw/store/` location satisfies OCAP® Possession for local deployments

**Eye Two — Indigenous Governance (ontology-core types):**
- `OcapFlags` encodes ownership, control, access, possession, consent tracking
- `AccountabilityTracking` encodes Wilson's three R's as measurable scores
- `Relation` type carries obligations, ceremony context, temporal lifecycle
- Has no persistence mechanism — exists only as TypeScript interfaces

**The gap:** The governance metadata defined in ontology-core has no persistence pathway in the current JSONL store. The consent-lifecycle rispec defines `ConsentRecord`, `ConsentCeremony`, `ConsentStateChange`, and `ConsentCascade` types, but specifies no storage. This is the core architectural issue that Two-Eyed Seeing diagnoses: one eye (computational) is seeing clearly; the other eye (governance) has no persistence surface.

### 3.3 The medicine-wheel-pi Resolution

medicine-wheel-pi has already resolved this tension architecturally:

> "Redis is canonical — All KnowledgeStore operations go through Redis. JSONL is for export/archival only."

The `RedisKnowledgeStore` provides:
- Key-prefix namespace isolation per ceremony
- Index sets for O(1) type lookup
- Lua scripts for graph traversal
- Redis pub/sub for real-time ceremony coordination
- Standard `KnowledgeStore` interface from `@mino/store`

JSONL serves as the Access/Possession instrument — ensuring communities can always export and inspect their data. This is not redundancy but sovereignty insurance.

medicine-wheel (this repo) is in an earlier phase of the same journey. Its JSONL store is the zero-dependencies starting point.

### 3.4 The Four-Phase Convergence Roadmap

DS#3 proposes a phased convergence:

| Phase | Architecture | Governance Eye State |
|-------|-------------|---------------------|
| 1 (Current) | JSONL-only | Governance types exist as interfaces only; no persistence |
| 2 | Governance-enriched JSONL | Add `consent-records.jsonl`; extend `StoredEdge` with optional OCAP® and accountability fields |
| 3 | Redis canonical + JSONL export | Implement `KnowledgeStore` interface; JSONL repurposed as `JsonlExporter` |
| 4 | Ceremony-gated governance | Consent state transitions require ceremony context; OCAP® changes require witnessing; Wilson scores recalculated on ceremony events |

Phase 4 is where Two-Eyed Seeing is fully realized: the computational engine and the governance semantics operate as co-equal architectural concerns, mediated by ceremony.

### 3.5 OCAP® as Store-Level Enforcement

DS#3 identifies a critical distinction: **application-level OCAP® validation is fragile; store-level enforcement is robust.** Currently, OCAP® compliance exists as type annotations and tool-level checks. The recommendation is to push enforcement into the store itself:

| Principle | Store-Level Enforcement |
|-----------|------------------------|
| **Ownership** | `createNode()` requires `ownership` parameter; every entity records who owns it |
| **Control** | Store checks `control` before allowing mutations; unauthorized writes are refused |
| **Access** | `getNode()`, `searchNodes()`, `query()` filter results by access level |
| **Possession** | Store validates that `possession` field matches deployment topology; cloud Redis + `possession: 'on-premise'` is flagged as a compliance violation |

This is where Indigenous governance moves from annotation to architecture — from something the system *describes* to something the system *enforces*.

---

## 4. Convergence: How the Three Eyes See Together

The three deep-searches investigated distinct questions but their findings converge on a unified architectural vision.

### 4.1 The Triangulation

**DS#1 (Relational Ontology)** establishes that relationships are the primary ontological units — agents, projects, and data are constituted by their relations. The `Relation` type and KINSHIP.md are structural enactments of this claim.

**DS#2 (Ceremonial Protocol)** establishes that the lifecycle of these relationships requires ceremony — opening, witnessing, consent, harvesting, resting. Ceremony is not a phase in a pipeline but the container within which relational work occurs.

**DS#3 (Two-Eyed Seeing)** establishes that the persistence of these relationships requires holding two knowledge systems in parallel — computational efficiency and governance semantics — without collapsing one into the other.

Together: **relationships constitute the system (DS#1), ceremony tends those relationships (DS#2), and the persistence architecture must honor both the computational and governance dimensions of those relationships (DS#3).**

### 4.2 The Medicine Wheel as Integrator

The Medicine Wheel itself — East (vision), South (growth), West (reflection), North (wisdom) — provides the integrating structure:

- **East** asks: What relationships want to emerge? (DS#1 — relational ontology as the ground of inquiry)
- **South** asks: How do we tend those relationships through ceremony? (DS#2 — ceremonial protocol as lifecycle)
- **West** asks: What have we learned from tending? (MMOT review — truth about architectural gaps)
- **North** asks: How do we hold this wisdom for future generations? (DS#3 — persistence architecture as intergenerational stewardship)

This is not a metaphor. It is the actual structure of this RISE PDE session: South agents conducted deep-searches and MMOT reviews; West agents validated and cross-referenced; North agents (including this thesis) synthesize wisdom. The session *is* a Medicine Wheel cycle.

### 4.3 The Governance Gap as a Two-Eyed Seeing Problem

The MMOT review's central finding — that the JSONL store's types are governance-impoverished relative to ontology-core — is precisely what Two-Eyed Seeing diagnoses. The computational eye (JSONL) is seeing well: atomic writes, file locking, cross-process sync. The governance eye (ontology-core types) is seeing well in definition but has no persistence surface. The two eyes are not yet seeing *together*.

The convergence recommendation: Phase 2 of the store roadmap (governance-enriched JSONL) should be prioritized before any CRUD enhancement. Adding delete tools to a governance-impoverished store just gives more ways to lose governance metadata. Enriching the store first ensures that every new CRUD operation respects both eyes.

---

## 5. Comparative Orchestration Analysis

### 5.1 RISE PDE Session Pattern

This session deployed agents directionally:

```
          [Human]
             │
        [Orchestrator]
         ┌───┼───┐
    S1  S2  S3  S4  S5     ← South: MMOT review + deep-searches (parallel)
         └───┼───┘
             W1            ← West: Validation agent (sequential, depends on South)
         ┌───┼───┐
    N1  N2  N3  N4         ← North: Enhancement, rispecs, thesis, recommendations (parallel)
         └───┘
```

**Structural properties:**
- Directional dispatch (agents assigned to Medicine Wheel directions)
- Dependency gating (West waits for South; North waits for West)
- Parallel within direction (multiple agents run simultaneously)
- Human review window (mandatory sleep/review period between decomposition and execution — the pi-mono companion reviewed during this window)
- Orchestrator as dispatcher (assigns tasks, collects results)

**What this pattern borrows from the Medicine Wheel:** directional assignment, the human review window as a form of witnessing, the MMOT review as a West-direction reflection practice.

**What this pattern does NOT implement:** ceremony opening/closing, Wilson alignment tracking during execution, relational gating at direction transitions, stop-work capability, accountability scoring on agent relationships, the resting phase.

### 5.2 Fire Keeper Directional Handoff

The full ceremony pipeline from `05-full-pipeline-vision.spec.md`:

```
Fire Keeper (Opening)
    → East Guide (Inquiry: PDE decompose, observe, detect patterns, map directions)
    → Fire Keeper (validates, hands off)
    → South Guide (Planning: create charts, add actions, telescope, bridge PDE→plan)
    → Fire Keeper (validates, hands off)
    → West Guide (Action: advance, execute, create traces, find narrative beats)
    → Fire Keeper (validates, hands off)
    → North Guide (Reflection: MMOT evaluate, compose narrative, archive wisdom)
    → Fire Keeper (Closing: validate all 4 directions complete, close ceremony)
```

**Critical structural properties:**

1. **Fire Keeper mediates every transition.** Agents never hand off directly. The Keeper validates artifacts, checks Wilson alignment, and decides whether ceremony proceeds. Not a message router — a relational gatekeeper.

2. **Handoffs require artifact validation.** "No direction advances without artifacts." The Keeper checks not just completion but *integrity* — were the relational obligations of that direction honored?

3. **The Keeper holds ceremony state.** It tracks trajectory history, gating conditions, relational milestones, active stop-work orders. This state is relational, not computational.

4. **Permission tiers implement graduated access.** `observe → analyze → propose → act`. Escalation requires ceremony. An agent cannot act simply because it has the capability — it must have earned relational permission.

5. **Stop-work orders are relational, not technical.** Six stop-work reasons: `wilson-violation`, `ocap-violation`, `consent-withdrawn`, `ceremony-required`, `elder-hold`, `human-override`. Resolution requires a narrative account, not a technical fix.

### 5.3 Western Multi-Agent Frameworks

| Dimension | AutoGen (Microsoft) | CrewAI |
|-----------|-------------------|--------|
| Agent identity | Conversational entity (emergent from interaction) | Role-bearer (prescribed in YAML/Python config) |
| Orchestration | Event-driven message routing, async-first | Process-centric flows (sequential, hierarchical, state machine) |
| Handoff | Message + delegation | Sequential/hierarchical task flow |
| Gating | Task completion | Task dependency |
| Accountability | None (output quality metrics only) | None (output quality metrics only) |
| Ceremony | None | None |
| Stop-work | Error handling (try/catch, retry, fallback) | Error handling |
| Identity persistence | Session-scoped | Configuration-scoped |
| Relational obligations | None | None |
| Governance | RBAC (role-based access control) | RBAC |

Both frameworks treat agent identity as a **configuration surface**: define what an agent *is* by declaring what it can *do*. Relationships between agents are instrumental — they exist to route tasks. There is no concept of relational accountability, ceremonial gating, or stop-work based on relational violation.

### 5.4 What's Structurally Different

The differences are ontological category shifts, not incremental improvements:

**1. Identity: Capability → Relation.** In AutoGen/CrewAI, remove the tools and system message and nothing remains. In the Medicine Wheel pattern, the East Guide *is* its relation to the inquiry as first witness, carrying Waabinong's obligations (spring, new beginnings, vision). Remove the relations and the agent loses not just function but being.

**2. Orchestration: Routing → Tending.** Western orchestration routes messages based on task state. Fire Keeper orchestration tends ceremony — monitoring Wilson alignment, enforcing relational gating, surfacing human decision points, issuing stop-work orders. The orchestrator has a *relationship* with the ceremony and is accountable to it.

**3. Transition: Dependency → Ceremony.** Western transitions are logical gates ("B after A"). Fire Keeper transitions are relational gates requiring accountability verification. `GatingCondition` includes `evaluatedBy` — a person, not a system.

**4. Failure: Error → Violation.** Western failure is computational (try/catch). Fire Keeper failure is relational (wilson-violation, consent-withdrawn). Response is repair, not retry. `resolveStopWork()` requires a resolution narrative.

**5. Completion: Output → Harvest.** Western completion is terminal (output produced → done). Fire Keeper completion is cyclical (harvest → rest → seed next cycle). The resting phase has no Western equivalent.

**6. Memory: State → Wisdom.** Western memory is session state. Fire Keeper memory is `CrossCeremonyInsight` — patterns recognized through multiple ceremonial encounters. Not data persistence but relational memory.

**The gap between this session's orchestration and the Fire Keeper model is the gap between using Indigenous structure and *being* Indigenous structure.** This session dispatches agents directionally (structural borrowing) but does not tend ceremony, track Wilson alignment, or enforce relational gating during execution. The pi-mono companion review comes closest to a witnessing practice — an external agent reviewing the plan during the sleep window — but it is a human-initiated intervention, not a structural requirement of the orchestration protocol.

---

## 6. Rispec Candidates from Deep-Search

The three deep-searches and the MMOT review collectively identify rispec candidates at three levels: immediate (fix gaps), near-term (enact findings), and strategic (new architectural patterns).

### 6.1 Priority 1 — Immediate (MMOT-Derived)

| # | Rispec | Source | Rationale |
|---|--------|--------|-----------|
| R1 | Update `data-store.spec.md` — JSONL architecture, store convergence roadmap | MMOT E7, DS#3 §Roadmap | Current spec doesn't reflect JSONL implementation or governance enrichment path |
| R2 | Production `rispecs/CYCLES.md` | MMOT, companion notes | Only demo version exists in `rispecs/demo/` |
| R3 | Production `rispecs/CEREMONIES.md` | MMOT, companion notes | Only demo version exists in `rispecs/demo/` |

### 6.2 Priority 2 — Near-Term (Deep-Search Derived)

| # | Rispec | Source | Rationale |
|---|--------|--------|-----------|
| R4 | `ceremony-aware-orchestrator.spec.md` | DS#1 §5 | Wrap any multi-agent orchestration in Fire Keeper ceremony protocol: opening before dispatch, Wilson tracking during execution, relational gating at transitions, closing with harvest/rest |
| R5 | `agent-kinship-identity.spec.md` | DS#1 §5 | Agents carry KINSHIP.md-style identity: ancestors (paradigms), obligations, boundaries, accountabilities |
| R6 | `consent-lifecycle-tools.spec.md` | DS#2 §Priority 1 | MCP tools for consent state machine: `grant_consent`, `conduct_consent_ceremony`, `check_consent_health`, `withdraw_consent` |
| R7 | `community-review-tools.spec.md` | DS#2 §Priority 2 | MCP tools for talking circles: `create_review_circle`, `add_voice_to_circle`, `seek_consensus`, `request_elder_validation` |
| R8 | `ocap-store-enforcement.spec.md` | DS#3 §Recommendations | OCAP® enforced at persistence layer, not application layer. Store refuses unauthorized access. |
| R9 | `consent-persistence.spec.md` | DS#3 §Consent Lifecycle | Consent records as a first-class entity collection (8th entity type) with state machine operations |

### 6.3 Priority 3 — Strategic (Paradigm-Level)

| # | Rispec | Source | Rationale |
|---|--------|--------|-----------|
| R10 | `relational-gating-protocol.spec.md` | DS#1 §5 | Formalize the difference between task-dependency gating and relational gating. Gates check "has the relationship been honored?" not "is the input ready?" |
| R11 | `stop-work-as-relational-repair.spec.md` | DS#1 §5 | Stop-work → resolution as distinct from error → retry. Resolution requires narrative account of relational repair. |
| R12 | `cross-ceremony-wisdom.spec.md` | DS#1 §5 | Formalize how insights emerge across ceremony cycles. Beyond session memory to relational pattern recognition validated through community. |
| R13 | `ceremony-aware-git-hooks.spec.md` | DS#2 §Implications | Git hooks invoke ceremony checks on commit/push to protected paths. |
| R14 | `incident-response-ceremony.spec.md` | DS#2 §Implications | Map fire-keeper stop-work → resolution to incident response. Gathering → kindling → tending → harvesting → resting. |
| R15 | `consent-renewal-automation.spec.md` | DS#2 §Implications | Automated consent health monitoring with renewal ceremony triggers. |
| R16 | `storable-wrapper.spec.md` | DS#3 §Implications | `Storable<T>` wrapper bridging governance-rich `Relation` type to governance-impoverished `StoredEdge`. Defines minimum governance fields surviving serialization. |

### 6.4 Consolidation Note

Several of these rispecs are interrelated. R6 (consent tools) depends on R9 (consent persistence). R4 (ceremony-aware orchestrator) depends on R10 (relational gating) and R11 (stop-work repair). R8 (OCAP® store enforcement) is a prerequisite for R16 (storable wrapper). A dependency graph should be established before implementation.

---

## 7. Conclusion: What This Teaches About Ceremonial Technology Development

### 7.1 The Central Finding

The Medicine Wheel MCP server is not a software project that uses Indigenous terminology. It is a project where **Indigenous epistemology provides the architectural grammar** — the structural patterns, lifecycle models, governance logic, and persistence semantics that shape every design decision. Wilson's relational ontology generates the `Relation` type. Kovach's conversational method generates the talking-circle review model. Smith's decolonizing methodology generates the OCAP® enforcement architecture. Marshall's Two-Eyed Seeing generates the dual-store strategy.

These are not decorative choices. They produce architectural structures that Western software engineering has no equivalent for:
- **Relational gating** (transitions require accountability verification, not just task completion)
- **Ceremony-mediated state transitions** (consent widening requires ceremony with witnesses)
- **Stop-work as relational repair** (resolution requires narrative, not retry)
- **Consent as lifecycle** (not boolean but stateful, renewable, withdrawable, cascading)
- **Resting phase** (integration period with no Western counterpart)
- **Seven-generations archiving** (intergenerational obligation, not retention policy)

### 7.2 The Session as Ceremony

This RISE PDE session is itself an example of ceremonial technology development — imperfect, but instructive. The orchestrator decomposed work directionally (South research, West validation, North synthesis). A companion agent (pi-mono) reviewed the plan during the sleep window, acting as witness. The MMOT review applied "truth as a verb" to the existing codebase. The deep-searches grounded design decisions in academic literature.

What the session lacks — and what the Fire Keeper model provides — is the ceremonial container: opening/closing, Wilson alignment tracking during execution, relational gating at transitions, stop-work capability. The gap between this session and the Fire Keeper model maps directly to the rispec candidates R4 (ceremony-aware orchestrator) and R10 (relational gating protocol).

### 7.3 For Future Orchestrators

Any agent conducting a RISE PDE session on the Medicine Wheel ecosystem should understand:

1. **You are working inside a relational web, not a codebase.** KINSHIP.md defines the project's identity as its relationships. Your work creates, modifies, or damages those relationships.

2. **The specifications are the Indigenous knowledge.** `ceremony-protocol.spec.md`, `fire-keeper.spec.md`, `consent-lifecycle.spec.md`, `community-review.spec.md` — these are the project's most important documents. They carry the epistemological framework that gives the code its meaning.

3. **The gap between specs and tools is the primary work.** The specifications are mature. The MCP tools partially implement them. Closing this gap — especially for consent lifecycle, community review, and ceremony lifecycle tools — is the highest-impact enhancement work.

4. **Two-Eyed Seeing is architectural, not metaphorical.** The dual-store question (JSONL vs Redis, governance types vs stored types) is not a technical trade-off. It is a question about whether both eyes can see together — whether computational performance and Indigenous governance can operate as co-equal architectural concerns.

5. **Wilson's three R's are not optional.** Respect, Reciprocity, Responsibility are not ethical guidelines attached to the project. They are epistemological requirements. Work that does not honor them damages the knowledge the system creates.

---

## References

### Primary Sources

- Wilson, S. (2008). *Research Is Ceremony: Indigenous Research Methods.* Halifax: Fernwood Publishing.
- Kovach, M. (2009). *Indigenous Methodologies: Characteristics, Conversations, and Contexts.* Toronto: University of Toronto Press.
- Smith, L. T. (1999/2021). *Decolonizing Methodologies: Research and Indigenous Peoples* (3rd ed.). London: Zed Books / Dunedin: Otago University Press.
- Bartlett, C., Marshall, M. & Marshall, A. (2012). Two-Eyed Seeing and other lessons learned within a co-learning journey. *Journal of Environmental Studies and Sciences*, 2(4), 331–340.
- FNIGC. (2014). *Ownership, Control, Access, and Possession (OCAP™): The Path to First Nations Information Governance.* Ottawa: First Nations Information Governance Centre.

### Academic Literature (2020–2025)

- Carroll, S. R., et al. (2020). The CARE Principles for Indigenous Data Governance. *Data Science Journal*, 19(1), 43.
- Carroll, S. R., et al. (2021). Operationalizing the CARE and FAIR Principles for Indigenous data futures. *Scientific Data*, 8, 108.
- Martin, D. H. (2012). Two-Eyed Seeing: A Framework for Understanding Indigenous and Non-Indigenous Approaches to Indigenous Health Research. *Canadian Journal of Nursing Research*, 44(2), 20–42.
- Roher, S. I. G., et al. (2021). How is Etuaptmumk/Two-Eyed Seeing characterized in Indigenous health research? A scoping review. *PLOS ONE*, 16(7), e0254612.
- Lewis, J. E. et al. (2024). Abundant intelligences: placing AI within Indigenous knowledge systems. *AI & Society.* https://link.springer.com/article/10.1007/s00146-024-02099-4
- DIA Framework (2024). Zenodo. https://zenodo.org/records/13841034
- Incorporating Indigenous Knowledge Systems into AI Governance (2024). https://www.preprints.org/manuscript/202410.2112
- Relational Collective Agency (2022). *Philosophies* 7(3), 63. https://www.mdpi.com/2409-9287/7/3/63
- Ubuntu meets Algorithms (2025). *ScienceDirect*. https://www.sciencedirect.com/science/article/pii/S3051064326000713

### Indigenous HCI & Decolonial Computing

- Lazem, S., et al. (2021). Decolonial Pathways: Our Manifesto for a Decolonizing Agenda in HCI Research and Design. *CHI EA '21*. ACM.
- Winschiers-Theophilus, H. & Bidwell, N. Toward an Afro-Centric Indigenous HCI Paradigm. *International Journal of Human-Computer Interaction.*
- Csuka, S., et al. (2021). Challenges and Paradoxes in Decolonising HCI. *Computer Supported Cooperative Work (CSCW)*, Springer.
- Bass, J. M. (2022). Agile Ceremonies. In *Agile Software Development*. Springer.

### Multi-Agent Framework Sources

- AutoGen vs CrewAI comparison. https://turion.ai/blog/autogen-vs-crewai-multi-agent-comparison/
- CrewAI vs AutoGen Developer's Guide. https://groundy.com/articles/crewai-vs-autogen-developers-guide/
- AutoGen and CrewAI Architectures. https://deepwiki.com/ombharatiya/ai-system-design-guide/7.3-autogen-and-crewai-architectures
- Agentic AI Frameworks survey. https://arxiv.org/html/2508.10146v1

### Codebase Sources

- `KINSHIP.md` — medicine-wheel repository relational identity
- `src/ontology-core/src/types.ts` — `Relation`, `RelationalEdge`, `AccountabilityTracking`, `OcapFlags` types
- `rispecs/ceremony-protocol.spec.md` — 4-phase ceremony lifecycle
- `rispecs/fire-keeper.spec.md` — 5-phase extended ceremony with fire keeper agent
- `rispecs/community-review.spec.md` — Talking circle review protocol
- `rispecs/consent-lifecycle.spec.md` — Consent as living relationship
- `rispecs/data-store.spec.md` — Two-backend architecture (JSONL + Redis)
- `mcp/src/jsonl-store.ts` — JSONL persistence engine
- `lib/jsonl-store.ts` — Web UI JSONL store (mirrored)
- `medicine-wheel-pi/rispecs/05-full-pipeline-vision.spec.md` — Full ceremony pipeline
- `medicine-wheel-pi/rispecs/01-redis-knowledge-store.spec.md` — RedisKnowledgeStore
- `medicine-wheel-pi/rispecs/02-ceremony-agents.spec.md` — Ceremony agent tool requirements
