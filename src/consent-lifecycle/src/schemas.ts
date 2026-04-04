/**
 * @medicine-wheel/consent-lifecycle — Zod Schemas
 *
 * Runtime validation schemas for consent lifecycle types.
 */

import { z } from 'zod';
import { OcapFlagsSchema } from 'medicine-wheel-ontology-core';

// ── Consent State Schema ────────────────────────────────────────────────────

export const ConsentStateSchema = z.enum([
  'pending', 'granted', 'active', 'renewal-needed',
  'expired', 'renegotiating', 'withdrawn',
]);

// ── Consent Scope Schema ────────────────────────────────────────────────────

export const ConsentScopeSchema = z.object({
  description: z.string(),
  dataTypes: z.array(z.string()),
  purposes: z.array(z.string()),
  duration: z.string().optional(),
  geographic: z.string().optional(),
  restrictions: z.array(z.string()),
});

// ── Consent Ceremony Schema ─────────────────────────────────────────────────

export const ConsentCeremonySchema = z.object({
  type: z.enum(['initial', 'renewal', 'renegotiation', 'withdrawal']),
  timestamp: z.string(),
  participants: z.array(z.string()),
  witnessedBy: z.array(z.string()),
  outcome: ConsentStateSchema,
  notes: z.string().optional(),
  ceremonyId: z.string().optional(),
});

// ── Consent State Change Schema ─────────────────────────────────────────────

export const ConsentStateChangeSchema = z.object({
  from: ConsentStateSchema,
  to: ConsentStateSchema,
  reason: z.string(),
  timestamp: z.string(),
  initiatedBy: z.string(),
});

// ── Consent Cascade Schema ──────────────────────────────────────────────────

export const ConsentCascadeSchema = z.object({
  triggerId: z.string(),
  affected: z.array(z.string()),
  action: z.enum(['expire', 'review', 'withdraw', 'narrow']),
});

// ── Consent Record Schema ───────────────────────────────────────────────────

export const ConsentRecordSchema = z.object({
  id: z.string(),
  grantor: z.string(),
  grantee: z.string(),
  scope: ConsentScopeSchema,
  state: ConsentStateSchema,
  grantedAt: z.string().optional(),
  renewedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  renewalInterval: z.number().int().min(1).optional(),
  ceremonies: z.array(ConsentCeremonySchema),
  history: z.array(ConsentStateChangeSchema),
  communityLevel: z.boolean(),
  dependentRelations: z.array(z.string()),
  ocapFlags: OcapFlagsSchema,
});

// ── Inferred Types ──────────────────────────────────────────────────────────

export type ValidatedConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type ValidatedConsentScope = z.infer<typeof ConsentScopeSchema>;
export type ValidatedConsentCeremony = z.infer<typeof ConsentCeremonySchema>;
export type ValidatedConsentStateChange = z.infer<typeof ConsentStateChangeSchema>;
export type ValidatedConsentCascade = z.infer<typeof ConsentCascadeSchema>;
