# Medicine Wheel Repository: Comprehensive Exploration

## 📍 Location
**Path:** `/workspace/repos/jgwill/medicine-wheel/`  
**Type:** TypeScript monorepo with 15 interconnected packages  
**Framework:** Indigenous relational ontology for software development  
**Foundation:** Shawn Wilson's Three R's (Respect, Reciprocity, Responsibility) + OCAP® data sovereignty + Four Directions circular knowledge model

---

## 📦 Directory Structure

```
/workspace/repos/jgwill/medicine-wheel/
├── src/
│   ├── ontology-core/                 ← Foundation: types, schemas, RDF vocabulary
│   ├── ceremony-protocol/             ← Ceremony lifecycle & governance
│   ├── narrative-engine/              ← Beat sequencing & arc validation
│   ├── relational-query/              ← Graph traversal & accountability audit
│   ├── relational-index/              ← Four-source epistemic dimensional indexing
│   ├── fire-keeper/                   ← Ceremony coordination agent
│   ├── consent-lifecycle/             ← Consent as ongoing relationship
│   ├── community-review/              ← Ceremonial review with Elder validation
│   ├── transformation-tracker/        ← Research impact & growth tracking
│   ├── graph-viz/                     ← Circular SVG visualization
│   ├── prompt-decomposition/          ← Intent extraction & directional classification
│   ├── ui-components/                 ← React components (DirectionCard, BeatTimeline, etc.)
│   ├── data-store/                    ← Redis persistence layer
│   ├── session-reader/                ← JSONL session parsing
│   └── importance-unit/               ← Relational knowledge with epistemic weight
├── app/                               ← Next.js application
├── components/                        ← Next.js components
├── rispecs/                           ← RISE framework specifications
├── llms/                              ← LLM integration docs
├── COMPREHENSIVE_ANALYSIS.md
├── MEDICINE_WHEEL_UI_ANALYSIS.md
├── MEDICINE_WHEEL_UI_QUICK_REFERENCE.md
├── README.md
└── package.json
```

---

## 🎯 8 Key Design Patterns

### 1. **FIREKEEPER GOVERNANCE** — Active Relational Coordination

**Philosophy:** Wilson's ceremony requires a keeper who actively tends the fire. The Fire Keeper is NOT passive infrastructure; it's an active agent that **gates work** behind relational conditions.

**Pattern Architecture:**
```typescript
// FireKeeper class enforces 4-step relational check-back before any action:
class FireKeeper {
  evaluateImportance(unit, inquiryRef): ImportanceEvaluationResult
  relationalCheckBack(action, context): CheckBackResult
  
  // Four decision points:
  // 1. Does this action honor existing relations?
  // 2. Does it strengthen the Spirit-Body relationship?
  // 3. Is it accountable to all four directions?
  // 4. Would an Elder approve?
}
```

**Relational Principles Encoded:**
- **Permission Tiers:** observe → analyze → propose → act (human required at "act")
- **Stop-Work Orders:** Issued when Wilson alignment drops below threshold or OCAP® compliance violated
- **Trajectory Confidence:** Continuously monitors whether vision (Spirit) connects to implementation (Body)
- **Gating Conditions:** Work held until relational conditions satisfied

**How It Differs from Western Entity-Centric:**
| Western | Fire Keeper |
|---------|-------------|
| Role-based access control | Relational-accountability gating |
| Workflow proceeds until blocked | Workflow held until relational conditions verified |
| Violations logged; work proceeds | Violations stop work; requires human + Elder approval |
| Individual permissions | Obligation-chain accountability (across 4 relations: human, land, spirit, future) |

**Key Files:**
- `src/fire-keeper/src/keeper.ts` — Core coordination engine
- `src/fire-keeper/src/check-back.ts` — Four-step relational verification
- `src/fire-keeper/src/gating.ts` — Gate evaluation with Wilson + OCAP® checks

---

### 2. **CEREMONY PROTOCOL** — Lifecycle-Based Governance

**Philosophy:** All work happens within ceremony phases. The protocol enforces that changes to sacred paths require ceremonial context.

