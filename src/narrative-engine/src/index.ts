/**
 * @medicine-wheel/narrative-engine
 *
 * Beat sequencing, arc validation, cadence patterns, and timeline
 * building for the Medicine Wheel Developer Suite.
 */

// Types
export type {
  BeatPosition,
  BeatInsertResult,
  SequencerOptions,
  CadencePhase,
  CadencePattern,
  CadencePhaseRule,
  CadenceValidation,
  CadenceViolation,
  ArcCompleteness,
  ArcViolation,
  ArcValidationResult,
  TimelineAxis,
  TimelineEntry,
  TimelineData,
  TimelineGroup,
  TimelineOptions,
  CycleTransition,
  CycleProgress,
  EpistemicDepth,
  NarrativeTransformation,
} from './types.js';

// Beat authoring — drafts in, validated beats out
export type {
  BeatDraft,
  BeatDraftViolation,
  BeatDraftValidation,
  CreateBeatOptions,
  TelescopeResult,
} from './beats.js';

export {
  ACT_FOR_DIRECTION,
  actForDirection,
  validateBeatDraft,
  createBeat,
  createBeats,
  telescopeBeat,
  beatDepth,
  beatLineage,
  rootBeats,
  childBeats,
  attachBeatToCycle,
  beatsInCycle,
  orphanBeats,
} from './beats.js';

// Sequencer
export {
  sequenceBeats,
  insertBeat,
  beatsByDirection,
  nextDirection,
  currentAct,
  suggestNextBeat,
  spiralOrder,
  detectEpistemicDeepening,
  findTransformationPoints,
} from './sequencer.js';

// Cadence
export {
  STANDARD_CADENCE,
  LIGHT_CADENCE,
  currentPhase,
  directionToPhase,
  phaseToDirection,
  validateCadence,
  detectTransitions,
} from './cadence.js';

// Arc validation
export {
  computeCompleteness,
  validateArc,
  isArcComplete,
} from './arc.js';

// Timeline
export {
  buildTimeline,
  actStrip,
} from './timeline.js';

// Cycle manager
export {
  extractTransitions,
  computeProgress,
  createCycle,
  updateCycleMetadata,
} from './cycle.js';

// RSIS narrative generators
export {
  generateProvenanceNarrative,
  generateReciprocityObservation,
  generateDirectionObservation,
  getCeremonyPhaseFraming,
  describeSun,
} from './rsis-narrative.js';
