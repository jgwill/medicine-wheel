# Design: Sequence Allocation Graph Model for Medicine Wheel

**Status:** Design specification for network-safe creative artifact numbering  
**Issue:** #128 — Add network-safe sequence allocator for ep/op/jr creative artifacts  
**Author:** Design Review  
**Date:** 2026-08-24

---

## 1. Executive Summary

Jerry needs Medicine Wheel to become the shared numbering authority for creative artifacts across the entire network (phone, Termux, laptop, portals, agents, web tools). The risk today is that two devices can independently create duplicate numbers—e.g., both create `op-019`.

**The solution:** Model sequence allocations as first-class nodes in the Medicine Wheel relational graph, allowing any device on the network to query the current state and atomically reserve the next number from a single central source of truth.

**Graph choice:** We use the existing `knowledge` node type with a `metadata.kind: "sequence_allocation"` discriminator, following the established pattern used for `chronicle_episode`, `service`, and other artifact kinds. **The NodeType enum stays closed at six.** Sequence allocations are not a new node type; they are a new discriminated entity riding on existing infrastructure.

---

## 2. Current Medicine Wheel Architecture — Quick Review

### 2.1 The Six NodeTypes (Closed Enum)

Medicine Wheel has exactly six node types—this is deliberate and closed:
- **human** — persons, agents, researchers
- **land** — places, resources, spaces
- **spirit** — intangible concepts, medicines, ceremonies
- **ancestor** — historical figures, precedent, legacy
- **future** — aspirations, potential, visions
- **knowledge** — concepts, artifacts, records, tools, metadata

### 2.2 Metadata Discriminators (Open Pattern)

When a node needs to represent a more specific kind, it rides an existing NodeType and uses `metadata.kind` to distinguish itself. Examples already in the wheel:

| kind | NodeType | Purpose | Example ID |
|------|----------|---------|------------|
| `chronicle_episode` | knowledge | Narrative episodes | `ep-301` |
| `service` | knowledge | Infrastructure services | `service:mcp-medicine-wheel` |
| `structured_plan` | knowledge | Planning artifacts | `plan:q3-roadmap` |
| `host` | knowledge | Computing hosts | `host:ilex` |
| `stc_chart` | knowledge | Structural tension charts | `chart:001` |

This pattern keeps the graph type system simple while allowing unlimited specialization via metadata.

### 2.3 Relational Edges (First-Class, Directional)

In Medicine Wheel, relations are first-class beings with their own obligations and accountability:

- **Asymmetric edges:** `tends-to` ↔ `tended-by`, `holds-responsibility-for` ↔ `in-care-of`
- **Symmetric edges:** `speaks-with`, `co-emerges-with`
- **RSIS verbs:** `STEWARDS` ↔ `stewarded-by`, `SERVES` ↔ `served-by`, `BORN_FROM` ↔ `gave-rise-to`, `GIVES_BACK_TO` ↔ `receives-from`

Each relation carries:
- `obligation` categories (human, land, spirit, future)
- `ocap` flags (Ownership, Control, Access, Possession per First Nations principles)
- `accountability` tracking (Wilson's three R's: Respect, Reciprocity, Responsibility)

---

## 3. Sequence Allocation Node Model

### 3.1 Node Structure

A sequence allocation is a **`knowledge` node** with `metadata.kind: "sequence_allocation"`.

#### Deterministic ID pattern:
```
sequence:{series}:{number}
```

Examples:
- `sequence:opus:019` — the 19th opus allocation
- `sequence:episode:301` — the 301st episode allocation
- `sequence:journal:044` — the 44th journal allocation

#### Node fields:

```json
{
  "id": "sequence:opus:019",
  "type": "knowledge",
  "name": "op-019-tuesla-continuation",
  "metadata": {
    "kind": "sequence_allocation",
    "series": "opus",
    "series_display_name": "Opus / Composition Works",
    "prefix": "op",
    "number": 19,
    "padded": "019",
    "slug": "op-019-tuesla-continuation",
    "title": "Tuesla continuation",
    "status": "reserved",
    "requested_by": "Jerry",
    "requested_device": "phone",
    "created_at": "2026-08-22T14:32:17Z",
    "source": {
      "kind": "recording",
      "path": "/sdcard/Recordings-jamai/260822-opus-request.m4a",
      "device": "phone"
    },
    "workspace": "jamai",
    "intent": "create new opus from recording transcription",
    "total_allocated_in_series": 19
  },
  "created_at": "2026-08-22T14:32:17Z",
  "updated_at": "2026-08-22T14:32:17Z"
}
```

### 3.2 Lifecycle: Status Enum

Allocations flow through a simple lifecycle:

```
reserved
  ↓
  ├→ created       (the artifact was made)
  │   ↓
  │   ├→ attached  (linked to a recording/episode/composition)
  │   └→ archived  (work is complete, retired, moved)
  │
  └→ cancelled     (request abandoned, number never used)
```

**Policy:** Numbers are never reused. Once reserved, the slot is occupied whether the allocation reached `created`, moved to `archived`, or was `cancelled`. This maintains a traceable ledger of creative history.

### 3.3 Query Patterns

Supported queries via existing `/api/nodes` endpoint:

```bash
# Get all allocations in the opus series
GET /api/nodes?kind=sequence_allocation&metadata.series=opus

# Get only active (non-cancelled) allocations in a series
GET /api/nodes?kind=sequence_allocation&metadata.series=opus&metadata.status=reserved,created,attached

# Get allocations by requester
GET /api/nodes?kind=sequence_allocation&metadata.requested_by=Jerry

# Get allocations by device
GET /api/nodes?kind=sequence_allocation&metadata.requested_device=phone
```

**Note:** The existing `/api/nodes` route already supports filtering by `metadata.kind` and nested metadata fields (via the pattern established in `src/ceremonial-diary/src/relate.ts`).

---

## 4. Graph Relationships: Connecting Allocations to the Network

Allocations connect to other beings in the graph via relational edges. Here are the primary edge patterns:

### 4.1 Allocation ← `holds-responsibility-for` → Recording (Asymmetric)

**Direction:** Allocation → Recording  
**Meaning:** The sequence allocation "holds responsibility for" recording that triggered the request.  
**Inverse:** `in-care-of`

```json
{
  "id": "rel:sequence:opus:019→recording:260822",
  "from_id": "sequence:opus:019",
  "to_id": "recording:260822-opus-request",
  "relationship_type": "holds-responsibility-for",
  "kinship_type": "holds-responsibility-for",
  "obligations": [
    { "category": "human", "obligations": ["track request source"] },
    { "category": "future", "obligations": ["preserve intent"] }
  ]
}
```

**Why this edge?**
- Allocations are birthed by requests (recordings, manual inputs, agent triggers).
- The allocation "holds responsibility" for honoring that intent.
- If a recording is deleted, the allocation's `source` metadata preserves the original context.

### 4.2 Episode ← `BORN_FROM` → Allocation (Asymmetric)

**Direction:** Episode → Allocation  
**Meaning:** The episode (e.g., `ep-301`) emerged from (was born from) the allocation.  
**Inverse:** `gave-rise-to`

```json
{
  "id": "rel:ep:301→sequence:episode:301",
  "from_id": "chronicle:miadi-chronicle:ep-301",
  "to_id": "sequence:episode:301",
  "relationship_type": "BORN_FROM",
  "kinship_type": "BORN_FROM",
  "obligations": [
    { "category": "spirit", "obligations": ["honor the genesis"] },
    { "category": "future", "obligations": ["carry the intent forward"] }
  ]
}
```

