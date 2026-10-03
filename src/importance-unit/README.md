# @medicine-wheel/importance-unit

The ImportanceUnit is this suite's relational unit of knowledge, after Wilson's relational epistemology (2008) — a relationally-accountable piece of meaning that carries epistemic weight, source dimensions, accountability links, and circle depth tracking.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Overview

This package weights knowledge by source: dream-state and embodied knowledge carry more weight than rational analysis. That ranking is the package's design, not Wilson's. Wilson holds empirical knowledge crucial but not the only way of knowing (2008, p. 58), and needs both empirical and other forms (p. 111); he ranks none above the others.

### What it provides

| Module | Description |
|--------|-------------|
| `types` | TypeScript types for ImportanceUnit, AccountabilityLink, CircleRefinement, and related structures |
| `schemas` | Zod validation schemas for runtime data integrity |
| `unit` | Core CRUD: `createUnit()`, `updateUnit()`, `circleBack()`, `archive()` |
| `epistemic-weight` | Weight computation: `computeWeight()`, `adjustForSource()`, `adjustForDepth()` |
| `accountability` | Link management: `linkAccountability()`, `resolveLinks()`, `findGaps()` |
| `circle-tracking` | Spiral tracking: `incrementCircle()`, `recordRefinement()`, `detectDeepening()`, `detectStagnation()` |

## Installation

```bash
npm install @medicine-wheel/importance-unit
```

Or link locally:
```bash
npm link ../medicine-wheel/src/importance-unit
```

## Usage

```typescript
import {
  // Types
  type ImportanceUnit, type EpistemicSource, type AccountabilityLink,

  // CRUD
  createUnit, circleBack, archive,

  // Weight
  computeWeight, BASE_WEIGHTS,

  // Accountability
  linkAccountability, findGaps,

  // Circle tracking
  incrementCircle, detectDeepening, detectStagnation,

  // Schemas
  ImportanceUnitSchema,
} from '@medicine-wheel/importance-unit';

// Create a new unit from dream-state knowing
const unit = createUnit({
  direction: 'east',
  source: 'dream',
  summary: 'The river teaches patience through its refusal to hurry',
  createdBy: 'firekeeper-agent',
  axiologicalPillar: 'epistemology',
});

// unit.epistemicWeight === 0.85 (dream-state base)
// unit.circleDepth === 1

// Circle back with a refinement
const deepened = circleBack(unit, 'Patience is not waiting — it is attending');
// deepened.circleDepth === 2
// deepened.epistemicWeight > 0.85 (depth bonus applied)
```

## Epistemic Weight Model

| Source | Base Weight | Rationale |
|--------|-------------|-----------|
| `dream` | 0.85 | Liminal/spirit-state knowing has highest authority |
| `land` | 0.75 | Place-grounded/embodied knowing |
| `vision` | 0.65 | Intentional/architectural knowing |
| `code` | 0.50 | Technical/implementation knowing |

Weight increases with `circleDepth` using diminishing returns (logarithmic scaling). The first return yields more insight than the tenth, though all returns matter. Weight never exceeds 1.0.

## Key Concepts

### Circle Depth

Repetition is ceremony and deepening, not redundancy. Each time a topic is revisited (`circleBack()`), the circle depth increments and a refinement is recorded capturing "the subtle difference between the 3rd and 4th circling."

### Accountability Links

Every ImportanceUnit must be accountable to something. Links carry responsibility, not just reference. The `findGaps()` function identifies relationally isolated units.

### Ceremony State

Tracks progression through the four directions. When all four quadrants have been visited, the circle is complete and the unit becomes eligible for archival.

## Dependencies

- `@medicine-wheel/ontology-core` — Foundational types (`DirectionName`, etc.)
- `zod` — Runtime validation

## License

MIT — IAIP Collaborative, Shawinigan, QC

