# Storage Provider Abstraction Specification

## Context

The `medicine-wheel-data-store` package is currently Redis-only (Upstash). We need a provider abstraction to support multiple backends: **Neon (Postgres)** and **Upstash (Redis)**.

## Available Integrations

| Provider | Package | Env Vars |
|----------|---------|----------|
| Neon | `@neondatabase/serverless` | `DATABASE_URL` |
| Upstash | `@upstash/redis` | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |

## Domain Types (from ontology-core)

```ts
interface RelationalNode { id, type, name, description, direction?, metadata, created_at, updated_at }
interface RelationalEdge { from_id, to_id, relationship_type, strength, ceremony_honored, obligations[], created_at }
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

1. **Neon (Postgres)** - Simpler SQL model, better for relational queries, already have `DATABASE_URL`
2. Redis adapter wrapping existing `data-store` logic

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
    neon.ts           # NeonProvider implementation
    redis.ts          # RedisProvider (wraps data-store)
    factory.ts        # createProvider(type) auto-detect
  package.json
  tsconfig.json
```

## Auto-Detection Logic

```ts
function createProvider(): StorageProvider {
  if (process.env.DATABASE_URL) return new NeonProvider();
  if (process.env.KV_REST_API_URL) return new RedisProvider();
  throw new Error('No storage provider configured');
}
```

## Notes

- Neon uses `@neondatabase/serverless` with tagged template queries
- Keep existing `data-store` as-is for backwards compatibility
- New package `medicine-wheel-storage-provider` provides the abstraction
