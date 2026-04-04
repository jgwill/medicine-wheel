# Research: Axiological Enforcement — Wilson × Medicine Wheel Packages

**Date:** 2026-03-14  
**Angle:** Axiological enforcement — does the codebase enforce Wilson's relational accountability, or merely represent it?  
**Core Question:** "Am I being a good relative?" — is this question answerable, and is its answer consequential within the system?

---

## Executive Summary

- **The system models relational accountability with impressive ontological depth** — Wilson's three R's (Respect, Reciprocity, Responsibility), OCAP® flags, obligation categories (human/land/spirit/future), and ceremony honoring are all first-class data structures. The type system is genuine and well-considered.
- **Enforcement is almost entirely absent.** Governance checks return information but never block operations. OCAP® compliance is auditable but not gateable. The WilsonMeter displays a number it cannot influence. No function in the entire codebase throws an error, rejects an operation, or prevents a write based on accountability state.
- **Consent is modeled as a one-time boolean, not an ongoing relational obligation.** `consent_given?: boolean` with an optional `consent_scope?: string` is the entire consent model — no timestamps, no renewal, no revocation, no parties. This is precisely the Western extraction pattern Wilson critiques.
- **The ceremony-protocol spec explicitly declares non-enforcement as a design principle:** "Non-blocking guidance — Governance checks inform, they don't prevent; respect for human agency." This is the central axiological tension: the system has chosen liberal individualism ("human agency") over Wilson's relational accountability (obligations to all relations).
- **The audit system is genuine but toothless** — it surfaces concerns and generates recommendations, but nothing in the architecture consumes those recommendations as constraints.

---

## Detailed Analysis

### ceremony-protocol: Governance Reality

**What it does:** Manages ceremony phase state (opening → council → integration → closure) and checks file paths against governance rules. Four key functions: `checkGovernance()`, `checkCeremonyRequired()`, `getAccessLevel()`, `formatGovernanceWarning()`.

**The enforcement question:**

Every governance function is **advisory, not blocking**:

```typescript
// ceremony-protocol/src/index.ts:67-81
export function checkGovernance(
  filePath: string,
  config: GovernanceConfig,
): GovernanceProtectedPath | null {
  // Returns rule metadata or null — never throws, never blocks
}

// ceremony-protocol/src/index.ts:108-113
export function getAccessLevel(filePath: string, config: GovernanceConfig): GovernanceAccess {
  // Returns 'open' | 'ceremony_required' | 'restricted' | 'sacred'
  // But nothing in the system acts on 'sacred' differently than 'open'
}
```

The function `formatGovernanceWarning()` produces a string: `"⚠️ GOVERNANCE: Changes to [ceremonies/] require [elder, firekeeper] approval."` — but there is no mechanism that:
1. Actually checks whether elder/firekeeper approval was obtained
2. Blocks the change if approval is missing
3. Records that approval was sought or granted
4. Notifies the listed authorities

**The spec confirms this is intentional** (ceremony-protocol.spec.md:133):
> "Non-blocking guidance — Governance checks inform, they don't prevent; respect for human agency"

**Wilson's critique applies directly here.** Wilson argues that relational accountability is not optional — it is the moral framework itself. The system's choice to "respect human agency" over relational obligations reproduces the Western individualist paradigm that treats ethics as voluntary. In Wilson's framework, the question is not "Do I want to be accountable?" but "Am I being a good relative?" — and the answer carries consequences.

**Phase transitions have no accountability gates.** `nextPhase('opening')` returns `'council'` unconditionally. There is no check for:
- Whether the opening phase's intentions were properly set
- Whether ceremony was actually conducted
- Whether obligations from the current phase were honored
- Whether relational accountability scores meet a threshold

The phase system is a state machine with no guard conditions.

---

### ui-components: Accountability Visualization

#### WilsonMeter: Display Without Drive

**What it does:** Renders a circular SVG gauge showing a 0–1 alignment value with traffic-light coloring (green ≥ 0.7, amber ≥ 0.4, red < 0.4).

