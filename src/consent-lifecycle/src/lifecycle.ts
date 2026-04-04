/**
 * @medicine-wheel/consent-lifecycle — Lifecycle Module
 *
 * Core consent lifecycle operations: grant, renew, renegotiate,
 * withdraw, and health assessment. Consent is a living relationship,
 * not a one-time event.
 */

import type {
  ConsentRecord,
  ConsentState,
  ConsentScope,
  ConsentStateChange,
} from './types.js';

/**
 * Grant initial consent, transitioning from 'pending' to 'granted'.
 * Sets the grantedAt timestamp and computes expiration if renewalInterval is set.
 */
export function grantConsent(record: ConsentRecord): ConsentRecord {
  const now = new Date().toISOString();
  const change: ConsentStateChange = {
    from: record.state,
    to: 'granted',
    reason: 'Initial consent granted',
    timestamp: now,
    initiatedBy: record.grantor,
  };

  const expiresAt = record.renewalInterval
    ? new Date(Date.now() + record.renewalInterval * 86400000).toISOString()
    : record.expiresAt;

  return {
    ...record,
    state: 'granted',
    grantedAt: now,
    expiresAt,
    history: [...record.history, change],
  };
}

/**
 * Renew existing consent, resetting the expiration clock.
 * Consent must be in 'active', 'granted', or 'renewal-needed' state.
 */
export function renewConsent(record: ConsentRecord): ConsentRecord {
  const validStates: ConsentState[] = ['active', 'granted', 'renewal-needed'];
  if (!validStates.includes(record.state)) {
    throw new Error(
      `Cannot renew consent in state '${record.state}'. Must be one of: ${validStates.join(', ')}`,
    );
  }

  const now = new Date().toISOString();
  const change: ConsentStateChange = {
    from: record.state,
    to: 'active',
    reason: 'Consent renewed',
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
    history: [...record.history, change],
  };
}

/**
 * Renegotiate consent with a new scope.
 * Transitions to 'renegotiating' until the new scope is accepted.
 * The new scope replaces the old scope once finalized.
 */
export function renegotiateConsent(
  record: ConsentRecord,
  newScope: ConsentScope,
): ConsentRecord {
  if (record.state === 'withdrawn') {
    throw new Error('Cannot renegotiate withdrawn consent. A new consent must be created.');
  }

  const now = new Date().toISOString();
  const change: ConsentStateChange = {
    from: record.state,
    to: 'renegotiating',
    reason: `Scope renegotiation initiated: ${newScope.description}`,
    timestamp: now,
    initiatedBy: record.grantor,
  };

  return {
    ...record,
    state: 'renegotiating',
    scope: newScope,
    history: [...record.history, change],
  };
}

/**
 * Withdraw consent with a reason. This is a terminal action that
 * triggers cascading effects on all dependent relations.
 */
export function withdrawConsent(
  record: ConsentRecord,
  reason: string,
): ConsentRecord {
  const now = new Date().toISOString();
  const change: ConsentStateChange = {
    from: record.state,
    to: 'withdrawn',
    reason,
    timestamp: now,
    initiatedBy: record.grantor,
  };

  return {
    ...record,
    state: 'withdrawn',
    history: [...record.history, change],
  };
}

/**
 * Check the health of a consent record.
 * Evaluates whether consent is current, properly renewed, and
 * within scope. Returns a health assessment with recommendations.
 */
export function checkConsentHealth(record: ConsentRecord): ConsentHealthResult {
  const issues: string[] = [];
  const now = Date.now();

  // State checks
  if (record.state === 'withdrawn') {
    return {
      healthy: false,
      state: record.state,
      issues: ['Consent has been withdrawn.'],
      daysUntilExpiry: null,
      needsRenewal: false,
      recommendations: ['A new consent must be created if the relationship is to continue.'],
    };
  }

  if (record.state === 'expired') {
    issues.push('Consent has expired and must be renewed.');
  }

  if (record.state === 'pending') {
    issues.push('Consent is still pending — not yet granted.');
  }

  // Expiry checks
  let daysUntilExpiry: number | null = null;
  let needsRenewal = false;

  if (record.expiresAt) {
    const expiryTime = new Date(record.expiresAt).getTime();
    daysUntilExpiry = Math.ceil((expiryTime - now) / 86400000);

    if (daysUntilExpiry <= 0) {
      issues.push('Consent has expired.');
      needsRenewal = true;
    } else if (daysUntilExpiry <= 30) {
      issues.push(`Consent expires in ${daysUntilExpiry} day(s).`);
      needsRenewal = true;
    }
  }

  // Ceremony checks
  if (record.ceremonies.length === 0) {
    issues.push('No consent ceremonies recorded. Ceremony strengthens consent relations.');
  }

  // OCAP checks
  if (!record.ocapFlags.compliant) {
    issues.push('OCAP® compliance not verified.');
  }

  const healthy = issues.length === 0 && record.state === 'active';
  const recommendations: string[] = [];
  if (needsRenewal) recommendations.push('Schedule a consent renewal ceremony.');
  if (!record.ocapFlags.compliant) recommendations.push('Verify OCAP® compliance.');
  if (record.ceremonies.length === 0) recommendations.push('Conduct a consent ceremony.');

  return {
    healthy,
    state: record.state,
    issues,
    daysUntilExpiry,
    needsRenewal,
    recommendations,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Result of a consent health check */
export interface ConsentHealthResult {
  healthy: boolean;
  state: ConsentState;
  issues: string[];
  daysUntilExpiry: number | null;
  needsRenewal: boolean;
  recommendations: string[];
}
