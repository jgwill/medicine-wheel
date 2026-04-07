# Medicine Wheel

> A first experimental TypeScript framework for relational healing, ceremonial inquiry, and Indigenous-aligned software development — grounded in the Four Directions, Wilson's three R's (Respect, Reciprocity, Responsibility), and OCAP® data sovereignty principles.

## Architecture

```
medicine-wheel-ontology-core          ← Foundation (types, schemas, RDF vocabulary)
    ├── medicine-wheel-ceremony-protocol    ← Ceremony state & governance
    ├── medicine-wheel-fire-keeper          ← Ceremony coordination agent
    ├── medicine-wheel-community-review     ← Elder review & consensus
    ├── medicine-wheel-consent-lifecycle    ← Relational consent lifecycle
    ├── medicine-wheel-narrative-engine     ← Beat sequencing & arc validation
    ├── medicine-wheel-importance-unit      ← Relational unit of knowledge
    ├── medicine-wheel-relational-index     ← Four-source epistemic indexing
    ├── medicine-wheel-transformation-tracker ← Wilson validity tracking
    ├── medicine-wheel-graph-viz            ← Circular layout & visualization
    ├── medicine-wheel-relational-query     ← Query, traversal & audit
    ├── medicine-wheel-prompt-decomposition ← Intent extraction & PDE
    ├── medicine-wheel-ui-components        ← React components
    ├── medicine-wheel-data-store           ← Shared Redis data access
    └── medicine-wheel-session-reader       ← Session event data reader
```

## Packages

### [@medicine-wheel/ontology-core](src/ontology-core)
Core ontology layer — 50+ TypeScript types, Zod validation schemas, RDF vocabulary (6 custom namespaces), canonical constants (Ojibwe names, seasons, direction colors), and semantic query helpers (Wilson alignment, OCAP® compliance, relational traversal).

- **Version:** 0.1.1
- **Dependencies:** `zod` ^3.23.0

### [@medicine-wheel/ceremony-protocol](src/ceremony-protocol)
Ceremony lifecycle protocol — manages ceremony state, four-phase transitions (opening → council → integration → closure), governance enforcement for protected paths, and ceremony-required change detection.

- **Version:** 0.1.1
- **Dependencies:** `medicine-wheel-ontology-core`

### [@medicine-wheel/fire-keeper](src/fire-keeper)
Fire Keeper coordination agent — tends the ceremony fire, ensures relational integrity through gating conditions, permission tier escalation, and maintains Wilson alignment as an active agent that evaluates, gates, routes, and escalates.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `medicine-wheel-ceremony-protocol`

### [@medicine-wheel/community-review](src/community-review)
Community-based ceremonial review protocol — implements Wilson's validation through Elder review circles, consensus-seeking, talking circle protocol, and relational accountability assessment.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `medicine-wheel-ceremony-protocol`, `zod`

### [@medicine-wheel/consent-lifecycle](src/consent-lifecycle)
Ongoing relational consent lifecycle — consent as a living relational obligation with lifecycle tracking, renewal, renegotiation, withdrawal cascades, and community-level consent protocols.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `medicine-wheel-ceremony-protocol`, `zod`

### [@medicine-wheel/narrative-engine](src/narrative-engine)
Beat sequencing, cadence validation, arc completeness scoring, timeline building, cycle orchestration, and RSIS narrative generators. Tracks four-directional balance and ceremony coverage.

- **Version:** 0.1.1
- **Dependencies:** `medicine-wheel-ontology-core`

### [@medicine-wheel/importance-unit](src/importance-unit)
ImportanceUnit — the relational unit of knowledge in Wilson's epistemology. Carries epistemic weight, source dimensions (Land/Dream/Code/Vision), circle depth tracking, and accountability links. Dream-state knowledge starts at 0.85+ weight; rational-filtered inputs start lower.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `zod`

