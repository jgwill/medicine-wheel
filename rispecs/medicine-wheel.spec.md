# Medicine Wheel — System RISE Specification

> Relational software framework for Four-Directions inquiry, ceremony-aware development, narrative continuity, persistence, governance, and interactive tooling. The system keeps relational accountability visible across ontology, storage, orchestration, interfaces, and agent-facing surfaces.

**Version:** 0.6.3  
**Document ID:** rispec-@medicine-wheel/system-v2  
**Parity Baseline:** 2026-08-19

---

## Desired Outcome

Users create **relationally accountable software systems** in which ontology, persistence, narrative, ceremony, inquiry, infrastructure, and interfaces can evolve without becoming disconnected islands.

The framework should make relations, consent, provenance, direction, ceremony, and uncertainty visible at the points where software would otherwise flatten them into generic records or invisible implementation detail.

---

## Current Reality

The repository is no longer the fifteen-package system described by the earlier specification.

The current release line contains:

- the root `@medicine-wheel/app` application and CLI;
- **27 ordered workspaces** including the MCP surface;
- suite packages on the 0.6.3 line, while MCP has its own 4.6.3 line;
- a canonical `storage-provider` abstraction with JSONL and Neon implementations;
- newer domain layers for infrastructure, creative orientation, narrative clustering, perception, ceremonial diary, GitHub ceremony, and discovery/orientation;
- registry families for inquiry weaves, plan perspectives, diary entries, ceremony events, and captures;
- a closed six-kind ontology extended through typed domain discriminators rather than uncontrolled node-type expansion.

The system specification must therefore describe the architecture that exists now, not preserve an earlier package count as doctrine.

---

## Structural Tension

**Desired state:** each package can deepen one domain while still participating in a coherent relational system.

**Current pressure:** rapid experimentation naturally produces parallel vocabularies, duplicated persistence paths, stale package maps, and interfaces that lag behind engines.

**Natural resolution:** preserve small canonical contracts at the seams — ontology-core for shared relational meaning, storage-provider for persistence meaning, explicit phase vocabularies, and agent/UI surfaces that invoke rather than bypass the domain engines.

---

## Current Workspace Architecture

Workspace order is dependency-sensitive. The architecture is better read as layers than as one flat package list.

### Foundation and environment

- `@medicine-wheel/ontology-core` — relational types, schemas, kinship vocabulary, constants, queries, RDF interop.
- `@medicine-wheel/infra` — typed infrastructure facets and reconciliation over existing ontology nodes.
- `@medicine-wheel/creative-orientation` — distinguishes creative orientation from reactive problem solving.
- `@medicine-wheel/session-reader` — session parsing and reading utilities.

### Ceremony and persistence

- `@medicine-wheel/ceremony-protocol` — ceremony state and governance framing.
- `@medicine-wheel/storage-provider` — canonical JSONL/Neon persistence contract and record registries.
- `@medicine-wheel/data-store` — Redis-specific data-access package; not the canonical cross-backend provider interface.
- `@medicine-wheel/data-store-postgres` — minimal `pg`/Postgres scaffold; not a competing provider architecture.

### Narrative, perception, and knowledge

- `@medicine-wheel/graph-viz` — graph layout and visualization helpers.
- `@medicine-wheel/importance-unit` — epistemically weighted relational knowledge.
- `@medicine-wheel/narrative-engine` — narrative beat sequencing and cycle behavior.
- `@medicine-wheel/narrative-cluster` — clustering/derivation layer for narrative material.
- `@medicine-wheel/perception-layer` — perceptual/interpretive layer.
- `@medicine-wheel/prompt-decomposition` — Four-Directions decomposition and inquiry.
- `@medicine-wheel/relational-index` — relational/epistemic indexing.
- `@medicine-wheel/relational-query` — traversal and relational query behavior.
- `@medicine-wheel/ui-components` — reusable interface components.

### Orientation, review, and governance

- `@medicine-wheel/brainstorming` — generative exploration capability.
- `@medicine-wheel/gap-analysis` — reactive/problem-oriented gap analysis.
- `@medicine-wheel/creative-problem-solving` — orientation/signpost surface that routes users toward the appropriate creative or reactive capability.
- `@medicine-wheel/community-review` — ceremonial/community review.
- `@medicine-wheel/consent-lifecycle` — consent as a changing relationship.
- `@medicine-wheel/fire-keeper` — active relational gating and stewardship.
- `@medicine-wheel/transformation-tracker` — transformation and research-impact tracking.

### Ceremony adapters and agent surfaces

- `@medicine-wheel/ceremonial-diary` — participant diary across its own five-phase ceremonial methodology.
- `@medicine-wheel/github-ceremony` — interprets GitHub events through ceremonial records.
- `@medicine-wheel/mcp` — agent-facing protocol/tools, released on its own 4.x version line.
- `@medicine-wheel/app` — root web/CLI serving surface around the packages.

---

## Canonical Seams

### 1. Ontology seam

`ontology-core` is the shared relational grammar.

The top-level `NodeType` union remains six values: human, land, spirit, ancestor, future, knowledge. Domain-specific kinds such as production, infrastructure, and academic entities ride existing nodes through typed discriminators and bindings.

Relations remain first-class and can carry obligations, OCAP governance, Wilson accountability, ceremony context, authorization context, and governed kinship names.

### 2. Persistence seam

`storage-provider` is the cross-backend runtime persistence contract.

Implemented provider behavior:

