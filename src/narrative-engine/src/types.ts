/**
 * medicine-wheel-narrative-engine — types
 *
 * Extends ontology-core types with engine-specific interfaces
 * for beat sequencing, cadence patterns, and arc validation.
 */
import type { DirectionName, NarrativeBeat, MedicineWheelCycle } from 'medicine-wheel-ontology-core';

// ─── Beat Sequencer ───────────────────────────────────────────

export interface BeatPosition {
  beat: NarrativeBeat;
  index: number;
  direction: DirectionName;
  act: number;
}

export interface BeatInsertResult {
  success: boolean;
  positions: BeatPosition[];
  warnings: string[];
}

export interface SequencerOptions {
  /** Enforce direction order: east → south → west → north */
  enforceDirectionOrder?: boolean;
  /** Allow multiple beats per act */
  allowMultiplePerAct?: boolean;
  /** Maximum beats per direction */
  maxBeatsPerDirection?: number;
}

// ─── Cadence Patterns ─────────────────────────────────────────

export type CadencePhase = 'opening' | 'deepening' | 'integrating' | 'closing';

export interface CadencePattern {
  name: string;
  description: string;
  phases: CadencePhaseRule[];
}

export interface CadencePhaseRule {
  phase: CadencePhase;
  direction: DirectionName;
  requiresCeremony: boolean;
  minBeats: number;
  maxBeats: number;
}

export interface CadenceValidation {
  valid: boolean;
  currentPhase: CadencePhase;
  phasesCompleted: CadencePhase[];
  phasesRemaining: CadencePhase[];
  violations: CadenceViolation[];
}

export interface CadenceViolation {
  phase: CadencePhase;
  rule: string;
  message: string;
}

// ─── Arc Validation ───────────────────────────────────────────

export interface ArcCompleteness {
  complete: boolean;
  directionsVisited: DirectionName[];
  directionsMissing: DirectionName[];
  ceremoniesPerDirection: Record<DirectionName, number>;
  beatsPerDirection: Record<DirectionName, number>;
  wilsonAlignment: number;
  ocapCompliant: boolean;
  completenessScore: number;
}

export interface ArcViolation {
  type: 'missing_direction' | 'no_ceremony' | 'low_wilson' | 'ocap_gap' | 'unbalanced';
  direction?: DirectionName;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ArcValidationResult {
  valid: boolean;
  completeness: ArcCompleteness;
  violations: ArcViolation[];
  recommendations: string[];
}

// ─── Timeline ─────────────────────────────────────────────────

export type TimelineAxis = 'chronological' | 'directional' | 'ceremonial';

export interface TimelineEntry {
  beat: NarrativeBeat;
  position: number; // normalized 0–1 along timeline
  direction: DirectionName;
  act: number;
  hasCeremony: boolean;
  group: string; // grouping key for the chosen axis
}

export interface TimelineData {
  axis: TimelineAxis;
  entries: TimelineEntry[];
  groups: TimelineGroup[];
  span: { start: string; end: string };
}

export interface TimelineGroup {
  key: string;
  label: string;
  color: string;
  entries: TimelineEntry[];
}

export interface TimelineOptions {
  axis?: TimelineAxis;
  filterDirection?: DirectionName;
  filterAct?: number;
  sortBy?: 'timestamp' | 'act' | 'direction';
}

// ─── Cycle Manager ────────────────────────────────────────────

export interface CycleTransition {
  from: DirectionName;
  to: DirectionName;
  timestamp: string;
  ceremonyConducted: boolean;
  beat?: NarrativeBeat;
}

export interface CycleProgress {
  cycle: MedicineWheelCycle;
  transitions: CycleTransition[];
  currentPhase: CadencePhase;
  completeness: ArcCompleteness;
  nextDirection: DirectionName | null;
  suggestedAction: string;
}
