# medicine-wheel-data-store

Shared Redis data-access layer for the Medicine Wheel Developer Suite — connection management, Node/Edge/Ceremony CRUD, session-ceremony linking, and discovery helpers.

## Overview

This package provides a **unified Redis persistence layer** consumed by `mcp-medicine-wheel` and other Medicine Wheel services. It wraps the `redis` client with domain-aware helpers that honour the relational ontology defined in `medicine-wheel-ontology-core`.

### What it provides

| Module | Description |
|--------|-------------|
| `connection` | Redis client lifecycle — connect, create, disconnect |
| `store` | Node, Edge, and Ceremony CRUD with direction/type indexing |
| `session-link` | Bi-directional session ↔ ceremony linking |
| `helpers` | Generic Redis primitives — sets, sorted sets, hashes |

## Installation

```bash
npm install medicine-wheel-data-store
```

Or link locally:
```bash
npm link ../medicine-wheel/src/data-store
```

## Usage

```typescript
import {
  // Connection
  getRedis, createRedisClient, disconnectRedis,

  // Node CRUD
  createNode, getNode, getNodesByType, getNodesByDirection, getAllNodes, searchNodes,

  // Edge CRUD
  createEdge, getEdge, getRelatedNodes, updateEdgeCeremony,

  // Ceremony CRUD
  logCeremony, getCeremony, getCeremoniesTimeline,
  getCeremoniesByDirection, getCeremoniesByType, getAllCeremonies,

  // Accountability
  getRelationalWeb, trackAccountability, getAccountability,

  // Session-Ceremony Linking
  linkSessionToCeremony, unlinkSessionFromCeremony,
  getSessionsForCeremony, getCeremoniesForSession,

  // Generic Redis Helpers
  getAllFromSet, getHash, getAllHashes, setHash, addToSet, addToSortedSet,
} from 'medicine-wheel-data-store';
```

### Quick start

```typescript
import { getRedis, createNode, getNodesByDirection } from 'medicine-wheel-data-store';

// Connect (reuses existing client if already connected)
const redis = await getRedis();

// Create a relational node
await createNode({
  id: 'node-1',
  name: 'Vision Quest',
  type: 'ceremony',
  direction: 'East',
});

// Query by direction
const eastNodes = await getNodesByDirection('East');

// Clean up
await disconnectRedis();
```

### Sub-path imports

```typescript
import { getRedis } from 'medicine-wheel-data-store/connection';
import { createNode, logCeremony } from 'medicine-wheel-data-store/store';
import { linkSessionToCeremony } from 'medicine-wheel-data-store/session-link';
import { getAllFromSet, setHash } from 'medicine-wheel-data-store/helpers';
```

## API Reference

### Connection (`./connection`)

| Function | Description |
|----------|-------------|
| `getRedis()` | Return the shared Redis client, connecting if needed |
| `createRedisClient()` | Create a new, independent Redis client |
| `disconnectRedis()` | Gracefully close the shared client |

### Node CRUD (`./store`)

| Function | Description |
|----------|-------------|
| `createNode(node)` | Persist a relational node and update indexes |
| `getNode(id)` | Retrieve a node by ID |
| `getNodesByType(type)` | List nodes matching a given type |
| `getNodesByDirection(dir)` | List nodes aligned to a direction |
| `getAllNodes()` | Return every stored node |
| `searchNodes(query)` | Full-text / pattern search across nodes |

### Edge CRUD (`./store`)

| Function | Description |
|----------|-------------|
| `createEdge(edge)` | Persist a relational edge |
| `getEdge(id)` | Retrieve an edge by ID |
| `getRelatedNodes(nodeId)` | Discover nodes connected to a given node |
| `updateEdgeCeremony(edgeId, ctx)` | Attach or update ceremony context on an edge |

### Ceremony CRUD (`./store`)

| Function | Description |
|----------|-------------|
| `logCeremony(ceremony)` | Record a ceremony event |
| `getCeremony(id)` | Retrieve a ceremony by ID |
| `getCeremoniesTimeline()` | Ceremonies ordered chronologically |
| `getCeremoniesByDirection(dir)` | Ceremonies filtered by direction |
| `getCeremoniesByType(type)` | Ceremonies filtered by type |
| `getAllCeremonies()` | Return every stored ceremony |

### Accountability (`./store`)

| Function | Description |
|----------|-------------|
| `getRelationalWeb(nodeId)` | Full relational web around a node |
| `trackAccountability(record)` | Log an accountability event |
| `getAccountability(id)` | Retrieve accountability tracking data |

### Session-Ceremony Linking (`./session-link`)

| Function | Description |
|----------|-------------|
| `linkSessionToCeremony(sessionId, ceremonyId)` | Create a bi-directional link |
| `unlinkSessionFromCeremony(sessionId, ceremonyId)` | Remove a bi-directional link |
| `getSessionsForCeremony(ceremonyId)` | Sessions attached to a ceremony |
| `getCeremoniesForSession(sessionId)` | Ceremonies attached to a session |

### Generic Redis Helpers (`./helpers`)

| Function | Description |
|----------|-------------|
| `getAllFromSet(key)` | All members of a Redis set |
| `getHash(key)` | All fields of a Redis hash |
| `getAllHashes(pattern)` | Hashes matching a key pattern |
| `setHash(key, data)` | Write fields to a Redis hash |
| `addToSet(key, member)` | Add a member to a Redis set |
| `addToSortedSet(key, score, member)` | Add a member to a sorted set |

## Dependencies

| Package | Purpose |
|---------|---------|
| `medicine-wheel-ontology-core` | Shared types, schemas, and constants |
| `redis` | Redis client (v4+) |

## License

MIT — IAIP Collaborative, Shawinigan, QC
