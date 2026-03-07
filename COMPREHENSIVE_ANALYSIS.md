# MCP Medicine Wheel Server - Comprehensive Analysis

## Executive Summary

The Medicine Wheel is a monorepo containing **9 interconnected TypeScript packages** implementing an Indigenous-aligned relational ontology system grounded in:
- **Four Directions** (East, South, West, North) — circular, cyclic knowledge structures
- **Wilson's Three R's** (Respect, Reciprocity, Responsibility) — relational accountability
- **OCAP®** (Ownership, Control, Access, Possession) — Indigenous data sovereignty
- **Ceremonial Lifecycle** — phase-based protocol governance

**Core Architecture:**
```
ontology-core (foundation)
  ├── ceremony-protocol (phase transitions + governance)
  ├── narrative-engine (beat sequencing + arc validation)
  ├── relational-query (graph traversal + accountability audit)
  ├── prompt-decomposition (intent extraction + directional classification)
  ├── data-store (Redis persistence layer)
  ├── session-reader (agent session analytics)
  ├── graph-viz (circular SVG layout + visualization)
  └── ui-components (React components)
```

---

## Package Breakdown

### 1. **@medicine-wheel/ontology-core** (v0.1.4)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/ontology-core`

**Files:**
- `src/types.ts` — Core ontology types
- `src/constants.ts` — Direction definitions, OJIBWE names, ceremony types
- `src/schemas.ts` — Zod validation schemas
- `src/vocabulary.ts` — RDF vocabularies (6 custom namespaces)
- `src/queries.ts` — Semantic query helpers
- `src/index.ts` — Public exports

**Key Exports:**

#### Types (50+ types):
- **Direction Types:** `DirectionName`, `Direction`
- **Node Types:** `RelationalNode`, `NodeType` ('human', 'land', 'spirit', 'ancestor', 'future', 'knowledge')
- **Relational Types:** 
  - `RelationalEdge` — simple edge (from_id → to_id)
  - `Relation` — **first-class entity** (extends edge with ceremony context, OCAP flags, accountability tracking)
  - `RelationalObligation` — obligation categories (human, land, spirit, future)
- **OCAP Types:**
  - `OcapFlags` — ownership, control, access, possession, compliance tracking
  - `AccountabilityTracking` — Wilson scores (respect, reciprocity, responsibility), relations_honored, ceremony audit
- **Ceremony Types:** `CeremonyType`, `CeremonyLog`, `CeremonyGuidance`, `CeremonyPhase`
- **Narrative Types:** `NarrativeBeat`, `MedicineWheelCycle`, `TensionPhase`, `StructuralTensionChart`
- **RSIS Types:** `SunName`, `GovernanceProtectedPath`, `KinshipHubInfo`, `ReciprocityFlow`, `MedicineWheelView`

#### RDF Vocabulary (Namespaces):
```typescript
MW_NS    = 'https://ontology.medicine-wheel.dev/mw#'        // Core concepts
IDS_NS   = 'https://ontology.medicine-wheel.dev/ids#'       // Indigenous Data Sovereignty
OCAP_NS  = 'https://ontology.medicine-wheel.dev/ocap#'      // OCAP® governance
REL_NS   = 'https://ontology.medicine-wheel.dev/rel#'       // Relational accountability
CER_NS   = 'https://ontology.medicine-wheel.dev/cer#'       // Ceremony & protocol
BEAT_NS  = 'https://ontology.medicine-wheel.dev/beat#'      // Narrative beats
```

#### Constants:
- `DIRECTIONS` — Full Direction definitions (Ojibwe name, season, color, lifeStage, medicines, teachings, practices)
- `DIRECTION_COLORS` — RGB hex colors per direction
- `DIRECTION_SEASONS` — Season mapping (East→Spring, South→Summer, West→Fall, North→Winter)
- `DIRECTION_ACTS` — Act mapping (East→1, South→2, West→3, North→4)
- `SUN_NAMES` — RSIS thematic suns (NovelEmergence, CreativeActualization, WovenMeaning, FirstCause, EmbodiedPractice, SustainedPresence)
- `CEREMONY_PHASES` — ['opening', 'council', 'integration', 'closure']
- `PERSON_ROLES` — ['steward', 'contributor', 'elder', 'firekeeper']
- `RSIS_RELATION_TYPES` — ['STEWARDS', 'BORN_FROM', 'SERVES', 'GIVES_BACK_TO', 'ALIGNED_WITH', 'KINSHIP_OF']

