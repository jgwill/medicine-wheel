/**
 * Which capabilities more than one provider offers.
 *
 * The counterpart of `infra`'s `detectPortConflicts`, with the opposite
 * reading. Two services cannot both hold a port; two repositories can both
 * give a capability, and when they do there is a relation to name between
 * them — a prototype and the implementation that grew from it, or one intent
 * explored twice by different hands.
 */

import type { CapabilityClaim, CapabilityFacet, SharedCapability } from './types';

/** The claims a set of capabilities make through their own `providedBy`. */
export function capabilityClaims(capabilities: readonly CapabilityFacet[]): CapabilityClaim[] {
  return capabilities.flatMap((c) => c.providedBy.map((provider) => ({ capability: c.nodeId, provider })));
}

/**
 * Every capability claimed by two or more distinct providers, sorted by
 * capability id, providers distinct and sorted. A provider claiming the same
 * capability twice (through two of its features, say) counts once.
 */
export function findSharedCapabilities(claims: readonly CapabilityClaim[]): SharedCapability[] {
  const providers = new Map<string, Set<string>>();
  for (const claim of claims) {
    let set = providers.get(claim.capability);
    if (!set) providers.set(claim.capability, (set = new Set()));
    set.add(claim.provider);
  }
  return [...providers.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([capability, set]) => ({ capability, providers: [...set].sort() }))
    .sort((a, b) => (a.capability < b.capability ? -1 : a.capability > b.capability ? 1 : 0));
}
