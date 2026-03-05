# @medicine-wheel/ontology-core

Foundational ontology layer for the Medicine Wheel Developer Suite — unified types, RDF vocabulary, Zod schemas, constants, and semantic query helpers grounded in Indigenous relational ontology.

## Overview

This package is the **single source of truth** for the Medicine Wheel data model, consumed by both `mcp-medicine-wheel` (server) and `mcp-medicine-wheel-ui` (client).

### What it provides

| Module | Description |
|--------|-------------|
| `types` | TypeScript type definitions for all entities (nodes, relations, ceremonies, beats, cycles) |
| `vocabulary` | RDF namespace IRIs and predicate constants (`mw:`, `ids:`, `ocap:`, `rel:`, `cer:`, `beat:`) |
| `schemas` | Zod validation schemas for runtime data integrity |
| `constants` | Direction definitions, color maps, icons, Ojibwe names, act mappings |
| `queries` | Semantic query helpers — traversal, Wilson alignment, OCAP® compliance |

## Installation

```bash
npm install @medicine-wheel/ontology-core
```

Or link locally:
```bash
npm link ../medicine-wheel/src/ontology-core
```

## Usage

```typescript
import {
  // Types
  type RelationalNode, type Relation, type DirectionName,

  // Constants
  DIRECTIONS, DIRECTION_COLORS, NODE_TYPE_COLORS,

  // RDF Vocabulary
  MW, CER, OCAP, REL,

  // Zod Schemas
  RelationalNodeSchema, RelationSchema,

  // Query Helpers
  computeWilsonAlignment, checkOcapCompliance, traverseRelationalWeb,
} from '@medicine-wheel/ontology-core';
```

## Key Concepts

### Relational-First Schema

In Indigenous relational ontology, relationships are not just labeled edges — they are beings with their own lifecycles, obligations, protocols, and accountability. The `Relation` type reflects this:

```typescript
interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;   // kinship, treaty, ceremony, mentorship...
  strength: number;            // 0–1
  direction?: DirectionName;
  ceremony_context?: { ... };  // Ceremony linkage
  obligations: RelationalObligation[];
  ocap: OcapFlags;             // OCAP® governance
  accountability: AccountabilityTracking; // Wilson's 3 R's
}
```

### OCAP® Governance

Every relation carries `OcapFlags` (Ownership, Control, Access, Possession) — the First Nations principles of data sovereignty.

### Wilson Alignment

Shawn Wilson's three R's (Respect, Reciprocity, Responsibility) are tracked per relation and aggregated across cycles. Use `computeWilsonAlignment()` and `findAccountabilityGaps()` to monitor relational health.

### RDF Vocabulary

All concepts have IRI constants for semantic web interoperability:

```typescript
MW.Direction  // https://ontology.medicine-wheel.dev/mw#Direction
CER.Ceremony  // https://ontology.medicine-wheel.dev/cer#Ceremony
OCAP.ownership // https://ontology.medicine-wheel.dev/ocap#ownership
```

## License

MIT — IAIP Collaborative, Shawinigan, QC
