# Scout

## Repo-grounded current state

### Committed v0 path: `src/storage-provider`

- `src/storage-provider/src/interface.ts` defines the async `StorageProvider` contract for **nodes**, **edges**, and **ceremonies** only.
- `src/storage-provider/src/neon.ts` implements the contract for Postgres/Neon using `@neondatabase/serverless`.
- `src/storage-provider/src/factory.ts` only auto-selects Neon today; Redis is a stub and there is **no JSONL provider**, so `createProvider()` cannot preserve current local behavior.

### Staged local path: `src/data-store-postgres`

- `src/data-store-postgres/src/connection.ts` is a clean `pg` pool scaffold with env resolution from `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`.
- `src/data-store-postgres/src/index.ts` only re-exports pool helpers.
- `rispecs/data-store-postgres.spec.md` explicitly frames this package as a **small additive proof**, not the long-term provider home.

### Current default/local behavior: JSONL

- `lib/jsonl-store.ts` is the active web/local persistence engine.
- `mcp/src/jsonl-store.ts` is the MCP mirror of the same JSONL persistence model.
- `lib/store.ts` and `mcp/src/store.ts` are the active consumption surfaces.
- App API routes (`app/api/nodes/route.ts`, `app/api/edges/route.ts`, `app/api/ceremonies/route.ts`, `app/api/narrative/*/route.ts`) still read and write through the JSONL-backed store, not through `src/storage-provider`.

### Schema state

- `scripts/001-create-medicine-wheel-tables.sql` already provides an idempotent Postgres schema for `nodes`, `edges`, and `ceremonies`.
- The SQL surface aligns with the three-entity relational scope of `src/storage-provider`, not with the broader JSONL narrative/state entities.

## Compatibility constraints observed in code

1. JSONL is the current working local default and must remain so.
2. JSONL persists more than the provider contract: `beats`, `cycles`, `charts`, and `mmots` are still JSONL-only.
3. Existing JSONL edge records use `ceremony_id` while the provider contract uses `last_ceremony`; any convergence layer must read both safely.
4. `src/storage-provider` is async, while current app/lib JSONL consumption is sync; this wave should not force a repo-wide consumer rewrite.

## Duplication and risk

### Existing duplication

- JSONL persistence exists twice today (`lib/jsonl-store.ts`, `mcp/src/jsonl-store.ts`).
- Relational record types are duplicated across `src/storage-provider` and `src/data-store`.
- A second Postgres-facing package (`src/data-store-postgres`) now exists beside `src/storage-provider`.

### Baseline build findings

- `npm run build:packages` already fails in `src/storage-provider` before this wave is applied:
  - missing installed `@neondatabase/serverless`
  - implicit `any` errors in `src/storage-provider/src/neon.ts`
- `npm run lint` is not currently automation-safe because `next lint` launches interactive ESLint setup.

## Ranked convergence options

1. **Converge on `src/storage-provider`**: add a JSONL provider there, keep JSONL as auto/default, keep Neon as production path, and do not promote `src/data-store-postgres` into a second architecture.
2. Merge or rehome the staged Postgres scaffold into `src/storage-provider` later as an implementation detail if the Neon driver is replaced.
3. Keep `src/data-store-postgres` as a long-term peer architecture beside `src/storage-provider` (**not recommended**).

## Minimum viable files to change

- `src/storage-provider/src/interface.ts`
- `src/storage-provider/src/factory.ts`
- `src/storage-provider/src/index.ts`
- `src/storage-provider/src/neon.ts`
- `src/storage-provider/src/jsonl.ts` (**new**)
- `rispecs/storage-provider-abstraction.spec.md`
- `rispecs/data-store-postgres.spec.md`
- `src/data-store-postgres/README.md`
