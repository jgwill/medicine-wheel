/**
 * Counts a person reads first, and the capability claims of a whole mapping.
 */

import {
  capabilityClaims,
  findSharedCapabilities,
  type CapabilityClaim,
  type RevisionState,
  type SharedCapability,
  type StatementStatus,
} from '@medicine-wheel/capabilities';
import { featureRepository } from './ids';
import { ACTIVITY_THRESHOLDS, reconcileLifecycle, type ActivityThresholds, type LifecycleReading } from './lifecycle';
import type { Lifecycle, LifecycleDrift, RepositoryMapping } from './types';

/**
 * Every claim a mapping makes on a capability: a capability's own
 * `providedBy`, each feature that realizes one — through its `realizes` field
 * or a `realizes` relation — claimed for the feature's repository, and each
 * `provides` relation.
 */
export function mappingCapabilityClaims(mapping: RepositoryMapping): CapabilityClaim[] {
  const realized = [
    ...mapping.features.flatMap((f) => (f.realizes ? [{ feature: f.nodeId, capability: f.realizes }] : [])),
    ...mapping.relations.filter((r) => r.type === 'realizes').map((r) => ({ feature: r.from, capability: r.to })),
  ];
  return [
    ...capabilityClaims(mapping.capabilities),
    ...realized.flatMap(({ feature, capability }) => {
      const provider = featureRepository(feature);
      return provider ? [{ capability, provider, via: feature }] : [];
    }),
    ...mapping.relations.filter((r) => r.type === 'provides').map((r) => ({ capability: r.to, provider: r.from })),
  ];
}

export interface MappingSummary {
  repositories: number;
  features: number;
  capabilities: number;
  relations: number;
  owners: number;
  byLifecycle: Record<Lifecycle, number>;
  byDrift: Record<LifecycleDrift, number>;
  byRevision: Record<RevisionState, number>;
  /** Of repository purposes. */
  byStatus: Record<StatementStatus, number>;
  /** research-field id → repositories aligned with it. */
  fields: Record<string, number>;
  shared: SharedCapability[];
  readings: LifecycleReading[];
}

export function summarize(
  mapping: RepositoryMapping,
  thresholds: ActivityThresholds = ACTIVITY_THRESHOLDS,
): MappingSummary {
  const byLifecycle: Record<Lifecycle, number> = { unclassified: 0, prototype: 0, implementation: 0, maintained: 0, archived: 0 };
  const byDrift: Record<LifecycleDrift, number> = { converged: 0, drifted: 0, unobserved: 0, undeclared: 0 };
  const byRevision: Record<RevisionState, number> = { pending: 0, revised: 0, affirmed: 0 };
  const byStatus: Record<StatementStatus, number> = { clear: 0, unclear: 0, undefinable: 0, 'needs-resolution': 0 };
  const fields: Record<string, number> = {};
  const readings = mapping.repositories.map((r) => reconcileLifecycle(r, thresholds));

  for (const r of mapping.repositories) {
    byLifecycle[r.lifecycle] += 1;
    byStatus[r.status] += 1;
    for (const f of r.fields) fields[f] = (fields[f] ?? 0) + 1;
  }
  for (const reading of readings) byDrift[reading.drift] += 1;
  for (const row of [...mapping.repositories, ...mapping.features, ...mapping.capabilities, ...mapping.relations]) {
    byRevision[row.revision] += 1;
  }

  return {
    repositories: mapping.repositories.length,
    features: mapping.features.length,
    capabilities: mapping.capabilities.length,
    relations: mapping.relations.length,
    owners: mapping.owners.length,
    byLifecycle,
    byDrift,
    byRevision,
    byStatus,
    fields,
    shared: findSharedCapabilities(mappingCapabilityClaims(mapping)),
    readings,
  };
}
