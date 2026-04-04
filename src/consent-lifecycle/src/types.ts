/**
 * @medicine-wheel/consent-lifecycle — Type Definitions
 *
 * Types for managing consent as a living relational obligation.
 * Wilson's relational accountability means consent is not an event —
 * it's a relationship. "Once you are in relationship, you are
 * responsible for that relationship's wellbeing."
 */

import type { OcapFlags } from 'medicine-wheel-ontology-core';

// ── Consent State ───────────────────────────────────────────────────────────

/** Consent lifecycle states — consent is never just "on" or "off" */
export type ConsentState =
  | 'pending'
  | 'granted'
  | 'active'
  | 'renewal-needed'
  | 'expired'
  | 'renegotiating'
  | 'withdrawn';

// ── Consent Record ──────────────────────────────────────────────────────────

/** A living consent record with full lifecycle tracking */
export interface ConsentRecord {
  /** Unique consent identifier */
  id: string;
  /** Who gave consent */
  grantor: string;
  /** Who received consent */
  grantee: string;
  /** Scope of the consent */
  scope: ConsentScope;
  /** Current consent state */
  state: ConsentState;
  /** When consent was first granted (ISO 8601) */
  grantedAt?: string;
  /** When consent was last renewed (ISO 8601) */
  renewedAt?: string;
  /** When consent expires (ISO 8601) */
  expiresAt?: string;
  /** Days between required renewals */
  renewalInterval?: number;
  /** Log of consent ceremonies */
  ceremonies: ConsentCeremony[];
  /** Full state change history */
  history: ConsentStateChange[];
  /** Whether this is community-wide consent */
  communityLevel: boolean;
  /** Relations that depend on this consent */
  dependentRelations: string[];
  /** OCAP® governance flags */
  ocapFlags: OcapFlags;
}

// ── Consent Scope ───────────────────────────────────────────────────────────

/** Defines the boundaries of what is consented */
export interface ConsentScope {
  /** Human-readable description of the consent scope */
  description: string;
  /** What types of data/knowledge are covered */
  dataTypes: string[];
  /** What purposes are consented */
  purposes: string[];
  /** How long the consent is valid */
  duration?: string;
  /** Geographic scope */
  geographic?: string;
  /** What is explicitly NOT consented */
  restrictions: string[];
}

// ── Consent Ceremony ────────────────────────────────────────────────────────

/** A ceremony associated with consent granting, renewal, or withdrawal */
export interface ConsentCeremony {
  /** Type of consent ceremony */
  type: 'initial' | 'renewal' | 'renegotiation' | 'withdrawal';
  /** When the ceremony occurred (ISO 8601) */
  timestamp: string;
  /** Who participated in the ceremony */
  participants: string[];
  /** Who witnessed the ceremony */
  witnessedBy: string[];
  /** The consent state outcome */
  outcome: ConsentState;
  /** Additional notes */
  notes?: string;
  /** Link to ceremony-protocol ceremony */
  ceremonyId?: string;
}

// ── Consent State Change ────────────────────────────────────────────────────

/** A recorded transition between consent states */
export interface ConsentStateChange {
  /** Previous state */
  from: ConsentState;
  /** New state */
  to: ConsentState;
  /** Reason for the change */
  reason: string;
  /** When the change occurred (ISO 8601) */
  timestamp: string;
  /** Who initiated the change */
  initiatedBy: string;
}

// ── Consent Cascade ─────────────────────────────────────────────────────────

/** Describes cascading effects when consent changes */
export interface ConsentCascade {
  /** The consent record that triggered the cascade */
  triggerId: string;
  /** Affected consent records or relation IDs */
  affected: string[];
  /** The action to take on affected records */
  action: 'expire' | 'review' | 'withdraw' | 'narrow';
}
