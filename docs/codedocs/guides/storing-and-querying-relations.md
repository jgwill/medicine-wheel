---
title: "Storing And Querying Relations"
description: "Persist nodes and edges, then traverse and audit them using the storage and query packages."
---

This guide shows a realistic storage flow. It uses the abstract storage provider for portability, then uses the query layer for traversal and audit.

<Steps>
<Step>
### Pick a storage backend

`medicine-wheel-storage-provider` defaults to JSONL unless `MW_STORAGE_PROVIDER` selects another backend.

" "Neon"]}>
<Tab value="JSONL">

```bash
export MW_STORAGE_PROVIDER=jsonl
export MW_DATA_DIR=.mw/store
```

</Tab>
<Tab value="Neon">

```bash
export MW_STORAGE_PROVIDER=neon
export DATABASE_URL=postgres://...
```

</Tab>
</Tabs>

</Step>
<Step>
### Create nodes, edges, and a ceremony

```ts
import { createProvider } from 'medicine-wheel-storage-provider';

const store = await createProvider();

await store.createNode({
  id: 'node-elder',
  type: 'human',
  name: 'Elder Review',
  description: 'North-aligned review role',
  direction: 'north',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

await store.createNode({
  id: 'node-inquiry',
  type: 'knowledge',
  name: 'API Documentation Inquiry',
  description: 'Public API docs for the suite',
  direction: 'east',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

await store.createEdge({
  from_id: 'node-inquiry',
  to_id: 'node-elder',
  relationship_type: 'requires-review',
  strength: 0.8,
  ceremony_honored: false,
  obligations: ['Return reviewed draft to community'],
  created_at: new Date().toISOString(),
});

await store.logCeremony({
  id: 'ceremony-1',
  type: 'opening',
  direction: 'east',
  participants: ['docs-agent'],
  medicines_used: [],
  intentions: ['Document the public surface clearly'],
  timestamp: new Date().toISOString(),
});
```

</Step>
<Step>
### Load the data into query helpers

```ts
import { traverse, auditAccountability } from 'medicine-wheel-relational-query';

const nodes = await store.getAllNodes();
const edge = await store.getEdge('node-inquiry', 'node-elder');
const edges = edge ? [edge] : [];

const relations = [
  {
    id: 'rel-1',
    from_id: 'node-inquiry',
    to_id: 'node-elder',
    relationship_type: 'requires-review',
    strength: 0.8,
    direction: 'north',
    ceremony_context: { ceremony_honored: false },
    obligations: [{ category: 'human', obligations: ['Return reviewed draft to community'] }],
    ocap: {
      ownership: 'community',
      control: 'review-circle',
      access: 'community',
      possession: 'community-server',
      compliant: true,
    },
    accountability: {
      respect: 0.8,
      reciprocity: 0.7,
      responsibility: 0.9,
      wilson_alignment: 0.8,
      relations_honored: [],
    },
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

console.log(traverse('node-inquiry', nodes, edges, relations, { maxDepth: 2 }));
console.log(auditAccountability(nodes, edges, relations));
```

</Step>
</Steps>

Complete runnable example:

```ts
import { createProvider } from 'medicine-wheel-storage-provider';
import { traverse, auditAccountability } from 'medicine-wheel-relational-query';

const store = await createProvider();

await store.createNode({
  id: 'node-a',
  type: 'knowledge',
  name: 'Architecture Page',
  description: 'Architecture docs',
  direction: 'east',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

await store.createNode({
  id: 'node-b',
  type: 'human',
  name: 'Reviewer',
  description: 'North review role',
  direction: 'north',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

await store.createEdge({
  from_id: 'node-a',
  to_id: 'node-b',
  relationship_type: 'reviewed-by',
  strength: 0.9,
  ceremony_honored: true,
  last_ceremony: 'ceremony-1',
  obligations: ['Return findings'],
  created_at: new Date().toISOString(),
});

const nodes = await store.getAllNodes();
const edge = await store.getEdge('node-a', 'node-b');
const edges = edge ? [edge] : [];

const relations = [];

console.log(traverse('node-a', nodes, edges, relations, { maxDepth: 1 }));
console.log(auditAccountability(nodes, edges, relations));

await store.disconnect();
```

Use the provider abstraction when your app should be backend-agnostic. Use `medicine-wheel-data-store` directly when you explicitly want Redis semantics such as sorted-set timelines and session linking.
