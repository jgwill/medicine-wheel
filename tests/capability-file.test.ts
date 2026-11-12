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
  CAPABILITY_FILE_ROW_KEYS,
  CAPABILITY_KINDS,
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
    // by hand: a statement on a row the scan could not state, with the person's name in statedBy
    const file = path.join(dir, CAPABILITY_FILE);
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').replace(/("name":"long",[^\n]*?"address":"[^"]+",)"status":"needs-resolution","statedBy":"mw-repomap scan"/, '$1"statement":"Written by hand.","status":"clear","statedBy":"William"'),
    );

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

// ── What the reviews of 0.27.10 found (CR: code review, C: design review) ──────

const read = (dir: string) => parseCapabilityFile(fs.readFileSync(path.join(dir, CAPABILITY_FILE), 'utf8'));
const line = (o: Record<string, unknown>) => JSON.stringify(o);
const HEADER = (repository = 'acme/tool', extra: Record<string, unknown> = {}) => line({ schema: 'medicine-wheel/repository-capabilities', version: 1, repository, ...extra });
const ROW = (o: Record<string, unknown> = {}) =>
  line({ kind: 'skill', name: 'greet', address: 'miadi-capability://acme/tool/skill/greet', statement: 'Greets.', status: 'clear', statedBy: SCAN_AUTHOR, statedAt: '2026-11-08T00:00:00Z', grounding: ['skills/greet/SKILL.md'], revision: 'pending', ...o });