#### Semantic Query Helpers (22 functions):
**Node Queries:**
- `nodesByDirection(nodes, direction)` — filter nodes by direction
- `nodesByType(nodes, type)` — filter nodes by type
- `nodeById(nodes, id)` — find node by ID

**Relational Traversal:**
- `relationsForNode(relations, nodeId)` — get all connected relations
- `relationsByType(relations, type)` — filter by relationship type
- `neighborIds(relations, nodeId)` — get neighbor IDs
- `traverseRelationalWeb(nodes, relations, startNodeId, maxDepth=3)` — BFS traversal

**Wilson Alignment Metrics:**
- `computeWilsonAlignment(accountability)` — average of (respect + reciprocity + responsibility) / 3
- `aggregateWilsonAlignment(relations)` — mean across collection
- `cycleWilsonAlignment(cycle, relations)` — alignment for a cycle
- `findAccountabilityGaps(relations, threshold=0.5)` — identify low-alignment relations

**OCAP® Compliance:**
- `checkOcapCompliance(ocap)` → `{ compliant: boolean, issues: string[] }`
- `auditOcapCompliance(relations)` → compliance summary

**Narrative Queries:**
- `beatsByDirection(beats, direction)` — beats in a direction
- `beatsByAct(beats, act)` — beats in an act
- `allDirectionsVisited(beats)` — check all 4 directions visited
- `ceremonyCount(ceremonies)` → `Record<DirectionName, number>`

**Relational Completeness:**
- `relationalCompleteness(nodeId, relations)` → obligation category coverage

#### Zod Schemas:
All types have corresponding Zod schemas for runtime validation (13 schemas total).

---

### 2. **@medicine-wheel/ceremony-protocol** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/ceremony-protocol`

**Files:**
- `src/index.ts` — Single file module

**Key Exports (7 functions):**

1. **CeremonyState Interface:**
   ```typescript
   interface CeremonyState {
     currentCycle: string;
     hostSun: SunName;
     phase: CeremonyPhase;
     startDate?: string;
     endDate?: string;
   }
   ```

2. **State Management:**
   - `loadCeremonyState(config: RSISConfig)` → CeremonyState | null
   - `nextPhase(current: CeremonyPhase)` → CeremonyPhase | null
   - `getPhaseFraming(phase)` → contextual guidance string

3. **Governance Enforcement:**
   - `checkGovernance(filePath, config)` → GovernanceProtectedPath | null
     - Uses glob pattern matching (supports `*` wildcards)
   - `isIndexExcluded(filePath, config)` → boolean
   - `checkCeremonyRequired(filePath, config)` → boolean
   - `getAccessLevel(filePath, config)` → GovernanceAccess

4. **Output Formatting:**
   - `formatGovernanceWarning(rule)` → warning string with authority + access level

**Pattern:** Lightweight protocol layer — no external state, all functions pure.

---

### 3. **@medicine-wheel/narrative-engine** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/narrative-engine`

**Files:**
- `src/index.ts` — Exports
- `src/sequencer.ts` — Beat ordering (7 functions)
- `src/arc.ts` — Arc validation (3 functions)
- `src/cadence.ts` — Cadence patterns (8 functions)
- `src/timeline.ts` — Timeline building
- `src/cycle.ts` — Cycle management
- `src/rsis-narrative.ts` — Narrative generators
- `src/types.ts` — Type definitions

**Key Exports (35+ exported items):**

#### Sequencer (7 functions):
- `sequenceBeats(beats)` → BeatPosition[] (sorted by act, then timestamp)
- `insertBeat(beats, newBeat, opts)` → BeatInsertResult
  - Validates: max beats per direction, duplicate act/direction, direction order
