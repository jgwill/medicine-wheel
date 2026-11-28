/**
 * Project the Stateloom files named by a capability map into Wheel knowledge
 * nodes. The supplied clones are the source: no checkout, network fetch,
 * registration or change to the Wheel is part of this read.
 */

import { execFile } from 'node:child_process';
import { posix } from 'node:path';
import { promisify } from 'node:util';
import { SystemRefSchema, type CapabilityFacet } from '@medicine-wheel/capabilities';
import {
  DEVELOPER_ENTITY_BINDING,
  DESIGN_ENTITY_BINDING,
  getKinshipEdgeType,
  type DesignEntityKind,
  type DesignRelationType,
  type RelationalEdge,
  type RelationalNode,
} from '@medicine-wheel/ontology-core';
import { holdsUnsafeCharacter } from '../capability-scan';
import { parseGithubRemote } from '../ids';
import type { MappingIssue } from '../types';
import type { CapabilityMap, CapabilityMapRepository } from './capability-scan';

const run = promisify(execFile);
const REVISION = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const PATH_SEGMENT = /^[A-Za-z0-9_~-][A-Za-z0-9._~-]{0,127}$/;

export interface DesignProjectionIssue extends MappingIssue {
  /** The system reference as named by the capability. */
  reference: string;
}

export interface ProjectedDesignNode extends RelationalNode {
  metadata: {
    kind: DesignEntityKind;
    repository: string;
    path: string;
    /** One pinned RISE address per observed revision. */
    sources: string[];
    /** The address a reader can open directly when only one revision was observed. */
    source_ref?: string;
    /** Browser door when a supplied clone is grounded in GitHub. */
    source_url?: string;
    namespace?: string;
    drawingKind?: 'erd' | 'machine' | 'sequence';
  };
}

export interface DesignProjection {
  nodes: RelationalNode[];
  edges: RelationalEdge[];
  issues: DesignProjectionIssue[];
}

interface SystemReference {
  repository: string;
  path: string;
  revision?: string;
}

interface SourceRevision {
  clone: string;
  commit: string;
  timestamp: string;
  github?: string;
}