**Pattern Architecture:**
```typescript
// Four ceremony phases (opening → council → integration → closure)
type CeremonyPhase = 'opening' | 'council' | 'integration' | 'closure';

interface CeremonyState {
  currentCycle: string;
  hostSun: SunName;           // RSIS thematic sun
  phase: CeremonyPhase;
  startDate?: string;
  endDate?: string;
}

// Governance rules tied to file paths
const checkGovernance = (filePath: string, config: RSISConfig) 
  => GovernanceProtectedPath | null;
```

**Four-Phase Structure:**
1. **Opening (East)** — What wants to emerge? Intention + vision setting
2. **Council (South)** — Cross-sun perspectives on relationships and impacts
3. **Integration (West)** — Weaving insights into synthesis artifacts, validation
4. **Closure (North)** — Reciprocity summaries, seeding future inquiries

**Governance Access Levels:**
- `open` — No restrictions
- `ceremony_required` — Changes require ceremonial review
- `restricted` — Restricted to specific authorities
- `sacred` — Sacred space requiring special protocols

**How It Differs from Western Entity-Centric:**
| Western | Ceremony Protocol |
|---------|-------------------|
| File permissions | Ceremony-phase-aware governance |
| Static ACLs | Dynamic phase-based access |
| Audit trails | Ceremony audit logs with witness records |
| One valid path | Four directional phases, each with different guidance |

**Key Files:**
- `src/ceremony-protocol/src/index.ts` — Phase management + governance enforcement
- `src/ceremony-protocol/README.md` — Protocol documentation

---

### 3. **CONSENT LIFECYCLE** — Consent as Living Relationship

**Philosophy:** Consent is NOT a checkbox event—it's an **ongoing relational obligation** with lifecycle, renewal, renegotiation, and cascading effects.

**Pattern Architecture:**
```typescript
// Consent moves through states
type ConsentState = 
  | 'pending'          // Requested
  | 'granted'         // Given but not ceremonialized
  | 'active'          // Active and honored through ceremony
  | 'renewal-needed'  // Approaching expiration
  | 'expired'         // Lapsed
  | 'renegotiating'   // Scope changing
  | 'withdrawn';      // Terminal (with cascading effects)

// Withdrawal ripples through dependency graph
onWithdrawal(record) => {
  // Find all dependent relations
  // Cascade withdrawal with notice periods
  // Update all derivative research/artifacts
  // Trigger community notification
}
```

**Key Concepts:**
- **Scope Definition** — Not just "yes/no" but "yes to what, by whom, for how long?"
- **Ceremony-Witnessed** — Consent moments formalized with witnesses, not just signed
- **Community Consent** — Distinct from individual; includes Elder + youth voice
- **Health Checks** — Periodic assessment of whether consent relationship is healthy
- **Cascading Effects** — Withdrawal of data consent cascades through derivative works

**How It Differs from Western Entity-Centric:**
| Western | Consent Lifecycle |
|---------|-------------------|
| Checkbox + signature | Living relationship with ceremony witness |
| Static scope | Dynamic scope that can narrow/widen with re-consent |
| Participant manages | Community manages with Elder oversight |
| Binary (yes/no) | State machine with explicit transitions |
| Withdrawal = archive only | Withdrawal triggers cascade, notification, renegotiation |

**Key Files:**
- `src/consent-lifecycle/README.md` — Full lifecycle documentation
- `src/consent-lifecycle/src/lifecycle.ts`, `cascade.ts`, `community.ts`

---

### 4. **ONTOLOGY CORE** — Relational-First Data Model

**Philosophy:** In Indigenous ontology, **relationships ARE beings**—not just edges between nodes. They carry obligations, protocols, ceremony context, and accountability.

**Pattern Architecture:**
```typescript
// Simple edge: just connection metadata
interface RelationalEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
}

// First-class Relation: entity in its own right
interface Relation extends RelationalEdge {
  direction?: DirectionName;
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_honored: boolean;
  };
  obligations: RelationalObligation[];      // ← Encoded obligations
  ocap: OcapFlags;                          // ← Data sovereignty
  accountability: AccountabilityTracking;   // ← Wilson's 3 R's
  metadata: Record<string, unknown>;
}

// Obligation categories (relational accountability)
type ObligationCategory = 'human' | 'land' | 'spirit' | 'future';

interface RelationalObligation {
  category: ObligationCategory;
  obligations: string[];
}
```

