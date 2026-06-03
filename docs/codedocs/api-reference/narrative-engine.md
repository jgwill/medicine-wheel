---
title: "Narrative Engine API"
description: "API reference for medicine-wheel-narrative-engine."
---

Source files: `src/narrative-engine/src/sequencer.ts`, `src/narrative-engine/src/cadence.ts`, `src/narrative-engine/src/arc.ts`, `src/narrative-engine/src/timeline.ts`, `src/narrative-engine/src/cycle.ts`, `src/narrative-engine/src/rsis-narrative.ts`.

## Import Path

```ts
import { insertBeat, validateArc, buildTimeline, computeProgress } from 'medicine-wheel-narrative-engine';
```

## Sequencing And Cadence

```ts
sequenceBeats(beats: NarrativeBeat[]): BeatPosition[]
insertBeat(beats: NarrativeBeat[], newBeat: NarrativeBeat, opts?: SequencerOptions): BeatInsertResult
beatsByDirection(beats: NarrativeBeat[]): Record<DirectionName, NarrativeBeat[]>
nextDirection(beats: NarrativeBeat[]): DirectionName | null
currentAct(beats: NarrativeBeat[]): number
suggestNextBeat(beats: NarrativeBeat[]): { direction: DirectionName; act: number }
spiralOrder(beats: NarrativeBeat[]): NarrativeBeat[]
detectEpistemicDeepening(beats: NarrativeBeat[]): { circleCount: number; deepeningIndicators: string[]; stagnationRisk: boolean }
findTransformationPoints(beats: NarrativeBeat[]): Array<{ beatId: string; beforeUnderstanding: string; afterUnderstanding: string; catalyst: string }>
currentPhase(beats: NarrativeBeat[]): CadencePhase
validateCadence(beats: NarrativeBeat[], ceremonies: CeremonyLog[], pattern?: CadencePattern): CadenceValidation
detectTransitions(beats: NarrativeBeat[]): Array<{ from: DirectionName; to: DirectionName; beatIndex: number }>
```

## Arc, Timeline, And Cycle

```ts
computeCompleteness(beats: NarrativeBeat[], ceremonies: CeremonyLog[], relations: Relation[]): ArcCompleteness
validateArc(beats: NarrativeBeat[], ceremonies: CeremonyLog[], relations: Relation[]): ArcValidationResult
isArcComplete(beats: NarrativeBeat[]): boolean
buildTimeline(beats: NarrativeBeat[], options?: TimelineOptions): TimelineData
actStrip(beats: NarrativeBeat[]): Array<{ act: number; direction: DirectionName; beats: NarrativeBeat[]; hasCeremony: boolean }>
extractTransitions(beats: NarrativeBeat[], ceremonies: CeremonyLog[]): CycleTransition[]
computeProgress(cycle: MedicineWheelCycle, beats: NarrativeBeat[], ceremonies: CeremonyLog[], relations: Relation[]): CycleProgress
createCycle(id: string, researchQuestion: string): MedicineWheelCycle
updateCycleMetadata(cycle: MedicineWheelCycle, beats: NarrativeBeat[], ceremonies: CeremonyLog[], relations: Relation[]): MedicineWheelCycle
```

## Narrative Generators

```ts
generateProvenanceNarrative(symbolName: string, lineage: CeremonyLineageEntry[], inquiries: Array<{ name: string }>, stewards: Array<{ name: string }>): string
generateReciprocityObservation(stewardCount: number, flowCount: number): string
generateDirectionObservation(distribution: DirectionDistribution, total: number): string
getCeremonyPhaseFraming(phase?: CeremonyPhase): string
describeSun(sun: SunName): string
```

Example:

```ts
const validation = validateArc(beats, ceremonies, relations);
const timeline = buildTimeline(beats, { axis: 'directional' });
const progress = computeProgress(cycle, beats, ceremonies, relations);

console.log(validation.recommendations);
console.log(timeline.groups);
console.log(progress.suggestedAction);
```

This package is the best fit when your application needs to present inquiry progress as a cycle rather than a flat task list.

The internal split between files matters:

- `sequencer.ts` manages beat order and deepening heuristics
- `cadence.ts` enforces ceremony timing rules
- `arc.ts` computes completeness and recommendations
- `timeline.ts` reshapes the same beats for visualization
- `cycle.ts` turns those pieces into a next-action summary

That makes the package useful even when you do not adopt the whole cycle API. You can use only `validateArc` for governance reporting, only `buildTimeline` for presentation, or only `suggestNextBeat` while planning.
