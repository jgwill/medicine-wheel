# importance-unit — RISE Specification

> Relational knowledge tracking — implements the ImportanceUnit as a relationally-accountable piece of meaning carrying epistemic weight, source dimensions, accountability links, and circle depth tracking.

**Version:** 0.1.0  
**Package:** `medicine-wheel-importance-unit`  
**Document ID:** rispec-importance-unit-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **epistemically-weighted knowledge systems** where:
- Knowledge units carry relational weight — dream-state insights may outweigh rational analysis
- Circle depth tracking shows how understanding deepens through spiral revisitation
- Accountability links connect every piece of knowledge to its relational obligations
- Four epistemic source dimensions (Land, Dream, Code, Vision) are first-class
- Axiological pillars (ontology, epistemology, methodology, axiology) frame every unit

---

## Creative Intent

**What this enables:** A knowledge system where not all knowledge is flat. Dream-state and embodied knowledge carry higher epistemic authority per Wilson's framework. Knowledge deepens through circular revisitation — the system tracks how meaning shifts between the 3rd and 4th circling.

**Structural Tension:** Between Western epistemology (all knowledge is equal if peer-reviewed) and Indigenous epistemology (knowledge has relational weight depending on source, ceremony context, and circle depth). The importance-unit resolves this through explicit epistemic weighting and source dimension tracking.

---

## Type Definitions

### Core Types

```typescript
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';
type AccountabilityLinkType = 'accountable-to' | 'deepens' | 'tensions-with' |
                               'emerges-from' | 'gates' | 'circles-back-to';
type AxiologicalPillar = 'ontology' | 'epistemology' | 'methodology' | 'axiology';
```

### ImportanceUnit

```typescript
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
```

### Supporting Types

```typescript
interface AccountabilityLink {
  targetId: string;
  type: AccountabilityLinkType;
  description: string;
  strength: number;                   // 0–1
}

interface CircleRefinement {
  circle: number;
  shift: string;                      // What changed in understanding
  timestamp: string;
}

interface GatingConditionStatus {
  condition: string;
  met: boolean;
  evaluatedAt: string;
}
```

---

## Module: Unit Management (`unit.ts`)

```typescript
createUnit(direction, source, summary)
// Creates a new ImportanceUnit with initial epistemic weight based on source

updateUnit(unit, updates)
// Updates unit content while preserving history

circleBack(unit, refinement)
// Increments circleDepth, records refinement shift, updates lastCircledAt

archive(unit)
// Marks unit as archived (no longer active in the circle)
```

## Module: Epistemic Weight (`epistemic-weight.ts`)

```typescript
computeWeight(unit)
// Calculates epistemic weight factoring source, depth, ceremony state

adjustForSource(baseWeight, source)
// dream/land → higher weight; code/vision → base weight

adjustForDepth(weight, circleDepth)
// Weight increases with depth — deeper circling indicates stronger knowledge
```

## Module: Accountability (`accountability.ts`)

```typescript
linkAccountability(unit, link)
// Adds an accountability link to the unit

resolveLinks(unit, allUnits)
// Resolves accountability link targets, returns linked units

findGaps(unit)
// Identifies missing accountability (e.g., no human relation, no land relation)
```

## Module: Circle Tracking (`circle-tracking.ts`)

```typescript
incrementCircle(unit)
// Advances the circle depth by 1

recordRefinement(unit, shift)
// Records what changed in this circling

detectDeepening(unit)
// Returns whether recent circlings show genuine deepening vs. stagnation
```

## Module: Ceremony State (`ceremony-state.ts`)

```typescript
trackQuadrants(unit, direction)
// Records that a direction has been visited

checkCircleComplete(unit)
// Returns true if all four quadrants have been visited

evalGating(unit, conditions)
// Evaluates gating conditions against current state
```

---

## Zod Validation Schemas

```typescript
EpistemicSourceSchema, AccountabilityLinkTypeSchema, AxiologicalPillarSchema
ImportanceUnitSchema, AccountabilityLinkSchema, CircleRefinementSchema
GatingConditionStatusSchema
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `zod` ^3.23.0
- **Types consumed:** `DirectionName` from ontology-core

---

## Wilson Alignment

Wilson's epistemology holds that knowledge has relational weight:
- **Dream-state knowledge** starts at 0.85+ epistemic weight
- **Land-based knowledge** carries embodied authority
- **Circle depth** — knowledge that has been revisited many times carries more weight
- **Accountability links** — every piece of knowledge must be accountable to its relations

---

## Test Scenarios

1. **Unit creation:** Create unit with 'dream' source → verify epistemic weight ≥ 0.85
2. **Circle-back:** Create unit → circleBack twice → verify circleDepth = 3, refinements recorded
3. **Deepening detection:** Create unit with 3 circlings with genuine shifts → detectDeepening → true
4. **Stagnation detection:** Create unit with 3 circlings with identical shifts → detectDeepening → false
5. **Quadrant tracking:** Visit east, south, west, north → checkCircleComplete → true
6. **Accountability gaps:** Unit with no human accountability link → findGaps → reports 'human' gap
7. **Weight computation:** dream source + depth 3 → computeWeight returns higher than code source + depth 1

---

## Advancing Patterns

- **Epistemic pluralism** — Multiple sources of knowing honored equally
- **Spiral deepening** — Knowledge grows through circular revisitation
- **Relational weight** — Not all knowledge is equal; context matters
- **Ceremony gating** — Some knowledge requires ceremony before it can proceed

---

## Quality Criteria

- ✅ Creative Orientation: Enables weighted, spiraling knowledge creation
- ✅ Structural Dynamics: Resolves tension between flat and weighted epistemology
- ✅ Implementation Sufficient: Full API surface documented with types and examples
- ✅ Codebase Agnostic: No file paths, conceptual knowledge model
