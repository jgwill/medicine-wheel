/**
 * Capabilities on Node: read a clone at one commit, from git objects, never
 * from its working tree. A clone on another branch or with edits of its own
 * reads the same as a clean one, and every row names the commit it was read
 * at. `readRepositoryCapabilities` takes the repository's own file first;
 * `writeCapabilityFile` writes it; `buildCapabilityMap` goes through many
 * clones and answers one map. Reading runs git ls-tree, git show and git
 * rev-parse only. Writing touches the one file and commits nothing.
 */

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { CapabilityFacet } from '@medicine-wheel/capabilities';
import { parseGithubRemote, repositoryNodeId } from '../ids';
import type { MappingIssue } from '../types';
import {
  CODE_READERS,
  capabilityId,
  capabilityRows,
  mergeCapabilityRows,
  packageManifests,
  parsePackageJson,
  parseSkillFrontMatter,
  skillFiles,
  workspaceGlobs,
  type Artefact,
  type CapabilityKind,
} from '../capability-scan';
import { consumesEdges, type ConsumesEdge, type PackageReading } from '../capability-impact';
import {
  CAPABILITY_FILE,
  capabilityFileFacets,
  capabilityFileRows,
  mergeCapabilityFile,
  parseCapabilityFile,
  renderCapabilityFile,
  stateCapabilityRow,
  type CapabilityFileMerge,
  type CapabilityFileRow,
} from '../capability-file';

const run = promisify(execFile);

async function git(clone: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await run('git', ['-C', clone, ...args], { maxBuffer: 256 * 1024 * 1024 });
    return stdout;
  } catch {
    return undefined;
  }
}