**Wilson's Three R's in Code:**
```typescript
interface AccountabilityTracking {
  respect: number;              // 0–1: Honor all perspectives
  reciprocity: number;          // 0–1: Mutual benefit flows
  responsibility: number;       // 0–1: Commitments maintained
  wilson_alignment: number;     // Average of three R's
  relations_honored: string[]; // Which relations touched by ceremony
  last_ceremony_id?: string;   // Ceremonial accountability link
}
```

**OCAP® Governance Embedded:**
```typescript
interface OcapFlags {
  ownership: string;                          // Who owns
  control: string;                           // Who controls
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-*';
  compliant: boolean;
  consent_given?: boolean;
  consent_scope?: string;
  consent_state?: 'active' | 'withdrawn' | 'expired' | 'pending';
  consent_last_affirmed?: string;
}
```

**Four Direction Node Types:**
```typescript
type NodeType = 'human' | 'land' | 'spirit' | 'ancestor' | 'future' | 'knowledge';

interface Direction {
  name: DirectionName;  // east | south | west | north
  ojibwe: string;
  season: string;
  color: string;
  lifeStage: string;
  ages: string;
  medicine: string[];
  teachings: string[];
  practices: string[];
}
```

**RDF Vocabulary (Six Custom Namespaces):**
```typescript
const MW_NS = 'https://ontology.medicine-wheel.dev/mw#';        // Core
const IDS_NS = 'https://ontology.medicine-wheel.dev/ids#';      // Indigenous Data Sovereignty
const OCAP_NS = 'https://ontology.medicine-wheel.dev/ocap#';    // OCAP®
const REL_NS = 'https://ontology.medicine-wheel.dev/rel#';      // Relational accountability
const CER_NS = 'https://ontology.medicine-wheel.dev/cer#';      // Ceremony
const BEAT_NS = 'https://ontology.medicine-wheel.dev/beat#';    // Narrative beats

// Example IRIs:
MW.Direction
REL.respect, REL.reciprocity, REL.responsibility
OCAP.ownership, OCAP.control, OCAP.access, OCAP.possession
CER.Ceremony
```

**How It Differs from Western Entity-Centric:**
| Western | Ontology Core |
|---------|---------------|
| Nodes (entities) + edges (relationships) | Nodes + first-class Relation entities |
| Relationship metadata | Relationship obligations, ceremony context, accountability |
| Authorship | Relational accountability across 4 obligation categories |
| Properties | Ceremony-bound properties with witness records |
| Access control | OCAP® sovereignty built into every relation |
| Time-agnostic | Ceremony phases + phase-specific obligations |

**Key Files:**
- `src/ontology-core/src/types.ts` — Complete type definitions
- `src/ontology-core/src/constants.ts` — Direction definitions, Ojibwe names, seasons
- `src/ontology-core/src/vocabulary.ts` — RDF namespaces & IRIs
- `src/ontology-core/src/queries.ts` — Semantic query helpers

---

### 5. **RELATIONAL INDEX** — Four-Source Epistemic Dimensioning

**Philosophy:** Wilson's epistemology recognizes multiple sources of knowing. Land, Dream, Code, and Vision each teach differently. The index enables cross-dimensional querying and balance measurement.

**Pattern Architecture:**
```typescript
// Four epistemic sources (Wilson's epistemology)
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

interface RelationalIndex {
  dimensions: {
    land: DimensionIndex;    // Embodied, place-based knowledge
    dream: DimensionIndex;   // Intuitive, liminal knowledge
    code: DimensionIndex;    // Implementation, algorithmic knowledge
    vision: DimensionIndex;  // Aspirational, future-oriented knowledge
  };
}

interface DimensionIndex {
  entries: IndexEntry[];
  balance: number;  // 0–1, 1 = perfectly balanced
}

interface IndexEntry {
  unitId: string;
  source: EpistemicSource;
  direction: DirectionName;
  epistemicWeight: number;        // 0–1, dream starts at 0.85+
  circleDepth: number;             // increments with revisitation
  accountableTo: string[];         // relation IDs this knowledge is accountable to
  tags: string[];
  timestamp: string;
}
```

