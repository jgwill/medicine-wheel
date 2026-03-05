# KINSHIP — medicine-wheel-data-store

## 1. Identity and Purpose
- **Name**: medicine-wheel-data-store
- **Package**: `medicine-wheel-data-store`
- **Location**: `/workspace/repos/jgwill/medicine-wheel/src/data-store/`
- **Role**: Shared Redis data-access layer for the Medicine Wheel Developer Suite
- **What this place tends**: The relational memory — Nodes, Edges, Ceremonies, Accountability tracking, and Session↔Ceremony linking — stored in Redis
- **What this place offers**: A single, reusable package so that all consumers (MCP server, UI, session observer) share one data layer instead of duplicating Redis access code

## 2. Lineage and Relations
- **Ancestors**:
  - `medicine-wheel-ontology-core` — provides types (DirectionName, NodeType, CeremonyType, etc.)
  - `/src/mcp-medicine-wheel/src/integrations/redis/relational-memory.ts` — the original 573-line RelationalMemoryStore from which this was extracted
  - `/src/ceremony-session-observer/lib/redis.ts` — session-ceremony linking logic extracted from here
  - `/src/mcp-medicine-wheel-ui/lib/redis.ts` — generic Redis helpers extracted from here
- **Siblings**: `ontology-core`, `ceremony-protocol`, `narrative-engine`, `relational-query`, `graph-viz`, `ui-components`, `prompt-decomposition`, `session-reader`
- **Future consumers** (who should adopt this package):
  - `/src/mcp-medicine-wheel/` — replace `src/integrations/redis/relational-memory.ts` with imports from this package
  - `/src/mcp-medicine-wheel-ui/` — replace `lib/redis.ts` with imports from this package
  - `/src/ceremony-session-observer/` — replace `lib/redis.ts` ceremony/linking code with imports from this package

## 3. Exports
- `connection` — Redis connection management (Upstash, Vercel KV, local), singleton pattern
- `store` — Node/Edge/Ceremony/Accountability CRUD, search, relational web traversal
- `session-link` — Bidirectional session↔ceremony linking
- `helpers` — Generic Redis hash/set/sorted-set helpers

## 4. Responsibilities and Boundaries
- **Responsibilities**: Provide the canonical data-access API for all Medicine Wheel Redis operations
- **Boundaries**: Does NOT contain domain logic (ceremony phases, accountability scoring) — that belongs in `ceremony-protocol` and validators. Does NOT read JSONL session files — that belongs in `session-reader`.

## 5. Accountability and Change Log
- **Steward**: Guillaume
- **Review trigger**: When Redis key patterns change or new entity types are added
- [2026-03-01] [Copilot CLI agent] — Initial creation. Extracted from mcp-medicine-wheel, mcp-medicine-wheel-ui, and ceremony-session-observer.
