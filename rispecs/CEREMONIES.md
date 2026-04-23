# Ceremonies — RISE Specification

> Ceremony logging, lifecycle management, and relational accountability for the Medicine Wheel ecosystem. Research is ceremony (Wilson, 2008) — every ceremony logged here is both a data record and a witness to relational practice.

**Version:** 0.1.0  
**Document ID:** rispec-ceremonies-v1  
**Last Updated:** 2026-04-04  

---

## Desired Outcome

Users create **ceremony-aware relational memory** where:
- Every ceremony is persisted as a witness record across all interfaces (Web UI, MCP tools, terminal agents)
- Ceremony types honor Indigenous ceremonial forms — smudging, talking circles, spirit feeding, opening, closing
- Each ceremony is located within the Medicine Wheel (direction), grounded in intention, and linked to participants and medicines
- Relations honored during ceremony are tracked, and relational edges are marked as `ceremony_honored`
- Ceremony data is queryable by direction, type, and research context — enabling agents and humans to understand the relational history of the project

---

## Creative Intent

**What this enables:** Ceremonies are the relational heartbeat of the Medicine Wheel system. They move ceremony from background cultural metaphor to foreground operational practice — every logged ceremony creates permanent relational memory that shapes how the system understands its own history.

**Structural Tension:** Between ceremony as *event logging* (a timestamped record of what happened) and ceremony as *living relational practice* (an ongoing obligation to maintain and honor relationships). The logging tools capture the event; the relational web, consent lifecycle, and fire keeper specifications maintain the living practice. This specification documents the data layer — the ceremony-protocol, fire-keeper, and community-review specifications document the governance and relational layers.

Wilson (2008) warns that ceremony without a keeper degrades into mere process. The `StoredCeremony` type is intentionally minimal — it records *that* ceremony occurred, not *how* to conduct one. Protocol and governance live in `ceremony-protocol.spec.md` and `fire-keeper.spec.md`.

---

## Type Definitions

### StoredCeremony

```typescript
interface StoredCeremony {
  id: string;                    // e.g. "ceremony:1775338506041:h8pwj"
  type: string;                  // CeremonyType value
  direction: string;             // DirectionName: east | south | west | north
  participants: string[];        // Who was present (names or node IDs)
  medicines_used: string[];      // tobacco, cedar, sage, strawberry
  intentions: string[];          // What the ceremony aimed to honor
  timestamp: string;             // ISO 8601
  research_context?: string;     // Research context linking ceremony to inquiry
}
```

### CeremonyType

```typescript
type CeremonyType = 'smudging' | 'talking_circle' | 'spirit_feeding' | 'opening' | 'closing';
```

| Type | Direction Affinity | Purpose |
|------|-------------------|---------|
| `smudging` | All | Cleansing, preparation, transition between states |
| `talking_circle` | South | Collective voice, dialogical knowledge sharing (Kovach, 2009) |
| `spirit_feeding` | West | Honoring ancestors, integrating teachings from the past |
| `opening` | East | Beginning — what wants to emerge? Intention and vision |
| `closing` | North | Completion — reciprocity summaries, seeding next cycle |

### DirectionName

```typescript
type DirectionName = 'east' | 'south' | 'west' | 'north';
```

### ID Generation

Ceremony IDs follow the pattern `ceremony:<timestamp>:<random>`:

```typescript
const ceremonyId = `ceremony:${Date.now()}:${Math.random().toString(36).substring(7)}`;
```

---

## MCP Tool Coverage

### Implemented Tools

| Tool | Source | Operation | Description |
|------|--------|-----------|-------------|
| `log_ceremony_with_memory` | `integrations.ts` | **Create** | Log a ceremony with full relational context. Persists to JSONL, updates `ceremony_honored` on related edges. |
| `list_ceremonies` | `discovery.ts` | **List** | List all ceremonies. Filter by `direction` or `type`. Sorted by timestamp (newest first). |

