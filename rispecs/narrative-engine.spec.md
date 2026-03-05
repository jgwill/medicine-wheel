# narrative-engine — RISE Specification

> Beat sequencing, arc validation, cadence patterns, timeline building, cycle orchestration, and RSIS narrative generation for the Medicine Wheel ceremonial inquiry ecosystem.

**Version:** 0.1.1  
**Package:** `medicine-wheel-narrative-engine`  
**Document ID:** rispec-narrative-engine-v1  
**Last Updated:** 2026-02-23  

---

## Desired Outcome

Users create **complete narrative arcs** through four-direction Medicine Wheel cycles that:
- Sequence beats in directional spiral order (East → South → West → North)
- Validate cadence patterns with ceremony requirements at phase transitions
- Compute arc completeness with Wilson alignment and OCAP® compliance scoring
- Generate timelines for visualization along chronological, directional, or ceremonial axes
- Orchestrate full cycles with progress tracking and next-step suggestions
- Produce human-readable provenance narratives and reciprocity observations

---

## Creative Intent

**What this enables:** Research journeys that naturally progress through the four directions, with the engine tracking balance, completeness, and ceremony coverage. A cycle is not complete until all directions have been visited, ceremonies honored, and relational accountability maintained.

**Structural Tension:** Between linear task completion (Western project management) and cyclical, ceremony-based progression (Indigenous inquiry). The narrative-engine resolves this by requiring four-directional balance and ceremony at transitions.

---

## Beat Sequencer

### Sequencing and Ordering

```typescript
sequenceBeats(beats: NarrativeBeat[]): BeatPosition[]
// Sorts by act then timestamp, returns position metadata

insertBeat(beats, newBeat, options?): BeatInsertResult
// Validates constraints (maxBeatsPerDirection, direction order) before inserting
// Returns: { success: boolean, positions: BeatPosition[], warnings: string[] }

spiralOrder(beats): NarrativeBeat[]
// Reorders: east→south→west→north within each act
```

### Direction Navigation

```typescript
nextDirection(beats): DirectionName | null
// Returns first unvisited direction, or null if all visited

suggestNextBeat(beats): { direction: DirectionName, act: number }
// Suggests next beat location based on what's missing

currentAct(beats): number
// The highest act number among existing beats

beatsByDirection(beats): Record<DirectionName, NarrativeBeat[]>
// Groups beats by their four-direction alignment
```

### Sequencer Options

```typescript
interface SequencerOptions {
  enforceDirectionOrder?: boolean;   // Require E→S→W→N order
  allowMultiplePerAct?: boolean;     // Allow multiple beats per act+direction
  maxBeatsPerDirection?: number;     // Cap per direction (default: 12)
}
```

---

## Cadence Patterns

Cadence maps the four directions to four ceremonial phases:

| Phase | Direction | Standard Cadence | Light Cadence |
|-------|-----------|------------------|---------------|
| opening | east | Ceremony required, 1–4 beats | Ceremony required, 1–6 beats |
| deepening | south | Ceremony required, 1–4 beats | No ceremony, 1–6 beats |
| integrating | west | Ceremony required, 1–4 beats | No ceremony, 1–6 beats |
| closing | north | Ceremony required, 1–4 beats | Ceremony required, 1–6 beats |

```typescript
validateCadence(beats, ceremonies, pattern?): CadenceValidation
// Returns: { valid, currentPhase, phasesCompleted, phasesRemaining, violations[] }

currentPhase(beats): CadencePhase
// Derives phase from the last beat's direction

detectTransitions(beats): Array<{ from, to, beatIndex }>
// Identifies direction changes in the beat sequence
```

---

## Arc Validation

### Completeness Scoring

```typescript
computeCompleteness(beats, ceremonies, relations): ArcCompleteness
// Weighted score:
//   30% direction coverage (all 4 directions visited)
//   25% ceremony coverage (ceremony in each direction)
//   25% Wilson alignment (relational accountability)
//   20% balance (even distribution of beats across directions)

// Returns:
{
  complete: boolean,
  directionsVisited: DirectionName[],
  directionsMissing: DirectionName[],
  ceremoniesPerDirection: Record<DirectionName, number>,
  beatsPerDirection: Record<DirectionName, number>,
  wilsonAlignment: number,
  ocapCompliant: boolean,
  completenessScore: number   // 0–1
}
```

