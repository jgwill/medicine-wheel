# medicine-wheel-relational-query

Query builder, graph traversal, and accountability audit for the Medicine Wheel relational web. Protocol-aware: respects ceremony boundaries and OCAP® compliance during traversal.

## Install

```bash
npm install medicine-wheel-relational-query
```

## Modules

### Query Builder
Filter, sort, and paginate nodes and edges.

```ts
import { filterNodes, sortNodes, paginate } from 'medicine-wheel-relational-query';

const elders = filterNodes(nodes, { type: 'human', direction: 'north' });
const sorted = sortNodes(elders, { field: 'name', order: 'asc' });
const page = paginate(sorted, { offset: 0, limit: 10 });
```

### Traversal
Context-aware graph traversal with ceremony and OCAP boundaries.

```ts
import { traverse, shortestPath, neighborhood } from 'medicine-wheel-relational-query';

const result = traverse('node-id', nodes, edges, relations, {
  maxDepth: 3,
  respectCeremonyBoundaries: true,
  ocapOnly: true,
});

const path = shortestPath('from-id', 'to-id', nodes, edges);
const neighbors = neighborhood('node-id', nodes, edges, 2);
```

### Accountability Audit
Relational health metrics and OCAP® compliance reports.

```ts
import { auditAccountability, relationsNeedingAttention } from 'medicine-wheel-relational-query';

const report = auditAccountability(nodes, edges, relations);
console.log(report.averageWilsonAlignment);
console.log(report.recommendations);

const needsWork = relationsNeedingAttention(relations, 0.5);
```

## Peer dependency

Requires `medicine-wheel-ontology-core` ^0.1.0.

## License

MIT
