/**
 * @medicine-wheel/consent-lifecycle — Ceremony Module
 *
 * Records consent ceremonies — the relational acts that formalize
 * consent granting, renewal, and withdrawal. Ceremony honors
 * the relational nature of consent.
 */

import type {
  ConsentRecord,
  ConsentCeremony,
  ConsentState,
  ConsentStateChange,
} from './types.js';

/**
 * Record a consent ceremony for initial consent granting.
 * Transitions the consent record to 'active' state and logs
 * the ceremony with participants and witnesses.
 */
export function consentCeremony(
  record: ConsentRecord,
  participants: string[],
  options?: ConsentCeremonyOptions,
): ConsentRecord {
  const now = new Date().toISOString();

  const ceremony: ConsentCeremony = {
    type: 'initial',
    timestamp: now,
    participants,
    witnessedBy: options?.witnessedBy ?? [],
    outcome: 'active',
    notes: options?.notes,
    ceremonyId: options?.ceremonyId,
  };

  const change: ConsentStateChange = {
    from: record.state,
    to: 'active',
    reason: 'Consent ceremony conducted — consent is now active.',
    timestamp: now,
    initiatedBy: record.grantor,
  };

  return {
    ...record,
    state: 'active',
    grantedAt: record.grantedAt ?? now,
    ceremonies: [...record.ceremonies, ceremony],
    history: [...record.history, change],
  };
}

/**
 * Record a consent renewal ceremony.
 * Resets the consent expiration and transitions to 'active' state.
 */
export function consentRenewalCeremony(
  record: ConsentRecord,
  participants: string[],
  options?: ConsentCeremonyOptions,
): ConsentRecord {
  const validStates: ConsentState[] = ['active', 'granted', 'renewal-needed'];
  if (!validStates.includes(record.state)) {
    throw new Error(
      `Cannot conduct renewal ceremony for consent in state '${record.state}'.`,
    );
  }

  const now = new Date().toISOString();

  const ceremony: ConsentCeremony = {
    type: 'renewal',
    timestamp: now,
    participants,
    witnessedBy: options?.witnessedBy ?? [],
    outcome: 'active',
    notes: options?.notes,
    ceremonyId: options?.ceremonyId,
  };

  const change: ConsentStateChange = {
    from: record.state,
    to: 'active',
    reason: 'Consent renewal ceremony conducted.',
    timestamp: now,
    initiatedBy: record.grantor,
  };

  const expiresAt = record.renewalInterval
    ? new Date(Date.now() + record.renewalInterval * 86400000).toISOString()
    : record.expiresAt;

  return {
    ...record,
    state: 'active',
    renewedAt: now,
    expiresAt,
    ceremonies: [...record.ceremonies, ceremony],
    history: [...record.history, change],
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Options for consent ceremony recording */
export interface ConsentCeremonyOptions {
  witnessedBy?: string[];
  notes?: string;
  ceremonyId?: string;
}