- `beatsByDirection(beats)` → Record<DirectionName, NarrativeBeat[]>
- `nextDirection(beats)` → DirectionName | null (spiral order)
- `currentAct(beats)` → number (highest act)
- `suggestNextBeat(beats)` → { direction, act }
- `spiralOrder(beats)` → reordered beats (east→south→west→north within acts)

#### Arc Validation (3 functions):
- `computeCompleteness(beats, ceremonies, relations)` → ArcCompleteness
  - Returns: directionsVisited, directionsMissing, beatsPerDirection, ceremoniesPerDirection, wilsonAlignment, ocapCompliant, completenessScore
- `validateArc(beats, ceremonies, relations)` → ArcValidationResult
  - Returns: violations (with severity), recommendations, valid flag
- `isArcComplete(beats)` → boolean

#### Arc Completeness Scoring:
```
completenessScore = 
  (directionScore * 0.3) +      // all 4 directions visited
  (ceremonyScore * 0.25) +      // ceremonies in all 4 directions
  (wilsonAlignment * 0.25) +    // relational accountability
  (balanceScore * 0.2)          // beat distribution
```

**Pattern:** Enforces narrative structure — four-direction cycles, four-act arcs, beat balance.

---

### 4. **@medicine-wheel/relational-query** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/relational-query`

**Files:**
- `src/index.ts` — Exports
- `src/query.ts` — Query builder (8 functions)
- `src/traversal.ts` — Graph traversal
- `src/audit.ts` — Accountability auditing
- `src/cypher.ts` — KuzuDB Cypher query builders
- `src/types.ts` — Filter, sort, pagination types

**Key Exports (24 exported items):**

#### Query Builder (8 functions):
- `filterNodes(nodes, filter)` → RelationalNode[]
  - Filter: type, direction, nameContains, createdAfter/Before
- `filterEdges(edges, filter)` → RelationalEdge[]
  - Filter: relationshipType, minStrength, ceremonyHonored, fromNode/toNode
- `filterRelations(relations, filter)` → Relation[]
  - Filter: direction, ceremonied, ocapCompliant, minWilsonAlignment, hasObligations
- `sortNodes(nodes, sort)` → RelationalNode[] (field: name, type, direction, updated_at, created_at)
- `paginate(items, { offset, limit })` → QueryResult<T>
- `filterByRelation(nodes, edges, targetNodeId)` → connected nodes
- `relationCounts(nodes, edges)` → Map<nodeId, count>
- `filterByMinRelations(nodes, edges, minRelations)` → filtered nodes

#### Traversal (3 functions):
- `traverse(nodes, relations, startNodeId, opts)` → TraversalResult
- `shortestPath(nodes, relations, startId, endId)` → TraversalPath | null
- `neighborhood(nodes, relations, nodeId, depth)` → TraversalResult

#### Audit (3 functions):
- `auditAccountability(relations)` → AccountabilityReport
- `isOcapCompliant(ocap)` → boolean
- `relationsNeedingAttention(relations, threshold)` → Relation[]

#### Cypher Builders (16 functions):
Query builders for KuzuDB RSIS integration:
- `queryStewards(userId)` — get stewards
- `queryCeremonyProvenance(ceremonyId)` — trace ceremony lineage
- `queryInquiries()` — all inquiries
- `queryKinshipHubs()`, `queryKinshipRelations()` — kinship data
- `queryDirectionAlignment(commitSha)` — direction classification
- `queryReciprocityFlows()` — reciprocity data
- `queryInquiriesBySun(sunName)` — filter by RSIS sun
- `queryCeremonies()` — all ceremonies
- `queryAllInquiries()` — comprehensive inquiry data
- Formatters: `formatReciprocityObservation()`, `formatDirectionObservation()`

**Pattern:** Fluent query API with RSIS KuzuDB integration for graph queries.

---

### 5. **@medicine-wheel/prompt-decomposition** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/prompt-decomposition`

**Files:**
- `src/index.ts` — Exports
- `src/decomposer.ts` — MedicineWheelDecomposer class (650+ lines)
- `src/relational_enricher.ts` — RelationalEnricher class
- `src/storage.ts` — .pde/ file I/O
- `src/types.ts` — Type definitions
- `src/index.browser.ts` — Browser build entry