**Dimensional Balance Scoring:**
```typescript
// Balance = 1 - (normalized standard deviation of dimension counts)
dimensionBalance(index) => {
  const counts = ['land', 'dream', 'code', 'vision'].map(s => 
    index.dimensions[s].entries.length
  );
  // Score 1.0 = equal entries per dimension
  // Score 0.0 = only one dimension has entries
  return 1 - (stdDev / mean);
}
```

**Spiral Depth Detection:**
```typescript
// Deepening = same unit revisited across multiple circles
// Stagnation = same unit repeated without new circle depth
measureSpiralDepth(index) => {
  const revisits = entries.reduce((map, e) => 
    map.set(e.unitId, (map.get(e.unitId) || 0) + 1)
  , new Map());
  
  return {
    deepeningUnitIds: [...revisits].filter(([_, count]) => count > 1),
    stagnantUnitIds: [...revisits].filter(([_, count]) => count > 2),
    spiralHealth: entries.filter(e => e.circleDepth > 0).length / entries.length
  };
}
```

**How It Differs from Western Entity-Centric:**
| Western | Relational Index |
|---------|------------------|
| Single knowledge source | Four epistemic sources, measured & balanced |
| Flat indexing | Spiral deepening with circle depth tracking |
| Entity popularity | Epistemic weight + accountability links |
| Full-text only | Source-aware + dimension-aware + obligation-aware |
| Search results | Convergences, tensions, coverage gaps identified |

**Key Files:**
- `src/relational-index/src/dimensions.ts` — Epistemic source views
- `src/relational-index/src/spiral-depth.ts` — Deepening detection
- `src/relational-index/src/metrics.ts` — Balance scoring

---

### 6. **NARRATIVE ENGINE** — Four-Directional Arc Validation

**Philosophy:** Narrative structure mirrors the Four Directions: East (vision/opening), South (growth/deepening), West (reflection/integrating), North (wisdom/closing). The engine ensures narratives are **complete, balanced, and ceremonially grounded**.

**Pattern Architecture:**
```typescript
// Narrative beat positioning in four directions × four acts
interface NarrativeBeat {
  id: string;
  title: string;
  direction: DirectionName;      // Which direction this beat belongs to
  act: number;                    // Which act (1–4)
  timestamp: string;
  ceremony_indicator?: CeremonyType;
}

// Arc completeness scoring
interface ArcCompleteness {
  directionsVisited: DirectionName[];
  directionsMissing: DirectionName[];
  beatsPerDirection: Record<DirectionName, number>;
  ceremoniesPerDirection: Record<DirectionName, number>;
  wilsonAlignment: number;        // Relational accountability in narrative
  ocapCompliant: boolean;
  completenessScore: number;      // 0–1
}

// Completeness formula:
completenessScore = 
  (directionScore * 0.3) +        // all 4 directions visited
  (ceremonyScore * 0.25) +        // ceremonies in all 4 directions
  (wilsonAlignment * 0.25) +      // relational accountability
  (balanceScore * 0.2);           // beat distribution
```

**Cadence Patterns (Ceremony-Phase Mapping):**
```typescript
const STANDARD_CADENCE = {
  'opening': 'east',      // Beginning, intention, vision
  'deepening': 'south',   // Learning, growth, analysis
  'integrating': 'west',  // Reflection, validation, testing
  'closing': 'north',     // Wisdom, action, implementation
};

validateCadence(beats, ceremonies) => {
  // Verify transitions between phases have ceremony boundaries
  // Check that each direction visited in correct act order
  // Alert on missing ceremonial moments
}
```

**How It Differs from Western Entity-Centric:**
| Western | Narrative Engine |
|---------|------------------|
| Linear chapters | Four-directional spiral with phase boundaries |
| Arbitrary structure | Ceremony-mandated phase transitions |
| Completeness = has ending | Completeness = all 4 directions + ceremonies visited |
| Balance = even length | Balance = beat distribution + Wilson alignment |
| Validation = grammar | Validation = relational accountability + OCAP® |

**Key Files:**
- `src/narrative-engine/src/sequencer.ts` — Beat ordering + spiral logic
- `src/narrative-engine/src/arc.ts` — Arc validation + completeness scoring
- `src/narrative-engine/src/cadence.ts` — Ceremony-phase mapping

---

### 7. **COMMUNITY REVIEW** — Ceremonial Validation Beyond Peer Review

