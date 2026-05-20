---
title: "Persistence And Sessions API"
description: "API reference for storage-provider, data-store, data-store-postgres, and session-reader."
---

These packages handle I/O surfaces in the workspace.

## `medicine-wheel-storage-provider`

Source files: `src/storage-provider/src/interface.ts`, `src/storage-provider/src/factory.ts`, `src/storage-provider/src/jsonl.ts`, `src/storage-provider/src/neon.ts`.

```ts
createProvider(type?: ProviderType): Promise<StorageProvider>
detectProvider(): ProviderType
new JsonlProvider(dataDir?: string)
new NeonProvider()
```

`StorageProvider` methods:

```ts
connect(): Promise<void>
disconnect(): Promise<void>
createNode(node: RelationalNode): Promise<void>
getNode(id: string): Promise<RelationalNode | null>
getAllNodes(limit?: number): Promise<RelationalNode[]>
createEdge(edge: RelationalEdge): Promise<void>
getEdge(fromId: string, toId: string): Promise<RelationalEdge | null>
getRelatedNodes(nodeId: string, direction?: 'from' | 'to' | 'both'): Promise<string[]>
logCeremony(ceremony: CeremonyLog): Promise<void>
getCeremoniesTimeline(limit?: number): Promise<CeremonyLog[]>
```

## `medicine-wheel-data-store`

Source files: `src/data-store/src/connection.ts`, `src/data-store/src/store.ts`, `src/data-store/src/session-link.ts`, `src/data-store/src/helpers.ts`.

Key exports:

```ts
getRedis(opts?: ConnectionOptions): Promise<RedisClientType>
createRedisClient(opts?: ConnectionOptions): ReturnType<typeof createClient>
disconnectRedis(): Promise<void>
createNode(node: RelationalNode): Promise<void>
getNode(id: string): Promise<RelationalNode | null>
searchNodes(query: string, options?: { type?: NodeType; direction?: DirectionName; limit?: number }): Promise<RelationalNode[]>
createEdge(edge: RelationalEdge): Promise<void>
getRelationalWeb(centerNodeId: string, depth?: number): Promise<{ nodes: RelationalNode[]; edges: RelationalEdge[] }>
logCeremony(ceremony: CeremonyLog): Promise<void>
linkSessionToCeremony(ceremonyId: string, sessionId: string, notes?: string): Promise<void>
getSessionsForCeremony(ceremonyId: string): Promise<string[]>
getHash(key: string): Promise<Record<string, string> | null>
```

## `medicine-wheel-data-store-postgres`

Source file: `src/data-store-postgres/src/connection.ts`.

```ts
createPostgresPool(options?: PostgresConnectionOptions): Pool
getPostgresPool(options?: PostgresConnectionOptions): Pool
withPostgresClient<T>(fn: (client: PoolClient) => Promise<T>, options?: PostgresConnectionOptions): Promise<T>
closePostgresPool(options?: PostgresConnectionOptions): Promise<void>
resetPostgresPoolForTests(): Promise<void>
```

## `medicine-wheel-session-reader`

Source files: `src/session-reader/src/sessions.ts`, `src/session-reader/src/types.ts`.

```ts
listSessions(filters?: SessionFilters): Promise<SessionSummary[]>
getDistinctModels(): Promise<string[]>
getSessionSummary(sessionId: string): Promise<SessionSummary | null>
getSessionEvents(sessionId: string): Promise<SessionEvent[]>
getSessionDetail(sessionId: string): Promise<(SessionSummary & { analytics: SessionAnalytics }) | null>
searchSessions(query: string, limit?: number): Promise<SessionSummary[]>
readSessionFile(sessionId: string, fileName: string): Promise<unknown[]>
getLatestEvents(sessionId: string, sinceLineCount?: number): Promise<SessionEvent[]>
```

Example:

```ts
import { createProvider } from 'medicine-wheel-storage-provider';
import { listSessions } from 'medicine-wheel-session-reader';

const store = await createProvider();
const sessions = await listSessions({ minEvents: 10 });

console.log(store.name);
console.log(sessions.length);
```

Choose `storage-provider` when you need portability. Choose `data-store` when you explicitly want Redis behavior. Use `session-reader` independently when you only need analytics over `_sessiondata` JSONL output.

A useful mental model is:

- `storage-provider` is the backend abstraction
- `data-store` is a Redis-flavored domain helper layer
- `data-store-postgres` is pool management, not a full domain store
- `session-reader` is analytics over agent output, not application persistence

That distinction is visible in the code. `JsonlProvider` and `NeonProvider` implement the same interface, `data-store` exposes Redis sets, hashes, and sorted timelines directly, and `session-reader` never depends on the rest of the storage stack at all.
