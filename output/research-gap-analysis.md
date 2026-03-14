# Research: Relational Web Gap Analysis — Wilson × Medicine Wheel

> **Date:** 2026-03-14
> **Agent Role:** Cross-cutting relational web analyst
> **Scope:** Gaps, missing pieces, new package proposals
> **Sources:** 12 rispecs, 4 source files, 3 PDE artefacts, MCP server tools, architecture docs

---

## Executive Summary

The Medicine Wheel developer suite covers approximately **55–60%** of Shawn Wilson's complete Indigenous Research Paradigm from *Research Is Ceremony*. The existing nine packages build a strong **structural foundation** — Four Directions, Wilson's Three R's, OCAP® governance, ceremony phases, and relational-first ontology are well-encoded. However, the suite has a critical **relational depth gap**: it excels at *representing* relationships but lacks mechanisms for **tracking how relationships transform over time**, **maintaining ceremony as a living process** (not just state transitions), and **honoring the six full relational categories** Wilson defines (People, Land, Cosmos, Ancestors, Future Generations, Ideas).

### The Three Biggest Gaps

1. **No Fire Keeper Package** — The fire-keeper-agent-spec.md exists as an external artefact (384 lines, fully specified with message types, decision points, ceremony state tracking, and relational check-back protocol) but has **zero presence** in the medicine-wheel package suite. This is the single most important missing piece: Wilson's ceremony requires a **living maintainer**, not just state objects.

2. **No Importance Unit / Relational Indexing System** — The ImportanceUnit schema (177-line JSON Schema with `source` dimensions of Land/Dream/Code/Vision, `circleDepth`, `epistemicWeight`, `accountabilityLinks`, `ceremonyState`, and `axiologicalPillar`) exists as an external artefact but is not implemented in any package. This is Wilson's core epistemological mechanism — how knowledge is **weighted, circled, deepened, and relationally indexed**.

3. **No Transformation Tracking** — Wilson's central claim is: *"If research doesn't change you, you haven't done it right."* No package tracks researcher transformation, community impact, or relational shift over time. The system measures compliance (Wilson alignment scores) but not **growth**.

### Coverage by Wilson's Four Pillars

| Pillar | Coverage | Assessment |
|--------|----------|------------|
| **Ontology** (Relational Reality) | 75% | Strong types, first-class relations, but land/cosmos/ancestor relations lack depth |
| **Epistemology** (Relational Knowing) | 45% | Narrative knowing good; dream-state, land-based, and intergenerational knowing absent |
| **Axiology** (Relational Accountability) | 65% | Three R's and OCAP implemented; consent is binary not ongoing; no value-gating |
| **Methodology** (Research as Ceremony) | 50% | Phase transitions exist; ceremony-as-living-process, community review, and transformation tracking absent |

---

## Complete Gap Map

| # | Wilson Concept | Package(s) | Quality | Gap Type | Notes |
|---|---------------|-----------|---------|----------|-------|
| 1 | **Relational Ontology** — things exist only in relationships | ontology-core | **Full** | — | `Relation` is a first-class entity with obligations, ceremony context, accountability tracking. Comment in types.ts: "relations are beings in their own right" |
| 2 | **Four Directions** — East/South/West/North as organizing principle | ontology-core, all packages | **Full** | — | Deeply embedded throughout: DirectionName type, Direction interface with Ojibwe names, seasons, medicines, teachings, practices |
| 3 | **Wilson's Three R's** — Respect, Reciprocity, Responsibility | ontology-core, relational-query | **Full** | — | `AccountabilityTracking` interface with 0-1 scores, `computeWilsonAlignment()`, `aggregateWilsonAlignment()`, `findAccountabilityGaps()` |
| 4 | **OCAP® Principles** — Ownership, Control, Access, Possession | ontology-core, relational-query | **Full** | — | `OcapFlags` interface, `checkOcapCompliance()`, `auditOcapCompliance()`, dedicated OCAP RDF namespace |
| 5 | **Indigenous Data Sovereignty** | ontology-core (vocabulary) | **Full** | — | `IDS_NS` RDF namespace with `communityAuthority`, `treatyRelationship`, `territorialScope`, `protocolReference` |
| 6 | **Ceremony as Method** — ceremony phases and transitions | ceremony-protocol | **Partial** | Enhancement | Phase transitions (opening→council→integration→closure) and governance work. Missing: ceremony as transformative process, not just state machine |
| 7 | **Narrative Knowing** — knowledge through story and beat sequencing | narrative-engine | **Full** | — | Beat sequencing, cadence patterns, arc validation, timeline building, cycle management |
| 8 | **Structural Tension** — creative orientation between vision and current reality | ontology-core, MCP tools | **Full** | — | `StructuralTensionChart` type, germination→assimilation→completion phases, dedicated MCP structural-tension tools |
| 9 | **Relations with People** — human relationships in research | ontology-core, MCP tools | **Full** | — | `human` NodeType, `humanObligation`, Elder council, youth mentorship, talking circles |
| 10 | **Relations with Ideas/Knowledge** — relational epistemology | ontology-core, relational-query | **Partial** | Enhancement | `knowledge` NodeType exists but knowledge is treated as static nodes, not as living relationships that deepen through circling |
| 11 | **Relations with Land/Environment** — place-based knowing, land as teacher | ontology-core (type only), MCP south tools | **Partial** | New Package | `land` NodeType and `landObligation` exist. MCP `south_embodied_data_collection` mentions walking interviews. No systematic place-based knowledge tracking, seasonal awareness, or land-as-teacher protocol |
| 12 | **Relations with Cosmos/Spirit** — spiritual connections, dreamtime | ontology-core (type only), MCP tools | **Partial** | New Package | `spirit` NodeType and `spiritObligation` exist. Spirit invocation and feeding ceremonies in MCP. No dream-state recording, liminal knowledge tracking, or cosmic relational system |
| 13 | **Relations with Ancestors** — intergenerational knowledge | ontology-core (type only), MCP north tools | **Partial** | Enhancement | `ancestor` NodeType exists. Spirit feeding ceremony in MCP. No intergenerational knowledge chain, ancestral teaching registry, or genealogical relation tracking |
| 14 | **Relations with Future Generations** — seven-generation thinking | ontology-core (type only), MCP north tools | **Partial** | Enhancement | `future` NodeType and `futureObligation` exist. Story archiving mentions 7 generations. No formal seven-generation impact assessment or future-accountability mechanism |
| 15 | **Fire Keeper** — ceremony maintainer/coordinating agent | None (external artefact only) | **Absent** | **New Package** | 384-line spec exists at `/a/src/IAIP/prototypes/artefacts/...fire-keeper-agent-spec.md` with message types, decision points, ceremony state, relational check-back. Zero implementation in MW suite |
| 16 | **Importance Units** — relational importance tracking | None (external artefact only) | **Absent** | **New Package** | 177-line JSON Schema exists at `/a/src/IAIP/.../importance-unit-schema.json` with direction, epistemicWeight, source dimensions, accountabilityLinks, circleDepth, ceremonyState. Zero implementation |
| 17 | **Relational Indexing** — four source dimensions (Land, Dream, Code, Vision) | None | **Absent** | **New Package** | ImportanceUnit schema defines `source` enum but no indexing, querying, or retrieval system exists for these four dimensions |
| 18 | **Epistemic Iteration** — spiral deepening measurement | None | **Absent** | New Package | ImportanceUnit has `circleDepth` and `refinements[]` tracking. Narrative-engine has cadence patterns. But no system measures *what changes* between iterations — the "subtle difference between the 3rd and 4th circling" |
| 19 | **Value-Gating** — hard constraints based on relational values | ceremony-protocol (governance only) | **Partial** | Enhancement + New Package | `checkGovernance()` and `checkCeremonyRequired()` gate file-path changes. Fire-keeper spec defines gating conditions on ImportanceUnits. No value-based gating on relational actions (stop-work orders, trajectory confidence thresholds) |
| 20 | **Consent as Ongoing** — continuous relational obligation, not one-time | ontology-core (binary field) | **Absent** | Enhancement | `OcapFlags.consent_given` is a boolean. `consent_scope` is a string. No consent renewal, expiry, renegotiation, or temporal tracking. Wilson: consent is a relationship, not a checkbox |
| 21 | **Transformation Tracking** — "if research doesn't change you, you haven't done it right" | None | **Absent** | **New Package** | Zero mechanisms for tracking researcher transformation, community impact, relational shift over time. System measures compliance but not growth |
| 22 | **Community Review** — ceremonial review, not just code review | ceremony-protocol (access levels) | **Partial** | Enhancement | `ceremony_required` access level exists. No community review protocol, circle-of-reviewers model, or Elder validation workflow |
| 23 | **Two-Eyed Seeing** — integration of Indigenous and Western knowledge | MCP tools (guidance text) | **Partial** | Enhancement | Referenced in MCP tool descriptions (south, west directions). No formal bridging mechanism between knowledge systems |
| 24 | **Relational Milestones** — circle completion replaces time-based metrics | None | **Absent** | New Package | Fire-keeper spec defines relational milestones (quadrants required/touched) but no package implements milestone tracking. Current system uses timestamps, not relational completion |
| 25 | **Permission Tiers** — Observe/Analyze/Propose/Act escalation | None (external artefact only) | **Absent** | New Package (Fire Keeper) | Fully specified in fire-keeper-agent-spec.md (4 tiers with human-required thresholds). Not in any package |

