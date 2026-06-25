# @medicine-wheel/perception-layer

Witness film-production source material as typed relational events.

This package is the **eyes and ears** layer for agent-supported Indigenous film production. It turns transcript or device-stream material into `PerceptualEvent`s, records who witnessed the material, and seeds an additive production graph in `@medicine-wheel/ontology-core`.

## Why it exists

Episode 066 introduced the belt-device / eyes-and-ears metaphor. Episode 067 and the Nicolas Renaud conversation clarified the relational frame: film is not just content capture, it is knowledge emerging through relationship. This package makes that frame executable without changing core ontology unions.

Production entities ride on existing `knowledge` nodes with `metadata.kind`; edges use the additive `ProductionRelation` subtype.

## Install

```bash
npm install @medicine-wheel/perception-layer
```

## API

```ts
import {
  registerParticipant,
  ingestTranscript,
  buildProductionGraph,
} from '@medicine-wheel/perception-layer';

const mia = registerParticipant('Mia', 'witness', ['🧠', 'Mia']);
const events = ingestTranscript(transcript, {
  source: '/path/to/episode-066-transcript.txt',
  participant: mia,
});

const graph = buildProductionGraph(events, {
  participant: mia,
  recordingName: 'Episode 066 belt recording',
});
```

## Main concepts

- `PerceptualEvent`: one witnessed segment with a sense (`ear` or `eye`) and an event type.
- `AgentParticipant`: the human or agent recorded as witness, observer, or storyteller.
- `ProductionGraphSeed`: recording node, segment nodes, collaborator nodes, and `ProductionRelation` edges.
- `observedBy`: records relationship in-band; the agent witnesses rather than extracts.

## Event types

- `transcript-segment`
- `director-intent`
- `ambient-sound`
- `shot-composition`
- `relational-moment`

## Verification

The real vertical slice is covered by:

```bash
cd /workspace/repos/jgwill/medicine-wheel
npm run build:packages
npm test -- --run tests/film-production-vertical-slice.test.ts
```

That test uses the real Episode 066 transcript and proves:

1. transcript → perceptual events,
2. events → production graph,
3. production graph remains additive over ontology-core,
4. the Jerry and Nicolas/Renaud relationship threads stay legible.

## Related issues

- #85 — Episode 068 vertical slice
- #86 — perception layer package
- #84 — Episode 068 plan-review audio steering context