**Key Exports:**

#### MedicineWheelDecomposer Class:
**Constructor Options:**
- `extractImplicit: boolean` — enable hedging language detection
- `ceremonialGuidance: boolean` — enable ceremonial guidance
- `minimumDirections: number` — minimum directions in output

**Methods:**
- `decompose(userPrompt)` → OntologicalDecomposition
  - Returns: primary intent, secondary intents, relational dependencies, directional insights, action items, ceremony guidance

**Decomposition Pipeline:**
1. **Direction Classification** — keyword-based (8 keywords per direction)
   - East: vision, goal, intention, want, need, desire, dream, imagine...
   - South: learn, research, investigate, understand, study, analyze, explore...
   - West: test, verify, validate, check, ensure, reflect, audit, quality...
   - North: implement, execute, deploy, run, build, code, script...

2. **Intent Extraction**
   - Primary intent (enum: `Urgency` — immediate, session, sprint, ongoing)
   - Secondary intents (actionable sub-goals)
   - Hedging language detection (implicit qualifications)

3. **Dependency Mapping**
   - Prerequisite analysis
   - Cross-direction dependencies
   - Obligation category inference

4. **Ceremony Guidance**
   - Phase-appropriate recommendations
   - Relational protocols
   - OCAP® compliance suggestions

**Output Type:**
```typescript
interface OntologicalDecomposition {
  id: string;
  prompt: string;
  primary: PrimaryIntent;
  secondary: SecondaryIntent[];
  dependencies: OntologicalDependency[];
  directions: OntologicalDirection[];
  insights: DirectionalInsight[];
  actions: ActionItem[];
  ceremonyGuidance?: CeremonyGuidance;
  context?: ExtractionContext;
  ambiguity?: AmbiguityFlag[];
}
```

#### RelationalEnricher Class:
- `enrich(decomposition, graph)` → EnrichmentResult
- Traverses relational web to:
  - Identify affected stakeholders
  - Uncover accountability gaps
  - Map obligation coverage
  - Suggest relational protocols

#### Storage Functions:
- `saveDecomposition(decomposition, outputDir)` — writes JSON + Markdown to .pde/
- `loadDecomposition(id, rootDir)` — loads from file
- `listDecompositions(rootDir)` — list all saved decompositions
- `decompositionToMarkdown(decomposition)` → formatted Markdown

**Pattern:** Hybrid symbolic/ontological PDE — keyword heuristics + directional inference + relational enrichment.

---

### 6. **@medicine-wheel/data-store** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/data-store`

**Files:**
- `src/index.ts` — Exports
- `src/connection.ts` — Redis connection management
- `src/store.ts` — CRUD operations (Nodes, Edges, Ceremonies)
- `src/session-link.ts` — Session-Ceremony linking
- `src/helpers.ts` — Generic Redis helpers

**Key Exports (48+ exported items):**

#### Connection Management:
- `getRedis()` → Redis client (singleton)
- `createRedisClient(options)` → Redis instance
- `disconnectRedis()` → cleanup
- `ConnectionOptions` interface

#### Store — CRUD Operations:

**Nodes (6 functions):**
- `createNode(node)` — stores with type/direction indexes
- `getNode(id)` → RelationalNode | null
- `getNodesByType(type)` → RelationalNode[]
- `getNodesByDirection(direction)` → RelationalNode[]
- `getAllNodes()` → RelationalNode[]
- `searchNodes(query)` → RelationalNode[]

**Edges (5 functions):**
- `createEdge(edge)` — from_id → to_id relationship
- `getEdge(fromId, toId)` → RelationalEdge | null
- `getRelatedNodes(nodeId)` → { incoming, outgoing }
- `updateEdgeCeremony(fromId, toId, ceremonyId)` — ceremony honor tracking
- (implied: deleteEdge, etc.)

