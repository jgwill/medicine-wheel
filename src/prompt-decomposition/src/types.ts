/**
 * medicine-wheel-prompt-decomposition — Types
 *
 * Ontology-enriched PDE types that bridge the ava-langchain
 * Prompt Decomposition Engine with the Medicine Wheel ontology.
 *
 * Design:
 * - Uses ontology-core DirectionName as the canonical direction type
 * - Enriches PDE results with relational context (obligations, ceremony, OCAP)
 * - Adds ontological metadata (Ojibwe names, seasons, acts) to decompositions
 * - Supports relational-query traversal of dependency graphs
 *
 * Lineage: mcp-pde → ava-langchain-prompt-decomposition → medicine-wheel-prompt-decomposition
 */

import type {
  DirectionName,
  RelationalObligation,
  CeremonyGuidance,
  NarrativeBeat,
  AccountabilityTracking,
} from 'medicine-wheel-ontology-core';

// ── Epistemic Source Hints ───────────────────────────────────────────────────

/** Epistemic source hint following Wilson's four ways of knowing */
export type EpistemicSourceHint = 'land' | 'dream' | 'code' | 'vision' | 'unknown';

// ── Core PDE Types (compatible with ava-langchain-prompt-decomposition) ─────

export type Urgency = 'immediate' | 'session' | 'sprint' | 'ongoing';

export interface PrimaryIntent {
  action: string;
  target: string;
  urgency: Urgency;
  confidence: number;
}

export interface SecondaryIntent {
  id: string;
  action: string;
  target: string;
  implicit: boolean;
  dependency: string | null;
  confidence: number;
}

export interface ExtractionContext {
  filesNeeded: string[];
  toolsRequired: string[];
  assumptions: string[];
}

export interface AmbiguityFlag {
  text: string;
  suggestion: string;
}

export interface ExpectedOutputs {
  artifacts: string[];
  updates: string[];
  communications: string[];
}

export interface DirectionalInsight {
  text: string;
  confidence: number;
  implicit: boolean;
}

// ── Ontology-Enriched Types ─────────────────────────────────────────────────

/** Direction enriched with ontology-core metadata */
export interface OntologicalDirection {
  name: DirectionName;
  ojibwe: string;
  season: string;
  act: number;
  insights: DirectionalInsight[];
  /** Relational obligations surfaced from this direction's analysis */
  obligations: RelationalObligation[];
  /** Whether ceremony is recommended for this direction */
  ceremonyRecommended: boolean;
}

/** Intent enriched with relational accountability context */
export interface RelationalIntent extends SecondaryIntent {
  direction: DirectionName;
  /** What relational obligations this intent carries */
  obligations: RelationalObligation[];
  /** Wilson alignment score for this intent (respect, reciprocity, responsibility) */
  wilsonAlignment: number;
}

/** Dependency with ontological relationship typing */
export interface OntologicalDependency {
  fromId: string;
  toId: string;
  type: 'depends_on' | 'validates' | 'informs' | 'ceremonies';
  direction: DirectionName;
  confidence: number;
}

// ── Decomposition Result (ontology-enriched) ────────────────────────────────

export interface OntologicalDecomposition {
  id: string;
  timestamp: string;
  prompt: string;

  /** Primary intent */
  primary: PrimaryIntent;

  /** Secondary intents enriched with direction + relational context */
  secondary: RelationalIntent[];

  /** Context requirements */
  context: ExtractionContext;

  /** Expected outputs */
  outputs: ExpectedOutputs;

  /** Four Directions analysis enriched with ontology-core metadata */
  directions: Record<DirectionName, OntologicalDirection>;

  /** Action stack ordered by direction flow (east → south → west → north) */
  actionStack: ActionItem[];

  /** Structured ambiguity flags */
  ambiguities: AmbiguityFlag[];

  /** Relational balance (0-1, how evenly distributed across directions) */
  balance: number;

  /** Dominant direction */
  leadDirection: DirectionName;

  /** Directions that need more attention */
  neglectedDirections: DirectionName[];

  /** Ceremony guidance for the decomposition */
  ceremonyGuidance: CeremonyGuidance | null;

  /** Whether ceremony is required before proceeding */
  ceremonyRequired: boolean;

  /** Aggregate Wilson alignment across all intents */
  wilsonAlignment: number;

  /** Narrative beats generated from the action stack */
  narrativeBeats: NarrativeBeat[];
}

export interface ActionItem {
  id: string;
  text: string;
  direction: DirectionName;
  dependency: string | null;
  completed: boolean;
  confidence: number;
  implicit: boolean;
  /** Epistemic source classification for this action */
  epistemicSource?: EpistemicSourceHint;
  /** Epistemic weight reflecting significance (0–1) */
  epistemicWeight?: number;
}

// ── Storage ─────────────────────────────────────────────────────────────────

export interface StoredDecomposition {
  id: string;
  timestamp: string;
  prompt: string;
  result: OntologicalDecomposition;
  markdownPath?: string;
}

// ── Decomposer Options ──────────────────────────────────────────────────────

export interface DecomposerOptions {
  /** Extract implicit intents from hedging language (default true) */
  extractImplicit?: boolean;
  /** Map dependencies between tasks (default true) */
  mapDependencies?: boolean;
  /** Ceremony threshold — below this, ceremony is required (default 0.3) */
  ceremonyThreshold?: number;
  /** Working directory for .pde/ storage (optional) */
  workdir?: string;
}
