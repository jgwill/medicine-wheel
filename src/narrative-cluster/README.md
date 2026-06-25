# @medicine-wheel/narrative-cluster

Turn witnessed production events into cinematic clusters, narrative beats, and a Film Edit Brief.

This package receives the output of `@medicine-wheel/perception-layer` and gives it an edit-facing structure: grouped rushes, Medicine Wheel-aligned beats, EDL-style markers, and narrative annotations. It is intentionally deterministic so a real transcript can become a testable vertical slice.

## Why it exists

Episode 066 named a film-production path where agents help transform raw material into story without erasing relationship. Episode 067 sharpened the distinction between the Jerry thread of runtime observability and the Nicolas Renaud thread of Research is Ceremony. This package sits between perception and editing: it clusters witnessed events while preserving relational moments as first-class material.

## Install

```bash
npm install @medicine-wheel/narrative-cluster
```

## API

```ts
import {
  clusterEvents,
  clustersToBeats,
  generateEditBrief,
} from '@medicine-wheel/narrative-cluster';

const clusters = clusterEvents(
  events.map((event) => ({
    type: event.type,
    text: event.text,
    index: event.index,
    source: event.source,
  })),
);

const beats = clustersToBeats(clusters);
const brief = generateEditBrief(clusters, {
  title: 'Episode 066 rushes',
});
```

## Main concepts

- `NarrativeCluster`: a group of related events with a kind, theme, direction, and source events.
- `NarrativeBeat`: a Medicine Wheel-aligned beat for downstream narrative engines.
- `EditBrief`: ordered markers plus a CMX3600-style EDL text block.
- `EditMarker`: deterministic timecode and annotation for an editable unit.

## Cluster kinds

- `shot-sequence` → usually East / vision
- `sound-environment` → usually South / growth
- `relational-moment` → usually West / reflection

## Verification

The real vertical slice is covered by:

```bash
cd /workspace/repos/jgwill/medicine-wheel
npm run build:packages
npm test -- --run tests/film-production-vertical-slice.test.ts
```

That test uses the real Episode 066 transcript and proves:

1. perceptual events → narrative clusters,
2. clusters → Medicine Wheel-aligned beats,
3. clusters → Film Edit Brief / EDL markers,
4. storyteller and ceremony gates can complete the production loop.

## Related issues

- #85 — Episode 068 vertical slice
- #87 — narrative cluster, storyteller gate, and production ceremony gates
- #84 — Episode 068 plan-review audio steering context
