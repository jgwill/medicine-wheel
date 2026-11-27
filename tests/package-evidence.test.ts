import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parsePackageEvidence } from '../src/developer-repository-mapping/src/package-evidence';
import { readNpmLockEvidence, readPackageEvidenceFile } from '../src/developer-repository-mapping/src/node/package-evidence';

const published = {
  kind: 'published',
  ecosystem: 'deb',
  name: 'jamai',
  version: '0.4.4',
  architecture: 'all',
  source: 'https://apt.gmusicassembly.com/dists/stable/main/binary-all/Packages',
};
const installed = {
  kind: 'installed',
  ecosystem: 'deb',
  name: 'jamai',
  version: '0.4.3',
  architecture: 'all',
  host: 'eury',
  observedAt: '2026-11-27T09:00:00Z',
  source: 'dpkg-query at eury',
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function repo() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mw-package-evidence-'));
  roots.push(root);
  function git(...args: string[]) {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  }
  function write(file: string, content: unknown) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, JSON.stringify(content));
  }
  function commit() {
    git('add', '--all');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  }
  git('init', '-q');
  git('remote', 'add', 'origin', 'https://github.com/example/eury.git');
  return { root, write, commit };
}

describe('operator package evidence', () => {
  it('keeps a release and a different installed version as distinct observations', () => {
    const rows = [published, installed, installed, { ...installed, host: undefined }].map((row) => JSON.stringify(row));
    const parsed = parsePackageEvidence(rows.join('\n'), 'evidence.jsonl');
    expect(parsed.rows).toEqual([published, installed]);
    expect(parsed.issues).toEqual([{ severity: 'error', file: 'evidence.jsonl', line: 4, message: 'host: Required' }]);
  });

  it('reports a missing file without inventing observations', async () => {
    const { root } = repo();
    const file = path.join(root, 'missing.jsonl');
    expect(await readPackageEvidenceFile(file)).toMatchObject({ rows: [], issues: [{ severity: 'error', file }] });
  });
});

describe('committed npm package-lock evidence', () => {
  it.each([2, 3])('reads npm lock format v%s at the selected Git revision', async (lockfileVersion) => {
    const { root, write, commit } = repo();
    const deps = { dependencies: { '@miadi/ava8-measure': '0.1.3' } };
    write('apps/studio/package.json', { name: '@eury/studio', ...deps });
    const resolved = 'https://registry.npmjs.org/@miadi/ava8-measure/-/ava8-measure-0.1.3.tgz';
    const packages = {
      '': { name: 'eury' },
      'apps/studio': { name: '@eury/studio', ...deps },
      'node_modules/@miadi/ava8-measure': { version: '0.1.3', resolved, integrity: 'sha512-example' },
      'node_modules/unrelated': { version: '2.0.0' },
    };
    write('package-lock.json', { lockfileVersion, packages });
    const rev = commit();
    write('package-lock.json', { lockfileVersion, packages: {} });
    const actual = await readNpmLockEvidence(root, { consumerPath: 'apps/studio', ref: rev });
    const common = { ecosystem: 'npm', name: '@miadi/ava8-measure', consumer: { repository: 'repository:example/eury', path: 'apps/studio/package.json', name: '@eury/studio', commit: rev } };
    expect(actual.issues).toEqual([]);
    expect(actual.rows).toEqual([
      { ...common, kind: 'declared', range: '0.1.3', source: `example/eury@${rev}:apps/studio/package.json` },
      { ...common, kind: 'locked', version: '0.1.3', source: `example/eury@${rev}:package-lock.json`, lockPath: 'node_modules/@miadi/ava8-measure', resolved, integrity: 'sha512-example' },
    ]);
  });

  it('follows the closest lock entries and distinguishes stale, absent, and private resolution evidence', async () => {
    const { root, write, commit } = repo();
    write('apps/studio/package.json', {
      name: '@eury/studio',
      dependencies: { local: '^1.0.0', private: '1.0.0', stale: '2.0.0' },
      optionalDependencies: { absent: '1.0.0' },
    });
    write('package-lock.json', { lockfileVersion: 3, packages: {
      'apps/studio': { dependencies: { local: '^1.0.0', private: '1.0.0', stale: '1.0.0' }, optionalDependencies: { absent: '1.0.0' } },
      'apps/studio/node_modules/local': { link: true, resolved: 'packages/local' },
      'packages/local': { version: '1.1.0' },
      'node_modules/local': { version: '1.0.0' },
      'node_modules/private': { version: '1.0.0', resolved: 'https://user:secret@example.invalid/private.tgz?token=private' },
      'node_modules/stale': { version: '1.0.0' },
    } });
    commit();
    const actual = await readNpmLockEvidence(root, { consumerPath: 'apps/studio' });
    const locked = actual.rows.filter((row) => row.kind === 'locked');
    expect(locked).toMatchObject([
      { name: 'local', lockPath: 'apps/studio/node_modules/local', resolved: 'packages/local', version: '1.1.0' },
      { name: 'private', lockPath: 'node_modules/private', version: '1.0.0' },
    ]);
    expect(locked[1]).not.toHaveProperty('resolved');
    expect(actual.issues.map((issue) => issue.message)).toEqual([
      'direct dependency absent has no locked version',
      'the lockfile declaration differs from apps/studio/package.json for stale',
    ]);
  });

  it('does not present declarations as locks when the nearest lockfile is absent or unsupported', async () => {
    const { root, write, commit } = repo();
    write('apps/studio/package.json', { name: '@eury/studio', dependencies: { tone: '*' } });
    const absent = commit();
    expect(await readNpmLockEvidence(root, { consumerPath: 'apps/studio', ref: absent })).toMatchObject({
      rows: [{ kind: 'declared', name: 'tone' }],
      issues: [{ severity: 'warning' }],
    });
    write('apps/studio/package-lock.json', { lockfileVersion: 1 });
    commit();
    expect(await readNpmLockEvidence(root, { consumerPath: 'apps/studio' })).toMatchObject({
      rows: [{ kind: 'declared', name: 'tone' }],
      issues: expect.arrayContaining([{ severity: 'error', file: 'apps/studio/package-lock.json', message: expect.stringContaining('lockfileVersion') }]),
    });
    expect(await readNpmLockEvidence(root, { consumerPath: '../elsewhere' }))
      .toMatchObject({ rows: [], issues: [{ severity: 'error' }] });
  });
});