async function git(clone: string, args: string[]): Promise<string | undefined> {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1' };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  try {
    const { stdout } = await run('git', ['-C', clone, ...args], { env, maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  } catch {
    return undefined;
  }
}

function parseReference(ref: string): SystemReference | undefined {
  if (!SystemRefSchema.safeParse(ref).success) return undefined;
  const [owner, repo, ...parts] = ref.slice('rise://'.length).split('/');
  const [path, revision] = parts.join('/').split('@');
  return { repository: `${owner}/${repo}`, path: path!, ...(revision ? { revision } : {}) };
}

async function resolveRevision(
  ref: SystemReference,
  clones: readonly CapabilityMapRepository[],
): Promise<{ source: SourceRevision } | { error: string }> {
  if (!clones.length) return { error: 'no supplied clone matches the system repository' };
  const revisions = new Map<string, string>();
  for (const repo of clones) {
    const selected = ref.revision ?? repo.commit;
    if (!selected) continue;
    const commit = (await git(repo.clone, ['rev-parse', '--verify', '--end-of-options', `${selected}^{commit}`]))?.trim();
    if (commit && REVISION.test(commit) && !revisions.has(commit)) revisions.set(commit, repo.clone);
  }
  if (!revisions.size) return { error: 'the cited revision is unavailable in the supplied clone' };
  if (revisions.size > 1) return { error: 'the cited revision resolves to different commits across supplied clones' };
  const [commit, clone] = [...revisions][0]!;
  const date = Date.parse((await git(clone, ['show', '-s', '--format=%cI', commit]))?.trim() ?? '');
  if (!Number.isFinite(date)) return { error: 'the cited revision has no readable commit timestamp' };
  const origin = (await git(clone, ['remote', 'get-url', 'origin']))?.trim() ?? '';
  const githubOrigin = /^(?:(?:https?|ssh):\/\/(?:[^@/\s]+@)?github\.com\/|[^@/\s]+@github\.com:)/i.test(origin);
  const remote = githubOrigin ? parseGithubRemote(origin) : undefined;
  const github = remote && `${remote.owner}/${remote.name}`;
  const remoteBranch = github?.toLowerCase() === ref.repository.toLowerCase()
    ? await git(clone, ['for-each-ref', '--count=1', `--contains=${commit}`, 'refs/remotes/origin/'])
    : undefined;
  return {
    source: {
      clone, commit, timestamp: new Date(date).toISOString(),
      ...(remoteBranch?.trim() && github ? { github } : {}),
    },
  };
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

async function readDocument(source: SourceRevision, path: string): Promise<Record<string, unknown> | undefined> {
  // A symlink is a blob too. Require Git's ordinary-file mode before reading.
  const entry = await git(source.clone, ['ls-tree', '--full-tree', '-z', source.commit, '--', `:(literal)${path}`]);
  const blob = /^100(?:644|755) blob ([0-9a-f]+)\t/.exec(entry ?? '')?.[1];
  if (!blob) return undefined;
  const content = await git(source.clone, ['cat-file', 'blob', blob]);
  try {
    return object(JSON.parse(content ?? ''));
  } catch {
    return undefined;
  }
}

const label = (value: unknown) =>
  typeof value === 'string' && value.trim() && !holdsUnsafeCharacter(value) ? value.trim() : undefined;

function drawingKind(path: string): ProjectedDesignNode['metadata']['drawingKind'] {
  const ext = /\.(erd|smd|sqd)f\.json$/.exec(path.toLowerCase())?.[1];
  if (ext === 'erd') return 'erd';
  if (ext === 'smd') return 'machine';
  if (ext === 'sqd') return 'sequence';
}

function matchesDrawing(doc: Record<string, unknown>, kind: NonNullable<ProjectedDesignNode['metadata']['drawingKind']>): boolean {
  if ('members' in doc) return false;
  if (kind === 'erd') return Array.isArray(doc.entities) && !('state' in doc);
  if (kind === 'sequence') return Array.isArray(doc.participants) && Array.isArray(doc.messages) && !('state' in doc) && !('entities' in doc);
  return 'state' in doc && !('entities' in doc) && !('participants' in doc);
}

function memberPath(system: string, member: string): string | undefined {
  const segments = member.split('/');
  // The repository projection accepts portable member paths below the SYSDF
  // folder. Host-local absolute paths and parent traversal are outside it.
  if (segments[0] === '.') segments.shift();
  if (!segments.every((segment) => PATH_SEGMENT.test(segment))) return undefined;
  const path = posix.join(posix.dirname(system), ...segments);
  return path.split('/').length <= 17 ? path : undefined;
}

interface DesignReading {
  kind: DesignEntityKind;
  name: string;
  path: string;
  namespace?: string;
  drawingKind?: ProjectedDesignNode['metadata']['drawingKind'];
}

interface PendingEdge {
  edge: RelationalEdge;
  sources: Set<string>;
}

export async function buildDesignProjection(map: Pick<CapabilityMap, 'repositories' | 'capabilities'>): Promise<DesignProjection> {
  const nodes = new Map<string, ProjectedDesignNode>();
  const capabilityNodes = new Map<string, RelationalNode>();
  const edges = new Map<string, PendingEdge>();
  const issues: DesignProjectionIssue[] = [];
  const byReference = new Map<string, typeof map.capabilities>();
  const providers = new Map<string, Set<string>>();
  for (const capability of map.capabilities) {
    const known = providers.get(capability.nodeId) ?? new Set<string>();
    for (const repository of capability.providedBy) known.add(repository.toLowerCase());
    providers.set(capability.nodeId, known);
    for (const reference of capability.systems ?? []) {
      const citations = byReference.get(reference) ?? [];
      citations.push(capability);
      byReference.set(reference, citations);
    }
  }

  const addNode = (reading: DesignReading, repository: string, source: SourceRevision): ProjectedDesignNode => {
    const id = `${reading.kind}:${repository.toLowerCase()}/${reading.path}`;
    const address = `rise://${repository}/${reading.path}@${source.commit}`;
    const { name, ...metadata } = reading;
    const existing = nodes.get(id);
    if (existing) {
      if (!existing.metadata.sources.includes(address)) existing.metadata.sources.push(address);
      if (existing.metadata.sources.length > 1) {
        delete existing.metadata.source_ref;
        delete existing.metadata.source_url;
      }
      if (source.timestamp < existing.created_at) existing.created_at = source.timestamp;
      if (source.timestamp > existing.updated_at) existing.updated_at = source.timestamp;
      return existing;
    }
    const node: ProjectedDesignNode = {
      id,
      type: DESIGN_ENTITY_BINDING[reading.kind].nodeType,
      name,
      metadata: {
        ...metadata, repository, sources: [address], source_ref: address,
        ...(source.github ? { source_url: `https://github.com/${source.github}/blob/${source.commit}/${reading.path}` } : {}),
      },
      created_at: source.timestamp,
      updated_at: source.timestamp,
    };
    nodes.set(id, node);
    return node;
  };

  const addCapability = (capability: CapabilityFacet, provider: string): RelationalNode => {
    const { nodeId, ...facet } = capability;
    const qualifier = provider.toLowerCase().replace(/^repository:/, '');
    const id = (providers.get(nodeId)?.size ?? 0) > 1 ? `${nodeId}@${qualifier}` : nodeId;
    const existing = capabilityNodes.get(id);
    if (existing) return existing;
    const { nodeType, direction } = DEVELOPER_ENTITY_BINDING.capability;
    const node: RelationalNode = {
      id, type: nodeType, name: facet.name,
      ...(direction ? { direction } : {}),
      metadata: { ...facet, providedBy: [provider], kind: 'capability', capability_id: nodeId },
      created_at: facet.statedAt,
      updated_at: facet.revisedAt ?? facet.statedAt,
    };
    capabilityNodes.set(id, node);
    return node;
  };

  const addEdge = (from: string, to: string, type: DesignRelationType, timestamp: string, source: string) => {
    const id = `${from}:${to}:${type}`;
    const existing = edges.get(id);
    if (existing) {
      existing.sources.add(source);
      if (timestamp < existing.edge.created_at) existing.edge.created_at = timestamp;
      return;
    }
    edges.set(id, {
      edge: {
        id, from_id: from, to_id: to, relationship_type: type, kinship_type: type,
        strength: 1, ceremony_honored: false, obligations: [...(getKinshipEdgeType(type)?.defaultObligations ?? [])],
        created_at: timestamp,
      },
      sources: new Set([source]),
    });
  };

  for (const [reference, capabilities] of [...byReference].sort(([a], [b]) => a.localeCompare(b))) {
    const report = (message: string, file?: string) => issues.push({ reference, severity: 'warning', message, ...(file ? { file } : {}) });
    const ref = parseReference(reference);
    if (!ref) {
      report('invalid Stateloom system address');
      continue;
    }
    const clones = map.repositories.filter((repo) => !repo.error &&
      repo.repository?.replace(/^repository:/, '').toLowerCase() === ref.repository.toLowerCase());
    const resolved = await resolveRevision(ref, clones);
    if ('error' in resolved) {
      report(resolved.error, ref.path);
      continue;
    }
    const { source } = resolved;
    const doc = await readDocument(source, ref.path);
    const settings = object(doc?.settings);
    const name = label(settings?.name);
    const namespace = label(settings?.namespace);
    if (!doc || !name || !namespace || !Array.isArray(doc.members) || 'state' in doc || 'entities' in doc || 'participants' in doc) {
      report('system is missing or does not contain a named SYSDF with members at the cited commit', ref.path);
      continue;
    }
    const repository = clones[0]!.repository!.replace(/^repository:/, '');
    const system = addNode({ kind: 'system', name, path: ref.path, namespace }, repository, source);
    const pinnedSystem = `rise://${repository}/${ref.path}@${source.commit}`;
    for (const capability of capabilities) {
      for (const provider of capability.providedBy) {
        const node = addCapability(capability, provider);
        addEdge(node.id, system.id, 'drawn-by', capability.statedAt, pinnedSystem);
      }
    }

    const seen = new Set<string>();
    for (const member of doc.members) {
      const relative = object(member)?.path;
      const path = typeof relative === 'string' ? memberPath(ref.path, relative) : undefined;
      const kind = path && drawingKind(path);
      if (!path || !kind) {
        report('member must use a contained relative .erdf.json, .smdf.json, or .sqdf.json path', ref.path);
        continue;
      }
      if (seen.has(path)) {
        report('duplicate system member', path);
        continue;
      }
      seen.add(path);
      const drawing = await readDocument(source, path);
      if (!drawing || !matchesDrawing(drawing, kind)) {
        report('member is missing or its content does not match its drawing extension at the cited commit', path);
        continue;
      }
      const drawingName = label(object(drawing.settings)?.name) ?? posix.basename(path);
      const node = addNode({ kind: 'diagram', name: drawingName, path, drawingKind: kind }, repository, source);
      addEdge(node.id, system.id, 'member-of', source.timestamp, pinnedSystem);
    }
  }

  for (const node of nodes.values()) {
    node.metadata.sources.sort();
    if (node.metadata.sources.length > 1) {
      issues.push({
        reference: node.metadata.sources[0]!, nodeId: node.id, file: node.metadata.path, severity: 'warning',
        message: 'this design is cited at several revisions; choose a pinned source',
      });
    }
  }
  return {
    nodes: [...nodes.values(), ...capabilityNodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].map(({ edge, sources }) => {
      const refs = [...sources].sort();
      const description = refs.join('\n');
      return {
        ...edge,
        description: description.length <= 2_000
          ? description
          : `${refs[0]} and ${refs.length - 1} other cited revisions of the system`,
      };
    }).sort((a, b) => a.id.localeCompare(b.id)),
    issues,
  };
}