**Why this edge?**
- When the allocation reaches `created` or `attached` status, the created artifact (episode, opus, journal) is linked via `BORN_FROM`.
- This establishes causality: the artifact exists because the allocation reserved its slot and tracked the intent.
- Reversing the edge (`gave-rise-to`) lets you ask "what did this episode spawn?" from the archive.

### 4.3 Device/Agent ← `STEWARDS` → Allocation (Asymmetric)

**Direction:** Device/Agent → Allocation  
**Meaning:** The device or agent (human or automated) stewards (cares for) the allocation.  
**Inverse:** `stewarded-by`

```json
{
  "id": "rel:agent:transcription-watch→sequence:opus:019",
  "from_id": "human:Jerry",
  "to_id": "sequence:opus:019",
  "relationship_type": "STEWARDS",
  "kinship_type": "STEWARDS",
  "obligations": [
    { "category": "human", "obligations": ["fulfill the creative intent", "report status changes"] },
    { "category": "future", "obligations": ["bring the work to completion or archive"] }
  ]
}
```

**Why this edge?**
- Allocations are requests from *someone* (Jerry, an agent, a transcription watcher).
- The steward holds accountability for moving the allocation from `reserved` through its lifecycle.
- Metadata on the relation can track when/if the steward updated the status.

### 4.4 Series Container ← `speaks-with` → Allocation (Symmetric)

**Direction:** Series (bidirectional)  
**Meaning:** The allocation participates in dialogue with the series ledger.

```json
{
  "id": "rel:series:opus↔sequence:opus:019",
  "from_id": "knowledge:series:opus",
  "to_id": "sequence:opus:019",
  "relationship_type": "speaks-with",
  "kinship_type": "speaks-with",
  "strength": 0.95,
  "obligations": [
    { "category": "future", "obligations": ["maintain sequence integrity"] }
  ]
}
```

**Why this edge?**
- If we model the series itself as a node (e.g., `knowledge:series:opus` with `metadata.kind: "sequence_series"`), allocations can speak with it.
- This makes the series a first-class entity—a ledger you can traverse and query.
- Symmetric `speaks-with` reflects that the series and allocations have equal voice in the dialogue.

---

## 5. API Integration Points

### 5.1 Allocation Creation Endpoint

**Proposed:** `POST /api/sequences/allocate`

Uses the existing `/api/nodes` infrastructure under the hood but wraps it with sequence-allocation-specific logic:

```typescript
POST /api/sequences/allocate
Content-Type: application/json

{
  "series": "opus",
  "prefix": "op",
  "title": "Tuesla continuation",
  "requestedBy": "Jerry",
  "requestedDevice": "phone",
  "source": {
    "kind": "recording",
    "path": "/sdcard/Recordings-jamai/260822-opus-request.m4a",
    "device": "phone"
  },
  "metadata": {
    "workspace": "jamai",
    "intent": "create new opus from recording transcription"
  }
}
```

**Response:**
```json
{
  "success": true,
  "series": "opus",
  "prefix": "op",
  "number": 19,
  "padded": "019",
  "slug": "op-019-tuesla-continuation",
  "id": "sequence:op:019",
  "node": { ... } // Full RelationalNode
}
```

**Under the hood:**
1. Query all existing `sequence_allocation` nodes with `series: "opus"`.
2. Parse the `number` field from each, find the maximum.
3. Next number = max + 1.
4. Create a new node via `/api/nodes` with the computed ID and metadata.
5. Optionally: create relations to the source (recording, device, etc.) using `/api/edges`.

### 5.2 Series List Endpoint

**Proposed:** `GET /api/sequences`

