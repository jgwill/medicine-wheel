# Cycles — RISE Specification

> Research cycle lifecycle — complete turns of the Medicine Wheel around research questions. Each cycle is a journey through all four directions, tracking ceremonies conducted, relations mapped, and Wilson alignment as the inquiry unfolds.

**Version:** 0.1.0  
**Document ID:** rispec-cycles-v1  
**Last Updated:** 2026-04-04  

---

## Desired Outcome

Users create **complete research journeys** where:
- Each research question gets its own cycle — a full turn of the Medicine Wheel from East (vision) through South (growth), West (reflection), to North (wisdom)
- Cycles track ceremonial engagement (`ceremonies_conducted`), relational mapping (`relations_mapped`), and ethical alignment (`wilson_alignment`)
- Active cycles are visible across all interfaces (Web UI, MCP tools, terminal agents)
- Completed cycles are archived with OCAP® compliance for seven generations — preserving the research story for future communities
- The narrative arc of each cycle is retrievable as a coherent research story across all four directions

---

## Creative Intent

**What this enables:** Cycles transform research from a linear extraction process into a circular journey of inquiry. Instead of "start project → gather data → analyze → publish," cycles follow the Medicine Wheel: "vision → relationship-building → reflection → wisdom → seed next cycle." The system tracks where you are in the journey and what relational obligations remain.

**Structural Tension:** Between cycles as *project management* (tracking progress, counting ceremonies, measuring alignment scores) and cycles as *ceremonial inquiry journeys* (sacred turns of the wheel where each direction brings its own medicine). The `StoredCycle` type holds the quantitative measures; the `get_narrative_arc` tool weaves them into story; and the `archive_for_seven_generations` tool ensures the journey is preserved with community consent.

Kovach (2009) describes research as a conversational, relational process rooted in oral tradition — not a linear pipeline. The cycle model honors this by returning to East after North, allowing the same question to deepen through multiple turns of the wheel. Wilson (2008) adds that the researcher is accountable to all relations throughout — the `wilson_alignment` score tracks this living obligation.

---

## Type Definitions

### StoredCycle

```typescript
interface StoredCycle {
  id: string;                       // e.g. "cycle-1775338519275-0rboxp"
  research_question: string;        // The driving research question
  current_direction: string;        // DirectionName: east | south | west | north
  start_date: string;               // ISO 8601
  beats?: string[];                 // Linked narrative beat IDs
  ceremonies_conducted: number;     // Count of ceremonies in this cycle
  relations_mapped: number;         // Count of relations mapped
  wilson_alignment: number;         // 0–1 Wilson paradigm alignment score
  ocap_compliant: boolean;          // OCAP® compliance status
  archived?: boolean;               // Whether cycle is archived for seven generations
}
```

### ID Generation

Cycle IDs follow the pattern `cycle-<timestamp>-<random>`:

```typescript
const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
```

### Consent Levels (for archiving)

```typescript
type ConsentLevel = 'public' | 'community_only' | 'restricted' | 'sacred_private';
```

---

## MCP Tool Coverage

### Implemented Tools

| Tool | Source | Operation | Description |
|------|--------|-----------|-------------|
| `create_research_cycle` | `integrations.ts` | **Create** | Create a new cycle with a research question. Defaults to East (vision). Initializes counters at zero. |
| `list_cycles` | `discovery.ts` | **List** | List all cycles. Filter by status: `active`, `archived`, or `all`. Returns cycle summaries. |
| `get_narrative_arc` | `integrations.ts` | **Read** | Get the complete narrative arc for a cycle — beats across all four directions, ceremony count, journey summary. |
| `archive_for_seven_generations` | `integrations.ts` | **Archive** | Archive a cycle with OCAP® compliance. Requires `consent_level`, `community_verified`, and `elder_approved`. |

### Proposed Tools (from MMOT audit)

| Tool | Priority | Operation | Justification |
|------|----------|-----------|---------------|
| `get_cycle` | **P0** | **Read by ID** | Store method `getCycle(id)` exists but has no dedicated MCP tool. Currently only accessible indirectly via `get_narrative_arc`. Fire Keeper and agents need lightweight cycle retrieval without full narrative overhead. |
| `update_cycle_direction` | **P0** | **Update** | Fire Keeper needs to advance `current_direction` as the cycle progresses through the wheel. No store method or tool exists for updating cycle fields. |
| `update_cycle` | P1 | **Update** | Update `ceremonies_conducted`, `relations_mapped`, `wilson_alignment`, and other cycle fields. Currently these counters are set at creation but never incremented. |
| `delete_cycle` | P1 | **Delete** | Remove test or erroneous cycles. No store method or tool exists. |

### CRUD Completeness

