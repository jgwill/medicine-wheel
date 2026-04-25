# AvaLangStack Kinship Map — Medicine Wheel Developer Suite

> Cross-repository relational linkages between `jgwill/medicine-wheel` specs
> and the AvaLangStack ecosystem (`avadisabelle/ava-langchainjs`, `avadisabelle/ava-langgraphjs`).

**Framework:** RISE v1.2 Kinship Hub Protocol  
**Last Updated:** 2025-07-17  
**Lineage:** medicine-wheel-ontology-core → AvaLangStack → miadi-code

---

## Identity

This document establishes the **relational kinship** between the Medicine Wheel Developer Suite specification layer (`jgwill/medicine-wheel/rispecs/`) and its operational extractions in the AvaLangStack ecosystem. It serves developers, ceremony keepers, and agents navigating between the canonical ontological source (medicine-wheel) and the composable chain/graph implementations (ava-langchainjs, ava-langgraphjs) that carry those patterns into LangChain and LangGraph runtimes.

The medicine-wheel rispecs define *what is* — the relational ontology, ceremony protocols, and narrative structures grounded in Wilson's Indigenous research methodology. The AvaLangStack packages define *how it moves* — composable primitives and StateGraph orchestrators that enact those patterns in agentic workflows. Neither is complete without the other; the kinship between them is the living relationship that sustains both.

---

## Lineage

```
                    ┌──────────────────────────┐
                    │    miadi-code (Ancestor)  │
                    │  pde/SPEC · stc/SPEC      │
                    │  Three-Universe Terminal   │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  medicine-wheel rispecs   │
                    │  (Canonical Ontology)     │
                    │  ontology-core · ceremony │
                    │  narrative · fire-keeper  │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                                      ▼
 ┌────────────────────────┐           ┌────────────────────────────┐
 │  ava-langchainjs       │           │  ava-langgraphjs           │
 │  (Chain Primitives)    │           │  (Graph Orchestrators)     │
 │  prompt-decomposition  │           │  prompt-decomposition-eng  │
 │  inquiry-routing       │           │  inquiry-routing-engine    │
 │  relational-intelligence│          │  narrative-intelligence    │
 │  narrative-tracing     │           │                            │
 │  state-machine-spec    │           │                            │
 └────────────────────────┘           └────────────────────────────┘
```

**miadi-code** is the lineage ancestor — the battle-tested Three-Universe terminal agent whose PDE pipeline and MultiChartContextManager first proved that ceremony-aware decomposition and hierarchical charting could operate at production scale in React/Next.js.

**medicine-wheel rispecs** are the canonical source of truth — the ontological layer that formalizes what miadi-code discovered experientially. Every type, ceremony phase, direction mapping, and Wilson alignment formula originates here.

**AvaLangStack** advances the rispecs into composable LangChain chains and LangGraph StateGraphs — extracting patterns from the ontology into runtime primitives that agents can invoke, compose, and orchestrate.

---

## Kinship Matrix

