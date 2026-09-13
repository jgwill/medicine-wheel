import { describe, it, expect } from 'vitest';
import { DIRECTION_ACTS, ACT_DIRECTIONS } from '../src/ontology-core/src/constants';
import { ACT_FOR_DIRECTION, actForDirection } from '../src/narrative-engine/src/beats';
import { clusterEvents, clustersToBeats } from '../src/narrative-cluster/src/clusters';

/**
 * One clock. Until 2026-09-13 the direction→act table existed three times — in
 * ontology-core, in narrative-engine/beats.ts, and in narrative-cluster — while
 * narrative-engine's own sequencer read the ontology's copy. These tests pin the
 * engine and the cluster processor to the ontology's table so they cannot drift
 * apart again.
 */
describe('direction → act table', () => {
  it('narrative-engine exposes the ontology table, entry for entry', () => {
    // `toEqual`, not `toBe`: this test imports ontology-core's *source* while the
    // engine resolves `@medicine-wheel/ontology-core` to its built dist/, so the
    // two are different module instances of the same table. Value equality is the
    // contract that survives that split; identity would only test the harness.
    expect(ACT_FOR_DIRECTION).toEqual(DIRECTION_ACTS);
    expect(Object.keys(ACT_FOR_DIRECTION).sort()).toEqual(['east', 'north', 'south', 'west']);
  });

  it('actForDirection agrees with the ontology for every direction', () => {
    for (const direction of ['east', 'south', 'west', 'north'] as const) {
      expect(actForDirection(direction)).toBe(DIRECTION_ACTS[direction]);
    }
  });

  it('the ontology table is its own inverse', () => {
    for (const [direction, act] of Object.entries(DIRECTION_ACTS)) {
      expect(ACT_DIRECTIONS[act]).toBe(direction);
    }
  });

  it('narrative-cluster beats carry the ontology act for their direction', () => {
    const clusters = clusterEvents([
      { type: 'shot-composition', text: 'wide on the river', index: 0 },
      { type: 'ambient-sound', text: 'wind through cottonwoods', index: 1 },
      { type: 'relational-moment', text: 'she names the place', index: 2 },
    ]);
    const beats = clustersToBeats(clusters);
    expect(beats.length).toBeGreaterThan(0);
    for (const beat of beats) {
      expect(beat.act).toBe(DIRECTION_ACTS[beat.direction]);
    }
  });
});
