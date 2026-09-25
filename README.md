# Medicine Wheel

> An experimental TypeScript framework for relational healing, ceremonial inquiry, and Indigenous-aligned software development — grounded in the Four Directions, Wilson's three R's (Respect, Reciprocity, Responsibility), and OCAP® data sovereignty principles.

> [!WARNING]
> **Experimental alpha.** APIs change between patch versions, packages appear and
> their boundaries move, and storage shapes are still settling. Published in the
> open so the work can be examined and improved — pin exact versions, and read
> [ALPHA.md](./ALPHA.md) before depending on any of it.

## News

31 published packages: the app, 29 libraries and the MCP server (85 tools over
stdio and StreamableHTTP).

Recently landed:

- **`@medicine-wheel/client`** — one typed HTTP door to a running wheel, with
  the wheel's paging honesty carried through to the caller.
- **`@medicine-wheel/community-identity`** — who is in the circle: people,
  roles, circles, memberships, invitations and self-issued credentials.
- **`@medicine-wheel/honcho`** — the wheel's projection into
  [Honcho](https://honcho.dev). Set `HONCHO_URL` and every stored beat,
  ceremony and diary entry projects on write.
- **A ceremony knows its episode, its circle and what it closes**, and a beat
  knows who spoke and who witnessed.
- **Read routes page honestly** — `count`, `total`, `matched`, `truncated`
  instead of a silently cut list — and `GET /api/nodes/{id}/web` serves one
  node's neighbourhood.
- **An episodes surface and a lineage layout** in the app: the chronicle as a
  spine you read left to right.


## Architecture

```
@medicine-wheel/ontology-core          ← Foundation (types, schemas, RDF vocabulary)
    ├── @medicine-wheel/ceremony-protocol    ← Ceremony state & governance
    ├── @medicine-wheel/fire-keeper          ← Ceremony coordination agent
    ├── @medicine-wheel/community-review     ← Elder review & consensus
    ├── @medicine-wheel/community-identity   ← People, roles, circles, memberships
    ├── @medicine-wheel/consent-lifecycle    ← Relational consent lifecycle
    ├── @medicine-wheel/narrative-engine     ← Beat sequencing & arc validation
    ├── @medicine-wheel/importance-unit      ← Relational unit of knowledge
    ├── @medicine-wheel/relational-index     ← Four-source epistemic indexing
    ├── @medicine-wheel/transformation-tracker ← Wilson validity tracking
    ├── @medicine-wheel/graph-viz            ← Circular layout & visualization
    ├── @medicine-wheel/relational-query     ← Query, traversal & audit
    ├── @medicine-wheel/prompt-decomposition ← Intent extraction & PDE
    ├── @medicine-wheel/ui-components        ← React components
    ├── @medicine-wheel/client               ← Typed HTTP door to a running wheel
    ├── @medicine-wheel/data-store           ← Shared data access (Redis)
    ├── @medicine-wheel/data-store-postgres  ← PostgreSQL / Neon provider scaffold
    ├── @medicine-wheel/storage-provider     ← Canonical persistence contract (JSONL ⇄ Neon)
    ├── @medicine-wheel/infra                ← Hosts, tenants, services, port bindings as facets
    ├── @medicine-wheel/honcho               ← The wheel's projection into Honcho, memory that reasons
    ├── @medicine-wheel/perception-layer     ← Witness recordings as typed perceptual events
    ├── @medicine-wheel/narrative-cluster    ← Events → clusters → beats → Film Edit Brief
    ├── @medicine-wheel/ceremonial-diary     ← A participant's voice across the Five Phases
    ├── @medicine-wheel/github-ceremony      ← GitHub webhooks as ceremony beads
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

### [@medicine-wheel/community-identity](src/community-identity)
Who is in the circle, so a wheel can tell two people apart. A person is a `human` node with `metadata.kind: "person"` and a role, a circle is a `circle` node, membership is a `member_of` edge. Roles run `participant → emerging_guide → ceremony_facilitator → firekeeper → admin`, with `story_keeper` parallel to firekeeper and `companion_ai` / `integration_ai` beside them, each carrying a permission map. Invitations, credentials and the audit trail stay with the consumer — hashed, never on the wheel.

- **Dependencies:** `@medicine-wheel/ontology-core`, `zod`

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

### [@medicine-wheel/client](src/client)
The typed HTTP door to a running wheel — nodes, edges, ceremonies, beats and the ceremonial diary. The wheel's paging honesty (`count`, `total`, `matched`, `truncated`) is carried through to the caller, `limit: 'all'` asks for the whole store, and errors fail fast: an unreachable wheel throws with status 502, a refusal carries the wheel's status and body. No retry.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/storage-provider`

### [@medicine-wheel/data-store](src/data-store)
Shared Redis data-access layer — connection management (Upstash, Vercel KV, local), Node/Edge/Ceremony/Accountability CRUD, session-ceremony linking, and generic Redis helpers.

- **Dependencies:** `@medicine-wheel/ontology-core`, `redis`

### [@medicine-wheel/session-reader](src/session-reader)
Session event reader — JSONL parsing, session summaries, analytics extraction, and search across agent session data. Zero external dependencies.

- **Dependencies:** None (Node.js built-ins only)

### [@medicine-wheel/storage-provider](src/storage-provider)
The canonical persistence contract. One `StorageProvider` interface with two first-class equals behind it — a JSONL file store for a project's `.mw/store/` and a Neon (Postgres) store — plus typed relational refusals and the capture, inquiry-weave and plan-perspective registries. The app, the MCP server and every package that persists go through this door.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@neondatabase/serverless`, `@upstash/redis`

### [@medicine-wheel/data-store-postgres](src/data-store-postgres)
Minimal `pg` scaffold — shared pool management and provider-ready storage entrypoints. Explicitly not a competing provider architecture; `storage-provider` owns the contract.

- **Dependencies:** `@medicine-wheel/ontology-core`, `pg`

### [@medicine-wheel/infra](src/infra)
Typed infrastructure facets — hosts, tenants, services and port bindings — keyed by relational node id, with `detectPortConflicts` over declared ∪ observed state. Types plus one pure function: zero I/O, zero persistence. A running service is registered as a `knowledge` node carrying `metadata.kind: "service"`, never as a new node type.

- **Dependencies:** `@medicine-wheel/ontology-core`, `zod`

### [@medicine-wheel/honcho](src/honcho)
The wheel's projection into [Honcho](https://honcho.dev), memory that reasons. The wheel stays canonical; Honcho holds what the history has come to mean about each peer. A beat becomes a message from its speaker in the session of its ceremony, a speaker's evolving representation is recalled before they speak again, and a derived conclusion returns as a `knowledge` node carrying `metadata.kind: "memory_projection"` with its status and provenance. Zero dependencies, `/v3` only, configured by `HONCHO_URL`. Nothing is filtered here.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/perception-layer](src/perception-layer)
Eyes and ears of agent-supported film production — witness a belt-device recording as typed perceptual events and seed a production knowledge graph.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/narrative-cluster](src/narrative-cluster)
Narrative Cluster Processor — turn witnessed perceptual events or rushes into thematic clusters, direction-aligned narrative beats, and a Film Edit Brief with EDL markers.

