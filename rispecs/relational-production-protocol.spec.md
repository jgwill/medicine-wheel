# relational-production-protocol — RISE Specification

> A ceremony-style protocol for entering and closing creative production
> sessions — extends `@medicine-wheel/ceremony-protocol` so technology serves
> relationship rather than extracting from it (Research is Ceremony).

**Version:** 0.1.0 (draft)
**Package:** `@medicine-wheel/ceremony-protocol` (new `production` module)
**Document ID:** rispec-relational-production-protocol-v1
**Last Updated:** 2026-06-21

---

## Desired Outcome

A creator and their agents enter production **as ceremony**:

- A `ProductionSession` opens with an intention, participants, and a stage.
- The session advances through four stages mapped to existing `CeremonyPhase`s:
  `pre-production`→opening, `on-set`→council, `post-production`→integration, `closure`→closure.
- Each stage carries a typed protocol (intent-setting, agent briefing, cluster
  seeding, observational logging, pause check-ins, quality review, closure
  reflection, agent-memory update, gratitude).
- Closure requires having passed through the stages — ceremony cannot be skipped.

## Creative Intent

**What this enables:** The Relational Production Protocol from episode 066 becomes
executable. It reuses the `ceremony-protocol` phase machinery (`CeremonyState`,
`nextPhase`) so production sessions are first-class ceremonies, not ad-hoc runs.

**Structural Tension:** Between extractive "make it faster" production and
relationally-accountable production. Resolved by a staged protocol that gates
closure on having honored each phase.

## Types (`@medicine-wheel/ceremony-protocol/production`)

```typescript
type ProductionStage = 'pre-production' | 'on-set' | 'post-production' | 'closure';

interface ProductionProtocolStep { prompt: string; honors: string; }
interface ProductionProtocolStage {
  stage: ProductionStage;
  ceremonyPhase: CeremonyPhase;
  steps: ProductionProtocolStep[];
}

interface ProductionSession {
  id: string; intention: string; participants: string[];
  stage: ProductionStage; openedAt: string; closedAt?: string;
  stagesHonored: ProductionStage[];
  reflections: string[];
}
```

## API

- `RELATIONAL_PRODUCTION_PROTOCOL: ProductionProtocolStage[]` — the four-stage script.
- `openProductionSession(intention, participants): ProductionSession`.
- `advanceProductionStage(session): ProductionSession` — moves to the next stage, records it honored.
- `closeProductionSession(session, reflections): ProductionSession` — refuses to close unless all stages were honored; records reflections + closedAt.

## Dependencies

- `@medicine-wheel/ontology-core` (CeremonyPhase)
- existing `ceremony-protocol/index.ts` (`CeremonyState`, `nextPhase`, phase framing)

## Advancing Patterns

- **Ceremony cannot be skipped** — closure is gated on honored stages.
- **Reuse, don't fork** — maps onto existing `CeremonyPhase`, no parallel phase system.
- **Renaud thread** — Research is Ceremony made operational for film.

## Quality Criteria

- ✅ A session opens, advances through all stages, and closes with reflections.
- ✅ Closing an un-honored session is refused with a clear reason.
- ✅ Protocol content matches the four-stage checklist drafted in episode 066.
