# community-review — RISE Specification

> Community-based ceremonial review protocol — implements Wilson's validation through Elder review circles, consensus-seeking, talking circle process, and relational accountability assessment.

**Version:** 0.1.0  
**Package:** `medicine-wheel-community-review`  
**Document ID:** rispec-community-review-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **community-validated knowledge systems** where:
- Artifacts are reviewed by circles of community members, not individual experts
- Elder validation provides authoritative blessing grounded in relational accountability
- Talking circles ensure all voices and directions are heard before decisions
- Wilson's three R's (Respect, Reciprocity, Responsibility) are explicitly checked
- OCAP® compliance is assessed as part of every review

---

## Creative Intent

**What this enables:** Software teams and research communities move through ceremonial review processes where validation comes from community consensus rather than individual peer review. Every artifact—research, ceremony, knowledge, code, or narrative—receives community attention proportional to its relational significance.

**Structural Tension:** Between Western peer review (expert judgment, anonymous critique, individual authority) and Indigenous community review (collective wisdom, named voices, Elder blessing, directional perspectives). The community-review package resolves this by implementing talking circles, Elder validation, and consensus-seeking as first-class review primitives.

---

## Review Circle Lifecycle

```
gathering → reviewing → deliberating → decided
```

| Status | Focus | Who Acts |
|--------|-------|----------|
| `gathering` | Assembling the circle — adding reviewers with roles and directions | Circle initiator |
| `reviewing` | Talking circle active — voices being heard | All reviewers |
| `deliberating` | Elder validation requested — wisdom being sought | Elder validator |
| `decided` | Outcome determined — blessing or guidance given | Circle as whole |

---

## Type Definitions

### Core Types

```typescript
type PersonRole = 'steward' | 'contributor' | 'elder' | 'firekeeper' | 'community-member' | 'youth';
type ArtifactType = 'research' | 'ceremony' | 'knowledge' | 'code' | 'narrative';
type ReviewCircleStatus = 'gathering' | 'reviewing' | 'deliberating' | 'decided';
type ReviewOutcomeType = 'approved-with-blessings' | 'deepen-required' | 'return-to-circle' | 'ceremonial-hold' | 'withdrawn';
```

### ReviewCircle

```typescript
interface ReviewCircle {
  id: string;
  artifactId: string;
  artifactType: ArtifactType;
  reviewers: Reviewer[];
  elderValidator?: string;
  status: ReviewCircleStatus;
  outcome?: ReviewOutcome;
  talkingCircleLog: TalkingCircleEntry[];
  wilsonAlignment: number;       // 0–1
  ocapCompliant: boolean;
  createdAt: string;
}
```

### Reviewer

```typescript
interface Reviewer {
  id: string;
  role: PersonRole;
  direction?: DirectionName;     // Perspective they bring
  voice?: string;                // Their review statement
  accountableTo: string[];       // Who they represent
}
```

### ReviewOutcome

```typescript
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
  conditions: string[];
  nextAction: string;
}
```

### TalkingCircleEntry

```typescript
interface TalkingCircleEntry {
  speakerId: string;
  role: PersonRole;
  direction?: DirectionName;
  voice: string;
  timestamp: string;
  inResponseTo?: string;
}
```

---

## Module: Circle Management

```typescript
createReviewCircle(artifactId, artifactType)
// Creates a new circle in 'gathering' status

addReviewer(circle, reviewer)
// Adds a participant (only while 'gathering')

submitForReview(circle)
// Transitions to 'reviewing' (requires ≥1 reviewer)

closeCircle(circle, outcome)
// Finalizes with outcome, transitions to 'decided'

circleStatus(circle)
// Returns: { status, reviewerCount, hasElder, voicesHeard, outcomeType? }
```

## Module: Elder Validation

