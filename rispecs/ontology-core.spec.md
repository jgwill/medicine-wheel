# ontology-core — RISE Specification

> Foundational ontology layer for the Medicine Wheel Developer Suite. Unified TypeScript types, RDF vocabulary, Zod validation schemas, canonical constants, and semantic query helpers — grounded in Indigenous relational ontology where relationships are first-class entities.

**Version:** 0.1.1  
**Package:** `medicine-wheel-ontology-core`  
**Document ID:** rispec-ontology-core-v1  
**Last Updated:** 2026-02-23  

---

## Desired Outcome

Users create **relationally accountable software systems** through a shared ontological foundation that:
- Treats relationships as beings with their own lifecycles, obligations, and ceremony contexts
- Bridges Indigenous relational ontology with semantic web standards (RDF)
- Provides runtime validation at every data boundary
- Enables Wilson alignment tracking (Respect, Reciprocity, Responsibility) and OCAP® compliance

---

## Creative Intent

**What this enables users to create:** A unified type-safe data model where nodes, relations, ceremonies, narrative beats, and structural tension charts all share a single source of truth. Any package in the Medicine Wheel ecosystem can import from ontology-core and immediately participate in the relational web.

**Structural Tension:** Between Western data modeling (flat entities, labeled edges) and Indigenous relational ontology (relationships as first-class beings with obligations, ceremony context, and accountability tracking). The ontology-core resolves this tension through types like `Relation` that carry `OcapFlags`, `AccountabilityTracking`, and `RelationalObligation[]`.

---

## Data Model

### Direction Types

```typescript
type DirectionName = 'east' | 'south' | 'west' | 'north';

interface Direction {
  name: DirectionName;
  ojibwe: string;       // e.g., 'Waabinong'
  season: string;       // e.g., 'Spring'
  color: string;        // hex color
  lifeStage: string;    // e.g., 'Good Life'
  ages: string;         // e.g., 'Birth - 7 years'
  medicine: string[];   // e.g., ['Tobacco (Asemaa)']
  teachings: string[];
  practices: string[];
}
```

### Node Types

```typescript
type NodeType = 'human' | 'land' | 'spirit' | 'ancestor' | 'future' | 'knowledge';

interface RelationalNode {
  id: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### First-Class Relations

Relations are not just labeled edges — they are beings in their own right:

```typescript
interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;              // 0–1
  direction?: DirectionName;
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_type?: CeremonyType;
    ceremony_honored: boolean;
  };
  obligations: RelationalObligation[];
  ocap: OcapFlags;
  accountability: AccountabilityTracking;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### OCAP® Governance

```typescript
interface OcapFlags {
  ownership: string;
  control: string;
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;
  steward?: string;
  consent_given?: boolean;
  consent_scope?: string;
}
```

### Wilson Accountability Tracking

```typescript
interface AccountabilityTracking {
  respect: number;            // 0–1
  reciprocity: number;        // 0–1
  responsibility: number;     // 0–1
  wilson_alignment: number;   // computed average
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

### Ceremony Types

```typescript
type CeremonyType = 'smudging' | 'talking_circle' | 'spirit_feeding' | 'opening' | 'closing';

interface CeremonyLog {
  id: string;
  type: CeremonyType;
  direction: DirectionName;
  participants: string[];
  medicines_used: string[];
  intentions: string[];
  timestamp: string;
  research_context?: string;
  relations_honored?: string[];
  ocap?: OcapFlags;
}
```

### Narrative Types

```typescript
interface NarrativeBeat {
  id: string;
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];
  learnings: string[];
  timestamp: string;
  act: number;               // 1–4, maps to directions
  relations_honored: string[];
}
```

### Structural Tension

```typescript
type TensionPhase = 'germination' | 'assimilation' | 'completion';