**Philosophy:** Wilson replaces Western "peer review" with **community review**—Elders, knowledge keepers, and community members validate whether research honors relational accountability.

**Pattern Architecture:**
```typescript
// Review circle (gathering → reviewing → deliberating → decided)
interface ReviewCircle {
  artifactId: string;
  artifactType: string;           // 'research' | 'code' | 'protocol'
  status: 'gathering' | 'reviewing' | 'deliberating' | 'decided';
  reviewers: Reviewer[];
  voices: TalkingCircleEntry[];
  elderValidation?: {
    elderId: string;
    guidance: string;
    blessing?: string;
  };
  consensus?: ConsensusResult;
  outcome?: ReviewOutcome;
}

// Reviewer with relational accountability
interface Reviewer {
  id: string;
  role: 'steward' | 'contributor' | 'elder' | 'community-member';
  direction: DirectionName;         // Perspective from which they speak
  accountableTo: string[];          // Relations this reviewer represents
}

// Talking circle voice (each speaks in turn)
interface TalkingCircleEntry {
  speakerId: string;
  role: string;
  direction: DirectionName;
  voice: string;                    // What they say
  timestamp: string;
}

// Review outcome with Wilson's 3 R's check
interface ReviewOutcome {
  approved: boolean;
  wilsonCheck: {
    respect: boolean;              // All perspectives honored?
    reciprocity: boolean;          // Does artifact give back?
    responsibility: boolean;       // Accountability explicit?
  };
  blessing?: string;
  blessedBy?: string;              // Elder who blessed
}
```

**Consensus Mechanism:**
```typescript
seekConsensus(circle) => {
  // Not unanimous (oppressive) but true consensus
  // No one's voice silenced; disagreements surfaced
  // Multiple valid truths can coexist
  // Elder provides guidance on deep disagreements
  return {
    consensusReached: boolean;
    voicesHeard: number;
    voicesSilenced: number;
    irreconcilableTensions: string[];
    elderGuidanceNeeded: boolean;
  };
}
```

**How It Differs from Western Entity-Centric:**
| Western Peer Review | Community Review |
|---------|-------------------|
| Anonymous reviewers | Named reviewers with explicit accountabilities |
| Majority vote | Consensus-seeking + Elder validation |
| Paper/code evaluation | Artifact + relational impact evaluation |
| Boolean approval | Multi-dimensional Wilson assessment (respect/reciprocity/responsibility) |
| Silent review | Talking circle where all voices are recorded |
| Individual opinions | Directional perspectives explicitly tracked |

**Key Files:**
- `src/community-review/README.md` — Full protocol documentation
- `src/community-review/src/*.ts` — Circle, talking circle, consensus logic

---

### 8. **TRANSFORMATION TRACKER** — Wilson's Validity Criterion

**Philosophy:** Wilson's core validity test: **"If research doesn't change you, you haven't done it right."** Transformation tracking measures research success through researcher growth, community benefit, relational shifts, and seven-generation impact—not publication counts.

**Pattern Architecture:**
```typescript
// Primary container for transformation signals
interface TransformationLog {
  researcherId: string;
  cycleId: string;
  snapshots: UnderstandingSnapshot[];       // Before/after understanding
  reflections: ReflectionEntry[];           // Researcher self-reflection
  communityImpacts: CommunityImpact[];      // Voiced benefits
  relationalShifts: RelationalShift[];      // Strength/quality changes
  reciprocityLedger: ReciprocityEntry[];   // Giving/receiving balance
  sevenGenerationScore: number;             // Long-term sustainability
}

// Researcher transformation measurement
interface UnderstandingSnapshot {
  phase: CeremonyPhase;
  timestamp: string;
  understanding: string;                   // Narrative description
  clarity: number;                         // 0–1
  alignment: number;                       // With original vision
}

// Community voice (not self-reported benefit)
interface CommunityImpact {
  communityId: string;
  voicedBy: string;                        // Community member name
  impact: string;                          // What changed
  verified: boolean;                       // Community confirms true
  timestamp: string;
}

// Relational shift tracking
interface RelationalShift {
  relationId: string;
  beforeStrength: number;
  afterStrength: number;
  shift: number;                          // after - before
  ceremonyTouching?: string;
}

// Reciprocity balance
interface ReciprocityEntry {
  timestamp: string;
  giveType: string;                       // What was given (knowledge, time, resources)
  receiveType: string;                    // What was received
  balance: number;                        // -1 (owe) to +1 (overgiven)
}
```

