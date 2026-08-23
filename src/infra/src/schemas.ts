/**
 * Zod schemas for every facet type.
 *
 * These exist so an emitted manifest can be validated **at the boundary**
 * between gaia (which emits observed facets read live from systemd) and eury
 * (which authors desired-state edges) before it is trusted. A legible-but-stale
 * model lies with a straight face; the parse is where that gets caught.
 *
 * Spec: /opt/eury/rispecs/foundations/02-specifications.md §S1.
 */

import { z } from 'zod';

// ── Métis (S5) ──────────────────────────────────────────────────────────────

export const MetisHoldSchema = z.object({
  exceptions: z.array(z.string()).optional(),
  invisibleWork: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  /**
   * `.min(1)` is load-bearing. An empty string passes every other check while
   * anonymising the carrier — which is precisely the erasure this field exists
   * to refuse. Absent means nobody was named; empty means somebody was named
   * nothing, and only one of those is honest.
   */
  heldBy: z.string().min(1).optional(),
});

// ── Enumerations ────────────────────────────────────────────────────────────

export const LingerStateSchema = z.enum(['enabled', 'disabled', 'unknown']);

export const ReachabilitySchema = z.enum(['lan', 'tailnet', 'cloudflare', 'ngrok']);

export const PortProtoSchema = z.enum(['tcp', 'udp']);

export const ServiceScopeSchema = z.enum(['user', 'system']);

// ── Port bindings (S1, S3) ──────────────────────────────────────────────────

/**
 * A port number as the kernel means it: an integer in 1–65535. Rejecting 0 and
 * 65536 at the boundary is the point — an emitter that produces one has
 * misparsed, and a misparsed binding silently never collides with anything.
 */
export const PortNumberSchema = z.number().int().min(1).max(65535);

export const PortBindingSchema = z.object({
  port: PortNumberSchema,
  proto: PortProtoSchema.optional(),
  host: z.string().min(1),
  boundBy: z.string().min(1),
});

export const PortConflictSchema = z.object({
  host: z.string().min(1),
  port: PortNumberSchema,
  proto: PortProtoSchema,
  claimants: z.array(z.string().min(1)).min(2),
});

// ── Facets (S1) ─────────────────────────────────────────────────────────────

export const HostFacetSchema = z.object({
  nodeId: z.string().min(1),
  hostname: z.string().min(1),
  fqdn: z.string().optional(),
  os: z.string().optional(),
  reachableVia: z.array(ReachabilitySchema).optional(),
  metis: MetisHoldSchema.optional(),
});

export const TenantFacetSchema = z.object({
  nodeId: z.string().min(1),
  account: z.string().min(1),
  uid: z.number().int().nonnegative().optional(),
  home: z.string().optional(),
  onHost: z.string().min(1),
  linger: LingerStateSchema,
  metis: MetisHoldSchema.optional(),
});

export const ServiceFacetSchema = z.object({
  nodeId: z.string().min(1),
  unit: z.string().min(1),
  scope: ServiceScopeSchema,
  ownedBy: z.string().min(1),
  ports: z.array(PortBindingSchema),
  workingDirectory: z.string().optional(),
  execStop: z.string().optional(),
  metis: MetisHoldSchema.optional(),
});

// ── Preconditions (S4) ──────────────────────────────────────────────────────

export const PreconditionKindSchema = z.enum([
  'linger',
  'port-free',
  'unit-present',
  'working-directory',
]);

/**
 * `observed` is `.optional()` and NOT `.default()`. An unread fact must stay
 * distinguishable from a read one — a default would quietly turn "nobody looked"
 * into a value, which is the exact confusion `preconditionGuard` returns
 * `unknown` to prevent.
 */
export const MachineFactSchema = z.object({
  kind: PreconditionKindSchema,
  facetNodeId: z.string().min(1),
  expected: z.string(),
  observed: z.string().optional(),
  observedAt: z.string().optional(),
});

/**
 * `state` is a bare string, not an enum. `infra` records what the consent
 * lifecycle said; it does not get to decide which states exist, and an enum here
 * would let this package reject a state the lifecycle legitimately issued.
 */
export const ConsentReferenceSchema = z.object({
  consentId: z.string().min(1),
  state: z.string().optional(),
  readAt: z.string().optional(),
});

export const PreconditionSchema = z.object({
  id: z.string().min(1),
  gates: z.string().min(1),
  description: z.string().optional(),
  fact: MachineFactSchema.optional(),
  consent: ConsentReferenceSchema.optional(),
  metis: MetisHoldSchema.optional(),
});

export const PreconditionVerdictSchema = z.enum([
  'satisfied',
  'unsatisfied',
  'unauthorized',
  'unknown',
]);

// ── Observed state & drift (S6) ─────────────────────────────────────────────

export const DriftStateSchema = z.enum(['converged', 'drifted', 'unrealized', 'undeclared']);

/**
 * `observedBy` and `observedAt` are required. An observation without a reader
 * and a time is a rumour, and this schema is the boundary that refuses one.
 */
export const ObservedStateSchema = z.object({
  observedBy: z.string().min(1),
  /**
   * `.datetime()`, not `.min(1)`. An unparseable stamp made `observationAgeMs`
   * vanish from the result — the same output as "no `now` was given" — so a
   * caller whose entire reason to read that field is *refuse a stale reading*
   * could not tell a garbage timestamp from a deliberate clock-free call, and
   * would proceed.
   */
  observedAt: z.string().datetime(),
  services: z.array(ServiceFacetSchema),
  tenants: z.array(TenantFacetSchema).optional(),
});

// ── Inferred types ──────────────────────────────────────────────────────────
//
// Named `Validated*` to match the convention consent-lifecycle established, and
// to keep the hand-written interfaces in ./types the ones consumers import.

export type ValidatedMetisHold = z.infer<typeof MetisHoldSchema>;
export type ValidatedPortBinding = z.infer<typeof PortBindingSchema>;
export type ValidatedPortConflict = z.infer<typeof PortConflictSchema>;
export type ValidatedHostFacet = z.infer<typeof HostFacetSchema>;
export type ValidatedTenantFacet = z.infer<typeof TenantFacetSchema>;
export type ValidatedServiceFacet = z.infer<typeof ServiceFacetSchema>;
export type ValidatedMachineFact = z.infer<typeof MachineFactSchema>;
export type ValidatedConsentReference = z.infer<typeof ConsentReferenceSchema>;
export type ValidatedPrecondition = z.infer<typeof PreconditionSchema>;
export type ValidatedObservedState = z.infer<typeof ObservedStateSchema>;
