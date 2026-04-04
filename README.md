# Medicine Wheel

> A first experimental TypeScript framework for relational healing, ceremonial inquiry, and Indigenous-aligned software development — grounded in the Four Directions, Wilson's three R's (Respect, Reciprocity, Responsibility), and OCAP® data sovereignty principles.

## Architecture

```
medicine-wheel-ontology-core          ← Foundation (types, schemas, RDF vocabulary)
    ├── medicine-wheel-ceremony-protocol    ← Ceremony state & governance
    ├── medicine-wheel-narrative-engine     ← Beat sequencing & arc validation
    ├── medicine-wheel-graph-viz            ← Circular layout & visualization
    ├── medicine-wheel-relational-query     ← Query, traversal & audit
    ├── medicine-wheel-prompt-decomposition ← Intent extraction & PDE
    └── medicine-wheel-ui-components        ← React components
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

### [@medicine-wheel/narrative-engine](src/narrative-engine)
Beat sequencing, cadence validation, arc completeness scoring, timeline building, cycle orchestration, and RSIS narrative generators. Tracks four-directional balance and ceremony coverage.

- **Version:** 0.1.1
- **Dependencies:** `medicine-wheel-ontology-core`

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

## Specifications

RISE framework specifications for all packages are in [`rispecs/`](rispecs/). Start with [`medicine-wheel.spec.md`](rispecs/medicine-wheel.spec.md) for the system overview.

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


