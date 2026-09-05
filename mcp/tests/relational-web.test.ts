/**
 * The shared relational walk behind `get_relational_web`.
 *
 * Both MCP stores carried their own BFS and both had the same two defects. This
 * file holds the behaviour that made them wrong, so neither can regress alone.
 *
 * Measured on the live wheel 2026-09-03: `chronicle:miadi-chronicle` carries a
 * `belongs_to` from all 82 episodes. Episode 011 has exactly **one** relation,
 * and `get_relational_web` at depth 2 returned 31 nodes and 100 edges — 81KB,
 * past the tool result limit, for a node with one neighbour.
 *
 * @see mcp/src/relational-web.ts
 */

import { describe, expect, it } from 'vitest';
import { buildRelationalWeb } from '../src/relational-web.js';

interface N {
  id: string;
  name?: string;
  metadata?: Record<string, unknown> | null;
}
interface E {
  from_id: string;
  to_id: string;
  relationship_type?: string;
}

/** A chronicle root with `count` episodes hanging off it — the real shape. */
function chronicle(count: number): { nodes: N[]; edges: E[] } {
  const nodes: N[] = [
    { id: 'root', name: 'Miadi Chronicle', metadata: { kind: 'chronicle_root' } },
  ];
  const edges: E[] = [];
  for (let i = 0; i < count; i += 1) {
    nodes.push({ id: `ep-${i}`, name: `Episode ${i}`, metadata: { kind: 'chronicle_episode' } });
    edges.push({ from_id: `ep-${i}`, to_id: 'root', relationship_type: 'belongs_to' });
  }
  return { nodes, edges };
}

describe('buildRelationalWeb', () => {
  it('reaches the chronicle root without walking back out through it', () => {
    const { nodes, edges } = chronicle(82);

    const web = buildRelationalWeb('ep-0', nodes, edges, { depth: 2 });

    // Two, not 83. The container is present because "this episode belongs to
    // the chronicle" is true and worth knowing.
    expect(web.nodes.map((n) => n.id).sort()).toEqual(['ep-0', 'root']);
    expect(web.hubs).toHaveLength(1);
    expect(web.hubs[0]).toMatchObject({ id: 'root', reason: 'kind', degree: 82 });
    // 81 episodes sit behind it and were not brought back.
    expect(web.hubs[0].unexpanded).toBe(81);
    expect(web.truncated).toBe(true);
  });

  it('holds the container at every depth, because the only path out goes through it', () => {
    const { nodes, edges } = chronicle(82);
    for (const depth of [1, 2, 3, 4, 5]) {
      const web = buildRelationalWeb('ep-0', nodes, edges, { depth });
      expect(web.nodes, `depth ${depth}`).toHaveLength(2);
    }
  });

  it('expands through everything when suppression is disabled', () => {
    const { nodes, edges } = chronicle(82);
    const web = buildRelationalWeb('ep-0', nodes, edges, {
      depth: 2,
      maxExpandDegree: null,
      maxNodes: 500,
    });
    expect(web.nodes).toHaveLength(83);
    expect(web.hubs).toEqual([]);
    // Nothing adjacent was left out — the whole component came back.
    expect(web.truncated).toBe(false);
    expect(web.capped).toBeUndefined();
  });

  it('returns only edges whose endpoints are both present', () => {
    // a — b — c — d, walked one hop from b.
    const nodes: N[] = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    const edges: E[] = [
      { from_id: 'a', to_id: 'b' },
      { from_id: 'b', to_id: 'c' },
      { from_id: 'c', to_id: 'd' },
    ];

    const web = buildRelationalWeb('b', nodes, edges, { depth: 1 });
    const ids = new Set(web.nodes.map((n) => n.id));
    expect(ids).toEqual(new Set(['a', 'b', 'c']));

    // c—d touches returned node c and d was never returned. The old walk pushed
    // it anyway, handing the caller a reference it could not resolve and a web
    // that counted denser than the nodes it came with.
    for (const e of web.edges) {
      expect(ids.has(e.from_id), `from ${e.from_id}`).toBe(true);
      expect(ids.has(e.to_id), `to ${e.to_id}`).toBe(true);
    }
    expect(web.edges).toHaveLength(2);
    expect(web.truncated).toBe(true);
  });

  it('never suppresses the centre, however connected it is', () => {
    const { nodes, edges } = chronicle(82);
    // Asking *about* the chronicle is a legitimate question; it must not vanish
    // from its own answer.
    const web = buildRelationalWeb('root', nodes, edges, { depth: 1, maxNodes: 500 });
    expect(web.nodes.map((n) => n.id)).toContain('root');
    expect(web.nodes).toHaveLength(83);
    expect(web.hubs).toEqual([]);
  });

  it('caps a hub-centred web instead of returning the corpus, and says it did', () => {
    const { nodes, edges } = chronicle(82);

    // Suppression protects a walk that ENCOUNTERS a hub and does nothing for one
    // that starts on it — the centre is never suppressed, correctly, because
    // asking about the chronicle is a real question. Measured on the live wheel
    // 2026-09-05, that answer was 157,233 characters: over twice the listing
    // that had just been cut for overrunning the tool-result limit.
    const web = buildRelationalWeb('root', nodes, edges, { depth: 1 });

    expect(web.nodes).toHaveLength(60);
    expect(web.capped).toEqual({ returned: 60, available: 83 });
    // The centre survives the cap. Trimming it to fit would answer a different
    // question than the one asked.
    expect(web.nodes[0].id).toBe('root');
    expect(web.truncated).toBe(true);
  });

  it('falls back to degree for a container nobody has named', () => {
    const nodes: N[] = [{ id: 'hub', metadata: { kind: 'service' } }];
    const edges: E[] = [];
    for (let i = 0; i < 30; i += 1) {
      nodes.push({ id: `n-${i}` });
      edges.push({ from_id: `n-${i}`, to_id: 'hub' });
    }

    const web = buildRelationalWeb('n-0', nodes, edges, { depth: 3 });
    expect(web.nodes.map((n) => n.id).sort()).toEqual(['hub', 'n-0']);
    expect(web.hubs[0]).toMatchObject({ id: 'hub', reason: 'degree', degree: 30 });
  });

  it('does not call a container truncating when nothing sits behind it', () => {
    // A chronicle_root with one child is held by kind and hides nothing. Saying
    // "there is more further out" there is the same false claim as hiding it.
    const nodes: N[] = [
      { id: 'root', metadata: { kind: 'chronicle_root' } },
      { id: 'only' },
    ];
    const edges: E[] = [{ from_id: 'only', to_id: 'root' }];

    const web = buildRelationalWeb('only', nodes, edges, { depth: 2 });
    expect(web.nodes).toHaveLength(2);
    expect(web.hubs[0].unexpanded).toBe(0);
    expect(web.truncated).toBe(false);
  });

  it('counts unexpanded as what no other path reached', () => {
    // ep-0 and ep-1 both hang off root, and are also directly related. Walking
    // from ep-0, ep-1 is reached directly — so it is not "behind" the root.
    const { nodes, edges } = chronicle(3);
    edges.push({ from_id: 'ep-0', to_id: 'ep-1', relationship_type: 'relates_to' });

    const web = buildRelationalWeb('ep-0', nodes, edges, { depth: 2 });
    const held = web.hubs.find((h) => h.id === 'root');
    expect(held).toBeDefined();
    // root has 3 episodes; ep-0 is the centre and ep-1 came another way, so only
    // ep-2 is genuinely hidden behind it. `degree - 1` would have said 2.
    expect(held!.unexpanded).toBe(1);
  });
});