| Operation | Store Method | MCP Tool | Status |
|-----------|-------------|----------|--------|
| Create | `createCycle(cycle)` | `create_research_cycle` | ✅ Implemented |
| List All | `getAllCycles()` | `list_cycles` | ✅ Implemented |
| Get by ID | `getCycle(id)` | — | ❌ Store method exists, no dedicated tool |
| Get Narrative Arc | `getCycle(id)` + `getAllBeats()` | `get_narrative_arc` | ✅ Implemented |
| Archive | `archiveCycle(id)` | `archive_for_seven_generations` | ✅ Implemented |
| Update Direction | — | — | ❌ No store method, no tool |
| Update Counters | — | — | ❌ No store method, no tool |
| Delete | — | — | ❌ No store method, no tool |

---

## Cycle Lifecycle

A research cycle follows the Four Directions, with each direction representing a phase of inquiry:

```
    ┌─────────────────────────────────────┐
    │            EAST (Vision)            │
    │   What wants to emerge?             │
    │   Set research question,            │
    │   open with ceremony                │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │           SOUTH (Growth)            │
    │   Build relationships, gather       │
    │   perspectives, conduct talking     │
    │   circles                           │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │           WEST (Reflection)         │
    │   Integrate insights, weave         │
    │   synthesis artifacts, honor        │
    │   ancestors and teachings           │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │           NORTH (Wisdom)            │
    │   Reciprocity summaries, seed       │
    │   observations for next cycle,      │
    │   archive for seven generations     │
    └──────────────┬──────────────────────┘
                   │
                   ▼
          Archive or Begin New Cycle
```

---

## Direction Progression

### East — Vision (Act 1)

**Focus:** What wants to emerge? Setting intention and research question.

- Cycle is created with `create_research_cycle` — `current_direction: 'east'`
- Opening ceremonies (`type: 'opening'`) mark the beginning
- Relational nodes are created to map the initial web of relations
- Narrative beats capture the vision: what is the inquiry, who are the relations

**Transition trigger:** When the research question is clear, initial relations are mapped, and opening ceremony has been conducted → advance to South.

### South — Growth (Act 2)

**Focus:** Building relationships, gathering multiple perspectives.

