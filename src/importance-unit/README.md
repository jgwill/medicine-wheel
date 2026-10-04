# @medicine-wheel/importance-unit

The ImportanceUnit is this suite's relational unit of knowledge, after Wilson's relational epistemology (2008) — a relationally-accountable piece of meaning that carries epistemic weight, source dimensions, accountability links, and circle depth tracking.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Overview

By default this package ranks no source of knowing above another: every unit starts at the same weight, and weight grows by circling back (#155). Wilson holds empirical knowledge crucial but not the only way of knowing (2008, p. 58), needs both empirical and other forms (p. 111), and declines to judge any paradigm better or worse than another (p. 35). The package's earlier order, dream above land above vision above code, is its own design and is kept as the named profile `dream-first`, so units stored before #155 keep their weights.

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
  computeWeight, WEIGHT_PROFILES, DEFAULT_WEIGHT_PROFILE,

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

// unit.epistemicWeight === 0.7 (profile `equal`: every source starts here)
// unit.weightProfile === 'equal'
// unit.circleDepth === 1

// Circle back with a refinement
const deepened = circleBack(unit, 'Patience is not waiting — it is attending');
// deepened.circleDepth === 2
// deepened.epistemicWeight > 0.7 (depth bonus applied)
```

## Epistemic Weight Model

Base weights come from a named profile (`WEIGHT_PROFILES`). Each profile says whose it is.

| Profile | dream | land | vision | code | Whose |
|---|---|---|---|---|---|
| `equal` (default) | 0.70 | 0.70 | 0.70 | 0.70 | Default since #155: no source ranked above another |
| `dream-first` | 0.85 | 0.75 | 0.65 | 0.50 | This package's earlier design; ours, not Wilson's |

A unit records its profile in `weightProfile`. A unit stored before #155 has none: it was weighted with `dream-first` and keeps that profile when circled back to, so no stored weight changes meaning. Through MCP, the profile is written to the node's metadata beside `epistemicWeight`.

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

