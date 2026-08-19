# data-store — RISE Specification

> Redis-specific data-access package for Medicine Wheel. This package remains a real persistence implementation with connection management, relational CRUD, session/ceremony linking, and discovery helpers, but it is **not** the canonical cross-backend storage abstraction.

**Version:** 0.6.3  
**Package:** `@medicine-wheel/data-store`  
**Document ID:** rispec-data-store-v3  
**Parity Baseline:** 2026-08-19

---

## Desired Outcome

Users who deliberately choose Redis create a network-accessible Medicine Wheel data store with shared relational records and session/ceremony linkage, without confusing that Redis implementation with the suite-wide provider contract.

---

## Current Reality

Earlier revisions of this specification described JSONL and Redis together as two implementations of one shared architecture. That is no longer the repository boundary.

The current architecture separates them:

- `@medicine-wheel/data-store` is the Redis-specific package;
- `@medicine-wheel/storage-provider` owns the canonical asynchronous provider interface and currently implements JSONL and Neon/Postgres;
- the root application and MCP surfaces converge through storage-provider rather than through this package as a universal persistence API;
- Redis is named in the provider vocabulary but the canonical `RedisProvider` is not yet implemented there.

This spec therefore describes what `data-store` is, not what storage-provider has become.

---

## Structural Tension

**Desired state:** Redis remains usable for callers that intentionally depend on its networked data-access behavior.

**Current pressure:** historical documentation can make a specialized package look like the canonical architecture, creating two competing definitions of persistence.

**Natural resolution:** keep the Redis package explicit and bounded. Cross-backend semantics belong to storage-provider; Redis-specific capabilities remain here until a deliberate convergence step implements them behind the canonical provider contract.

---

## Redis Connection Behavior

The package owns Redis connection lifecycle and configuration.

Conceptually:

```typescript
interface RedisConnectionConfig {
  url?: string;
  prefix?: string;
  autoConnect?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}
```

The package supports creating, retrieving, closing, and checking the connection used by its data-access operations.

The Redis dependency is an implementation fact of this package, not a requirement imposed on the wider Medicine Wheel system.

---

## Core Data Operations

The Redis store works with ontology-core records.

### Nodes

- put a relational node;
- get one node;
- delete a node;
- list nodes.

### Edges

- put a relational edge;
- get one edge;
- delete an edge;
- list edges.

### Ceremonies

- put a ceremony log;
- get one ceremony;
- delete a ceremony;
- list ceremonies.

The package also exposes discovery helpers around these records.

---

## Session ↔ Ceremony Linking

The package preserves bidirectional relationships between external session identifiers and Medicine Wheel ceremony identifiers.

Conceptual operations:

```typescript
linkSessionToCeremony(sessionId, ceremonyId)
getCeremoniesForSession(sessionId)
getSessionsForCeremony(ceremonyId)
```

The linkage is a real capability of this Redis package; it should not be projected onto storage-provider unless that capability is deliberately added to the provider contract.

---

## Boundary with storage-provider

The following behaviors belong to `storage-provider`, not to this package's normative contract:

- selecting JSONL versus Neon through `MW_STORAGE_PROVIDER`;
- whole-collection `countNodes()` / `countCeremonies()` parity;
- node/edge typed mutation refusals shared by providers;
- inquiry weave registry;
- plan perspective registry;
- ceremonial diary registry;
- ceremony event registry;
- capture registry;
- family-specific JSONL/Neon merge and filter parity.

A caller needing those semantics should depend on storage-provider.

---

## Convergence Rule

A future canonical Redis backend should implement `StorageProvider` semantics explicitly.

It must not be declared complete merely because this Redis package already stores nodes, edges, and ceremonies. Provider parity includes mutation meaning, paging versus totals, registry families, error/refusal semantics, filtering, and compatibility behavior.

Until that work exists, selecting Redis through the canonical provider factory should fail visibly rather than silently route into a partial adapter.

---

## Creative Advancement Scenarios

### Scenario: A Redis-specific integration remains operational

**Desired Outcome:** A deployment already using the Redis data-access package continues to store and retrieve its relational records.  
**Current Reality:** The suite's canonical persistence architecture has moved to storage-provider.  
**Natural Progression:** Keep the Redis dependency explicit and continue using this package's own API.  
**Resolution:** Existing Redis work remains valid without redefining the suite-wide provider contract.

### Scenario: Redis joins the canonical provider family

**Desired Outcome:** Select Redis anywhere JSONL or Neon can currently be selected.  
**Current Reality:** A Redis-specific store exists, but full provider parity has not been implemented.  
**Natural Progression:** Build a `StorageProvider` adapter, prove behavioral parity across the provider contract and record families, then enable provider selection.  
**Resolution:** Redis becomes a canonical backend by demonstrated equivalence rather than by name reuse.

---

## Quality Criteria

- Documentation never presents `data-store` as the owner of JSONL persistence.
- Documentation never presents this package as the canonical cross-backend abstraction.
- Redis-specific behavior remains usable and explicit.
- Session/ceremony linking remains attributed to the package that actually owns it.
- A future RedisProvider requires full provider-contract parity, not only node/edge/ceremony CRUD.

---

## Implementation Evidence Appendix

- Package identity/version/dependencies: `src/data-store/package.json`
- Redis connection lifecycle: `src/data-store/src/connection.ts`
- Redis store operations: `src/data-store/src/store.ts`
- Session/ceremony linkage: `src/data-store/src/session-link.ts`
- Canonical provider contract: `src/storage-provider/src/interface.ts`
- Canonical provider selection: `src/storage-provider/src/factory.ts`