**Wilson Validity Check (THE Function):**
```typescript
wilsonValidityCheck(log): {
  researcherTransformed: boolean;         // Snapshots show growth
  communityBenefited: boolean;            // Community voices benefit
  relationsStrengthened: boolean;         // Relation shifts positive
  reciprocityBalanced: boolean;           // Giving/receiving balanced
  sevenGenerationsHonored: boolean;       // Long-term sustainability > threshold
  
  valid: boolean;                         // All five dimensions true
  score: number;                          // 0–1
  recommendations: string[];
}
```

**Seven-Generation Sustainability:**
```typescript
sevenGenScore(log) => {
  // Assess:
  // - Community self-sufficiency (not dependent on researcher)
  // - Knowledge transfer (youth trained + empowered)
  // - Land/ecological impact (positive or negative long-term)
  // - Relational health (will this hold 7 generations?)
  // - Economic/resource sustainability
  
  return score: 0–1;
}
```

**How It Differs from Western Entity-Centric:**
| Western Success Metrics | Transformation Tracking |
|---------|-------------------|
| Publications, citations | Researcher growth snapshots |
| Self-reported impact | Community-voiced impacts |
| Peer approval | Relational strength before/after |
| Individual achievement | Reciprocity balance across cycle |
| Short-term outputs | Seven-generation sustainability |
| Authority validation | Wilson's three R's assessment |

**Key Files:**
- `src/transformation-tracker/README.md` — Full tracking documentation
- `src/transformation-tracker/src/researcher.ts`, `community.ts`, `relational-shift.ts`, `validity.ts`

---

## 🔑 Specific Relational Principles Encoded in Code

### 1. **Obligations as First-Class Entities**

**Western:** Obligations mentioned in documentation, enforced externally (process, policy)

**Medicine Wheel:**
```typescript
// Obligations embedded in Relation structure
interface Relation {
  obligations: RelationalObligation[];  // ← Explicit, structured
}

type ObligationCategory = 'human' | 'land' | 'spirit' | 'future';

// Queried and audited programmatically
auditAccountability(relations) => AccountabilityReport {
  unmetObligations: Obligation[];
  honoredObligations: Obligation[];
  cascadingEffects: RelationChange[];
}
```

### 2. **Ceremony as Executable Protocol**

**Western:** Ceremony is metaphorical; governance is file-based access control

**Medicine Wheel:**
```typescript
// Ceremony state drives access logic
const checkGovernance = (filePath, config) => {
  // Check against ceremony-protected-paths
  // Return access level: open | ceremony_required | restricted | sacred
};

// Phase-based transitions are enforced
nextPhase(current: CeremonyPhase) => CeremonyPhase | null;

// Work is held until ceremony completes
evaluateImportance(unit, inquiryRef): ImportanceEvaluationResult
  => 'importance.accepted' | 'importance.held' | 'human.needed';
```

### 3. **Wilson's Three R's as Measurable Metrics**

**Western:** Accountability as role-based; ethics as guidelines

**Medicine Wheel:**
```typescript
// Three R's are numerical scores (0–1)
interface AccountabilityTracking {
  respect: number;           // Measured per relation
  reciprocity: number;       // Measured per relation
  responsibility: number;    // Measured per relation
  wilson_alignment: number;  // Aggregated score
}

// Continuously monitored
trajectoryConfidence(context) => {
  currentAlignment: number;
  trend: 'rising' | 'stable' | 'declining';
  recommendation: 'continue' | 'deepen' | 'stop-work';
}

// Used for gating decisions
if (wilsonAlignment < threshold) {
  return StopWorkOrder;  // Work stops until alignment restored
}
```

### 4. **Data Sovereignty Built Into Every Relation**

**Western:** Data governance is a separate layer; GDPR compliance is checkbox