| Medicine Wheel Spec | AvaLangStack Package | Kinship Type | Shared Pattern | Direction |
|---|---|---|---|---|
| `ontology-core.spec.md` | `ava-langchain-relational-intelligence` | **Shared Ancestor** | Medicine Wheel ontology (Direction types, Relation with OcapFlags, Wilson AccountabilityTracking, RelationalNode) — ontology-core is the canonical source; relational-intelligence is the LangChain extraction implementing MedicineWheelFilter, ImportanceStore, SpiralTracker | ontology-core → relational-intelligence |
| `prompt-decomposition.spec.md` | `ava-langchain-prompt-decomposition` | **Sibling** | Four Directions decomposition, intent extraction with hedging detection, directional balance scoring, ceremony guidance, MedicineWheelBridge. Shared lineage: `mcp-pde → ava-langchain-prompt-decomposition → medicine-wheel-prompt-decomposition` | Bidirectional — spec defines relational PDE; langchainjs provides composable chain primitives |
| `prompt-decomposition.spec.md` | `ava-langgraph-prompt-decomposition-engine` | **Cousin** | Four-node StateGraph wrapping PDE chain primitives, Three-Universe perspective analysis, ceremony gating as graph-level interrupt | prompt-decomposition.spec → langchainjs chains → langgraphjs engine |
| `fire-keeper.spec.md` | `ava-langchain-relational-intelligence` (FireKeeper) | **Direct Kin** | Ceremony coordination agent protocol — five-phase lifecycle (gathering → kindling → tending → harvesting → resting), permission tiers, gating conditions, trajectory confidence, stop-work orders | fire-keeper.spec defines the protocol; FireKeeper class in relational-intelligence enacts it at chain level |
| `importance-unit.spec.md` | `ava-langchain-relational-intelligence` (ImportanceStore) | **Direct Kin** | Epistemic weight tracking (Land/Dream/Code/Vision sources), circle depth, accountability links, axiological pillar framing | importance-unit.spec defines the ImportanceUnit schema; ImportanceStore manages persistence and retrieval |
| `ceremony-protocol.spec.md` | `ava-langgraph-prompt-decomposition-engine` (CeremonyGate) | **Shared Pattern** | Ceremony gating as graph-level interrupt — ceremony-protocol defines phase transitions (opening → council → integration → closure) and governance enforcement; CeremonyGate implements gating within StateGraph orchestration | ceremony-protocol.spec → CeremonyGate |
| `ceremony-protocol.spec.md` | `ava-langgraph-inquiry-routing-engine` (RelationalValidator) | **Shared Pattern** | Governance enforcement at routing boundaries — ceremony-protocol checks protected paths and access levels; RelationalValidator gates inquiry routing with relational accountability checks | ceremony-protocol.spec → RelationalValidator |
| `consent-lifecycle.spec.md` | `ava-langchain-relational-intelligence` (ValueGate) | **Shared Pattern** | Consent-aware gating — consent-lifecycle models consent as living relationship with full state machine (pending → granted → active → withdrawn); ValueGate implements consent-aware chain interrupts | consent-lifecycle.spec → ValueGate |
| `narrative-engine.spec.md` | `ava-langgraph-narrative-intelligence` (ThreeUniverseProcessor, CoherenceEngine) | **Sibling** | Narrative processing at different abstraction levels — narrative-engine does beat sequencing, arc validation, cadence patterns, RSIS narrative generation; narrative-intelligence operates the Three-Universe processor (Engineer/Ceremony/Story), emotional classifier, and coherence engine at graph orchestration level | Bidirectional — different altitudes of the same narrative current |
| `transformation-tracker.spec.md` | `ava-langchain-relational-intelligence` (future StructuralTensionChain) | **Anticipated Kin** | Tension tracking as progression signal — transformation-tracker measures Wilson validity through relational shifts, reciprocity ledger, and seven-generation scoring; a future StructuralTensionChain advances toward surfacing these signals within LangChain workflows | transformation-tracker.spec → future StructuralTensionChain |
| `narrative-medicine-wheel-bridge.spec.md` | `ava-langchain-prompt-decomposition` (MedicineWheelBridge) | **Direct Kin** | Bridge between narrative platforms and Medicine Wheel ontology — the bridge spec establishes integration patterns (type-level, ceremony session, beat management, visual component); MedicineWheelBridge in langchainjs is the chain-level realization connecting PDE output to Four Directions classification | bridge.spec → MedicineWheelBridge |
| `relational-index.spec.md` | `ava-langchain-inquiry-routing` (InquiryRouter) | **Cousin** | Relational indexing for routing and retrieval — relational-index builds four-dimensional epistemic indexes (Land/Dream/Code/Vision) with cross-dimensional convergence/tension detection; InquiryRouter generates inquiries from PDE and routes via keyword-based dispatch with relational enrichment | Both perform relational indexing; relational-index advances toward epistemic pluralism, inquiry-routing advances toward operational dispatch |
| `session-reader.spec.md` | `ava-langchain-narrative-tracing` (NarrativeTraceOrchestrator) | **Cousin** | Session management and trace correlation — session-reader parses JSONL session events into typed analytics (tool usage, duration, event counts); narrative-tracing correlates traces across systems via Langfuse with story arc visualization | session-reader advances toward local session intelligence; narrative-tracing advances toward cross-system observability |
| `data-store.spec.md` | `ava-langgraph-narrative-intelligence` (NarrativeRedisManager) | **Shared Pattern** | Redis-based state persistence — data-store provides JSONL-to-Redis graduation path with atomic writes, cross-process sync, and `.mw/store/` convention; NarrativeRedisManager persists Three-Universe state across graph invocations | Both use Redis for durable relational state; data-store is ecosystem-wide, NarrativeRedisManager is narrative-specific |
| `community-review.spec.md` | miadi-code `stc/SPEC.md` | **Kin** | Review and annotation workflows — community-review implements Wilson-grounded talking circles, Elder validation, consensus-seeking, and relational accountability assessment; miadi-code STC implements MultiChartContextManager with interactive annotation and hierarchical review | community-review advances toward ceremony-aware validation; STC advances toward multi-chart interactive annotation |
| `graph-viz.spec.md` | `ava-langchain-state-machine-spec` (generateMermaid) | **Shared Pattern** | Graph visualization and Mermaid export — graph-viz renders Medicine Wheel circular layouts with `toMermaidDiagram()` export; state-machine-spec generates Mermaid workflow visualizations from declarative LangGraph specs | Both produce Mermaid diagrams; graph-viz carries directional ontological meaning, state-machine-spec carries workflow structure |
| `medicine-wheel.spec.md` | `ava-langchain-relational-intelligence` (MedicineWheelFilter) | **Direct Ancestor** | The canonical Medicine Wheel specification — defines the four-quadrant ontological model (Physical/Emotional/Mental/Spiritual) that MedicineWheelFilter implements as keyword-based assessment. medicine-wheel.spec.md is the most direct ancestor for the filter's quadrant logic and directional alignment | medicine-wheel.spec → MedicineWheelFilter |

