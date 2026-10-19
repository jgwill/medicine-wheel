/**
 * The meta mapping: one reading of several owner hubs, without copying them.
 *
 * A meta hub (jgwill/jgwill) registers other owner hubs in `owners.jsonl`
 * and reads their mapping folders where they live. Nothing is indexed into
 * the meta hub; the merge happens at read time, and each row keeps the hub it
 * came from.
 *
 * Who speaks for a repository: the hub of the owner who holds it. A row about
 * `repository:miadisabelle/x` found in another hub — the repository, one of its
 * features, or a relation starting from either — is skipped and reported.
 * Capabilities are the platform's, so the first hub read (the meta hub) speaks
 * for them, and a different definition elsewhere is reported; it also speaks
 * for relations that start from a service.
 */

import { relationKey, speakingOwner } from './check';
import { parseRepositoryNodeId } from './ids';
import type { MappingIssue, RepositoryMapping } from './types';

export interface HubReading {
  /** '<owner>/<owner>' */
  hub: string;
  mapping: RepositoryMapping;
}

export interface MergedMapping extends RepositoryMapping {
  /** Hubs read, in order. The first one is the meta hub. */
  hubs: string[];
  /** Row id (node id, or `from type to` for a relation) → the hub it came from. */
  sources: Record<string, string>;
  issues: MappingIssue[];
}

export function mergeMappings(readings: readonly HubReading[]): MergedMapping {
  if (!readings.length) throw new Error('mergeMappings needs at least the meta hub');
  const [first] = readings;
  const merged: MergedMapping = {
    manifest: first.mapping.manifest,
    repositories: [],
    features: [],
    capabilities: [],
    relations: [],
    owners: [...first.mapping.owners],
    hubs: [],
    sources: {},
    issues: [],
  };
  const { sources, issues } = merged;
  const capabilityJson = new Map<string, string>();

  for (const [index, { hub, mapping }] of readings.entries()) {
    merged.hubs.push(hub);
    const owner = hub.split('/')[0].toLowerCase();
    const accepted = new Set<string>();

    for (const r of mapping.repositories) {
      const repoOwner = parseRepositoryNodeId(r.nodeId)?.owner.toLowerCase();
      if (repoOwner !== owner) {
        issues.push({ severity: 'warning', file: hub, nodeId: r.nodeId, message: `${hub} maps ${r.nodeId}, which is not its owner's; skipped` });
        continue;
      }
      if (sources[r.nodeId]) {
        issues.push({ severity: 'warning', file: hub, nodeId: r.nodeId, message: `${r.nodeId} already read from ${sources[r.nodeId]}; skipped` });
        continue;
      }
      merged.repositories.push(r);
      sources[r.nodeId] = hub;
      accepted.add(r.nodeId);
    }

    for (const f of mapping.features) {
      if (!accepted.has(f.repository)) {
        issues.push({ severity: 'warning', file: hub, nodeId: f.nodeId, message: `${hub} holds ${f.nodeId}, but ${f.repository} is not read from ${hub}; skipped` });
        continue;
      }
      if (sources[f.nodeId]) continue;
      merged.features.push(f);
      sources[f.nodeId] = hub;
    }

    for (const c of mapping.capabilities) {
      const json = JSON.stringify(c);
      const earlier = sources[c.nodeId];
      if (earlier) {
        if (capabilityJson.get(c.nodeId) !== json) {
          issues.push({ severity: 'warning', file: hub, nodeId: c.nodeId, message: `${c.nodeId} is defined differently in ${hub}; kept ${earlier}'s` });
        }
        continue;
      }
      merged.capabilities.push(c);
      capabilityJson.set(c.nodeId, json);
      sources[c.nodeId] = hub;
    }

    for (const rel of mapping.relations) {
      const key = relationKey(rel);
      const speaker = speakingOwner(rel.from)?.toLowerCase();
      if (speaker ? speaker !== owner : index > 0) {
        issues.push({ severity: 'warning', file: hub, nodeId: rel.from, message: `${hub} holds ${key}, which ${speaker ? `${speaker}/${speaker}` : 'the meta hub'} speaks for; skipped` });
        continue;
      }
      if (sources[key]) continue;
      merged.relations.push(rel);
      sources[key] = hub;
    }
  }

  return merged;
}
