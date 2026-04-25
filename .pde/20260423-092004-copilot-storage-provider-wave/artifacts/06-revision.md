# Revision

## Revision applied

To address implementation review feedback:

- `src/storage-provider/src/interface.ts` now extends ontology-core base types instead of replacing them:
  - `RelationalNode extends OntologyRelationalNode` with optional `description`
  - `RelationalEdge extends Omit<OntologyRelationalEdge, 'id'>` with optional `id` and optional `last_ceremony`
  - `CeremonyLog` now aliases ontology-core directly
- `rispecs/storage-provider-abstraction.spec.md` now explicitly documents those storage-layer projections so the spec and package contract match.

## Outcome

The provider package now converges on the canonical ontology model while still preserving the storage-specific fields needed for JSONL/Postgres compatibility.