/** `owner/name` from any remote URL: GitHub's forms first, else the last two path segments. */
function remoteRepository(url: string): { owner: string; name: string } | undefined {
  const github = parseGithubRemote(url);
  if (github) return github;
  const m = /([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*?)(?:\.git)?\/?$/.exec(url.trim());
  return m && m[1] && m[2] ? { owner: m[1], name: m[2] } : undefined;
}

export interface ScanOptions {
  /** the ref to read; default the remote's default branch (`origin/HEAD`), else HEAD */
  ref?: string;
  /** `owner/name` or `repository:owner/name`; default from the `origin` remote */
  repository?: string;
  observedBy: string;
  now?: Date;
}

export interface ScanResult {
  repository: string;
  ref: string;
  commit: string;
  capabilities: CapabilityFacet[];
  /** each package's version, the ranges it declares and the commands it ships, all of them */
  packages: PackageReading[];
  /** the rows this commit's files make, as the repository's own file would hold them */
  fileRows: CapabilityFileRow[];
}

export async function scanRepository(clone: string, options: ScanOptions): Promise<ScanResult> {
  if ((await git(clone, ['rev-parse', '--git-dir'])) === undefined) throw new Error(`not a git clone: ${clone}`);
  const ref = options.ref ?? ((await git(clone, ['rev-parse', '--verify', '-q', 'origin/HEAD'])) ? 'origin/HEAD' : 'HEAD');
  const commit = (await git(clone, ['rev-parse', '--verify', `${ref}^{commit}`]))?.trim();
  if (!commit) throw new Error(`${clone}: no commit at ${ref}`);

  let repository = options.repository
    ? options.repository.startsWith('repository:')
      ? options.repository
      : `repository:${options.repository}`
    : undefined;
  if (!repository) {
    const remote = remoteRepository((await git(clone, ['remote', 'get-url', 'origin']))?.trim() ?? '');
    if (!remote) throw new Error(`${clone}: no origin remote to name it by; pass --repository owner/name`);
    repository = repositoryNodeId(remote.owner, remote.name);
  }

  const files = ((await git(clone, ['ls-tree', '-r', '--name-only', commit])) ?? '').split('\n').filter(Boolean);
  const show = (file: string) => git(clone, ['show', `${commit}:${file}`]);
  const globs = workspaceGlobs(await show('package.json'), files.includes('pnpm-workspace.yaml') ? await show('pnpm-workspace.yaml') : undefined);

  const artefacts: Artefact[] = [];
  const packages: PackageReading[] = [];
  for (const manifest of packageManifests(globs, files)) {
    const pkg = parsePackageJson((await show(manifest)) ?? '');
    if (!pkg.name) continue;
    packages.push({
      capability: capabilityId('package', pkg.name),
      name: pkg.name,
      ...(pkg.version ? { version: pkg.version } : {}),
      repository,
      path: manifest,
      commit: commit.slice(0, 12),
      dependsOn: pkg.dependsOn,
      ...(pkg.bins.length ? { bins: pkg.bins } : {}),
    });
    artefacts.push({ kind: 'package', name: pkg.name, ...(pkg.description ? { description: pkg.description } : {}), path: manifest });
    for (const bin of pkg.bins) {
      artefacts.push({ kind: 'cli', name: bin, description: `The ${bin} command, shipped by ${pkg.name}.`, path: manifest, package: pkg.name });
    }
  }
  for (const file of skillFiles(files)) {
    const front = parseSkillFrontMatter((await show(file)) ?? '');
    const name = front.name ?? file.split('/').slice(-2, -1)[0];
    if (!name) continue;
    artefacts.push({ kind: 'skill', name, ...(front.description ? { description: front.description } : {}), path: file });
  }
  // Capabilities defined in code, each by the reader written for its repository's file.
  for (const reader of CODE_READERS) {
    if (reader.repository.toLowerCase() !== repository.toLowerCase() || !files.includes(reader.path)) continue;
    artefacts.push(...reader.read((await show(reader.path)) ?? ''));
  }

  const observedAt = (options.now ?? new Date()).toISOString();
  return {
    repository,
    ref,
    commit,
    capabilities: capabilityRows(artefacts, { repository, commit, observedBy: options.observedBy, observedAt }),
    packages,
    fileRows: capabilityFileRows(artefacts, { repository, statedAt: observedAt }),
  };
}

export interface RepositoryCapabilities extends ScanResult {
  /** `file` when the commit holds the repository's own file, `scan` when only its files were read */
  source: 'file' | 'scan';
  issues: MappingIssue[];
  /** with a file: how it differs from what the commit's files say */
  drift?: Pick<CapabilityFileMerge, 'added' | 'removed' | 'changed' | 'keptByPerson'>;
}

/**
 * What a repository provides at one commit: its own file when the commit
 * holds one, merged with what the commit's files say by the rule a rescan
 * uses, so a file behind its repository still answers every capability.
 * Versions and ranges always come from the commit's package.json files.
 */
export async function readRepositoryCapabilities(clone: string, options: ScanOptions): Promise<RepositoryCapabilities> {
  const scan = await scanRepository(clone, options);
  const text = await git(clone, ['show', `${scan.commit}:${CAPABILITY_FILE}`]);
  if (text === undefined) return { ...scan, source: 'scan', issues: [] };
  const parsed = parseCapabilityFile(text);
  const merge = mergeCapabilityFile(parsed.rows, scan.fileRows);
  const issues = [...parsed.issues];
  const named = `repository:${parsed.header?.repository ?? ''}`;
  if (parsed.header && named.toLowerCase() !== scan.repository.toLowerCase()) {
    issues.push({ severity: 'warning', file: CAPABILITY_FILE, message: `written for ${parsed.header.repository}; this clone's origin is ${scan.repository.replace(/^repository:/, '')}` });
  }
  return {
    ...scan,
    capabilities: capabilityFileFacets(merge.rows, { repository: scan.repository, commit: scan.commit }),
    source: 'file',
    issues,
    drift: { added: merge.added, removed: merge.removed, changed: merge.changed, keptByPerson: merge.keptByPerson },
  };
}

async function workingRoot(clone: string): Promise<string> {
  const root = (await git(clone, ['rev-parse', '--show-toplevel']))?.trim();
  if (!root) throw new Error(`not a git working tree: ${clone}`);
  return root;
}

function readWorkingFile(file: string): ReturnType<typeof parseCapabilityFile> | undefined {
  return existsSync(file) ? parseCapabilityFile(readFileSync(file, 'utf8')) : undefined;
}

export interface WriteCapabilityFileResult extends Pick<CapabilityFileMerge, 'added' | 'removed' | 'changed' | 'keptByPerson'> {
  file: string;
  text: string;
  /** the file would change (or does not exist yet) */
  differs: boolean;
  wrote: boolean;
}

/**
 * Bring the working tree's file up to what a scan found, keeping what a person
 * wrote. With `write: false` nothing is touched and `differs` says whether a
 * write would change it. Refuses a file with a bad line, because a line that
 * did not parse would not be written back.
 */
export async function writeCapabilityFile(clone: string, scan: ScanResult, options: { write: boolean }): Promise<WriteCapabilityFileResult> {
  const root = await workingRoot(clone);
  const file = path.join(root, CAPABILITY_FILE);
  const current = readWorkingFile(file);
  const bad = current?.issues.find((i) => i.severity === 'error');
  if (bad) throw new Error(`${CAPABILITY_FILE}${bad.line ? `:${bad.line}` : ''}: ${bad.message} (nothing was written)`);
  const merge = mergeCapabilityFile(current?.rows ?? [], scan.fileRows);
  const text = renderCapabilityFile(scan.repository, merge.rows);
  const differs = !existsSync(file) || readFileSync(file, 'utf8') !== text;
  if (differs && options.write) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, 'utf8');
  }
  return { file, text, differs, wrote: differs && options.write, added: merge.added, removed: merge.removed, changed: merge.changed, keptByPerson: merge.keptByPerson };
}

