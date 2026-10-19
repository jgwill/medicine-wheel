/**
 * What a mapping says about itself once its rows are read: duplicates, rows
 * in the wrong hub, features of a repository the mapping does not hold, and
 * references to nodes it does not hold.
 *
 * A reference to a node the mapping does not hold is a warning, not an
 * error. A fork's origin lives in someone else's hub, and the platform's
 * capabilities live in the meta hub; a merged reading resolves them.
 */

import { featureRepository, parseRepositoryNodeId } from './ids';
import { PROTOTYPE_CORE_FEATURES, type MappingIssue, type RepositoryMapping } from './types';

export interface CheckOptions {
  /** A merged reading of several hubs: rows from many owners are expected. */
  merged?: boolean;
}

export function relationKey(row: { from: string; type: string; to: string }): string {
  return `${row.from} ${row.type} ${row.to}`;
}

/**
 * Whose word a relation is: the owner of the repository (or of the feature's
 * repository) it starts from. `undefined` for a relation from a service, which
 * only the meta hub speaks for.
 */
export function speakingOwner(from: string): string | undefined {
  const repo = from.startsWith('feature:') ? featureRepository(from) : from;
  return repo ? parseRepositoryNodeId(repo)?.owner : undefined;
}

export function checkMapping(mapping: RepositoryMapping, options: CheckOptions = {}): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const { manifest } = mapping;
  const error = (message: string, nodeId?: string, file?: string) =>
    issues.push({ severity: 'error', message, ...(nodeId ? { nodeId } : {}), ...(file ? { file } : {}) });
  const warning = (message: string, nodeId?: string, file?: string) =>
    issues.push({ severity: 'warning', message, ...(nodeId ? { nodeId } : {}), ...(file ? { file } : {}) });

  // GitHub names are case-insensitive: jgwill/Miadi and jgwill/miadi are one repository.
  const held = new Set<string>();
  const heldFolded = new Set<string>();
  const holdOnce = (id: string, file: string) => {
    if (heldFolded.has(id.toLowerCase())) error(`${id} appears more than once`, id, file);
    held.add(id);
    heldFolded.add(id.toLowerCase());
  };
  mapping.repositories.forEach((r) => holdOnce(r.nodeId, 'repositories.jsonl'));
  mapping.features.forEach((f) => holdOnce(f.nodeId, 'features.jsonl'));
  mapping.capabilities.forEach((c) => holdOnce(c.nodeId, 'capabilities.jsonl'));

  const repositories = new Map(mapping.repositories.map((r) => [r.nodeId, r]));

  if (!options.merged) {
    for (const r of mapping.repositories) {
      const owner = parseRepositoryNodeId(r.nodeId)?.owner;
      if (owner && owner.toLowerCase() !== manifest.owner.toLowerCase()) {
        error(`${r.nodeId} belongs in ${owner}/${owner}'s mapping, not ${manifest.hub}'s`, r.nodeId, 'repositories.jsonl');
      }
    }
    if (manifest.kind === 'owner' && mapping.owners.length) {
      error(`only a meta hub registers owners; ${manifest.hub} is an owner hub`, undefined, 'owners.jsonl');
    }
    for (const rel of mapping.relations) {
      const owner = speakingOwner(rel.from);
      if (owner && owner.toLowerCase() !== manifest.owner.toLowerCase()) {
        error(`${relationKey(rel)} speaks for ${owner}'s ${rel.from}; it belongs in ${owner}/${owner}'s mapping`, rel.from, 'relations.jsonl');
      }
    }
  }

  const featureCount = new Map<string, number>();
  for (const f of mapping.features) {
    if (!repositories.has(f.repository)) {
      error(`${f.nodeId} is a feature of ${f.repository}, which this mapping does not hold`, f.nodeId, 'features.jsonl');
    }
    featureCount.set(f.repository, (featureCount.get(f.repository) ?? 0) + 1);
    if (f.realizes && !held.has(f.realizes)) {
      warning(`${f.nodeId} realizes ${f.realizes}, which this mapping does not hold`, f.nodeId, 'features.jsonl');
    }
  }
  for (const [repo, count] of featureCount) {
    if (repositories.get(repo)?.lifecycle === 'prototype' && count > PROTOTYPE_CORE_FEATURES) {
      warning(`${repo} is a prototype with ${count} features; name its ${PROTOTYPE_CORE_FEATURES} core ones`, repo, 'features.jsonl');
    }
  }

  for (const c of mapping.capabilities) {
    for (const provider of c.providedBy) {
      if (provider.startsWith('repository:') && !held.has(provider)) {
        warning(`${c.nodeId} is provided by ${provider}, which this mapping does not hold`, c.nodeId, 'capabilities.jsonl');
      }
    }
  }

  const relations = new Set<string>();
  for (const rel of mapping.relations) {
    const key = relationKey(rel);
    if (relations.has(key)) error(`${key} appears more than once`, rel.from, 'relations.jsonl');
    relations.add(key);
    for (const end of [rel.from, rel.to]) {
      const kind = end.slice(0, end.indexOf(':'));
      if ((kind === 'repository' || kind === 'feature' || kind === 'capability') && !held.has(end)) {
        warning(`${key}: ${end} is not in this mapping`, rel.from, 'relations.jsonl');
      }
    }
  }

  const hubs = new Set<string>();
  for (const o of mapping.owners) {
    if (hubs.has(o.hub)) error(`${o.hub} is registered more than once`, undefined, 'owners.jsonl');
    hubs.add(o.hub);
  }

  return issues;
}

export function hasErrors(issues: readonly MappingIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
