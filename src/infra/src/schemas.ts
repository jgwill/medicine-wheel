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
  heldBy: z.string().optional(),
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
