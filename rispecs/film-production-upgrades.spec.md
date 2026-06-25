# film-production-upgrades — RISE Specification (additive upgrades)

> Additive upgrades to existing packages that make "Film & Media as Knowledge
> Practice — Agent-Supported Production" (episode 066) real, without breaking
> existing consumers. Consolidated here so the film work stays legible in one
> place; mirrored into each package's own spec as the suite matures.

**Document ID:** rispec-film-production-upgrades-v1
**Last Updated:** 2026-06-21
**Touches:** `@medicine-wheel/ontology-core`, `@medicine-wheel/community-review`

---

## 1. ontology-core — ProductionRelation (additive)

**Desired Outcome:** Film/media entities are representable without changing the
sacred `NodeType` / `Relation` / `CeremonyType` unions.

**Current Reality:** `ontology-core` has specialized relation subtypes
(`LandRelation`, `AncestorRelation`, `FutureRelation`, `CosmicRelation`) but
nothing for production; the `NodeType` union does not (and should not) carry film types.

**Resolution (additive):**
- Add `ProductionEntityKind = 'shot' | 'rush' | 'sequence' | 'scene' | 'recording' | 'collaborator' | 'edit-brief'`.
- Add `ProductionRelation extends Relation` with `relationship_type` in
  `'shot-of' | 'rush-of' | 'sequence-of' | 'witnessed-by' | 'directed-by' | 'sounds-in'`,
  plus optional `production_id` and `timecode`.
- Film entities are `RelationalNode { type: 'knowledge', metadata: { kind: ProductionEntityKind } }`.
- Export the new types from `index.ts`. No Zod/constant churn (no union members added).

**Structural Tension:** Between a closed ontology and film expressivity. Resolved
by riding on `knowledge` + metadata + a new relation subtype — exactly the
pattern the existing subtypes already establish.

**Quality Criteria:** ✅ Existing `NodeType`/`Relation`/`CeremonyType` consumers
unchanged. ✅ A `ProductionRelation` type-checks as a `Relation`.

---

## 2. community-review — storyteller_perspective gate (testable early)

**Desired Outcome:** Agent output that lacks the creator's storyteller signature
is **rejected with a useful revision reason**, so an agent revises rather than
ships voiceless output. (Episode 066: "if there is no Miette perspective … it's
going to get rejected and the agent will have to revise.")

**Current Reality:** `community-review` implements Wilson review, consensus, and
accountability, and the MCP exposes `mw_enforce_gate` — but nothing checks for a
storyteller/persona signature in produced output.

**Resolution:**
- Add `storyteller.ts`: `storytellerGate(output, signature): StorytellerGateResult`.
- `StorytellerSignature { markers: string[]; minMarkers?: number }`.
- `StorytellerGateResult { passed; matchedMarkers; missingSignature; revisionReason? }`.
- Reject when fewer than `minMarkers` (default 1) signature markers are present;
  `revisionReason` names what to add (e.g. the 🌸 Miette voice / narrative resonance).
- Export from `index.ts`; later surface via an MCP validator + `production_storyteller_gate` tool.

**Structural Tension:** Between formally-correct-but-voiceless output and output
accountable to the creator's storyteller perspective. Resolved by a runtime gate
modeled on the existing `mw_enforce_gate` rejection pattern.

**Quality Criteria:** ✅ Rejects sample output without the signature, with a
revision reason. ✅ Accepts output carrying the signature. ✅ Jerry thread:
runtime quality / event accountability.

---

## 3. ceremony-protocol — production module

See `rispecs/relational-production-protocol.spec.md`.

## 4. MCP surface (follow-up, post-slice)

`mcp/src/tools/production.ts`: `production_ingest_transcript`,
`production_cluster_rushes`, `generate_edit_brief`, `production_storyteller_gate`,
`production_open_session`, `production_close_session`; registered in
`mcp/src/all-tools.ts`. Deferred until the vertical slice is validated.