### Proposed Tools (from MMOT audit)

| Tool | Priority | Operation | Justification |
|------|----------|-----------|---------------|
| `get_ceremony` | **P0** | **Read by ID** | Store method `getCeremony(id)` exists but has no MCP tool. Fire Keeper and agents need to retrieve a specific ceremony by ID for validation and review. |
| `update_ceremony` | P1 | **Update** | Correct ceremony records post-creation. No store method or tool exists. |
| `delete_ceremony` | P1 | **Delete** | Remove test or erroneous ceremonies. No store method or tool exists. |

### CRUD Completeness

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `logCeremony(ceremony)` | `log_ceremony_with_memory` | ✅ Implemented |
| List All | `getAllCeremonies(limit?)` | `list_ceremonies` | ✅ Implemented |
| Get by ID | `getCeremony(id)` | — | ❌ Store method exists, no tool |
| Filter by Direction | `getCeremoniesByDirection(dir)` | `list_ceremonies` (filter) | ✅ Implemented |
| Filter by Type | `getCeremoniesByType(type)` | `list_ceremonies` (filter) | ✅ Implemented |
| Update | — | — | ❌ No store method, no tool |
| Delete | — | — | ❌ No store method, no tool |

---

## Ceremony Lifecycle

Ceremonies in the Medicine Wheel follow a natural progression that mirrors the Four Directions:

```
Intention → Opening → Conducting → Closing → Archiving
  (East)     (East)    (South/West)  (North)   (Seven Generations)
```

### 1. Intention (East)

Before a ceremony is logged, intention must be set. The `intentions` field captures what the ceremony aims to honor. This is not optional metadata — it is the relational core of the ceremony.

### 2. Opening

The ceremony begins. Participants gather, medicines are acknowledged, and the direction is established. An `opening` type ceremony may be logged to mark this moment.

### 3. Conducting

The ceremony unfolds — talking circles, smudging, spirit feeding. The `log_ceremony_with_memory` tool captures the ceremony at this point, creating the permanent record.

**Relational side effects:** When `relations_honored` node IDs are provided, the tool traverses the relational web and marks edges as `ceremony_honored: true`, linking the ceremony ID to each honored edge.

### 4. Closing

A `closing` type ceremony marks the end. Reciprocity is acknowledged — what was received, what was given back.

### 5. Archiving

Ceremonies conducted within a research cycle are archived with the cycle via `archive_for_seven_generations`. This applies OCAP® compliance checks and consent levels.

---

## Wilson Alignment

Wilson's (2008) Three R's — **Respect, Reciprocity, Responsibility** — are embedded in the ceremony data model:

| Principle | How It Manifests |
|-----------|-----------------|
| **Respect** | `medicines_used` — acknowledging the sacred medicines present. `participants` — naming who was present (not anonymous). |
| **Reciprocity** | `intentions` — what the ceremony gives back to the relational web. `relations_honored` — explicitly marking which relationships were tended. |
| **Responsibility** | `ceremony_honored` flag on edges — tracking whether relational obligations have been met through ceremony. Persistent records mean the community can review ceremonial history. |

Wilson's core insight — "once you are in relationship, you are responsible for that relationship's wellbeing" — is operationalized through the `ceremony_honored` boolean on relational edges. Edges begin as `ceremony_honored: false` and are updated when a ceremony explicitly honors the relationship.

---

## OCAP® Considerations

The First Nations Information Governance Centre's OCAP® principles apply to ceremony data:

| Principle | Implementation |
|-----------|---------------|
| **Ownership** | Ceremony data belongs to the community that conducted the ceremony. The `participants` field establishes collective ownership. |
| **Control** | Community controls access via consent levels set during `archive_for_seven_generations`: `public`, `community_only`, `restricted`, `sacred_private`. |
| **Access** | `list_ceremonies` returns all ceremonies — access restriction is a governance concern handled by the ceremony-protocol and fire-keeper specifications. |
| **Possession** | Data persists in `.mw/store/ceremonies.jsonl` — a local file under community possession, not a remote cloud service. |