- JSONL default/local backend;
- Neon/Postgres backend;
- explicit backend selection;
- Redis named but deliberately unsupported in the canonical provider factory until implemented.

Historical Redis and Postgres packages remain useful boundaries but do not supersede the provider contract.

### 3. Narrative seam

Narrative beats carry direction, act, ceremonies, learnings, relational honoring, optional cycle membership, telescoping lineage, and origin/provenance.

A surface that creates beats should pass through the narrative engine's validation/authoring semantics rather than writing around them.

### 4. Ceremony seam

The system contains multiple legitimate phase vocabularies and must not collapse them:

- ceremony protocol: opening → council → integration → closure;
- Fire Keeper lifecycle: gathering → kindling → tending → harvesting → resting;
- ceremonial diary: its five Ojibwe phase names;
- engineering delivery waves: their own scout/design/build/review/test cadence.

Shared words do not imply one universal state machine.

### 5. Surface seam

Web, CLI, REST, MCP, and external consumers should expose domain capabilities without silently bypassing the rules those capabilities exist to enforce.

A feature is not complete merely because an internal engine exists. The serving surface is part of the system contract.

---

## Persistence and Registry Families

The current storage-provider contract includes more than generic graph records.

Core families:

- nodes;
- edges;
- ceremonies.

Registered families:

- inquiry weaves;
- plan perspectives;
- ceremonial diary entries;
- ceremony events;
- captures.

Capture registration stores records and URIs, never media bytes. Family-specific filtering, merging, provenance, and refusal behavior should remain centralized instead of being reimplemented independently by each backend or route.

---

## API/Observability Invariants

The current system distinguishes a **page** from a **total**. Collection reads can be limited; whole-store counts use dedicated provider operations.

Filtering must not silently ignore unsupported parameters. When a route claims to filter, either the requested filter is actually applied or the request fails visibly.

Mutation failures should preserve their meaning. A node that still holds relations is a relational refusal, not merely a generic storage error and never an invitation to cascade-delete silently.

---

## Core Conceptual Vocabularies

### Four Directions

```text
East   — vision, emergence, inquiry
South  — relationship, learning, preparation
West   — implementation, validation, embodied work
North  — integration, reflection, wisdom
```

Different packages may apply direction at different altitudes. Ceremonial teaching constants and working-session guidance are related vocabularies, not interchangeable fields.

### Wilson's Three R's

- Respect
- Reciprocity
- Responsibility

The system can track these relationally and aggregate alignment, but the numbers do not replace human or community judgement.

### OCAP®

Ownership, Control, Access, and Possession are held as governance information on relations. Consent additionally carries current state and affirmation timing where available.

### Structural Tension

Creative advancement is represented through a desired outcome held together with current reality, producing action without replacing the tension with a problem-only frame.

---

## Creative Advancement Scenarios

### Scenario: A new domain enters without widening the ontology

**Desired Outcome:** Represent a new class of beings in a specialized domain.  
**Current Reality:** The six core node kinds do not name that domain directly.  
**Natural Progression:** Define a typed domain discriminator and binding onto existing node kinds; add specialized facets or relations outside the foundational enum.  
**Resolution:** The domain becomes first-class enough to validate and query while the core ontology remains stable.

### Scenario: Local persistence becomes hosted persistence

**Desired Outcome:** Move a working installation from local JSONL to hosted Postgres.  
**Current Reality:** Application behavior already depends on provider-level operations.  
**Natural Progression:** Select Neon through the canonical provider contract and validate observable parity.  
**Resolution:** Location changes without rewriting domain semantics.

### Scenario: An engine becomes reachable

**Desired Outcome:** Let a user or agent actually perform a domain capability.  
**Current Reality:** Internal package logic exists but no reliable CLI/REST/MCP/UI path reaches it.  
**Natural Progression:** Add a serving surface that invokes the same engine/validation path rather than duplicating or bypassing it.  
**Resolution:** The capability becomes operational without creating a second interpretation of its rules.

---

## Specification Parity Law

A RISE specification is not considered current because its prose remains philosophically aligned.

Parity requires checking at least:

1. package/workspace existence and version line;
2. exported domain types and runtime schemas;
3. canonical provider or orchestration boundary;
4. implemented versus deferred capabilities;
5. REST/CLI/MCP/UI surfaces that materially change user-visible behavior;
6. migration, pagination, filtering, refusal, and compatibility semantics where they are load-bearing;
7. renamed concepts and deliberate aliases;
8. recent changes that alter an invariant even if the package name did not change.

Implementation evidence may be listed in an appendix so the main RISE contract remains re-implementable without confusing current file paths with the conceptual design.

---

## Quality Criteria

- Package architecture matches the current workspace graph rather than a historical count.
- Canonical seams are named explicitly so parallel packages do not accidentally become competing authorities.
- Implemented and deferred capabilities are distinguished.
- Multiple ceremonial/delivery phase systems remain distinct.
- Surfaces are treated as part of capability completeness.
- Persistence parity includes pagination, totals, filters, refusal semantics, and registry families.
- Ontology extensions remain additive unless an explicit foundational revision widens the core.

---

## Implementation Evidence Appendix

- Workspace topology and suite versions: root `package.json`
- Core ontology: `src/ontology-core/`
- Canonical persistence: `src/storage-provider/`
- Root serving surfaces: `app/`, `lib/`, `dist/cli` source inputs, and `mcp/`
- Current suite line: 0.6.3
- Current MCP line: 4.6.3