interface StructuralTensionChart {
  id: string;
  desired_outcome: string;
  current_reality: string;
  action_steps: ActionStep[];
  phase: TensionPhase;
  direction?: DirectionName;
  created_at: string;
  updated_at: string;
}
```

### RSIS Types

Additional types for the Relational Science Integration System:

- `SunName` — Six thematic suns: NovelEmergence, CreativeActualization, WovenMeaning, FirstCause, EmbodiedPractice, SustainedPresence
- `CeremonyPhase` — `'opening' | 'council' | 'integration' | 'closure'`
- `GovernanceAccess` — `'open' | 'ceremony_required' | 'restricted' | 'sacred'`
- `PersonRole` — `'steward' | 'contributor' | 'elder' | 'firekeeper'`
- `RSISRelationType` — STEWARDS, BORN_FROM, SERVES, GIVES_BACK_TO, ALIGNED_WITH, KINSHIP_OF
- `KinshipHubInfo`, `KinshipRelation`, `ReciprocityFlow`, `ReciprocityBalance`
- `MedicineWheelView` — Aggregated view for UI consumption
- `MWTool`, `MWResource`, `MWPrompt` — MCP protocol types

---

## RDF Vocabulary

Six custom namespaces bridge Indigenous ontology with semantic web:

| Prefix | Namespace | Purpose |
|--------|-----------|---------|
| `mw:` | `https://ontology.medicine-wheel.dev/mw#` | Core concepts (Direction, Relation, Cycle) |
| `cer:` | `https://ontology.medicine-wheel.dev/cer#` | Ceremony and protocol |
| `ocap:` | `https://ontology.medicine-wheel.dev/ocap#` | OCAP® principles |
| `rel:` | `https://ontology.medicine-wheel.dev/rel#` | Relational accountability (Wilson) |
| `ids:` | `https://ontology.medicine-wheel.dev/ids#` | Indigenous Data Sovereignty |
| `beat:` | `https://ontology.medicine-wheel.dev/beat#` | Narrative beats |

Standard interop namespaces: `rdf:`, `rdfs:`, `owl:`, `skos:`, `prov:`, `sh:` (SHACL).

### IRI Utilities

```typescript
prefixed('mw', 'Direction')   // → 'mw:Direction'
expandIRI('mw:Direction')     // → 'https://ontology.medicine-wheel.dev/mw#Direction'
compactIRI('https://ontology.medicine-wheel.dev/mw#Direction') // → 'mw:Direction'
```

---

## Constants

### Canonical Direction Data

```typescript
import { DIRECTIONS, DIRECTION_MAP, DIRECTION_COLORS, OJIBWE_NAMES, DIRECTION_SEASONS } from 'medicine-wheel-ontology-core';

DIRECTION_COLORS.east   // '#FFD700' (gold)
DIRECTION_COLORS.south  // '#DC143C' (crimson)
DIRECTION_COLORS.west   // '#4a4a8a' (indigo)
DIRECTION_COLORS.north  // '#E8E8E8' (white)

OJIBWE_NAMES.east       // 'Waabinong'
OJIBWE_NAMES.south      // 'Zhaawanong'
OJIBWE_NAMES.west       // 'Epangishmok'
OJIBWE_NAMES.north      // 'Kiiwedinong'
```

### Act Mapping (Narrative ↔ Direction)

```typescript
DIRECTION_ACTS   // { east: 1, south: 2, west: 3, north: 4 }
ACT_DIRECTIONS   // { 1: 'east', 2: 'south', 3: 'west', 4: 'north' }
```

### RSIS Constants

```typescript
SUN_NAMES              // All six thematic sun names
SUN_DESCRIPTIONS       // Human-readable descriptions per sun
CEREMONY_PHASES        // ['opening', 'council', 'integration', 'closure']
PERSON_ROLES           // ['steward', 'contributor', 'elder', 'firekeeper']
RSIS_RELATION_TYPES    // ['STEWARDS', 'BORN_FROM', ...]
DIRECTION_INFO         // Per-direction emoji, focus, guidance
```

---

## Zod Validation Schemas

