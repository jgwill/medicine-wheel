# medicine-wheel-consent-lifecycle

Ongoing relational consent lifecycle for the Medicine Wheel Developer Suite.

> Consent as a living relational obligation, not a boolean checkbox.

## Purpose

Transforms consent from a boolean checkbox into a living relational obligation with lifecycle tracking, renewal, renegotiation, and community-level consent protocols.

Wilson's relational accountability means consent is not an event — it's a *relationship*. "Once you are in relationship, you are responsible for that relationship's wellbeing." Consent must be maintained, renewed, and can be withdrawn — with cascading effects on all dependent relations.

## Installation

```bash
npm install medicine-wheel-consent-lifecycle
```

## Key Concepts

### ConsentState

Consent moves through a lifecycle of states:
- `pending` — consent requested but not yet granted
- `granted` — consent given but not yet ceremonialized
- `active` — consent is active and honored through ceremony
- `renewal-needed` — consent approaching expiration
- `expired` — consent has lapsed
- `renegotiating` — scope is being renegotiated
- `withdrawn` — consent has been withdrawn (terminal)

### Cascading Effects

When consent is withdrawn or scope changes, all dependent relations are affected. The cascade module computes these effects and ensures nothing falls through the cracks.

### Community Consent

Community-level consent transcends individual consent. It requires collective decision-making through consensus mechanisms and may require Elder endorsement.

## API

### Lifecycle Module

- `grantConsent(record)` — initial grant
- `renewConsent(record)` — renew existing consent
- `renegotiateConsent(record, newScope)` — change scope
- `withdrawConsent(record, reason)` — withdraw with cascading effects
- `checkConsentHealth(record)` — health assessment

### Scope Module

- `defineScope(description, dataTypes, purposes)` — create scope
- `narrowScope(scope, restrictions)` — add restrictions
- `widenScope(scope, additions)` — expand scope (requires re-consent)
- `scopeIncludes(scope, query)` — check if action is within scope

### Ceremony Module

- `consentCeremony(record, participants)` — record consent ceremony
- `consentRenewalCeremony(record, participants)` — renewal ceremony

### Community Module

- `communityConsent(community, scope)` — community-level consent
- `collectiveDecision(voices)` — consensus mechanism
- `elderApproval(elderId, record)` — Elder endorsement

### Cascade Module

- `onWithdrawal(record)` — compute cascading effects
- `propagateScopeChange(record, newScope)` — update dependent relations
- `findDependentRelations(record, allRecords)` — find dependencies

### Alerts Module

- `consentStaleAlert(record)` — warn when consent needs renewal
- `renewalDue(records)` — find all records needing renewal
- `scopeMismatch(record, action)` — detect action outside scope
- `healthCheck(records)` — batch health check

## License

MIT — IAIP Collaborative, Shawinigan, QC