**The enforcement question:**

The WilsonMeter is a **pure display component**. Its props interface is revealing:

```typescript
// ui-components/src/WilsonMeter.tsx:6-15
export interface WilsonMeterProps {
  alignment: number;  // Just a number — not an AccountabilityTracking object
  size?: number;
  showLabel?: boolean;
  className?: string;
}
```

Compare this to what the **spec promised** (ui-components.spec.md:103-115):

```typescript
// The spec describes:
interface WilsonMeterProps {
  accountability: AccountabilityTracking;  // Full accountability object
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;  // R/R/R breakdown bars
}
```

The implementation diverged from the spec in a telling direction: it **simplified away the accountability structure** into a single number. The spec envisioned showing the three R's breakdown; the implementation shows only the aggregate. This is a microcosm of the larger pattern — the system reduces relational complexity to scalar scores.

The WilsonMeter cannot:
- Trigger warnings when alignment drops below threshold
- Emit events that other components or systems consume
- Differentiate which R (Respect/Reciprocity/Responsibility) is failing
- Connect back to the relations that produced its score

It is a thermometer with no thermostat.

#### OcapBadge: Governance or Decoration?

**What it does:** Displays OCAP® compliance as a green checkmark or red X, with optional per-flag breakdown (O/C/A/P squares).

**The enforcement question:**

The OcapBadge reads `OcapFlags` and displays them. Critical observation about the underlying type:

```typescript
// ontology-core/src/types.ts:73-90
export interface OcapFlags {
  ownership: string;     // Who owns — but just a string, no verification
  control: string;       // Who controls — just a string
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;    // Self-reported compliance — no verification
  consent_given?: boolean;  // Optional one-time boolean
  consent_scope?: string;   // Optional unstructured string
}
```

The `compliant` flag is **self-asserted**. There is no function that computes compliance from the other fields — `checkOcapCompliance()` in queries.ts checks whether fields are *filled in*, not whether they are *truthful*. The badge displays whatever the data says. A relation can claim `compliant: true` with `ownership: ""` and nothing will catch it at the badge level (though `checkOcapCompliance` would flag empty ownership).

More critically, the OcapBadge has **no callback, no event, no action** when compliance fails. It is a status indicator with no associated workflow.

#### NodeInspector and DirectionCard: Relational Display

The NodeInspector shows relations with their strength and ceremony-honored status (🔥 icon), but provides no mechanism to flag or act on relations that lack ceremony honoring. The DirectionCard encodes cultural knowledge (Ojibwe names, medicines, seasons) beautifully, but this is **cultural encoding, not accountability enforcement**.

The BeatTimeline shows ceremony indicators (🔥) on beats that have ceremonies — but beats without ceremonies are displayed identically, with no visual warning or call to action.

---

### Accountability Types (ontology-core)

#### The Three R's: Genuinely Computed or Just Stored?

The `AccountabilityTracking` type stores three numbers:

```typescript
// ontology-core/src/types.ts:92-105
export interface AccountabilityTracking {
  respect: number;        // 0–1
  reciprocity: number;    // 0–1
  responsibility: number; // 0–1
  wilson_alignment: number; // 0–1, computed average
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

The `computeWilsonAlignment()` function is a simple arithmetic mean:

```typescript
// ontology-core/src/queries.ts:114-119
export function computeWilsonAlignment(
  accountability: AccountabilityTracking
): number {
  const { respect, reciprocity, responsibility } = accountability;
  return (respect + reciprocity + responsibility) / 3;
}
```

**Critical analysis:**

1. **The R/R/R scores are opaque inputs.** Nothing in the codebase computes what Respect, Reciprocity, or Responsibility *mean* in terms of system behavior. They are numbers that enter the system from outside — presumably set by humans — and are never derived from actual relational behavior (e.g., "this node has 5 outgoing obligations and has fulfilled 3, so Responsibility = 0.6").

2. **Equal weighting hides imbalance.** A relation with Respect=1.0, Reciprocity=0.0, Responsibility=1.0 gets a wilson_alignment of 0.67 (green on WilsonMeter). But zero reciprocity is precisely the extractive pattern Wilson critiques. The arithmetic mean masks the very imbalances Wilson's framework is designed to reveal.

3. **The alignment score has no consequences.** `findAccountabilityGaps()` identifies relations below threshold, but the list is never consumed by any enforcement mechanism. The `relationsNeedingAttention()` function in the audit module returns a filtered list — but nothing subscribes to it.

#### OCAP® Compliance: Structural but Not Enforced

The `checkOcapCompliance()` function performs meaningful checks:

```typescript
// ontology-core/src/queries.ts:166-189
// Checks: ownership specified, control specified, compliant flag set, consent not false
```

And `auditOcapCompliance()` aggregates these across all relations. This is structurally sound auditing. But the critical gap is the same: **nothing consumes the audit results as constraints**. The data-store module writes relations to Redis without calling `checkOcapCompliance()`:

```typescript
// data-store/src/store.ts:327-331
export async function trackAccountability(researchId: string, data: AccountabilityData): Promise<void> {
  await redis.hSet(`accountability:${researchId}`, {
    // Writes directly — no OCAP check, no Wilson check, no governance gate
  });
}
```

#### Consent: The Most Critical Gap

Wilson is explicit: consent in Indigenous research is an **ongoing relational obligation**, not a one-time event. The codebase models consent as:

```typescript
consent_given?: boolean;    // Optional. Boolean. One-time.
consent_scope?: string;     // Unstructured text.
```

What's missing for Wilson-aligned consent:
- **Temporal dimension** — when was consent given? When does it expire?
- **Parties** — who gave consent? To whom? For what purpose?
- **Revocability** — can consent be withdrawn? What happens to data when it is?
- **Renewal** — is consent periodically reaffirmed?
- **Scope specificity** — consent for what specific use? A free-text string is not enforceable.
- **Relational context** — consent given under what relational circumstances?

The `checkOcapCompliance()` function checks `consent_given === false` (explicitly denied) but does not check for `consent_given === undefined` (never asked). The absence of consent is treated as acceptable, which is the opposite of Wilson's framework.

---

### Audit System (relational-query)

#### What the Audit Catches

The `auditAccountability()` function generates a comprehensive report:

```typescript
// relational-query/src/audit.ts:17-93
// Checks: OCAP compliance, Wilson alignment average, direction coverage,
// ceremony honoring ratio, outstanding obligations count
// Generates human-readable recommendations
```

This is the **strongest axiological component** in the system. It surfaces:
1. OCAP non-compliance counts with actionable descriptions
2. Low Wilson alignment with percentage
3. Missing direction coverage (relational awareness gaps)
4. Unceremonied relation ratios
5. Outstanding obligation counts

#### What the Audit Cannot Do

1. **It cannot block anything.** The report is informational. No function call path leads from `auditAccountability()` to a write rejection or operation halt.

2. **Recommendations are strings, not actions.** `"5 relation(s) lack full OCAP® compliance — review ownership, control, access, and possession flags"` is a human-readable suggestion. There is no programmatic way to act on it.

3. **It is opt-in.** Nothing in the system automatically triggers an audit. A developer must explicitly call `auditAccountability()` — and then must choose to read and act on the results.

4. **It has no memory.** The audit produces a snapshot. There is no trending, no comparison to previous audits, no detection of accountability regression.

#### Traversal: The Closest Thing to Enforcement

The traversal system in `relational-query/src/traversal.ts` has two genuinely enforcement-adjacent features:

```typescript
// traversal.ts:114 — Ceremony boundary check
if (options.respectCeremonyBoundaries && !edge.ceremony_honored) {
  continue;  // Skip this edge — traversal stops at unhonored ceremonies
}

