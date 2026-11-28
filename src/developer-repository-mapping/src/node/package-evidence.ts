/** Read explicit receipts and direct dependency evidence from committed npm files. */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { holdsUnsafeCharacter } from '../capability-scan';
import { parseJsonDocument, type ParsedRows } from '../jsonl';
import { PackageEvidenceSchema, parsePackageEvidence, type PackageEvidence } from '../package-evidence';
import type { MappingIssue } from '../types';
import { originRepository } from './git';

const exec = promisify(execFile);

const dependencyFields = {
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  optionalDependencies: z.record(z.string()).optional(),
};
const manifestSchema = z.object({
  name: z.string().min(1),
  ...dependencyFields,
});
const lockEntrySchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  resolved: z.string().optional(),
  integrity: z.string().optional(),
  link: z.boolean().optional(),
  ...dependencyFields,
});
const npmLockSchema = z.object({
  lockfileVersion: z.union([z.literal(2), z.literal(3)]),
  packages: z.record(lockEntrySchema),
});

type LockEntry = z.infer<typeof lockEntrySchema>;

export interface NpmLockEvidenceOptions {
  /** Consumer's directory relative to the repository root. Use `.` for the root. */
  consumerPath: string;
  /** Git revision to inspect. Defaults to HEAD. */
  ref?: string;
  /** Repository identity, such as `repository:jgwill/eury`. Defaults to the origin remote. */
  repository?: string;
}

async function git(clone: string, args: string[]): Promise<string | undefined> {
  try {
    return (await exec('git', ['-C', clone, ...args], { maxBuffer: 32 * 1024 * 1024 })).stdout;
  } catch {
    return undefined;
  }
}

/** A portable Git-relative path, with `.` permitted for the checkout root. */
function safeFolder(folder: string): boolean {
  return folder === '.' || (folder.split('/').every((part) => part && part !== '.' && part !== '..')
    && !/[\\:]/.test(folder) && !holdsUnsafeCharacter(folder));
}

const inside = (folder: string, filename: string) => folder === '.' ? filename : `${folder}/${filename}`;

function ancestors(folder: string): string[] {
  const result = [folder];
  for (let parent = path.posix.dirname(folder); result.at(-1) !== '.'; parent = path.posix.dirname(parent)) result.push(parent);
  return result;
}

function directDependencies(entry: z.infer<typeof manifestSchema> | LockEntry | undefined): Record<string, string> {
  return { ...entry?.peerDependencies, ...entry?.dependencies, ...entry?.optionalDependencies };
}

function lockedDependency(packages: Record<string, LockEntry>, workspace: string, name: string): { entry: LockEntry; lockPath: string } | undefined {
  for (const folder of ancestors(workspace)) {
    const lockPath = inside(folder, `node_modules/${name}`);
    const entry = Object.hasOwn(packages, lockPath) ? packages[lockPath] : undefined;
    if (!entry) continue;
    if (!entry.link) return { entry, lockPath };
    if (!entry.resolved || !safeFolder(entry.resolved) || !Object.hasOwn(packages, entry.resolved)) return undefined;
    const target = packages[entry.resolved];
    return target.link ? undefined : { entry: { ...target, resolved: entry.resolved }, lockPath };
  }
  return undefined;
}

/** Lock URLs occasionally contain credentials or signed query strings. Retain the lock path in every row. */
function publicLocation(resolved: string | undefined): string | undefined {
  if (!resolved) return undefined;
  try {
    const url = new URL(resolved);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && !url.search && !url.hash) return resolved;
  } catch {
    if (safeFolder(resolved)) return resolved;
  }
  return undefined;
}

export async function readPackageEvidenceFile(file: string): Promise<ParsedRows<PackageEvidence>> {
  try {
    return parsePackageEvidence(await readFile(file, 'utf8'), file);
  } catch {
    return { rows: [], issues: [{ severity: 'error', file, message: 'package evidence file could not be read' }] };
  }
}