describe('what the reviews found', () => {
  it('CR1: a row the commit does not provide is not read, so a repository cannot speak for another', async () => {
    const dir = repo('hostile', 'https://github.com/evil/hostile.git');
    put(dir, CAPABILITY_FILE, [HEADER('evil/hostile'), ROW({ kind: 'package', name: '@acme/widgets', address: 'miadi-capability://evil/hostile/package/@acme/widgets', statement: 'Install this one.', statedBy: 'acme maintainers', grounding: ['package.json'] })].join('\n') + '\n');
    commit(dir);
    const got = await readRepositoryCapabilities(dir, opts);
    expect(got.capabilities.map((c) => c.name)).not.toContain('@acme/widgets');
    expect(got.issues.map((i) => i.message).join('\n')).toMatch(/package\/@acme\/widgets is in the file but this commit provides no such package; it is not read/);
  });

  it('CR2: a fork or a remote in another case keeps the repository the file was written for, until someone adopts it', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    commit(dir);
    git(dir, 'remote', 'set-url', 'origin', 'https://github.com/contributor/tool.git');
    const fork = await writeCapabilityFile(dir, await scanRepository(dir, later), { write: false });
    expect([fork.differs, fork.repository]).toEqual([false, 'acme/tool']);
    git(dir, 'remote', 'set-url', 'origin', 'https://github.com/ACME/Tool.git');
    expect((await writeCapabilityFile(dir, await scanRepository(dir, later), { write: false })).differs).toBe(false);
    git(dir, 'remote', 'set-url', 'origin', 'https://github.com/contributor/tool.git');
    const adopted = await writeCapabilityFile(dir, await scanRepository(dir, later), { write: true, repository: 'contributor/tool' });
    expect(adopted.repository).toBe('contributor/tool');
    expect(read(dir).header?.repository).toBe('contributor/tool');
    expect(rowOf(dir, 'greet').address).toBe('miadi-capability://contributor/tool/skill/greet');
  });

  it('CR3: a statement the files stopped making does not stay as the scan\'s words', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    put(dir, 'skills/greet/SKILL.md', '---\nname: greet\n---\n# no description any more\n');
    commit(dir);
    const result = await writeCapabilityFile(dir, await scanRepository(dir, later), { write: true });
    expect(result.changed).toContain('skill/greet');
    expect(rowOf(dir, 'greet')).toMatchObject({ status: 'needs-resolution', revision: 'pending' });
    expect(rowOf(dir, 'greet').statement).toBeUndefined();
  });

  it('CR4: a rescan keeps a person\'s status as they wrote it', () => {
    const mine = { kind: 'skill' as const, name: 'x', address: 'a', statement: 'A draft.', status: 'needs-resolution' as const, statedBy: 'Ava', statedAt: '2026-11-08T00:00:00Z', grounding: ['f'], revision: 'pending' as const };
    const scan = { ...mine, statement: undefined, statedBy: SCAN_AUTHOR };
    const merged = mergeCapabilityFile([mine], [scan]);
    expect(merged.rows[0]).toMatchObject({ status: 'needs-resolution', statement: 'A draft.', statedBy: 'Ava' });
    expect(merged.changed).toEqual([]);
  });

  it('CR5: a fork and its upstream each keep their own package reading in the map', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-fork-'));
    roots.push(base);
    const up = repo('widgets', 'https://github.com/acme/widgets.git', path.join(base, 'acme'));
    const fork = repo('widgets', 'https://github.com/contributor/widgets.git', path.join(base, 'contributor'));
    put(fork, 'package.json', JSON.stringify({ name: '@acme/widgets', version: '9.9.9', bin: { forkcmd: 'x.js' } }));
    commit(fork);
    const map = await buildCapabilityMap([up, fork], opts);
    expect(map.packages.filter((p) => p.name === '@acme/widgets').map((p) => [p.repository, p.version, p.bins])).toEqual([
      ['repository:acme/widgets', '1.0.0', ['widgets']],
      ['repository:contributor/widgets', '9.9.9', ['forkcmd']],
    ]);
  });

  it('CR7: a package or a skill under a path with accents or spaces is found', async () => {
    const dir = repo();
    put(dir, 'package.json', JSON.stringify({ name: '@acme/tool', version: '1.0.0', workspaces: ['packages/*'] }));
    put(dir, 'packages/émile/package.json', JSON.stringify({ name: '@acme/emile', version: '1.0.0' }));
    put(dir, 'skills/créer un/SKILL.md', '---\nname: creer\ndescription: Make a thing\n---\n');
    commit(dir);
    const names = (await scanRepository(dir, opts)).fileRows.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['@acme/emile', 'creer']));
  });

  it('CR8: a folder that cannot be read is said and skipped, a linked clone is followed once, and the others are read', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-find-'));
    roots.push(base);
    const a = repo('alpha', undefined, path.join(base, 'acme'));
    fs.mkdirSync(path.join(base, 'locked'));
    fs.mkdirSync(path.join(base, 'locked', 'inside'));
    fs.chmodSync(path.join(base, 'locked'), 0o000);
    fs.symlinkSync(a, path.join(base, 'linked'));
    const skipped: string[] = [];
    try {
      const clones = findClones(base, { onSkip: (dir) => skipped.push(dir) });
      // the clone and the link to it are one clone, read once by whichever path came first
      expect(clones.filter((c) => fs.realpathSync(c) === fs.realpathSync(a))).toHaveLength(1);
      if (process.getuid?.() !== 0) expect(skipped).toEqual([path.join(base, 'locked')]);
    } finally {
      fs.chmodSync(path.join(base, 'locked'), 0o755);
    }
  });

  it('CR9 and CR10: control characters, an over-long statement, a clear row without words and a second row for one capability are refused', () => {
    const parsed = parseCapabilityFile(
      [
        HEADER(),
        ROW({ name: 'rm -rf ~\n\u001b[31mred' }),
        ROW({ name: 'long', statement: 'x'.repeat(1300) }),
        ROW({ name: 'bare', statement: undefined }),
        ROW({ name: '@@@' }),
        ROW(),
        ROW({ statement: 'A second greet.' }),
      ].join('\n'),
    );
    expect(parsed.rows.map((r) => [r.name, r.statement])).toEqual([['greet', 'Greets.']]);
    const messages = parsed.issues.map((i) => `${i.line}: ${i.message}`).join('\n');
    expect(messages).toMatch(/2: .*control character/);
    expect(messages).toMatch(/3: .*1200 characters/);
    expect(messages).toMatch(/4: .*a clear row carries its statement/);
    expect(messages).toMatch(/5: .*a letter or a digit/);
    expect(messages).toMatch(/7: skill\/greet appears more than once/);
  });

  it('CR12: a package.json that is not JSON stops a write, and a private package is read but not listed', async () => {
    const dir = repo();
    put(dir, 'package.json', JSON.stringify({ name: '@acme/tool', version: '1.0.0', private: true, bin: { tool: 'cli.js' }, workspaces: ['packages/*'] }));
    put(dir, 'packages/lib/package.json', JSON.stringify({ name: '@acme/lib', version: '1.0.0', description: 'The library.' }));
    commit(dir);
    const scan = await scanRepository(dir, opts);
    expect(scan.fileRows.map((r) => r.name)).toEqual(['@acme/lib', 'greet']);
    expect(scan.packages.find((p) => p.name === '@acme/tool')).toMatchObject({ private: true });
    await writeCapabilityFile(dir, scan, { write: true });
    put(dir, 'packages/lib/package.json', '{ "name": "@acme/lib", ');
    commit(dir);
    const broken = await scanRepository(dir, later);
    expect(broken.issues[0]).toMatchObject({ severity: 'error', file: 'packages/lib/package.json' });
    await expect(writeCapabilityFile(dir, broken, { write: true })).rejects.toThrow(/would be removed, so nothing was written/);
    expect(rowOf(dir, '@acme/lib')).toBeDefined();
  });

  it('CR13: the scan\'s name cannot sign a statement, and an ignored file is said', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    await expect(stateCapability(dir, { kind: 'skill', name: 'greet', by: SCAN_AUTHOR, statement: 'Mine now.' })).rejects.toThrow(/the scan's name/);
    put(dir, '.gitignore', '*.jsonl\n');
    expect((await writeCapabilityFile(dir, await scanRepository(dir, later), { write: false })).ignored).toBe(true);
    put(dir, '.gitignore', '*.jsonl\n!.miadi/capabilities.jsonl\n');
    expect((await writeCapabilityFile(dir, await scanRepository(dir, later), { write: false })).ignored).toBe(false);
  });

  it('C1: a reader reads a newer file for what it knows; a writer refuses to rewrite it', async () => {
    const text = [HEADER('acme/tool', { version: 2, generator: 'mw-repomap 1.0' }), ROW({ ecosystem: 'npm' }), ROW({ kind: 'mcp-server', name: 'srv' })].join('\n') + '\n';
    const reading = parseCapabilityFile(text);
    expect(reading.rows.map((r) => r.name)).toEqual(['greet']);
    expect(reading.issues.every((i) => i.severity === 'warning')).toBe(true);
    const said = reading.issues.map((i) => i.message).join('\n');
    for (const word of ['generator', 'version 2', 'ecosystem', 'mcp-server']) expect(said).toContain(word);
    expect(parseCapabilityFile(text, { mode: 'write' }).issues.filter((i) => i.severity === 'error')).toHaveLength(4);

    const dir = repo();
    put(dir, CAPABILITY_FILE, text);
    commit(dir);
    expect((await readRepositoryCapabilities(dir, opts)).capabilities.map((c) => c.name)).toContain('greet');
    await expect(writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true })).rejects.toThrow(/nothing was written/);
  });

  it('C2: an address that is not the row\'s own is said and read as it should be', () => {
    const parsed = parseCapabilityFile([HEADER(), ROW({ address: 'miadi-capability://someone/else/skill/greet' })].join('\n'));
    expect(parsed.rows[0]?.address).toBe('miadi-capability://acme/tool/skill/greet');
    expect(parsed.issues[0]).toMatchObject({ severity: 'warning', line: 2 });
  });

  it('C3: a person says which platform capability a row serves, and every rescan keeps it', async () => {
    const dir = repo();
    await writeCapabilityFile(dir, await scanRepository(dir, opts), { write: true });
    await expect(stateCapability(dir, { kind: 'skill', name: 'greet', by: 'Ava', realizes: ['Welcome people'] })).rejects.toThrow(/not a platform capability/);
    await stateCapability(dir, { kind: 'skill', name: 'greet', by: 'Ava', realizes: ['capability:welcome-people'], now: later.now });
    expect(rowOf(dir, 'greet')).toMatchObject({ realizes: [{ capability: 'capability:welcome-people', statedBy: 'Ava', statedAt: later.now.toISOString() }], revision: 'pending', statedBy: SCAN_AUTHOR });
    put(dir, 'skills/greet/SKILL.md', '---\nname: greet\ndescription: Greet a person warmly\n---\n');
    commit(dir);
    await writeCapabilityFile(dir, await scanRepository(dir, later), { write: true });
    expect(rowOf(dir, 'greet')).toMatchObject({ statement: 'Greet a person warmly', realizes: [{ capability: 'capability:welcome-people', statedBy: 'Ava' }] });
    commit(dir);
    const got = await readRepositoryCapabilities(dir, later);
    expect(got.realizes).toEqual([{ from: 'capability:skill-greet', to: 'capability:welcome-people', type: 'realizes', repository: 'repository:acme/tool', statedBy: 'Ava', statedAt: later.now.toISOString() }]);
    expect((await buildCapabilityMap([dir], later)).realizes).toHaveLength(1);
  });

  it('the published JSON Schema names the same keys, kinds and header as the code', () => {
    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/developer-repository-mapping/schema/repository-capabilities.v1.schema.json'), 'utf8'));
    expect(Object.keys(schema.$defs.row.properties).sort()).toEqual([...CAPABILITY_FILE_ROW_KEYS].sort());
    expect(schema.$defs.row.properties.kind.enum).toEqual([...CAPABILITY_KINDS]);
    expect(schema.$defs.header.required).toEqual(['schema', 'version', 'repository']);
  });
});

