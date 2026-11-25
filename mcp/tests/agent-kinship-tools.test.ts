/**
 * Agent kinship through the MCP door, end to end against a temporary JSONL
 * store (rispecs/agent-kinship.spec.md). MW_API_URL is deleted before the
 * store singleton is built: on this host it points at the live chronicle
 * wheel, and a test that wrote there would be registering fixtures as persons.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const originalApiUrl = process.env.MW_API_URL;
const originalDataDir = process.env.MW_DATA_DIR;

let dataDir: string;
let tools: Map<string, (args: any) => Promise<any>>;
let store: any;

const call = (name: string, args: any = {}) => {
  const handler = tools.get(name);
  if (!handler) throw new Error(`tool ${name} is not registered`);
  return handler(args);
};

const seat = (id: string, name: string, type: 'human' | 'agent', role: string) => ({
  id, name, type, metadata: { kind: 'person', role, api_access: false }, created_at: '2026-11-24T20:00:00.000Z', updated_at: '2026-11-24T20:00:00.000Z',
});
const ADA = 'node:human:ada';
const NOOR = 'node:human:noor';
const SOL = 'node:agent:sol';
const LUMA = 'node:agent:luma';
const CIRCLE = 'circle:ada';

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-agent-kinship-tools-'));
  process.env.MW_DATA_DIR = dataDir;
  delete process.env.MW_API_URL;

  const { allTools } = await import('../src/all-tools.js');
  tools = new Map(allTools.map(t => [t.name, t.handler]));
  ({ store } = await import('../src/store.js'));

  store.createNode(seat(ADA, 'Ada', 'human', 'ceremony_facilitator'));
  store.createNode(seat(NOOR, 'Noor', 'human', 'participant'));
  store.createNode(seat(SOL, 'Sol', 'agent', 'companion_ai'));
  store.createNode(seat(LUMA, 'Luma', 'agent', 'companion_ai'));
  store.createNode({ id: CIRCLE, name: "Ada's circle", type: 'circle', metadata: { kind: 'circle', intention: 'to talk', facilitator_id: ADA }, created_at: '2026-11-24T20:00:00.000Z', updated_at: '2026-11-24T20:00:00.000Z' });
  store.createEdge({ from_id: ADA, to_id: CIRCLE, relationship_type: 'member_of', strength: 1, ceremony_honored: false, obligations: ['facilitate', 'hold the space'], created_at: '2026-11-24T20:00:00.000Z' });
}, 60000);

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.MW_API_URL;
  else process.env.MW_API_URL = originalApiUrl;
  if (originalDataDir === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('agent kinship tools', () => {
  it('the four tools are registered', () => {
    for (const name of ['define_agent', 'relate_agent', 'get_agent_kinship', 'get_circle_agent_readers']) expect(tools.has(name)).toBe(true);
  });

  it('define_agent: a person defines an agent they made, node and relations together', async () => {
    const made = await call('define_agent', {
      agent: { id: 'node:agent:wren', name: 'Wren', role: 'companion_ai' },
      comes_from: [{ person_id: ADA, words: 'I made Wren in the autumn of 2026.', said_by: ADA }],
      serves: [{ person_id: ADA, words: 'Wren works with me.', said_by: ADA, grants: [{ kind: 'see_circles', scope: 'facilitated' }] }],
    });
    expect(made.status, JSON.stringify(made)).toBe('created');
    expect(made.node).toMatchObject({ id: 'node:agent:wren', type: 'agent' });
    expect(store.getNode('node:agent:wren')).toMatchObject({ name: 'Wren', type: 'agent' });

    // Origin and service run between the same two seats in the same direction: both are kept.
    const between = store.getAllEdges().filter((e: any) => e.from_id === 'node:agent:wren' && e.to_id === ADA);
    expect(between.map((e: any) => e.kinship_type).sort()).toEqual(['BORN_FROM', 'SERVES']);

    const read = await call('get_agent_kinship', { node_id: 'node:agent:wren' });
    expect(read).toMatchObject({
      status: 'ok',
      person: { name: 'Wren', being: 'agent' },
      comes_from: [{ person_id: ADA, words: 'I made Wren in the autumn of 2026.', said_by: ADA }],
      serves: [{ person_id: ADA, grants: [{ kind: 'see_circles', scope: 'facilitated' }] }],
      sees_circles: [{ circle_id: CIRCLE, through_person_id: ADA, sees: true }],
      seats: { [ADA]: { name: 'Ada', being: 'human' } },
    });
  });

  it('define_agent writes nothing when a person it names is not on the wheel', async () => {
    const refused = await call('define_agent', {
      agent: { id: 'node:agent:ghost', name: 'Ghost', role: 'companion_ai' },
      comes_from: [{ person_id: 'node:human:nobody', words: 'I made Ghost.', said_by: ADA }],
    });
    expect(refused.status).toBe('error');
    expect(refused.issues).toEqual(['comes_from.0.person_id: no node node:human:nobody on the wheel']);
    expect(store.getNode('node:agent:ghost')).toBeUndefined();
    expect((await call('define_agent', { agent: { name: 'Ghost', role: 'companion_ai' } })).status).toBe('error');
  });

  it('relate_agent: an existing agent is related to its person; two persons can hold responsibility', async () => {
    const origin = await call('relate_agent', { agent_id: SOL, comes_from: [{ person_id: ADA, words: 'Sol came out of my work on the wheel.', said_by: ADA }] });
    expect(origin.status, JSON.stringify(origin)).toBe('related');

    const held = await call('relate_agent', {
      agent_id: SOL,
      responsibility_held_by: [
        { person_id: NOOR, words: 'I answer for Sol while Ada is away.', said_by: NOOR },
        { person_id: ADA, words: "I answer for Sol's work on the episodes.", said_by: ADA },
      ],
    });
    expect(held.status, JSON.stringify(held)).toBe('related');
    expect(held.kinship.comes_from.map((r: any) => r.person_id)).toEqual([ADA]);
    expect(held.kinship.responsibility_held_by.map((r: any) => r.person_id).sort()).toEqual([ADA, NOOR].sort());

    const noor = await call('get_agent_kinship', { node_id: NOOR });
    expect(noor).toMatchObject({ gave_rise_to: [], holds_responsibility_for: [{ agent_id: SOL, words: 'I answer for Sol while Ada is away.' }] });
  });

  it('relate_agent: two agents speak with each other, with a context and a state', async () => {
    const proposed = await call('relate_agent', { agent_id: SOL, speaks_with: [{ agent_id: LUMA, words: 'About how we keep notes.', said_by: SOL }] });
    expect(proposed.kinship.speaks_with).toMatchObject([{ agent_id: LUMA, state: 'proposed' }]);

    const unauthorized = await call('relate_agent', { agent_id: LUMA, speaks_with: [{ agent_id: SOL, state: 'active', state_set_by: ADA }] });
    expect(unauthorized.status).toBe('error');
    expect(unauthorized.issues[0]).toContain('authorized_by');

    const active = await call('relate_agent', { agent_id: LUMA, speaks_with: [{ agent_id: SOL, state: 'active', authorized_by: ADA, state_set_by: ADA, valid_when: 'about the notes of an episode both sit in' }] });
    expect(active.status, JSON.stringify(active)).toBe('related');
    expect((await call('get_agent_kinship', { node_id: SOL })).speaks_with).toMatchObject([
      { agent_id: LUMA, words: 'About how we keep notes.', said_by: SOL, state: 'active', state_set_by: ADA, authorized_by: ADA, valid_when: 'about the notes of an episode both sit in' },
    ]);
    expect(store.getAllEdges().filter((e: any) => e.kinship_type === 'speaks-with')).toHaveLength(1);
  });

  it('relate_agent refuses a missing agent, a person as the agent, and an empty statement', async () => {
    expect((await call('relate_agent', { agent_id: 'node:agent:nobody', comes_from: [{ person_id: ADA, words: 'x', said_by: ADA }] })).status).toBe('error');
    expect((await call('relate_agent', { agent_id: NOOR, comes_from: [{ person_id: ADA, words: 'x', said_by: ADA }] })).issues[0]).toContain("not an agent's seat");
    expect((await call('relate_agent', { agent_id: SOL })).status).toBe('error');
    expect((await call('relate_agent', { comes_from: [] })).issues).toEqual(['agent_id: required']);
  });

  it("get_circle_agent_readers: what a circle's page shows", async () => {
    const readers = await call('get_circle_agent_readers', { circle_id: CIRCLE });
    expect(readers).toMatchObject({
      status: 'ok',
      circle: { id: CIRCLE, name: "Ada's circle" },
      agent_readers: null,
      when_unset: 'facilitator',
      readers: [{ agent_id: 'node:agent:wren', through_person_id: ADA, scope: 'facilitated', sees: true, sits_in_circle: false }],
    });
    expect((await call('get_circle_agent_readers', { circle_id: ADA })).status).toBe('error');
    expect((await call('get_agent_kinship', { node_id: CIRCLE })).status).toBe('error');
  });

  it('create_relational_edge carries a kinship type and a context, and refuses a name the registry does not govern', async () => {
    const made = await call('create_relational_edge', {
      from_node_id: LUMA, to_node_id: NOOR, relationship_type: 'tends-to', kinship_type: 'tends-to',
      description: "Luma looks after Noor's notes.", context: { stated_by: NOOR },
    });
    expect(made.status, JSON.stringify(made)).toBe('created');
    const plain = await call('create_relational_edge', { from_node_id: LUMA, to_node_id: NOOR, relationship_type: 'works-beside' });
    expect(plain.status).toBe('created');
    const between = store.getAllEdges().filter((e: any) => e.from_id === LUMA && e.to_id === NOOR);
    expect(between.map((e: any) => e.kinship_type ?? null).sort()).toEqual(['tends-to', null].sort());
    expect(between.find((e: any) => e.kinship_type === 'tends-to').context).toEqual({ stated_by: NOOR });

    expect((await call('create_relational_edge', { from_node_id: LUMA, to_node_id: NOOR, relationship_type: 'owned-by', kinship_type: 'owned-by' })).status).toBe('error');
    expect((await call('create_relational_edge', { from_node_id: LUMA, to_node_id: NOOR, relationship_type: 'helps', kinship_type: 'tends-to' })).status).toBe('error');
    expect((await call('create_relational_edge', { from_node_id: LUMA, to_node_id: NOOR, relationship_type: 'tends-to', kinship_type: 'tends-to', context: { owner: NOOR } })).status).toBe('error');
  });

  it('RV3: create_relational_edge leaves the four agent-kinship edges to the kinship tools', async () => {
    const created = await call('create_relational_edge', { from_node_id: LUMA, to_node_id: ADA, relationship_type: 'BORN_FROM', kinship_type: 'BORN_FROM', context: { stated_by: NOOR } });
    expect(created.status).toBe('error');
    expect(created.message).toContain('relate_agent');
    expect(store.getAllEdges().filter((e: any) => e.from_id === LUMA && e.to_id === ADA)).toEqual([]);

    // One that exists: its context and its words stay with the kinship tools; a ceremony's re-post passes.
    const existing = store.getAllEdges().find((e: any) => e.kinship_type === 'BORN_FROM' && e.from_id === SOL && e.to_id === ADA);
    const changed = await call('create_relational_edge', { from_node_id: SOL, to_node_id: ADA, relationship_type: 'BORN_FROM', kinship_type: 'BORN_FROM', context: { stated_by: NOOR } });
    expect(changed.status).toBe('error');
    const reworded = await call('create_relational_edge', { from_node_id: SOL, to_node_id: ADA, relationship_type: 'BORN_FROM', kinship_type: 'BORN_FROM', description: 'Someone else made Sol.' });
    expect(reworded.status).toBe('error');
    const honoured = await call('create_relational_edge', { from_node_id: SOL, to_node_id: ADA, relationship_type: 'BORN_FROM', kinship_type: 'BORN_FROM', strength: 0.9 });
    expect(honoured.status, JSON.stringify(honoured)).toBe('created');
    const after = store.getAllEdges().find((e: any) => e.kinship_type === 'BORN_FROM' && e.from_id === SOL && e.to_id === ADA);
    expect(after).toMatchObject({ description: existing.description, context: existing.context, strength: 0.9, created_at: existing.created_at });
  });

  it('RV5: a governed edge written again through create_relational_edge keeps the date it was first written', async () => {
    const first = await call('create_relational_edge', { from_node_id: SOL, to_node_id: LUMA, relationship_type: 'tends-to', kinship_type: 'tends-to', description: 'first' });
    expect(first.status, JSON.stringify(first)).toBe('created');
    const since = store.getAllEdges().find((e: any) => e.kinship_type === 'tends-to' && e.from_id === SOL).created_at;
    await new Promise((resolve) => setTimeout(resolve, 15));
    const again = await call('create_relational_edge', { from_node_id: SOL, to_node_id: LUMA, relationship_type: 'tends-to', kinship_type: 'tends-to', description: 'second' });
    expect(again.status).toBe('created');
    expect(store.getAllEdges().find((e: any) => e.kinship_type === 'tends-to' && e.from_id === SOL)).toMatchObject({ description: 'second', created_at: since });
  });
});