---

## Data Persistence

### Storage Location

```
.mw/store/ceremonies.jsonl
```

### Format

JSONL — one JSON record per line. Each ceremony is a complete self-contained record.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MW_DATA_DIR` | `.mw/store/` | Override the JSONL data directory |

### Cross-Process Visibility

Both the Next.js Web UI and MCP server read/write the same `ceremonies.jsonl` file. Cross-process synchronization uses mtime-based change detection — when one process writes, the other detects the file modification and reloads from disk.

### Write Safety

Writes use file locking (`O_EXCL` lock file) with read-modify-write merge semantics inside the lock. See `data-store.spec.md` for the full atomic write protocol.

### Store API

```typescript
// Write
logCeremony(ceremony: StoredCeremony): void

// Read
getCeremony(id: string): StoredCeremony | undefined
getAllCeremonies(limit?: number): StoredCeremony[]
getCeremoniesByDirection(direction: string): StoredCeremony[]
getCeremoniesByType(type: string): StoredCeremony[]
```

---

## Integration Points

| Specification | Relationship |
|---------------|-------------|
| **ceremony-protocol.spec.md** | Defines the 4-phase ceremony lifecycle (opening → council → integration → closure) and governance enforcement. Ceremonies logged here are *instances* of the protocol defined there. |
| **fire-keeper.spec.md** | The Fire Keeper tends the ceremonial fire — monitoring Wilson alignment, enforcing permission tiers, and issuing stop-work orders. Uses ceremony data to track trajectory. |
| **community-review.spec.md** | Talking circles are a ceremony type. Community review outcomes reference ceremonies conducted during the review process. |
| **narrative-engine.spec.md** | Narrative beats link to ceremony IDs via the `ceremonies` array. The narrative arc weaves ceremony records into the research story. |
| **consent-lifecycle.spec.md** | Consent ceremonies formalize consent moments with witnesses — `ConsentCeremony` records reference ceremony IDs from this store. |
| **data-store.spec.md** | Documents the JSONL persistence layer, atomic writes, cross-process sync, and the `.mw/store/` directory convention. |

---

## Sample Data

A ceremony logged via `log_ceremony_with_memory`:

```json
{
  "id": "ceremony:1775338506041:h8pwj",
  "type": "talking_circle",
  "direction": "east",
  "participants": ["Guillaume", "Mia", "Ava", "Tushell", "Linka"],
  "medicines_used": ["tobacco", "cedar"],
  "intentions": [
    "Discuss the kinship of prompt-decomposition-engine lineage evolution",
    "Honor the transformation of prompts into inquiries"
  ],
  "timestamp": "2026-04-04T19:06:00.000Z",
  "research_context": "automated prompt engineering, computational linguistics, philosophy of AI"
}
```

Additional examples are available in `rispecs/demo/CEREMONIES.md`.

---

## Advancing Patterns

- **Research is ceremony** — Every logged ceremony is both data and witness, honoring Wilson's ontological claim
- **Relational side effects** — Logging a ceremony updates the relational web, not just a database table
- **Cross-interface visibility** — Ceremonies created in the Web UI appear in MCP tools instantly
- **Inspectable data** — `cat .mw/store/ceremonies.jsonl` reveals the full ceremonial history in plain text
- **Minimal record, living practice** — The stored record is intentionally minimal; the living practice is governed by ceremony-protocol and fire-keeper

---

## Quality Criteria

- ✅ Creative Orientation: Enables ceremony as relational memory, not just event logging
- ✅ Structural Dynamics: Resolves tension between record-keeping and living practice via specification layering
- ✅ Implementation Sufficient: Complete type definitions, tool coverage matrix, and CRUD gap analysis
- ✅ Wilson Alignment: Three R's mapped to data model fields
- ✅ OCAP® Compliant: Community ownership, local possession, consent-level access control