---

## Critical Gaps (Absent — No Package Coverage)

### Gap 1: Fire Keeper Coordinating Agent

**Wilson Alignment:** Wilson's ceremony requires a living maintainer — someone who tends the fire, ensures the ceremony proceeds with integrity, and stops work when relational accountability is violated. The current system has ceremony *phases* but no ceremony *keeper*.

**What Exists Outside MW Suite:**
- `fire-keeper-agent-spec.md` (384 lines): Full message protocol (6 receive types, 6 send types), 6 human-in-the-loop decision points, 4 permission tiers, ceremony state tracking with 5 phases, relational check-back protocol, quadrant completion detection
- References Miadi A2A Redis broker, ImportanceUnit schema, iaip-mcp, coaiapy-mcp

**What's Missing:**
- TypeScript implementation as `@medicine-wheel/fire-keeper`
- Integration with existing ceremony-protocol package
- Connection to data-store for ceremony state persistence
- Runtime decision engine for gating, deepening requests, and stop-work orders

### Gap 2: Importance Units & Relational Indexing

**Wilson Alignment:** Wilson's epistemology holds that knowledge has *relational weight* — not all knowledge is equal, and its importance comes from the *relationships* it carries. Dream-state knowledge may carry higher epistemic weight than rational analysis. The current system treats all nodes and edges equally.

**What Exists Outside MW Suite:**
- `importance-unit-schema.json` (177 lines): Full JSON Schema with `direction`, `epistemicWeight` (0.0–1.0), `source` (land/dream/code/vision), `accountabilityLinks[]` with 6 relation types, `circleDepth`, `content` with `refinements[]`, `ceremonyState`, `axiologicalPillar`

**What's Missing:**
- TypeScript types and Zod schemas for ImportanceUnit
- CRUD operations (create, read, update, circle-back, archive)
- Relational indexing across the four source dimensions
- Epistemic weight computation engine
- Integration with ontology-core's RelationalNode/Relation types
- Query interface for finding units by direction, source, circle depth, accountability

### Gap 3: Transformation Tracking

**Wilson Alignment:** Wilson's most radical claim — research must transform the researcher. *"If research doesn't change you, you haven't done it right."* This is not just a nice idea; it's Wilson's **validity criterion** for Indigenous research. Research that leaves the researcher unchanged has failed.

