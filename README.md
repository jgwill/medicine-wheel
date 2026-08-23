# Medicine Wheel

> An experimental TypeScript framework for relational healing, ceremonial inquiry, and Indigenous-aligned software development — grounded in the Four Directions, Wilson's three R's (Respect, Reciprocity, Responsibility), and OCAP® data sovereignty principles.

> [!WARNING]
> **Experimental alpha.** APIs change between patch versions, packages appear and
> their boundaries move, and storage shapes are still settling. Published in the
> open so the work can be examined and improved — pin exact versions, and read
> [ALPHA.md](./ALPHA.md) before depending on any of it.

## News

The suite now includes an interactive app, CLI, MCP server, and PostgreSQL/Neon
storage alongside its composable libraries.


## Architecture

```
@medicine-wheel/ontology-core          ← Foundation (types, schemas, RDF vocabulary)
    ├── @medicine-wheel/ceremony-protocol    ← Ceremony state & governance
    ├── @medicine-wheel/fire-keeper          ← Ceremony coordination agent
    ├── @medicine-wheel/community-review     ← Elder review & consensus
    ├── @medicine-wheel/consent-lifecycle    ← Relational consent lifecycle
    ├── @medicine-wheel/narrative-engine     ← Beat sequencing & arc validation
    ├── @medicine-wheel/importance-unit      ← Relational unit of knowledge
    ├── @medicine-wheel/relational-index     ← Four-source epistemic indexing
    ├── @medicine-wheel/transformation-tracker ← Wilson validity tracking
    ├── @medicine-wheel/graph-viz            ← Circular layout & visualization
    ├── @medicine-wheel/relational-query     ← Query, traversal & audit
    ├── @medicine-wheel/prompt-decomposition ← Intent extraction & PDE
    ├── @medicine-wheel/ui-components        ← React components
    ├── @medicine-wheel/data-store           ← Shared data access
    └── @medicine-wheel/session-reader       ← Session event data reader

@medicine-wheel/creative-orientation      ← The question asked before the work
    ├── @medicine-wheel/creative-problem-solving ← Signpost — re-exports the above
    ├── @medicine-wheel/gap-analysis        ← The fire path
    └── @medicine-wheel/brainstorming       ← Idea → design, through human gates
```

> **Is there a prior state you are restoring?** Named one — this is a fire, and
> gap analysis is the right instrument. Named none — you are creating, and
> structural tension is. `mw orient "<outcome>"` asks it from the command line.

## Methodology: [RISE Framework](https://llms.jgwill.com/docs/rise-framework.html)

This project utilizes the **RISE** methodology:
- **Reverse Engineering**: Deconstructing existing patterns to find relational roots.
- **Intent**: Establishing ceremonial purpose before action.
- **Specifications**: Explicit relational obligations as system requirements.
- **Exportation**: Sharing wisdom back to the community.

## Packages

The sections below introduce the core building blocks. The root
[`package.json`](package.json) workspace list is the current inventory of the
full suite.

### [@medicine-wheel/ontology-core](src/ontology-core)
Core ontology layer — 50+ TypeScript types, Zod validation schemas, RDF vocabulary (6 custom namespaces), canonical constants (Ojibwe names, seasons, direction colors), and semantic query helpers (Wilson alignment, OCAP® compliance, relational traversal).

- **Dependencies:** `zod`

### [@medicine-wheel/ceremony-protocol](src/ceremony-protocol)
Ceremony lifecycle protocol — manages ceremony state, four-phase transitions (opening → council → integration → closure), governance enforcement for protected paths, and ceremony-required change detection.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/fire-keeper](src/fire-keeper)
Fire Keeper coordination agent — tends the ceremony fire, ensures relational integrity through gating conditions, permission tier escalation, and maintains Wilson alignment as an active agent that evaluates, gates, routes, and escalates.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/ceremony-protocol`

### [@medicine-wheel/community-review](src/community-review)
Community-based ceremonial review protocol — implements Wilson's validation through Elder review circles, consensus-seeking, talking circle protocol, and relational accountability assessment.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/ceremony-protocol`, `zod`

### [@medicine-wheel/consent-lifecycle](src/consent-lifecycle)
Ongoing relational consent lifecycle — consent as a living relational obligation with lifecycle tracking, renewal, renegotiation, withdrawal cascades, and community-level consent protocols.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/ceremony-protocol`, `zod`

### [@medicine-wheel/narrative-engine](src/narrative-engine)
Beat sequencing, cadence validation, arc completeness scoring, timeline building, cycle orchestration, and RSIS narrative generators. Tracks four-directional balance and ceremony coverage.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/importance-unit](src/importance-unit)
ImportanceUnit — the relational unit of knowledge in Wilson's epistemology. Carries epistemic weight, source dimensions (Land/Dream/Code/Vision), circle depth tracking, and accountability links. Dream-state knowledge starts at 0.85+ weight; rational-filtered inputs start lower.

- **Dependencies:** `@medicine-wheel/ontology-core`, `zod`

### [@medicine-wheel/relational-index](src/relational-index)
Four-source epistemic dimensional indexing — Land, Dream, Code, Vision traversal with cross-dimensional mapping, convergence/tension detection, and spiral depth metrics.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/transformation-tracker](src/transformation-tracker)
Research transformation tracking — Wilson validity criterion: "If research doesn't change you, you haven't done it right." Tracks researcher growth, community impact, relational shifts, reciprocity balance, and seven-generation sustainability.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/ceremony-protocol`, `zod`