### [@medicine-wheel/relational-index](src/relational-index)
Four-source epistemic dimensional indexing — Land, Dream, Code, Vision traversal with cross-dimensional mapping, convergence/tension detection, and spiral depth metrics.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`

### [@medicine-wheel/transformation-tracker](src/transformation-tracker)
Research transformation tracking — Wilson validity criterion: "If research doesn't change you, you haven't done it right." Tracks researcher growth, community impact, relational shifts, reciprocity balance, and seven-generation sustainability.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `medicine-wheel-ceremony-protocol`, `zod`

### [@medicine-wheel/graph-viz](src/graph-viz)
Medicine Wheel circular graph visualization — four-direction node positioning, ceremony-aware edges, OCAP® indicators, SVG path generation, data converters, and RSIS visualization utilities (kinship graphs, reciprocity flows, Mermaid export).

- **Version:** 0.1.1
- **Dependencies:** `medicine-wheel-ontology-core`
- **Peer:** `react` >=18.0.0

### [@medicine-wheel/relational-query](src/relational-query)
Query builder for relational webs — node/edge filtering, ceremony-bounded BFS traversal, OCAP®-compliant path walking, accountability auditing, shortest path, neighborhood discovery, and KuzuDB Cypher query builders.

- **Version:** 0.1.1
- **Dependencies:** `medicine-wheel-ontology-core`

### [@medicine-wheel/prompt-decomposition](src/prompt-decomposition)
Ontology-enriched prompt decomposition — Four Directions classification, implicit intent extraction from hedging language, dependency mapping, ceremony guidance, action stacking, and narrative beat generation.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`

### [@medicine-wheel/ui-components](src/ui-components)
React UI component library — `DirectionCard`, `BeatTimeline`, `NodeInspector`, `OcapBadge`, `WilsonMeter`. All components use ontology-core types for type-safe, culturally grounded interfaces.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`
- **Peer:** `react` ^18.0.0 || ^19.0.0

### [@medicine-wheel/data-store](src/data-store)
Shared Redis data-access layer — connection management (Upstash, Vercel KV, local), Node/Edge/Ceremony/Accountability CRUD, session-ceremony linking, and generic Redis helpers.

- **Version:** 0.1.0
- **Dependencies:** `medicine-wheel-ontology-core`, `redis`

### [@medicine-wheel/session-reader](src/session-reader)
Session event reader — JSONL parsing, session summaries, analytics extraction, and search across agent session data. Zero external dependencies.

- **Version:** 0.1.0
- **Dependencies:** None (Node.js built-ins only)

## Specifications

RISE framework specifications for all 15 packages are in [`rispecs/`](rispecs/). Start with [`medicine-wheel.spec.md`](rispecs/medicine-wheel.spec.md) for the system overview.

| Package | Spec |
|---------|------|
| System Overview | [medicine-wheel.spec.md](rispecs/medicine-wheel.spec.md) |
| ontology-core | [ontology-core.spec.md](rispecs/ontology-core.spec.md) |
| ceremony-protocol | [ceremony-protocol.spec.md](rispecs/ceremony-protocol.spec.md) |
| fire-keeper | [fire-keeper.spec.md](rispecs/fire-keeper.spec.md) |
| community-review | [community-review.spec.md](rispecs/community-review.spec.md) |
| consent-lifecycle | [consent-lifecycle.spec.md](rispecs/consent-lifecycle.spec.md) |
| narrative-engine | [narrative-engine.spec.md](rispecs/narrative-engine.spec.md) |
| importance-unit | [importance-unit.spec.md](rispecs/importance-unit.spec.md) |
| relational-index | [relational-index.spec.md](rispecs/relational-index.spec.md) |
| transformation-tracker | [transformation-tracker.spec.md](rispecs/transformation-tracker.spec.md) |
| graph-viz | [graph-viz.spec.md](rispecs/graph-viz.spec.md) |
| relational-query | [relational-query.spec.md](rispecs/relational-query.spec.md) |
| prompt-decomposition | [prompt-decomposition.spec.md](rispecs/prompt-decomposition.spec.md) |
| ui-components | [ui-components.spec.md](rispecs/ui-components.spec.md) |
| data-store | [data-store.spec.md](rispecs/data-store.spec.md) |
| session-reader | [session-reader.spec.md](rispecs/session-reader.spec.md) |

## LLM Integration

- [`llms.txt`](llms.txt) — Quick navigation for LLMs
- [`llms-full.txt`](llms-full.txt) — Exhaustive reference with code samples

## Getting Started

```bash
# Install individual packages
npm install medicine-wheel-ontology-core
npm install medicine-wheel-narrative-engine
# ... etc

# Or link locally for development
cd src/ontology-core && npm link
cd src/narrative-engine && npm link medicine-wheel-ontology-core
```

## License

MIT

