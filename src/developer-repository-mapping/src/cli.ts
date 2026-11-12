#!/usr/bin/env node
/**
 * mw-repomap — make, check, observe and serve a repository mapping.
 *
 *   mw-repomap init [<hub-dir>] --owner <login> [--meta] [--description <text>]
 *   mw-repomap validate [<path>] [--local] [--json]
 *   mw-repomap list [<path>] [--lifecycle <state>] [--drift <drift>] [--revision <state>] [--field <id>] [--local] [--json]
 *   mw-repomap show <repository> [<path>] [--local] [--json]
 *   mw-repomap observe <clone>... [--dir <path>] [--by <observer>] [--write]
 *   mw-repomap move <repository> <event> [<path>] --by <who> [--grounding <evidence>]
 *   mw-repomap hub [<path>] [--json]
 *   mw-repomap serve [<path>] [--port <n>] [--host <address>] [--local]
 *   mw-repomap wheel [<path>] [--local]
 *   mw-repomap capabilities scan [<clone>] [--write|--check] [--ref <ref>] [--repository <owner/name>]
 *   mw-repomap capabilities state <kind>/<name> [<statement>] --by <who> [--realizes <capability:slug>,…] [--clone <path>]
 *   mw-repomap capabilities show [<clone>] [--ref <ref>] [--json]
 *   mw-repomap capabilities map [<clone>...] [--root <dir>] [--list <file>] [--out <file>] [--packages <file>] [--ref <ref>] [--json]
 *
 * <path> is a mapping folder, or an owner hub clone holding
 * .miadi/repository-mapping/; the current directory when absent. A meta hub
 * reads every owner hub it registers, unless --local. <repository> is
 * owner/name or repository:owner/name.
 *
 * `observe --write` and `move` rewrite the folder's JSONL, and refuse while
 * any row fails to parse: a row that did not parse would not be written back.
 *
 * `capabilities scan --write` keeps .miadi/capabilities.jsonl in the clone's
 * working tree and commits nothing. `--check` writes nothing and exits 1 when
 * the file would change. `capabilities map` goes through clones, reads each
 * one's own file or its files, and prints one map.
 *
 * Exit codes: 0 done, 1 the mapping has errors or a read failed, 2 usage error.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { hasErrors } from './check';
import { toRepositoryNodeId, repositoryUrl } from './ids';
import { reconcileLifecycle, transition } from './lifecycle';
import { LifecycleEventSchema, MappingManifestSchema } from './schemas';
import { summarize } from './summary';
import { MAPPING_DIR, MAPPING_SCHEMA, type LifecycleEvent, type MappingIssue, type RepositoryMapping } from './types';
import { toWheelEdges, toWheelNodes } from './wheel';
import { findMappingDir, initMappingDir, readMappingDir, writeMappingDir } from './node/fs';
import { originRepository, readActivity } from './node/git';
import { readHub, type HubRead } from './node/hub';
import { LOOPBACK_HOSTS, createMappingServer } from './node/server';
import { CAPABILITY_KINDS, type CapabilityKind } from './capability-scan';
import { CAPABILITY_FILE } from './capability-file';
import { buildCapabilityMap, findClones, readRepositoryCapabilities, scanRepository, stateCapability, writeCapabilityFile } from './node/capability-scan';

const USAGE = [
  'usage: mw-repomap init [<hub-dir>] --owner <login> [--meta] [--description <text>]',
  '       mw-repomap validate [<path>] [--local] [--json]',
  '       mw-repomap list [<path>] [--lifecycle <state>] [--drift <drift>] [--revision <state>] [--field <id>] [--local] [--json]',
  '       mw-repomap show <repository> [<path>] [--local] [--json]',
  '       mw-repomap observe <clone>... [--dir <path>] [--by <observer>] [--write]',
  '       mw-repomap move <repository> <event> [<path>] --by <who> [--grounding <evidence>]',
  '       mw-repomap hub [<path>] [--json]',
  '       mw-repomap serve [<path>] [--port <n>] [--host <address>] [--local]',
  '       mw-repomap wheel [<path>] [--local]',
  '       mw-repomap capabilities scan [<clone>] [--write|--check] [--ref <ref>] [--repository <owner/name>]',
  '       mw-repomap capabilities state <kind>/<name> [<statement>] --by <who> [--realizes <capability:slug>,…] [--clone <path>]',
  '       mw-repomap capabilities show [<clone>] [--ref <ref>] [--json]',
  '       mw-repomap capabilities map [<clone>...] [--root <dir>] [--list <file>] [--out <file>] [--packages <file>] [--ref <ref>] [--json]',
].join('\n');

const BOOLEAN_FLAGS = new Set(['meta', 'local', 'json', 'write', 'check', 'help']);

/** The flags each command takes. Any other flag is a usage error, so a misspelling never passes silently. */
const COMMAND_FLAGS: Record<string, readonly string[]> = {
  init: ['owner', 'meta', 'description'],
  validate: ['local', 'json'],
  list: ['lifecycle', 'drift', 'revision', 'field', 'local', 'json'],
  show: ['local', 'json'],
  observe: ['dir', 'by', 'write'],
  capabilities: ['write', 'check', 'ref', 'repository', 'by', 'clone', 'realizes', 'root', 'list', 'out', 'packages', 'json'],
  move: ['by', 'grounding'],
  hub: ['json'],
  serve: ['port', 'host', 'local'],
  wheel: ['local'],
};

