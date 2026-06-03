---
title: "Fire Keeper API"
description: "API reference for medicine-wheel-fire-keeper."
---

Source files: `src/fire-keeper/src/keeper.ts`, `src/fire-keeper/src/gating.ts`, `src/fire-keeper/src/decisions.ts`, `src/fire-keeper/src/check-back.ts`, `src/fire-keeper/src/ceremony-state.ts`, `src/fire-keeper/src/trajectory.ts`.

## Import Path

```ts
import { FireKeeper, DEFAULT_GATES, permissionEscalation } from 'medicine-wheel-fire-keeper';
```

## `FireKeeper` Class

```ts
class FireKeeper {
  constructor(config: FireKeeperConfig)
  getState(): FireKeeperState
  beginCeremony(inquiryRef: string, startDirection?: DirectionName): CeremonyStateExtended
  evaluateImportance(unit: Record<string, unknown>, inquiryRef: string): ImportanceEvaluationResult
  checkCeremonyState(inquiryRef: string): CeremonyStateExtended | null
  requestDeepening(unitId: string, direction: DirectionName, guidance: string): DeepenRequestedMessage
  issueStopWork(targetAgentId: string, reason: string, unitId?: string | null): StopWorkOrderMessage
  checkRelationalAlignment(inquiryRef: string): RelationalAlignmentResult
}
```

Constructor parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `trajectoryThreshold` | `number` | required | Minimum acceptable confidence before escalation. |
| `permissionTiers` | `PermissionTier[]` | required | Ordered tier list such as `observe` to `act`. |
| `gatingConditions` | `GatingCondition[]` | required | Required and advisory gates. |
| `humanDecisionPoints` | `DecisionPoint[]` | required | Custom triggers for human escalation. |

Example:

```ts
const keeper = new FireKeeper({
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: [],
});
```

## Helper Exports

```ts
evaluateGates(conditions: GatingCondition[], context: FireKeeperContext): GateEvaluationResult
createGate(condition: string, evaluator: (context: FireKeeperContext) => boolean, required?: boolean): GatingCondition
resolveHold(gateStatuses: GatingConditionStatus[], gateCondition: string, resolvedBy: string): GatingConditionStatus[]
humanNeeded(context: FireKeeperContext, decisionPoints: DecisionPoint[], trajectoryThreshold?: number): HumanDecisionResult
permissionEscalation(currentTier: PermissionTier, requestedAction: PermissionTier): EscalationResult
circleReview(context: FireKeeperContext): CircleReviewResult
relationalCheckBack(action: string, context: FireKeeperContext): CheckBackResult
createCeremonyState(inquiryRef: string, startDirection?: DirectionName): CeremonyStateExtended
trajectoryConfidence(history: TrajectoryCheckpoint[]): number
valueDivergenceDetect(current: number, intended: number, threshold?: number): DivergenceResult
```

Common pattern:

```ts
import {
  FireKeeper,
  DEFAULT_GATES,
  permissionEscalation,
  trajectoryConfidence,
} from 'medicine-wheel-fire-keeper';

const escalation = permissionEscalation('propose', 'act');
console.log(escalation);
console.log(trajectoryConfidence([]));
```

Use this package when you need an active governance runtime. If you only need phase matching or path access checks, use `medicine-wheel-ceremony-protocol` directly.

One detail worth calling out from `src/fire-keeper/src/keeper.ts`: `evaluateImportance` returns message objects instead of throwing for ordinary holds. That design makes it easy to plug the class into an agent bus, job runner, or UI state machine. Reserve exceptions for true programmer errors; ordinary governance failures are represented as explicit outcomes you can inspect and log.
