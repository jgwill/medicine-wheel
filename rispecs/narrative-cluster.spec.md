# narrative-cluster — RISE Specification

> The Narrative Cluster Processor as a reusable method — turn witnessed
> perceptual events / rushes into thematic clusters, narrative beats, and a
> Film Edit Brief (EDL markers) an editor can act on.

**Version:** 0.1.0 (draft)
**Package:** `@medicine-wheel/narrative-cluster`
**Document ID:** rispec-narrative-cluster-v1
**Last Updated:** 2026-06-21

---

## Desired Outcome

A creator transforms raw witnessed material into editable structure:

- Perceptual events / rushes are grouped into **cinematic clusters**: `shot-sequence`, `sound-environment`, `relational-moment`.
- Each cluster maps to a Medicine Wheel direction and becomes a `NarrativeBeat`.
- A **Film Edit Brief** is generated — EDL-style markers with timecodes and narrative annotations, compatible with a Premiere/Resolve import workflow.

## Creative Intent

**What this enables:** The "Narrative Cluster Processor" named in episode 066
becomes a real method bridging perception and editing. It instantiates narrative
cognition (discrete events → coherent story) while staying inside the relational
ontology (clusters carry direction; beats carry `relations_honored`).

**Structural Tension:** Between scattered rushes (no spine) and an editable
narrative (clusters → beats → edit brief). Resolved by template-driven
clustering plus a deterministic brief generator.

## Types (`@medicine-wheel/narrative-cluster`)

```typescript
type ClusterKind = 'shot-sequence' | 'sound-environment' | 'relational-moment';

interface ClusterableEvent { type: string; text: string; index: number; source?: string; }

interface NarrativeCluster {
  id: string;
  kind: ClusterKind;
  theme: string;
  direction: DirectionName;   // shot→east, sound→south, relational→west
  events: ClusterableEvent[];
}

interface EditMarker {
  index: number; clusterId: string; kind: ClusterKind;
  timecode: string;           // HH:MM:SS:FF synthesized from order
  label: string;              // narrative annotation
  source: string;
}

interface EditBrief {
  productionId: string; title: string;
  markers: EditMarker[];
  edl: string;                // CMX3600-style text block
  generatedAt: string;
}
```

## API

- `clusterEvents(events): NarrativeCluster[]` — group by cinematic template; derive a theme + direction per cluster.
- `clustersToBeats(clusters): NarrativeBeat[]` — one `NarrativeBeat` per cluster, direction-aligned, with `relations_honored`.
- `generateEditBrief(clusters, opts): EditBrief` — produce ordered markers + an EDL text block.

## Dependencies

- `@medicine-wheel/ontology-core` (NarrativeBeat, DirectionName)
- (Composition target) `@medicine-wheel/prompt-decomposition` + `@medicine-wheel/narrative-engine` — arc validation and ontology-enriched theming in a later iteration. Loose-coupled now via `ClusterableEvent`.

## Advancing Patterns

- **Reusable method** — input is a minimal `ClusterableEvent`, so any source (transcript, rushes, notes) flows through.
- **Direction-aligned** — clusters and beats stay inside the four-directions ontology.
- **Deterministic brief** — same clusters yield the same EDL, so the slice is testable.

## Quality Criteria

- ✅ Real transcript yields ≥2 cluster kinds and a non-empty edit brief.
- ✅ Beats carry valid directions and survive `narrative-engine` arc checks.
- ✅ Renaud thread: clusters preserve relational-moments as first-class.
