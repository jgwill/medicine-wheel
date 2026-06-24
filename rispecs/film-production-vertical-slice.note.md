# Film-Production Vertical Slice — End-to-End Note

**Date:** 2026-06-21
**Ceremony:** `ceremony:1782076698246:rmeo9` · **Structural tension:** `stc:east:1782076702485`
**Source witnessed:** `…/2026-06-19-episode-066-ears-and-eye-testing-and-cinema-indigenous/ilex-testing/260619131039.tr.EN.txt`

This note records the first verifiable vertical slice of *Film & Media as
Knowledge Practice — Agent-Supported Production* (episode 066). A **real**
belt-device transcript flows the whole chain; nothing here is synthetic.

## The chain

```
transcript → perception ingest → narrative cluster → edit brief
          → storyteller gate → production-ceremony closure
```

| Stage | Package | Result on the real transcript (8,971 chars) |
|---|---|---|
| Perception ingest (eyes & ears) | `@medicine-wheel/perception-layer` | **63** `PerceptualEvent`s — `transcript-segment` 34, `director-intent` 11, `relational-moment` 10, `shot-composition` 4, `ambient-sound` 4. Each `observedBy` the registered participant (witness, not extractor). |
| Production graph (additive ontology) | `perception-layer` + `ontology-core` | 63 `knowledge` segment nodes by `metadata.kind` (`rush` 49, `relational→scene` 10, `shot` 4), 1 collaborator node, edges `rush-of` ×63 + `witnessed-by` ×1 as `ProductionRelation`. NodeType/Relation/CeremonyType unions untouched. |
| Narrative cluster | `@medicine-wheel/narrative-cluster` | 3 clusters → 3 directions: `shot-sequence(4)→east`, `sound-environment(4)→south`, `relational-moment(55)→west`. Beats direction-aligned. |
| Film Edit Brief | `narrative-cluster` | **63** EDL markers with synthesized timecodes + narrative annotations (CMX3600-style). |
| Storyteller gate (Jerry thread) | `@medicine-wheel/community-review` | Voiceless output → **rejected** with a revision reason; `🌸`-voiced output → **passed**. |
| Production ceremony (Renaud thread) | `@medicine-wheel/ceremony-protocol` | Closing before honoring stages **refused** ("ceremony cannot be skipped"); closes once all four stages honored. |

## Two threads, kept legible

- **Jerry — runtime observability / quality / event accountability:** the eyes-and-ears ingest, the production graph, and the storyteller gate that rejects voiceless output.
- **Nicolas Renaud — Research is Ceremony / film as knowledge-generation / relational witnessing:** the participant recorded as `witnessed-by`, the relational-moment cluster (knowledge from relationship), and the staged production ceremony.

## Sample EDL (first marker)

```
TITLE: Episode 066 rushes
FCM: NON-DROP FRAME
001  AX       AA/V  C        00:00:00:00 00:00:04:00 00:00:00:00 00:00:04:00
* FROM CLIP NAME: …/260619131039.tr.EN.txt
* COMMENT: [shot-sequence] Welcome to another episode of Blu-ray A work by the author of the book T
```

## Sample gate rejection (real output)

> Rejected: output does not carry the storyteller perspective (🌸 Miette voice).
> Found 0/1 required signature marker(s). Revise to include at least 1 more of:
> 🌸, Miette, narrative resonance. An output without the storyteller's voice is
> not accountable to its author — add the narrative resonance before this can pass.

## Reproduce

```bash
cd /workspace/repos/jgwill/medicine-wheel
npm run build -w src/ontology-core
npm run build -w src/community-review
npm run build -w src/ceremony-protocol
npx tsc -p src/perception-layer/tsconfig.json
npx tsc -p src/narrative-cluster/tsconfig.json
npx vitest run tests/film-production-vertical-slice.test.ts
```

## What is NOT done yet (deferred, by design)

- MCP tool surface (`mcp/src/tools/production.ts`) — wire the slice into the live `mcp__medicine-wheel__*` toolset.
- Compose `prompt-decomposition` + `narrative-engine` into `narrative-cluster` for ontology-enriched theming and arc validation.
- Kinship-vocabulary `witnesses`/`witnessed-by` edge + Zod `ProductionRelationSchema`.
- Version bump / publish — held until review; suite remains at 0.4.8. No auto-publish.