**What's Missing (completely):**
- Researcher transformation journal/log
- Before/after snapshots of relational understanding
- Community impact assessment (how has the community changed?)
- Relational shift detection (how have researcher's relationships changed?)
- Transformation milestones tied to ceremony phases
- Self-reflection prompts embedded in ceremony transitions
- Reciprocity ledger (what has the researcher given back?)

### Gap 4: Epistemic Iteration (Spiral Deepening)

**Wilson Alignment:** Wilson describes knowledge as gained through circling — returning to the same topic with new depth each time. The `circleDepth` field exists in the ImportanceUnit schema but no package measures *what changes* between iterations. The PDE decomposition explicitly calls this out: "analyze what shifts between 3rd and 4th circling of a topic."

**What's Missing:**
- Diff engine for comparing refinements between circle iterations
- Depth metrics (what constitutes "deepening" vs. "repetition"?)
- Spiral visualization showing how understanding transforms
- Integration with narrative-engine's cadence patterns
- Alerting when circling has stalled (repetition without deepening)

### Gap 5: Consent as Ongoing Relationship

**Wilson Alignment:** Wilson's relational accountability means consent is not a checkbox — it's a living relationship that must be maintained, renewed, and renegotiated. The current `consent_given: boolean` field violates this principle.

**What's Missing:**
- Consent lifecycle (granted → active → renewal-needed → expired → renegotiated)
- Consent scope evolution (scope can narrow or widen over time)
- Consent ceremony log (when was consent last affirmed?)
- Relationship health alerts when consent is stale
- Community-level consent (not just individual)
- Consent withdrawal mechanism with cascading effects on dependent relations

---

## Partial Gaps (Needs Enhancement)

### Ceremony Protocol — From State Machine to Living Process

**Current State:** `ceremony-protocol` implements phase transitions (opening→council→integration→closure), governance checks (protected paths, ceremony-required access), and phase framing text. This is solid engineering.

**Wilson Gap:** Wilson's ceremony is **transformative** — it changes the participants. The current implementation tracks ceremony *state* but not ceremony *effect*. There's no mechanism for:
- Recording what was transformed during a ceremony
- Tracking which relations were strengthened/weakened
- Measuring the gap between ceremony intention and ceremony outcome
- Supporting ceremony-within-ceremony (nested ceremonies)
- Resting phase (the fire-keeper spec adds `gathering/kindling/tending/harvesting/resting` but ceremony-protocol only has `opening/council/integration/closure`)

**Enhancement Proposal:**
- Add `CeremonyOutcome` interface tracking transformations, relations affected, and participant reflections
- Expand ceremony phases to include `gathering` and `resting` (align with fire-keeper spec)
- Add `nestedCeremony` support for ceremonies-within-ceremonies
- Add `ceremonySeed` concept — what the ceremony plants for future growth

### Ontology Core — Deepening the Six Relations

**Current State:** `NodeType = 'human' | 'land' | 'spirit' | 'ancestor' | 'future' | 'knowledge'` — all six Wilson relational categories are *typed* but not *deep*.

**Wilson Gap:** Each relational category carries distinct obligations, protocols, and ways of knowing. Currently they're all `RelationalNode` with different type strings. Wilson would say: a relationship with land is *fundamentally different* from a relationship with an ancestor. The system needs:

- **Land relations**: Seasonal awareness (what season are we in?), territory acknowledgment protocol, ecological reciprocity tracking
- **Ancestor relations**: Genealogical depth tracking, teaching lineage, spirit feeding schedule, ancestor invocation log
- **Future relations**: Seven-generation impact scoring, sustainability assessment, future-being representation in current decisions
- **Cosmos/Spirit relations**: Dream journal integration, liminal state recording, spiritual connection strength (not just generic `strength: number`)

**Enhancement Proposal:**
- Add specialized interfaces: `LandRelation`, `AncestorRelation`, `FutureRelation`, `CosmicRelation` extending `Relation`
- Add seasonal awareness to Direction metadata
- Add `SevenGenerationScore` computed type
- Add `DreamRecord` type for liminal/dream-state knowledge

### Relational Query — Value-Gating Support

**Current State:** `relational-query` has filtering, traversal, accountability audit, and Cypher query builders. It can filter by OCAP compliance, Wilson alignment threshold, and ceremony boundaries.

**Wilson Gap:** The query system finds and filters but doesn't **gate** (block or stop). Value-gating means: *some actions cannot proceed* if relational values are violated. The fire-keeper spec defines stop-work orders and trajectory confidence thresholds, but relational-query has no mechanism for this.

**Enhancement Proposal:**
- Add `ValueGate` interface with `condition`, `threshold`, `consequence` (warn/hold/stop)
- Add `evaluateGates(action, context): GateResult[]` function
- Add `stopWorkConditions` to `TraversalOptions` (abort traversal if gate is violated)
- Add `trajectoryConfidence` computation for a relational path

### Data Store — Importance Unit and Fire Keeper State Persistence

**Current State:** `data-store` handles Redis CRUD for nodes, edges, ceremonies, and session-ceremony linking.

**Wilson Gap:** No storage for ImportanceUnits, ceremony state (as defined by fire-keeper), relational milestones, transformation logs, or consent lifecycle records.

**Enhancement Proposal:**
- Add ImportanceUnit CRUD operations
- Add ceremony state persistence (fire-keeper's ceremony state object)
- Add relational milestone tracking
- Add transformation log storage
- Add consent lifecycle persistence with temporal queries

### Prompt Decomposition — Dream-State and Land-Based Sources

**Current State:** `MedicineWheelDecomposer` classifies intents by direction keywords, extracts implicit intents, maps dependencies, and generates narrative beats. Direction keywords are rational/task-oriented.

**Wilson Gap:** The decomposer only recognizes *rational* input. Wilson's epistemology includes dream-state, embodied, and land-based knowing. The ImportanceUnit schema gives dream-state inputs an epistemic weight of 0.85+ (higher than rational inputs), but the decomposer has no way to detect or weight these.

**Enhancement Proposal:**
- Add `source` dimension detection (land/dream/code/vision) alongside direction detection
- Add `epistemicWeight` computation based on source type
- Add dream-state keyword detection (liminal, vision, dream, spirit, intuition, felt-sense, embodied)
- Add land-based keyword detection (place, territory, season, harvest, water, soil, root)
- Weight dream/land sources higher per Wilson's framework

---

## Proposed New Packages

### 1. `@medicine-wheel/fire-keeper` — Ceremony Coordination Agent

**Purpose:** The living keeper of the ceremony — coordinates multi-agent work through relational gating, ensures Wilson alignment throughout the research process, and maintains ceremony as a transformative (not merely procedural) experience.

**Wilson Alignment:** Wilson's ceremony requires a keeper. Without one, ceremony degrades into process. The fire keeper embodies relational accountability as an active agent, not a passive metric.

**Key Modules:**

```
fire-keeper/
├── src/
│   ├── types.ts              # FireKeeperState, CeremonyState, GatingCondition,
│   │                         # PermissionTier, DecisionPoint, StopWorkOrder
│   ├── keeper.ts             # FireKeeper class — core coordination engine
│   ├── gating.ts             # evaluateGates(), checkGatingConditions(), resolveHold()
│   ├── decisions.ts          # humanNeeded(), permissionEscalation(), circleReview()
│   ├── check-back.ts         # relationalCheckBack() — 4-step verification protocol
│   ├── ceremony-state.ts     # CeremonyStateManager — gathering/kindling/tending/
│   │                         #   harvesting/resting phase tracking
│   ├── trajectory.ts         # trajectoryConfidence(), valueDivergenceDetect()
│   └── messages.ts           # Message type definitions for A2A communication
│                             #   (importance.submitted, circle.return, agent.report,
│   │                         #    human.response, importance.accepted, importance.held,
│   │                         #    deepen.requested, human.needed, ceremony.state.update,
│   │                         #    stopwork.order)
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
interface FireKeeperConfig {
  trajectoryThreshold: number;       // Default: 0.65
  permissionTiers: PermissionTier[];
  gatingConditions: GatingCondition[];
  humanDecisionPoints: DecisionPointType[];
}

type CeremonyPhaseExtended = 'gathering' | 'kindling' | 'tending' | 'harvesting' | 'resting';

interface CeremonyStateExtended {
  inquiryRef: string;
  ceremonyPhase: CeremonyPhaseExtended;
  activeDirection: DirectionName;
  quadrantState: Record<DirectionName, QuadrantStatus>;
  gatingConditions: GatingConditionStatus[];
  relationalMilestones: RelationalMilestone[];
  trajectoryHistory: TrajectoryCheckpoint[];
}

interface GatingCondition {
  condition: string;
  required: boolean;
  evaluator: (context: FireKeeperContext) => boolean;
}

type PermissionTier = 'observe' | 'analyze' | 'propose' | 'act';

interface DecisionPoint {
  type: 'value-conflict' | 'permission-escalation' | 'circle-completion-review' | 'modality-choice';
  trigger: (context: FireKeeperContext) => boolean;
  requiresHuman: boolean;
}
```

**Dependencies:** `ontology-core`, `ceremony-protocol`, `data-store`

**Priority:** 🔴 **CRITICAL** — This is the keystone package that makes Wilson's paradigm *active* rather than *passive*.

---

### 2. `@medicine-wheel/importance-unit` — Relational Knowledge Tracking

**Purpose:** Implements the ImportanceUnit — a relationally-accountable piece of meaning that carries epistemic weight, source dimensions, accountability links, and circle depth tracking. This is the unit of knowledge in Wilson's relational epistemology.

**Wilson Alignment:** Wilson's epistemology holds that knowledge has relational weight. Not all knowledge is equal — dream-state and embodied knowledge may carry more epistemic authority than rational analysis. ImportanceUnits make this explicit.

**Key Modules:**

```
importance-unit/
├── src/
│   ├── types.ts              # ImportanceUnit, AccountabilityLink, EpistemicSource,
│   │                         # CircleRefinement, CeremonyState, AxiologicalPillar
│   ├── schemas.ts            # Zod validation schemas (from existing JSON Schema)
│   ├── unit.ts               # createUnit(), updateUnit(), circleBack(), archive()
│   ├── epistemic-weight.ts   # computeWeight(), adjustForSource(), adjustForDepth()
│   ├── accountability.ts     # linkAccountability(), resolveLinks(), findGaps()
│   ├── circle-tracking.ts    # incrementCircle(), recordRefinement(), detectDeepening()
│   ├── ceremony-state.ts     # trackQuadrants(), checkCircleComplete(), evalGating()
│   └── index.ts              # Public API
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';
type AccountabilityLinkType = 'accountable-to' | 'deepens' | 'tensions-with' |
                               'emerges-from' | 'gates' | 'circles-back-to';
type AxiologicalPillar = 'ontology' | 'epistemology' | 'methodology' | 'axiology';

interface ImportanceUnit {
  id: string;
  direction: DirectionName;
  epistemicWeight: number;            // 0.0–1.0, dream-state starts at 0.85+
  source: EpistemicSource;
  accountabilityLinks: AccountabilityLink[];
  circleDepth: number;                // First visit = 1, increments on return
  content: {
    summary: string;
    rawInput?: string;                // Preserves original voice
    refinements: CircleRefinement[];  // What shifted between circles
  };
  ceremonyState?: {
    quadrantsVisited: DirectionName[];
    circleComplete: boolean;
    gatingConditions: GatingConditionStatus[];
  };
  axiologicalPillar?: AxiologicalPillar;
  inquiryRef?: string;
  meta: {
    createdBy: string;
    createdAt: string;
    lastCircledAt?: string;
    traceId?: string;
  };
}

interface CircleRefinement {
  circle: number;
  shift: string;                      // "the subtle difference between 3rd and 4th circling"
  timestamp: string;
}
```

**Dependencies:** `ontology-core`

**Priority:** 🔴 **CRITICAL** — This is the epistemic foundation. Without it, all knowledge in the system is flat and unweighted.

---

### 3. `@medicine-wheel/relational-index` — Four-Source Dimensional Indexing

**Purpose:** Implements the relational indexing system across Wilson's four epistemic source dimensions: Land, Dream, Code, and Vision. Enables querying, retrieval, and cross-dimensional relational mapping of ImportanceUnits and knowledge artifacts.

**Wilson Alignment:** Wilson's epistemology recognizes multiple sources of knowing. Land teaches differently than dreams; code embodies differently than vision. A relational index that can traverse across these dimensions enables the kind of holistic knowing Wilson describes.

**Key Modules:**

```
relational-index/
├── src/
│   ├── types.ts              # IndexEntry, DimensionQuery, CrossDimensionalMap,
│   │                         # RelationalPath, IndexMetrics
│   ├── index.ts              # createIndex(), addEntry(), removeEntry()
│   ├── query.ts              # queryBySource(), queryByDirection(),
│   │                         # queryCrossDimensional(), findRelationalPaths()
│   ├── dimensions.ts         # landIndex(), dreamIndex(), codeIndex(), visionIndex()
│   ├── cross-dimensional.ts  # mapAcrossDimensions(), findConvergences(),
│   │                         # detectTensions()
│   ├── spiral-depth.ts       # measureSpiralDepth(), compareCircles(),
│   │                         # detectDeepening(), detectStagnation()
│   └── metrics.ts            # indexHealth(), dimensionBalance(), coverageGaps()
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
interface RelationalIndex {
  entries: Map<string, IndexEntry>;
  dimensions: Record<EpistemicSource, DimensionIndex>;
  crossMap: CrossDimensionalMap;
}

interface IndexEntry {
  unitId: string;
  source: EpistemicSource;
  direction: DirectionName;
  epistemicWeight: number;
  circleDepth: number;
  accountableTo: string[];
  tags: string[];
  timestamp: string;
}

interface DimensionIndex {
  source: EpistemicSource;
  entries: IndexEntry[];
  depth: number;                      // Average circle depth
  weight: number;                     // Average epistemic weight
}

interface CrossDimensionalMap {
  convergences: Convergence[];        // Where multiple dimensions agree
  tensions: Tension[];                // Where dimensions conflict
  gaps: DimensionGap[];               // Dimensions with no entries
}

interface SpiralDepthMetrics {
  totalCircles: number;
  averageDepth: number;
  deepeningRate: number;              // How much shifts between circles
  stagnationAlert: boolean;           // Circling without deepening
  deepestUnit: string;
}
```

**Dependencies:** `ontology-core`, `importance-unit`

**Priority:** 🟠 **HIGH** — Enables the epistemic sophistication Wilson's framework demands.

---

### 4. `@medicine-wheel/transformation-tracker` — Research Impact & Growth

**Purpose:** Tracks the transformative impact of research on researchers, communities, and relational networks. Wilson's validity criterion: "If research doesn't change you, you haven't done it right."

**Wilson Alignment:** This is Wilson's **validity criterion** for Indigenous research. Without transformation tracking, the system can measure process compliance but cannot determine whether the research *succeeded* in Wilson's terms.

**Key Modules:**

```
transformation-tracker/
├── src/
│   ├── types.ts              # TransformationLog, GrowthSnapshot, ImpactAssessment,
│   │                         # ReciprocityLedger, SevenGenerationScore
│   ├── researcher.ts         # logReflection(), snapshotUnderstanding(),
│   │                         # compareSnapshots(), detectGrowth()
│   ├── community.ts          # logCommunityImpact(), reciprocityBalance(),
│   │                         # communityVoice(), impactTimeline()
│   ├── relational-shift.ts   # trackRelationalChange(), beforeAfter(),
│   │                         # strengthDelta(), newRelationsFormed()
│   ├── seven-generations.ts  # sevenGenScore(), futureImpact(), sustainabilityCheck()
│   ├── reciprocity-ledger.ts # logGiving(), logReceiving(), balanceCheck(),
│   │                         # reciprocityDebt(), reciprocityGrowth()
│   ├── prompts.ts            # reflectionPrompts(), phaseTransitionPrompts(),
│   │                         # milestonePrompts()
│   └── validity.ts           # wilsonValidityCheck() — has the research transformed?
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
interface TransformationLog {
  id: string;
  researchCycleId: string;
  snapshots: GrowthSnapshot[];        // Periodic understanding snapshots
  reflections: Reflection[];          // Researcher self-reflection entries
  communityImpacts: CommunityImpact[];
  relationalShifts: RelationalShift[];
  reciprocityLedger: ReciprocityEntry[];
  sevenGenerationScore: number;       // 0–1
  overallTransformation: number;      // 0–1 composite score
}

interface GrowthSnapshot {
  timestamp: string;
  direction: DirectionName;
  ceremonyPhase: CeremonyPhaseExtended;
  understanding: string;              // Free-text description of current understanding
  relationsCount: number;
  wilsonAlignment: number;
  keyInsights: string[];
  openQuestions: string[];
}

interface RelationalShift {
  relationId: string;
  before: { strength: number; description: string };
  after: { strength: number; description: string };
  catalyst: string;                   // What caused the shift
  direction: DirectionName;
  timestamp: string;
}

interface ReciprocityEntry {
  type: 'giving' | 'receiving';
  description: string;
  relatedTo: string;                  // Who/what was the exchange with
  category: ObligationCategory;       // human, land, spirit, future
  timestamp: string;
}

interface WilsonValidity {
  researcherTransformed: boolean;
  communityBenefited: boolean;
  relationsStrengthened: boolean;
  reciprocityBalanced: boolean;
  sevenGenerationsConsidered: boolean;
  overallValid: boolean;
  score: number;                      // 0–1
  recommendations: string[];
}
```

**Dependencies:** `ontology-core`, `ceremony-protocol`

**Priority:** 🔴 **CRITICAL** — Without this, the system cannot assess Wilson validity.

---

### 5. `@medicine-wheel/consent-lifecycle` — Ongoing Relational Consent

**Purpose:** Transforms consent from a boolean checkbox into a living relational obligation with lifecycle tracking, renewal, renegotiation, and community-level consent protocols.

**Wilson Alignment:** Wilson's relational accountability means consent is not an event — it's a *relationship*. "Once you are in relationship, you are responsible for that relationship's wellbeing." Consent must be maintained, renewed, and can be withdrawn — with cascading effects on all dependent relations.

**Key Modules:**

```
consent-lifecycle/
├── src/
│   ├── types.ts              # ConsentRecord, ConsentState, ConsentScope,
│   │                         # ConsentCeremony, ConsentCascade
│   ├── lifecycle.ts          # grantConsent(), renewConsent(), renegotiateConsent(),
│   │                         # withdrawConsent(), checkConsentHealth()
│   ├── scope.ts              # defineScope(), narrowScope(), widenScope(),
│   │                         # scopeIncludes()
│   ├── ceremony.ts           # consentCeremony(), consentRenewalCeremony(),
│   │                         # logConsentAffirmation()
│   ├── community.ts          # communityConsent(), collectiveDecision(),
│   │                         # elderApproval(), youthVoice()
│   ├── cascade.ts            # onWithdrawal(), propagateScopeChange(),
│   │                         # findDependentRelations()
│   ├── alerts.ts             # consentStaleAlert(), renewalDue(),
│   │                         # scopeMismatch(), healthCheck()
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
type ConsentState = 'pending' | 'granted' | 'active' | 'renewal-needed' |
                    'expired' | 'renegotiating' | 'withdrawn';

interface ConsentRecord {
  id: string;
  grantor: string;                    // Who gave consent
  grantee: string;                    // Who received consent
  scope: ConsentScope;
  state: ConsentState;
  grantedAt?: string;
  renewedAt?: string;
  expiresAt?: string;
  renewalInterval?: number;           // Days between required renewals
  ceremonies: ConsentCeremony[];      // Log of consent ceremonies
  history: ConsentStateChange[];      // Full state change history
  communityLevel: boolean;            // Is this community-wide consent?
  dependentRelations: string[];       // Relations that depend on this consent
  ocapFlags: OcapFlags;
}

interface ConsentScope {
  description: string;
  dataTypes: string[];                // What types of data/knowledge
  purposes: string[];                 // What purposes are consented
  duration?: string;                  // How long
  geographic?: string;                // Where
  restrictions: string[];             // What is explicitly NOT consented
}

interface ConsentCeremony {
  type: 'initial' | 'renewal' | 'renegotiation' | 'withdrawal';
  timestamp: string;
  participants: string[];
  witnessedBy?: string[];
  outcome: ConsentState;
  notes?: string;
  ceremonyId?: string;                // Link to ceremony-protocol
}
```

**Dependencies:** `ontology-core`, `ceremony-protocol`, `data-store`

**Priority:** 🟠 **HIGH** — Current boolean consent violates Wilson's core principle.

---

### 6. `@medicine-wheel/community-review` — Ceremonial Review Protocol

**Purpose:** Implements community-based ceremonial review as an alternative to code-review for relational knowledge, research outputs, and ceremony artifacts. Integrates Elder validation, circle-of-reviewers model, and consensus-based approval.

**Wilson Alignment:** Wilson describes research validation not through peer review but through *community review* — Elders, knowledge keepers, and community members validate whether research honors relational accountability. This is fundamentally different from academic peer review.

**Key Modules:**

```
community-review/
├── src/
│   ├── types.ts              # ReviewCircle, Reviewer, ReviewOutcome,
│   │                         # ElderValidation, CommunityVoice
│   ├── circle.ts             # createReviewCircle(), addReviewer(),
│   │                         # submitForReview(), closeCircle()
│   ├── elder.ts              # requestElderValidation(), elderGuidance(),
│   │                         # elderAuthority()
│   ├── consensus.ts          # seekConsensus(), talkingCircle(), recordVoices(),
│   │                         # resolveDisagreement()
│   ├── accountability.ts     # reviewerAccountability(), reviewAgainstWilson(),
│   │                         # reviewAgainstOcap(), relationalHealthReview()
│   ├── outcomes.ts           # approveWithBlessings(), requestDeepening(),
│   │                         # returnToCircle(), ceremonialHold()
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key Interfaces:**
```typescript
type ReviewOutcomeType = 'approved-with-blessings' | 'deepen-required' |
                          'return-to-circle' | 'ceremonial-hold' | 'withdrawn';

interface ReviewCircle {
  id: string;
  artifactId: string;                 // What is being reviewed
  artifactType: 'research' | 'ceremony' | 'knowledge' | 'code' | 'narrative';
  reviewers: Reviewer[];
  elderValidator?: string;
  status: 'gathering' | 'reviewing' | 'deliberating' | 'decided';
  outcome?: ReviewOutcome;
  talkingCircleLog: TalkingCircleEntry[];
  wilsonAlignment: number;
  ocapCompliant: boolean;
  createdAt: string;
}

interface Reviewer {
  id: string;
  role: PersonRole;                   // steward, contributor, elder, firekeeper
  direction?: DirectionName;          // Perspective they bring
  voice?: string;                     // Their review statement
  accountableTo: string[];            // Who they represent
}

interface ReviewOutcome {
  type: ReviewOutcomeType;
  consensus: boolean;
  voices: TalkingCircleEntry[];
  wilsonCheck: {
    respectHonored: boolean;
    reciprocityPresent: boolean;
    responsibilityTaken: boolean;
  };
  elderBlessing?: string;
  conditions?: string[];              // Conditions for approval
  nextAction: string;
}
```

**Dependencies:** `ontology-core`, `ceremony-protocol`

**Priority:** 🟡 **MEDIUM** — Important for full Wilson alignment but can initially be handled through ceremony-protocol enhancements.

---

## Proposed Enhancements to Existing Packages

### `@medicine-wheel/ontology-core`

1. **Specialized Relation Subtypes**
   - Add `LandRelation extends Relation` with `territory`, `season`, `ecologicalReciprocity`
   - Add `AncestorRelation extends Relation` with `generationDepth`, `teachingLineage`, `feedingSchedule`
   - Add `FutureRelation extends Relation` with `generationSpan`, `impactAssessment`, `sustainabilityScore`
   - Add `CosmicRelation extends Relation` with `dreamRecord`, `liminalState`, `spiritualProtocol`

2. **Consent Lifecycle Types**
   - Replace `consent_given: boolean` with `consent: ConsentRecord` reference
   - Add `consent_state: ConsentState` for quick checks
   - Add `consent_last_affirmed: string` timestamp

3. **Seasonal Awareness**
   - Add `currentSeason()` helper tied to Direction metadata
   - Add `SeasonalProtocol` interface for season-specific ceremonial guidance

4. **Seven Generation Score**
   - Add `SevenGenerationScore` computed type
   - Add `computeSevenGenScore(relation: Relation): number`

### `@medicine-wheel/ceremony-protocol`

1. **Extended Ceremony Phases**
   - Add `gathering` phase before `opening`
   - Add `resting` phase after `closure`
   - Align with fire-keeper spec's 5-phase model: gathering → kindling → tending → harvesting → resting

2. **Ceremony Outcome Tracking**
   - Add `CeremonyOutcome` interface: transformations, relations affected, participant reflections
   - Add `logCeremonyOutcome()` function
   - Add `ceremonySeed` concept — what the ceremony plants for future growth

3. **Nested Ceremony Support**
   - Add `parentCeremonyId` to `CeremonyState`
   - Add `createNestedCeremony()` for ceremony-within-ceremony

4. **Community Review Integration**
   - Add `ceremonialReview()` function that requires review circle approval
   - Add `reviewRequired` to governance config

### `@medicine-wheel/narrative-engine`

1. **Spiral Depth Integration**
   - Add `spiralDepthMetrics()` that integrates with relational-index
   - Add `circleReturnBeat` type for beats that represent returning to a topic
   - Add `deepeningScore` to `ArcCompleteness`

2. **Transformation Narrative**
   - Add `transformationArc()` — a special arc type that tracks researcher growth
   - Add `beforeAfterBeat` pairs for capturing relational shifts

### `@medicine-wheel/relational-query`

1. **Value-Gating Queries**
   - Add `ValueGate` interface with `condition`, `threshold`, `consequence`
   - Add `evaluateGates(action, context): GateResult[]`
   - Add `stopWorkConditions` to `TraversalOptions`

2. **ImportanceUnit Queries**
   - Add `queryImportanceUnits(filter: ImportanceUnitFilter): ImportanceUnit[]`
   - Add `findBySource(source: EpistemicSource): ImportanceUnit[]`
   - Add `findByCircleDepth(minDepth: number): ImportanceUnit[]`

3. **Consent-Aware Queries**
   - Add `consentAware: boolean` to `TraversalOptions` — only traverse relations with active consent
   - Add `consentExpiring(within: number): Relation[]` — find relations where consent needs renewal

### `@medicine-wheel/data-store`

1. **ImportanceUnit Persistence**
   - Add `putUnit(unit: ImportanceUnit): Promise<void>`
   - Add `getUnit(id: string): Promise<ImportanceUnit | null>`
   - Add `circleUnit(id: string, refinement: CircleRefinement): Promise<ImportanceUnit>`
   - Storage: `{prefix}unit:{id}`, indexed by direction and source

2. **Fire Keeper State Persistence**
   - Add `putCeremonyState(state: CeremonyStateExtended): Promise<void>`
   - Add `getCeremonyState(inquiryRef: string): Promise<CeremonyStateExtended | null>`
   - Add `logTrajectory(checkpoint: TrajectoryCheckpoint): Promise<void>`

3. **Consent Record Persistence**
   - Add consent CRUD with temporal queries
   - Add `getExpiringConsents(within: number): Promise<ConsentRecord[]>`

4. **Transformation Log Persistence**
   - Add `putSnapshot(snapshot: GrowthSnapshot): Promise<void>`
   - Add `getTransformationLog(cycleId: string): Promise<TransformationLog>`

### `@medicine-wheel/prompt-decomposition`

1. **Source Dimension Detection**
   - Add `source` field to `RelationalIntent` (land/dream/code/vision)
   - Add land-based keywords: place, territory, season, harvest, water, soil, root, walk, weather, animal, plant
   - Add dream-state keywords: dream, vision, liminal, spirit, intuition, felt-sense, embodied, emergence, whisper

2. **Epistemic Weight Computation**
   - Add `epistemicWeight` to `OntologicalDecomposition`
   - Dream-state intents start at 0.85+ per ImportanceUnit schema convention
   - Land-based intents at 0.80+
   - Code intents at 0.60 baseline
   - Vision intents at 0.75

3. **Transformation Prompts**
   - Add `transformationCheck` to decomposition output
   - When decomposing a reflection or closing prompt, ask: "How has this research changed you?"

### `@medicine-wheel/graph-viz`

1. **Source Dimension Visualization**
   - Add `source` coloring/shaping for ImportanceUnit nodes
   - Land = earth-toned, Dream = translucent/ethereal, Code = sharp/geometric, Vision = luminous

2. **Spiral Depth Visualization**
   - Add spiral layout mode showing how knowledge deepens through circling
   - Circle depth mapped to spiral radius

3. **Consent Status Indicators**
   - Add consent health indicators on relation edges (green=active, yellow=renewal-needed, red=expired)

### `@medicine-wheel/ui-components`

1. **ImportanceUnitCard** — displays unit with source, weight, circle depth, accountability links
2. **ConsentStatusBadge** — lifecycle-aware consent indicator (not just boolean)
3. **TransformationJournal** — UI for researcher reflection input and growth tracking
4. **SpiralDepthMeter** — visual indicator of how deep circling has gone
5. **SevenGenerationGauge** — displays future-impact score
6. **CeremonyOutcomePanel** — shows what a ceremony transformed

---

## Inter-Package Orchestration Recommendations

### Orchestration Pattern 1: Fire Keeper as Ceremony Hub

```
                    ┌──────────────────┐
                    │   fire-keeper    │
                    │  (coordination)  │
                    └──────┬───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──┐  ┌──────▼─────┐  ┌──▼───────────┐
     │importance │  │ ceremony   │  │transformation│
     │  -unit    │  │ -protocol  │  │  -tracker    │
     └────┬──────┘  └──────┬─────┘  └──────┬───────┘
          │                │               │
     ┌────▼──────┐  ┌──────▼─────┐        │
     │relational │  │  consent   │        │
     │  -index   │  │ -lifecycle │        │
     └────┬──────┘  └──────┬─────┘        │
          │                │               │
          └────────────────┼───────────────┘
                           │
                    ┌──────▼───────┐
                    │ ontology-core│
                    └──────────────┘
```

**Flow:**
1. Fire Keeper receives work from sub-agents as ImportanceUnits
2. Fire Keeper evaluates against gating conditions (consulting ceremony-protocol)
3. Fire Keeper checks consent lifecycle for affected relations
4. Fire Keeper tracks transformation through the process
5. Fire Keeper manages relational index for cross-dimensional queries
6. All state persists through data-store

### Orchestration Pattern 2: Wilson Validity Pipeline

```
Research Cycle Start
        │
        ▼
   [transformation-tracker.snapshotUnderstanding()]     ─── Baseline snapshot
        │
        ▼
   [fire-keeper.beginCeremony()]                        ─── Ceremony opens
        │
   ┌────┴────┐
   │ E→S→W→N │                                         ─── Research progresses
   │ circling │
   └────┬────┘
        │
        ▼
   [importance-unit.circleBack()]                       ─── Knowledge deepens
        │
        ▼
   [relational-index.measureSpiralDepth()]              ─── Depth measured
        │
        ▼
   [transformation-tracker.snapshotUnderstanding()]     ─── Growth snapshot
        │
        ▼
   [community-review.submitForReview()]                 ─── Community validates
        │
        ▼
   [consent-lifecycle.renewConsent()]                   ─── Consent renewed
        │
        ▼
   [transformation-tracker.wilsonValidityCheck()]       ─── Was research valid?
        │
        ▼
   [fire-keeper.closeCeremony()]                        ─── Ceremony closes
```

### Orchestration Pattern 3: Consent-Aware Traversal

The relational-query package should consult consent-lifecycle before traversing relations:

```typescript
// Current: traversal ignores consent
traverse(rootId, { maxDepth: 3 });

// Enhanced: consent-aware traversal
traverse(rootId, {
  maxDepth: 3,
  consentAware: true,           // Only follow relations with active consent
  consentGracePeriod: 30,       // Days before expired consent blocks
  onConsentExpiring: (rel) => { // Callback for relations nearing expiry
    consentLifecycle.alertRenewalDue(rel.id);
  }
});
```

### Orchestration Pattern 4: MCP Server Integration

The existing MCP server should expose new package capabilities as tools:

```typescript
// New MCP tools from fire-keeper
'fire_keeper_ceremony_state'     // Get current ceremony state
'fire_keeper_gating_check'       // Check gating conditions for an action
'fire_keeper_request_deepening'  // Ask for deeper circling

// New MCP tools from importance-unit
'importance_unit_create'         // Create new importance unit
'importance_unit_circle'         // Circle back to existing unit
'importance_unit_query'          // Query units by dimension

// New MCP tools from transformation-tracker
'transformation_snapshot'        // Take a growth snapshot
'transformation_reflect'         // Log a reflection
'transformation_validity'        // Check Wilson validity

// New MCP tools from consent-lifecycle
'consent_check'                  // Check consent status for a relation
'consent_renew'                  // Initiate consent renewal ceremony
```

---

## Priority Ordering

| Priority | Package | Rationale | Effort |
|----------|---------|-----------|--------|
| 🔴 **P0** | `@medicine-wheel/importance-unit` | Epistemic foundation — all other new packages depend on having a relational knowledge unit | Medium |
| 🔴 **P0** | `@medicine-wheel/fire-keeper` | Keystone coordination — makes Wilson's paradigm active. Spec already exists (384 lines) | Large |
| 🔴 **P0** | `@medicine-wheel/transformation-tracker` | Wilson's validity criterion — without this, the system cannot assess research success | Medium |
| 🟠 **P1** | `@medicine-wheel/relational-index` | Epistemic sophistication — enables multi-dimensional knowing. Depends on importance-unit | Medium |
| 🟠 **P1** | `@medicine-wheel/consent-lifecycle` | Core axiological fix — current boolean consent violates Wilson's principles | Small–Medium |
| 🟡 **P2** | `@medicine-wheel/community-review` | Full Wilson alignment — can be partially addressed through ceremony-protocol enhancements initially | Medium |
| 🟠 **P1** | ontology-core enhancements | Specialized relation subtypes, consent types, seasonal awareness | Small |
| 🟠 **P1** | ceremony-protocol enhancements | Extended phases, outcome tracking, nested ceremonies | Small |
| 🟡 **P2** | relational-query enhancements | Value-gating, consent-aware traversal, ImportanceUnit queries | Small |
| 🟡 **P2** | prompt-decomposition enhancements | Source dimension detection, epistemic weighting | Small |
| 🟢 **P3** | data-store enhancements | Persistence for new types (depends on new packages existing) | Small |
| 🟢 **P3** | graph-viz / ui-components enhancements | Visualization of new concepts (depends on new packages) | Small |

### Recommended Implementation Order

```
Phase 1 (Foundation):
  importance-unit → ontology-core enhancements → ceremony-protocol enhancements

Phase 2 (Activation):
  fire-keeper → relational-index → consent-lifecycle

Phase 3 (Transformation):
  transformation-tracker → community-review

Phase 4 (Integration):
  relational-query enhancements → prompt-decomposition enhancements →
  data-store enhancements → graph-viz/ui enhancements → MCP tool expansion
```

---

## Package Dependency Map (Updated)

```
                         ┌────────────────────────────────┐
                         │     🆕 fire-keeper             │
                         │  (ceremony coordination)       │
                         └──────┬────────────┬────────────┘
                                │            │
                    ┌───────────┘            └──────────────┐
                    │                                       │
          ┌─────────▼─────────┐               ┌────────────▼───────────┐
          │ 🆕 importance-unit│               │ 🆕 transformation-    │
          │ (relational       │               │     tracker            │
          │  knowledge)       │               │ (growth/validity)      │
          └─────────┬─────────┘               └────────────┬───────────┘
                    │                                       │
          ┌─────────▼─────────┐                            │
          │ 🆕 relational-    │                            │
          │     index         │                            │
          │ (4D indexing)     │                            │
          └─────────┬─────────┘                            │
                    │                                       │
   ┌────────────────┼────────────────┬─────────────────────┘
   │                │                │
   │    ┌───────────▼──────┐   ┌────▼──────────────────┐
   │    │ 🆕 consent-      │   │ 🆕 community-review   │
   │    │   lifecycle      │   │ (ceremonial review)    │
   │    └───────────┬──────┘   └────┬──────────────────┘
   │                │               │
   │    ┌───────────┴───────────────┘
   │    │
   ▼    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EXISTING PACKAGES                              │
│                                                                   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │ ontology-core│◄─┤ceremony-protocol│  │ narrative-engine │     │
│  │  (ENHANCED)  │  │  (ENHANCED)    │  │  (ENHANCED)      │     │
│  └──────┬───────┘  └────────────────┘  └──────────────────┘     │
│         │                                                        │
│  ┌──────▼───────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │relational-   │  │ graph-viz      │  │prompt-decomp     │     │
│  │ query (ENH)  │  │  (ENHANCED)    │  │  (ENHANCED)      │     │
│  └──────────────┘  └────────────────┘  └──────────────────┘     │
│                                                                   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │ ui-components│  │ data-store     │  │ session-reader   │     │
│  │  (ENHANCED)  │  │  (ENHANCED)    │  │                  │     │
│  └──────────────┘  └────────────────┘  └──────────────────┘     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Legend:**
- 🆕 = New package proposed
- (ENHANCED) = Existing package with proposed enhancements
- Arrows indicate dependencies (arrow points to dependency)

---

## Appendix A: Wilson Concept Coverage Summary

| Category | Total Concepts | Full | Partial | Absent |
|----------|---------------|------|---------|--------|
| Ontology | 3 | 2 | 1 | 0 |
| Epistemology | 5 | 1 | 2 | 2 |
| Axiology | 5 | 2 | 2 | 1 |
| Methodology | 5 | 1 | 2 | 2 |
| Relationality (6 Relations) | 6 | 2 | 4 | 0 |
| **TOTAL** | **25** | **8 (32%)** | **11 (44%)** | **6 (24%)** |

After implementing all proposed packages and enhancements:

| Category | Full | Partial | Absent |
|----------|------|---------|--------|
| Ontology | 3 | 0 | 0 |
| Epistemology | 5 | 0 | 0 |
| Axiology | 5 | 0 | 0 |
| Methodology | 5 | 0 | 0 |
| Relationality | 6 | 0 | 0 |
| **TOTAL** | **25 (100%)** | **0** | **0** |

---

## Appendix B: Cross-Reference to External Artefacts

The following external artefacts contain implementation-ready specifications that should be absorbed into new packages:

| Artefact | Location | Target Package | Content |
|----------|----------|----------------|---------|
| `fire-keeper-agent-spec.md` | `/a/src/IAIP/prototypes/artefacts/RCH-Wilson-...` | `@medicine-wheel/fire-keeper` | 384 lines: message protocol, decision points, ceremony state, check-back protocol |
| `importance-unit-schema.json` | Same directory | `@medicine-wheel/importance-unit` | 177 lines: JSON Schema for ImportanceUnit with all fields |
| `pde-decomposition-2602169733.md` | Same directory | Multiple packages | 136 lines: PDE decomposition identifying all gaps, architectural vision |
| `260218135325--v0.txt` | `/workspace/repos/jgwill/medicine-wheel/output/` | Architecture reference | v0 analysis of Fire Keeper architecture and multi-agent coordination |
| `260218135416--perplexity.txt` | Same directory | Architecture reference | Perplexity analysis of prototype and article structure |

---

*This gap analysis was produced by the cross-cutting relational web analyst on 2026-03-14. It represents a comprehensive mapping of Shawn Wilson's Research Is Ceremony framework against the Medicine Wheel developer suite, identifying 6 absent Wilson concepts, 11 partially-covered concepts, and proposing 6 new packages with 8 existing package enhancement sets to achieve full Wilson alignment.*