### [@medicine-wheel/graph-viz](src/graph-viz)
Medicine Wheel circular graph visualization — four-direction node positioning, ceremony-aware edges, OCAP® indicators, SVG path generation, data converters, and RSIS visualization utilities (kinship graphs, reciprocity flows, Mermaid export).

- **Dependencies:** `@medicine-wheel/ontology-core`
- **Peer:** `react`

### [@medicine-wheel/relational-query](src/relational-query)
Query builder for relational webs — node/edge filtering, ceremony-bounded BFS traversal, OCAP®-compliant path walking, accountability auditing, shortest path, neighborhood discovery, and KuzuDB Cypher query builders.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/prompt-decomposition](src/prompt-decomposition)
Ontology-enriched prompt decomposition — Four Directions classification, implicit intent extraction from hedging language, dependency mapping, ceremony guidance, action stacking, and narrative beat generation.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/ui-components](src/ui-components)
React UI component library — `DirectionCard`, `BeatTimeline`, `NodeInspector`, `OcapBadge`, `WilsonMeter`. All components use ontology-core types for type-safe, culturally grounded interfaces.

- **Dependencies:** `@medicine-wheel/ontology-core`
- **Peer:** `react`

### [@medicine-wheel/data-store](src/data-store)
Shared Redis data-access layer — connection management (Upstash, Vercel KV, local), Node/Edge/Ceremony/Accountability CRUD, session-ceremony linking, and generic Redis helpers.

- **Dependencies:** `@medicine-wheel/ontology-core`, `redis`

### [@medicine-wheel/session-reader](src/session-reader)
Session event reader — JSONL parsing, session summaries, analytics extraction, and search across agent session data. Zero external dependencies.

- **Dependencies:** None (Node.js built-ins only)

### [@medicine-wheel/creative-orientation](src/creative-orientation)
The orientation question, asked before the work: *is there a prior state you are restoring?* Yes — this is a fire, route to gap analysis. No — you are creating, route to structural tension. Reads the claim the caller supplies; advises where phrasing and situation disagree, and never refuses.

- **Dependencies:** None (Node.js built-ins only)

### [@medicine-wheel/creative-problem-solving](src/creative-problem-solving)
Signpost package — re-exports `@medicine-wheel/creative-orientation` and adds `THE_QUESTION`. Holds no logic of its own. It exists because "creative problem solving" is the name people look for, and a signpost carrying the traveller's name is how they find the door.

- **Dependencies:** `@medicine-wheel/creative-orientation`

### [@medicine-wheel/gap-analysis](src/gap-analysis)
Problem-solving built properly for when something worked and stopped — evidenced baseline, observation, difference, verifiable elimination steps. Root cause, incidents, regressions, troubleshooting. The baseline requirement is what separates a fire from a creating act.

- **Dependencies:** `@medicine-wheel/creative-orientation`

### [@medicine-wheel/brainstorming](src/brainstorming)
Idea into committed design through approval gates a human holds — `explore → clarify → approaches → design → spec → review → plan`. Every outcome it emits, including its own multiple-choice questions, passes the orientation question before it is spoken.

- **Dependencies:** `@medicine-wheel/creative-orientation`

## Specifications

RISE framework specifications are in [`rispecs/`](rispecs/). Start with [`medicine-wheel.spec.md`](rispecs/medicine-wheel.spec.md) for the system overview.

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

### Development
This is a monorepo using npm workspaces.

```bash
# Build all packages
npm run build:packages

# Start development server (Next.js)
npm run dev
```

### Installation
```bash
# Install individual packages (from registry when published)
npm install @medicine-wheel/ontology-core
npm install @medicine-wheel/narrative-engine
```

### App package CLI
```bash
# Install the published app package
npm install -g @medicine-wheel/app

# Start the server against the current directory's .mw/store
mwsrv -D ./

# Start the server in Docker with the published image
mwsrv --docker -D /src/myapp

# Talk to the running server
mw status
mw directions
mw node list
```

The `mw` CLI uses HTTP against the running server by default; MCP fallback is
available via a local `MW_MCP_PATH`.

## License

MIT  see [LICENSE](LICENSE)
