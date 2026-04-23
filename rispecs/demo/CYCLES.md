# CYCLES.md

> A Cycle is a complete turn of the Medicine Wheel around a research question. It begins in the East (vision) and progresses through South (growth), West (reflection), and North (wisdom). Each cycle tracks ceremonies conducted, relations mapped, and Wilson alignment.

## Persistence & Cross-Interface Visibility

Cycles created in **any interface** — the Web UI, MCP tools, or terminal agents — are persisted to `.mw/store/cycles.jsonl` and immediately visible across all interfaces.

- **Web UI**: `POST /api/narrative/cycles` → writes to `.mw/store/cycles.jsonl`
- **MCP**: `create_research_cycle` tool → writes to same `.mw/store/cycles.jsonl`
- **MCP Discovery**: `list_cycles` tool reads from the shared JSONL file
- **Data survives restarts** — JSONL files persist on disk

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MW_DATA_DIR` | `.mw/store/` | Override the JSONL data directory |

## Cycle Schema

```typescript
interface MedicineWheelCycle {
  id: string;                       // e.g. "cycle-1775338519275-0rboxp"
  research_question: string;        // The driving research question
  current_direction: DirectionName; // Where the cycle currently is
  start_date: string;               // ISO 8601
  beats: string[];                  // Linked narrative beat IDs
  ceremonies_conducted: number;     // Count of ceremonies in this cycle
  relations_mapped: number;         // Count of relations mapped
  wilson_alignment: number;         // 0-1 Wilson paradigm alignment
  ocap_compliant: boolean;          // OCAP® compliance status
  archived?: boolean;               // Whether cycle is archived
}
```

## Sample Cycles (Demo/Samples)

### How is the agent orchestration team designed with Indigenous Epistemology?
- **Direction**: east (beginning)
- **Context**: Examining biases of Western (European) Agent Orchestration vs Indigenous relational approaches

### How do we honor relational accountability in software development?
- **Direction**: east (beginning)
- **Context**: Core research question for the Medicine Wheel application itself

## MCP Tools for Cycles

| Tool | Purpose |
|------|---------|
| `create_research_cycle` | Create a new cycle with a research question |
| `list_cycles` | List all cycles (active, archived, or all) |
| `get_narrative_arc` | Get the complete narrative arc for a cycle |
| `archive_for_seven_generations` | Archive a cycle with OCAP® compliance |

## Relation to Packages

- **ontology-core** (`src/ontology-core/`): Defines `MedicineWheelCycle` type
- **narrative-engine** (`src/narrative-engine/`): Cycle management, arc tracking
- **JSONL store** (`lib/jsonl-store.ts`, `mcp/src/jsonl-store.ts`): Shared persistence layer
- **data-store** (`src/data-store/`): Redis-backed alternative for production
