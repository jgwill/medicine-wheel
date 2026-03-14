# consent-lifecycle — RISE Specification

> Ongoing relational consent — transforms consent from a boolean checkbox into a living relational obligation with lifecycle tracking, renewal, renegotiation, and community-level consent protocols.

**Version:** 0.1.0  
**Package:** `medicine-wheel-consent-lifecycle`  
**Document ID:** rispec-consent-lifecycle-v1  
**Last Updated:** 2026-03-15  

---

## Desired Outcome

Users create **consent-as-relationship systems** where:
- Consent is a living relationship, not a one-time boolean
- Consent states flow through a full lifecycle: pending → granted → active → renewal-needed → expired/withdrawn
- Consent scope defines what is consented (data types, purposes, duration, restrictions)
- Consent ceremonies formalize consent moments with witnesses
- Withdrawal cascades through dependent relations
- Community-level consent is distinct from individual consent
- Stale consent triggers alerts before it expires

---

## Creative Intent

**What this enables:** Wilson's relational accountability means consent is not an event — it's a *relationship*. "Once you are in relationship, you are responsible for that relationship's wellbeing." Consent must be maintained, renewed, and can be withdrawn — with cascading effects on all dependent relations.

**Structural Tension:** Between consent-as-checkbox (one-time, binary, permanent) and consent-as-relationship (ongoing, nuanced, renewable, withdrawable, with community dimensions). The consent-lifecycle resolves this by modeling consent as a stateful entity with ceremonies, scope, and cascading effects.

---

## Consent State Machine

```
pending → granted → active ⇄ renewal-needed → expired
                   ↕                ↓
              renegotiating    withdrawn
```

| State | Meaning |
|-------|---------|
| `pending` | Consent requested but not yet granted |
| `granted` | Consent given but not yet active (awaiting ceremony) |
| `active` | Consent is in effect |
| `renewal-needed` | Consent approaching expiration, renewal requested |
| `expired` | Consent has lapsed without renewal |
| `renegotiating` | Consent terms are being renegotiated |
| `withdrawn` | Consent explicitly withdrawn — cascading effects triggered |

---

## Type Definitions

### Core Types

```typescript
type ConsentState = 'pending' | 'granted' | 'active' | 'renewal-needed' |
                    'expired' | 'renegotiating' | 'withdrawn';
```

### ConsentRecord

```typescript
interface ConsentRecord {
  id: string;
  grantor: string;                    // Who gave consent
  grantee: string;                    // Who received consent
  scope: ConsentScope;
  state: ConsentState;
  grantedAt?: string;
  renewedAt?: string;
  expiresAt?: string;
  renewalInterval?: number;           // Days between required renewals
  ceremonies: ConsentCeremony[];
  history: ConsentStateChange[];
  communityLevel: boolean;
  dependentRelations: string[];
  ocapFlags: OcapFlags;
}
```

### Supporting Types

```typescript
interface ConsentScope {
  description: string;
  dataTypes: string[];
  purposes: string[];
  duration?: string;
  geographic?: string;
  restrictions: string[];
}

interface ConsentCeremony {
  type: 'initial' | 'renewal' | 'renegotiation' | 'withdrawal';
  timestamp: string;
  participants: string[];
  witnessedBy?: string[];
  outcome: ConsentState;
  notes?: string;
  ceremonyId?: string;
}

interface ConsentStateChange {
  from: ConsentState;
  to: ConsentState;
  timestamp: string;
  reason: string;
  changedBy: string;
}

interface ConsentCascade {
  withdrawnConsentId: string;
  affectedRelations: string[];
  actions: CascadeAction[];
}

interface CascadeAction {
  relationId: string;
  action: 'suspend' | 'withdraw' | 'renegotiate' | 'notify';
  reason: string;
}

interface ConsentHealthReport {
  total: number;
  active: number;
  renewalNeeded: number;
  expired: number;
  withdrawn: number;
  staleAlerts: string[];
  overallHealth: number;              // 0–1
}
```

---

## Module: Lifecycle Management (`lifecycle.ts`)

