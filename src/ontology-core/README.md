# @medicine-wheel/ontology-core

Foundational ontology layer for the Medicine Wheel Developer Suite — unified types, RDF vocabulary, Zod schemas, constants, and semantic query helpers grounded in Indigenous relational ontology.

## Overview

This package is the **single source of truth** for the Medicine Wheel data model, consumed by both `mcp-medicine-wheel` (server) and `mcp-medicine-wheel-ui` (client).

### What it provides

| Module | Description |
|--------|-------------|
| `types` | TypeScript type definitions for all entities (nodes, relations, ceremonies, beats, cycles) |
| `kinship` | **Named kinship-edge vocabulary** — governed, directional edges (`tends-to`, `speaks-with`, `holds-responsibility-for`, `co-emerges-with` + RSIS verbs) |
| `vocabulary` | Medicine Wheel domain namespaces + label constants (`mw:`, `ids:`, `ocap:`, `rel:`, `cer:`, `beat:`) |
| `rdf-interop` | **Optional** RDF/OWL adapter — standard namespaces + IRI utilities for serializing OUT to the semantic web (not the backbone) |
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
  relationship_type: string;   // free-string, kept for back-compat
  kinship_type?: KinshipEdgeName; // governed named edge (kinship vocabulary)
  strength: number;            // 0–1
  direction?: DirectionName;
  ceremony_context?: { ... };  // Ceremony linkage
  obligations: RelationalObligation[];
  ocap: OcapFlags;             // OCAP® governance
  accountability: AccountabilityTracking; // Wilson's 3 R's
  context?: RelationContext;   // who authorized it, in which circle it holds
}
```

### Named Kinship Edges

The kinship vocabulary replaces the free-string edge with governed, directional
edges expressed as **data, not a class tree** — no edge type is a subclass of another.

```typescript
import { KINSHIP_EDGE_TYPES, inverseEdge, isKinshipEdgeName } from '@medicine-wheel/ontology-core';

inverseEdge('holds-responsibility-for'); // 'in-care-of'  (asymmetric)
inverseEdge('co-emerges-with');          // 'co-emerges-with' (symmetric)
isKinshipEdgeName('speaks-with');        // true
```

### Edge Context

A relation may carry the context that authorizes and bounds it — consumed by the
protocol-guard stack in `@medicine-wheel/relational-query`:

```typescript
relation.context = {
  authorized_by: 'elder-council',
  active_context: 'talking_circle:open',
  authorized_kin: ['agent-mia', 'agent-ava'],
};
```

### OCAP® Governance

Every relation carries `OcapFlags` (Ownership, Control, Access, Possession) — the First Nations principles of data sovereignty.

### Wilson Alignment

Shawn Wilson's three R's (Respect, Reciprocity, Responsibility) are tracked per relation and aggregated across cycles. Use `computeWilsonAlignment()` and `findAccountabilityGaps()` to monitor relational health.

### RDF Interop Adapter (optional)

The kinship graph is primary. RDF/OWL is an **optional** adapter (`rdfInterop`) for
serializing OUT to triple stores — not the ontology backbone. Domain labels stay in
`vocabulary`; standard namespaces + IRI utilities live in the adapter:

```typescript
MW.Direction  // domain label: https://ontology.medicine-wheel.dev/mw#Direction

import { rdfInterop } from '@medicine-wheel/ontology-core';
rdfInterop.expandIRI('mw:Direction'); // → full IRI
// Back-compat: prefixed/expandIRI/compactIRI/PREFIXES also remain at the package root.
```

## License

MIT — IAIP Collaborative, Shawinigan, QC