class UsageError extends Error {}

function parse(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) throw new UsageError(`--${key} needs a value`);
    flags[key] = value;
  }
  const allowed = COMMAND_FLAGS[positional[0]];
  if (allowed) {
    const unknown = Object.keys(flags).filter((key) => !allowed.includes(key));
    if (unknown.length) {
      throw new UsageError(`${positional[0]} does not take ${unknown.map((k) => `--${k}`).join(', ')}; it takes ${allowed.map((k) => `--${k}`).join(', ') || 'no flags'}`);
    }
  }
  return { positional, flags };
}

/** A flag's value, `undefined` when absent. An empty value is a usage error, not an absent flag. */
const text = (flags: Record<string, string | true>, key: string) => {
  const value = flags[key];
  if (typeof value !== 'string') return undefined;
  if (!value.trim()) throw new UsageError(`--${key} needs a value`);
  return value;
};

function printIssues(issues: readonly MappingIssue[]): void {
  for (const i of issues) {
    const where = `${i.file ?? ''}${i.line ? `:${i.line}` : ''}`;
    console.error(`${i.severity.padEnd(7)} ${where}${i.nodeId ? ` ${i.nodeId}` : ''} — ${i.message}`);
  }
}

async function mappingDir(arg: string | undefined): Promise<string> {
  const start = arg ?? process.cwd();
  const dir = await findMappingDir(start);
  if (!dir) {
    throw new Error(`no mapping folder at ${path.resolve(start)} (mw-repomap init --owner <login> makes one)`);
  }
  return dir;
}

async function hubOrFail(arg: string | undefined, local: boolean): Promise<HubRead & { merged: NonNullable<HubRead['merged']> }> {
  const read = await readHub(await mappingDir(arg), { local });
  if (!read.merged) {
    printIssues(read.issues);
    throw new Error('the manifest could not be read');
  }
  return read as HubRead & { merged: NonNullable<HubRead['merged']> };
}

/** Read the folder for a rewrite; refuse while any row fails to parse. */
async function forRewrite(dir: string): Promise<RepositoryMapping> {
  const read = await readMappingDir(dir);
  if (!read.mapping || hasErrors(read.issues)) {
    printIssues(read.issues);
    throw new Error('rows fail to parse; fix them before rewriting this folder (mw-repomap validate)');
  }
  return read.mapping;
}

const defaultObserver = () => `${os.userInfo().username}@${os.hostname()}`;

