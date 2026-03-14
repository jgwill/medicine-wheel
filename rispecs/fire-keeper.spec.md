# fire-keeper — RISE Specification

> Ceremony coordination agent — the living keeper of the ceremony that coordinates multi-agent work through relational gating, ensures Wilson alignment, and maintains ceremony as a transformative experience.

**Version:** 0.1.0  
**Package:** `medicine-wheel-fire-keeper`  
**Document ID:** rispec-fire-keeper-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **actively-governed ceremony spaces** where:
- A fire keeper agent coordinates work through relational gating conditions
- Permission tiers control what agents can observe, analyze, propose, or act upon
- Human decision points are surfaced when value conflicts arise
- Ceremony phases extend beyond the basic four to include gathering and resting
- Trajectory confidence tracks whether the inquiry is staying aligned
- Stop-work orders can halt work that violates relational accountability

---

## Creative Intent

**What this enables:** Wilson's ceremony requires a keeper. Without one, ceremony degrades into process. The fire keeper makes relational accountability *active* rather than *passive* — it can pause work, escalate decisions to humans, and ensure ceremony is a transformative space rather than a procedural checklist.

**Structural Tension:** Between autonomous agent execution (efficiency, speed, parallel work) and relational accountability (ceremony, gating, human agency, Elder authority). The fire-keeper resolves this by acting as the living boundary between machine efficiency and ceremonial integrity.

---

## Ceremony State (Extended)

Five-phase ceremony lifecycle:

| Phase | Focus | Fire Keeper Role |
|-------|-------|-----------------|
| `gathering` | Assembling participants, setting intentions | Welcoming, checking readiness |
| `kindling` | Opening ceremony, establishing sacred space | Lighting the fire, invoking directions |
| `tending` | Active work under ceremony | Monitoring alignment, enforcing gates |
| `harvesting` | Gathering insights, recording outcomes | Ensuring all voices heard |
| `resting` | Integration, reflection, dormancy | Banking the fire, seeding next cycle |

```typescript
type CeremonyPhaseExtended = 'gathering' | 'kindling' | 'tending' | 'harvesting' | 'resting';
```

---

## Type Definitions

### Core Types

```typescript
type PermissionTier = 'observe' | 'analyze' | 'propose' | 'act';
type DecisionPointType = 'value-conflict' | 'permission-escalation' |
                          'circle-completion-review' | 'modality-choice';
type StopWorkReason = 'wilson-violation' | 'ocap-violation' | 'consent-withdrawn' |
                       'ceremony-required' | 'elder-hold' | 'human-override';
```

### FireKeeperConfig

```typescript
interface FireKeeperConfig {
  trajectoryThreshold: number;       // Default: 0.65
  permissionTiers: PermissionTierConfig[];
  gatingConditions: GatingCondition[];
  humanDecisionPoints: DecisionPointType[];
}
```

### FireKeeperState

```typescript
interface FireKeeperState {
  inquiryRef: string;
  ceremonyPhase: CeremonyPhaseExtended;
  activeDirection: DirectionName;
  quadrantState: Record<DirectionName, QuadrantStatus>;
  gatingConditions: GatingConditionStatus[];
  relationalMilestones: RelationalMilestone[];
  trajectoryHistory: TrajectoryCheckpoint[];
  activeStopWork?: StopWorkOrder;
}
```

### Supporting Types

```typescript
interface GatingCondition {
  id: string;
  condition: string;
  required: boolean;
  phase: CeremonyPhaseExtended;
}

interface GatingConditionStatus {
  conditionId: string;
  met: boolean;
  evaluatedAt: string;
  evaluatedBy: string;
}

interface QuadrantStatus {
  entered: boolean;
  enteredAt?: string;
  ceremonyConducted: boolean;
  voicesHeard: number;
}

interface RelationalMilestone {
  description: string;
  direction: DirectionName;
  achievedAt: string;
}

interface TrajectoryCheckpoint {
  timestamp: string;
  confidence: number;             // 0–1
  wilsonAlignment: number;
  phase: CeremonyPhaseExtended;
  notes?: string;
}

interface StopWorkOrder {
  reason: StopWorkReason;
  issuedAt: string;
  issuedBy: string;
  description: string;
  resolution?: string;
  resolvedAt?: string;
}

interface DecisionPoint {
  type: DecisionPointType;
  description: string;
  requiresHuman: boolean;
  options: string[];
}

interface PermissionTierConfig {
  tier: PermissionTier;
  allowedActions: string[];
  requiresCeremony: boolean;
}
```

---

