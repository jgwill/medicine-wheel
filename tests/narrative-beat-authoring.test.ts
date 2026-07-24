/**
 * Beat authoring — the single door every producer passes through.
 *
 * These tests hold the laws that make a beat readable later: it knows its
 * direction and act, it knows which cycle it belongs to, and when it is
 * telescoped both sides of the parent/child relation are written.
 */
import { describe, it, expect } from 'vitest';
import {
  createBeat,
  createBeats,
  validateBeatDraft,
  telescopeBeat,
  attachBeatToCycle,
  beatsInCycle,
  orphanBeats,
  beatLineage,
  beatDepth,
  rootBeats,
  childBeats,
  actForDirection,
  type BeatDraft,
} from '../src/narrative-engine/src/beats';
import type { NarrativeBeat, MedicineWheelCycle } from '../src/ontology-core/src/types';

const draft = (over: Partial<BeatDraft> = {}): BeatDraft => ({
  direction: 'east',
  title: 'The circle opens',
  description: 'Vision named, consent established',
  learnings: ['Consent precedes action'],
  relations_honored: ['node:elder-sarah'],
  ...over,
});

const cycle = (over: Partial<MedicineWheelCycle> = {}): MedicineWheelCycle => ({
  id: 'cycle-1',
  research_question: 'How does the wheel hold a story?',
  start_date: '2026-07-24T00:00:00.000Z',
  current_direction: 'east',
  beats: [],
  ceremonies_conducted: 0,
  relations_mapped: 0,
  wilson_alignment: 0,
  ocap_compliant: true,
  ...over,
});

describe('direction and act', () => {
  it('maps the sunwise order east=1 south=2 west=3 north=4', () => {
    expect(actForDirection('east')).toBe(1);
    expect(actForDirection('south')).toBe(2);
    expect(actForDirection('west')).toBe(3);
    expect(actForDirection('north')).toBe(4);
  });

  it('infers the act from the direction when the draft omits it', () => {
    expect(createBeat(draft({ direction: 'west' })).act).toBe(3);
  });

  it('warns rather than fails when a supplied act contradicts the direction', () => {
    const v = validateBeatDraft(draft({ direction: 'north', act: 1 }));
    expect(v.valid).toBe(true);
    expect(v.violations.some(x => x.field === 'act' && x.severity === 'warning')).toBe(true);
  });

  it('refuses the contradiction outright under strictAct', () => {
    expect(() => createBeat(draft({ direction: 'north', act: 1 }), { strictAct: true })).toThrow();
  });
});

describe('validation', () => {
  it('rejects a beat with no account of what happened', () => {
    const v = validateBeatDraft(draft({ description: '   ' }));
    expect(v.valid).toBe(false);
    expect(v.violations.some(x => x.field === 'description' && x.severity === 'error')).toBe(true);
    expect(() => createBeat(draft({ description: '   ' }))).toThrow(/description/);
  });

  it('rejects an unknown direction', () => {
    expect(validateBeatDraft(draft({ direction: 'up' as any })).valid).toBe(false);
  });

  it('rejects a non ISO timestamp', () => {
    expect(validateBeatDraft(draft({ timestamp: 'last tuesday' })).valid).toBe(false);
  });

  it('lets a thin beat through with warnings rather than losing the moment', () => {
    const v = validateBeatDraft(draft({ learnings: [], relations_honored: [] }));
    expect(v.valid).toBe(true);
    expect(v.violations.filter(x => x.severity === 'warning').length).toBe(2);
    expect(createBeat(draft({ learnings: [], relations_honored: [] })).learnings).toEqual([]);
  });
});

describe('creation', () => {
  it('carries provenance so a derived beat is distinguishable from an authored one', () => {
    const beat = createBeat(
      draft({ origin: { producer: 'narrative-cluster', source_ref: 'cluster-3', method: 'clusterEvents' } }),
    );
    expect(beat.origin?.producer).toBe('narrative-cluster');
    expect(beat.origin?.source_ref).toBe('cluster-3');
  });

  it('honours a supplied id so the caller can find the beat again', () => {
    expect(createBeat(draft({ id: 'beat:east:fixed' })).id).toBe('beat:east:fixed');
  });

  it('mints distinct ids across a batch', () => {
    const beats = createBeats([draft(), draft(), draft()]);
    expect(new Set(beats.map(b => b.id)).size).toBe(3);
  });

  it('omits optional fields rather than writing undefined into the record', () => {
    const beat = createBeat(draft());
    expect('cycle_id' in beat).toBe(false);
    expect('parent_beat_id' in beat).toBe(false);
  });
});