async function init(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const owner = text(flags, 'owner');
  if (!owner) throw new UsageError('init needs --owner <login>');
  const hubDir = path.resolve(positional[1] ?? process.cwd());
  const dir = hubDir.endsWith(MAPPING_DIR) ? hubDir : path.join(hubDir, MAPPING_DIR);
  const manifest = MappingManifestSchema.safeParse({
    schema: MAPPING_SCHEMA,
    version: 1,
    owner,
    hub: `${owner}/${owner}`,
    kind: flags.meta ? 'meta' : 'owner',
    ...(text(flags, 'description') ? { description: text(flags, 'description') } : {}),
  });
  if (!manifest.success) throw new UsageError(manifest.error.issues.map((i) => i.message).join('; '));
  await initMappingDir(dir, manifest.data);
  console.log(`${manifest.data.kind} hub ${manifest.data.hub}: ${dir}`);
  return 0;
}

async function validate(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const read = await readHub(await mappingDir(positional[1]), { local: flags.local === true });
  const errors = read.issues.filter((i) => i.severity === 'error').length;
  const warnings = read.issues.length - errors;
  if (flags.json) {
    console.log(JSON.stringify({ errors, warnings, hubs: read.hubs, issues: read.issues }, null, 2));
  } else {
    printIssues(read.issues);
    const m = read.merged;
    const rows = m ? `${m.repositories.length} repositories, ${m.features.length} features, ${m.capabilities.length} capabilities, ${m.relations.length} relations` : 'nothing read';
    console.error(`${errors} errors, ${warnings} warnings across ${read.hubs.length} hub(s): ${rows}`);
  }
  return errors ? 1 : 0;
}

async function list(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const { merged } = await hubOrFail(positional[1], flags.local === true);
  const readings = new Map(summarize(merged).readings.map((r) => [r.nodeId, r]));
  const rows = merged.repositories.filter((r) => {
    const reading = readings.get(r.nodeId);
    return (
      (!text(flags, 'lifecycle') || r.lifecycle === text(flags, 'lifecycle')) &&
      (!text(flags, 'drift') || reading?.drift === text(flags, 'drift')) &&
      (!text(flags, 'revision') || r.revision === text(flags, 'revision')) &&
      (!text(flags, 'field') || r.fields.includes(text(flags, 'field') as string))
    );
  });
  if (flags.json) {
    console.log(JSON.stringify(rows.map((r) => ({ ...r, reading: readings.get(r.nodeId) })), null, 2));
    return 0;
  }
  const width = Math.max(10, ...rows.map((r) => r.nodeId.length - 'repository:'.length));
  for (const r of rows) {
    const reading = readings.get(r.nodeId);
    const git = reading?.activity ? `${reading.activity}${reading.daysSinceLastCommit === undefined ? '' : ` ${reading.daysSinceLastCommit}d`}` : '-';
    const purpose = r.purpose ? (r.purpose.length > 70 ? `${r.purpose.slice(0, 69)}…` : r.purpose) : `(${r.status})`;
    console.log(
      [r.nodeId.slice('repository:'.length).padEnd(width), r.lifecycle.padEnd(14), git.padEnd(12), (reading?.drift ?? '').padEnd(10), r.revision.padEnd(8), purpose].join('  '),
    );
  }
  console.error(`${rows.length} of ${merged.repositories.length} repositories`);
  return 0;
}

async function show(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const id = positional[1] ? toRepositoryNodeId(positional[1]) : undefined;
  if (!id) throw new UsageError('show needs a repository: owner/name');
  const { merged } = await hubOrFail(positional[2], flags.local === true);
  const repo = merged.repositories.find((r) => r.nodeId.toLowerCase() === id.toLowerCase());
  if (!repo) {
    console.error(`mw-repomap: ${id} is not in this mapping`);
    return 1;
  }
  const features = merged.features.filter((f) => f.repository === repo.nodeId);
  const relations = merged.relations.filter((r) => r.from === repo.nodeId || r.to === repo.nodeId);
  const reading = reconcileLifecycle(repo);
  if (flags.json) {
    console.log(JSON.stringify({ repository: repo, reading, features, relations, source: merged.sources[repo.nodeId] }, null, 2));
    return 0;
  }
  const lines = [
    `${repo.nodeId}  ${repositoryUrl(repo.nodeId) ?? ''}`,
    `  ${repo.lifecycle} · ${repo.origin} · purpose ${repo.status} · ${repo.revision}`,
    `  git: ${reading.reason} (${reading.drift})`,
    repo.purpose ? `  purpose: ${repo.purpose}` : '',
    repo.horizon ? `  horizon: ${repo.horizon}` : '',
    repo.fields.length ? `  fields: ${repo.fields.join(', ')}` : '',
    repo.prototypes.length ? `  prototypes: ${repo.prototypes.join(', ')}` : '',
    `  features (${features.length}):`,
    ...features.map((f) => `    ${f.name} [${f.status}]${f.realizes ? ` → ${f.realizes}` : ''}${f.statement ? `: ${f.statement}` : ''}`),
    `  relations (${relations.length}):`,
    ...relations.map((r) => `    ${r.from} ${r.type} ${r.to}`),
    `  read: ${repo.grounding.join(', ')}`,
    `  stated by ${repo.statedBy} at ${repo.statedAt}${repo.revisedBy ? `, ${repo.revision} by ${repo.revisedBy} at ${repo.revisedAt}` : ''}`,
    `  from ${merged.sources[repo.nodeId]}`,
  ];
  console.log(lines.filter(Boolean).join('\n'));
  return 0;
}

