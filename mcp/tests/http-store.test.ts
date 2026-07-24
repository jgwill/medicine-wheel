/**
 * HttpStore Transport Hardening
 *
 * The deployed MCP server runs with MW_API_URL set, so every tool call in
 * production travels this adapter. These tests pin the behaviours that keep a
 * failed request from being reported to the circle as a success.
 *
 * @see mcp/src/http-store.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpStore, HttpStoreError } from '../src/http-store.js';

const BASE = 'http://mw.test';

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Route table keyed by the first matching path fragment. */
function stubFetch(routes: Record<string, Route>): void {
  globalThis.fetch = ((input: any, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(routes).find(k => url.includes(k));
    if (!key) {
      return Promise.resolve(new Response('no route', { status: 404, statusText: 'Not Found' }));
    }
    return Promise.resolve(routes[key](url, init));
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;
const originalTimeout = process.env.MW_HTTP_TIMEOUT_MS;

let store: HttpStore;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  store = new HttpStore(BASE);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalTimeout === undefined) delete process.env.MW_HTTP_TIMEOUT_MS;
  else process.env.MW_HTTP_TIMEOUT_MS = originalTimeout;
  consoleError.mockRestore();
});

const CYCLE = {
  id: 'cycle-1700000000000-abcdef',
  research_question: 'What does the water remember?',
  current_direction: 'east',
  start_date: '2026-07-24T00:00:00.000Z',
  ceremonies_conducted: 0,
  relations_mapped: 0,
  wilson_alignment: 0,
  ocap_compliant: false,
  archived: false,
};

const BEAT = {
  id: 'beat:east:1700000000000',
  direction: 'east',
  title: 'Opening',
  description: 'The circle opens',
  ceremonies: [],
  learnings: [],
  timestamp: '2026-07-24T00:00:00.000Z',
  act: 1,
  relations_honored: [],
};

// ── Writes that do not land ──

describe('HttpStore write accountability', () => {
  it('surfaces a rejected write to a caller that awaits it', async () => {
    // The live shape of this defect: /api/narrative/cycles treats a body
    // carrying an id as an amendment and 404s when the cycle is new.
    stubFetch({
      '/api/narrative/cycles': () =>
        json({ error: `Cycle ${CYCLE.id} not found` }, 404),
    });

    await expect(store.createCycle(CYCLE)).rejects.toThrow(/404/);
  });

  it('records a failed write that no caller awaited', async () => {
    stubFetch({ '/api/narrative/beats': () => json({ error: 'boom' }, 500) });

    store.createBeat(BEAT); // statement call, exactly as the tool layer writes it
    await store.settleWrites();

    const failures = store.getWriteFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0].operation).toBe('createBeat');
    expect(failures[0].url).toBe(`${BASE}/api/narrative/beats`);
    expect(failures[0].message).toMatch(/500/);
  });

  it('leaves no unhandled rejection behind when a write is ignored', async () => {
    stubFetch({ '/api/nodes': () => json({ error: 'boom' }, 500) });

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      store.createNode({
        id: 'node:human:1',
        type: 'human',
        name: 'Elder',
        created_at: BEAT.timestamp,
        updated_at: BEAT.timestamp,
      });
      await store.settleWrites();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(store.getWriteFailures()).toHaveLength(1);
  });

  it('records nothing when the write lands', async () => {
    stubFetch({ '/api/narrative/beats': () => json(BEAT, 201) });

    await expect(store.createBeat(BEAT)).resolves.toBeUndefined();
    expect(store.getWriteFailures()).toEqual([]);
  });

  it('takeWriteFailures drains the record', async () => {
    stubFetch({ '/api/charts': () => json({ error: 'boom' }, 500) });

    store.saveChart({
      id: 'chart-1',
      desired_outcome: 'x',
      current_reality: 'y',
      direction: 'east',
      action_steps: [],
      created_at: BEAT.timestamp,
      updated_at: BEAT.timestamp,
      phase: 'germination',
      ceremonies_linked: [],
    });
    await store.settleWrites();

    expect(store.takeWriteFailures()).toHaveLength(1);
    expect(store.getWriteFailures()).toEqual([]);
  });

  it('treats an archive that found no cycle as a failed write', async () => {
    stubFetch({ '/api/narrative/cycles': () => json([], 200) });

    store.archiveCycle('cycle-missing');
    await store.settleWrites();

    const failures = store.getWriteFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0].operation).toBe('archiveCycle');
    expect(failures[0].message).toMatch(/cycle-missing/);
  });
});

// ── Reads that hang, lie, or drift ──

describe('HttpStore read robustness', () => {
  it('gives up on a server that accepts the request and never answers', async () => {
    process.env.MW_HTTP_TIMEOUT_MS = '50';
    globalThis.fetch = ((_input: any, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })) as typeof fetch;

    await expect(store.getAllNodes()).rejects.toThrow(/timed out after 50ms/);
  }, 2000);

  it('names the endpoint when a proxy answers 200 with HTML', async () => {
    stubFetch({
      '/api/nodes': () =>
        new Response('<!DOCTYPE html><html><body>Bad Gateway</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    });

    await expect(store.getAllNodes()).rejects.toThrow(/non-JSON/);
    await expect(store.getAllNodes()).rejects.toThrow(/api\/nodes/);
  });

  it('reads a collection whether the server wraps it or not', async () => {
    const node = {
      id: 'node:human:1',
      type: 'human',
      name: 'Elder',
      created_at: BEAT.timestamp,
      updated_at: BEAT.timestamp,
    };

    stubFetch({ '/api/nodes': () => json([node]) }); // bare array
    expect(await store.getAllNodes()).toHaveLength(1);

    stubFetch({ '/api/nodes': () => json({ nodes: [node], count: 1 }) }); // wrapped
    expect(await store.getAllNodes()).toHaveLength(1);

    stubFetch({ '/api/edges': () => json({ edges: [] }) }); // wrapped where an array was assumed
    expect(await store.getEdgesForNode('node:human:1')).toEqual([]);
  });

  it('refuses to report an unreadable payload as an empty collection', async () => {
    stubFetch({ '/api/nodes': () => json({ ok: true }) });

    await expect(store.getAllNodes()).rejects.toThrow(/expected an array or \{ nodes/);
  });

  it('lets a broken charts endpoint fail loudly but tolerates an absent one', async () => {
    stubFetch({ '/api/charts': () => json({ error: 'disk on fire' }, 500) });
    await expect(store.getAllCharts()).rejects.toThrow(/500/);

    stubFetch({ '/api/charts': () => json({ error: 'not found' }, 404) });
    expect(await store.getAllCharts()).toEqual([]);
  });

  it('lets a broken mmots endpoint fail loudly but tolerates an absent one', async () => {
    stubFetch({ '/api/mmots': () => json({ error: 'disk on fire' }, 500) });
    await expect(store.getMmotsByChart('chart-1')).rejects.toThrow(/500/);

    stubFetch({ '/api/mmots': () => json({ error: 'not found' }, 404) });
    expect(await store.getMmotsByChart('chart-1')).toEqual([]);
  });

  it('carries the HTTP status on the error so callers can tell absent from broken', async () => {
    stubFetch({ '/api/nodes': () => json({ error: 'nope' }, 503) });

    const error = await store.getAllNodes().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpStoreError);
    expect((error as HttpStoreError).status).toBe(503);
    expect((error as HttpStoreError).url).toBe(`${BASE}/api/nodes`);
  });
});