**Ceremonies (7 functions):**
- `logCeremony(ceremony)` — record ceremony
- `getCeremony(id)` → CeremonyLog | null
- `getCeremoniesTimeline(direction, limit)` → CeremonyLog[]
- `getCeremoniesByDirection(direction)` → CeremonyLog[]
- `getCeremoniesByType(type)` → CeremonyLog[]
- `getAllCeremonies()` → CeremonyLog[]

**Accountability (3 functions):**
- `trackAccountability(nodeId, data)` → log Wilson scores, OCAP compliance
- `getAccountability(nodeId)` → AccountabilityData
- (implied: audit functions)

**Discovery (1 function):**
- `getRelationalWeb(nodeId)` → full relational context

#### Session-Ceremony Linking (4 functions):
- `linkSessionToCeremony(ceremonyId, sessionId)` — bidirectional link
- `unlinkSessionFromCeremony(ceremonyId, sessionId)` — remove link
- `getSessionsForCeremony(ceremonyId)` → string[]
- `getCeremoniesForSession(sessionId)` → string[]
- `getLinkMetadata(ceremonyId, sessionId)` → link context

#### Generic Redis Helpers (6 functions):
- `getAllFromSet(key)` → string[]
- `getHash(key)` → Record<string, string>
- `getAllHashes(pattern)` → hash collection
- `getSortedSetRange(key, min, max)` → items
- `setHash(key, data)` → void
- `addToSet(key, values)` → void
- `addToSortedSet(key, items, scores)` → void

**Pattern:** Lightweight Redis wrapper — no ORM, direct key-value + hash/set operations.

---

### 7. **@medicine-wheel/session-reader** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/session-reader`

**Files:**
- `src/index.ts` — Exports
- `src/sessions.ts` — Session reading (7 functions)
- `src/types.ts` — Session types

**Key Exports (15+ exported items):**

#### Types:
```typescript
interface SessionEvent {
  timestamp: string;
  type: string;  // e.g., 'message', 'tool_call', 'error'
  content?: unknown;
  icon?: string;
}

interface SessionAnalytics {
  toolUsage: Record<string, number>;
  errorCount: number;
  duration: number;  // milliseconds
  averageMessageLength: number;
}

interface SessionSummary {
  id: string;
  model: string;
  timestamp: string;
  totalEvents: number;
  analytics: SessionAnalytics;
}

interface SessionFilters {
  model?: string;
  since?: string;
  until?: string;
  limit?: number;
}
```

#### Session Operations (7 functions):
- `listSessions(filters)` → SessionSummary[]
- `getDistinctModels()` → string[]
- `getSessionSummary(sessionId)` → SessionSummary
- `getSessionEvents(sessionId)` → SessionEvent[]
- `getSessionDetail(sessionId)` → complete session with analytics
- `searchSessions(query)` → SessionSummary[]
- `readSessionFile(filePath)` → parsed JSONL session
- `getLatestEvents(sessionId, count)` → recent N events

**Data Source:** Reads JSONL files from `_sessiondata/` (Claude hooks integration)

**Pattern:** Zero-dependency session analytics — only Node.js built-ins.

---

### 8. **@medicine-wheel/graph-viz** (v0.1.3)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/graph-viz`

**Files:**
- `src/index.ts` — Exports
- `src/layout.ts` — Circular wheel layout (circular SVG positioning)
- `src/converters.ts` — Data conversion (nodes/edges → graph data)
- `src/rsis-viz.ts` — RSIS visualization (kinship, reciprocity, ceremony timelines)
- `src/types.ts` — Graph types
- `src/MedicineWheelGraph.tsx` — React component

**Key Exports (25+ exported items):**

#### Layout Engine (6 functions):
- `applyWheelLayout(data, config)` → positioned graph nodes
  - Four quadrants (East, South, West, North)
  - Angle ranges: East 315°–45°, South 45°–135°, West 135°–225°, North 225°–315°
- `DEFAULT_LAYOUT` — WheelLayoutConfig (300x300 center, 250 radius)
- `getQuadrantGeometries(config)` → QuadrantGeometry[]
- `quadrantArcPath(geometry)` → SVG path
- `curvedLinkPath(from, to)` → SVG Bézier curve
- `directionLabelPosition(geometry)` → x, y coordinates for label