/** A person states or affirms one capability in the working tree's file. */
export async function stateCapability(
  clone: string,
  input: { kind: CapabilityKind; name: string; by: string; statement?: string; now?: Date },
): Promise<{ file: string; row: CapabilityFileRow }> {
  const root = await workingRoot(clone);
  const file = path.join(root, CAPABILITY_FILE);
  const current = readWorkingFile(file);
  if (!current) throw new Error(`${CAPABILITY_FILE} does not exist: run capabilities scan --write first`);
  const bad = current.issues.find((i) => i.severity === 'error');
  if (bad) throw new Error(`${CAPABILITY_FILE}${bad.line ? `:${bad.line}` : ''}: ${bad.message} (nothing was written)`);
  if (!current.header) throw new Error(`${CAPABILITY_FILE} has no header line (nothing was written)`);
  const answer = stateCapabilityRow(current.rows, {
    kind: input.kind,
    name: input.name,
    by: input.by,
    at: (input.now ?? new Date()).toISOString(),
    ...(input.statement !== undefined ? { statement: input.statement } : {}),
  });
  if ('error' in answer) throw new Error(answer.error);
  writeFileSync(file, renderCapabilityFile(current.header.repository, answer.rows), 'utf8');
  return { file, row: answer.rows.find((r) => r.kind === input.kind && r.name === input.name)! };
}

/** The git clones under a folder: itself, its children, or `owner/name` two levels down. Hidden folders are skipped. */
export function findClones(root: string): string[] {
  const isClone = (dir: string) => existsSync(path.join(dir, '.git'));
  if (isClone(root)) return [root];
  const children = (dir: string) =>
    readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => path.join(dir, d.name));
  const clones: string[] = [];
  for (const child of children(root)) {
    if (isClone(child)) clones.push(child);
    else for (const grandchild of children(child)) if (isClone(grandchild)) clones.push(grandchild);
  }
  return clones.sort();
}

export interface CapabilityMapRepository {
  clone: string;
  repository?: string;
  commit?: string;
  source?: 'file' | 'scan';
  counts?: { package: number; cli: number; skill: number };
  issues: MappingIssue[];
  drift?: RepositoryCapabilities['drift'];
  /** why this clone could not be read */
  error?: string;
}

export interface CapabilityMap {
  repositories: CapabilityMapRepository[];
  /** one row per capability; a capability two repositories provide is one row both provide */
  capabilities: CapabilityFacet[];
  packages: PackageReading[];
  /** which package consumes which, across every repository read */
  consumes: ConsumesEdge[];
}

/**
 * Go through clones and answer one map of what they provide. A clone that
 * cannot be read is reported and the others are still read.
 */
export async function buildCapabilityMap(clones: readonly string[], options: { observedBy: string; ref?: string; now?: Date }): Promise<CapabilityMap> {
  const repositories: CapabilityMapRepository[] = [];
  const facets: CapabilityFacet[] = [];
  const packages: PackageReading[] = [];
  for (const clone of clones) {
    try {
      const read = await readRepositoryCapabilities(clone, options);
      const counts = { package: 0, cli: 0, skill: 0 };
      for (const r of read.capabilities) {
        const kind = /^capability:(package|cli|skill)-/.exec(r.nodeId)?.[1] as keyof typeof counts | undefined;
        if (kind) counts[kind] += 1;
      }
      repositories.push({ clone, repository: read.repository, commit: read.commit, source: read.source, counts, issues: read.issues, ...(read.drift ? { drift: read.drift } : {}) });
      facets.push(...read.capabilities);
      packages.push(...read.packages);
    } catch (error) {
      repositories.push({ clone, issues: [], error: (error as Error).message });
    }
  }
  const seen = new Set<string>();
  const unique = packages.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)));
  return { repositories, capabilities: mergeCapabilityRows(facets), packages: unique, consumes: consumesEdges(unique) };
}
