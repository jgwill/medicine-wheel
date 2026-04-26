# Design review

## Review verdict

**Approve the `storage-provider + jsonl default + neon production` path with one constraint:** keep this wave strictly scoped to the existing relational contract and do not claim full JSONL feature convergence for narrative/state entities yet.

## What the design gets right

1. It converges around the already-committed abstraction instead of inventing a new home.
2. It preserves current JSONL behavior instead of breaking the app and MCP default path.
3. It treats Neon/Postgres as the first production backend without requiring a broad migration now.
4. It avoids hardening `src/data-store-postgres` into a rival architecture.

## Risks to manage in implementation

### 1. JSONL compatibility details

- Existing JSONL edges may contain `ceremony_id`; provider reads should map that to `last_ceremony`.
- Existing JSONL nodes may omit `description`; provider reads should normalize to `''`.
- The provider must continue using `.mw/store` / `MW_DATA_DIR`, not invent a new path.

### 2. Contract scope

- `StorageProvider` still only covers nodes/edges/ceremonies.
- `beats`, `cycles`, `charts`, and `mmots` remain outside this convergence slice and should be called out explicitly rather than implicitly broken or half-supported.

### 3. Backend selection behavior

- `auto` must not accidentally pick an unimplemented Redis backend.
- Explicit `redis` selection should error clearly.
- Explicit `jsonl` and `neon` selection should remain predictable.

### 4. Current build health

- `src/storage-provider` already fails baseline package build; the implementation must leave it build-clean.

## Approved implementation boundary

### Should change

- `src/storage-provider` provider types, factory, exports, Neon env resolution/build correctness, and a new JSONL provider
- directly related specs/docs clarifying the convergence choice

### Should not change

- app route storage wiring
- MCP tool storage wiring
- Redis implementation
- Postgres schema shape
- broader JSONL narrative entity handling

## Review recommendation

Implement the minimum slice, then validate with package builds and a local app smoke check while leaving JSONL-backed app/MCP runtime behavior intact.
