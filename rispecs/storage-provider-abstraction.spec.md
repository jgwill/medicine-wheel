# Storage Provider Abstraction Specification

## Context

The repo currently runs local/default persistence through shared JSONL stores in `lib/jsonl-store.ts` and `mcp/src/jsonl-store.ts`. The older `medicine-wheel-data-store` package is Redis-oriented. We need one provider abstraction that can preserve JSONL as the current default while supporting **Neon/Postgres** as the first production backend and leaving **Upstash/Redis** secondary.

## Available Integrations

| Provider | Package | Env Vars |
|----------|---------|----------|
| JSONL | `medicine-wheel-storage-provider` | `MW_DATA_DIR`, `MW_STORAGE_PROVIDER=jsonl` |
| Neon | `medicine-wheel-storage-provider` | `DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`, `MW_STORAGE_PROVIDER=neon` |
| Upstash | `@upstash/redis` | `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `MW_STORAGE_PROVIDER=redis` |

## Domain Types (from ontology-core)

Use the ontology-core relational types as the base contract. The storage layer may carry two additive projections for persistence compatibility:

- `RelationalNode` may include optional `description`
- `RelationalEdge` may include optional `id` and optional `last_ceremony`

```ts
interface RelationalNode { id, type, name, direction?, metadata, created_at, updated_at, description? }
interface RelationalEdge { id?, from_id, to_id, relationship_type, strength, ceremony_honored, obligations[], created_at, last_ceremony? }
interface CeremonyLog { id, type, direction, participants[], medicines_used[], intentions[], timestamp }
```

## Required Provider Interface

```ts
interface StorageProvider {
  // Nodes
  createNode(node: RelationalNode): Promise<void>;
  getNode(id: string): Promise<RelationalNode | null>;
  getNodesByType(type: NodeType): Promise<RelationalNode[]>;
  getNodesByDirection(direction: DirectionName): Promise<RelationalNode[]>;
  getAllNodes(limit?: number): Promise<RelationalNode[]>;
  
  // Edges
  createEdge(edge: RelationalEdge): Promise<void>;
  getEdge(fromId: string, toId: string): Promise<RelationalEdge | null>;
  getRelatedNodes(nodeId: string, direction?: 'from' | 'to' | 'both'): Promise<string[]>;
  
  // Ceremonies
  logCeremony(ceremony: CeremonyLog): Promise<void>;
  getCeremony(id: string): Promise<CeremonyLog | null>;
  getCeremoniesTimeline(limit?: number): Promise<CeremonyLog[]>;
  getCeremoniesByDirection(direction: DirectionName): Promise<CeremonyLog[]>;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

## Implementation Priority

1. **JSONL** - Preserve current default/local behavior and compatibility with `.mw/store`
2. **Neon (Postgres)** - First production backend to harden
3. Redis adapter wrapping existing `data-store` logic when/if needed

## Neon Schema (to create)

```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  direction TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE edges (
  from_id TEXT NOT NULL REFERENCES nodes(id),
  to_id TEXT NOT NULL REFERENCES nodes(id),
  relationship_type TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  ceremony_honored BOOLEAN DEFAULT FALSE,
  last_ceremony TEXT,
  obligations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE ceremonies (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  participants JSONB DEFAULT '[]',
  medicines_used JSONB DEFAULT '[]',
  intentions JSONB DEFAULT '[]',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  research_context TEXT
);

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_direction ON nodes(direction);
CREATE INDEX idx_ceremonies_direction ON ceremonies(direction);
CREATE INDEX idx_ceremonies_timestamp ON ceremonies(timestamp DESC);
```

## Package Structure

```
src/storage-provider/
  src/
    index.ts          # exports interface + factory
    interface.ts      # StorageProvider interface
    jsonl.ts          # JsonlProvider implementation (default/local)
    neon.ts           # NeonProvider implementation
    redis.ts          # RedisProvider (wraps data-store, future)
    factory.ts        # createProvider(type) auto-detect
  package.json
  tsconfig.json
```

## Auto-Detection Logic

```ts
function createProvider(): StorageProvider {
  if (process.env.MW_STORAGE_PROVIDER === 'jsonl') return new JsonlProvider();
  if (process.env.MW_STORAGE_PROVIDER === 'neon') return new NeonProvider();
  if (process.env.MW_STORAGE_PROVIDER === 'redis') return new RedisProvider();
  return new JsonlProvider();
}
```

## Notes

- JSONL remains the default/local backend and stays compatible with `.mw/store/*.jsonl`
- Ambient Postgres connection variables do not change the provider unless `MW_STORAGE_PROVIDER` explicitly selects Neon/Postgres
- Keep existing `data-store` as-is for backwards compatibility while Redis remains secondary
- `src/data-store-postgres` may remain as a small scaffold, but the provider abstraction converges in `medicine-wheel-storage-provider`
