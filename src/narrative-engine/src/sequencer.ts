/**
 * Beat Sequencer — orders and validates narrative beats
 * across the four-direction, four-act structure.
 */
import type { NarrativeBeat, DirectionName } from 'medicine-wheel-ontology-core';
import { DIRECTION_ACTS, ACT_DIRECTIONS } from 'medicine-wheel-ontology-core';
import type { BeatPosition, BeatInsertResult, SequencerOptions } from './types.js';

const DIRECTION_ORDER: DirectionName[] = ['east', 'south', 'west', 'north'];

const DEFAULT_OPTIONS: Required<SequencerOptions> = {
  enforceDirectionOrder: false,
  allowMultiplePerAct: true,
  maxBeatsPerDirection: 12,
};

/** Map beats to their position metadata */
export function sequenceBeats(beats: NarrativeBeat[]): BeatPosition[] {
  const sorted = [...beats].sort((a, b) => {
    const actDiff = a.act - b.act;
    if (actDiff !== 0) return actDiff;
    return a.timestamp.localeCompare(b.timestamp);
  });

  return sorted.map((beat, index) => ({
    beat,
    index,
    direction: beat.direction,
    act: beat.act,
  }));
}

/** Insert a beat into an existing sequence */
export function insertBeat(
  beats: NarrativeBeat[],
  newBeat: NarrativeBeat,
  opts: SequencerOptions = {},
): BeatInsertResult {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const warnings: string[] = [];

  // Check max beats per direction
  const directionCount = beats.filter(b => b.direction === newBeat.direction).length;
  if (directionCount >= options.maxBeatsPerDirection) {
    return {
      success: false,
      positions: sequenceBeats(beats),
      warnings: [`Direction '${newBeat.direction}' already has ${directionCount} beats (max: ${options.maxBeatsPerDirection})`],
    };
  }

  // Check multiple per act
  if (!options.allowMultiplePerAct) {
    const existingInAct = beats.find(b => b.act === newBeat.act && b.direction === newBeat.direction);
    if (existingInAct) {
      return {
        success: false,
        positions: sequenceBeats(beats),
        warnings: [`Act ${newBeat.act} in direction '${newBeat.direction}' already has a beat`],
      };
    }
  }

  // Check direction order enforcement
  if (options.enforceDirectionOrder && beats.length > 0) {
    const lastBeat = beats[beats.length - 1];
    const lastIdx = DIRECTION_ORDER.indexOf(lastBeat.direction);
    const newIdx = DIRECTION_ORDER.indexOf(newBeat.direction);
    if (newIdx < lastIdx) {
      warnings.push(`Beat in '${newBeat.direction}' precedes the latest '${lastBeat.direction}' — direction order not enforced`);
    }
  }

  const updated = [...beats, newBeat];
  return {
    success: true,
    positions: sequenceBeats(updated),
    warnings,
  };
}

/** Get beats grouped by direction */
export function beatsByDirection(beats: NarrativeBeat[]): Record<DirectionName, NarrativeBeat[]> {
  const result: Record<DirectionName, NarrativeBeat[]> = {
    east: [], south: [], west: [], north: [],
  };
  for (const beat of beats) {
    result[beat.direction].push(beat);
  }
  return result;
}

/** Get the next expected direction in a cycle */
export function nextDirection(beats: NarrativeBeat[]): DirectionName | null {
  if (beats.length === 0) return 'east';

  const visited = new Set(beats.map(b => b.direction));
  for (const dir of DIRECTION_ORDER) {
    if (!visited.has(dir)) return dir;
  }
  return null; // all directions visited
}

/** Get the current act based on the latest beat */
export function currentAct(beats: NarrativeBeat[]): number {
  if (beats.length === 0) return 1;
  return Math.max(...beats.map(b => b.act));
}

/** Suggest the next beat's direction and act */
export function suggestNextBeat(beats: NarrativeBeat[]): { direction: DirectionName; act: number } {
  const next = nextDirection(beats);
  if (next) {
    return { direction: next, act: DIRECTION_ACTS[next] };
  }
  // All directions visited — advance to next cycle by restarting at east
  return { direction: 'east', act: 1 };
}

/** Reorder beats by direction spiral (east→south→west→north within each act) */
export function spiralOrder(beats: NarrativeBeat[]): NarrativeBeat[] {
  return [...beats].sort((a, b) => {
    const actDiff = a.act - b.act;
    if (actDiff !== 0) return actDiff;
    const dirDiff = DIRECTION_ORDER.indexOf(a.direction) - DIRECTION_ORDER.indexOf(b.direction);
    if (dirDiff !== 0) return dirDiff;
    return a.timestamp.localeCompare(b.timestamp);
  });
}

