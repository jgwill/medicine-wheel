/**
 * medicine-wheel-relational-index — Types
 *
 * Core type definitions for four-source epistemic dimensional indexing.
 * Wilson's epistemology recognises multiple sources of knowing:
 *   Land — embodied, place-based knowledge
 *   Dream — intuitive, liminal, visionary knowledge
 *   Code — implementation, algorithmic, structural knowledge
 *   Vision — aspirational, intentional, future-oriented knowledge
 */
import type { DirectionName } from 'medicine-wheel-ontology-core';

// ── Epistemic Sources ───────────────────────────────────────────

/** The four epistemic sources from Wilson's framework */
export type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

// ── Index Entry ─────────────────────────────────────────────────

/** A single entry in the relational index */
export interface IndexEntry {
  /** Unique identifier for the indexed unit */
  unitId: string;
  /** Epistemic source classification */
  source: EpistemicSource;
  /** Medicine Wheel direction alignment */
  direction: DirectionName;
  /** Weight reflecting epistemic significance (0–1) */
  epistemicWeight: number;
  /** Depth in the spiral — how many circles of revisiting */
  circleDepth: number;
  /** Entities or communities this entry is accountable to */
  accountableTo: string[];
  /** Freeform tags for cross-referencing */
  tags: string[];
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ── Dimension Index ─────────────────────────────────────────────

/** Aggregated view of one epistemic dimension */
export interface DimensionIndex {
  /** The epistemic source this dimension represents */
  source: EpistemicSource;
  /** All entries in this dimension */
  entries: IndexEntry[];
  /** Average circle depth across entries */
  depth: number;
  /** Average epistemic weight across entries */
  weight: number;
}

// ── Cross-Dimensional Mapping ───────────────────────────────────

/** Map of relationships across epistemic dimensions */
export interface CrossDimensionalMap {
  /** Where multiple dimensions agree or reinforce each other */
  convergences: Convergence[];
  /** Where dimensions are in tension or conflict */
  tensions: Tension[];
  /** Dimensions that are underrepresented or absent */
  gaps: DimensionGap[];
}

/** A point where multiple epistemic dimensions converge */
export interface Convergence {
  /** Which dimensions participate in this convergence */
  dimensions: EpistemicSource[];
  /** Entry IDs involved */
  entries: string[];
  /** Convergence strength (0–1) */
  strength: number;
  /** Human-readable description of the convergence */
  description: string;
}

/** A tension between epistemic dimensions */
export interface Tension {
  /** Which dimensions are in tension */
  dimensions: EpistemicSource[];
  /** Description of the conflict */
  conflict: string;
  /** Entry IDs involved in the tension */
  entries: string[];
}

/** A gap in epistemic dimension coverage */
export interface DimensionGap {
  /** The underrepresented source */
  source: EpistemicSource;
  /** Severity of the gap (0–1, higher = more severe) */
  severity: number;
  /** Human-readable description */
  description: string;
}

// ── Relational Index ────────────────────────────────────────────

/** The top-level relational index across all four epistemic sources */
export interface RelationalIndex {
  /** All entries keyed by unitId */
  entries: Map<string, IndexEntry>;
  /** Dimension-level aggregations */
  dimensions: Record<EpistemicSource, DimensionIndex>;
  /** Cross-dimensional relationship map */
  crossMap: CrossDimensionalMap;
}

// ── Spiral Depth ────────────────────────────────────────────────

/** Metrics for spiral depth analysis */
export interface SpiralDepthMetrics {
  /** Total number of circles completed */
  totalCircles: number;
  /** Average depth across all entries */
  averageDepth: number;
  /** Rate of deepening between successive circles (positive = deepening) */
  deepeningRate: number;
  /** Whether the index is circling without genuine progress */
  stagnationAlert: boolean;
  /** Unit ID with the greatest circle depth */
  deepestUnit: string;
}

/** A single refinement observation for detecting deepening vs stagnation */
export interface Refinement {
  /** Identifier for this refinement */
  id: string;
  /** Circle number (1-based) */
  circle: number;
  /** Depth measurement at this refinement */
  depth: number;
  /** Timestamp of the refinement */
  timestamp: string;
}

// ── Relational Path ─────────────────────────────────────────────

/** A path through the relational index connecting entries across dimensions */
export interface RelationalPath {
  /** Ordered entry IDs forming the path */
  nodes: string[];
  /** Epistemic dimensions traversed along the path */
  dimensions: EpistemicSource[];
  /** Cumulative epistemic weight along the path */
  totalWeight: number;
  /** Human-readable description of the path */
  description: string;
}

// ── Index Health ────────────────────────────────────────────────

/** Overall health assessment of a relational index */
export interface IndexHealth {
  /** Overall health score (0–1) */
  score: number;
  /** Balance across dimensions (0–1, 1 = perfectly balanced) */
  dimensionBalance: number;
  /** Total number of entries */
  entryCount: number;
  /** Number of convergences detected */
  convergenceCount: number;
  /** Number of tensions detected */
  tensionCount: number;
  /** Number of dimension gaps */
  gapCount: number;
  /** Recommendations for improving index health */
  recommendations: string[];
}
