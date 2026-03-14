# transformation-tracker — RISE Specification

> Research impact and growth tracking — implements Wilson's validity criterion: "If research doesn't change you, you haven't done it right." Tracks transformative impact on researchers, communities, and relational networks.

**Version:** 0.1.0  
**Package:** `medicine-wheel-transformation-tracker`  
**Document ID:** rispec-transformation-tracker-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **transformation-aware research systems** where:
- Researcher growth is tracked through periodic understanding snapshots
- Community impact is recorded alongside individual transformation
- Relational shifts (before/after strength changes) are explicitly tracked
- A reciprocity ledger ensures giving and receiving are balanced
- Seven-generation impact assessment considers future consequences
- Wilson validity is computable: has the research actually transformed?

---

## Creative Intent

**What this enables:** A research system that measures success not by publication count or citation index, but by *transformation* — of the researcher, the community, and the relational web. Wilson's validity criterion becomes computable.

**Structural Tension:** Between Western research validity (replicability, generalizability, peer approval) and Indigenous research validity (transformation of researcher, community benefit, relational strengthening, reciprocity balance). The transformation-tracker resolves this by making transformation measurable alongside — not instead of — traditional metrics.

---

## Type Definitions

### Core Types

```typescript
type CeremonyPhaseExtended = 'gathering' | 'kindling' | 'tending' | 'harvesting' | 'resting';
```

### TransformationLog

```typescript
interface TransformationLog {
  id: string;
  researchCycleId: string;
  snapshots: GrowthSnapshot[];
  reflections: Reflection[];
  communityImpacts: CommunityImpact[];
  relationalShifts: RelationalShift[];
  reciprocityLedger: ReciprocityEntry[];
  sevenGenerationScore: number;       // 0–1
  overallTransformation: number;      // 0–1 composite score
}
```

### GrowthSnapshot

```typescript
interface GrowthSnapshot {
  timestamp: string;
  direction: DirectionName;
  ceremonyPhase: CeremonyPhaseExtended;
  understanding: string;              // Free-text description
  relationsCount: number;
  wilsonAlignment: number;
  keyInsights: string[];
  openQuestions: string[];
}
```

### Supporting Types

```typescript
interface Reflection {
  id: string;
  timestamp: string;
  direction: DirectionName;
  prompt: string;                     // What prompted this reflection
  content: string;                    // The reflection itself
  catalysts: string[];                // What caused the reflection
}

interface CommunityImpact {
  id: string;
  description: string;
  community: string;
  direction: DirectionName;
  benefitType: 'knowledge' | 'healing' | 'capacity' | 'connection' | 'sovereignty';
  timestamp: string;
  voicedBy?: string;                  // Who reported this impact
}

interface RelationalShift {
  relationId: string;
  before: { strength: number; description: string };
  after: { strength: number; description: string };
  catalyst: string;
  direction: DirectionName;
  timestamp: string;
}

interface ReciprocityEntry {
  type: 'giving' | 'receiving';
  description: string;
  relatedTo: string;
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

---

## Module: Researcher Growth (`researcher.ts`)

```typescript
logReflection(log, reflection)
// Records a researcher self-reflection entry

snapshotUnderstanding(log, snapshot)
// Takes a periodic understanding snapshot

compareSnapshots(earlier, later)
// Compares two snapshots, identifies growth dimensions

detectGrowth(log)
// Analyzes snapshot sequence for genuine growth vs. stagnation
```

## Module: Community Impact (`community.ts`)

```typescript
logCommunityImpact(log, impact)
// Records a community impact

reciprocityBalance(log)
// Computes giving/receiving balance across all categories

communityVoice(log, voicedBy, description)
// Records community-voiced impact (not self-reported)

impactTimeline(log)
// Returns chronological timeline of all impacts
```

## Module: Relational Shifts (`relational-shift.ts`)

```typescript
trackRelationalChange(log, shift)
// Records a before/after relational shift

beforeAfter(log, relationId)
// Returns the full shift history for a relation

strengthDelta(log)
// Computes net relational strength change across all tracked relations

newRelationsFormed(log)
// Identifies relations that didn't exist at the start
```

## Module: Seven Generations (`seven-generations.ts`)

```typescript
sevenGenScore(log)
// Computes seven-generation impact score (0–1)

futureImpact(log)
// Assesses impact on future generations based on current trajectory

sustainabilityCheck(log)
// Returns whether the research creates sustainable benefit
```

## Module: Reciprocity Ledger (`reciprocity-ledger.ts`)

```typescript
logGiving(log, entry)
// Records a giving action

logReceiving(log, entry)
// Records a receiving action

balanceCheck(log)
// Returns: { giving, receiving, balanced, categories }

reciprocityDebt(log)
// Identifies categories where receiving exceeds giving

reciprocityGrowth(log)
// Tracks how reciprocity balance has changed over time
```

## Module: Prompts (`prompts.ts`)

```typescript
reflectionPrompts(phase)
// Returns ceremony-phase-appropriate reflection prompts

phaseTransitionPrompts(fromPhase, toPhase)
// Returns prompts for the transition between phases

milestonePrompts(milestone)
// Returns prompts for specific relational milestones
```

## Module: Validity (`validity.ts`)

```typescript
wilsonValidityCheck(log)
// Returns WilsonValidity — has the research transformed?
// Checks: researcher transformed, community benefited, relations strengthened,
//         reciprocity balanced, seven generations considered
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `medicine-wheel-ceremony-protocol` ^0.1.0, `zod` ^3.23.0
- **Types consumed:** `DirectionName`, `ObligationCategory`, `AccountabilityTracking` from ontology-core

---

## Wilson Alignment

This is Wilson's **validity criterion** for Indigenous research:
- **Transformation:** Has the researcher been genuinely changed?
- **Community benefit:** Has the community received meaningful benefit?
- **Relational strengthening:** Are relationships stronger after the research?
- **Reciprocity:** Is giving and receiving in balance?
- **Seven generations:** Does the impact sustain across generations?

---

## Test Scenarios

1. **Full transformation lifecycle:** Create log → add snapshots → add reflections → add impacts → wilsonValidityCheck → verify score
2. **Growth detection:** Add snapshots showing deepening understanding → detectGrowth → true
3. **Stagnation detection:** Add identical snapshots → detectGrowth → false
4. **Reciprocity balance:** Log 3 giving + 1 receiving → balanceCheck → imbalanced
5. **Relational shift:** Track relation from 0.3 to 0.8 strength → strengthDelta → positive
6. **Seven-generation score:** Log with future-oriented impacts → sevenGenScore → high
7. **Wilson validity:** Complete log with all dimensions → wilsonValidityCheck → overallValid: true
8. **Community-voiced impact:** Record impact voiced by community member → verify voicedBy field

---

## Advancing Patterns

- **Transformation as validity** — Success measured by change, not compliance
- **Multi-dimensional growth** — Researcher, community, and relational dimensions tracked independently
- **Reciprocity as obligation** — Giving and receiving must balance across categories
- **Future accountability** — Seven-generation thinking embedded in assessment

---

## Quality Criteria

- ✅ Creative Orientation: Enables transformation tracking, not just metric collection
- ✅ Structural Dynamics: Resolves tension between Western and Indigenous validity criteria
- ✅ Implementation Sufficient: Full API surface documented with types and examples
- ✅ Codebase Agnostic: No file paths, conceptual transformation model
