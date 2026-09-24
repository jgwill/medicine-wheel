/**
 * jgwill/medicine-wheel#144 — the MCP's ceremony tools write the typed binding
 * the server reads since 0.14.0: `episode_path`, `circle_id`, and `closes` on
 * a closing.
 */
import { describe, it, expect } from 'vitest';
import { allTools } from '../src/all-tools.js';
import { store } from '../src/store.js';

function findTool(name: string) {
  const tool = allTools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found in allTools registry`);
  return tool;
}

const EPISODE = '2026-09-17-episode-349-miadi-conducts-a-ceremony-its-circle-can-enter';
const CIRCLE = 'circle:1789740793835:nktr8r';

describe('jgwill/medicine-wheel#144 — ceremony binding through the MCP', () => {
  it('mw_ceremony_open stores type, episode_path, episode_number and circle_id', async () => {
    const opened = await findTool('mw_ceremony_open').handler({
      intention: 'Hold a talking circle for the episode',
      type: 'talking_circle',
      episode_path: EPISODE,
      circle_id: CIRCLE,
    });
    expect(opened.status).toBe('opened');
    expect(opened.type).toBe('talking_circle');
    expect(opened.episode_path).toBe(EPISODE);
    const stored = await store.getCeremony(opened.ceremony_id);
    expect(stored).toMatchObject({ type: 'talking_circle', episode_path: EPISODE, episode_number: 349, circle_id: CIRCLE });
  });

  it('mw_ceremony_open keeps opening as the default type and writes no binding when none is given', async () => {
    const opened = await findTool('mw_ceremony_open').handler({ intention: 'Unbound opening' });
    const stored = await store.getCeremony(opened.ceremony_id);
    expect(stored?.type).toBe('opening');
    expect(stored?.episode_path).toBeUndefined();
    expect(stored?.circle_id).toBeUndefined();
  });

  it('mw_ceremony_open refuses a malformed episode_path before writing', async () => {
    const result = await findTool('mw_ceremony_open').handler({ intention: 'Bad binding', episode_path: '../etc' });
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/Invalid episode_path/);
  });

  it('mw_ceremony_close names what it closes and keeps the binding', async () => {
    const opened = await findTool('mw_ceremony_open').handler({
      intention: 'To be closed',
      type: 'talking_circle',
      episode_path: EPISODE,
      circle_id: CIRCLE,
    });
    const closed = await findTool('mw_ceremony_close').handler({ ceremony_id: opened.ceremony_id, learnings: ['one learning'] });
    expect(closed.status).toBe('closed');
    const closing = await store.getCeremony(closed.closing_id);
    expect(closing).toMatchObject({ type: 'closing', closes: opened.ceremony_id, episode_path: EPISODE, circle_id: CIRCLE });
  });

  it('mw_ceremony_open and close carry subject_id, the node the ceremony is held about (0.15.6, #146)', async () => {
    const SUBJECT = 'review:1e1ba57a-9e30-41ea-8126-5735c3f344bd';
    const opened = await findTool('mw_ceremony_open').handler({ intention: 'Discuss the review', type: 'talking_circle', episode_path: EPISODE, subject_id: SUBJECT });
    expect(opened.status).toBe('opened');
    expect(await store.getCeremony(opened.ceremony_id)).toMatchObject({ subject_id: SUBJECT, episode_path: EPISODE });
    const closed = await findTool('mw_ceremony_close').handler({ ceremony_id: opened.ceremony_id });
    expect(await store.getCeremony(closed.closing_id)).toMatchObject({ closes: opened.ceremony_id, subject_id: SUBJECT });
    const refused = await findTool('mw_ceremony_open').handler({ intention: 'x', subject_id: 42 });
    expect(refused.status).toBe('error');
  });

  it('log_ceremony_with_memory stores the binding and the relations honoured', async () => {
    const logged = await findTool('log_ceremony_with_memory').handler({
      type: 'talking_circle',
      direction: 'west',
      participants: ['node:human:a'],
      medicines_used: [],
      intentions: ['Speak in turn'],
      relations_honored: ['node:human:a'],
      episode_path: EPISODE,
      circle_id: CIRCLE,
    });
    expect(logged.logged_to_memory).toBe(true);
    const stored = await store.getCeremony(logged.ceremony_id);
    expect(stored).toMatchObject({ episode_path: EPISODE, circle_id: CIRCLE, relations_honored: ['node:human:a'] });
  });
});
