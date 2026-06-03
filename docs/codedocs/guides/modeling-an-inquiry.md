---
title: "Modeling An Inquiry"
description: "Build a minimal but realistic inquiry flow with ontology-core, importance-unit, narrative-engine, and the Fire Keeper."
---

This guide shows how to move from a research question to structured beats and a Fire Keeper decision without involving a database yet.

<Steps>
<Step>
### Define the inquiry model

```ts
import type { MedicineWheelCycle, NarrativeBeat } from 'medicine-wheel-ontology-core';
import { createCycle } from 'medicine-wheel-narrative-engine';

const cycle: MedicineWheelCycle = createCycle(
  'cycle-docs-1',
  'How should the public documentation reflect relational accountability?'
);

const beats: NarrativeBeat[] = [];
```

</Step>
<Step>
### Create an ImportanceUnit from the first insight

```ts
import { createUnit, circleBack } from 'medicine-wheel-importance-unit';

let unit = createUnit({
  direction: 'east',
  source: 'vision',
  summary: 'The docs should explain why relation objects carry governance state.',
  createdBy: 'docs-agent',
  axiologicalPillar: 'methodology',
  inquiryRef: cycle.id,
});

unit = circleBack(unit, 'The explanation must connect architecture to user-facing API choices.');
```

</Step>
<Step>
### Turn the insight into a beat sequence

```ts
import { insertBeat, suggestNextBeat, detectEpistemicDeepening } from 'medicine-wheel-narrative-engine';

const beat = {
  id: 'beat-1',
  direction: unit.direction,
  title: 'Explain the ontology foundation',
  description: unit.content.summary,
  ceremonies: [],
  learnings: ['Relations are first-class entities'],
  timestamp: new Date().toISOString(),
  act: 1,
  relations_honored: [],
};

const inserted = insertBeat(beats, beat, { enforceDirectionOrder: true });
const next = suggestNextBeat(inserted.positions.map((p) => p.beat));
const depth = detectEpistemicDeepening(inserted.positions.map((p) => p.beat));

console.log(next);
console.log(depth);
```

</Step>
<Step>
### Gate the work through the Fire Keeper

```ts
import { FireKeeper, DEFAULT_GATES } from 'medicine-wheel-fire-keeper';

const keeper = new FireKeeper({
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: [],
});

keeper.beginCeremony(cycle.id);

const decision = keeper.evaluateImportance(
  {
    id: unit.id,
    title: beat.title,
    direction: unit.direction,
  },
  cycle.id
);

console.log(decision);
```

</Step>
</Steps>

Complete runnable example:

```ts
import { createUnit, circleBack } from 'medicine-wheel-importance-unit';
import { createCycle, insertBeat, suggestNextBeat } from 'medicine-wheel-narrative-engine';
import { FireKeeper, DEFAULT_GATES } from 'medicine-wheel-fire-keeper';

const cycle = createCycle('cycle-docs-1', 'How should the documentation model relational accountability?');

let unit = createUnit({
  direction: 'east',
  source: 'vision',
  summary: 'The docs should show how ontology, governance, and orchestration fit together.',
  createdBy: 'docs-agent',
  inquiryRef: cycle.id,
});

unit = circleBack(unit, 'The explanation must include source-file references and practical examples.');

const beat = {
  id: 'beat-1',
  direction: unit.direction,
  title: 'Explain the ontology foundation',
  description: unit.content.summary,
  ceremonies: [],
  learnings: ['Shared types shape the whole suite'],
  timestamp: new Date().toISOString(),
  act: 1,
  relations_honored: [],
};

const inserted = insertBeat([], beat, { enforceDirectionOrder: true });

const keeper = new FireKeeper({
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: [],
});

keeper.beginCeremony(cycle.id);
const decision = keeper.evaluateImportance({ id: unit.id, title: beat.title, direction: unit.direction }, cycle.id);

console.log(suggestNextBeat(inserted.positions.map((p) => p.beat)));
console.log(decision.type);
```

The important pattern is not the specific content of the beat. It is the sequence: model the unit first, let the narrative engine locate it in the cycle, and let the Fire Keeper decide whether it can proceed.
