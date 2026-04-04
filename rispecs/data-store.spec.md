# data-store — RISE Specification

> Persistence layers for the Medicine Wheel ecosystem — JSONL file-based storage for development/community use, and Redis-backed persistence for production scale.

**Version:** 0.2.0  
**Package:** `medicine-wheel-data-store`  
**Document ID:** rispec-data-store-v2  
**Last Updated:** 2026-04-04  

---

## Desired Outcome

Users create **persistent relational knowledge graphs** that survive process restarts and are visible across all interfaces (Web UI, MCP tools, terminal agents) without requiring external infrastructure for development and community deployments.

---

## Creative Intent

**What this enables:** Any Medicine Wheel application can persist its ontological data — ceremonies, cycles, nodes, edges, beats, structural tension charts — to shared storage that all interfaces read/write simultaneously. Communities can start with zero-infrastructure JSONL files and graduate to Redis when scale demands it.

**Structural Tension:** Between in-memory-only ephemeral data (fast but invisible across processes) and durable queryable persistence (survives restarts, shareable). The JSONL layer resolves this with file-based persistence; the Redis layer resolves it with network-accessible persistence.

---

## Architecture: Two Persistence Backends

### 1. JSONL File Store (Default — Zero Dependencies)

**Location:** `lib/jsonl-store.ts` (Web UI) + `mcp/src/jsonl-store.ts` (MCP server)  
**Data directory:** `.mw/store/` (configurable via `MW_DATA_DIR`)

Both the Next.js Web UI and MCP server processes read/write the same JSONL files on disk. Cross-process synchronization is handled via file mtime checking — if one process writes, the other detects the change and reloads from disk.

#### File Layout

```
.mw/store/
├── nodes.jsonl        # Relational nodes (human, land, spirit, ancestor, future, knowledge)
├── edges.jsonl        # Relational edges between nodes
├── ceremonies.jsonl   # Ceremony logs
├── beats.jsonl        # Narrative beats
├── cycles.jsonl       # Medicine wheel research cycles
├── charts.jsonl       # Structural tension charts
└── mmots.jsonl        # Moment of truth reviews
```

Each file is JSONL format: one JSON record per line. Records may include an `id` field depending on record type, but the JSONL persistence layer is append-only and does not itself guarantee key-based uniqueness, upsert behavior, or de-duplication.

#### Cross-Process Sync Protocol

```
Process A (Web UI)              Shared Disk               Process B (MCP)
     │                              │                          │
     ├── write ceremony ──────────► │ ceremonies.jsonl         │
     │   (atomic: tmp+rename)       │ mtime updated            │
     │                              │                          │
     │                              │ ◄───────── list_ceremonies│
     │                              │   (check mtime → reload) │
     │                              │   returns ceremony ──────┤
```

#### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MW_DATA_DIR` | `.mw/store/` (project root) | Override JSONL data directory |

The MCP server resolves the project root automatically (from `mcp/` subdirectory → parent `.mw/store/`).

#### Atomic Writes

Writes use temp-file + rename to prevent corruption:
1. Write to `file.jsonl.tmp.<pid>`
2. `fs.renameSync()` to `file.jsonl`
3. Rename is atomic on POSIX filesystems

#### When to Use JSONL

- Development and demo environments
- Community deployments without Redis infrastructure
- Single-machine setups where Web UI and MCP run together
- Projects where `.mw/` directory conventions are established

### 2. Redis Store (Production Scale)

**Location:** `src/data-store/`  
**Package:** `medicine-wheel-data-store`

Redis-backed persistence for production deployments. Supports Upstash, Vercel KV, and local Redis.

#### Connection Management

```typescript
interface RedisConnectionConfig {
  url?: string;              // Default: "redis://localhost:6379"
  prefix?: string;           // Key prefix, default: "mw:"
  autoConnect?: boolean;     // Default: true
  retryAttempts?: number;    // Default: 3
  retryDelay?: number;       // Default: 1000 (ms)
}

createConnection(config?: RedisConnectionConfig): Promise<MWRedisClient>
getConnection(): MWRedisClient
closeConnection(): Promise<void>
isConnected(): boolean
```

#### Store Operations

CRUD for `RelationalNode`, `RelationalEdge`, and `CeremonyLog` types from ontology-core.

**Nodes:** `putNode`, `getNode`, `deleteNode`, `listNodes`  
**Edges:** `putEdge`, `getEdge`, `deleteEdge`, `listEdges`  
**Ceremonies:** `putCeremony`, `getCeremony`, `deleteCeremony`, `listCeremonies`

#### Session-Ceremony Linking

Bidirectional links between external sessions and Medicine Wheel ceremonies:

```typescript
linkSessionToCeremony(sessionId: string, ceremonyId: string): Promise<void>
getCeremoniesForSession(sessionId: string): Promise<string[]>
getSessionsForCeremony(ceremonyId: string): Promise<string[]>
```