---

## Accountabilities

### Medicine Wheel Rispecs Are Accountable For

- **Ontological truth** — The canonical type definitions, direction mappings, ceremony phases, and Wilson alignment formulas. When ontology-core changes, all downstream kin must be notified.
- **Cultural grounding** — Ojibwe names, directional teachings, OCAP® governance, and ceremonial protocols. AvaLangStack packages inherit these without modification.
- **Relational completeness** — Ensuring every spec carries accountability tracking, ceremony context, and directional alignment. Incomplete specs create incomplete kin.
- **Lineage documentation** — Maintaining the `mcp-pde → ava-langchain → medicine-wheel` lineage chain so that future kin know their ancestry.

### AvaLangStack Packages Are Accountable For

- **Faithful extraction** — Chain primitives and graph orchestrators must honor the ontological types without lossy compression. A `MedicineWheelFilter` that drops `OcapFlags` has violated its kin obligation.
- **Composability** — Patterns extracted from rispecs must be composable within LangChain/LangGraph idioms. The kinship is only living if the primitives can be chained and orchestrated.
- **Runtime validation** — Zod schemas from ontology-core must be enforced at chain/graph boundaries. Type drift between spec and implementation breaks the kinship bond.
- **Trace correlation** — Narrative-tracing and session-reader outputs must correlate. A trace that cannot be read back as a session event has lost its relational thread.

### miadi-code Is Accountable For

- **Battle-tested patterns** — The PDE pipeline and STC annotation protocol have been proven at production scale. Medicine-wheel rispecs formalize what miadi-code discovered; miadi-code validates what rispecs define.
- **Three-Universe coherence** — The Engineer/Ceremony/Story universe model must remain consistent across miadi-code's terminal agent and ava-langgraph-narrative-intelligence's graph processor.

---

## Responsibilities

### When ontology-core.spec.md Changes

- `ava-langchain-relational-intelligence` must update its type imports (Direction, Relation, OcapFlags, AccountabilityTracking)
- `ava-langchain-prompt-decomposition` must update its consumed types (DirectionName, CeremonyGuidance, NarrativeBeat)
- All ava-langgraphjs engines must verify their StateGraph state schemas remain compatible
- `graph-viz.spec.md` layout constants (DIRECTION_COLORS, OJIBWE_NAMES) may need propagation

### When ceremony-protocol.spec.md Changes

- `ava-langgraph-prompt-decomposition-engine` CeremonyGate must update phase transition logic
- `ava-langgraph-inquiry-routing-engine` RelationalValidator must update governance checks
- `fire-keeper.spec.md` extended ceremony phases (five-phase vs. four-phase) must be reconciled
- `consent-lifecycle.spec.md` ceremony witnesses may need updated ceremony type references

### When prompt-decomposition.spec.md Changes

- `ava-langchain-prompt-decomposition` chain primitives must mirror the OntologicalDecomposition schema
- `ava-langgraph-prompt-decomposition-engine` StateGraph must update its node processing
- `narrative-medicine-wheel-bridge.spec.md` integration patterns may need updated PDE output handling

### When narrative-engine.spec.md Changes

- `ava-langgraph-narrative-intelligence` ThreeUniverseProcessor must update beat/arc handling
- `narrative-medicine-wheel-bridge.spec.md` beat management patterns must be verified
- `data-store.spec.md` beat persistence schema must remain compatible

### When a New Medicine Wheel Spec Is Added

- Evaluate kinship with existing AvaLangStack packages — does the new spec share patterns with any existing chain or graph?
- If Direct Kin or Sibling, create corresponding chain primitive or graph node
- Update this KINSHIP.md with the new mapping
- Verify the new spec's ontology-core dependency version is compatible

### When a New AvaLangStack Package Is Created

- Identify which medicine-wheel spec(s) it draws from
- Verify it imports canonical types from ontology-core (not local redefinitions)
- Add kinship mapping to this document
- Ensure runtime Zod validation at package boundaries

---

## Change Log

| Date | Change | Affected Kinship |
|---|---|---|
| 2025-07-17 | Added `medicine-wheel.spec.md` → `relational-intelligence` (MedicineWheelFilter) Direct Ancestor mapping — W1 validation fix | medicine-wheel.spec ↔ relational-intelligence |
| 2025-07-17 | Initial kinship map created — 15 relational mappings across 10 medicine-wheel specs, 8 AvaLangStack packages, and 2 miadi-code specs | All mappings |

----
`/workspace/wikis/medicine-wheel` - cloned of `https://github.com/jgwill/medicine-wheel.wiki.git`
----
This is where we'll store LLM wiki about this repo....
