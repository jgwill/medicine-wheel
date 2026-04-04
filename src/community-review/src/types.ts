/**
 * @medicine-wheel/community-review — Type Definitions
 *
 * Types for community-based ceremonial review — Wilson's validation
 * through community rather than peer review. Elders, knowledge keepers,
 * and community members validate relational accountability.
 */

import type { DirectionName, AccountabilityTracking, OcapFlags } from 'medicine-wheel-ontology-core';

// ── Person & Artifact Roles ─────────────────────────────────────────────────

/** Roles within the review circle */
export type PersonRole =
  | 'steward'
  | 'contributor'
  | 'elder'
  | 'firekeeper'
  | 'community-member'
  | 'youth';

/** Types of artifacts that can be reviewed */
export type ArtifactType =
  | 'research'
  | 'ceremony'
  | 'knowledge'
  | 'code'
  | 'narrative';

// ── Review Circle ───────────────────────────────────────────────────────────

/** Status progression of a review circle */
export type ReviewCircleStatus =
  | 'gathering'
  | 'reviewing'
  | 'deliberating'
  | 'decided';

/** Possible outcomes of a community review */
export type ReviewOutcomeType =
  | 'approved-with-blessings'
  | 'deepen-required'
  | 'return-to-circle'
  | 'ceremonial-hold'
  | 'withdrawn';

/**
 * A review circle — the community body that evaluates an artifact
 * through talking circle, Elder validation, and consensus.
 */
export interface ReviewCircle {
  /** Unique identifier */
  id: string;
  /** The artifact under review */
  artifactId: string;
  /** Type of artifact being reviewed */
  artifactType: ArtifactType;
  /** Circle participants */
  reviewers: Reviewer[];
  /** Elder who provides final validation */
  elderValidator?: string;
  /** Current status of the circle */
  status: ReviewCircleStatus;
  /** Final outcome once decided */
  outcome?: ReviewOutcome;
  /** Log of all talking circle entries */
  talkingCircleLog: TalkingCircleEntry[];
  /** Wilson alignment score (0–1) */
  wilsonAlignment: number;
  /** Whether the review is OCAP® compliant */
  ocapCompliant: boolean;
  /** When the circle was created */
  createdAt: string;
}

// ── Reviewer ────────────────────────────────────────────────────────────────

/**
 * A participant in the review circle, carrying their role,
 * directional perspective, and accountability relationships.
 */
export interface Reviewer {
  /** Unique identifier */
  id: string;
  /** Role in the review circle */
  role: PersonRole;
  /** Directional perspective they bring */
  direction?: DirectionName;
  /** Their review statement or voice */
  voice?: string;
  /** Who this reviewer represents and is accountable to */
  accountableTo: string[];
}

// ── Review Outcome ──────────────────────────────────────────────────────────

/** Wilson's three R's check for the review */
export interface WilsonCheck {
  /** Was respect honored throughout the review? */
  respectHonored: boolean;
  /** Is reciprocity present in the artifact? */
  reciprocityPresent: boolean;
  /** Has responsibility been taken for relational impact? */
  responsibilityTaken: boolean;
}

/**
 * The outcome of a community review — consensus, voices,
 * Wilson alignment check, and Elder blessing.
 */
export interface ReviewOutcome {
  /** Type of outcome */
  type: ReviewOutcomeType;
  /** Whether consensus was reached */
  consensus: boolean;
  /** All voices that contributed to the decision */
  voices: TalkingCircleEntry[];
  /** Wilson's three R's assessment */
  wilsonCheck: WilsonCheck;
  /** Elder's blessing statement */
  elderBlessing?: string;
  /** Conditions for approval (if any) */
  conditions: string[];
  /** Recommended next action */
  nextAction: string;
}

// ── Talking Circle ──────────────────────────────────────────────────────────

/**
 * A single entry in the talking circle — one person's voice,
 * identified by direction and role.
 */
export interface TalkingCircleEntry {
  /** Who is speaking */
  speakerId: string;
  /** Their role in the circle */
  role: PersonRole;
  /** Directional perspective of this voice */
  direction?: DirectionName;
  /** What was spoken */
  voice: string;
  /** When this was spoken */
  timestamp: string;
  /** Entry this is responding to (if any) */
  inResponseTo?: string;
}
