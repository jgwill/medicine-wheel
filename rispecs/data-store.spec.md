# data-store — RISE Specification

> Redis-backed persistence layer for the Medicine Wheel ecosystem — connection management, Node/Edge/Ceremony CRUD operations, session-ceremony bidirectional linking, and generic Redis helpers.

**Version:** 0.1.1  
**Package:** `medicine-wheel-data-store`  
**Document ID:** rispec-data-store-v1  
**Last Updated:** 2026-03-06  

---

## Desired Outcome

Users create **persistent relational knowledge graphs** backed by Redis where:
- Nodes, edges, and ceremonies are stored as Redis hashes with full CRUD
- Session-ceremony links are bidirectional and queryable from either side
- Connection lifecycle is auto-managed with sensible defaults and full configurability
- Generic helpers simplify common Redis patterns (TTL, bulk ops, key scanning)

---

## Creative Intent

**What this enables:** Any Medicine Wheel application can persist its ontological data to Redis without writing boilerplate connection or serialization code. The data-store translates between ontology-core types and Redis storage, keeping the relational semantics intact.

**Structural Tension:** Between in-memory-only ontology operations (fast but ephemeral) and durable, queryable persistence (survives restarts, shareable across processes). The data-store resolves this by mapping ontology-core types directly to Redis hashes and sets.

---

## Connection Management

### Sub-path: `medicine-wheel-data-store/connection`

```typescript
interface RedisConnectionConfig {
  url?: string;              // Default: "redis://localhost:6379"
  prefix?: string;           // Key prefix, default: "mw:"
  autoConnect?: boolean;     // Default: true
  retryAttempts?: number;    // Default: 3
  retryDelay?: number;       // Default: 1000 (ms)
}

createConnection(config?: RedisConnectionConfig): Promise<MWRedisClient>
getConnection(): MWRedisClient                   // Returns current or auto-creates
closeConnection(): Promise<void>
isConnected(): boolean
```

Connection is auto-managed: first call to any store function connects if needed. Explicit `createConnection` is only required for custom configuration.

---

## Store Operations

### Sub-path: `medicine-wheel-data-store/store`

CRUD for `RelationalNode`, `RelationalEdge`, and `Ceremony` types from ontology-core.

#### Nodes

```typescript
putNode(node: RelationalNode): Promise<void>
getNode(id: string): Promise<RelationalNode | null>
deleteNode(id: string): Promise<boolean>
listNodes(pattern?: string): Promise<RelationalNode[]>
```

Stored as Redis hashes at `{prefix}node:{id}`. Nested objects (OCAP flags, Wilson scores) are JSON-serialized within hash fields.

#### Edges

```typescript
putEdge(edge: RelationalEdge): Promise<void>
getEdge(id: string): Promise<RelationalEdge | null>
deleteEdge(id: string): Promise<boolean>
listEdges(nodeId?: string): Promise<RelationalEdge[]>
```

Stored as hashes at `{prefix}edge:{id}`. Adjacency sets at `{prefix}adj:{nodeId}` enable fast neighbor lookup.

#### Ceremonies

```typescript
putCeremony(ceremony: Ceremony): Promise<void>
getCeremony(id: string): Promise<Ceremony | null>
deleteCeremony(id: string): Promise<boolean>
listCeremonies(phase?: CeremonyPhase): Promise<Ceremony[]>
```

Stored as hashes at `{prefix}ceremony:{id}`. Phase index at `{prefix}ceremonies:phase:{phase}` enables filtering.

---

## Session-Ceremony Linking

### Sub-path: `medicine-wheel-data-store/session-link`

Bidirectional links between external sessions and Medicine Wheel ceremonies:

```typescript
linkSessionToCeremony(sessionId: string, ceremonyId: string): Promise<void>
unlinkSessionFromCeremony(sessionId: string, ceremonyId: string): Promise<void>
getCeremoniesForSession(sessionId: string): Promise<string[]>
getSessionsForCeremony(ceremonyId: string): Promise<string[]>
```

Uses Redis sets at `{prefix}session:{sessionId}:ceremonies` and `{prefix}ceremony:{ceremonyId}:sessions` for O(1) bidirectional lookup.

---

## Generic Redis Helpers

### Sub-path: `medicine-wheel-data-store/helpers`

```typescript
setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void>
getJSON<T>(key: string): Promise<T | null>
setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
scanKeys(pattern: string, count?: number): AsyncIterable<string>
bulkDelete(pattern: string): Promise<number>
keyExists(key: string): Promise<boolean>
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.0, `redis` ^4.6.0
- **Types consumed:** `RelationalNode`, `RelationalEdge`, `Ceremony`, `CeremonyPhase`, `OcapFlags`, `AccountabilityTracking`
- **Node.js:** Built-in modules only (no additional Node.js dependencies beyond `redis`)

---

## Advancing Patterns

- **Ontology-native persistence** — Store and retrieve ontology-core types without manual serialization
- **Bidirectional linking** — Session↔Ceremony links enable ceremony-aware session management
- **Auto-managed connections** — Zero-config for development, fully configurable for production
- **Key prefix isolation** — Multiple Medicine Wheel instances can share one Redis without collision

---

## Quality Criteria

- ✅ Creative Orientation: Enables durable relational knowledge graphs, not just caching
- ✅ Structural Dynamics: Session-ceremony links bridge temporal sessions with ceremonial structure
- ✅ Implementation Sufficient: Complete CRUD API, key schemas, and connection lifecycle documented
- ✅ Codebase Agnostic: Works with any Redis ^4.6.0 deployment