```json
[
  {
    "series": "episode",
    "prefix": "ep",
    "series_display_name": "Episodes",
    "latest": 300,
    "next": 301,
    "total_allocated": 300,
    "total_reserved": 280,
    "total_created": 18,
    "total_archived": 2,
    "last_created": "2026-08-22T14:30:00Z"
  },
  {
    "series": "opus",
    "prefix": "op",
    "series_display_name": "Opus / Composition Works",
    "latest": 18,
    "next": 19,
    "total_allocated": 18,
    "total_reserved": 15,
    "total_created": 3,
    "total_archived": 0,
    "last_created": "2026-08-22T12:15:00Z"
  },
  {
    "series": "journal",
    "prefix": "jr",
    "series_display_name": "Journal Entries",
    "latest": 44,
    "next": 45,
    "total_allocated": 44,
    "total_reserved": 30,
    "total_created": 14,
    "total_archived": 0,
    "last_created": "2026-08-21T09:00:00Z"
  }
]
```

**Under the hood:**
- Query all `sequence_allocation` nodes grouped by `series`.
- For each series, aggregate statistics from the `status` field.
- Return the summary.

### 5.3 Series Details Endpoint

**Proposed:** `GET /api/sequences/:prefix`

Example: `GET /api/sequences/op`

```json
{
  "series": "opus",
  "prefix": "op",
  "series_display_name": "Opus / Composition Works",
  "latest": 18,
  "next": 19,
  "total": 18,
  "allocations": [
    {
      "id": "sequence:opus:001",
      "number": 1,
      "padded": "001",
      "slug": "op-001-first-opus",
      "title": "First Opus",
      "status": "created",
      "requested_by": "Jerry",
      "created_at": "2026-08-01T10:00:00Z"
    },
    ...
    {
      "id": "sequence:opus:019",
      "number": 19,
      "padded": "019",
      "slug": "op-019-tuesla-continuation",
      "title": "Tuesla continuation",
      "status": "reserved",
      "requested_by": "Jerry",
      "created_at": "2026-08-22T14:32:17Z"
    }
  ]
}
```

### 5.4 Update Allocation Status

**Proposed:** `PATCH /api/sequences/:prefix/:number`

Example: `PATCH /api/sequences/op/019`

```json
{
  "status": "created",
  "notes": "Created opus folder and started composition"
}
```

**Response:**
```json
{
  "success": true,
  "id": "sequence:opus:019",
  "status": "created",
  "updated_at": "2026-08-22T15:00:00Z"
}
```

---

## 6. Atomicity and Concurrency

### 6.1 The Challenge

When two devices call `POST /api/sequences/allocate` with `series: "opus"` at nearly the same time, they must receive different numbers. The allocation layer must guarantee atomic increment.

### 6.2 Strategy: File-Level Atomic Lock

The Medicine Wheel storage provider already manages JSONL persistence. We use a per-series lock file:

```
~/.medicine-wheel/sequences/opus.lock
```

**Workflow:**
1. Acquire lock (OS-level file lock, e.g., `flock` on Unix, `fcntl` on Linux).
2. Read the current max number from all allocations in the series.
3. Increment.
4. Write the new node.
5. Release lock.

**Timeout:** Lock acquisition times out after 5 seconds; request fails with HTTP 503 (Service Unavailable).

### 6.3 Provider-Level API

The storage provider (`@medicine-wheel/storage-provider`) exposes:

```typescript
async allocateSequenceNumber(series: string): Promise<{
  number: number;
  padded: string;
}>
```

This method:
- Acquires the lock.
- Reads the JSONL index or cache.
- Computes the next number.
- Returns it.
- Lock is automatically released on exit.

**Guarantee:** If two concurrent requests both reach this method, they receive consecutive numbers. No duplicates.

### 6.4 Redis Coordination (Optional Future)

For multi-instance deployments (e.g., multiple Medicine Wheel servers behind a load balancer), consider Redis as a central coordinator:
- Each server registers itself with a heartbeat.
- Lock acquisition routes through Redis.
- Eliminates file-lock race conditions across machines.

For now, **file locks are sufficient** if Medicine Wheel runs on a single machine or network share.

---

## 7. Integration with Existing Nodes

### 7.1 Linking to Chronicles/Episodes

When an episode `ep-301` is created from an allocation, establish the relation:

```typescript
// In the episode creation flow (e.g., @medicine-wheel/ceremonial-diary)

const allocationNode = await store.getNode('sequence:episode:301');
const episodeNode = await store.createNode({
  id: 'chronicle:miadi-chronicle:ep-301',
  type: 'knowledge',
  name: 'ep-301-my-episode',
  metadata: { kind: 'chronicle_episode', series: 'episode', ... }
});

// Create the BORN_FROM relation
await store.createEdge({
  from_id: episodeNode.id,
  to_id: allocationNode.id,
  relationship_type: 'BORN_FROM',
  kinship_type: 'BORN_FROM',
  obligations: [ ... ]
});
```

### 7.2 Querying Related Artifacts

To find all episodes born from allocations:

```bash
GET /api/edges?relationship_type=BORN_FROM&from_type=knowledge&to_type=knowledge
```

Then filter by `to_id` prefix `sequence:episode:`.

Or via graph traversal (if supported by the relational query layer):

```typescript
const artifacts = await queryRelationalWeb(
  startNode: 'knowledge:series:episode',
  traversalRule: node => node.metadata.kind === 'sequence_allocation',
  followingEdge: 'BORN_FROM',
  direction: 'from'  // Follow outbound
);
```

---

## 8. Visualization: `/sequences` Page

### 8.1 Summary Table

A simple HTML page at `/sequences` displays:

```
Series         Latest    Next    Reserved  Created  Archived  Last Updated
───────────────────────────────────────────────────────────────────────────
Episodes       ep-300    ep-301  280       18       2         2026-08-22
Opus           op-018    op-019  15        3        0         2026-08-22
Journals       jr-044    jr-045  30        14       0         2026-08-21
```

Clicking a series row expands to show:
- Full list of allocations (number, title, status, requester).
- Gaps in numbering (if any exist).
- Filter options by status, requester, device.
- Links to related nodes (recordings, episodes, sessions).

### 8.2 Implementation

- Endpoint: `GET /sequences` (server-side rendered or API + client-side React component)
- Data source: `/api/sequences` endpoint.
- UI library: Existing Medicine Wheel UI components (e.g., `@medicine-wheel/ui-components`).

---

## 9. Example Workflows

### 9.1 Phone → Allocate → Compose → Link

```
PHONE:
  1. User speaks: "Create a new opus"
  2. App calls: POST /api/sequences/allocate { series: "opus" }
  3. Response: { number: 19, slug: "op-019-tuesla-continuation" }
  4. App creates folder: /storage/opus/op-019-tuesla-continuation/
  5. Composer begins work.
  6. (Later) App calls: PATCH /api/sequences/op/019 { status: "created" }

COMPUTER (later):
  1. Sync tool detects new opus folder.
  2. Reads the slug from folder name: "op-019-tuesla-continuation"
  3. Queries: GET /api/nodes?kind=sequence_allocation&metadata.slug=op-019-tuesla-continuation
  4. Finds the node, retrieves intent and source metadata.
  5. Syncs recording (if linked).
  6. Updates status: PATCH /api/sequences/op/019 { status: "attached" }
```

### 9.2 Agent → Allocate → Record → Create

```
AGENT (transcription watcher):
  1. Detects new recording: /sdcard/Recordings/260822-opus-request.m4a
  2. Calls: POST /api/sequences/allocate {
       series: "opus",
       source: { kind: "recording", path: "...", device: "phone" },
       requestedBy: "transcription-agent"
     }
  3. Receives: { number: 20, id: "sequence:opus:020" }
  4. Transcribes recording.
  5. Creates composition object in database.
  6. Calls: PATCH /api/sequences/op/20 { status: "created" }
  7. Links the composition to the sequence allocation via BORN_FROM edge.
```

### 9.3 Graph Traversal → Find All Opus Work