#### When to Use Redis

- Multi-machine deployments
- High-concurrency environments
- Production web applications
- When network-accessible persistence is required

---

## API Surface (Shared Across Backends)

Both JSONL and Redis backends expose the same logical operations:

### Nodes
```typescript
createNode(node: RelationalNode): void
getNode(id: string): RelationalNode | undefined
getAllNodes(limit?: number): RelationalNode[]
getNodesByType(type: string): RelationalNode[]
getNodesByDirection(direction: string): RelationalNode[]
searchNodes(query: string, opts?: { type?; direction?; limit? }): RelationalNode[]
```

### Edges
```typescript
createEdge(edge: RelationalEdge): void
getEdgesForNode(nodeId: string): RelationalEdge[]
getRelatedNodeIds(nodeId: string): string[]
getRelationalWeb(nodeId: string, depth?: number): { nodes; edges }
updateEdgeCeremony(fromId: string, toId: string, ceremonyId: string): void
```

### Ceremonies
```typescript
logCeremony(ceremony: CeremonyLog): void
getCeremony(id: string): CeremonyLog | undefined
getAllCeremonies(limit?: number): CeremonyLog[]
getCeremoniesByDirection(direction: string): CeremonyLog[]
getCeremoniesByType(type: string): CeremonyLog[]
```

### Beats
```typescript
createBeat(beat: NarrativeBeat): void
getBeat(id: string): NarrativeBeat | undefined
getAllBeats(limit?: number): NarrativeBeat[]
getBeatsByDirection(direction: string): NarrativeBeat[]
```

### Cycles
```typescript
createCycle(cycle: MedicineWheelCycle): void
getCycle(id: string): MedicineWheelCycle | undefined
getAllCycles(): { active: MedicineWheelCycle[]; archived: MedicineWheelCycle[] }
archiveCycle(id: string): void
```

### Charts (Structural Tension)
```typescript
saveChart(chart: StructuralTensionChart): void
getChart(id: string): StructuralTensionChart | undefined
getAllCharts(direction?: string): StructuralTensionChart[]
```

### MMOT (Moment of Truth)
```typescript
saveMmot(mmot: MmotReview): void
getMmotsByChart(chartId: string): MmotReview[]
```

---

## `.mw/` Directory Convention

The `.mw/` directory follows the Medicine Wheel workspace convention established across the ecosystem:

```
.mw/
├── store/               # JSONL data files (this spec)
│   ├── nodes.jsonl
│   ├── edges.jsonl
│   ├── ceremonies.jsonl
│   ├── beats.jsonl
│   ├── cycles.jsonl
│   ├── charts.jsonl
│   └── mmots.jsonl
├── east/                # Vision artifacts (optional)
├── south/               # Planning artifacts (optional)
├── west/                # Implementation artifacts (optional)
├── north/               # Reflection artifacts (optional)
├── ceremonies/          # Ceremony crossing artifacts (optional)
└── README.md            # Workspace description
```

The `store/` subdirectory is created automatically by the JSONL persistence engine. The directional subdirectories are optional and follow the `.mw/` convention from other ecosystem projects.

---

## Dependencies

### JSONL Store
- **Runtime:** Node.js built-in `fs`, `path` only — zero external dependencies
- **Types consumed:** Inline interfaces compatible with `ontology-core` types

### Redis Store
- **Runtime:** `medicine-wheel-ontology-core` ^0.1.0, `redis` ^4.6.0
- **Types consumed:** `RelationalNode`, `RelationalEdge`, `CeremonyLog`, `CeremonyPhase`, `OcapFlags`

---

## Advancing Patterns

- **Cross-interface visibility** — Data created in Web UI appears in MCP tools instantly (and vice versa)
- **Zero-infrastructure start** — Communities begin with JSONL files, no Redis setup needed
- **Inspectable data** — `cat .mw/store/ceremonies.jsonl` reveals all ceremonies in plain text
- **Git-friendly when opted in** — JSONL files are plain-text and can be committed as project data, but `.mw/store/` is ignored by default in standard repo setups
- **Explicit commit control** — Projects that want tracked seed/state data can override the ignore rule for selected `.mw/store/*.jsonl` files or subdirectories
- **Graceful graduation** — Switch to Redis when scale requires it, same API
- **`.mw/` convention alignment** — Follows the ecosystem-wide directional workspace pattern

---

## Quality Criteria

- ✅ Creative Orientation: Enables persistent relational knowledge graphs across all interfaces
- ✅ Structural Dynamics: Mtime-based cross-process sync resolves the isolation tension naturally
- ✅ Implementation Sufficient: Complete API, file layout, sync protocol, and configuration documented
- ✅ Codebase Agnostic: JSONL files are plain text — any tool can read/write them
- ✅ Advancing Pattern: Zero-to-Redis progression without API changes
