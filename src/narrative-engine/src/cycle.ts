/**
 * Cycle Manager — orchestrates a full Medicine Wheel narrative cycle,
 * tracking transitions, progress, and suggesting next steps.
 */
import type {
  NarrativeBeat,
  MedicineWheelCycle,
  DirectionName,
  CeremonyLog,
  Relation,
} from 'medicine-wheel-ontology-core';
import type { CycleTransition, CycleProgress } from './types.js';
import { currentPhase } from './cadence.js';
import { computeCompleteness } from './arc.js';
import { nextDirection } from './sequencer.js';

/** Extract direction transitions from a beat sequence */
export function extractTransitions(
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
): CycleTransition[] {
  const transitions: CycleTransition[] = [];
  const ceremonyIds = new Set(ceremonies.map(c => c.id));

  for (let i = 1; i < beats.length; i++) {
    if (beats[i].direction !== beats[i - 1].direction) {
      const transitionBeat = beats[i];
      transitions.push({
        from: beats[i - 1].direction,
        to: beats[i].direction,
        timestamp: transitionBeat.timestamp,
        ceremonyConducted: transitionBeat.ceremonies.some(cId => ceremonyIds.has(cId)),
        beat: transitionBeat,
      });
    }
  }

  return transitions;
}

/** Compute full cycle progress */
export function computeProgress(
  cycle: MedicineWheelCycle,
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
  relations: Relation[],
): CycleProgress {
  const transitions = extractTransitions(beats, ceremonies);
  const phase = currentPhase(beats);
  const completeness = computeCompleteness(beats, ceremonies, relations);
  const next = nextDirection(beats);

  let suggestedAction: string;

  if (beats.length === 0) {
    suggestedAction = 'Begin the cycle with a beat in the East (opening) direction';
  } else if (next) {
    const phaseNames: Record<DirectionName, string> = {
      east: 'opening',
      south: 'deepening',
      west: 'integrating',
      north: 'closing',
    };
    suggestedAction = `Move to the ${next} direction (${phaseNames[next]} phase)`;

    // Check if a ceremony is needed at the transition
    const lastTransition = transitions[transitions.length - 1];
    if (lastTransition && !lastTransition.ceremonyConducted) {
      suggestedAction += ' — consider conducting a transition ceremony first';
    }
  } else if (!completeness.ocapCompliant) {
    suggestedAction = 'Review OCAP® compliance on relations before closing the cycle';
  } else if (completeness.wilsonAlignment < 0.7) {
    suggestedAction = `Strengthen Wilson alignment (currently ${(completeness.wilsonAlignment * 100).toFixed(0)}%) before closing`;
  } else {
    suggestedAction = 'All directions visited — the cycle is ready to close';
  }

  return {
    cycle,
    transitions,
    currentPhase: phase,
    completeness,
    nextDirection: next,
    suggestedAction,
  };
}

/** Create a new cycle with initial metadata */
export function createCycle(
  id: string,
  researchQuestion: string,
): MedicineWheelCycle {
  return {
    id,
    research_question: researchQuestion,
    start_date: new Date().toISOString(),
    current_direction: 'east',
    beats: [],
    ceremonies_conducted: 0,
    relations_mapped: 0,
    wilson_alignment: 0,
    ocap_compliant: true,
  };
}

/** Update cycle metadata from current beats/ceremonies/relations */
export function updateCycleMetadata(
  cycle: MedicineWheelCycle,
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
  relations: Relation[],
): MedicineWheelCycle {
  const completeness = computeCompleteness(beats, ceremonies, relations);
  const lastDirection = beats.length > 0 ? beats[beats.length - 1].direction : 'east';

  return {
    ...cycle,
    current_direction: lastDirection,
    beats: beats.map(b => b.id),
    ceremonies_conducted: ceremonies.length,
    relations_mapped: relations.length,
    wilson_alignment: completeness.wilsonAlignment,
    ocap_compliant: completeness.ocapCompliant,
  };
}
