/**
 * @medicine-wheel/transformation-tracker — Type Definitions
 *
 * Types for tracking the transformative impact of research on
 * researchers, communities, and relational networks.
 *
 * Wilson's validity criterion: "If research doesn't change you,
 * you haven't done it right."
 */

import type {
  DirectionName,
  CeremonyPhase,
  ObligationCategory,
} from 'medicine-wheel-ontology-core';

// ── Transformation Log ──────────────────────────────────────────────────────

/** Primary container tracking all transformation signals across a research cycle */
export interface TransformationLog {
  /** Unique log identifier */
  id: string;
  /** The research cycle this log tracks */
  researchCycleId: string;
  /** Periodic understanding snapshots */
  snapshots: GrowthSnapshot[];
  /** Researcher self-reflection entries */
  reflections: Reflection[];
  /** Recorded community impacts */
  communityImpacts: CommunityImpact[];
  /** Tracked relational shifts */
  relationalShifts: RelationalShift[];
  /** Reciprocity giving/receiving ledger */
  reciprocityLedger: ReciprocityEntry[];
  /** Seven-generation sustainability score (0–1) */
  sevenGenerationScore: number;
  /** Composite transformation score (0–1) */
  overallTransformation: number;
}

// ── Growth Snapshot ─────────────────────────────────────────────────────────

/** A point-in-time capture of the researcher's understanding state */
export interface GrowthSnapshot {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Direction alignment at time of snapshot */
  direction: DirectionName;
  /** Ceremony phase during snapshot */
  ceremonyPhase: CeremonyPhase;
  /** Free-text description of current understanding */
  understanding: string;
  /** Number of active relations at this point */
  relationsCount: number;
  /** Wilson alignment score (0–1) */
  wilsonAlignment: number;
  /** Key insights at this point */
  keyInsights: string[];
  /** Open questions remaining */
  openQuestions: string[];
}

// ── Reflection ──────────────────────────────────────────────────────────────

/** A researcher self-reflection entry */
export interface Reflection {
  /** Unique reflection identifier */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** The prompt that invited this reflection */
  prompt: string;
  /** The researcher's response */
  response: string;
  /** Direction alignment of the reflection */
  direction: DirectionName;
  /** Depth of reflection (0–1, where 1 is deepest) */
  depth: number;
}

// ── Community Impact ────────────────────────────────────────────────────────

/** A recorded impact on the community */
export interface CommunityImpact {
  /** Unique impact identifier */
  id: string;
  /** Description of the impact */
  description: string;
  /** Who or what benefited */
  beneficiary: string;
  /** Impact category */
  category: ObligationCategory;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Whether the impact is measurable */
  measurable: boolean;
}

// ── Relational Shift ────────────────────────────────────────────────────────

/** Tracks a change in relational strength/quality */
export interface RelationalShift {
  /** The relation that shifted */
  relationId: string;
  /** State before the shift */
  before: { strength: number; description: string };
  /** State after the shift */
  after: { strength: number; description: string };
  /** What caused the shift */
  catalyst: string;
  /** Direction alignment */
  direction: DirectionName;
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ── Reciprocity Entry ───────────────────────────────────────────────────────

/** A single entry in the reciprocity ledger */
export interface ReciprocityEntry {
  /** Whether this is giving or receiving */
  type: 'giving' | 'receiving';
  /** Description of the exchange */
  description: string;
  /** Who/what was the exchange with */
  relatedTo: string;
  /** Obligation category of the exchange */
  category: ObligationCategory;
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ── Wilson Validity ─────────────────────────────────────────────────────────

/** Result of a Wilson validity assessment */
export interface WilsonValidity {
  /** Has the researcher been transformed by this research? */
  researcherTransformed: boolean;
  /** Has the community benefited from this research? */
  communityBenefited: boolean;
  /** Have relations been strengthened through this research? */
  relationsStrengthened: boolean;
  /** Is reciprocity balanced? */
  reciprocityBalanced: boolean;
  /** Have seven generations been considered? */
  sevenGenerationsConsidered: boolean;
  /** Overall validity determination */
  overallValid: boolean;
  /** Composite validity score (0–1) */
  score: number;
  /** Recommendations for deeper Wilson alignment */
  recommendations: string[];
}