#### Data Converters (4 functions):
- `nodesToGraphNodes(nodes)` → MWGraphNode[]
- `edgesToGraphLinks(edges)` → MWGraphLink[]
- `relationsToGraphLinks(relations)` → MWGraphLink[] (with ceremony status)
- `buildGraphData(nodes, edges)` → MWGraphData

#### RSIS Visualization (6 functions):
- `toKinshipGraphLayout(hubs, relations)` → kinship graph
- `toReciprocityFlowDiagram(flows)` → flow diagram
- `toDirectionWheelData(commitCounts)` → direction segment data
- `toCeremonyTimelineData(ceremonies)` → timeline events
- `toMermaidDiagram(data)` → Mermaid graph syntax

#### React Component:
- `MedicineWheelGraph` — SVG visualization with React bindings
  - Renders nodes in circular layout
  - Animated links with ceremony indicators
  - OCAP® compliance badges
  - Interactive tooltips

**Pattern:** SVG-based circular layout — D3-compatible positioning, React-native rendering.

---

### 9. **@medicine-wheel/ui-components** (v0.1.2)
**Path:** `/workspace/repos/jgwill/medicine-wheel/src/ui-components`

**Files:**
- `src/index.ts` — Exports
- `src/DirectionCard.tsx` — Direction information card
- `src/BeatTimeline.tsx` — Beat sequencing timeline
- `src/NodeInspector.tsx` — Node detail panel
- `src/OcapBadge.tsx` — OCAP® compliance indicator
- `src/WilsonMeter.tsx` — Wilson alignment gauge

**Key Exports (5 components):**

1. **DirectionCard** — displays direction metadata
   - Ojibwe name, season, color, life stage, medicines, teachings
   - Props: `direction: Direction`, `onClick?: () => void`

2. **BeatTimeline** — horizontal timeline of narrative beats
   - Sorted by act, colored by direction
   - Props: `beats: NarrativeBeat[]`

3. **NodeInspector** — expandable node detail panel
   - Type, direction, metadata, connected relations
   - Props: `node: RelationalNode`

4. **OcapBadge** — visual OCAP® compliance indicator
   - Green (compliant) / Red (non-compliant)
   - Props: `ocap: OcapFlags`, `size?: 'sm'|'md'|'lg'`

5. **WilsonMeter** — gauge chart (R-R-R scores)
   - Three-ring gauge: respect, reciprocity, responsibility
   - Props: `accountability: AccountabilityTracking`

**Pattern:** Pure functional React components with ontology-core types.

---

## Key Architectural Patterns

### 1. **Relational-First Ontology**
- Relations are **first-class entities**, not just labeled edges
- Every Relation carries:
  - OCAP® governance flags
  - Wilson accountability metrics
  - Ceremony context
  - Obligation categories

### 2. **Four-Direction Structuring**
- Every node/beat/ceremony aligned to one of four directions
- Directions map to:
  - **Acts** (1–4) in narrative arcs
  - **Seasons** (Spring, Summer, Fall, Winter)
  - **Life stages** (childhood, adolescence, adulthood, elderhood)
  - **Ojibwe names** (Waabinong, Zhaawanong, Epangishmok, Kiiwedinong)

### 3. **Governance as Code**
- Ceremony phases enforce protocol (opening → council → integration → closure)
- Protected paths require ceremonial review before changes
- Governance patterns use glob-style matching

### 4. **Accountability Scoring**
- Wilson alignment = (respect + reciprocity + responsibility) / 3
- Per-relation, aggregate, and cycle-level scores
- OCAP® compliance audit with issue categorization

### 5. **Ontology-Enriched PDE**
- Prompt decomposition uses **direction keywords** for classification
- Relational enricher adds context from graph traversal
- Outputs include ceremony guidance + obligation mapping

### 6. **Circular Layout Visualization**
- Medicine Wheel positioned on SVG with 4 quadrants
- Nodes placed by direction with optional jitter
- Links colored/styled by ceremony status
- RSIS visualizations (kinship graphs, reciprocity flows, timelines)

