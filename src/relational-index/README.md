# @medicine-wheel/relational-index

Four-source epistemic dimensional indexing for the **Medicine Wheel Developer Suite**.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

Wilson's epistemology recognises multiple sources of knowing — Land, Dream, Code, and Vision each teach differently. This package enables querying, traversal, and cross-dimensional mapping across those epistemic sources.

## Installation

```bash
npm install @medicine-wheel/relational-index
```

## Quick Start

```typescript
import {
  createIndex,
  addEntry,
  queryBySource,
  dimensionBalance,
  measureSpiralDepth,
  indexHealth,
} from '@medicine-wheel/relational-index';

// Create an empty index
const index = createIndex();

// Add entries from different epistemic sources
const withLand = addEntry(index, {
  unitId: 'territory-walk-01',
  source: 'land',
  direction: 'east',
  epistemicWeight: 0.8,
  circleDepth: 1,
  accountableTo: ['community-elders'],
  tags: ['territory', 'morning'],
  timestamp: new Date().toISOString(),
});

// Query by source
const landEntries = queryBySource(withLand, 'land');

// Check dimensional balance
const balance = dimensionBalance(withLand);

// Measure spiral depth
const depth = measureSpiralDepth(withLand);

// Get overall health
const health = indexHealth(withLand);
```

## Modules

| Module | Purpose |
|--------|---------|
| `index-manager` | Create, add, remove, rebuild index |
| `query` | Query by source, direction, weight, depth, cross-dimensional |
| `dimensions` | Land, Dream, Code, Vision views and balance |
| `cross-dimensional` | Convergences, tensions, coverage gaps |
| `spiral-depth` | Deepening detection, stagnation alerts |
| `metrics` | Index health, balance scores, recommendations |

## Wilson Alignment

This package implements the epistemic sophistication Wilson's framework demands:

- **Land**: Embodied, place-based knowledge — walking the territory
- **Dream**: Intuitive, liminal knowledge — vision and dreaming
- **Code**: Implementation knowledge — algorithms and structure
- **Vision**: Aspirational knowledge — intention and future

## License

MIT

