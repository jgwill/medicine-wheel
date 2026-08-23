/**
 * search_nodes — multi-word term matching
 *
 * Registering infrastructure in the wheel is only worth doing if it can be
 * found again. Before this, the matcher asked whether the WHOLE lowercased
 * query appeared verbatim inside `name` or `description`, so a person typing
 * the words in any other order, or typing words that live in different fields,
 * received nothing while the node sat in the graph.
 *
 * The fixture below is the real node measured on the live wheel at
 * http://127.0.0.1:8040 on 2026-08-02 (`node:knowledge:1785666157041:jjmclc`),
 * trimmed to the fields search reads. Its name carries "veritas", "stc" and
 * "surface"; its description carries "service"; its metadata carries
 * "ServiceFacet" and the port. Those four facts are the whole test.
 *
 * @see mcp/src/node-search.ts
 * @see mcp/src/tools/discovery.ts — the `search_nodes` tool
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { rankNodes, tokenize } from '../src/node-search.js';
import { JsonlStore } from '../src/jsonl-store.js';

const veritas = {
  id: 'node:knowledge:1785666157041:jjmclc',
  type: 'knowledge',
  name: 'veritas-stc-surface',
  description:
    "The living MMOT review surface: veritas rendering the seat's coaia-narrative chart " +
    'store read-only, at http://localhost:3123/stc/{chartId}. Registered 2026-08-02 as the ' +
    'first service facet in the wheel, to test whether infrastructure can be recorded from ' +
    'a phone without any new node type.',
  direction: 'west',
  metadata: {
    kind: 'service',
    facet: 'ServiceFacet',
    repo: 'jgwill/veritas',
    ports: [{ port: 3123, proto: 'tcp', bind: '127.0.0.1' }],
  },
  created_at: '2026-08-02T10:22:35.755Z',
  updated_at: '2026-08-02T10:22:35.755Z',
};

const episode = {
  id: 'chronicle:2026-08-01-episode-304-the-review-became-a-place',
  type: 'knowledge',
  name: 'Episode 304 — the-review-became-a-place',
  description:
    "The seat's review lives as Moments of Truth in the same graph as the tensions it " +
    'evaluates — Fritz\'s TandT lineage (veritas) rendering the coaia-narrative chart store live.',
  direction: 'north',
  metadata: { kind: 'chronicle_episode', status: 'active' },
  created_at: '2026-08-02T02:06:28.013Z',
  updated_at: '2026-08-02T02:06:28.013Z',
};

const unrelated = {
  id: 'node:land:1700000000000:aaaaaa',
  type: 'land',
  name: 'the-river-bend',
  description: 'A place on the land where the water turns and the willows lean in.',
  direction: 'east',
  metadata: { kind: 'place' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const corpus = [veritas, episode, unrelated];
const ids = (nodes: { id: string }[]) => nodes.map(n => n.id);

describe('search_nodes — the defect this fixes', () => {
  it('finds the node when the terms span name and description', () => {
    // Measured 0 before the fix. This single assertion is the whole reason.
    expect(ids(rankNodes(corpus, 'veritas stc surface service'))).toContain(veritas.id);
  });

  it('finds the node when both terms live in the hyphenated name', () => {
    expect(ids(rankNodes(corpus, 'veritas stc'))).toEqual([veritas.id]);
  });

  it('does not care about term order', () => {
    expect(ids(rankNodes(corpus, 'surface stc veritas'))).toEqual([veritas.id]);
  });

  it('reads metadata values, which were never searched before', () => {
    expect(ids(rankNodes(corpus, 'ServiceFacet'))).toEqual([veritas.id]);
    expect(ids(rankNodes(corpus, 'jgwill/veritas surface'))).toEqual([veritas.id]);
    expect(ids(rankNodes(corpus, '3123'))).toEqual([veritas.id]);
  });
});

describe('search_nodes — no regression on what already worked', () => {
  it('still returns both nodes for the single word "veritas"', () => {
    expect(ids(rankNodes(corpus, 'veritas'))).toEqual([veritas.id, episode.id]);
  });

  it('still matches a contiguous phrase from the description', () => {
    expect(ids(rankNodes(corpus, 'MMOT review surface'))).toEqual([veritas.id]);
  });

  it('is case-insensitive in both directions', () => {
    expect(ids(rankNodes(corpus, 'VERITAS-STC-SURFACE'))).toEqual([veritas.id]);
    expect(ids(rankNodes(corpus, 'living mmot'))).toEqual([veritas.id]);
  });
});

describe('search_nodes — a search that answers everything answers nothing', () => {
  it('returns nothing when no term matches any node', () => {
    expect(rankNodes(corpus, 'quantum lasagna telegraph')).toEqual([]);
    expect(rankNodes(corpus, 'zzzz')).toEqual([]);
  });

  it('returns nothing for an empty or punctuation-only query', () => {
    expect(rankNodes(corpus, '')).toEqual([]);
    expect(rankNodes(corpus, '   ')).toEqual([]);
    expect(rankNodes(corpus, '--- ///')).toEqual([]);
  });

  it('does not dilute a full match with partial ones', () => {
    // "review" alone would reach the episode node; because the veritas node
    // matches BOTH terms, the partial tier is never consulted.
    expect(ids(rankNodes(corpus, 'veritas ServiceFacet'))).toEqual([veritas.id]);
  });

  it('falls back to partial matches only when nothing matches every term', () => {
    const results = ids(rankNodes(corpus, 'veritas willows'));
    expect(results).toContain(veritas.id);
    expect(results).toContain(unrelated.id);
    // Ranked, not merely collected: the node matching the stronger field leads.
    expect(results[0]).toBe(veritas.id);
  });
});

describe('search_nodes — ranking', () => {
  it('puts an exact name first', () => {
    const alias = { ...unrelated, id: 'node:knowledge:9:alias', name: 'surface' };
    expect(ids(rankNodes([veritas, alias], 'surface'))[0]).toBe(alias.id);
  });

  it('prefers a name hit over a description hit — in both directions', () => {
    // "veritas" is in one node's NAME and the other's DESCRIPTION.
    expect(ids(rankNodes(corpus, 'veritas'))[0]).toBe(veritas.id);
    // "review" is the mirror case, so this pins the FIELD rule rather than a
    // node that merely happens to sort first.
    expect(ids(rankNodes(corpus, 'review'))[0]).toBe(episode.id);
  });

  it('breaks ties on recency so the order is stable', () => {
    const older = { ...episode, id: 'node:knowledge:1:older', updated_at: '2020-01-01T00:00:00.000Z' };
    const newer = { ...episode, id: 'node:knowledge:2:newer', updated_at: '2026-08-02T00:00:00.000Z' };
    expect(ids(rankNodes([older, newer], 'coaia-narrative'))).toEqual([newer.id, older.id]);
  });
});

/**
 * `search_nodes` routes to whichever store MW_API_URL selects. Both must answer
 * the same question the same way, or the tool's behaviour depends on a
 * deployment detail the caller cannot see.
 *
 * @see mcp/src/store.ts — the backend router
 */
