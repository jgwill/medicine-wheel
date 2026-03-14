/**
 * @medicine-wheel/consent-lifecycle — Alerts Module
 *
 * Consent health monitoring: stale consent warnings, renewal
 * due dates, scope mismatches, and batch health checks.
 * Consent that goes unmonitored decays — these alerts prevent that.
 */

import type { ConsentRecord } from './types.js';
import { checkConsentHealth } from './lifecycle.js';
import type { ConsentHealthResult } from './lifecycle.js';

/**
 * Check whether a consent record is stale and needs renewal.
 * Returns a warning if consent is approaching or past expiration.
 */
export function consentStaleAlert(record: ConsentRecord): StaleAlert | null {
  if (record.state === 'withdrawn') return null;

  if (!record.expiresAt) {
    // No expiration — check if consent has never been renewed
    if (record.state === 'granted' && !record.renewedAt) {
      return {
        recordId: record.id,
        severity: 'info',
        message: `Consent '${record.id}' has been granted but never renewed or activated through ceremony.`,
        daysUntilExpiry: null,
      };
    }
    return null;
  }

  const now = Date.now();
  const expiryTime = new Date(record.expiresAt).getTime();
  const daysUntilExpiry = Math.ceil((expiryTime - now) / 86400000);

  if (daysUntilExpiry <= 0) {
    return {
      recordId: record.id,
      severity: 'critical',
      message: `Consent '${record.id}' has EXPIRED. Immediate renewal required.`,
      daysUntilExpiry,
    };
  }

  if (daysUntilExpiry <= 7) {
    return {
      recordId: record.id,
      severity: 'warning',
      message: `Consent '${record.id}' expires in ${daysUntilExpiry} day(s). Schedule renewal ceremony.`,
      daysUntilExpiry,
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      recordId: record.id,
      severity: 'info',
      message: `Consent '${record.id}' expires in ${daysUntilExpiry} day(s). Plan for renewal.`,
      daysUntilExpiry,
    };
  }

  return null;
}

/**
 * Find all consent records that need renewal.
 * Returns records sorted by urgency (most urgent first).
 */
export function renewalDue(records: ConsentRecord[]): RenewalDueResult {
  const due: RenewalItem[] = [];

  for (const record of records) {
    if (record.state === 'withdrawn') continue;

    const alert = consentStaleAlert(record);
    if (alert) {
      due.push({
        recordId: record.id,
        grantor: record.grantor,
        grantee: record.grantee,
        severity: alert.severity,
        daysUntilExpiry: alert.daysUntilExpiry,
        message: alert.message,
      });
    }
  }

  // Sort by urgency: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  due.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    totalDue: due.length,
    items: due,
    summary: due.length === 0
      ? 'No consent records need renewal.'
      : `${due.length} consent record(s) need attention: ${due.filter((d) => d.severity === 'critical').length} critical, ${due.filter((d) => d.severity === 'warning').length} warning.`,
  };
}

/**
 * Detect whether an action falls outside the consent scope.
 * Returns a mismatch report if the action is not covered.
 */
export function scopeMismatch(
  record: ConsentRecord,
  action: ActionDescription,
): ScopeMismatchResult {
  const issues: string[] = [];

  // Check state first
  if (record.state !== 'active' && record.state !== 'granted') {
    issues.push(`Consent is in '${record.state}' state — not active.`);
  }

  // Check data type
  if (!record.scope.dataTypes.some((dt) => dt === action.dataType || dt === '*')) {
    issues.push(`Data type '${action.dataType}' not in consented data types.`);
  }

  // Check purpose
  if (!record.scope.purposes.some((p) => p === action.purpose || p === '*')) {
    issues.push(`Purpose '${action.purpose}' not in consented purposes.`);
  }

  // Check restrictions
  for (const restriction of record.scope.restrictions) {
    if (
      restriction.toLowerCase().includes(action.dataType.toLowerCase()) ||
      restriction.toLowerCase().includes(action.purpose.toLowerCase())
    ) {
      issues.push(`Action may violate restriction: '${restriction}'.`);
    }
  }

  return {
    mismatch: issues.length > 0,
    issues,
    recommendation: issues.length > 0
      ? 'This action exceeds the current consent scope. Renegotiate consent before proceeding.'
      : 'Action is within consent scope.',
  };
}

/**
 * Batch health check across all consent records.
 * Returns a comprehensive health report for the entire consent landscape.
 */
export function healthCheck(records: ConsentRecord[]): BatchHealthResult {
  const results: Array<{ recordId: string; health: ConsentHealthResult }> = [];
  let healthyCount = 0;
  let unhealthyCount = 0;

  for (const record of records) {
    const health = checkConsentHealth(record);
    results.push({ recordId: record.id, health });
    if (health.healthy) healthyCount++;
    else unhealthyCount++;
  }

  return {
    total: records.length,
    healthy: healthyCount,
    unhealthy: unhealthyCount,
    results,
    summary: `${healthyCount}/${records.length} consent records healthy. ${unhealthyCount} need attention.`,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Stale consent alert */
export interface StaleAlert {
  recordId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  daysUntilExpiry: number | null;
}

/** A single renewal item */
export interface RenewalItem {
  recordId: string;
  grantor: string;
  grantee: string;
  severity: 'info' | 'warning' | 'critical';
  daysUntilExpiry: number | null;
  message: string;
}

/** Result of renewal due check */
export interface RenewalDueResult {
  totalDue: number;
  items: RenewalItem[];
  summary: string;
}

/** Description of an action to check against scope */
export interface ActionDescription {
  dataType: string;
  purpose: string;
}

/** Result of scope mismatch check */
export interface ScopeMismatchResult {
  mismatch: boolean;
  issues: string[];
  recommendation: string;
}

/** Batch health check result */
export interface BatchHealthResult {
  total: number;
  healthy: number;
  unhealthy: number;
  results: Array<{ recordId: string; health: ConsentHealthResult }>;
  summary: string;
}