describe('telescoping', () => {
  const parent = createBeat(draft({ id: 'beat:parent', cycle_id: 'cycle-1' }));

  it('writes both sides of the parent/child relation', () => {
    const { parent: updated, subBeats } = telescopeBeat(parent, [
      { direction: 'east', title: 'A', description: 'first grain' },
      { direction: 'east', title: 'B', description: 'second grain' },
    ]);

    expect(subBeats).toHaveLength(2);
    expect(updated.sub_beats).toEqual(subBeats.map(b => b.id));
    expect(subBeats.every(b => b.parent_beat_id === 'beat:parent')).toBe(true);
  });

  it('passes the parent cycle down so sub-beats are not orphaned', () => {
    const { subBeats } = telescopeBeat(parent, [{ direction: 'east', title: 'A', description: 'grain' }]);
    expect(subBeats[0].cycle_id).toBe('cycle-1');
  });

  it('inherits the parent direction unless the draft names its own', () => {
    const { subBeats } = telescopeBeat(parent, [
      { title: 'inherits', description: 'x' } as BeatDraft,
      { direction: 'west', title: 'declares', description: 'y' },
    ]);
    expect(subBeats[0].direction).toBe('east');
    expect(subBeats[1].direction).toBe('west');
    expect(subBeats[1].act).toBe(3);
  });

  it('keeps the parent rather than replacing it', () => {
    const { parent: updated } = telescopeBeat(parent, [{ direction: 'east', title: 'A', description: 'x' }]);
    expect(updated.id).toBe(parent.id);
    expect(updated.title).toBe(parent.title);
  });

  it('appends on a second telescoping instead of discarding the first', () => {
    const first = telescopeBeat(parent, [{ direction: 'east', title: 'A', description: 'x' }]);
    const second = telescopeBeat(first.parent, [{ direction: 'east', title: 'B', description: 'y' }]);
    expect(second.parent.sub_beats).toHaveLength(2);
  });

  it('refuses to telescope into nothing', () => {
    expect(() => telescopeBeat(parent, [])).toThrow(/at least one/);
  });

  it('reports lineage and depth through the chain', () => {
    const { parent: p1, subBeats: [child] } = telescopeBeat(parent, [
      { direction: 'east', title: 'child', description: 'x' },
    ]);
    const { subBeats: [grandchild] } = telescopeBeat(child, [
      { direction: 'east', title: 'grandchild', description: 'y' },
    ]);

    const all = [p1, child, grandchild];
    expect(beatDepth(grandchild, all)).toBe(2);
    expect(beatLineage(grandchild, all).map(b => b.title)).toEqual([
      'The circle opens',
      'child',
      'grandchild',
    ]);
    expect(rootBeats(all).map(b => b.id)).toEqual([p1.id]);
    expect(childBeats(p1.id, all).map(b => b.title)).toEqual(['child']);
  });

  it('survives a parent cycle without looping forever', () => {
    const a: NarrativeBeat = { ...createBeat(draft({ id: 'a' })), parent_beat_id: 'b' };
    const b: NarrativeBeat = { ...createBeat(draft({ id: 'b' })), parent_beat_id: 'a' };
    expect(beatDepth(a, [a, b])).toBeLessThanOrEqual(2);
  });
});

describe('cycle membership', () => {
  it('binds both sides at once', () => {
    const beat = createBeat(draft({ id: 'beat:1' }));
    const { beat: bound, cycle: amended } = attachBeatToCycle(beat, cycle());
    expect(bound.cycle_id).toBe('cycle-1');
    expect(amended.beats).toEqual(['beat:1']);
  });

  it('does not list the same beat twice', () => {
    const beat = createBeat(draft({ id: 'beat:1' }));
    const once = attachBeatToCycle(beat, cycle());
    const twice = attachBeatToCycle(once.beat, once.cycle);
    expect(twice.cycle.beats).toEqual(['beat:1']);
  });

  it('reads membership from either side so legacy beats are not dropped', () => {
    const modern = createBeat(draft({ id: 'beat:modern', cycle_id: 'cycle-1' }));
    const legacy = createBeat(draft({ id: 'beat:legacy' })); // no cycle_id
    const unrelated = createBeat(draft({ id: 'beat:other', cycle_id: 'cycle-2' }));

    const found = beatsInCycle(cycle({ beats: ['beat:legacy'] }), [modern, legacy, unrelated]);
    expect(found.map(b => b.id).sort()).toEqual(['beat:legacy', 'beat:modern']);
  });

  it('surfaces beats no arc will ever read', () => {
    const claimed = createBeat(draft({ id: 'beat:claimed' }));
    const naming = createBeat(draft({ id: 'beat:naming', cycle_id: 'cycle-1' }));
    const orphan = createBeat(draft({ id: 'beat:orphan' }));

    const found = orphanBeats([claimed, naming, orphan], [cycle({ beats: ['beat:claimed'] })]);
    expect(found.map(b => b.id)).toEqual(['beat:orphan']);
  });
});