```
Query: "Show me all opus work requested by Jerry"

1. GET /api/nodes?kind=sequence_allocation&metadata.series=opus&metadata.requested_by=Jerry
   → Returns list of allocations (op-001, op-005, op-019, ...)

2. For each allocation, traverse outbound BORN_FROM edges:
   GET /api/edges?from_id=sequence:opus:019&relationship_type=BORN_FROM
   → Finds the linked composition/recording/episode

3. Display full graph:
   [allocation: op-019] --(BORN_FROM)--> [composition/recording]
   [allocation: op-019] <--(holds-responsibility-for)-- [source recording]
   [allocation: op-019] --(STEWARDS)-- [agent/person]
```

---

## 10. Metadata Schema (Reference)

Every sequence allocation node carries metadata in this shape:

```typescript
{
  // Core sequence identity
  kind: "sequence_allocation",
  series: "opus" | "episode" | "journal" | ... ,
  series_display_name: string,
  prefix: string, // "op", "ep", "jr", etc.
  number: number,
  padded: string, // "019"
  slug: string, // "op-019-tuesla-continuation"
  title: string,

  // Lifecycle
  status: "reserved" | "created" | "attached" | "archived" | "cancelled",

  // Request metadata
  requested_by: string,
  requested_device: string,
  created_at: string, // ISO 8601

  // Source of the request
  source?: {
    kind: "recording" | "manual" | "agent" | "api",
    path?: string,
    device?: string,
  },

  // Application context
  workspace?: string,
  intent?: string,
  notes?: string,

  // Aggregates
  total_allocated_in_series: number,
}
```

---

## 11. Implementation Checklist

### Phase 1: Core Model
- [ ] Add `sequence_allocation` to recognized `metadata.kind` values.
- [ ] Define TypeScript types for `SequenceAllocation` metadata shape.
- [ ] Add Zod validation schema for allocation creation.
- [ ] Implement atomic allocation logic in storage provider.

### Phase 2: API Layer
- [ ] Implement `POST /api/sequences/allocate` endpoint.
- [ ] Implement `GET /api/sequences` endpoint.
- [ ] Implement `GET /api/sequences/:prefix` endpoint.
- [ ] Implement `PATCH /api/sequences/:prefix/:number` endpoint.

### Phase 3: Relations
- [ ] Add new kinship edges (if needed) or verify existing edges suffice.
- [ ] Implement helper functions to create/query relations between allocations and other nodes.
- [ ] Test relation traversal (e.g., find all episodes born from allocations).

### Phase 4: UI
- [ ] Create `/sequences` visualization page (summary table).
- [ ] Add expand/detail view for each series.
- [ ] Add filter and search by status, requester, device.

### Phase 5: Verification
- [ ] Write tests for concurrent allocation (simulate two simultaneous requests).
- [ ] Test lock timeout and recovery.
- [ ] Test relation creation and traversal.
- [ ] Test from phone/laptop/agent clients.

### Phase 6: Documentation
- [ ] Write client SDK examples (phone, Termux, laptop, agent).
- [ ] Document the lifecycle and status flow.
- [ ] Document the graph model and edge semantics.
- [ ] Add to RELEASING.md if new capabilities affect deployment.

---

## 12. Design Rationale

### Why a node, not a separate table?

Medicine Wheel's strength is the relational graph. By modeling allocations as nodes (riding the existing `knowledge` type), we gain:
- **Queryability:** Allocations can be filtered and traversed like any other entity.
- **Relatability:** Allocations can be connected to recordings, episodes, devices, agents via first-class relational edges.
- **Extensibility:** Future metadata discriminators (e.g., `artifact_links`, `approval_state`) add to metadata without schema migration.
- **Single source of truth:** One store (`/api/nodes`), one index, one backup.

### Why not a new NodeType?

The NodeType enum is closed by design. Adding `"sequence_allocator"` would require:
- Schema changes to consumers.
- Updates to all query layers.
- Potential breakage in downstream tools relying on the six-type assumption.