- **Dependencies:** `@medicine-wheel/ontology-core`

### [@medicine-wheel/ceremonial-diary](src/ceremonial-diary)
A participant's voice across the Five-Phase ceremonial methodology — intention, observation and reflection entries with pattern detection, statistics, markdown export, and optional projection into the chronicle wheel.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/storage-provider`

### [@medicine-wheel/github-ceremony](src/github-ceremony)
Witness GitHub webhook events (issues, pull requests, merges, commits) through a ceremonial lens and record them as relational ceremony beads. Pure, framework-free functions over a parsed payload and a storage provider.

- **Dependencies:** `@medicine-wheel/ontology-core`, `@medicine-wheel/storage-provider`

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

| Package / topic | Spec |
|---------|------|
| System Overview | [medicine-wheel.spec.md](rispecs/medicine-wheel.spec.md) |
| ontology-core | [ontology-core.spec.md](rispecs/ontology-core.spec.md) |
| ceremony-protocol | [ceremony-protocol.spec.md](rispecs/ceremony-protocol.spec.md) |
| fire-keeper | [fire-keeper.spec.md](rispecs/fire-keeper.spec.md) |
| community-review | [community-review.spec.md](rispecs/community-review.spec.md) |
| community-identity | [community-identity.spec.md](rispecs/community-identity.spec.md) |
| consent-lifecycle | [consent-lifecycle.spec.md](rispecs/consent-lifecycle.spec.md) |
| narrative-engine | [narrative-engine.spec.md](rispecs/narrative-engine.spec.md) · [narrative-beats-lifecycle.spec.md](rispecs/narrative-beats-lifecycle.spec.md) |
| importance-unit | [importance-unit.spec.md](rispecs/importance-unit.spec.md) |
| relational-index | [relational-index.spec.md](rispecs/relational-index.spec.md) |
| transformation-tracker | [transformation-tracker.spec.md](rispecs/transformation-tracker.spec.md) |
| graph-viz | [graph-viz.spec.md](rispecs/graph-viz.spec.md) |
| relational-query | [relational-query.spec.md](rispecs/relational-query.spec.md) · [relational-web-package.spec.md](rispecs/relational-web-package.spec.md) |
| prompt-decomposition | [prompt-decomposition.spec.md](rispecs/prompt-decomposition.spec.md) · [decomposition-strategies.spec.md](rispecs/decomposition-strategies.spec.md) |
| ui-components | [ui-components.spec.md](rispecs/ui-components.spec.md) |
| client | [client.spec.md](rispecs/client.spec.md) |
| storage-provider | [storage-provider.spec.md](rispecs/storage-provider.spec.md) · [storage-provider-abstraction.spec.md](rispecs/storage-provider-abstraction.spec.md) |
| data-store | [data-store.spec.md](rispecs/data-store.spec.md) |
| data-store-postgres | [data-store-postgres.spec.md](rispecs/data-store-postgres.spec.md) |
| session-reader | [session-reader.spec.md](rispecs/session-reader.spec.md) |
| infra | [infrastructure-topology-ui.spec.md](rispecs/infrastructure-topology-ui.spec.md) |
| perception-layer | [perception-layer.spec.md](rispecs/perception-layer.spec.md) |
| narrative-cluster | [narrative-cluster.spec.md](rispecs/narrative-cluster.spec.md) |
| captures & recordings | [capture-registry.spec.md](rispecs/capture-registry.spec.md) |
| inquiry weaves | [inquiry-weave-registration.spec.md](rispecs/inquiry-weave-registration.spec.md) |
| plans & insights | [plan-insight-perspective-registration.spec.md](rispecs/plan-insight-perspective-registration.spec.md) |
| council & community | [council-record.spec.md](rispecs/council-record.spec.md) · [community-choice.spec.md](rispecs/community-choice.spec.md) |
| reading & scope | [reading-layer.spec.md](rispecs/reading-layer.spec.md) · [workspace-scope-and-access.spec.md](rispecs/workspace-scope-and-access.spec.md) |
| film production | [relational-production-protocol.spec.md](rispecs/relational-production-protocol.spec.md) · [film-production-upgrades.spec.md](rispecs/film-production-upgrades.spec.md) |
| kinship & bridges | [kinship-graph.spec.md](rispecs/kinship-graph.spec.md) · [narrative-medicine-wheel-bridge.spec.md](rispecs/narrative-medicine-wheel-bridge.spec.md) · [article-publishing-pipeline.spec.md](rispecs/article-publishing-pipeline.spec.md) |

