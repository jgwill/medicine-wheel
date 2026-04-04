# relational-index — RISE Specification

> Four-source dimensional indexing — implements relational indexing across Wilson's four epistemic source dimensions (Land, Dream, Code, Vision) for querying, retrieval, and cross-dimensional mapping of ImportanceUnits and knowledge artifacts.

**Version:** 0.1.0  
**Package:** `medicine-wheel-relational-index`  
**Document ID:** rispec-relational-index-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **multi-dimensional knowledge indexes** where:
- Knowledge is indexed across four epistemic source dimensions (Land, Dream, Code, Vision)
- Cross-dimensional queries reveal convergences and tensions between ways of knowing
- Spiral depth tracking detects genuine deepening vs. stagnation
- Index health metrics show dimensional balance and coverage gaps
- Relational paths connect knowledge units across dimensions

---

## Creative Intent

**What this enables:** Wilson's epistemology recognizes multiple sources of knowing. Land teaches differently than dreams; code embodies differently than vision. A relational index that traverses across these dimensions enables the holistic knowing Wilson describes — where understanding comes from the *relationship* between dimensions, not from any single source.

**Structural Tension:** Between mono-dimensional indexing (flat keyword search, single taxonomy) and multi-dimensional relational indexing (knowledge exists in relational space across epistemological dimensions). The relational-index resolves this by creating per-dimension indexes with cross-dimensional mapping that reveals convergences and tensions.

---

## Type Definitions

### Core Types

```typescript
type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';
```

### RelationalIndex

```typescript
interface RelationalIndex {
  entries: Map<string, IndexEntry>;
  dimensions: Record<EpistemicSource, DimensionIndex>;
  crossMap: CrossDimensionalMap;
}
```

### IndexEntry

```typescript
interface IndexEntry {
  unitId: string;
  source: EpistemicSource;
  direction: DirectionName;
  epistemicWeight: number;
  circleDepth: number;
  accountableTo: string[];
  tags: string[];
  timestamp: string;
}
```

### Supporting Types

```typescript
interface DimensionIndex {
  source: EpistemicSource;
  entries: IndexEntry[];
  depth: number;                      // Average circle depth
  weight: number;                     // Average epistemic weight
}

interface CrossDimensionalMap {
  convergences: Convergence[];        // Where multiple dimensions agree
  tensions: Tension[];                // Where dimensions conflict
  gaps: DimensionGap[];               // Dimensions with no entries
}

interface Convergence {
  dimensions: EpistemicSource[];
  description: string;
  strength: number;                   // 0–1
  unitIds: string[];
}

interface Tension {
  dimensions: [EpistemicSource, EpistemicSource];
  description: string;
  severity: number;                   // 0–1
  unitIds: string[];
}

interface DimensionGap {
  dimension: EpistemicSource;
  direction?: DirectionName;
  description: string;
}

interface RelationalPath {
  from: IndexEntry;
  to: IndexEntry;
  via: IndexEntry[];
  crossDimensional: boolean;
}

interface SpiralDepthMetrics {
  totalCircles: number;
  averageDepth: number;
  deepeningRate: number;
  stagnationAlert: boolean;
  deepestUnit: string;
}

interface IndexHealth {
  totalEntries: number;
  dimensionBalance: Record<EpistemicSource, number>;
  coverageGaps: DimensionGap[];
  averageDepth: number;
  overallHealth: number;              // 0–1
}
```

---

## Module: Index Management (`index.ts`)

```typescript
createIndex()
// Creates an empty RelationalIndex

addEntry(index, entry)
// Adds an entry to the appropriate dimension index

removeEntry(index, unitId)
// Removes an entry from the index
```

## Module: Query (`query.ts`)

```typescript
queryBySource(index, source)
// Returns all entries from a specific epistemic source

queryByDirection(index, direction)
// Returns all entries aligned with a specific direction

queryCrossDimensional(index, sources)
// Returns entries that appear in multiple dimensions

findRelationalPaths(index, fromId, toId)
// Finds relational paths between two entries across dimensions
```

## Module: Dimensions (`dimensions.ts`)

```typescript
landIndex(index)
// Returns the land dimension index with computed metrics

dreamIndex(index)
// Returns the dream dimension index with computed metrics

codeIndex(index)
// Returns the code dimension index with computed metrics

visionIndex(index)
// Returns the vision dimension index with computed metrics
```

## Module: Cross-Dimensional Analysis (`cross-dimensional.ts`)

```typescript
mapAcrossDimensions(index)
// Builds the cross-dimensional map: convergences, tensions, gaps

findConvergences(index)
// Identifies where multiple dimensions agree

detectTensions(index)
// Identifies where dimensions conflict
```

## Module: Spiral Depth (`spiral-depth.ts`)

```typescript
measureSpiralDepth(index)
// Returns SpiralDepthMetrics for the entire index

compareCircles(earlier, later)
// Compares two circling states to measure deepening

detectDeepening(index, unitId)
// Detects genuine deepening for a specific unit

detectStagnation(index)
// Identifies units that are circling without deepening
```

## Module: Metrics (`metrics.ts`)

```typescript
indexHealth(index)
// Returns IndexHealth: balance, gaps, depth, overall health

dimensionBalance(index)
// Returns per-dimension entry counts and weights

coverageGaps(index)
// Identifies dimensions and directions with no entries
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `medicine-wheel-importance-unit` ^0.1.0, `zod` ^3.23.0
- **Types consumed:** `DirectionName` from ontology-core; `ImportanceUnit`, `EpistemicSource` from importance-unit

---

## Wilson Alignment

Wilson's epistemology recognizes multiple sources of knowing:
- **Land** teaches through seasons, place, embodied experience
- **Dream** teaches through vision, intuition, liminal states
- **Code** teaches through structure, logic, pattern
- **Vision** teaches through foresight, imagination, aspiration
- The *relationship* between these dimensions creates holistic knowing

---

## Test Scenarios

1. **Index creation:** Create index → addEntry for each dimension → verify dimension indexes populated
2. **Cross-dimensional query:** Entries in land and dream dimensions → queryCrossDimensional → find related entries
3. **Convergence detection:** Two entries from different dimensions with same direction and tags → findConvergences → detected
4. **Tension detection:** Entries from different dimensions with conflicting weights → detectTensions → detected
5. **Coverage gaps:** Index with no dream entries → coverageGaps → reports dream dimension gap
6. **Spiral depth:** Entry with 5 circles → measureSpiralDepth → high average depth
7. **Index health:** Balanced index with all 4 dimensions → indexHealth → high overall health
8. **Relational paths:** Entries connected across dimensions → findRelationalPaths → path found

---

## Advancing Patterns

- **Epistemic pluralism** — Four dimensions of knowing honored equally
- **Cross-dimensional insight** — Understanding emerges from relationships between dimensions
- **Spiral depth** — Deepening through revisitation, not just accumulation
- **Dimensional balance** — Health requires all dimensions to be represented

---

## Quality Criteria

- ✅ Creative Orientation: Enables multi-dimensional knowledge exploration
- ✅ Structural Dynamics: Resolves tension between mono- and multi-dimensional indexing
- ✅ Implementation Sufficient: Full API surface documented with types and examples
- ✅ Codebase Agnostic: No file paths, conceptual indexing model
