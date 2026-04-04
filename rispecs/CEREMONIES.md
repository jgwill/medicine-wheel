# CEREMONIES.md

> Ceremonies are relational research events witnessed and logged by the Medicine Wheel system. They honor the four directions, medicines, participants, intentions, and research context.

## Persistence & Cross-Interface Visibility

Ceremonies created in **any interface** — the Web UI, MCP tools, or terminal agents — are persisted to `.mw/store/ceremonies.jsonl` and immediately visible across all interfaces.

- **Web UI**: `POST /api/ceremonies` → writes to `.mw/store/ceremonies.jsonl`
- **MCP**: `log_ceremony_with_memory` tool → writes to same `.mw/store/ceremonies.jsonl`
- **MCP Discovery**: `list_ceremonies` tool reads from the shared JSONL file
- **Data survives restarts** — JSONL files persist on disk

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MW_DATA_DIR` | `.mw/store/` | Override the JSONL data directory |

## Ceremony Schema

```typescript
interface CeremonyLog {
  id: string;                    // e.g. "ceremony:1775338506041:h8pwj"
  type: CeremonyType;           // smudging, talking_circle, spirit_feeding, opening, closing
  direction: DirectionName;     // east, south, west, north
  participants: string[];       // Who was present
  medicines_used: string[];     // tobacco, cedar, sage, strawberry
  intentions: string[];         // What the ceremony aimed to honor
  timestamp: string;            // ISO 8601
  research_context?: string;    // Research context
}
```

## Sample Ceremonies

### 260404-mia-code-PDE-talking-ceremony-polyphonic-dialogue

- **Present**: Guillaume, Mia, Ava, Tushell, Linka
- **Medicine**: File Polyphonic dialogue
- **Intention**: Discuss the kinship of prompt-decomposition-engine lineage evolution and their transformation into inquiries
- **ResearchContext**: automated prompt engineering (APE), computational linguistics, and the philosophy of artificial intelligence
- **Type**: talking_circle
- **Direction**: east

## MCP Tools for Ceremonies

| Tool | Purpose |
|------|---------|
| `log_ceremony_with_memory` | Create a new ceremony (persisted to JSONL) |
| `list_ceremonies` | List all ceremonies, filter by direction or type |

## Relation to Packages

- **ontology-core** (`src/ontology-core/`): Defines `CeremonyLog`, `CeremonyType` types
- **ceremony-protocol** (`src/ceremony-protocol/`): Ceremony protocol logic
- **JSONL store** (`lib/jsonl-store.ts`, `mcp/src/jsonl-store.ts`): Shared persistence layer
- **data-store** (`src/data-store/`): Redis-backed alternative for production
