/**
 * The Honcho door through MCP — a wheel record leaving for Honcho, a peer
 * recalled, a conclusion returning as a knowledge node.
 *
 * Honcho is stubbed at `fetch`: the test pins what the tools SEND (ids mapped,
 * wheel ids in metadata, session keyed by ceremony) and how they answer when
 * nothing is configured, not what a live deriver would reason.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const originalApiUrl = process.env.MW_API_URL;
const originalDataDir = process.env.MW_DATA_DIR;
const originalHoncho = process.env.HONCHO_URL;
const originalFetch = globalThis.fetch;

let dataDir: string;
let tools: Map<string, (args: any) => Promise<any>>;
type Hit = { method: string; path: string; body?: any };
let hits: Hit[] = [];

const call = (name: string, args: any = {}) => {
  const handler = tools.get(name);
  if (!handler) throw new Error(`tool ${name} is not registered`);
  return handler(args);
};

function stubHoncho(): void {
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const u = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    hits.push({ method, path: u.pathname + u.search, body });
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
    if (u.pathname === '/health') return json({ status: 'ok' });
    if (u.pathname.endsWith('/messages')) return json(body.messages.map((m: any, i: number) => ({ id: `m${i}`, ...m })), 201);
    if (u.pathname.endsWith('/representation')) return json({ representation: u.pathname.includes('/ghost/') ? '' : 'sensitive to workflow complexity' });
    if (u.pathname.endsWith('/chat')) return json({ content: 'Keep it small.' });
    return json({ id: body?.id ?? 'x' });
  }) as typeof fetch;
}

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-honcho-tools-'));
  process.env.MW_DATA_DIR = dataDir;
  delete process.env.MW_API_URL;
  const { allTools } = await import('../src/all-tools.js');
  tools = new Map(allTools.map(t => [t.name, t.handler]));
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.MW_API_URL; else process.env.MW_API_URL = originalApiUrl;
  if (originalDataDir === undefined) delete process.env.MW_DATA_DIR; else process.env.MW_DATA_DIR = originalDataDir;
  if (originalHoncho === undefined) delete process.env.HONCHO_URL; else process.env.HONCHO_URL = originalHoncho;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('registration', () => {
  it('registers the four Honcho tools', () => {
    for (const name of ['honcho_status', 'honcho_project', 'honcho_recall', 'honcho_project_back']) {
      expect(tools.has(name), `${name} missing from allTools`).toBe(true);
    }
  });
});

describe('unconfigured', () => {
  it('names HONCHO_URL instead of pretending', async () => {
    delete process.env.HONCHO_URL;
    for (const name of ['honcho_status', 'honcho_recall']) {
      const out = await call(name, { peer: 'x' });
      expect(out.status).toBe('unconfigured');
      expect(out.message).toContain('HONCHO_URL');
    }
    const out = await call('honcho_project', { beat_id: 'b' });
    expect(out.status).toBe('unconfigured');
  });
});

describe('configured against a stubbed Honcho', () => {
  beforeAll(() => {
    process.env.HONCHO_URL = 'http://honcho.test';
    process.env.HONCHO_WORKSPACE_ID = 'wheel-test';
    stubHoncho();
  });

  it('status reports the door and the health', async () => {
    const out = await call('honcho_status');
    expect(out).toMatchObject({ status: 'ok', url: 'http://honcho.test', workspace: 'wheel-test', health: { status: 'ok' } });
  });

  it('projects a ceremony and a beat into the ceremony\'s session, ids mapped, wheel ids in metadata', async () => {
    const ceremony = await call('log_ceremony_with_memory', {
      type: 'talking_circle', direction: 'east',
      participants: ['node:human:1:gui', 'Éloïse'], medicines_used: ['cedar'], intentions: ['hold the practice'],
    });
    const beat = await call('create_narrative_beat', {
      direction: 'east', title: 'Guillaume speaks', description: 'A daily practice is hard to hold.',
      learnings: ['small steps persist'], ceremony_ids: [ceremony.ceremony_id],
    });
    expect(beat.beat_id ?? beat.beat?.id).toBeTruthy();
    const beatId = beat.beat_id ?? beat.beat.id;

    hits = [];
    const out = await call('honcho_project', { ceremony_id: ceremony.ceremony_id, beat_id: beatId });
    expect(out.status).toBe('projected');
    expect(out.projections).toHaveLength(2);
    const session = out.projections[0].session_id;
    expect(session).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(out.projections[1].session_id).toBe(session);

    const peers = hits.filter(h => h.path === '/v3/workspaces/wheel-test/peers').map(h => h.body);
    expect(peers).toContainEqual({ id: 'node-human-1-gui', metadata: { wheel_id: 'node:human:1:gui' } });
    expect(peers).toContainEqual({ id: 'Eloise', metadata: { wheel_id: 'Éloïse' } });
    const messages = hits.filter(h => h.path.endsWith('/messages')).flatMap(h => h.body.messages);
    expect(messages).toHaveLength(2);
    expect(messages[0].metadata).toMatchObject({ wheel_kind: 'ceremony', wheel_id: ceremony.ceremony_id });
    expect(messages[1].metadata).toMatchObject({ wheel_kind: 'beat', wheel_id: beatId });
    expect(messages[1].content).toContain('[east] Guillaume speaks');
  });

  it('refuses to project what is not on the wheel', async () => {
    const out = await call('honcho_project', { beat_id: 'beat:ghost' });
    expect(out.status).toBe('error');
    expect(out.message).toContain('beat:ghost');
    expect((await call('honcho_project', {})).status).toBe('error');
  });

  it('recalls a representation by wheel id, notes an empty one, and asks the dialectic when given a question', async () => {
    const rep = await call('honcho_recall', { peer: 'node:human:1:gui' });
    expect(rep).toMatchObject({ status: 'ok', peer: 'node-human-1-gui', representation: 'sensitive to workflow complexity' });
    expect(rep.note).toBeUndefined();
    const empty = await call('honcho_recall', { peer: 'ghost' });
    expect(empty.representation).toBe('');
    expect(empty.note).toContain('not observed');
    hits = [];
    const ask = await call('honcho_recall', { peer: 'node:human:1:gui', question: 'what persists?', session_id: 'ceremony:1:tc', reasoning_level: 'minimal' });
    expect(ask.answer).toBe('Keep it small.');
    expect(hits[0].body).toMatchObject({ query: 'what persists?', session_id: 'ceremony-1-tc', reasoning_level: 'minimal' });
  });

  it('projects a conclusion back as a knowledge node the wheel can read, kind memory_projection', async () => {
    const out = await call('honcho_project_back', {
      peer_id: 'node:human:1:gui', kind: 'pattern', content: 'Small, low-friction tasks persist.',
      source_event_ids: ['beat:1'], derived_by: 'dialectic',
    });
    expect(out.status).toBe('created');
    const node = await call('get_relational_node', { node_id: out.node_id });
    const found = node.node ?? node;
    expect(found.type).toBe('knowledge');
    expect(found.metadata).toMatchObject({ kind: 'memory_projection', status: 'inferred', peer_id: 'node-human-1-gui', source_event_ids: ['beat:1'], derived_by: 'dialectic' });
    const listed = await call('list_relational_nodes', { kind: 'memory_projection' });
    const ids = (listed.nodes ?? listed.items ?? []).map((n: any) => n.id);
    expect(ids).toContain(out.node_id);
  });
});
