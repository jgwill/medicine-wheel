/**
 * The memory tools (#149): with MW_API_URL they ask the wheel server and send
 * nothing to Honcho themselves; without it they answer in process over this
 * store. `list_ceremonies` takes the filters REST takes (W7).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const originalApiUrl = process.env.MW_API_URL;
const originalDataDir = process.env.MW_DATA_DIR;
const originalFetch = globalThis.fetch;

let dataDir: string;
let tools: Map<string, (args: any) => Promise<any>>;
const call = (name: string, args: any = {}) => {
  const handler = tools.get(name);
  if (!handler) throw new Error(`tool ${name} is not registered`);
  return handler(args);
};

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-memory-tools-'));
  process.env.MW_DATA_DIR = dataDir;
  delete process.env.MW_API_URL;
  const { allTools } = await import('../src/all-tools.js');
  tools = new Map(allTools.map(t => [t.name, t.handler]));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.MW_API_URL;
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.MW_API_URL; else process.env.MW_API_URL = originalApiUrl;
  if (originalDataDir === undefined) delete process.env.MW_DATA_DIR; else process.env.MW_DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('registration', () => {
  it('registers the six memory tools beside the honcho ones they replace', () => {
    for (const name of ['memory_status', 'memory_ask', 'memory_search', 'memory_about', 'memory_conclude', 'memory_resend', 'honcho_recall']) {
      expect(tools.has(name), name).toBe(true);
    }
  });
});

describe('with MW_API_URL: the server answers', () => {
  it('posts the question and the scope to /api/memory/ask and returns what the wheel says', async () => {
    const hits: { method: string; url: string; body?: any }[] = [];
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      hits.push({ method: init?.method ?? 'GET', url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return new Response(JSON.stringify({ provider: 'honcho', mode: 'dialectic', answer: 'Teal.', sources: [], reach: { ceremonies: ['c1'], episodes: [] } }), { status: 200 });
    }) as typeof fetch;
    process.env.MW_API_URL = 'http://wheel.test/';
    const out = await call('memory_ask', { question: 'What colour?', scope: { subject_id: 'pde:root-1', exclude_ceremonies: ['c0'] } });
    expect(out).toMatchObject({ provider: 'honcho', mode: 'dialectic', answer: 'Teal.' });
    expect(hits).toEqual([{ method: 'POST', url: 'http://wheel.test/api/memory/ask', body: { question: 'What colour?', scope: { subject_id: 'pde:root-1', exclude_ceremonies: ['c0'] } } }]);
  });

  it('reports the server refusing, with its message, instead of an empty answer', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'scope does not know circle' }), { status: 400 })) as typeof fetch;
    process.env.MW_API_URL = 'http://wheel.test';
    const out = await call('memory_search', { query: 'x', scope: { circle: 'a' } });
    expect(out).toMatchObject({ status: 'error', http_status: 400, message: 'scope does not know circle' });
  });

  it('judges a conclusion through PATCH /api/memory/conclusions/:id', async () => {
    const hits: { method: string; url: string; body?: any }[] = [];
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      hits.push({ method: init?.method ?? 'GET', url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return new Response(JSON.stringify({ node: { id: 'k1' } }), { status: 200 });
    }) as typeof fetch;
    process.env.MW_API_URL = 'http://wheel.test';
    await call('memory_conclude', { conclusion_id: 'node:knowledge:1', status: 'confirmed', by: 'node:human:1:mia' });
    expect(hits[0]).toEqual({ method: 'PATCH', url: 'http://wheel.test/api/memory/conclusions/node%3Aknowledge%3A1', body: { status: 'confirmed', by: 'node:human:1:mia' } });
  });
});

describe('without MW_API_URL: answered in process over this store', () => {
  it('asks nothing without a scope, and matches this wheel\'s own records within one', async () => {
    expect((await call('memory_ask', { question: 'lantern' })).status).toBe('error');
    const ceremony = await call('log_ceremony_with_memory', {
      type: 'talking_circle', direction: 'east', participants: ['node:human:1:mia'], medicines_used: [], intentions: ['decide the lantern'],
    });
    await call('create_narrative_beat', { direction: 'east', title: 'Mia speaks', description: 'The lantern is painted teal.', learnings: [], ceremony_ids: [ceremony.ceremony_id] });
    const other = await call('log_ceremony_with_memory', { type: 'talking_circle', direction: 'east', participants: [], medicines_used: [], intentions: ['a teal boat elsewhere'] });
    const out = await call('memory_ask', { question: 'What colour is the lantern? teal', scope: { ceremonies: [ceremony.ceremony_id] } });
    expect(out).toMatchObject({ provider: 'wheel', mode: 'matched' });
    expect(out.reach.ceremonies).toEqual([ceremony.ceremony_id]);
    expect(out.sources.length).toBeGreaterThan(0);
    expect(out.sources.every((s: any) => s.ceremony_id === ceremony.ceremony_id)).toBe(true);
    expect(out.sources.some((s: any) => s.ceremony_id === other.ceremony_id)).toBe(false);
    const empty = await call('memory_ask', { question: 'lantern', scope: { ceremonies: [ceremony.ceremony_id], exclude_ceremonies: [ceremony.ceremony_id] } });
    expect(empty.mode).toBe('empty');
  });

  it('list_ceremonies filters on subject_id, circle_id and episode_path as REST does (W7)', async () => {
    const all = await call('list_ceremonies', {});
    const bySubject = await call('list_ceremonies', { subject_id: 'pde:nothing-here' });
    expect(all.count).toBeGreaterThan(0);
    expect(bySubject.count).toBe(0);
    expect(bySubject.filters).toMatchObject({ subject_id: 'pde:nothing-here' });
  });
});