async function observe(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const clones = positional.slice(1);
  if (!clones.length) throw new UsageError('observe needs at least one clone');
  const observedBy = text(flags, 'by') ?? defaultObserver();
  const dir = flags.write ? await mappingDir(text(flags, 'dir')) : undefined;
  const mapping = dir ? await forRewrite(dir) : undefined;
  let failed = 0;
  let written = 0;
  for (const clone of clones) {
    try {
      const observed = await readActivity(path.resolve(clone), { observedBy });
      const nodeId = await originRepository(path.resolve(clone));
      console.log(JSON.stringify({ clone, nodeId: nodeId ?? null, observed }));
      if (!mapping) continue;
      // GitHub names are case-insensitive: a clone of JGWill/miadi is jgwill/Miadi's row.
      const row = nodeId ? mapping.repositories.find((r) => r.nodeId.toLowerCase() === nodeId.toLowerCase()) : undefined;
      if (!row) {
        console.error(`mw-repomap: ${nodeId ?? clone} is not in the mapping yet; reading not written`);
        continue;
      }
      row.observed = observed;
      written += 1;
    } catch (error) {
      failed += 1;
      console.error(`mw-repomap: ${clone}: ${(error as Error).message}`);
    }
  }
  if (dir && mapping) {
    await writeMappingDir(dir, mapping);
    console.error(`${written} reading(s) written to ${dir}`);
  }
  return failed ? 1 : 0;
}

async function move(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const id = positional[1] ? toRepositoryNodeId(positional[1]) : undefined;
  const event = LifecycleEventSchema.safeParse(positional[2]);
  const by = text(flags, 'by');
  if (!id || !event.success) throw new UsageError(`move needs a repository and an event: ${LifecycleEventSchema.options.join(', ')}`);
  if (!by) throw new UsageError('move needs --by <who>: a lifecycle change is a statement someone makes');
  const dir = await mappingDir(positional[3]);
  const mapping = await forRewrite(dir);
  const row = mapping.repositories.find((r) => r.nodeId.toLowerCase() === id.toLowerCase());
  if (!row) {
    console.error(`mw-repomap: ${id} is not in ${dir}`);
    return 1;
  }
  const result = transition(row.lifecycle, event.data as LifecycleEvent);
  if (!result.ok) {
    console.error(`mw-repomap: ${result.reason}`);
    return 1;
  }
  row.lifecycle = result.to;
  row.statedBy = by;
  row.statedAt = new Date().toISOString();
  row.revision = 'pending';
  delete row.revisedBy;
  delete row.revisedAt;
  const grounding = text(flags, 'grounding');
  if (grounding && !row.grounding.includes(grounding)) row.grounding.push(grounding);
  await writeMappingDir(dir, mapping);
  console.log(`${id}: ${result.from} --${result.event}--> ${result.to}`);
  return 0;
}

