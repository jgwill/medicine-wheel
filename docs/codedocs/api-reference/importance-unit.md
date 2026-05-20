---
title: "Importance Unit API"
description: "API reference for medicine-wheel-importance-unit."
---

Source files: `src/importance-unit/src/index.ts`, `src/importance-unit/src/unit.ts`, `src/importance-unit/src/epistemic-weight.ts`, `src/importance-unit/src/accountability.ts`, `src/importance-unit/src/circle-tracking.ts`.

## Import Path

```ts
import {
  createUnit,
  circleBack,
  computeWeight,
  linkAccountability,
  detectDeepening,
} from 'medicine-wheel-importance-unit';
```

## Core Signatures

```ts
createUnit(input: CreateUnitInput): ImportanceUnit
updateUnit(unit: ImportanceUnit, input: UpdateUnitInput): ImportanceUnit
circleBack(unit: ImportanceUnit, shift: string): ImportanceUnit
archive(unit: ImportanceUnit): ImportanceUnit
computeWeight(source: EpistemicSource, circleDepth: number): number
adjustForSource(currentWeight: number, currentSource: EpistemicSource, newSource: EpistemicSource): number
adjustForDepth(source: EpistemicSource, newDepth: number): number
linkAccountability(unit: ImportanceUnit, link: AccountabilityLink): ImportanceUnit
resolveLinks(unit: ImportanceUnit, allUnits: Map<string, ImportanceUnit>): { resolved: AccountabilityLink[]; unresolved: AccountabilityLink[] }
findGaps(units: ImportanceUnit[]): AccountabilityGap[]
incrementCircle(unit: ImportanceUnit, direction: DirectionName): ImportanceUnit
recordRefinement(unit: ImportanceUnit, shift: string): ImportanceUnit
detectDeepening(unit: ImportanceUnit): DeepeningAnalysis
detectStagnation(unit: ImportanceUnit): StagnationAnalysis
```

## Creation Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `direction` | `DirectionName` | required | Quadrant alignment for the new unit. |
| `source` | `EpistemicSource` | required | One of `land`, `dream`, `code`, or `vision`. |
| `summary` | `string` | required | Human-readable meaning carried by the unit. |
| `createdBy` | `string` | required | Agent or person creating the record. |
| `axiologicalPillar` | `AxiologicalPillar` | optional | Wilson-aligned pillar classification. |
| `accountabilityLinks` | `AccountabilityLink[]` | `[]` | Initial relational links. |

Example:

```ts
import { createUnit, circleBack } from 'medicine-wheel-importance-unit';

let unit = createUnit({
  direction: 'east',
  source: 'dream',
  summary: 'This insight emerged in ceremony.',
  createdBy: 'researcher-1',
});

unit = circleBack(unit, 'The insight now has a clearer methodological implication.');
```

## Common Combined Pattern

```ts
import {
  createUnit,
  linkAccountability,
  incrementCircle,
  recordRefinement,
  detectStagnation,
} from 'medicine-wheel-importance-unit';

let unit = createUnit({
  direction: 'south',
  source: 'code',
  summary: 'Traversal rules should respect ceremony boundaries.',
  createdBy: 'docs-agent',
});

unit = linkAccountability(unit, {
  targetId: 'community-review',
  relationType: 'accountable-to',
});

unit = incrementCircle(unit, 'west');
unit = recordRefinement(unit, 'The same rule also affects audit recommendations.');

console.log(detectStagnation(unit));
```

See the [Types](/docs/types) page for the full `ImportanceUnit`, `CreateUnitInput`, `AccountabilityLink`, and `CeremonyState` definitions.
