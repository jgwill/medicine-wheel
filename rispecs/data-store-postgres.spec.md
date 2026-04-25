# data-store-postgres — RISE Specification

> Minimal Postgres/Neon backend for Medicine Wheel relational persistence.

**Goal:** Add a PostgreSQL/Neon path while keeping `ontology-core` types unchanged and converging the long-term provider abstraction in `src/storage-provider/`.

**Architecture:** Keep the storage contract thin. Reuse `RelationalNode`, `RelationalEdge`, and `CeremonyLog` from `medicine-wheel-ontology-core`; use this package as a small Postgres scaffold only, while the shared provider-selection surface lives in `src/storage-provider/`.

**Tech Stack:** TypeScript, `pg`, Neon/Postgres `DATABASE_URL`.

---

## Why this exists

The current `src/data-store` package is Redis-specific. The demo app already has Postgres/Neon available in hosted environments, so we need an additive Postgres path that proves the backend without promoting a second long-term provider architecture beside `src/storage-provider/`.

## Minimal requirement

Create a new workspace package at `src/data-store-postgres/` that:

1. Connects through `pg` using `DATABASE_URL` or `POSTGRES_URL`
2. Exports a shared pool helper
3. Reuses ontology-core types as the storage contract
4. Stays small enough to serve as the first backend proof

## Non-goals for this first pass

- No ORM
- No migration framework
- No competing provider registry — `src/storage-provider/` is the convergence home
- No rewrite of the Redis package yet
- No app wiring beyond package scaffolding

## Suggested first schema target

Start with the same core entities the Redis store already handles:

- `nodes`
- `edges`
- `ceremonies`

Keep the schema simple and JSON-friendly so the app can move from Redis/JSONL toward Postgres without changing domain types.

## Acceptance criteria

- Workspace builds with the new package included
- Package can create and close a Postgres pool
- Environment detection works for Neon/Postgres
- The package name is stable and export shape is clear for future CRUD work

## Notes for the implementing agent

- Prefer the simplest provider path: Postgres first, because Neon is already in the hosted environment.
- Keep the package additive and isolated.
- If convergence work is active, prefer absorbing provider-selection decisions into `src/storage-provider/` rather than growing this scaffold into a second architecture.
