---
title: "Getting Started"
description: "Start using the Medicine Wheel TypeScript packages from the ontology layer up through decomposition, orchestration, query, storage, and visualization."
---

Medicine Wheel is a TypeScript monorepo of interoperable packages for modeling relational data, ceremonial workflows, prompt decomposition, graph traversal, storage, and visualization in an Indigenous-aligned software workflow.

## The Problem

- Most graph or workflow toolkits model entities first and treat relationships as thin metadata, which makes accountability, ceremony context, and OCAP-style governance hard to represent.
- Prompt orchestration systems usually jump straight from intent to execution, with no native concept of directional balance, review, or relational gating.
- Narrative, storage, and visualization layers are often disconnected, so the same inquiry has to be reshaped for every subsystem.
- Governance-sensitive work needs explicit handling for consent, review, stewardship, and human escalation, not just generic CRUD and queues.

## The Solution

Medicine Wheel splits those concerns into focused packages built on a shared ontology. `medicine-wheel-ontology-core` defines the canonical types, schemas, constants, and query helpers; packages like `medicine-wheel-prompt-decomposition`, `medicine-wheel-fire-keeper`, `medicine-wheel-relational-query`, and `medicine-wheel-graph-viz` build on that shared model rather than re-inventing it.

```ts
import { MedicineWheelDecomposer } from 'medicine-wheel-prompt-decomposition';
import { FireKeeper, DEFAULT_GATES } from 'medicine-wheel-fire-keeper';

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3,
});

const keeper = new FireKeeper({
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: [],
});

const result = decomposer.decompose(
  'Research the ontology types, then implement the query builder, and validate the result.'
);

keeper.beginCeremony('inquiry:docs');
const evaluation = keeper.evaluateImportance(
  { id: 'unit-1', title: result.primary.target, direction: result.leadDirection },
  'inquiry:docs'
);
```

## Installation

The root repository is a private workspace app, so you install the published packages you need. A practical starting set is the ontology, decomposition, query, and narrative packages.

" "bun"]}>
<Tab value="npm">

```bash
npm install medicine-wheel-ontology-core medicine-wheel-prompt-decomposition medicine-wheel-relational-query medicine-wheel-narrative-engine
```

</Tab>
<Tab value="pnpm">

```bash
pnpm add medicine-wheel-ontology-core medicine-wheel-prompt-decomposition medicine-wheel-relational-query medicine-wheel-narrative-engine
```

</Tab>
<Tab value="yarn">

```bash
yarn add medicine-wheel-ontology-core medicine-wheel-prompt-decomposition medicine-wheel-relational-query medicine-wheel-narrative-engine
```

</Tab>
<Tab value="bun">

```bash
bun add medicine-wheel-ontology-core medicine-wheel-prompt-decomposition medicine-wheel-relational-query medicine-wheel-narrative-engine
```

</Tab>
</Tabs>

## Quick Start

This example stays entirely in memory. It decomposes an inquiry, turns the resulting action stack into narrative beats, and checks what direction comes next.

```ts
import { MedicineWheelDecomposer } from 'medicine-wheel-prompt-decomposition';
import { nextDirection, detectEpistemicDeepening } from 'medicine-wheel-narrative-engine';

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3,
});

const decomposition = decomposer.decompose(
  'Research the current architecture, design the public API docs, verify the examples, and publish the result.'
);

console.log(decomposition.primary.action);
console.log(decomposition.leadDirection);
console.log(nextDirection(decomposition.narrativeBeats));
console.log(detectEpistemicDeepening(decomposition.narrativeBeats));
```

Expected output:

```txt
investigate
south
null
{
  circleCount: 1,
  deepeningIndicators: [...],
  stagnationRisk: false
}
```

## Key Features

- Shared ontology package with canonical TypeScript types, Zod schemas, constants, RDF vocabulary, and in-memory semantic query helpers.
- Ceremony-aware orchestration through `medicine-wheel-ceremony-protocol` and `medicine-wheel-fire-keeper`.
- Heuristic prompt decomposition that maps work across East, South, West, and North before execution.
- Multiple persistence paths: Redis helpers, JSONL provider, and a Postgres/Neon provider scaffold.
- Narrative, traversal, audit, and visualization utilities that all reuse the same core data model.
- Review, consent, and transformation packages for governance-heavy workflows.

<Cards>
  <Card title="Architecture" href="/docs/architecture">See how the packages depend on ontology-core and flow from modeling to execution.</Card>
  <Card title="Core Concepts" href="/docs/ontology-model">Learn the ideas that make the packages work together.</Card>
  <Card title="API Reference" href="/docs/api-reference/ontology-core">Jump to exact import paths, signatures, and source-file references.</Card>
</Cards>
