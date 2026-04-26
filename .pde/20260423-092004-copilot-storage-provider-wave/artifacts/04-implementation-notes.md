# Implementation notes

## Approved slice applied

### `src/storage-provider`

- Added `src/storage-provider/src/jsonl.ts` with `JsonlProvider`, implementing the existing relational contract for:
  - nodes
  - edges
  - ceremonies
- `JsonlProvider` uses `.mw/store/*.jsonl` with `MW_DATA_DIR` support and preserves current edge compatibility by reading/writing `ceremony_id` and `last_ceremony`.
- Updated `src/storage-provider/src/factory.ts` so backend selection is additive and env-driven:
  1. explicit `MW_STORAGE_PROVIDER`
  2. Postgres envs (`DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`)
  3. JSONL fallback
- Exported `JsonlProvider` from `src/storage-provider/src/index.ts`.
- Updated `src/storage-provider/src/interface.ts` so the package extends the canonical ontology-core relational types instead of shadowing them with a separate contract.
- Updated `src/storage-provider/src/neon.ts` to:
  - accept `POSTGRES_URL` and `NEON_DATABASE_URL` in addition to `DATABASE_URL`
  - fix strict-mode map typing
  - update SQL upserts more completely
  - use a dynamic Neon import so the default/local JSONL path is not coupled to local module install state
- Added `src/storage-provider/src/neondatabase-serverless.d.ts` to keep package builds type-safe without depending on the current workspace install state.

### Related specs/docs

- Updated `rispecs/storage-provider-abstraction.spec.md` to reflect:
  - JSONL as current default/local backend
  - Neon as first production backend
  - storage-layer projections over ontology-core types
- Updated `rispecs/data-store-postgres.spec.md` and `src/data-store-postgres/README.md` to make `src/storage-provider` the chosen convergence home and keep `src/data-store-postgres` as a secondary scaffold.

## Deliberately not changed

- `lib/store.ts`
- `lib/jsonl-store.ts`
- `mcp/src/store.ts`
- `mcp/src/jsonl-store.ts`
- Redis provider implementation
- narrative/state entities outside the current relational provider contract
