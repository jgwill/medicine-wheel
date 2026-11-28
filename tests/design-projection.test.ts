import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCapabilityMap, scanRepository, stateCapability, writeCapabilityFile } from '../src/developer-repository-mapping/src/node/capability-scan';
import { buildDesignProjection } from '../src/developer-repository-mapping/src/node/design-projection';

const repository = 'jgwill/miadi-orchestration-kit';
const settings = { namespace: 'miadi.kit', name: 'Film review' };
const filmPath = 'rispecs/agents-in-the-programs';
const companionPath = 'rispecs/mia-episode-companion';
const film = `${filmPath}/agents-in-the-programs.sysdf.json`;
const companion = `${companionPath}/mia-episode-companion.sysdf.json`;
const filmDrawing = `${filmPath}/review-a-proposal.sqdf.json`;
const companionDrawing = `${companionPath}/reply-to-a-take.sqdf.json`;
const source = (file: string, revision?: string) => `rise://${repository}/${file}${revision ? `@${revision}` : ''}`;
const scanOptions = { ref: 'HEAD', observedBy: 'Test reader' };
let clone: string;

function git(...args: string[]): string {
  return execFileSync('git', ['-C', clone, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function write(path: string, doc: unknown) {
  const at = join(clone, path);
  mkdirSync(dirname(at), { recursive: true });
  writeFileSync(at, JSON.stringify(doc));
}

function commit(): string {
  git('add', '--all');
  git('commit', '-m', 'Record source');
  return git('rev-parse', 'HEAD');
}

function writeSystem(path: string, ...members: string[]) {
  write(path, { settings, members: members.map((file) => ({ path: file })) });
}

function writeSequence(file: string) {
  write(file, { settings, participants: [], messages: [] });
}

async function enroll(name: string, systems: string[]) {
  await stateCapability(clone, { kind: 'plugin', name, by: 'Test reader', path: `claude/${name}`, systems });
}

beforeEach(() => {
  clone = mkdtempSync(join(tmpdir(), 'mw-design-projection-'));
  git('init');
  git('config', 'user.name', 'Design projection tests');
  git('config', 'user.email', 'design-tests@example.test');
  git('remote', 'add', 'origin', `https://github.com/${repository}.git`);
  for (const name of ['miadi-film', 'mia-episode-companion']) {
    write(`claude/${name}/.claude-plugin/plugin.json`, { name, version: '0.1.0' });
  }
});

afterEach(() => rmSync(clone, { recursive: true, force: true }));

describe('the design projection of mapped capabilities', () => {
  it('projects both plugin systems and their sequence drawings from the pinned commit', async () => {
    writeSystem(film, 'review-a-proposal.sqdf.json');
    writeSystem(companion, './reply-to-a-take.sqdf.json');
    writeSequence(filmDrawing);
    writeSequence(companionDrawing);
    const pinned = commit();
    git('update-ref', 'refs/remotes/origin/main', pinned);

    await writeCapabilityFile(clone, await scanRepository(clone, scanOptions), { write: true });
    await enroll('miadi-film', [source(film, pinned)]);
    await enroll('mia-episode-companion', [source(companion, pinned)]);
    const mapRevision = commit();
    // An uncommitted edit cannot replace a published source.
    write(film, { settings, members: [] });

    const map = await buildCapabilityMap([clone], scanOptions);
    const projection = await buildDesignProjection(map);
    expect(projection.issues).toEqual([]);
    expect(map.repositories[0]?.commit).toBe(mapRevision);
    const systemId = `system:${repository}/${film}`;
    const drawingId = `diagram:${repository}/${filmDrawing}`;
    const systems = projection.nodes.filter((node) => node.metadata.kind === 'system');
    expect(systems.map((node) => node.id)).toEqual([systemId, `system:${repository}/${companion}`]);
    expect(systems.every((system) => system.type === 'knowledge' && system.direction === undefined)).toBe(true);
    expect(systems[0]?.metadata).toMatchObject({
      namespace: settings.namespace,
      source_ref: source(film, pinned),
      source_url: `https://github.com/${repository}/blob/${pinned}/${film}`,
    });
    expect(projection.nodes.find((node) => node.id === drawingId)?.metadata).toMatchObject({
      drawingKind: 'sequence', source_ref: source(filmDrawing, pinned),
    });
    expect(projection.nodes.map((node) => node.id)).toContain('capability:plugin-miadi-film');
    expect(projection.edges).toHaveLength(4);
    expect(projection.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from_id: drawingId, to_id: systemId, relationship_type: 'member-of', kinship_type: 'member-of' }),
      expect.objectContaining({ from_id: 'capability:plugin-miadi-film', to_id: systemId, relationship_type: 'drawn-by' }),
    ]));
    expect(await buildDesignProjection(map)).toEqual(projection);
  });

  it('keeps existing nodes and useful diagnostics while refusing invalid, absent, or unsafe links', async () => {
    writeSystem(film, 'review-a-proposal.sqdf.json', './review-a-proposal.sqdf.json', '../outside.sqdf.json',
      '/absolute.sqdf.json', 'untracked.sqdf.json', 'wrong.sqdf.json', 'symlink.sqdf.json', 'nested.sysdf.json');
    writeSequence(filmDrawing);
    writeSequence('rispecs/outside.sqdf.json');
    write(`${filmPath}/wrong.sqdf.json`, { settings, entities: [] });
    symlinkSync('review-a-proposal.sqdf.json', join(clone, filmPath, 'symlink.sqdf.json'));
    const pinned = commit();
    writeSequence(`${filmPath}/untracked.sqdf.json`);
    await writeCapabilityFile(clone, await scanRepository(clone, scanOptions), { write: true });
    await enroll('miadi-film', [source(film, pinned), source(companion, pinned), source(film, 'missing-branch')]);
    commit();

    const map = await buildCapabilityMap([clone], scanOptions);
    const contributor = map.capabilities.find((c) => c.nodeId === 'capability:plugin-miadi-film')!;
    contributor.systems?.push('rise://unknown/clone/missing.sysdf.json', 'file:///tmp/missing.sysdf.json');
    const projection = await buildDesignProjection(map);
    expect(projection.nodes).toHaveLength(3);
    expect(projection.edges).toHaveLength(2);
    const system = projection.nodes.find((node) => node.metadata.kind === 'system');
    expect(system?.metadata.source_ref).toBe(source(film, pinned));
    expect(system?.metadata.source_url).toBeUndefined();
    expect(projection.issues).toHaveLength(11);
    expect(projection.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: filmDrawing, message: 'duplicate system member' }),
      expect.objectContaining({ file: `${filmPath}/symlink.sqdf.json`, message: expect.stringContaining('member is missing') }),
      expect.objectContaining({ file: film, message: expect.stringContaining('revision is unavailable') }),
      expect.objectContaining({ file: companion, message: expect.stringContaining('system is missing') }),
      expect.objectContaining({ message: expect.stringContaining('no supplied clone') }),
      expect.objectContaining({ message: 'invalid Stateloom system address' }),
    ]));
  });

  it('keeps stable IDs across revisions and qualifies a capability provided by two repositories', async () => {
    writeSystem(film, 'review-a-proposal.sqdf.json');
    writeSequence(filmDrawing);
    const first = commit();
    writeSequence(filmDrawing);
    write('witness.json', { evidence: true });
    const second = commit();
    await writeCapabilityFile(clone, await scanRepository(clone, scanOptions), { write: true });
    await enroll('miadi-film', [source(film, first), source(film, second), source(film)]);
    const newest = commit();

    const map = await buildCapabilityMap([clone], scanOptions);
    const contributor = map.capabilities.find((c) => c.nodeId === 'capability:plugin-miadi-film')!;
    map.capabilities.push({ ...contributor, providedBy: ['repository:acme/fork'], systems: [source(film, second)] });
    const projection = await buildDesignProjection(map);
    expect(projection.nodes).toHaveLength(4);
    expect(projection.edges).toHaveLength(3);
    const system = projection.nodes.find((node) => node.metadata.kind === 'system');
    expect(system?.id).toBe(`system:${repository}/${film}`);
    expect(system?.metadata.sources).toEqual([first, second, newest].map((revision) => source(film, revision)).sort());
    expect(system?.metadata.source_ref).toBeUndefined();
    expect(system?.metadata.source_url).toBeUndefined();
    expect(projection.issues).toHaveLength(2);
    const citations = projection.edges.filter((edge) => edge.relationship_type === 'drawn-by').map((edge) => edge.from_id);
    expect(citations.sort()).toEqual(['capability:plugin-miadi-film@acme/fork', `capability:plugin-miadi-film@${repository}`]);
  });
});