async function hub(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const read = await hubOrFail(positional[1], false);
  if (flags.json) {
    console.log(JSON.stringify({ hubs: read.hubs, summary: summarize(read.merged) }, null, 2));
  } else {
    for (const h of read.hubs) {
      const errors = h.issues.filter((i) => i.severity === 'error').length;
      console.log(`${h.hub.padEnd(40)} ${h.read ? `${h.repositories} repositories` : 'not read'}  ${errors} errors, ${h.issues.length - errors} warnings  ${h.source}`);
    }
  }
  return read.hubs.some((h) => !h.read) ? 1 : 0;
}

async function serve(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const dir = await mappingDir(positional[1]);
  const port = Number(text(flags, 'port') ?? 3967);
  const host = text(flags, 'host') ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new UsageError('--port needs a port number');
  // Bound to loopback, answer only loopback names: a page that rebinds its own
  // name to 127.0.0.1 is refused. Bound wider, the person chose who reaches it.
  const loopback = (LOOPBACK_HOSTS as readonly string[]).includes(host.toLowerCase()) || host === '::1';
  const server = createMappingServer(() => readHub(dir, { local: flags.local === true }), {
    ...(loopback ? { allowedHosts: LOOPBACK_HOSTS } : {}),
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address();
  const shown = typeof address === 'object' && address ? `http://${host}:${address.port}/` : `http://${host}:${port}/`;
  console.error(`mw-repomap: serving ${dir} at ${shown}`);
  return new Promise<number>(() => {});
}

async function wheel(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const { merged } = await hubOrFail(positional[1], flags.local === true);
  console.log(JSON.stringify({ nodes: toWheelNodes(merged), edges: toWheelEdges(merged) }, null, 2));
  return 0;
}

const SCAN_OBSERVER = () => `mw-repomap capabilities (${os.userInfo().username}@${os.hostname()})`;

/** The flags each capabilities subcommand takes: a flag another subcommand takes is a usage error here, never ignored. */
const CAPABILITY_FLAGS: Record<string, readonly string[]> = {
  scan: ['write', 'check', 'ref', 'repository'],
  state: ['by', 'clone', 'realizes'],
  show: ['ref', 'repository', 'json'],
  map: ['root', 'list', 'out', 'packages', 'ref', 'json'],
};

/** Text from a file someone else committed, printable: a control character never reaches the terminal. */
const printable = (text: string) => text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '?');

function changeLine(result: { added: string[]; removed: string[]; changed: string[]; keptByPerson: string[] }): string {
  return `${result.added.length} added, ${result.changed.length} changed, ${result.removed.length} removed, ${result.keptByPerson.length} kept by a person`;
}

function printCapabilityIssues(issues: readonly MappingIssue[], where?: string): void {
  for (const i of issues) console.error(printable(`${i.severity} ${where ? `${where} ` : ''}${i.file ?? ''}${i.line ? `:${i.line}` : ''} — ${i.message}`));
}

async function capabilitiesScan(positional: string[], flags: Record<string, string | true>): Promise<number> {
  if (positional.length > 3) throw new UsageError('capabilities scan takes one clone');
  if (flags.write && flags.check) throw new UsageError('--write changes the file and --check does not: pick one');
  const clone = positional[2] ?? '.';
  // The commit being worked on: a person writes the file on the branch they will commit it to.
  const repository = text(flags, 'repository');
  const scan = await scanRepository(clone, { ref: text(flags, 'ref') ?? 'HEAD', ...(repository ? { repository } : {}), observedBy: SCAN_OBSERVER() });
  printCapabilityIssues(scan.issues);
  const result = await writeCapabilityFile(clone, scan, { write: flags.write === true, ...(repository ? { repository } : {}) });
  const origin = scan.repository.replace(/^repository:/, '');
  if (result.repository.toLowerCase() !== origin.toLowerCase()) {
    console.error(`note: the file is written for ${result.repository}; this clone's origin is ${origin}. Its addresses stay ${result.repository}'s; --repository ${origin} adopts it.`);
  }
  if (result.ignored) console.error(`warning: this repository's ignore rules match ${CAPABILITY_FILE}, so git add leaves it out. Add the line !${CAPABILITY_FILE} after the rule that matches it.`);
  const at = `${result.repository} @ ${scan.commit.slice(0, 12)}`;
  if (flags.write) {
    console.error(`${at}: ${scan.fileRows.length} found. ${result.wrote ? `wrote ${result.file}` : `${CAPABILITY_FILE} is up to date`} (${changeLine(result)})`);
    return 0;
  }
  if (flags.check) {
    console.error(result.differs ? `${CAPABILITY_FILE} is behind ${at} (${changeLine(result)}): run capabilities scan --write` : `${CAPABILITY_FILE} is up to date with ${at}`);
    return result.differs ? 1 : 0;
  }
  process.stdout.write(result.text);
  console.error(`${at}: ${scan.fileRows.length} found, nothing written (--write keeps them in ${CAPABILITY_FILE})`);
  return 0;
}

async function capabilitiesState(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const target = positional[2];
  const slash = target?.indexOf('/') ?? -1;
  const kind = target?.slice(0, slash) as CapabilityKind;
  if (!target || slash < 1 || !CAPABILITY_KINDS.includes(kind)) throw new UsageError(`capabilities state needs <kind>/<name>, kind one of ${CAPABILITY_KINDS.join(', ')}`);
  const by = text(flags, 'by');
  if (!by) throw new UsageError('capabilities state needs --by <who>: a statement is something someone says');
  if (positional.length > 4) throw new UsageError('quote the statement: capabilities state <kind>/<name> "<at most 55 words>"');
  const realizes = text(flags, 'realizes')?.split(',').map((r) => r.trim()).filter(Boolean);
  const { file, row } = await stateCapability(text(flags, 'clone') ?? '.', {
    kind,
    name: target.slice(slash + 1),
    by,
    ...(positional[3] !== undefined ? { statement: positional[3] } : {}),
    ...(realizes ? { realizes } : {}),
  });
  console.error(`${row.kind}/${row.name} ${row.revision} by ${by}${row.realizes ? `, realizes ${row.realizes.map((r) => r.capability).join(', ')}` : ''} in ${file}`);
  return 0;
}

async function capabilitiesShow(positional: string[], flags: Record<string, string | true>): Promise<number> {
  if (positional.length > 3) throw new UsageError('capabilities show takes one clone');
  const repository = text(flags, 'repository');
  // HEAD, the commit a person works on; `map` reads each clone's default branch.
  const read = await readRepositoryCapabilities(positional[2] ?? '.', { ref: text(flags, 'ref') ?? 'HEAD', ...(repository ? { repository } : {}), observedBy: SCAN_OBSERVER() });
  printCapabilityIssues(read.issues);
  const failed = read.issues.some((i) => i.severity === 'error') ? 1 : 0;
  if (flags.json) {
    console.log(JSON.stringify({ repository: read.repository, commit: read.commit, source: read.source, capabilities: read.capabilities, packages: read.packages, realizes: read.realizes, issues: read.issues, ...(read.drift ? { drift: read.drift } : {}) }, null, 2));
    return failed;
  }
  console.log(`${read.repository.replace(/^repository:/, '')} @ ${read.commit.slice(0, 12)} provides ${read.capabilities.length} (read from ${read.source === 'file' ? CAPABILITY_FILE : 'its files; it holds no capability file'})`);
  for (const c of read.capabilities) {
    const kind = /^capability:(package|cli|skill)-/.exec(c.nodeId)?.[1] ?? 'other';
    const realizes = read.realizes.filter((r) => r.from === c.nodeId).map((r) => r.to);
    console.log(printable(`  ${kind.padEnd(8)} ${c.name}${c.statement ? ` — ${c.statement}` : ` [${c.status}]`}${realizes.length ? `  (realizes ${realizes.join(', ')})` : ''}`));
  }
  return failed;
}

async function capabilitiesMap(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const clones = [...positional.slice(2)];
  const skipped: { dir: string; reason: string }[] = [];
  const root = text(flags, 'root');
  if (root) clones.push(...findClones(root, { onSkip: (dir, reason) => skipped.push({ dir, reason }) }));
  const list = text(flags, 'list');
  if (list) clones.push(...readFileSync(list, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
  const unique = [...new Set(clones.map((c) => path.resolve(c)))];
  for (const s of skipped) console.error(printable(`skipped ${s.dir}: ${s.reason}`));
  if (!unique.length) throw new UsageError('capabilities map needs clones: name them, or --root <dir>, or --list <file>');
  // Each clone's default branch as it was last fetched: fetch first for today's.
  const map = await buildCapabilityMap(unique, { ...(text(flags, 'ref') ? { ref: text(flags, 'ref') } : {}), observedBy: SCAN_OBSERVER() });
  const out = text(flags, 'out');
  if (out) writeFileSync(out, map.capabilities.map((c) => JSON.stringify(c)).join('\n') + '\n', 'utf8');
  const packages = text(flags, 'packages');
  if (packages) writeFileSync(packages, map.packages.map((p) => JSON.stringify(p)).join('\n') + '\n', 'utf8');
  const failed = map.repositories.filter((r) => r.error);
  const erred = map.repositories.filter((r) => r.issues.some((i) => i.severity === 'error'));
  if (flags.json) {
    console.log(JSON.stringify({ ...map, skipped }, null, 2));
  } else {
    for (const r of map.repositories) {
      if (r.error) {
        console.log(printable(`  ${path.basename(r.clone).padEnd(36)} could not be read: ${r.error}`));
        continue;
      }
      const c = r.counts!;
      const stale = r.drift && (r.drift.added.length || r.drift.removed.length) ? `  file behind by ${r.drift.added.length + r.drift.removed.length}` : '';
      console.log(`  ${r.repository!.replace(/^repository:/, '').padEnd(36)} ${r.source!.padEnd(5)} ${String(c.package).padStart(3)} packages ${String(c.cli).padStart(3)} CLIs ${String(c.skill).padStart(3)} skills  @${r.commit!.slice(0, 12)}${stale}`);
      printCapabilityIssues(r.issues, r.repository!.replace(/^repository:/, ''));
    }
    for (const c of map.collisions) console.error(printable(`warning: ${c.names.join(' and ')} share the id ${c.nodeId}, so one row stands for both`));
    console.log(`${map.capabilities.length} capabilities from ${map.repositories.length - failed.length} repositories, ${map.consumes.length} consumes relations between their packages${map.realizes.length ? `, ${map.realizes.length} realizes` : ''}${failed.length ? `, ${failed.length} could not be read` : ''}${skipped.length ? `, ${skipped.length} folders skipped` : ''}`);
  }
  return failed.length || erred.length ? 1 : 0;
}

async function capabilities(positional: string[], flags: Record<string, string | true>): Promise<number> {
  const sub = positional[1];
  const allowed = sub ? CAPABILITY_FLAGS[sub] : undefined;
  if (!allowed) throw new UsageError('capabilities needs scan, state, show or map');
  const unknown = Object.keys(flags).filter((k) => !allowed.includes(k));
  if (unknown.length) throw new UsageError(`capabilities ${sub} does not take ${unknown.map((k) => `--${k}`).join(', ')}; it takes ${allowed.map((k) => `--${k}`).join(', ')}`);
  if (sub === 'scan') return capabilitiesScan(positional, flags);
  if (sub === 'state') return capabilitiesState(positional, flags);
  if (sub === 'show') return capabilitiesShow(positional, flags);
  return capabilitiesMap(positional, flags);
}

const COMMANDS: Record<string, (positional: string[], flags: Record<string, string | true>) => Promise<number>> = {
  init,
  validate,
  list,
  show,
  observe,
  move,
  hub,
  serve,
  wheel,
  capabilities,
};

async function main(): Promise<number> {
  const { positional, flags } = parse(process.argv.slice(2));
  const command = positional[0];
  if (command === 'help' || (flags.help && !command)) {
    console.log(USAGE);
    return 0;
  }
  if (!command) throw new UsageError('a command is needed');
  const run = COMMANDS[command];
  if (!run) throw new UsageError(`unknown command: ${command}`);
  return run(positional, flags);
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    if (error instanceof UsageError) {
      console.error(`mw-repomap: ${error.message}`);
      console.error(USAGE);
      process.exitCode = 2;
      return;
    }
    console.error(`mw-repomap: ${(error as Error).message}`);
    process.exitCode = 1;
  },
);