- Talking circles (`type: 'talking_circle'`) bring diverse voices
- Relational edges are created to map connections between participants and knowledge
- `ceremonies_conducted` and `relations_mapped` counters increase
- Cross-Sun perspectives emerge (Kovach's conversational method)

**Transition trigger:** When sufficient perspectives have been gathered, relational web is rich, and talking circles have been conducted → advance to West.

### West — Reflection (Act 3)

**Focus:** Integration, synthesis, honoring what has been received.

- Spirit feeding ceremonies (`type: 'spirit_feeding'`) honor ancestors and past teachings
- Structural tension charts track the gap between desired outcome and current reality
- Narrative beats weave insights into coherent story
- `wilson_alignment` score reflects how well the cycle honors the Three R's

**Transition trigger:** When integration is complete, synthesis artifacts exist, and the story is coherent → advance to North.

### North — Wisdom (Act 4)

**Focus:** Reciprocity, completion, seeding the future.

- Closing ceremonies (`type: 'closing'`) mark the end of this turn
- MMOT reviews assess what was planned vs. what emerged
- `archive_for_seven_generations` preserves the cycle with OCAP® compliance
- Observations seed the research question for the next cycle

**Transition trigger:** When reciprocity is acknowledged, archive is complete → cycle is archived or a new cycle begins in East.

---

## Wilson Alignment

The `wilson_alignment` field (0–1) tracks how well the cycle honors Wilson's (2008) relational accountability framework:

| Score Range | Meaning | Indicators |
|-------------|---------|------------|
| 0.0 – 0.3 | Low alignment | Few ceremonies conducted, relations unmapped, extractive patterns |
| 0.3 – 0.6 | Developing | Some ceremonies, some relations, but obligations not fully tended |
| 0.6 – 0.8 | Good alignment | Regular ceremony, rich relational web, reciprocity evident |
| 0.8 – 1.0 | Strong alignment | Full ceremonial engagement, all relations honored, community verification |

### Three R's in Cycle Context

| Principle | Cycle Manifestation |
|-----------|-------------------|
| **Respect** | The research question itself respects the knowledge and communities involved. Ceremonies are conducted with appropriate medicines and participants. |
| **Reciprocity** | What is given back? The cycle doesn't just extract knowledge — it creates narrative, honors relations, and archives for future generations. |
| **Responsibility** | The researcher remains accountable throughout the full turn of the wheel. `wilson_alignment` makes this accountability visible and measurable. |

---

## OCAP® and Seven Generations

### Archiving Protocol

The `archive_for_seven_generations` tool implements OCAP® compliance at the cycle level:

```typescript
// Required inputs
{
  cycle_id: string;
  consent_level: 'public' | 'community_only' | 'restricted' | 'sacred_private';
  community_verified: boolean;
  elder_approved: boolean;
}
```

### Archive Outcomes

| Condition | Result |
|-----------|--------|
| `community_verified: true` AND `elder_approved: true` | ✅ Archived — cycle marked `archived: true` |
| Only one of the two is `true` | ⚠️ Pending approval — archive created but not finalized |
| Neither is `true` | ❌ Rejected — OCAP® compliance requirements not met |

### OCAP® Compliance Check

```typescript
const ocapCompliance = {
  ownership: true,                         // Community owns the data
  control: community_verified,             // Community controls the process
  access: consent_level !== 'public',      // Access is restricted appropriately
  possession: true,                        // Data remains in local JSONL files
  on_premise: true,                        // No cloud dependency
};
```

### Seven Generations Principle

The archive is designed to be meaningful to communities seven generations from now. This means:
- The research question must be self-explanatory
- The narrative arc must tell a coherent story
- Consent levels must be explicit — future communities must know who can access this knowledge
- Elder approval ensures the archive meets community standards

---

## Data Persistence

### Storage Location

```
.mw/store/cycles.jsonl
```

### Format

JSONL — one JSON record per line. Each cycle is a complete self-contained record.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MW_DATA_DIR` | `.mw/store/` | Override the JSONL data directory |

### Cross-Process Visibility

Both the Next.js Web UI and MCP server read/write the same `cycles.jsonl` file. Cross-process synchronization uses mtime-based change detection. See `data-store.spec.md` for the full protocol.

### Store API

```typescript
// Write
createCycle(cycle: StoredCycle): void
archiveCycle(id: string): void

// Read
getCycle(id: string): StoredCycle | undefined
getAllCycles(): { active: StoredCycle[]; archived: StoredCycle[] }
```

---

## Integration Points

| Specification | Relationship |
|---------------|-------------|
| **ceremony-protocol.spec.md** | Cycles contain ceremonies. The 4-phase ceremony protocol (opening → council → integration → closure) maps to the 4 directions of a cycle. Each ceremony phase is a micro-turn within the macro-turn of the cycle. |
| **narrative-engine.spec.md** | Narrative beats belong to directions within a cycle. `get_narrative_arc` weaves beats into the cycle's research story. The narrative engine tracks act structure (East=Act 1, South=Act 2, West=Act 3, North=Act 4). |
| **fire-keeper.spec.md** | The Fire Keeper monitors cycle progression — tracking Wilson alignment trajectory, issuing stop-work orders on violations, and managing permission tiers across the cycle's directional phases. |
| **consent-lifecycle.spec.md** | Consent records may reference cycles. Consent ceremonies are logged as ceremonies within a cycle. Archiving requires explicit consent. |
| **data-store.spec.md** | Documents the JSONL persistence layer, atomic writes, cross-process sync, and the `.mw/store/` directory convention. Cycles use the same storage infrastructure as all other entities. |
| **CEREMONIES.md** | Ceremonies are the atomic relational events within a cycle. `ceremonies_conducted` counts them; `get_narrative_arc` links them to narrative beats. |

---

## Sample Data

A cycle created via `create_research_cycle`:

```json
{
  "id": "cycle-1775338519275-0rboxp",
  "research_question": "How do we honor relational accountability in software development?",
  "current_direction": "east",
  "start_date": "2026-04-04T19:06:00.000Z",
  "ceremonies_conducted": 0,
  "relations_mapped": 0,
  "wilson_alignment": 0,
  "ocap_compliant": false,
  "archived": false
}
```

A cycle after progressing through directions:

```json
{
  "id": "cycle-1775338519275-0rboxp",
  "research_question": "How do we honor relational accountability in software development?",
  "current_direction": "west",
  "start_date": "2026-04-04T19:06:00.000Z",
  "ceremonies_conducted": 7,
  "relations_mapped": 14,
  "wilson_alignment": 0.72,
  "ocap_compliant": true,
  "archived": false
}
```

Additional examples are available in `rispecs/demo/CYCLES.md`.

---

## Advancing Patterns

- **Circular, not linear** — Research returns to East, deepening with each turn of the wheel
- **Accountability made visible** — `wilson_alignment` transforms ethical intention into measurable practice
- **Seven generations thinking** — Archives are designed for communities that don't yet exist
- **Ceremony as progress metric** — `ceremonies_conducted` counts relational engagement, not deliverables
- **Cross-interface coherence** — The same cycle is visible in Web UI, MCP tools, and terminal agents
- **Narrative over metrics** — `get_narrative_arc` tells the story; the numbers serve the story, not the reverse

---

## Quality Criteria

- ✅ Creative Orientation: Enables ceremonial inquiry journeys, not just project tracking
- ✅ Structural Dynamics: Resolves tension between project management and ceremonial inquiry via layered specification
- ✅ Implementation Sufficient: Complete type definitions, tool coverage matrix, CRUD gap analysis, and lifecycle documentation
- ✅ Wilson Alignment: Three R's mapped to cycle fields with alignment scoring
- ✅ OCAP® Compliant: Seven generations archiving with Elder approval, community verification, and consent levels
- ✅ Advancing Pattern: Circular inquiry model with direction-specific progression and narrative arc
