/**
 * Cadence Patterns — ceremonial timing rules for narrative progression.
 *
 * A cadence maps the four directions to four phases:
 *   East → opening, South → deepening, West → integrating, North → closing
 */
import type { NarrativeBeat, DirectionName, CeremonyLog } from 'medicine-wheel-ontology-core';
import type {
  CadencePattern,
  CadencePhase,
  CadencePhaseRule,
  CadenceValidation,
  CadenceViolation,
} from './types.js';

const PHASE_DIRECTION: Record<CadencePhase, DirectionName> = {
  opening: 'east',
  deepening: 'south',
  integrating: 'west',
  closing: 'north',
};

const DIRECTION_PHASE: Record<DirectionName, CadencePhase> = {
  east: 'opening',
  south: 'deepening',
  west: 'integrating',
  north: 'closing',
};

const PHASE_ORDER: CadencePhase[] = ['opening', 'deepening', 'integrating', 'closing'];

/** The standard four-direction cadence pattern */
export const STANDARD_CADENCE: CadencePattern = {
  name: 'Standard Four-Direction Cadence',
  description: 'Balanced progression through all four directions with ceremony at each transition',
  phases: [
    { phase: 'opening',      direction: 'east',  requiresCeremony: true,  minBeats: 1, maxBeats: 4 },
    { phase: 'deepening',    direction: 'south', requiresCeremony: true,  minBeats: 1, maxBeats: 4 },
    { phase: 'integrating',  direction: 'west',  requiresCeremony: true,  minBeats: 1, maxBeats: 4 },
    { phase: 'closing',      direction: 'north', requiresCeremony: true,  minBeats: 1, maxBeats: 4 },
  ],
};

/** A lighter cadence — ceremonies only at opening and closing */
export const LIGHT_CADENCE: CadencePattern = {
  name: 'Light Cadence',
  description: 'Ceremonies at opening (East) and closing (North) only',
  phases: [
    { phase: 'opening',      direction: 'east',  requiresCeremony: true,  minBeats: 1, maxBeats: 6 },
    { phase: 'deepening',    direction: 'south', requiresCeremony: false, minBeats: 1, maxBeats: 6 },
    { phase: 'integrating',  direction: 'west',  requiresCeremony: false, minBeats: 1, maxBeats: 6 },
    { phase: 'closing',      direction: 'north', requiresCeremony: true,  minBeats: 1, maxBeats: 6 },
  ],
};

/** Determine the current cadence phase from beats */
export function currentPhase(beats: NarrativeBeat[]): CadencePhase {
  if (beats.length === 0) return 'opening';
  const lastDirection = beats[beats.length - 1].direction;
  return DIRECTION_PHASE[lastDirection];
}

/** Map a direction to its cadence phase */
export function directionToPhase(direction: DirectionName): CadencePhase {
  return DIRECTION_PHASE[direction];
}

/** Map a cadence phase to its direction */
export function phaseToDirection(phase: CadencePhase): DirectionName {
  return PHASE_DIRECTION[phase];
}

/** Validate beats against a cadence pattern */
export function validateCadence(
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
  pattern: CadencePattern = STANDARD_CADENCE,
): CadenceValidation {
  const violations: CadenceViolation[] = [];

  // Group beats by direction → phase
  const beatsByPhase = new Map<CadencePhase, NarrativeBeat[]>();
  for (const phase of PHASE_ORDER) {
    beatsByPhase.set(phase, []);
  }
  for (const beat of beats) {
    const phase = DIRECTION_PHASE[beat.direction];
    beatsByPhase.get(phase)!.push(beat);
  }

  // Ceremony IDs referenced by beats
  const ceremonyIds = new Set(ceremonies.map(c => c.id));

  const phasesCompleted: CadencePhase[] = [];
  const phasesRemaining: CadencePhase[] = [];

  for (const rule of pattern.phases) {
    const phaseBeats = beatsByPhase.get(rule.phase) ?? [];

    if (phaseBeats.length === 0) {
      phasesRemaining.push(rule.phase);
      continue;
    }

    // Check min/max beats
    if (phaseBeats.length < rule.minBeats) {
      violations.push({
        phase: rule.phase,
        rule: 'minBeats',
        message: `Phase '${rule.phase}' has ${phaseBeats.length} beats (minimum: ${rule.minBeats})`,
      });
    }
    if (phaseBeats.length > rule.maxBeats) {
      violations.push({
        phase: rule.phase,
        rule: 'maxBeats',
        message: `Phase '${rule.phase}' has ${phaseBeats.length} beats (maximum: ${rule.maxBeats})`,
      });
    }

    // Check ceremony requirement
    if (rule.requiresCeremony) {
      const hasCeremony = phaseBeats.some(b => b.ceremonies.some(cId => ceremonyIds.has(cId)));
      if (!hasCeremony) {
        violations.push({
          phase: rule.phase,
          rule: 'requiresCeremony',
          message: `Phase '${rule.phase}' requires a ceremony but none found`,
        });
      }
    }

    phasesCompleted.push(rule.phase);
  }

  const phase = currentPhase(beats);
  const errorViolations = violations.filter(v => v.rule === 'requiresCeremony' || v.rule === 'minBeats');

  return {
    valid: errorViolations.length === 0 && phasesRemaining.length === 0,
    currentPhase: phase,
    phasesCompleted,
    phasesRemaining,
    violations,
  };
}

/** Detect direction transitions in beat sequence */
export function detectTransitions(beats: NarrativeBeat[]): Array<{
  from: DirectionName;
  to: DirectionName;
  beatIndex: number;
}> {
  const transitions: Array<{ from: DirectionName; to: DirectionName; beatIndex: number }> = [];
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].direction !== beats[i - 1].direction) {
      transitions.push({
        from: beats[i - 1].direction,
        to: beats[i].direction,
        beatIndex: i,
      });
    }
  }
  return transitions;
}
