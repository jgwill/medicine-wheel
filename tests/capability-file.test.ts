/**
 * A repository's own capability file, and the map read from many clones.
 * Real git repositories in temp folders: the scan reads git objects.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CAPABILITY_FILE,
  SCAN_AUTHOR,
  mergeCapabilityFile,
  parseCapabilityFile,
  renderCapabilityFile,
  stateCapabilityRow,
  type CapabilityFileRow,
} from '../src/developer-repository-mapping/src/index';
import {
  buildCapabilityMap,
  findClones,
  readRepositoryCapabilities,
  scanRepository,
  stateCapability,
  writeCapabilityFile,
} from '../src/developer-repository-mapping/src/node/index';

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  }).trim();
}

function put(dir: string, file: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
}

function commit(dir: string, message = 'c'): string {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', message, '--no-gpg-sign');
  return git(dir, 'rev-parse', 'HEAD');
}

function repo(name = 'tool', origin = `https://github.com/acme/${name}.git`, base?: string): string {
  const dir = path.join(base ?? fs.mkdtempSync(path.join(os.tmpdir(), 'mw-cap-')), name);
  if (!base) roots.push(path.dirname(dir));
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'remote', 'add', 'origin', origin);
  put(dir, 'package.json', JSON.stringify({ name: `@acme/${name}`, version: '1.0.0', description: 'A tool that does one thing.', bin: { [name]: 'cli.js' }, dependencies: { zod: '^3.0.0' } }));
  put(dir, 'skills/greet/SKILL.md', '---\nname: greet\ndescription: Greet a person by name\n---\n# Greet\n');
  commit(dir);
  return dir;
}

const opts = { observedBy: 'test', ref: 'HEAD', now: new Date('2026-11-08T12:00:00Z') };
const later = { ...opts, now: new Date('2026-11-09T12:00:00Z') };
const rowOf = (dir: string, name: string) => parseCapabilityFile(fs.readFileSync(path.join(dir, CAPABILITY_FILE), 'utf8')).rows.find((r) => r.name === name)!;

describe('the capability file', () => {
  it('holds one row per capability, with its address and files, and no version', async () => {
    const dir = repo();
    const result = await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    expect(result.wrote).toBe(true);
    const parsed = parseCapabilityFile(fs.readFileSync(result.file, 'utf8'));
    expect(parsed.issues).toEqual([]);
    expect(parsed.header).toEqual({ schema: 'medicine-wheel/repository-capabilities', version: 1, repository: 'acme/tool' });
    expect(parsed.rows.map((r) => [r.kind, r.name, r.address])).toEqual([
      ['package', '@acme/tool', 'miadi-capability://acme/tool/package/@acme/tool'],
      ['cli', 'tool', 'miadi-capability://acme/tool/cli/tool'],
      ['skill', 'greet', 'miadi-capability://acme/tool/skill/greet'],
    ]);
    expect(rowOf(dir, 'tool').package).toBe('@acme/tool');
    expect(rowOf(dir, 'greet').grounding).toEqual(['skills/greet/SKILL.md']);
    expect(fs.readFileSync(result.file, 'utf8')).not.toContain('1.0.0');
    expect(git(dir, 'status', '--porcelain')).toBe('?? .miadi/');
  });

  it('does not change on a rescan of the same files, not even its dates', async () => {
    const dir = repo();
    const first = await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    const again = await writeCapabilityFile(dir, await scanRepository(dir, later), { write: true });
    expect([again.differs, again.wrote, again.added, again.changed]).toEqual([false, false, [], []]);
    expect(fs.readFileSync(first.file, 'utf8')).toBe(first.text);
  });

  it('a version bump leaves it alone', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    commit(dir);
    put(dir, 'package.json', JSON.stringify({ name: '@acme/tool', version: '2.0.0', description: 'A tool that does one thing.', bin: { tool: 'cli.js' } }));
    commit(dir);
    expect((await writeCapabilityFile(dir, await scanRepository(dir, later), { write: false })).differs).toBe(false);
  });

  it('a rescan keeps what a person wrote, and takes new files and removals', async () => {
    const dir = repo();
    const longWords = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
    put(dir, 'skills/long/SKILL.md', `---\nname: long\ndescription: ${longWords}\n---\n`);
    put(dir, 'skills/gone/SKILL.md', '---\nname: gone\ndescription: Soon gone\n---\n');
    commit(dir);
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    expect(rowOf(dir, 'long').status).toBe('needs-resolution');

    const stated = await stateCapability(dir, { kind: 'skill', name: 'greet', by: 'Ava', statement: 'Says hello the way Ava wants it said.', now: later.now });
    expect(stated.row).toMatchObject({ statedBy: 'Ava', status: 'clear', revision: 'revised', revisedBy: 'Ava' });
    // by hand: a statement on a row the scan could not state, statedBy left as the scan's
    const file = path.join(dir, CAPABILITY_FILE);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/("name":"long",[^\n]*?"address":"[^"]+",)/, '$1"statement":"Written by hand.",'));

    fs.rmSync(path.join(dir, 'skills/gone'), { recursive: true });
    put(dir, 'skills/new/SKILL.md', '---\nname: new\ndescription: Just arrived\n---\n');
    commit(dir);
    const result = await writeCapabilityFile(dir, await scanRepository(dir, later), { write: true });
    expect(result.added).toEqual(['skill/new']);
    expect(result.removed).toEqual(['skill/gone']);
    expect(rowOf(dir, 'greet')).toMatchObject({ statement: 'Says hello the way Ava wants it said.', statedBy: 'Ava', revision: 'revised' });
    expect(rowOf(dir, 'long')).toMatchObject({ statement: 'Written by hand.', status: 'clear' });
  });

  it('keeps a row a person wrote that no scan finds, and says so', () => {
    const row = (name: string, statedBy: string): CapabilityFileRow => ({
      kind: 'skill', name, address: `miadi-capability://a/b/skill/${name}`, statement: 's', status: 'clear', statedBy, statedAt: '2026-11-08T00:00:00Z', grounding: ['x'], revision: 'pending',
    });
    const merge = mergeCapabilityFile([row('mine', 'Ava'), row('scanned', SCAN_AUTHOR)], []);
    expect(merge.rows.map((r) => r.name)).toEqual(['mine']);
    expect([merge.keptByPerson, merge.removed]).toEqual([['skill/mine'], ['skill/scanned']]);
  });

  it('a scan-written statement that changes goes back to pending; one that holds stays affirmed', () => {
    const base: CapabilityFileRow = { kind: 'skill', name: 'x', address: 'a', statement: 'old', status: 'clear', statedBy: SCAN_AUTHOR, statedAt: '2026-11-08T00:00:00Z', grounding: ['f'], revision: 'affirmed', revisedBy: 'Ava', revisedAt: '2026-11-08T00:00:00Z' };
    const scan: CapabilityFileRow = { ...base, revision: 'pending', revisedBy: undefined, revisedAt: undefined, statedAt: '2026-11-09T00:00:00Z' };
    expect(mergeCapabilityFile([base], [scan]).rows[0]).toMatchObject({ revision: 'affirmed', statedAt: '2026-11-08T00:00:00Z' });
    expect(mergeCapabilityFile([base], [{ ...scan, statement: 'new' }]).rows[0]).toMatchObject({ revision: 'pending', statement: 'new' });
  });

  it('refuses over 55 words and a row it does not hold; affirms only what has words', () => {
    const row: CapabilityFileRow = { kind: 'skill', name: 'x', address: 'a', status: 'needs-resolution', statedBy: SCAN_AUTHOR, statedAt: '2026-11-08T00:00:00Z', grounding: ['f'], revision: 'pending' };
    const input = { kind: 'skill' as const, name: 'x', by: 'Ava', at: '2026-11-08T00:00:00Z' };
    expect(stateCapabilityRow([row], { ...input, statement: Array(56).fill('w').join(' ') })).toEqual({ error: '56 words, the limit is 55' });
    expect('error' in stateCapabilityRow([row], { ...input, name: 'y', statement: 'ok' })).toBe(true);
    expect('error' in stateCapabilityRow([row], input)).toBe(true);
    expect(stateCapabilityRow([row], { ...input, statement: 'ok' })).toMatchObject({ rows: [{ statement: 'ok', status: 'clear', revision: 'revised' }] });
  });

  it('will not write over a file with a bad line, because that line would be lost', async () => {
    const dir = repo();
    const scan = await scanRepository(dir, opts);
    await writeCapabilityFile(dir, scan, { write: true });
    fs.appendFileSync(path.join(dir, CAPABILITY_FILE), 'not json\n');
    await expect(writeCapabilityFile(dir, scan, { write: true })).rejects.toThrow(/nothing was written/);
  });

  it('renders the same text whatever order the rows arrive in', () => {
    const r = (kind: CapabilityFileRow['kind'], name: string): CapabilityFileRow => ({ kind, name, address: 'a', status: 'needs-resolution', statedBy: SCAN_AUTHOR, statedAt: '2026-11-08T00:00:00Z', grounding: ['f'], revision: 'pending' });
    expect(renderCapabilityFile('repository:a/b', [r('skill', 'b'), r('package', 'a'), r('skill', 'a')])).toBe(renderCapabilityFile('a/b', [r('skill', 'a'), r('skill', 'b'), r('package', 'a')]));
  });
});

describe('reading a repository', () => {
  it('reads its own file first, the words from the file and the versions from package.json, grounded in the commit read', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    await stateCapability(dir, { kind: 'skill', name: 'greet', by: 'Ava', statement: 'Said by the owner.', now: later.now });
    const sha = commit(dir);
    const read = await readRepositoryCapabilities(dir, later);
    expect(read.source).toBe('file');
    const greet = read.capabilities.find((c) => c.name === 'greet')!;
    expect(greet).toMatchObject({ nodeId: 'capability:skill-greet', statement: 'Said by the owner.', statedBy: 'Ava', providedBy: ['repository:acme/tool'], grounding: [`acme/tool@${sha.slice(0, 12)}:skills/greet/SKILL.md`] });
    expect(read.packages[0]).toMatchObject({ name: '@acme/tool', version: '1.0.0', bins: ['tool'] });
  });

  it('reads the commit, not the working tree, and a clone with no file answers from its files', async () => {
    const dir = repo();
    expect((await readRepositoryCapabilities(dir, opts)).source).toBe('scan');
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true }); // uncommitted
    expect((await readRepositoryCapabilities(dir, opts)).source).toBe('scan');
  });

  it('a file behind its repository still answers everything the commit provides, and says how far behind', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    commit(dir);
    put(dir, 'skills/new/SKILL.md', '---\nname: new\ndescription: Just arrived\n---\n');
    commit(dir);
    const read = await readRepositoryCapabilities(dir, later);
    expect(read.capabilities.map((c) => c.name)).toContain('new');
    expect(read.drift?.added).toEqual(['skill/new']);
  });

  it('names a clone from a remote that is not GitHub, and warns when the file was written for another repository', async () => {
    const dir = repo('ledger', 'ssh://mia@gaia:/srv/git/acme/ledger.git');
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    commit(dir);
    expect((await scanRepository(dir, opts)).repository).toBe('repository:acme/ledger');
    git(dir, 'remote', 'set-url', 'origin', 'https://github.com/bob/ledger.git');
    const fork = await readRepositoryCapabilities(dir, opts);
    expect(fork.repository).toBe('repository:bob/ledger');
    expect(fork.issues[0]?.message).toMatch(/written for acme\/ledger/);
    expect(fork.capabilities[0]?.providedBy).toEqual(['repository:bob/ledger']);
  });
});

describe('the capability map', () => {
  it('goes through clones and answers one map, with what consumes what across repositories', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-map-'));
    roots.push(base);
    const a = repo('alpha', undefined, path.join(base, 'acme'));
    const b = repo('beta', undefined, path.join(base, 'acme'));
    put(b, 'package.json', JSON.stringify({ name: '@acme/beta', version: '1.0.0', dependencies: { '@acme/alpha': '^1.0.0', zod: '^3.0.0' } }));
    commit(b);
    await writeCapabilityFile(a, await scanRepository(a, opts), { write: true });
    commit(a);
    fs.mkdirSync(path.join(base, 'acme', 'notgit'));

    const clones = findClones(base);
    expect(clones).toEqual([a, b]);
    const map = await buildCapabilityMap([...clones, path.join(base, 'acme', 'notgit')], opts);
    expect(map.repositories.map((r) => [r.repository, r.source, r.error ? 'error' : 'ok'])).toEqual([
      ['repository:acme/alpha', 'file', 'ok'],
      ['repository:acme/beta', 'scan', 'ok'],
      [undefined, undefined, 'error'],
    ]);
    expect(map.consumes.map((e) => [e.fromName, e.toName, e.range])).toEqual([['@acme/beta', '@acme/alpha', '^1.0.0']]);
    // a skill both repositories provide is one capability both provide
    expect(map.capabilities.find((c) => c.name === 'greet')?.providedBy).toEqual(['repository:acme/alpha', 'repository:acme/beta']);
  });
});