export async function readNpmLockEvidence(clone: string, options: NpmLockEvidenceOptions): Promise<ParsedRows<PackageEvidence>> {
  const rows: PackageEvidence[] = [];
  const issues: MappingIssue[] = [];
  const result = { rows, issues };
  const { consumerPath } = options;
  if (!safeFolder(consumerPath)) {
    issues.push({ severity: 'error', message: 'npm consumer path must be a repository-relative directory' });
    return result;
  }
  const commit = (await git(clone, ['rev-parse', '--verify', '--end-of-options', `${options.ref ?? 'HEAD'}^{commit}`]))?.trim();
  const named = options.repository ?? await originRepository(clone);
  if (!commit || !named) {
    issues.push({ severity: 'error', message: 'npm lock evidence requires a committed Git revision and repository identity' });
    return result;
  }
  const repository = named.startsWith('repository:') ? named : `repository:${named}`;
  const manifestPath = inside(consumerPath, 'package.json');
  const show = (file: string) => git(clone, ['show', `${commit}:${file}`]);
  const manifestText = await show(manifestPath);
  if (manifestText === undefined) {
    issues.push({ severity: 'error', file: manifestPath, message: 'consumer manifest is missing from the selected revision' });
    return result;
  }
  const manifest = parseJsonDocument(manifestText, manifestSchema, manifestPath);
  issues.push(...manifest.issues);
  if (!manifest.value) return result;
  const source = (file: string) => `${repository.replace(/^repository:/, '')}@${commit}:${file}`;
  const consumer = { repository, name: manifest.value.name, path: manifestPath, commit };
  const add = (row: PackageEvidence, file: string) => {
    const parsed = PackageEvidenceSchema.safeParse(row);
    if (!parsed.success) {
      issues.push({ severity: 'warning', file, message: `skipped an invalid ${row.kind} package observation` });
      return false;
    }
    rows.push(parsed.data);
    return true;
  };
  const declarations: [string, string][] = [];
  for (const [name, range] of Object.entries(directDependencies(manifest.value)).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (add({ kind: 'declared', ecosystem: 'npm', name, range, consumer, source: source(manifestPath) }, manifestPath)) declarations.push([name, range]);
  }

  for (const folder of ancestors(consumerPath)) {
    const file = inside(folder, 'package-lock.json');
    const lockText = await show(file);
    if (lockText === undefined) continue;
    const parsed = parseJsonDocument(lockText, npmLockSchema, file);
    issues.push(...parsed.issues);
    if (!parsed.value) return result;
    const workspace = folder === consumerPath ? '.' : folder === '.' ? consumerPath : consumerPath.slice(folder.length + 1);
    const { packages } = parsed.value;
    const entry = packages[workspace === '.' ? '' : workspace];
    if (!entry || (entry.name !== undefined && entry.name !== consumer.name)) {
      issues.push({ severity: 'warning', file, message: `the lockfile has no matching consumer entry for ${manifestPath}` });
      return result;
    }
    const lockDeclarations = directDependencies(entry);
    for (const [name, range] of declarations) {
      if (lockDeclarations[name] !== range) {
        issues.push({ severity: 'warning', file, message: `the lockfile declaration differs from ${manifestPath} for ${name}` });
        continue;
      }
      const locked = lockedDependency(packages, workspace, name);
      if (!locked?.entry.version) {
        issues.push({ severity: 'warning', file, message: `direct dependency ${name} has no locked version` });
        continue;
      }
      const resolved = publicLocation(locked.entry.resolved);
      add({
        kind: 'locked', ecosystem: 'npm', name, consumer,
        version: locked.entry.version,
        lockPath: locked.lockPath,
        ...(resolved ? { resolved } : {}),
        ...(locked.entry.integrity ? { integrity: locked.entry.integrity } : {}),
        source: source(file),
      }, file);
    }
    return result;
  }
  issues.push({ severity: 'warning', file: manifestPath, message: 'no committed npm package-lock.json was found for this consumer' });
  return result;
}
