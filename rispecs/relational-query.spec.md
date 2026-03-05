# relational-query — RISE Specification

> Query builder for relational webs with Indigenous protocol awareness — filtering, traversal, accountability auditing, OCAP® compliance, and KuzuDB Cypher query generation.

**Version:** 0.1.1  
**Package:** `medicine-wheel-relational-query`  
**Document ID:** rispec-relational-query-v1  
**Last Updated:** 2026-02-23  

---

## Desired Outcome

Users create **relationally accountable queries** over Medicine Wheel knowledge graphs that:
- Filter nodes and edges by type, direction, strength, ceremony status, and temporal range
- Traverse relational webs with ceremony boundary and OCAP® awareness
- Find shortest paths and neighborhoods in the relational graph
- Generate accountability reports with Wilson alignment and OCAP® compliance metrics
- Produce Cypher queries for KuzuDB graph database backends

---

## Creative Intent

**What this enables:** Querying relational data in ways that respect Indigenous data sovereignty. Traversals can stop at ceremony boundaries (unhonored edges). OCAP® compliance is checked during traversal. Accountability audits reveal where relational health needs attention.

**Structural Tension:** Between SQL/graph query patterns (traverse everything, maximize data access) and Indigenous governance (some relations require ceremony before access, some data has restricted possession). The relational-query package resolves this with ceremony-bounded traversal and OCAP® filtering.

---

## Query Builder

### Node Filtering

```typescript
filterNodes(nodes: RelationalNode[], filter: NodeFilter): RelationalNode[]

interface NodeFilter {
  type?: NodeType | NodeType[];
  direction?: DirectionName | DirectionName[];
  nameContains?: string;
  createdAfter?: string;
  createdBefore?: string;
}
```

### Edge Filtering

```typescript
filterEdges(edges: RelationalEdge[], filter: EdgeFilter): RelationalEdge[]

interface EdgeFilter {
  relationshipType?: string | string[];
  minStrength?: number;
  ceremonyHonored?: boolean;
  fromNode?: string;
  toNode?: string;
}
```

### Relation Filtering

```typescript
filterRelations(relations: Relation[], filter: RelationFilter): Relation[]

interface RelationFilter {
  direction?: DirectionName;
  ceremonied?: boolean;         // ceremony_context.ceremony_honored
  ocapCompliant?: boolean;      // ocap.compliant
  minWilsonAlignment?: number;  // accountability.wilson_alignment threshold
  hasObligations?: boolean;     // obligations array non-empty
}
```

### Sorting & Pagination

```typescript
sortNodes(nodes, sort: QuerySort): RelationalNode[]
// Fields: 'name' | 'type' | 'direction' | 'created_at' | 'updated_at'
// Order: 'asc' | 'desc'

paginate<T>(items: T[], { offset, limit }): QueryResult<T>
// Returns: { items, total, offset, limit, hasMore }
```

### Relation-Based Filtering

```typescript
filterByRelation(nodes, edges, targetNodeId): RelationalNode[]
// All nodes connected to a specific node

relationCounts(nodes, edges): Map<string, number>
// Count of relations per node

filterByMinRelations(nodes, edges, minRelations): RelationalNode[]
// Nodes with at least N connections
```

---

## Graph Traversal

### BFS Traversal with Protocol Awareness

```typescript
traverse(rootId, nodes, edges, relations, options?): TraversalResult

interface TraversalOptions {
  maxDepth?: number;              // default: 3
  direction?: 'outgoing' | 'incoming' | 'both';  // default: 'both'
  respectCeremonyBoundaries?: boolean;  // Stop at unhonored edges
  ocapOnly?: boolean;             // Only follow OCAP-compliant paths
  nodeFilter?: NodeFilter;
  edgeFilter?: EdgeFilter;
}

interface TraversalResult {
  root: RelationalNode;
  paths: TraversalPath[];
  visitedNodes: Set<string>;
  maxDepthReached: boolean;
}

interface TraversalPath {
  nodes: RelationalNode[];
  edges: RelationalEdge[];
  depth: number;
}
```

### Shortest Path

```typescript
shortestPath(fromId, toId, nodes, edges): TraversalPath | null
```

### Neighborhood

```typescript
neighborhood(nodeId, nodes, edges, maxDepth?): RelationalNode[]
// All nodes reachable within N hops
```

---

## Accountability Audit

```typescript
auditAccountability(nodes, edges, relations): AccountabilityReport

interface AccountabilityReport {
  totalRelations: number;
  ocapCompliant: number;
  ocapNonCompliant: number;
  averageWilsonAlignment: number;  // 0–1
  directionCoverage: Record<DirectionName, number>;
  ceremoniedRelations: number;
  unceremoniedRelations: number;
  obligationsOutstanding: number;
  recommendations: string[];
}
// Recommendations generated:
// - OCAP non-compliance counts
// - Low Wilson alignment warnings
// - Empty direction alerts
// - Unceremonied relation counts
// - Outstanding obligation counts
```

### Quick Checks

```typescript
isOcapCompliant(relation: Relation): boolean
relationsNeedingAttention(relations, wilsonThreshold?): Relation[]
// Low alignment OR non-compliant relations
```

---

## Cypher Query Builders

For KuzuDB graph database integration:

```typescript
queryStewards(symbolId): string
// MATCH (p:Person)-[:RSISRelation {type: 'STEWARDS'}]->(n {id: '...'})

queryCeremonyProvenance(symbolId): string
// Ceremony lineage for a code symbol

queryInquiries(symbolId): string
// Inquiries a symbol serves

queryKinshipHubs(): string
// All kinship hubs with metadata

queryKinshipRelations(): string
// Kinship-of relations between hubs

queryDirectionAlignment(symbolId): string
// Direction alignment for a symbol

queryReciprocityFlows(): string
// Person → target giving-back flows

queryInquiriesBySun(sun: SunName): string
// All inquiries under a thematic sun

queryCeremonies(): string
queryAllInquiries(): string
```

### Formatting Utilities

```typescript
formatReciprocityObservation(flows): string
// Invitational, never evaluative

formatDirectionObservation(distribution): string
// With emoji: 'Concentrated in north 🕸️ (45%). May benefit from east 🌸 ceremony.'
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1
- **Functions consumed:** `aggregateWilsonAlignment`, `checkOcapCompliance`

---

## Advancing Patterns

- **Ceremony-bounded traversal** — Graph walks respect ceremonial boundaries
- **OCAP® path filtering** — Only follow compliant paths when required
- **Accountability as audit** — Reports quantify relational health, not just connectivity
- **Dual-backend** — In-memory functions + Cypher generation for graph databases

---

## Quality Criteria

- ✅ Creative Orientation: Users create relationally accountable queries
- ✅ Structural Dynamics: Ceremony boundaries and OCAP® filters create meaningful traversal constraints
- ✅ Implementation Sufficient: All interfaces, options, and return types documented
- ✅ Codebase Agnostic: Cypher templates work with any KuzuDB instance
