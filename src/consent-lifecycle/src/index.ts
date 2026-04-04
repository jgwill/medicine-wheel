/**
 * medicine-wheel-consent-lifecycle
 *
 * Ongoing relational consent lifecycle for the Medicine Wheel Developer Suite.
 * Consent as a living relational obligation, not a boolean checkbox.
 *
 * @packageDocumentation
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  ConsentState,
  ConsentRecord,
  ConsentScope,
  ConsentCeremony,
  ConsentStateChange,
  ConsentCascade,
} from './types.js';

// ── Schemas ─────────────────────────────────────────────────────────────────
export {
  ConsentStateSchema,
  ConsentScopeSchema,
  ConsentCeremonySchema,
  ConsentStateChangeSchema,
  ConsentCascadeSchema,
  ConsentRecordSchema,
} from './schemas.js';

export type {
  ValidatedConsentRecord,
  ValidatedConsentScope,
  ValidatedConsentCeremony,
  ValidatedConsentStateChange,
  ValidatedConsentCascade,
} from './schemas.js';

// ── Lifecycle ───────────────────────────────────────────────────────────────
export {
  grantConsent,
  renewConsent,
  renegotiateConsent,
  withdrawConsent,
  checkConsentHealth,
} from './lifecycle.js';

export type { ConsentHealthResult } from './lifecycle.js';

// ── Scope ───────────────────────────────────────────────────────────────────
export {
  defineScope,
  narrowScope,
  widenScope,
  scopeIncludes,
} from './scope.js';

export type {
  ScopeAdditions,
  WidenScopeResult,
  ScopeQuery,
  ScopeCheckResult,
} from './scope.js';

// ── Ceremony ────────────────────────────────────────────────────────────────
export {
  consentCeremony,
  consentRenewalCeremony,
} from './ceremony.js';

export type { ConsentCeremonyOptions } from './ceremony.js';

// ── Community ───────────────────────────────────────────────────────────────
export {
  communityConsent,
  collectiveDecision,
  elderApproval,
} from './community.js';

export type {
  CommunityInfo,
  CommunityVoice,
  ConsensusResult,
  ElderApprovalOptions,
} from './community.js';

// ── Cascade ─────────────────────────────────────────────────────────────────
export {
  onWithdrawal,
  propagateScopeChange,
  findDependentRelations,
} from './cascade.js';

export type {
  AffectedRelation,
  ScopeChangeResult,
  DependencyResult,
} from './cascade.js';

// ── Alerts ──────────────────────────────────────────────────────────────────
export {
  consentStaleAlert,
  renewalDue,
  scopeMismatch,
  healthCheck,
} from './alerts.js';

export type {
  StaleAlert,
  RenewalItem,
  RenewalDueResult,
  ActionDescription,
  ScopeMismatchResult,
  BatchHealthResult,
} from './alerts.js';