Every type has a corresponding Zod schema for runtime validation:

```typescript
import { RelationalNodeSchema, RelationSchema, OcapFlagsSchema } from 'medicine-wheel-ontology-core';

// Validate at ingestion boundary
const node = RelationalNodeSchema.parse(rawData);

// Inferred validated types
type ValidatedRelationalNode = z.infer<typeof RelationalNodeSchema>;
type ValidatedRelation = z.infer<typeof RelationSchema>;
```

Available schemas: `DirectionNameSchema`, `NodeTypeSchema`, `CeremonyTypeSchema`, `ObligationCategorySchema`, `TensionPhaseSchema`, `AccessLevelSchema`, `PossessionLocationSchema`, `DirectionSchema`, `RelationalNodeSchema`, `RelationalEdgeSchema`, `RelationalObligationSchema`, `OcapFlagsSchema`, `AccountabilityTrackingSchema`, `CeremonyContextSchema`, `RelationSchema`, `CeremonyGuidanceSchema`, `CeremonyLogSchema`, `NarrativeBeatSchema`, `MedicineWheelCycleSchema`, `ActionStepSchema`, `StructuralTensionChartSchema`, `DirectionResponseSchema`.

---

## Semantic Query Helpers

Pure functions operating on in-memory collections (storage layer is external):

### Node Queries

```typescript
nodesByDirection(nodes, 'east')     // All east-aligned nodes
nodesByType(nodes, 'human')         // All human nodes
nodeById(nodes, 'node-123')         // Single node lookup
```

### Relational Traversal

```typescript
relationsForNode(relations, nodeId)                    // All relations touching a node
relationsByType(relations, 'kinship')                  // Filter by relationship type
neighborIds(relations, nodeId)                         // Adjacent node IDs
traverseRelationalWeb(nodes, relations, startId, 3)    // BFS up to depth 3
// Returns: { visited: Set<string>, paths: string[][] }
```

### Wilson Alignment

```typescript
computeWilsonAlignment(accountability)      // Average of respect, reciprocity, responsibility
aggregateWilsonAlignment(relations)          // Average across all relations
cycleWilsonAlignment(cycle, relations)       // Cycle-level alignment
findAccountabilityGaps(relations, 0.5)      // Relations below threshold
```

### OCAP® Compliance

```typescript
checkOcapCompliance(ocapFlags)
// Returns: { compliant: boolean, issues: string[] }

auditOcapCompliance(relations)
// Returns: { overall_compliant, compliant_count, non_compliant_count, issues[] }
```

### Narrative & Ceremony Queries

```typescript
beatsByDirection(beats, 'west')
beatsByAct(beats, 3)
allDirectionsVisited(beats)            // true if all 4 directions have beats
ceremoniesByDirection(ceremonies, 'east')
ceremonyCounts(ceremonies)             // { east: N, south: N, ... }
relationalCompleteness(nodeId, relations)
// Returns: { total_relations, obligation_categories_covered, missing_categories, ceremony_coverage }
```

---

## Dependency

- **Runtime:** `zod` ^3.23.0
- **Peer:** None
- **Consumers:** Every other package in the Medicine Wheel ecosystem depends on ontology-core

---

## Advancing Patterns

- **Single source of truth** — No type duplication between server and client packages
- **Relational-first ontology** — Relations carry obligations, ceremony, and accountability
- **Validation at boundaries** — Zod schemas enforce data integrity at ingestion points
- **Semantic bridge** — RDF vocabulary enables interop with knowledge graph ecosystems
- **Cultural grounding** — Ojibwe names, ceremonial constants, and directional teachings embedded in code

---

## Quality Criteria

- ✅ Creative Orientation: Types enable creating relational webs, not just storing data
- ✅ Structural Dynamics: Tension between Western data models and Indigenous ontology resolved through first-class relations
- ✅ Implementation Sufficient: Another LLM can re-implement from this spec alone
- ✅ Codebase Agnostic: No file paths, only conceptual references
