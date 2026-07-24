/**
 * A cycle written under an id the caller already holds.
 *
 * Two failures live here, and they pull in opposite directions: minting a new
 * id when the caller supplied one duplicates cycles, and refusing an unknown
 * id loses the cycle a client just opened. Both were real.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let dataDir: string;
let store: typeof import('../lib/store');

beforeEach(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-cycle-upsert-'));
  process.env.MW_DATA_DIR = dataDir;
  vi.resetModules();
  store = await import('../lib/store');
});

afterEach(() => {
  delete process.env.MW_DATA_DIR;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

import { vi } from 'vitest';

describe('upsertCycle', () => {
  it('opens a cycle under the id the caller minted rather than losing it', () => {
    const written = store.upsertCycle({
      id: 'cycle-client-minted-1',
      research_question: 'How does the wheel hold a story?',
      current_direction: 'east',
    });

    expect(written.id).toBe('cycle-client-minted-1');
    expect(store.getAllCycles().map(c => c.id)).toContain('cycle-client-minted-1');
  });

  it('amends rather than duplicating when the id is already known', () => {
    store.upsertCycle({ id: 'cycle-a', research_question: 'first framing' });
    store.upsertCycle({ id: 'cycle-a', research_question: 'sharpened framing' });

    const matching = store.getAllCycles().filter(c => c.id === 'cycle-a');
    expect(matching).toHaveLength(1);
    expect(matching[0].research_question).toBe('sharpened framing');
  });

  it('keeps fields the amendment does not mention', () => {
    store.upsertCycle({
      id: 'cycle-b',
      research_question: 'what survives an amendment',
      beats: ['beat:1'],
    });
    store.upsertCycle({ id: 'cycle-b', current_direction: 'west' });

    const cycle = store.getAllCycles().find(c => c.id === 'cycle-b');
    expect(cycle?.research_question).toBe('what survives an amendment');
    expect(cycle?.beats).toEqual(['beat:1']);
    expect(cycle?.current_direction).toBe('west');
  });

  it('binds both sides when a beat names its cycle, without minting a second cycle', () => {
    store.upsertCycle({ id: 'cycle-c', research_question: 'binding' });

    // Seed data already occupies this store, so hold the returned beat rather
    // than reaching for an index — the demo beat sorts ahead of it.
    const beat = store.createBeat({
      direction: 'south',
      title: 'a moment inside the cycle',
      description: 'bound at creation',
      ceremonies: [],
      learnings: [],
      relations_honored: [],
      cycle_id: 'cycle-c',
    });

    const matching = store.getAllCycles().filter(c => c.id === 'cycle-c');
    expect(matching).toHaveLength(1);
    expect(matching[0].beats).toContain(beat.id);
    expect(beat.cycle_id).toBe('cycle-c');
    expect(beat.act).toBe(2); // south, derived not defaulted
  });
});