```typescript
requestElderValidation(circle, elderId)
// Sets elderValidator, transitions to 'deliberating'

elderGuidance(circle)
// Returns: { artifactType, voicesHeard, directionsRepresented, wilsonAlignment, suggestions[] }

elderBlessing(circle, elderId, blessing)
// Records Elder's blessing in the talking circle log
```

## Module: Consensus & Talking Circle

```typescript
seekConsensus(circle)
// Returns: { consensusReached, emergingOutcome, voiceCount, reviewerCount, allReviewersSpoken }

talkingCircle(circle, entry)
// Adds a voice to the talking circle (only during 'reviewing' or 'deliberating')

recordVoices(circle)
// Returns: { total, byDirection, byRole, unheardReviewers }

resolveDisagreement(circle, process)
// process: 'deeper-listening' | 'elder-mediation' | 'return-to-ceremony' | 'rest-and-return'
// Returns: { guidance, nextStatus, suggestedActions[] }
```

## Module: Accountability

```typescript
reviewerAccountability(reviewer)
// Returns: { reviewerId, role, accountableTo, direction?, accountabilityStatement }

reviewAgainstWilson(circle)
// Returns: { wilsonCheck, score, observations[] }

reviewAgainstOcap(circle)
// Returns: { compliant, issues[] }

relationalHealthReview(circle)
// Returns: { healthy, score, dimensions: { diversity, participation, accountability, elderPresence }, recommendations[] }
```

## Module: Outcomes

```typescript
approveWithBlessings(circle, blessing)
// Produces 'approved-with-blessings' outcome with Elder blessing

requestDeepening(circle, areas)
// Produces 'deepen-required' outcome with specific areas to deepen

returnToCircle(circle, reason)
// Produces 'return-to-circle' outcome with revision reason

ceremonialHold(circle, reason)
// Produces 'ceremonial-hold' outcome — ceremony needed before proceeding
```

---

## Zod Validation Schemas

Every type has a corresponding Zod schema for runtime validation:

```typescript
PersonRoleSchema, ArtifactTypeSchema, ReviewCircleStatusSchema, ReviewOutcomeTypeSchema
ReviewerSchema, TalkingCircleEntrySchema, WilsonCheckSchema
ReviewOutcomeSchema, ReviewCircleSchema
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `medicine-wheel-ceremony-protocol` ^0.1.0, `zod` ^3.23.0
- **Types consumed:** `DirectionName`, `AccountabilityTracking`, `OcapFlags` from ontology-core

---

## Wilson Alignment

Wilson describes research validation not through peer review but through *community review*:
- **Respect:** All directions and roles are represented in the circle
- **Reciprocity:** Elder and community voices ensure mutual benefit
- **Responsibility:** Every reviewer explicitly states who they are accountable to

---

## Test Scenarios

1. **Full review lifecycle:** Create circle → add reviewers → submit → talking circle → Elder validation → consensus → approve with blessings → close
2. **Disagreement resolution:** Circle with conflicting voices → resolveDisagreement with each process type → verify guidance
3. **Wilson alignment check:** Circle with incomplete perspectives → reviewAgainstWilson → verify low score and observations
4. **OCAP® compliance:** Circle without steward → reviewAgainstOcap → verify issues reported
5. **Relational health:** Circle with varied participation → relationalHealthReview → verify score and recommendations
6. **Status guards:** Attempt to add reviewer to non-gathering circle → verify error thrown

---

## Advancing Patterns

- **Community over expert** — Validation comes from collective wisdom, not individual authority
- **Named voices** — No anonymous review; every voice carries directional and role context
- **Elder blessing** — The most authoritative validation requires relational presence, not credentials
- **Consensus-first** — Decisions emerge from hearing all voices, not majority vote

---

## Quality Criteria

- ✅ Creative Orientation: Enables ceremony-aware community review, not just approval workflows
- ✅ Structural Dynamics: Resolves tension between peer review and community review
- ✅ Implementation Sufficient: Full API surface documented with types and examples
- ✅ Codebase Agnostic: No file paths, conceptual review model
