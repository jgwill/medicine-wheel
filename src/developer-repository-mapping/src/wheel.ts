/**
 * A mapping as the wheel holds it: `RelationalNode`s riding `knowledge` with
 * `metadata.kind`, and `RelationalEdge`s named from the governed kinship
 * vocabulary. Pure; writing them into a wheel is the caller's act.
 *
 * Edge identity is the directional `from:to` pair, as the wheel's storage
 * reads it. When two relations join the same pair in the same direction, the
 * first one is kept.
 */

import {
  DEVELOPER_ENTITY_BINDING,
  getKinshipEdgeType,
  type DeveloperEntityKind,
  type RelationalEdge,
  type RelationalNode,
} from '@medicine-wheel/ontology-core';
import type { Attribution } from '@medicine-wheel/capabilities';
import { parseRepositoryNodeId } from './ids';
import type { RepositoryMapping } from './types';

function node(
  kind: DeveloperEntityKind,
  row: Attribution & { nodeId: string },
  name: string,
): RelationalNode {
  const { nodeId, ...facet } = row;
  const { nodeType, direction } = DEVELOPER_ENTITY_BINDING[kind];
  return {
    id: nodeId,
    name,
    type: nodeType,
    ...(direction ? { direction } : {}),
    metadata: { kind, ...facet },
    created_at: row.statedAt,
    updated_at: row.revisedAt ?? row.statedAt,
  };
}

export function toWheelNodes(mapping: RepositoryMapping): RelationalNode[] {
  return [
    ...mapping.repositories.map((r) => {
      const repo = parseRepositoryNodeId(r.nodeId);
      return node('repository', r, repo ? `${repo.owner}/${repo.name}` : r.nodeId);
    }),
    ...mapping.features.map((f) => node('feature', f, f.name)),
    ...mapping.capabilities.map((c) => node('capability', c, c.name)),
  ];
}

export function toWheelEdges(mapping: RepositoryMapping): RelationalEdge[] {
  const edges = new Map<string, RelationalEdge>();
  const add = (from: string, to: string, type: string, created: string, description?: string) => {
    const id = `${from}:${to}`;
    if (edges.has(id)) return;
    edges.set(id, {
      id,
      from_id: from,
      to_id: to,
      relationship_type: type,
      strength: 1,
      ceremony_honored: false,
      obligations: [...(getKinshipEdgeType(type)?.defaultObligations ?? [])],
      ...(description ? { description } : {}),
      created_at: created,
    });
  };

  for (const rel of mapping.relations) add(rel.from, rel.to, rel.type, rel.statedAt, rel.description);
  for (const f of mapping.features) {
    add(f.nodeId, f.repository, 'part-of', f.statedAt);
    if (f.realizes) add(f.nodeId, f.realizes, 'realizes', f.statedAt);
  }
  for (const c of mapping.capabilities) {
    for (const provider of c.providedBy) add(provider, c.nodeId, 'provides', c.statedAt);
  }
  for (const r of mapping.repositories) {
    for (const field of r.fields) add(r.nodeId, field, 'field-aligns-with', r.statedAt);
  }
  return [...edges.values()];
}
