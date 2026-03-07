# Medicine Wheel — System RISE Specification

> A comprehensive TypeScript framework for relational healing, ceremonial inquiry, and Indigenous-aligned software development. Nine packages that together enable developers to create relationally accountable systems grounded in the Four Directions, Wilson's three R's, and OCAP® principles.

**Version:** 0.1.2  
**Document ID:** rispec-medicine-wheel-system-v1  
**Last Updated:** 2026-03-06  

---

## Desired Outcome

Users create **complete Medicine Wheel software systems** — from ontological data models through ceremony-aware workflows to interactive visualizations — where every component honors Indigenous relational principles.

---

## Package Architecture

```
medicine-wheel-ontology-core          ← Foundation (types, schemas, vocabulary)
    ├── medicine-wheel-ceremony-protocol    ← Ceremony state & governance
    ├── medicine-wheel-narrative-engine     ← Beat sequencing & arc validation
    ├── medicine-wheel-graph-viz            ← Circular layout & visualization
    ├── medicine-wheel-relational-query     ← Query, traversal & audit
    ├── medicine-wheel-prompt-decomposition ← Intent extraction & PDE
    ├── medicine-wheel-ui-components        ← React components
    └── medicine-wheel-data-store           ← Redis persistence (+ redis ^4.6.0)

medicine-wheel-session-reader             ← JSONL session parsing (standalone)
```

All packages depend on `ontology-core` for shared types except `session-reader` which is standalone. No circular dependencies.

---

## How to Use These Specifications

Each rispec describes one package. To implement the full system:

1. **Start with** `ontology-core.spec.md` — implement all types, schemas, vocabulary, constants, and query helpers
2. **Then build** any of the five core packages — they only depend on ontology-core
3. **Finally build** ui-components — composable React components using ontology-core types

### Specification Files

| Rispec | Package | Role |
|--------|---------|------|
| [`ontology-core.spec.md`](./ontology-core.spec.md) | Foundation | Types, Zod schemas, RDF vocabulary, constants, semantic queries |
| [`ceremony-protocol.spec.md`](./ceremony-protocol.spec.md) | Governance | Ceremony state, phase transitions, governance enforcement |
| [`narrative-engine.spec.md`](./narrative-engine.spec.md) | Narrative | Beat sequencing, cadence, arc validation, timeline, cycle |
| [`graph-viz.spec.md`](./graph-viz.spec.md) | Visualization | Circular layout, SVG paths, data converters, Mermaid export |
| [`relational-query.spec.md`](./relational-query.spec.md) | Query | Filtering, traversal, accountability audit, Cypher generation |
| [`prompt-decomposition.spec.md`](./prompt-decomposition.spec.md) | PDE | Intent extraction, Four Directions classification, narrative beats |
| [`ui-components.spec.md`](./ui-components.spec.md) | UI | DirectionCard, BeatTimeline, NodeInspector, OcapBadge, WilsonMeter |
| [`data-store.spec.md`](./data-store.spec.md) | Persistence | Redis CRUD for nodes, edges, ceremonies; session linking |
| [`session-reader.spec.md`](./session-reader.spec.md) | Sessions | JSONL session parsing, listing, analytics, search |

---

## Core Concepts

### Four Directions

| Direction | Ojibwe | Season | Life Stage | Focus |
|-----------|--------|--------|------------|-------|
| East | Waabinong | Spring | Good Life | Vision, intention, emergence |
| South | Zhaawanong | Summer | Fast Life | Growth, learning, analysis |
| West | Epangishmok | Fall | Truth & Planning | Reflection, validation, ceremony |
| North | Kiiwedinong | Winter | Elder | Wisdom, action, integration |

### Wilson's Three R's

Relational accountability measured as three scores (0–1):
- **Respect** — Honoring the dignity and sovereignty of all relations
- **Reciprocity** — Ensuring mutual benefit flows through relationships
- **Responsibility** — Maintaining obligations and commitments

### OCAP® Principles

Indigenous data sovereignty governance:
- **Ownership** — Who owns this data/relation
- **Control** — Who controls access and use
- **Access** — Who may access (community/researchers/public/restricted)
- **Possession** — Where data is physically held

### Structural Tension

Three phases of creative advancement:
1. **Germination** — Vision + honest current reality assessment
2. **Assimilation** — Building momentum through ritualized action
3. **Completion** — Integration and transformation

---

## Creative Advancement Scenarios

### Scenario: Research Cycle

**User Intent:** Create a ceremony-guided research cycle  
**Current Reality:** Raw research question, no structure  
**Natural Progression:**
1. `createCycle(id, question)` → Initializes at East/opening
2. `decompose(prompt)` → Extracts intents with Four Directions classification
3. `insertBeat(beats, beat)` → Records work in directional sequence
4. `validateCadence(beats, ceremonies)` → Ensures ceremony at transitions
5. `computeProgress(cycle, beats, ceremonies, relations)` → Suggests next steps
6. `validateArc(beats, ceremonies, relations)` → Checks completeness
**Achieved Outcome:** Complete four-direction arc with Wilson alignment and OCAP® compliance

### Scenario: Governance-Aware Development

**User Intent:** Modify ceremony protocols with proper governance  
**Current Reality:** Code changes needed in protected paths  
**Natural Progression:**
1. `checkGovernance(filePath, config)` → Detects protected path
2. `formatGovernanceWarning(rule)` → Surfaces governance requirements
3. `checkCeremonyRequired(filePath, config)` → Confirms ceremony needed
4. `getPhaseFraming(phase)` → Frames the change in ceremony context
**Achieved Outcome:** Changes made with relational accountability and proper authority

### Scenario: Relational Accountability Audit

**User Intent:** Assess relational health of the knowledge graph  
**Current Reality:** Relations exist but accountability unknown  
**Natural Progression:**
1. `auditAccountability(nodes, edges, relations)` → Full report
2. `relationsNeedingAttention(relations)` → Priority list
3. `traverse(rootId, nodes, edges, relations, { ocapOnly: true })` → Compliant traversal
4. `generateReciprocityObservation(stewards, flows)` → Invitational narrative
**Achieved Outcome:** Clear picture of where relational attention is needed

---

## Technology Stack

- **Language:** TypeScript (ES2022, strict mode)
- **Runtime:** Node.js (ESM modules)
- **Validation:** Zod ^3.23.0
- **UI Framework:** React ^18.0.0 || ^19.0.0
- **Graph DB (optional):** KuzuDB (via Cypher query builders)
- **Build:** tsc with source maps and declaration files

---

## Build & Publish

All packages share a consistent build and publish configuration:

- **Compiler:** `tsc` (TypeScript compiler) with declaration files and source maps
- **Scripts:** `prepublishOnly: "tsc"` ensures builds run before every `npm publish`
- **Module format:** `"type": "module"` — pure ESM across the monorepo
- **Side effects:** `"sideEffects": false` — enables tree-shaking in bundlers
- **Published files:** `"files": ["dist", "README.md"]` — only compiled output and docs ship to npm

---

## Quality Criteria

- ✅ **Black Box Test:** Another LLM can re-implement the full system from these specs
- ✅ **Creative Orientation:** Every package enables creation, not just data storage
- ✅ **Structural Dynamics:** Four Directions provide natural progression structure
- ✅ **Relational Accountability:** Wilson alignment and OCAP® woven through all layers
- ✅ **Cultural Grounding:** Ojibwe names, ceremonial teachings, and directional medicines embedded