Instead, we use `metadata.kind` — an open discriminator designed exactly for this use case.

### Why use `/api/nodes` under the hood?

Reusing existing endpoints:
- Minimizes new code and reduces bugs.
- Integrates with existing filtering (`?kind=`, `?parent_id=`).
- Aligns with how other specialized kinds (e.g., `chronicle_episode`, `service`) already work.
- Simplifies backup and recovery (all nodes, all in one store).

### Why file-level locks for atomicity?

- **Simple:** No external dependency (e.g., Redis) required.
- **Local:** Works on single machines and network shares.
- **Proven:** File locks are the standard POSIX solution for mutual exclusion.
- **Fallible:** Timeouts and explicit lock release handle deadlocks.

If Medicine Wheel scales to multi-instance deployments, adding Redis is straightforward (no query logic changes, only lock acquisition).

---

## 13. Future Extensions

### 13.1 Approval Workflow

Add `metadata.approval_state: "pending" | "approved" | "rejected"` if allocations must pass review before creation.

### 13.2 Quota Limits

Track per-requester or per-device allocations:
```json
{
  "metadata": {
    "daily_quota": 10,
    "allocations_today": 3,
    ...
  }
}
```

### 13.3 Alias Series

Allow aliases for common series:
- `opus` ↔ `op` (both resolve to the same ledger)
- `episode` ↔ `ep`

### 13.4 Reuse Policy Override

If Jerry decides to reuse a cancelled number, a new field `can_reuse_cancelled: true` could change behavior (but this is not the default).

### 13.5 Distributed Tracing

Attach OpenTelemetry IDs to allocations for tracking requests across phone ↔ laptop ↔ agent boundaries.

---

## 14. Acceptance Criteria Mapping

From issue #128:

| Criterion | How Addressed |
|-----------|---------------|
| Client can request next number via HTTP | `POST /api/sequences/allocate` endpoint, reusing `/api/nodes` internally |
| Concurrent requests cannot receive same number | File-level atomic lock in storage provider, timeout after 5s |
| Allocation persisted as node | Created via `/api/nodes` with `kind: "sequence_allocation"` |
| List existing allocations by prefix | `GET /api/sequences/:prefix` endpoint |
| Response includes number, padded, slug, node id, metadata | Response schema defined in Section 5.1 |
| Works from any device reaching API | HTTP endpoint; phone, Termux, laptop, agents all speak HTTP |
| Documentation + examples | Client SDK examples for phone, Termux, laptop, agents (Phase 6) |
| Optional HTML visualization | `/sequences` page (Phase 4) |

---

## 15. References

- **Issue #128:** Add network-safe sequence allocator for ep/op/jr creative artifacts
- **Ontology Core:** `src/ontology-core/` — Node types, kinship edges, OCAP® flags
- **Storage Provider:** `src/storage-provider/` — JSONL persistence, provider interface
- **Ceremonial Diary:** `src/ceremonial-diary/src/relate.ts` — Pattern for using `metadata.kind` discriminators
- **API Nodes:** `app/api/nodes/route.ts` — Existing node CRUD and filtering

---

## 16. Questions for Jerry

1. **Padding width:** Should all series use 3-digit padding (e.g., `op-001`, `op-019`, `op-300`)? Or vary by series?
2. **Starting number:** Should each series start at 001, or continue from current max (if re-enabling an old series)?
3. **Approval before creation:** Should allocations be auto-approved (status = `reserved` immediately) or require approval?
4. **Cross-series queries:** Do you need to ask "show me all allocations requested in the last 24 hours across all series"? (Affects indexing strategy.)
5. **Visibility on phone:** Should Jerry see the full ledger on his phone, or only allocations he owns?

---

**Document Status:** Design specification ready for implementation feedback.  
**Next Step:** Validate with stakeholders, refine metadata schema, then proceed to Phase 1 implementation.