## Module: Fire Keeper Core (`keeper.ts`)

```typescript
createFireKeeper(config, inquiryRef)
// Initializes fire keeper state for an inquiry

advancePhase(state)
// Moves to the next ceremony phase (gathering → kindling → tending → harvesting → resting)

currentPermissionTier(state, agentId)
// Returns the current permission tier for an agent

checkAlignment(state)
// Returns current Wilson alignment and trajectory confidence
```

## Module: Gating (`gating.ts`)

```typescript
evaluateGates(state, config)
// Evaluates all gating conditions, returns which are met/unmet

checkGatingConditions(state, phase)
// Checks conditions required for a specific phase transition

resolveHold(state, conditionId, resolution)
// Marks a gating hold as resolved
```

## Module: Decisions (`decisions.ts`)

```typescript
humanNeeded(state, context)
// Determines if a human decision is needed, returns DecisionPoint or null

permissionEscalation(state, agentId, requestedTier)
// Requests permission escalation for an agent

circleReview(state)
// Triggers a circle completion review
```

## Module: Check-Back Protocol (`check-back.ts`)

```typescript
relationalCheckBack(state, checkpoint)
// 4-step verification: (1) alignment check (2) trajectory (3) gating (4) human needed?
// Returns: { aligned, trajectoryOk, gatesOpen, humanNeeded, summary }
```

## Module: Ceremony State (`ceremony-state.ts`)

```typescript
enterQuadrant(state, direction)
// Records entry into a quadrant

markCeremonyConducted(state, direction)
// Records that ceremony was conducted in a quadrant

recordMilestone(state, milestone)
// Records a relational milestone
```

## Module: Trajectory (`trajectory.ts`)

```typescript
trajectoryConfidence(state)
// Computes overall trajectory confidence (0–1)

valueDivergenceDetect(state, threshold)
// Detects if trajectory has diverged from Wilson alignment

issueStopWork(state, reason, description)
// Issues a stop-work order

resolveStopWork(state, resolution)
// Resolves an active stop-work order
```

## Module: Messages (`messages.ts`)

```typescript
// Message types for inter-agent communication
type FireKeeperMessageType =
  | 'importance.submitted' | 'importance.accepted' | 'importance.held'
  | 'circle.return' | 'agent.report'
  | 'human.response' | 'human.needed'
  | 'deepen.requested' | 'ceremony.state.update'
  | 'stopwork.order';

interface FireKeeperMessage {
  type: FireKeeperMessageType;
  from: string;
  to: string;
  payload: unknown;
  timestamp: string;
  inquiryRef: string;
}
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `medicine-wheel-ceremony-protocol` ^0.1.0, `zod` ^3.23.0
- **Types consumed:** `DirectionName`, `CeremonyPhase`, `AccountabilityTracking` from ontology-core

---

## Wilson Alignment

Wilson's ceremony requires a keeper — the fire keeper makes relational accountability active:
- **Gating:** Work cannot proceed until relational conditions are met
- **Trajectory:** The inquiry's Wilson alignment is continuously monitored
- **Human agency:** Value conflicts and permission escalations surface to humans
- **Stop-work:** Violations of relational accountability can halt work

---

## Test Scenarios

1. **Full ceremony lifecycle:** Create keeper → advance through all 5 phases → verify state transitions
2. **Gating enforcement:** Set required gate → attempt phase advance → verify blocked until gate met
3. **Stop-work order:** Issue stop-work for Wilson violation → verify work halted → resolve → verify resumed
4. **Trajectory divergence:** Record declining alignment checkpoints → valueDivergenceDetect → true
5. **Human escalation:** Trigger value-conflict → humanNeeded → returns decision point with options
6. **Check-back protocol:** Run relationalCheckBack → verify all 4 steps evaluated
7. **Permission tiers:** Agent at 'observe' requests 'act' → permissionEscalation → verify ceremony required
8. **Message protocol:** Create messages of each type → verify correct structure

---

## Advancing Patterns

- **Active governance** — The fire keeper *prevents* violations, not just reports them
- **Ceremony as space** — Five-phase ceremony creates a transformative container
- **Human-in-the-loop** — Value conflicts always surface to humans
- **Relational gating** — Work proceeds only when relational conditions are met

---

## Quality Criteria

- ✅ Creative Orientation: Enables ceremony coordination, not just state tracking
- ✅ Structural Dynamics: Resolves tension between autonomous efficiency and ceremonial integrity
- ✅ Implementation Sufficient: Full API surface documented with types, messages, and state model
- ✅ Codebase Agnostic: No file paths, conceptual coordination model