**Medicine Wheel:**
```typescript
// OCAP® flags on every relation
interface OcapFlags {
  ownership: string;
  control: string;
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-*';
  consent_state: 'active' | 'withdrawn' | 'expired' | 'pending';
  consent_last_affirmed: string;  // ISO timestamp
}

// Consent withdrawal cascades through dependency graph
onWithdrawal(record) => {
  // Find all derivative works
  // Update all dependent relations
  // Trigger notifications
  // Create renegotiation workflows
}

// Compliance auditing is built-in
checkOcapCompliance(ocap) => {
  compliant: boolean;
  issues: string[];
}
```

### 5. **Narrative Structure Mirrors Ceremony Phases**

**Western:** Content is chronological; structure is arbitrary

**Medicine Wheel:**
```typescript
// Beats positioned in four directions × four acts
interface NarrativeBeat {
  direction: DirectionName;  // East | South | West | North
  act: number;               // 1 | 2 | 3 | 4
  ceremony_indicator?: CeremonyType;
}

// Completeness requires all four directions
isArcComplete(beats) => {
  directionsVisited.size === 4 &&
  ceremonies.length >= 4
}

// Sequencing enforces spiral order
sequenceBeats(beats) => {
  // Order: East→South→West→North (act 1)
  //        East→South→West→North (act 2)
  // etc.
  return spiralOrdered;
}
```

### 6. **Epistemic Pluralism (Four Knowledge Sources)**

**Western:** Single data model; knowledge is undifferentiated

**Medicine Wheel:**
```typescript
// Knowledge tracked by epistemic source
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

interface IndexEntry {
  source: EpistemicSource;
  epistemicWeight: number;   // Dream starts at 0.85+; Code at 0.3
  circleDepth: number;       // How many times revisited in deepening spiral
}

// Balance measured across all four sources
dimensionBalance(index) => {
  // 1.0 = equal knowledge from all 4 sources
  // 0.0 = all knowledge from single source
  return stdDevScore;
}

// Stagnation detected
spiralDepth(index) => {
  deepeningUnits: string[];    // Revisited with new understanding
  stagnantUnits: string[];     // Repeated without growth
  spiralHealth: number;        // % of units showing deepening
}
```

### 7. **Accountability Chains Across Four Relation Categories**

**Western:** Accountability is individual; reporting is hierarchical

**Medicine Wheel:**
```typescript
type ObligationCategory = 'human' | 'land' | 'spirit' | 'future';

// Every relation has explicit accountability to multiple categories
interface RelationalObligation {
  category: ObligationCategory;
  obligations: string[];
}

// Auditable per category
auditAccountability(relations) => AccountabilityReport {
  human: {
    met: Relation[];
    unmet: Relation[];
  };
  land: { met, unmet };
  spirit: { met, unmet };
  future: { met, unmet };
}

// Different obligations per category
// Human: consent + transparency
// Land: ecological restoration + ceremony
// Spirit: offerings + teachings preservation
// Future: knowledge transfer + sustainability planning
```

### 8. **Consent as Relationship, Not Transaction**

**Western:** Consent = checkbox; IRB approval = fixed lifetime

**Medicine Wheel:**
```typescript
// State machine with explicit transitions
type ConsentState = 'pending' | 'granted' | 'active' | 
                    'renewal-needed' | 'expired' | 'renegotiating' | 'withdrawn';

interface ConsentRecord {
  state: ConsentState;
  scope: string;                          // What was consented to
  last_affirmed: string;                  // ISO timestamp of ceremony
  expiration: string;                     // When renewal needed
}

// Renewal is periodic and ceremonial
renewConsent(record, participants) => {
  // Must be witnessed
  // Scope may be narrowed/widened
  // Community voice on whether researcher held agreements
}

// Withdrawal has ripple effects
withdrawConsent(record) => {
  // Marks all dependent relations as needing renegotiation
  // Creates notification workflow
  // Researcher owes reconciliation/offerings
}
```

---

## 📊 Comparative Architecture

### Traditional Entity-Centric (Western) System

```
Entity → Properties → Relations(edges) → Access Control → Audit Log

Nodes:  [User] [Resource] [Document]
Edges:  --owner_of--> --created_by-->
Access: Role-based ACL
Events: [Created] [Modified] [Accessed]
Valid:  Data persists; compliance maintained
```

### Medicine Wheel Relational System