// traversal.ts:63-75 — OCAP-only traversal
if (options.ocapOnly) {
  // Filters edges to only follow OCAP-compliant paths
}
```

These are **real governance mechanisms** — they actually prevent access to data through non-compliant paths. However:
- Both are opt-in (`respectCeremonyBoundaries: false` and `ocapOnly: false` are defaults)
- They affect read traversal, not write operations
- They can be trivially bypassed by not setting the options

This is closest to Wilson's vision: data that has not been through ceremony is *genuinely inaccessible* through certain query paths. But the opt-in nature undermines it.

---

## Strengths (Genuine Axiological Enforcement)

1. **Relations as first-class ontological entities** (types.ts:62-141). Wilson insists relationships are beings, not just connections. The `Relation` type carries its own obligations, OCAP® metadata, and accountability tracking — this is structurally sound and philosophically grounded.

2. **Obligation categories span beyond human** (types.ts:66-72). The `ObligationCategory` type includes 'human', 'land', 'spirit', 'future' — directly reflecting Wilson's teaching that accountability flows through ALL relations, not just human ones. This is rare and meaningful.

3. **Ceremony-bounded traversal** (traversal.ts:114). When `respectCeremonyBoundaries: true`, the system genuinely stops graph traversal at edges that lack ceremony honoring. This is the closest the codebase comes to *enforcing* that ceremony matters — unhonored relations are unreachable.

4. **OCAP-only traversal paths** (traversal.ts:63-75). The `ocapOnly: true` option filters traversal to only follow OCAP-compliant edges. This is genuine data sovereignty enforcement — non-compliant paths are computationally invisible.

5. **Comprehensive audit with actionable language** (audit.ts:17-93). The audit system generates specific, quantified recommendations. The language is invitational ("consider expanding relational awareness") rather than punitive, aligning with Indigenous pedagogical approaches.

6. **Zod schemas enforce structural integrity at boundaries** (schemas.ts). While not axiological enforcement per se, the Zod schemas ensure that accountability data is well-formed at ingestion. `AccountabilityTrackingSchema` requires all three R's as numbers between 0 and 1, ensuring the structure is present even if the values are not verified.

7. **Governance access levels are semantically rich** (types.ts:259). The `GovernanceAccess` type distinguishes 'open', 'ceremony_required', 'restricted', and 'sacred' — these aren't arbitrary labels but reflect real Indigenous governance categories.

---

## Gaps (Where Accountability Is Performative)

1. **No write-time enforcement.** The data-store writes nodes, edges, ceremonies, and accountability data to Redis with zero governance checks. A relation can be created with `compliant: false`, `consent_given: false`, and `wilson_alignment: 0` and the system will accept it without complaint. The entire enforcement architecture is read-side only.

2. **Governance checks are advisory by design.** The ceremony-protocol spec explicitly states "Governance checks inform, they don't prevent" (ceremony-protocol.spec.md:133). This is a philosophical choice that contradicts Wilson's framework, where relational accountability is not optional guidance but the moral structure itself.

3. **Wilson alignment is a meaningless arithmetic mean.** Averaging Respect + Reciprocity + Responsibility / 3 treats these as independent, equally-weighted, compensatory dimensions. Wilson's framework treats them as *interdependent and non-compensatory* — zero reciprocity cannot be offset by high respect. The scoring system can produce "good" scores for extractive relationships.

4. **Consent is a one-time optional boolean.** `consent_given?: boolean` is the entire consent model. No temporal dimension, no parties, no revocability, no renewal, no specificity. This reproduces the Western "sign once" consent pattern that Indigenous data sovereignty explicitly rejects.

5. **The WilsonMeter simplified away its own specification.** The spec described accepting `AccountabilityTracking` with R/R/R breakdown; the implementation accepts a single `alignment: number`. The component cannot show which dimension of accountability is failing, reducing Wilson's nuanced framework to a dashboard number.

6. **Phase transitions have no guard conditions.** Ceremony phases advance unconditionally. A project can move from 'opening' to 'council' without having set intentions, conducted ceremony, or honored any relations. The ceremony structure is cosmetic state.

7. **Ceremony-bounded traversal and OCAP-only paths default to OFF.** The two strongest enforcement mechanisms (`respectCeremonyBoundaries` and `ocapOnly`) default to `false`. This means the default system behavior is the extractive one — full access, no ceremony required. Enforcement must be opted into, and opt-in ethics is Wilson's exact critique of Western research paradigms.

8. **No accountability regression detection.** The audit produces snapshots with no memory. A project's Wilson alignment could drop from 0.9 to 0.1 between audits and nothing would notice. There is no continuous accountability monitoring.

9. **Self-reported OCAP® compliance.** The `compliant: boolean` flag on `OcapFlags` is set by whoever creates the data. `checkOcapCompliance()` verifies that fields are filled in, not that the claimed ownership/control/access/possession is legitimate. This is compliance theater — the data says it's compliant because the data creator said so.

10. **"Am I being a good relative?" is unanswerable.** The central axiological question of Wilson's paradigm cannot be answered by the system. There is no function, no metric, no workflow that evaluates whether a user, a project, or a ceremony cycle is "being a good relative." The accountability tracking measures *scores* but not *relational behavior*.

---

## Recommendations for Future Packaging

### 1. Invert the Default: Enforcement-First Architecture

The most impactful change: make ceremony-bounded traversal and OCAP-only paths the **default**, with explicit opt-out requiring justification:

```typescript
const DEFAULT_OPTIONS: TraversalOptions = {
  respectCeremonyBoundaries: true,   // Was: false
  ocapOnly: true,                     // Was: false
  bypassJustification?: string;       // Required if opting out
};
```

This shifts the paradigm from "you must opt into accountability" to "accountability is the default and extraction requires justification."

### 2. Write-Time Governance Gates

Create middleware that enforces accountability at write time:

```typescript
// Before storing a relation:
function validateRelationForStorage(relation: Relation): ValidationResult {
  const ocap = checkOcapCompliance(relation.ocap);
  if (!ocap.compliant) return { blocked: true, reason: ocap.issues };
  
  if (relation.accountability.wilson_alignment < MINIMUM_THRESHOLD) {
    return { blocked: true, reason: 'Wilson alignment below minimum' };
  }
  
  if (relation.ocap.consent_given !== true) {
    return { blocked: true, reason: 'Consent not confirmed' };
  }
  
  return { blocked: false };
}
```

### 3. Replace Consent Boolean with Consent Protocol

Model consent as Wilson envisions it — an ongoing relational obligation:

```typescript
interface ConsentRecord {
  id: string;
  granted_by: string;           // Who gave consent
  granted_to: string;           // Who received consent  
  scope: string[];              // Specific permitted uses
  granted_at: string;           // When
  expires_at?: string;          // When it needs renewal
  renewed_at?: string;          // Last renewal
  revoked_at?: string;          // If withdrawn
  ceremony_context?: string;    // Ceremony in which consent was given
  conditions: string[];         // Ongoing conditions
  status: 'active' | 'expired' | 'revoked' | 'pending_renewal';
}
```

### 4. Non-Compensatory Wilson Scoring

Replace the arithmetic mean with a scoring function that reflects Wilson's interdependence:

```typescript
function computeWilsonAlignment(a: AccountabilityTracking): number {
  const { respect, reciprocity, responsibility } = a;
  // Minimum dimension determines the score — no compensation
  const minimum = Math.min(respect, reciprocity, responsibility);
  // Geometric mean rewards balance
  const geometric = Math.cbrt(respect * reciprocity * responsibility);
  // Weight toward the minimum — any zero makes the whole score zero
  return geometric * 0.7 + minimum * 0.3;
}
```

### 5. Phase Transition Guards

Make ceremony phase advancement conditional on accountability:

```typescript
function canAdvancePhase(
  state: CeremonyState,
  relations: Relation[],
  ceremonies: CeremonyLog[]
): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  if (state.phase === 'opening' && ceremonies.length === 0) {
    blockers.push('Opening phase requires at least one ceremony before advancing');
  }
  
  const alignment = aggregateWilsonAlignment(relations);
  if (alignment < 0.5) {
    blockers.push(`Wilson alignment (${(alignment*100).toFixed(0)}%) too low to advance`);
  }
  
  const audit = auditOcapCompliance(relations);
  if (!audit.overall_compliant) {
    blockers.push(`${audit.non_compliant_count} relations not OCAP-compliant`);
  }
  
  return { allowed: blockers.length === 0, blockers };
}
```

### 6. Accountability Regression Detection

Add temporal tracking to surface accountability erosion:

```typescript
interface AccountabilitySnapshot {
  timestamp: string;
  wilson_alignment: number;
  ocap_compliance_rate: number;
  ceremony_coverage: number;
  obligations_outstanding: number;
}

