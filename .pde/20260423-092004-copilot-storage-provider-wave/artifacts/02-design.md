# Design

## Chosen convergence path

**Choose `src/storage-provider` as the single relational persistence abstraction.**

This wave will:

1. keep **JSONL** as the current/default local backend,
2. keep **Neon/Postgres** as the first production backend path,
3. keep **Redis/Upstash** secondary and explicitly unimplemented,
4. avoid promoting `src/data-store-postgres` into a parallel long-term architecture.

## Why this is the best path

- The committed abstraction already lives in `src/storage-provider`.
- The staged Postgres work is only a connection scaffold; it is not a competing CRUD/provider implementation.
- The app and MCP currently depend on JSONL, so the abstraction must learn JSONL rather than the repo being forced to abandon it.
- The SQL schema already matches the relational scope of `src/storage-provider`.

## Approved minimum slice

### 1. Add a JSONL provider to `src/storage-provider`

- Add `JsonlProvider` implementing the existing relational contract for:
  - nodes
  - edges
  - ceremonies
- Use the same `.mw/store/*.jsonl` location model as the current repo (`MW_DATA_DIR` aware).
- Preserve compatibility with existing JSONL data written by `lib/jsonl-store.ts` and `mcp/src/jsonl-store.ts`.

### 2. Make backend selection additive and env-driven

- Add `jsonl` to `ProviderType`.
- Support explicit override through `MW_STORAGE_PROVIDER`.
- `auto` behavior:
  1. explicit `MW_STORAGE_PROVIDER` if set
  2. Neon/Postgres if `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL` is present
  3. JSONL fallback

### 3. Keep Redis secondary

- `redis` remains part of the type surface for future work.
- Explicit `redis` selection should continue to fail fast with a clear message rather than silently falling back.
- `auto` should not select Redis ahead of JSONL while there is no Redis provider implementation.

### 4. Do not rewire app or MCP consumers in this wave

- `lib/store.ts` and `mcp/src/store.ts` stay as they are.
- This wave provides the trustworthy abstraction path without forcing an async rewrite through the app and MCP surfaces.

### 5. Reframe staged Postgres scaffold as secondary

- `rispecs/data-store-postgres.spec.md` and `src/data-store-postgres/README.md` should reflect that the provider convergence home is `src/storage-provider`.
- The staged package remains a small scaffold, not the selected long-term architecture.

## Deliberate non-goals for this wave

- No Redis provider implementation
- No JSONL migration into Postgres
- No expansion of `StorageProvider` to beats/cycles/charts/mmots
- No rewrite of app routes or MCP store consumers
