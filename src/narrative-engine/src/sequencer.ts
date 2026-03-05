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
