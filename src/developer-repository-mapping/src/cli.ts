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
 *
 * <path> is a mapping folder, or an owner hub clone holding
 * .miadi/repository-mapping/; the current directory when absent. A meta hub
 * reads every owner hub it registers, unless --local. <repository> is
 * owner/name or repository:owner/name.
 *
 * `observe --write` and `move` rewrite the folder's JSONL, and refuse while
 * any row fails to parse: a row that did not parse would not be written back.
 *
 * Exit codes: 0 done, 1 the mapping has errors or a read failed, 2 usage error.
 */

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
].join('\n');

const BOOLEAN_FLAGS = new Set(['meta', 'local', 'json', 'write', 'help']);

/** The flags each command takes. Any other flag is a usage error, so a misspelling never passes silently. */
const COMMAND_FLAGS: Record<string, readonly string[]> = {
  init: ['owner', 'meta', 'description'],
  validate: ['local', 'json'],
  list: ['lifecycle', 'drift', 'revision', 'field', 'local', 'json'],
  show: ['local', 'json'],
  observe: ['dir', 'by', 'write'],
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
