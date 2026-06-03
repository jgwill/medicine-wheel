---
title: "Ontology Core API"
description: "API reference for medicine-wheel-ontology-core, the shared modeling layer for the workspace."
---

Source files: `src/ontology-core/src/index.ts`, `src/ontology-core/src/types.ts`, `src/ontology-core/src/schemas.ts`, `src/ontology-core/src/constants.ts`, `src/ontology-core/src/vocabulary.ts`, `src/ontology-core/src/queries.ts`.

## Import Path

```ts
import {
  RelationSchema,
  DIRECTIONS,
  MW,
  traverseRelationalWeb,
  checkOcapCompliance,
} from 'medicine-wheel-ontology-core';
```

## Core Types

Key exported interfaces and unions come from `medicine-wheel-ontology-core` and `medicine-wheel-ontology-core/types`.

```ts
export type DirectionName = 'east' | 'south' | 'west' | 'north';
export interface RelationalNode { id: string; name: string; type: NodeType; direction?: DirectionName; metadata: Record<string, unknown>; created_at: string; updated_at: string; }
export interface Relation { id: string; from_id: string; to_id: string; relationship_type: string; strength: number; direction?: DirectionName; obligations: RelationalObligation[]; ocap: OcapFlags; accountability: AccountabilityTracking; metadata: Record<string, unknown>; created_at: string; updated_at: string; }
export interface NarrativeBeat { id: string; direction: DirectionName; title: string; description: string; ceremonies: string[]; learnings: string[]; timestamp: string; act: number; relations_honored: string[]; }
```

## Constants And Vocabulary

Important exports:

- `DIRECTIONS`
- `DIRECTION_COLORS`
- `NODE_TYPE_COLORS`
- `CEREMONY_PHASES`
- `MW`, `CER`, `OCAP`, `REL`, `IDS`, `BEAT`
- `prefixed(namespace, localName): string`
- `expandIRI(prefixedIRI): string`
- `compactIRI(fullIRI): string`

Example:

```ts
import { DIRECTIONS, MW, prefixed, expandIRI } from 'medicine-wheel-ontology-core';

console.log(DIRECTIONS.map((d) => d.name));
console.log(MW.Relation);
console.log(prefixed('mw', 'Direction'));
console.log(expandIRI('mw:Relation'));
```

## Query Helpers

Signatures from `src/ontology-core/src/queries.ts`:

```ts
nodesByDirection(nodes: RelationalNode[], direction: DirectionName): RelationalNode[]
nodesByType(nodes: RelationalNode[], type: NodeType): RelationalNode[]
nodeById(nodes: RelationalNode[], id: string): RelationalNode | undefined
relationsForNode(relations: Relation[], nodeId: string): Relation[]
neighborIds(relations: Relation[] | RelationalEdge[], nodeId: string): string[]
traverseRelationalWeb(nodes: RelationalNode[], relations: Relation[] | RelationalEdge[], startNodeId: string, maxDepth?: number): { visited: Set<string>; paths: string[][] }
computeWilsonAlignment(accountability: AccountabilityTracking): number
aggregateWilsonAlignment(relations: Relation[]): number
checkOcapCompliance(ocap: OcapFlags): { compliant: boolean; issues: string[] }
auditOcapCompliance(relations: Relation[]): { overall_compliant: boolean; compliant_count: number; non_compliant_count: number; issues: { relation_id: string; issues: string[] }[] }
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `nodes` | `RelationalNode[]` | required | In-memory node collection for filtering or traversal. |
| `relations` | `Relation[]` or `RelationalEdge[]` | required | Graph connections to inspect. |
| `startNodeId` | `string` | required | Root node for breadth-first traversal. |
| `maxDepth` | `number` | `3` | Maximum hop count for `traverseRelationalWeb`. |

Example:

```ts
import { traverseRelationalWeb, aggregateWilsonAlignment } from 'medicine-wheel-ontology-core';

const traversal = traverseRelationalWeb(nodes, relations, 'root', 2);
const alignment = aggregateWilsonAlignment(relations);
```

## Schemas

Every major type has a Zod schema export, including:

- `RelationalNodeSchema`
- `RelationSchema`
- `OcapFlagsSchema`
- `CeremonyLogSchema`
- `NarrativeBeatSchema`
- `MedicineWheelCycleSchema`

Example:

```ts
import { RelationSchema } from 'medicine-wheel-ontology-core';

const safeRelation = RelationSchema.parse(input);
```

This package is the dependency you install first. Most other API pages in this documentation assume these types are already in your application.