### 7. **Monorepo Layering**
- **ontology-core** at bottom (types, validation, constants)
- **Protocol layers** (ceremony, narrative) consume core types
- **Query/traversal** (relational-query) operates on decorated types
- **UI/visualization** (graph-viz, ui-components) render from core + protocol types
- **Storage** (data-store) persists core entities
- **Analytics** (session-reader) aggregates session data

---

## Data Flow Example: Prompt Decomposition → Action → Ceremony

```
User Prompt
  ↓ MedicineWheelDecomposer
  ├─ Classify direction (east/south/west/north)
  ├─ Extract primary + secondary intents
  ├─ Map dependencies
  └─ Generate ceremony guidance
  ↓ OntologicalDecomposition
  ↓ RelationalEnricher (traverse graph)
  ├─ Find affected nodes
  ├─ Identify accountability gaps
  └─ Suggest relational protocols
  ↓ Action items
  ↓ Governance check (ceremony-protocol)
  ├─ Check protected paths
  ├─ Determine access level
  └─ Return access warning if needed
  ↓ Relational-Query builder
  ├─ Filter nodes/edges/relations
  ├─ Compute Wilson alignment
  └─ Audit OCAP® compliance
  ↓ Data-Store persistence
  ├─ Create nodes + edges
  ├─ Log ceremony
  └─ Track accountability
```

---

## Integration Points

### Redux Integration (implicit in llms.txt)
- Reducer patterns for state updates
- Normalized entity storage
- Selector functions for queries

### MCP (Model Context Protocol) Server
- Likely exposes tools based on core functions
- Resources for RSIS config, ceremonies, cycles
- Prompts for ceremonial guidance

### RSIS (Relational Structures for Inquiry and Stewardship)
- KuzuDB integration via Cypher builders
- Kinship hub mappings
- Reciprocity flow visualization
- Direction alignment classification for commits

### Redis Persistence
- Session-ceremony linking
- Ceremony timelines
- Node/edge indexing (type, direction)
- Accountability tracking

---

## File Organization

```
/workspace/repos/jgwill/medicine-wheel/
├── src/
│   ├── ontology-core/
│   │   ├── src/{types,constants,schemas,vocabulary,queries}.ts
│   │   ├── package.json (v0.1.4)
│   │   ├── tsconfig.json
│   │   └── dist/ (compiled)
│   ├── ceremony-protocol/ (v0.1.3)
│   ├── narrative-engine/ (v0.1.3)
│   ├── relational-query/ (v0.1.3)
│   ├── prompt-decomposition/ (v0.1.3)
│   ├── data-store/ (v0.1.3)
│   ├── session-reader/ (v0.1.3)
│   ├── graph-viz/ (v0.1.3)
│   ├── ui-components/ (v0.1.2)
│   └── _/ (stub)
├── package.json (root monorepo)
├── tsconfig.json (root)
├── README.md
├── mcp-config.example.json
├── rispecs/ (RISE specifications)
├── node_modules/
└── dist/
```

---

## Dependencies Summary

**All packages depend on:**
- `typescript` ^5.3.0 – ^5.7.0
- `@types/node` ^20.10.0

**Core ontology:**
- `zod` ^3.23.0 (for schema validation)

**Data store:**
- `redis` ^4.6.0 (Redis client)

**Graph viz:**
- `react` ^18.0.0 || ^19.0.0 (peer dependency)
- `react-dom` (peer dependency)

**Session reader:**
- None (Node.js built-ins only)

---

## Key Metrics

- **9 packages** total
- **50+ type definitions** (ontology-core alone)
- **8 RDF namespaces** (MW, IDS, OCAP, REL, CER, BEAT, + standard Web Ontology)
- **22 semantic query helpers** (in queries.ts)
- **35+ exported functions** (narrative-engine)
- **48+ exported items** (data-store)
- **6 UI React components**
- **4 ceremonial phases**
- **4 Wilson accountability metrics** (scored 0–1)
- **4 OCAP® governance principles**
- **6 RSIS thematic suns**
- **50+ TypeScript source files**

