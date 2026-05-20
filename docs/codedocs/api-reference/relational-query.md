---
title: "Relational Query API"
description: "API reference for medicine-wheel-relational-query."
---

Source files: `src/relational-query/src/query.ts`, `src/relational-query/src/traversal.ts`, `src/relational-query/src/audit.ts`, `src/relational-query/src/cypher.ts`.

## Import Path

```ts
import { traverse, auditAccountability, queryStewards } from 'medicine-wheel-relational-query';
```

## Query Builder

```ts
filterNodes(nodes: RelationalNode[], filter: NodeFilter): RelationalNode[]
filterEdges(edges: RelationalEdge[], filter: EdgeFilter): RelationalEdge[]
sortNodes(nodes: RelationalNode[], sort: QuerySort): RelationalNode[]
paginate<T>(items: T[], pagination: QueryPagination): QueryResult<T>
filterByRelation(nodes: RelationalNode[], edges: RelationalEdge[], targetNodeId: string): RelationalNode[]
relationCounts(nodes: RelationalNode[], edges: RelationalEdge[]): Map<string, number>
filterByMinRelations(nodes: RelationalNode[], edges: RelationalEdge[], minRelations: number): RelationalNode[]
filterRelations(relations: Relation[], filter: RelationFilter): Relation[]
```

## Traversal

```ts
traverse(rootId: string, nodes: RelationalNode[], edges: RelationalEdge[], relations: Relation[], opts?: Partial<TraversalOptions>): TraversalResult
shortestPath(fromId: string, toId: string, nodes: RelationalNode[], edges: RelationalEdge[]): TraversalPath | null
neighborhood(nodeId: string, nodes: RelationalNode[], edges: RelationalEdge[], maxDepth?: number): RelationalNode[]
```

Traversal options:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxDepth` | `number` | `3` | Maximum BFS depth. |
| `direction` | `TraversalDirection` | `'both'` | Edge direction to follow. |
| `respectCeremonyBoundaries` | `boolean` | `false` | Skip edges where `ceremony_honored` is false. |
| `ocapOnly` | `boolean` | `false` | Follow only OCAP-compliant mapped relations. |

## Audit And Cypher Builders

```ts
auditAccountability(nodes: RelationalNode[], edges: RelationalEdge[], relations: Relation[]): AccountabilityReport
isOcapCompliant(relation: Relation): boolean
relationsNeedingAttention(relations: Relation[], wilsonThreshold?: number): Relation[]
queryStewards(symbolId: string): string
queryCeremonyProvenance(symbolId: string): string
queryDirectionAlignment(symbolId: string): string
queryReciprocityFlows(): string
formatReciprocityObservation(flows: Array<{ from: string; to: string; type: string }>): string
```

Example:

```ts
const report = auditAccountability(nodes, edges, relations);
const traversal = traverse('root', nodes, edges, relations, {
  maxDepth: 2,
  respectCeremonyBoundaries: true,
  ocapOnly: true,
});

console.log(report.recommendations);
console.log(traversal.paths.length);
```

Use this package when ontology-core's simple array helpers are no longer enough and you need protocol-aware traversal or audit summaries.

The traversal implementation in `src/relational-query/src/traversal.ts` uses breadth-first search over an adjacency map built from `RelationalEdge[]`. That means `respectCeremonyBoundaries` acts on edge flags, while `ocapOnly` consults the richer `Relation[]` collection. In practice you often pass both: a lean edge list for the walk itself and a richer relation list for compliance decisions. The Cypher helpers are separate on purpose, since they generate database queries for RSIS/GitNexus-style graphs rather than touching in-memory traversal directly.
