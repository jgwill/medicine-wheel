# perception-layer — RISE Specification

> The eyes & ears of agent-supported film production — witness a belt-device
> recording as a stream of perceptual events and seed a production knowledge
> graph, honoring relationship rather than extracting footage.

**Version:** 0.1.0 (draft)
**Package:** `@medicine-wheel/perception-layer`
**Document ID:** rispec-perception-layer-v1
**Last Updated:** 2026-06-21

---

## Desired Outcome

A production participant (human or agent) creates a **witnessed event stream**:

- A raw belt-device transcript or device stream is parsed into typed `PerceptualEvent`s.
- Each event is sensed through an **ear** (transcript-segment, director-intent, ambient-sound) or an **eye** (shot-composition, relational-moment).
- Events seed a production graph of `knowledge` nodes (`metadata.kind`) connected by `ProductionRelation` edges — additive over `@medicine-wheel/ontology-core`.
- An **AgentParticipant** registers with a persistent persona signature and is recorded as the *witness* of each event (`observedBy`), not its extractor.

## Creative Intent

**What this enables:** An agent becomes part of the production. It does not act
on the world — it subscribes and witnesses (Renaud's "witnessed relationship,
not extractive observation"). The eyes/ears metaphor from episode 066 becomes a
real, queryable surface that downstream packages cluster and edit.

**Structural Tension:** Between a raw, opaque recording (a single text blob) and
a witnessed, typed, relational stream that the rest of the suite can reason over.
Resolved by classification + graph seeding, with the witness recorded in-band.

## Types (`@medicine-wheel/perception-layer/types`)

```typescript
type PerceptualSense = 'ear' | 'eye';
type PerceptualEventType =
  | 'transcript-segment' | 'director-intent' | 'ambient-sound'   // ear
  | 'shot-composition' | 'relational-moment';                    // eye

interface PerceptualEvent {
  id: string;
  sense: PerceptualSense;
  type: PerceptualEventType;
  text: string;
  source: string;        // file path or device id
  index: number;         // order in the stream
  observedBy?: string;   // AgentParticipant id — the witness
  timestamp: string;
}

interface AgentParticipant {
  id: string;
  name: string;
  role: 'witness' | 'observer' | 'storyteller';
  signature: string[];   // persistent persona markers carried across sessions
}

interface ProductionGraphSeed {
  recording: RelationalNode;            // kind: 'recording'
  segments: RelationalNode[];           // kind per event type
  relations: ProductionRelation[];      // rush-of / witnessed-by
}
```

## API

- `ingestTranscript(text, opts): PerceptualEvent[]` — segment + classify a transcript via the observer registry.
- `buildProductionGraph(events, opts): ProductionGraphSeed` — emit nodes + `ProductionRelation` edges; each segment is `rush-of` the recording and `witnessed-by` the participant.
- `registerParticipant(name, role, signature): AgentParticipant`.
- Observers (`observers.ts`): `earObservers` + `eyeObservers` — pure classifiers (`shot-composition-observer`, `ambient-sound-observer`, `director-intent-observer`, `relational-witnessing-observer`). No world action.

## Dependencies

- `@medicine-wheel/ontology-core` (RelationalNode, ProductionRelation, NodeType)
- `@medicine-wheel/session-reader` (event-stream lineage; optional at runtime)

## Advancing Patterns

- **Witness, don't extract** — the agent is recorded in `observedBy`; capture is relational.
- **Additive graph** — film entities ride on `knowledge` nodes + `metadata.kind`; no NodeType change.
- **Loose coupling** — downstream packages consume `PerceptualEvent` shape, not internal state.

## Quality Criteria

- ✅ Classifies real episode-066 transcript material into ≥3 event types.
- ✅ Emits a production graph whose edges are `ProductionRelation`s with a recorded witness.
- ✅ Jerry thread (eyes/ears, observability) and Renaud thread (witnessing) both legible in the surface.