## LLM Integration

- [`llms.txt`](llms.txt) — Quick navigation for LLMs
- [`llms-full.txt`](llms-full.txt) — Exhaustive reference with code samples
- [`CLAUDE.md`](CLAUDE.md) — Repo laws for agents: versioning, the topological
  workspace order, what `mw skill run` does not do, and how a running service is
  registered on the wheel
- [`RELEASING.md`](RELEASING.md) — Publishing is not deploying. Publish, install
  globally, run the installed binary, then bump

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
mw ceremony list
mw beat list
mw web <node-id> [depth]          # one node's neighbourhood
mw chart list                     # structural tension charts
mw validate wilson "<description>"  # validators (wilson, ocap, accountability, bridge)
mw orient "<outcome>"             # the question asked before the work
```

The `mw` CLI uses HTTP against the running server by default (`MW_API_URL`,
default `http://localhost:8040`); MCP fallback is available via a local
`MW_MCP_PATH`. `mw skill view` and `mw skill install` work with the shipped
skill definitions — `mw skill run` exits 3 by design, because the skills are
documents and there is no runtime that executes them.

### MCP server
```bash
# stdio — local JSONL store under .mw/store/
npx @medicine-wheel/mcp

# server-mediated store — the same relational state the app holds
MW_API_URL=http://localhost:8040 npx @medicine-wheel/mcp
```

85 tools over stdio and StreamableHTTP (`POST /api/mcp` on the running app).

### Honcho projection (optional)
```bash
HONCHO_URL=http://localhost:8133        # switches the river on
HONCHO_WORKSPACE_ID=medicine-wheel      # default
# HONCHO_API_KEY when Honcho asks for auth
```

With `HONCHO_URL` set, every stored beat, ceremony and diary entry projects into
Honcho on write, in the background. `GET /api/health` reports `honcho.enabled`.
A projection never delays the wheel's answer, and a Honcho that is down is a
line on stderr, not an error to the writer. The record is not lost: its
reference waits in `honcho-pending.jsonl` beside the store and is sent again on
start, every five minutes, and after any projection that gets through —
`honcho.pending` counts what waits. A running server holds its old
build and its old environment — restart it for either to take effect.

## License

Indigenous Knowledge Stewardship License (IKSL) v1.0 MIT Derived   see [LICENSE](LICENSE)