```typescript
grantConsent(grantor, grantee, scope, ocapFlags)
// Creates a ConsentRecord in 'granted' state

renewConsent(record)
// Renews consent — transitions from 'renewal-needed' or 'active' to 'active', updates renewedAt

renegotiateConsent(record, newScope)
// Transitions to 'renegotiating' state with proposed new scope

withdrawConsent(record, reason)
// Withdraws consent — triggers cascade evaluation

checkConsentHealth(records)
// Returns ConsentHealthReport for a collection of consent records
```

## Module: Scope Management (`scope.ts`)

```typescript
defineScope(description, dataTypes, purposes, restrictions)
// Creates a ConsentScope

narrowScope(scope, removedPurposes)
// Removes purposes from scope (never widens without ceremony)

widenScope(scope, addedPurposes)
// Adds purposes to scope (requires ceremony)

scopeIncludes(scope, dataType, purpose)
// Returns whether the scope covers a specific use
```

## Module: Consent Ceremony (`ceremony.ts`)

```typescript
consentCeremony(record, participants, witnesses)
// Conducts initial consent ceremony, transitions from 'granted' to 'active'

consentRenewalCeremony(record, participants)
// Conducts renewal ceremony

logConsentAffirmation(record, affirmation)
// Records an affirmation of existing consent
```

## Module: Community Consent (`community.ts`)

```typescript
communityConsent(community, scope, ocapFlags)
// Creates a community-level consent record

collectiveDecision(record, voices)
// Records a collective decision on consent

elderApproval(record, elderId, approval)
// Records Elder approval for community consent

youthVoice(record, youthId, voice)
// Records youth voice in community consent process
```

## Module: Cascade (`cascade.ts`)

```typescript
onWithdrawal(record, allRecords, allRelations)
// Evaluates cascade effects of consent withdrawal

propagateScopeChange(record, allRecords)
// Propagates scope narrowing to dependent records

findDependentRelations(record, allRelations)
// Finds all relations that depend on this consent
```

## Module: Alerts (`alerts.ts`)

```typescript
consentStaleAlert(record)
// Returns alert if consent is approaching expiration

renewalDue(records)
// Returns records where renewal is due

scopeMismatch(record, currentUse)
// Detects if current use exceeds consented scope

healthCheck(records)
// Returns overall consent health with actionable alerts
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1, `medicine-wheel-ceremony-protocol` ^0.1.0, `zod` ^3.23.0
- **Types consumed:** `OcapFlags`, `DirectionName` from ontology-core

---

## Wilson Alignment

Wilson's relational accountability means consent is a relationship:
- **Ongoing obligation:** Consent requires maintenance, not just initial grant
- **Ceremony:** Consent moments are formalized through ceremony with witnesses
- **Community voice:** Community-level consent includes Elder approval and youth voice
- **Cascading effects:** Withdrawal affects all dependent relations
- **Renewal:** Relationships require periodic reaffirmation

---

## Test Scenarios

1. **Full lifecycle:** Grant → ceremony → active → renewal-needed → renew → active → withdraw
2. **Scope management:** Define scope → narrow → verify purposes removed → widen (requires ceremony)
3. **Withdrawal cascade:** Withdraw consent → onWithdrawal → verify dependent relations affected
4. **Stale alert:** Create consent expiring in 7 days → consentStaleAlert → alert returned
5. **Community consent:** Create community consent → Elder approval → youth voice → collective decision
6. **Scope mismatch:** Consent for 'research' purpose → use for 'commercial' → scopeMismatch → detected
7. **Health check:** Mix of active, expired, and renewal-needed → healthCheck → reports issues
8. **State history:** Multiple transitions → verify full history recorded with timestamps and reasons

---

## Advancing Patterns

- **Consent as relationship** — Living obligation, not checkbox
- **Ceremony-witnessed** — Consent moments are ceremonial events
- **Cascading accountability** — Withdrawal ripples through the relational web
- **Community sovereignty** — Community-level consent is distinct from individual

---

## Quality Criteria

- ✅ Creative Orientation: Enables consent-as-relationship, not just access control
- ✅ Structural Dynamics: Resolves tension between boolean and lifecycle consent
- ✅ Implementation Sufficient: Full API surface documented with state machine and types
- ✅ Codebase Agnostic: No file paths, conceptual consent model