describe('JsonlStore.searchNodes — the same contract as the HTTP store', () => {
  let dataDir: string;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-node-search-'));
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    consoleError.mockRestore();
  });

  function seeded(): JsonlStore {
    const store = new JsonlStore(dataDir);
    for (const n of corpus) store.createNode(n as any);
    return store;
  }

  it('finds the node from terms spanning name, description and metadata', () => {
    expect(ids(seeded().searchNodes('veritas stc surface service'))).toEqual([veritas.id]);
    expect(ids(seeded().searchNodes('ServiceFacet'))).toEqual([veritas.id]);
  });

  it('still honours the type and direction filters', () => {
    expect(ids(seeded().searchNodes('veritas', { type: 'knowledge' }))).toEqual([
      veritas.id,
      episode.id,
    ]);
    expect(ids(seeded().searchNodes('veritas', { direction: 'west' }))).toEqual([veritas.id]);
    expect(seeded().searchNodes('veritas', { type: 'land' })).toEqual([]);
  });

  it('applies the limit after ranking, so the best match survives the cut', () => {
    const top = seeded().searchNodes('veritas', { limit: 1 });
    expect(ids(top)).toEqual([veritas.id]);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(seeded().searchNodes('quantum lasagna telegraph')).toEqual([]);
  });
});

describe('tokenize', () => {
  it('splits on anything that is not a letter or digit', () => {
    expect(tokenize('veritas-stc-surface')).toEqual(['veritas', 'stc', 'surface']);
    expect(tokenize('jgwill/medicine-wheel#118')).toEqual(['jgwill', 'medicine', 'wheel', '118']);
    expect(tokenize('   ')).toEqual([]);
  });
});