```
Node ← Relation(first-class) → Accountability Tracking
                    ↓
            Ceremony Context
            ↓
      Four Obligation Categories
      (human, land, spirit, future)
            ↓
      OCAP® Sovereignty
      + Wilson Metrics
            ↓
      Gating & Check-Back Protocol
      ↓
      Stop-Work or Proceed

Nodes: [Human] [Land] [Spirit] [Ancestor] [Future] [Knowledge]
Relations: ceremony_kinship, treaty, mentorship, cosmic_reciprocity
         (each with obligations, accountability, consent state)
Access: Ceremony-phase-based + Relational check-back
Events: [Phase Transition] [Ceremony Complete] [Withdrawal Cascade] [Obligation Met]
Valid:  Research transforms researcher + community + strengthens relations + honored 7 generations
```

---

## 🧠 Key Insight: The Four Directions Encode Epistemology

The Four Directions are **not decorative**—they encode a **specific epistemology**:

| Direction | Season | Life Stage | Epistemology | Code Pattern |
|-----------|--------|-----------|-------|------|
| **East** | Spring | Birth–7 | **Vision** | Intention, planning, requirements |
| **South** | Summer | 7–14 | **Learning** | Research, analysis, growth |
| **West** | Fall | 35–49 | **Reflection** | Testing, validation, integration |
| **North** | Winter | 49+ | **Wisdom** | Implementation, action, stewardship |

**In Code:**
- Beat positioning by direction enforces this epistemology
- Narrative arc **must visit all four** = must include vision + learning + testing + action
- Ceremony phases **must align** with directional wisdom
- Query helpers filter by direction = filter by epistemic source

```typescript
// This is not arbitrary—it's epistemological
beatsByDirection('east').forEach(beat => {
  // These are vision-phase beats
  // Must have ceremony foundation
  // Must inform south (learning) beats
});

// Missing eastern beats = no vision foundation
// Missing southern beats = no research depth
// Missing western beats = no validation
// Missing northern beats = incomplete action
```

---

## 📚 Documentation Architecture

**Key Documents to Understand Principles:**
1. `README.md` — System overview + package architecture
2. `COMPREHENSIVE_ANALYSIS.md` — Deep dive into each package (30 KB)
3. `MEDICINE_WHEEL_UI_ANALYSIS.md` — UI component details + ontology reference
4. `rispecs/medicine-wheel.spec.md` — Complete RISE specification
5. Individual package `README.md` files — Per-package patterns

**LLM Integration:**
- `llms.txt` — Quick navigation for LLMs
- `llms-full.txt` — Exhaustive reference with code samples
- `/a/src/llms/llms-medicine-wheel-packages.txt` — Package listing

---

## 🎯 Summary: How It Differs from Western Systems

| Aspect | Western Entity-Centric | Medicine Wheel Relational |
|--------|---------|-------------------|
| **Primary Unit** | Entity (node) | Relation (being) |
| **Governance** | Role-based access control | Ceremony-phase-based + relational check-back |
| **Validation** | Peer review (authority) | Community review (consensus + Elder blessing) |
| **Success** | Output (code, paper, artifact) | Transformation (researcher + community + relations + 7-gen) |
| **Accountability** | Individual + hierarchical | Four-category obligation chains + OCAP® |
| **Consent** | One-time checkbox | Living relationship with renewal + cascade |
| **Data Governance** | Compliance layer | Embedded in every relation (OCAP®) |
| **Time** | Chronological | Ceremonial phases |
| **Epistemology** | Single way of knowing | Four sources (land/dream/code/vision) balanced |
| **Obligations** | External policy | First-class entities in code |
| **Check-Back** | None (proceed until blocked) | Four-step relational verification before action |
| **Metrics** | Process compliance | Wilson's three R's (respect/reciprocity/responsibility) |

---

## 🌍 Relational Principles Manifest Throughout

1. **Ceremony is protocol, not metaphor** — Phases drive access logic
2. **Relations carry obligations** — Not just edges; entities with lifecycles
3. **Consent is relationship** — State machine with renewal, not checkbox
4. **Accountability is distributed** — Across human/land/spirit/future
5. **Transformation is validity** — Success = researcher changed + community benefited
6. **Governance is relational** — Check-back before action, stop-work on misalignment
7. **Epistemology is encoded** — Four directions = four ways of knowing, must all be represented
8. **Community validates** — Through talking circle + Elder blessing, not anonymous peer review

---

