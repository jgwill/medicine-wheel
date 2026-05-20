---
title: "Relational Index API"
description: "API reference for medicine-wheel-relational-index."
---

Source files: `src/relational-index/src/index-manager.ts`, `src/relational-index/src/query.ts`, `src/relational-index/src/dimensions.ts`, `src/relational-index/src/cross-dimensional.ts`, `src/relational-index/src/spiral-depth.ts`, `src/relational-index/src/metrics.ts`.

## Import Path

```ts
import { createIndex, addEntry, queryCrossDimensional, indexHealth } from 'medicine-wheel-relational-index';
```

## Core Signatures

```ts
createIndex(): RelationalIndex
addEntry(index: RelationalIndex, entry: IndexEntry): RelationalIndex
removeEntry(index: RelationalIndex, unitId: string): RelationalIndex
rebuildDimensions(index: RelationalIndex): RelationalIndex
queryBySource(index: RelationalIndex, source: EpistemicSource): IndexEntry[]
queryByDirection(index: RelationalIndex, direction: DirectionName): IndexEntry[]
queryByWeight(index: RelationalIndex, minWeight: number): IndexEntry[]
queryByDepth(index: RelationalIndex, minDepth: number): IndexEntry[]
queryCrossDimensional(index: RelationalIndex, sources: EpistemicSource[]): IndexEntry[]
mapAcrossDimensions(index: RelationalIndex): CrossDimensionalMap
findConvergences(index: RelationalIndex): Convergence[]
detectTensions(index: RelationalIndex): Tension[]
coverageGaps(index: RelationalIndex): DimensionGap[]
measureSpiralDepth(index: RelationalIndex): SpiralDepthMetrics
compareCircles(entry: IndexEntry, previousCircle: IndexEntry): { depthDelta: number; weightDelta: number; description: string }
detectDeepening(refinements: Refinement[]): boolean
detectStagnation(refinements: Refinement[]): boolean
indexHealth(index: RelationalIndex): IndexHealth
```

Example:

```ts
import { createIndex, addEntry, queryBySource, indexHealth } from 'medicine-wheel-relational-index';

let index = createIndex();
index = addEntry(index, {
  unitId: 'iu-1',
  source: 'land',
  direction: 'east',
  epistemicWeight: 0.8,
  circleDepth: 2,
  accountableTo: ['community'],
  tags: ['territory'],
  timestamp: new Date().toISOString(),
});

console.log(queryBySource(index, 'land'));
console.log(indexHealth(index));
```

This package is a pure analysis layer. It does not persist entries by itself and is easiest to pair with `importance-unit` or decomposition output.

Common workflow:

```ts
import {
  createIndex,
  addEntry,
  queryCrossDimensional,
  measureSpiralDepth,
  coverageGaps,
} from 'medicine-wheel-relational-index';

let index = createIndex();
index = addEntry(index, {
  unitId: 'iu-2',
  source: 'vision',
  direction: 'north',
  epistemicWeight: 0.7,
  circleDepth: 1,
  accountableTo: ['future-generations'],
  tags: ['docs', 'architecture'],
  timestamp: new Date().toISOString(),
});

console.log(queryCrossDimensional(index, ['land', 'vision']));
console.log(measureSpiralDepth(index));
console.log(coverageGaps(index));
```

Reach for this package when your question is about balance across epistemic sources, not just graph topology. The implementation in `src/relational-index/src/index-manager.ts` and `src/relational-index/src/cross-dimensional.ts` assumes immutable updates, so it works well in reducers, services, and analytical pipelines.