// ─── Epistemic Deepening ──────────────────────────────────────

/**
 * Analyse whether later beats show genuine epistemic deepening vs repetition.
 *
 * Deepening is detected when:
 * - Learnings accumulate and diversify across beats
 * - Later beats reference or build upon earlier learnings
 * - New directions are visited in subsequent cycles
 *
 * Stagnation is flagged when:
 * - Learnings stop growing
 * - The same directions repeat without new content
 */
export function detectEpistemicDeepening(beats: NarrativeBeat[]): {
  circleCount: number;
  deepeningIndicators: string[];
  stagnationRisk: boolean;
} {
  if (beats.length === 0) {
    return { circleCount: 0, deepeningIndicators: [], stagnationRisk: false };
  }

  const sorted = [...beats].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const indicators: string[] = [];

  // Count full cycles through all four directions
  let cycleDirections = new Set<string>();
  let circleCount = 0;
  for (const beat of sorted) {
    cycleDirections.add(beat.direction);
    if (cycleDirections.size === DIRECTION_ORDER.length) {
      circleCount++;
      cycleDirections = new Set();
    }
  }

  // Track learning accumulation
  const cumulativeLearnings: string[] = [];
  let learningsGrowing = false;
  const midpoint = Math.floor(sorted.length / 2);

  const firstHalfLearnings = sorted.slice(0, midpoint).flatMap(b => b.learnings);
  const secondHalfLearnings = sorted.slice(midpoint).flatMap(b => b.learnings);

  if (secondHalfLearnings.length > firstHalfLearnings.length) {
    learningsGrowing = true;
    indicators.push('Learnings are accumulating — later beats carry more insight');
  }

  // Check learning diversity
  const allLearnings = sorted.flatMap(b => b.learnings);
  const uniqueLearnings = new Set(allLearnings);
  if (uniqueLearnings.size > allLearnings.length * 0.7) {
    indicators.push('High learning diversity — minimal repetition of insights');
  }

  // Check direction coverage expansion
  const firstHalfDirs = new Set(sorted.slice(0, midpoint).map(b => b.direction));
  const secondHalfDirs = new Set(sorted.slice(midpoint).map(b => b.direction));
  if (secondHalfDirs.size >= firstHalfDirs.size) {
    indicators.push('Direction coverage maintained or expanded in later beats');
  }

  if (circleCount > 0) {
    indicators.push(`${circleCount} full circle(s) completed through all four directions`);
  }

  // Stagnation: no learning growth and high repetition
  const stagnationRisk =
    !learningsGrowing &&
    beats.length > 4 &&
    uniqueLearnings.size < allLearnings.length * 0.5;

  return { circleCount, deepeningIndicators: indicators, stagnationRisk };
}

/**
 * Identify beats where understanding visibly shifted.
 *
 * A transformation point is a beat where:
 * - New learnings appear that were absent in all prior beats
 * - A direction transition occurs (ceremony boundary)
 * - The beat carries ceremonies (indicating intentional shift)
 */
export function findTransformationPoints(beats: NarrativeBeat[]): Array<{
  beatId: string;
  beforeUnderstanding: string;
  afterUnderstanding: string;
  catalyst: string;
}> {
  if (beats.length < 2) return [];

  const sorted = [...beats].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const transformations: Array<{
    beatId: string;
    beforeUnderstanding: string;
    afterUnderstanding: string;
    catalyst: string;
  }> = [];

  const priorLearnings = new Set<string>();

  for (let i = 1; i < sorted.length; i++) {
    const beat = sorted[i];
    const prev = sorted[i - 1];
    const newLearnings = beat.learnings.filter(l => !priorLearnings.has(l));

    const isDirectionShift = beat.direction !== prev.direction;
    const hasCeremony = beat.ceremonies.length > 0;
    const hasNewLearnings = newLearnings.length > 0;

    if (hasNewLearnings || (isDirectionShift && hasCeremony)) {
      const catalystParts: string[] = [];
      if (isDirectionShift) catalystParts.push(`direction shift (${prev.direction} → ${beat.direction})`);
      if (hasCeremony) catalystParts.push('ceremony conducted');
      if (hasNewLearnings) catalystParts.push(`${newLearnings.length} new learning(s)`);

      transformations.push({
        beatId: beat.id,
        beforeUnderstanding: prev.learnings.join('; ') || prev.title,
        afterUnderstanding: beat.learnings.join('; ') || beat.title,
        catalyst: catalystParts.join(', '),
      });
    }

    for (const l of beat.learnings) priorLearnings.add(l);
  }

  return transformations;
}