function detectRegression(
  snapshots: AccountabilitySnapshot[],
  threshold: number = 0.1
): RegressionAlert[] {
  // Compare recent snapshots to detect declining accountability
}
```

### 7. Restore WilsonMeter to Spec — R/R/R Breakdown

The WilsonMeter should accept `AccountabilityTracking` as its spec described, showing where each R dimension stands and highlighting the weakest:

```typescript
interface WilsonMeterProps {
  accountability: AccountabilityTracking;
  onLowAlignment?: (dimension: 'respect' | 'reciprocity' | 'responsibility') => void;
  threshold?: number;
}
```

---

## Proposed New Packages

### `medicine-wheel-accountability-enforcer`

A middleware package that sits between ceremony-protocol/data-store and provides actual enforcement:

**Responsibilities:**
- Write-time validation gates (OCAP®, Wilson threshold, consent verification)
- Phase transition guards with accountability prerequisites
- Consent lifecycle management (grant, renew, revoke, expire)
- Accountability regression monitoring with alerting
- "Am I being a good relative?" evaluation function that synthesizes relational behavior metrics

**Core function:**

```typescript
function amIBeingAGoodRelative(
  actor: string,
  relations: Relation[],
  ceremonies: CeremonyLog[],
  obligations: RelationalObligation[]
): RelationalAccountabilityAssessment {
  // Synthesize: Are obligations being met? Are ceremonies being honored?
  // Is reciprocity flowing? Is consent current? Are all four obligation
  // categories (human/land/spirit/future) being attended to?
}
```

This function — Wilson's central question, made computational — is the missing heart of the system.

### `medicine-wheel-consent-protocol`

A dedicated package for ongoing relational consent management:

**Responsibilities:**
- Consent lifecycle (request → grant → active → renew/revoke/expire)
- Party-specific consent records
- Scope-specific consent (not blanket booleans)
- Ceremony-linked consent (consent given in ceremonial context)
- Consent verification at data access time
- Consent expiry notifications

---

## Conclusion

The Medicine Wheel developer suite has built a **remarkable ontological foundation** for relational accountability. The type system genuinely encodes Wilson's framework — first-class relations, obligation categories beyond human, OCAP® data sovereignty, the three R's. This is not superficial appropriation; the data model reflects deep engagement with Indigenous relational principles.

But ontology without enforcement is description without ethics. Wilson's axiology demands that relational accountability have *consequences* — that "Am I being a good relative?" is not a dashboard metric but a gatekeeping question. The current system can *describe* a non-accountable relationship but cannot *prevent* one. It can *display* OCAP® non-compliance but cannot *block* non-compliant data access. It can *measure* Wilson alignment but cannot *require* it.

The gap between the system's axiological *representation* and axiological *enforcement* is the gap between Western "informed consent" (sign once, extract forever) and Indigenous relational accountability (ongoing, mutual, consequential). Closing this gap — through write-time gates, non-compensatory scoring, consent protocols, and default-on enforcement — would transform the Medicine Wheel suite from a system that *talks about* relational accountability to one that *practices* it.

As Wilson writes: the axiology of a paradigm is its set of morals and ethics. The morals this codebase currently practices — not the ones it displays — are: accountability is optional, enforcement is impolite, and the individual developer's agency supersedes relational obligations. These are Western axiological defaults wearing Indigenous ontological clothing. The fix is not more types or better displays, but enforcement architecture that makes accountability the path of least resistance.
