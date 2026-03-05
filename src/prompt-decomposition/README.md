# medicine-wheel-prompt-decomposition

Ontology-enriched prompt decomposition engine for the Medicine Wheel Developer Suite.

## Overview

Extracts structured intents from natural language prompts and classifies them across the Four Directions (East/vision, South/analysis, West/validation, North/action). Detects implicit intents from hedging language, maps dependencies between tasks, and generates ceremony guidance when directional balance is poor.

**Lineage:** `mcp-pde` → `ava-langchain-prompt-decomposition` → `medicine-wheel-prompt-decomposition`

## Installation

```bash
npm install medicine-wheel-prompt-decomposition
```

## Usage

### Basic Decomposition

```typescript
import { MedicineWheelDecomposer } from 'medicine-wheel-prompt-decomposition';

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3,
});

const result = decomposer.decompose(
  'Research the ontology types, then implement the query builder, and validate with tests'
);

console.log(result.primary);           // { action: 'investigate', target: '...', urgency: 'session', confidence: 0.85 }
console.log(result.balance);           // 0.75 (directional balance score)
console.log(result.neglectedDirections); // ['east'] (vision direction neglected)
console.log(result.ceremonyRequired);  // true/false
console.log(result.actionStack);       // Ordered tasks: east→south→west→north
```

### Relational Enrichment

```typescript
import { RelationalEnricher } from 'medicine-wheel-prompt-decomposition';

const enricher = new RelationalEnricher();
const enriched = enricher.enrich(decomposition, {
  nodes: myNodes,
  edges: myEdges,
  relations: myRelations,
});

console.log(enriched.relationalHealth);     // 0-1 composite score
console.log(enriched.accountabilityGaps);   // Where attention is needed
```

### Storage

```typescript
import { saveDecomposition, loadDecomposition, listDecompositions } from 'medicine-wheel-prompt-decomposition';

const stored = saveDecomposition('.', result);
// Creates .pde/{id}.json and .pde/{id}.md

const loaded = loadDecomposition('.', result.id);
const all = listDecompositions('.');
```

## API

### `MedicineWheelDecomposer`

- `decompose(prompt: string): OntologicalDecomposition` — Full Four Directions decomposition

### `RelationalEnricher`

- `enrich(decomposition, graph): EnrichmentResult` — Enrich with graph context

### Storage Functions

- `saveDecomposition(workdir, result): StoredDecomposition`
- `loadDecomposition(workdir, id): StoredDecomposition | null`
- `listDecompositions(workdir): StoredDecomposition[]`
- `decompositionToMarkdown(result): string`

## Dependencies

- `medicine-wheel-ontology-core` ^0.1.0

## License

MIT