### Full Arc Validation

```typescript
validateArc(beats, ceremonies, relations): ArcValidationResult
// Checks: missing directions, unceremonied directions, low Wilson alignment,
// OCAP compliance gaps, directional imbalance
// Returns: { valid, completeness, violations[], recommendations[] }

isArcComplete(beats): boolean
// Quick check: have all four directions been visited?
```

### Violation Types

- `missing_direction` (error) — A direction has no beats
- `no_ceremony` (warning) — A direction has beats but no ceremony
- `low_wilson` (warning) — Wilson alignment below 50%
- `ocap_gap` (error) — Not all relations are OCAP®-compliant
- `unbalanced` (info) — Beats unevenly distributed

---

## Timeline Builder

```typescript
buildTimeline(beats, options?): TimelineData
// Axes: 'chronological' | 'directional' | 'ceremonial'
// Sorting: 'timestamp' | 'act' | 'direction'
// Filtering: by direction or act number
// Returns: { axis, entries[], groups[], span: { start, end } }

actStrip(beats): Array<{ act, direction, beats[], hasCeremony }>
// Four-slot strip view: one entry per direction
```

---

## Cycle Manager

```typescript
createCycle(id, researchQuestion): MedicineWheelCycle
// Initializes cycle at East/opening with empty beats

computeProgress(cycle, beats, ceremonies, relations): CycleProgress
// Returns: { cycle, transitions[], currentPhase, completeness, nextDirection, suggestedAction }
// suggestedAction examples:
//   'Begin the cycle with a beat in the East (opening) direction'
//   'Move to the south direction (deepening phase) — consider conducting a transition ceremony first'
//   'All directions visited — the cycle is ready to close'

updateCycleMetadata(cycle, beats, ceremonies, relations): MedicineWheelCycle
// Updates cycle fields from current state
```

---

## RSIS Narrative Generators

```typescript
generateProvenanceNarrative(symbolName, lineage, inquiries, stewards): string
// → '"MyModule" was born in the CreativeActualization Sun during cycle v2,
//    most recently touched under WovenMeaning during cycle v3.
//    It serves 2 inquiries: Data Sovereignty, Ceremony Design.
//    Stewarded by: Elder Kim, Developer Lee.'

generateReciprocityObservation(stewardCount, flowCount): string
// Always invitational, never evaluative
// → '3 steward(s) identified. This area invites reflection on how stewardship is distributed.'

generateDirectionObservation(distribution, total): string
// → 'Recent work is concentrated in north 🕸️ (45%). The ecosystem may benefit from an east 🌸 ceremony.'

getCeremonyPhaseFraming(phase?): string
// Phase-contextual framing for tool outputs

describeSun(sun: SunName): string
// Human-readable description of a thematic sun
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1
- **Types consumed:** `NarrativeBeat`, `MedicineWheelCycle`, `DirectionName`, `CeremonyLog`, `Relation`, `CeremonyPhase`, `SunName`, `DirectionDistribution`, `CeremonyLineageEntry`
- **Functions consumed:** `aggregateWilsonAlignment`, `checkOcapCompliance`, `DIRECTION_ACTS`, `ACT_DIRECTIONS`, `DIRECTION_COLORS`

---

## Advancing Patterns

- **Spiral progression** — Beats advance through directions naturally, never forced
- **Ceremony-gated transitions** — Direction changes can require ceremony for accountability
- **Completeness as wholeness** — Arc validation measures relational health, not just task counts
- **RSIS narrative integration** — Code provenance becomes a story with suns, cycles, and stewardship

---

## Quality Criteria

- ✅ Creative Orientation: Users create narrative arcs, not checklists
- ✅ Structural Dynamics: Four-directional tension drives natural progression
- ✅ Implementation Sufficient: All function signatures, options, and return types documented
- ✅ Codebase Agnostic: No file paths referenced
