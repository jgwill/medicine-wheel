# medicine-wheel-narrative-engine

Beat sequencing, arc validation, cadence patterns, and timeline building for the Medicine Wheel Developer Suite.

## Install

```bash
npm install medicine-wheel-narrative-engine
```

## Modules

### Sequencer
Order and validate narrative beats across the four-direction, four-act structure.

```ts
import { sequenceBeats, insertBeat, nextDirection, suggestNextBeat } from 'medicine-wheel-narrative-engine';

const positions = sequenceBeats(beats);
const suggestion = suggestNextBeat(beats); // { direction: 'west', act: 3 }
```

### Cadence
Ceremonial timing rules mapping directions to phases: East→opening, South→deepening, West→integrating, North→closing.

```ts
import { validateCadence, STANDARD_CADENCE, currentPhase } from 'medicine-wheel-narrative-engine';

const validation = validateCadence(beats, ceremonies, STANDARD_CADENCE);
console.log(validation.phasesCompleted, validation.violations);
```

### Arc Validator
Validate narrative completeness — direction coverage, ceremony presence, Wilson alignment, OCAP® compliance.

```ts
import { validateArc } from 'medicine-wheel-narrative-engine';

const result = validateArc(beats, ceremonies, relations);
console.log(result.completeness.completenessScore); // 0–1
console.log(result.recommendations);
```

### Timeline
Generate timeline data for visualization along chronological, directional, or ceremonial axes.

```ts
import { buildTimeline, actStrip } from 'medicine-wheel-narrative-engine';

const tl = buildTimeline(beats, { axis: 'directional' });
const strip = actStrip(beats); // 4 acts with beats per direction
```

### Cycle Manager
Orchestrate full Medicine Wheel cycles with transition tracking and progress suggestions.

```ts
import { createCycle, computeProgress } from 'medicine-wheel-narrative-engine';

const cycle = createCycle('c1', 'How do trees teach?');
const progress = computeProgress(cycle, beats, ceremonies, relations);
console.log(progress.suggestedAction); // "Move to the west direction (integrating phase)"
```

## Peer dependency

Requires `medicine-wheel-ontology-core` ^0.1.0.

## License

MIT
