import { describe, it, expect } from 'vitest';
import {
  DIRECTION_VOCABULARIES,
  DIRECTION_VOCABULARY_IDS,
  directionMeaning,
} from '../src/ontology-core/src/direction-vocabularies';
import { DIRECTIONS, DIRECTION_INFO, DIRECTION_NAMES, CEREMONY_PHASES } from '../src/ontology-core/src/constants';
import { directionToPhase } from '../src/narrative-engine/src/cadence';

/**
 * Named vocabularies, none default (jgwill/medicine-wheel#113). The suite
 * describes the directions in more than one way; these tests keep each module
 * equal to its named vocabulary, so a disagreement between vocabularies stays
 * visible instead of drifting silently.
 */
describe('direction vocabularies', () => {
  it('every vocabulary gives all four directions a meaning and says where it comes from', () => {
    expect(DIRECTION_VOCABULARY_IDS.length).toBeGreaterThanOrEqual(5);
    for (const id of DIRECTION_VOCABULARY_IDS) {
      const v = DIRECTION_VOCABULARIES[id];
      expect(v.id).toBe(id);
      for (const d of DIRECTION_NAMES) expect(v.meanings[d].length).toBeGreaterThan(0);
      expect(v.usedBy.length).toBeGreaterThan(0);
      expect(['unattributed', 'attributed', 'reviewed']).toContain(v.provenance.status);
      if (v.provenance.status === 'unattributed') expect(v.provenance.source).toBeNull();
    }
  });

  it('life-cycle-teachings is DIRECTIONS, and rsis-focus is DIRECTION_INFO', () => {
    for (const d of DIRECTIONS) {
      expect(directionMeaning('life-cycle-teachings', d.name)).toBe(`${d.season}: ${d.teachings.join(', ')}`);
    }
    for (const d of DIRECTION_NAMES) {
      expect(directionMeaning('rsis-focus', d)).toBe(DIRECTION_INFO[d].focus);
    }
  });

  it('ceremony-phases follows CEREMONY_PHASES in direction order', () => {
    expect(DIRECTION_NAMES.map((d) => DIRECTION_VOCABULARIES['ceremony-phases'].phases![d])).toEqual(CEREMONY_PHASES);
  });

  it('narrative-cadence is what narrative-engine computes', () => {
    for (const d of DIRECTION_NAMES) {
      expect(DIRECTION_VOCABULARIES['narrative-cadence'].phases![d]).toBe(directionToPhase(d));
    }
  });

  it('keeps the known disagreement visible: reflection sits west in one vocabulary and north in another', () => {
    expect(directionMeaning('life-cycle-teachings', 'west')).toMatch(/Reflection/);
    expect(directionMeaning('rsis-focus', 'north')).toMatch(/Reflection/);
    expect(directionMeaning('rsis-focus', 'west')).not.toMatch(/Reflection/);
  });
});
