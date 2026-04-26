# Converge relational persistence on `storage-provider`: `JsonlProvider` as local default, `NeonProvider` as first production backend

## Problem

The repo has two separate persistence truths that need to converge:

- **App and MCP** run on synchronous, hand-rolled JSONL stores (`lib/jsonl-store.ts`,
  `mcp/src/jsonl-store.ts`). These still own the live read/write paths.
- **`src/storage-provider`** exists as the relational abstraction but had no local
  backend — it was Neon-only and could not preserve the JSONL workflow without a
  database connection string.

Staged work also adds `src/data-store-postgres/`, which is valuable as a `pg`-based
pool scaffold but risks becoming a second long-term provider surface if its scope
is not bounded early.

We need one clear convergence path:

- Keep `.mw/store/*.jsonl` (or `MW_DATA_DIR`) as the working local/default mode
- Make Neon/Postgres the first production backend
- Keep Redis secondary and intentionally unimplemented for now
- Do not break any existing `app/**` or `mcp/**` JSONL behavior

## Scope

This issue covers the **relational storage slice only** (`nodes`, `edges`, `ceremonies`).

### In scope

- Add a `JsonlProvider` to `medicine-wheel-storage-provider` that is fully compatible
  with existing `.mw/store` data and paths
- Harden `NeonProvider` with dynamic Neon import, strict typing, and full upsert coverage
- Extend the `StorageProvider` interface with `updateEdgeCeremony`, `getCeremoniesByType`,
  and `getAllCeremonies`
- Make backend selection env-driven and clearly ordered:
  1. `MW_STORAGE_PROVIDER` (explicit; also accepts aliases `local`/`file` -> `jsonl`,
     `postgres` -> `neon`, `upstash` -> `redis`)
  2. Postgres env presence (`DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`) -> `neon`
  3. JSONL fallback
- Keep Redis as an explicit fast-fail (`throw`) rather than a silent no-op
- Keep `src/data-store-postgres` as a small `pg`-pool scaffold with a bounded API;
  it is not the primary provider abstraction surface
- Update specs and PDE wave artifacts to document the chosen convergence path

### Out of scope

- Rewiring `app/**` or `mcp/**` to the async `StorageProvider` interface
- Implementing Redis/Upstash
- Migrating JSONL data into Postgres
- Expanding provider coverage beyond the relational slice (`beats`, `cycles`, `charts`, `mmots`)

## Delivered changes

### `src/storage-provider` — provider convergence

**`src/storage-provider/src/jsonl.ts`** — new `JsonlProvider`
- Implements the full `StorageProvider` interface for `nodes`, `edges`, and `ceremonies`
- Resolves data dir from `MW_DATA_DIR`, `mcp/` cwd detection, or package-root walk (up to 5 levels)
- Atomic writes via `${filePath}.tmp.${process.pid}` + `fs.renameSync`
- Spin-retry sentinel-file write lock (`.lock`, 30 s staleness eviction, 20 attempts with
  capped back-off); appropriate for single-process local usage
- Legacy edge `ceremony_id` field transparently mapped to/from `last_ceremony` on read and
  write to preserve existing JSONL data without a migration

**`src/storage-provider/src/interface.ts`** — interface updates
- `RelationalNode` extends ontology-core type with optional `description`
- `RelationalEdge` extends ontology-core type with optional `id` and `last_ceremony`
- `CeremonyLog` is re-exported directly from ontology-core (no local redefinition)
- New methods added: `updateEdgeCeremony`, `getCeremoniesByType`, `getAllCeremonies`

**`src/storage-provider/src/factory.ts`** — auto-detection
- `createProvider(type = 'auto')` returns a connected provider
- `normalizeProviderType` accepts aliases: `local`/`file` -> `jsonl`; `postgres` -> `neon`;
  `upstash` -> `redis`
- Unknown `MW_STORAGE_PROVIDER` values throw immediately with a clear message
- Explicit Redis selection throws in `instantiateProvider` (fast-fail, not silent)
- `detectProvider()` exported for inspection without connecting

**`src/storage-provider/src/neon.ts`** — hardened `NeonProvider`
- Dynamic `await import('@neondatabase/serverless')` in `connect()` so the Neon module
  is never loaded when using JSONL locally
- Accepts `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`
- Full upsert coverage (`ON CONFLICT ... DO UPDATE`) for all three entity types
- Strict row-to-type parsing with `parseJsonValue` and `toIsoString` helpers

**`src/storage-provider/src/index.ts`** — updated exports
- Exports `JsonlProvider` and `NeonProvider` for direct instantiation alongside the
  factory and shared types

**`src/storage-provider/src/neondatabase-serverless.d.ts`** — new Neon type shim
- Provides a minimal ambient module declaration so TypeScript builds remain stable
  when the Neon package is absent at build time

### `src/data-store-postgres` — Postgres scaffold (secondary)

New workspace package `medicine-wheel-data-store-postgres` (`v0.2.0`):
- `connection.ts`: singleton `pg.Pool` via `createPostgresPool` / `getPostgresPool`,
  `withPostgresClient` helper, `closePostgresPool`, and `resetPostgresPoolForTests`
- Accepts `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL`; SSL enabled by default
  when a connection string is present
- `index.ts`: re-exports connection helpers; types borrowed directly from
  `medicine-wheel-ontology-core` (no local domain redefinition)
- Root `package.json` workspace list updated to include `src/data-store-postgres`

This package intentionally stops at pool infrastructure. CRUD and migrations belong
in future work; provider-selection logic stays in `src/storage-provider`.

### Spec and process docs

- `rispecs/storage-provider-abstraction.spec.md` — documents JSONL as default/local,
  Neon/Postgres as first production backend, Redis as secondary; records the
  auto-detection resolution order
- `rispecs/data-store-postgres.spec.md` — reframes the package as a scaffold proof,
  not the long-term abstraction home
- `rispecs/KINSHIP.md` — updated to reflect convergence decision
- PDE wave artifacts added/updated under `.pde/20260423-092004-copilot-storage-provider-wave/`

## Validation

### Passed

| Check | Result |
|---|---|
| `npm run build -w medicine-wheel-storage-provider` | OK |
| `npm run build:packages && npm run build` | OK |
| `npm run start` + `curl http://127.0.0.1:3940/api/nodes` | OK App JSONL surfaces unchanged |

### Known gaps

- `CI=1 npm run lint` is blocked by interactive `next lint` initialization; non-interactive
  linting is not yet configured
- No `npm run test` at repo root; the storage-provider package has no automated tests

## Follow-up gaps

- [ ] `app/**` and `mcp/**` still read/write JSONL directly; they are not yet routed through
  the async `StorageProvider` interface
- [ ] The relational abstraction does not yet cover `beats`, `cycles`, `charts`, or `mmots`
- [ ] Redis/Upstash remains intentionally unimplemented
- [ ] `src/data-store-postgres` has no CRUD layer or migration framework yet
- [ ] Repo needs a non-interactive lint entrypoint and a real test runner before this area
  can be hardened further

> **Suggested labels:** `backend`, `enhancement`, `phase-1-mvp`, `size: medium`
