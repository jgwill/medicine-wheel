---
title: "Ceremony And Review API"
description: "API reference for ceremony-protocol, community-review, consent-lifecycle, and transformation-tracker."
---

These packages cover stateful governance flows rather than a single runtime class.

## Import Paths

```ts
import { enforceCeremonyGate, nextPhaseExtended } from 'medicine-wheel-ceremony-protocol';
import { createReviewCircle, seekConsensus } from 'medicine-wheel-community-review';
import { grantConsent, withdrawConsent } from 'medicine-wheel-consent-lifecycle';
import { wilsonValidityCheck, logReflection } from 'medicine-wheel-transformation-tracker';
```

## `medicine-wheel-ceremony-protocol`

Source file: `src/ceremony-protocol/src/index.ts`.

```ts
loadCeremonyState(config: RSISConfig): CeremonyState | null
nextPhase(current: CeremonyPhase): CeremonyPhase | null
getPhaseFraming(phase?: CeremonyPhase): string
checkGovernance(filePath: string, config: GovernanceConfig): GovernanceProtectedPath | null
isIndexExcluded(filePath: string, config: GovernanceConfig): boolean
checkCeremonyRequired(filePath: string, config: GovernanceConfig): boolean
getAccessLevel(filePath: string, config: GovernanceConfig): GovernanceAccess
formatGovernanceWarning(rule: GovernanceProtectedPath): string
nextPhaseExtended(current: CeremonyPhaseExtended): CeremonyPhaseExtended | null
getPhaseFramingExtended(phase?: CeremonyPhaseExtended): string
enforceCeremonyGate(filePath: string, config: GovernanceConfig): CeremonyGateResult
```

Example:

```ts
import { enforceCeremonyGate } from 'medicine-wheel-ceremony-protocol';
```

## `medicine-wheel-community-review`

Important exports from `src/community-review/src/index.ts`:

```ts
createReviewCircle(artifactId: string, artifactType: ArtifactType): ReviewCircle
addReviewer(circle: ReviewCircle, reviewer: Reviewer): ReviewCircle
submitForReview(circle: ReviewCircle): ReviewCircle
closeCircle(circle: ReviewCircle, outcome: ReviewOutcome): ReviewCircle
circleStatus(circle: ReviewCircle): { status: ReviewCircleStatus; reviewerCount: number; hasElder: boolean; voicesHeard: number; outcomeType?: string }
requestElderValidation(circle: ReviewCircle, elderId: string): ReviewCircle
elderGuidance(circle: ReviewCircle): { artifactType: string; voicesHeard: number; directionsRepresented: string[]; wilsonAlignment: number; suggestions: string[] }
seekConsensus(circle: ReviewCircle): { consensusReached: boolean; emergingOutcome: ReviewOutcomeType | null; voiceCount: number; reviewerCount: number; allReviewersSpoken: boolean }
talkingCircle(circle: ReviewCircle, entry: TalkingCircleEntry): ReviewCircle
reviewAgainstWilson(circle: ReviewCircle): { wilsonCheck: WilsonCheck; score: number; observations: string[] }
reviewAgainstOcap(circle: ReviewCircle): { compliant: boolean; issues: string[] }
approveWithBlessings(circle: ReviewCircle, blessing: string): ReviewOutcome
```

## `medicine-wheel-consent-lifecycle`

Key exports:

```ts
grantConsent(record: ConsentRecord): ConsentRecord
renewConsent(record: ConsentRecord): ConsentRecord
renegotiateConsent(record: ConsentRecord, newScope: ConsentScope): ConsentRecord
withdrawConsent(record: ConsentRecord, reason: string): ConsentRecord
checkConsentHealth(record: ConsentRecord): ConsentHealthResult
defineScope(description: string, dataTypes: string[], purposes: string[]): ConsentScope
scopeIncludes(scope: ConsentScope, query: ScopeQuery): ScopeCheckResult
consentCeremony(record: ConsentRecord, participants: string[], options?: ConsentCeremonyOptions): ConsentRecord
communityConsent(community: CommunityInfo, scope: ConsentScope): ConsentRecord
onWithdrawal(record: ConsentRecord): ConsentCascade
consentStaleAlert(record: ConsentRecord): StaleAlert | null
```

## `medicine-wheel-transformation-tracker`

Key exports:

```ts
logReflection(log: TransformationLog, prompt: string, response: string, direction: DirectionName): TransformationLog
snapshotUnderstanding(log: TransformationLog, snapshot: GrowthSnapshot): TransformationLog
detectGrowth(log: TransformationLog): GrowthSignal
logCommunityImpact(log: TransformationLog, impact: CommunityImpact): TransformationLog
trackRelationalChange(log: TransformationLog, shift: RelationalShift): TransformationLog
logGiving(log: TransformationLog, entry: Omit<ReciprocityEntry, 'type'>): TransformationLog
logReceiving(log: TransformationLog, entry: Omit<ReciprocityEntry, 'type'>): TransformationLog
sevenGenScore(log: TransformationLog): SevenGenResult
futureImpact(log: TransformationLog): FutureImpactAssessment
wilsonValidityCheck(log: TransformationLog): WilsonValidity
reflectionPrompts(phase: CeremonyPhase): string[]
```

| Export Group | Main Types | What It Controls |
|--------------|------------|------------------|
| Ceremony state | `CeremonyState`, `CeremonyGateResult` | Current phase, gating, and access decisions. |
| Review | `ReviewCircle`, `ReviewOutcome`, `Reviewer` | Community review, Elder validation, and circle closure. |
| Consent | `ConsentRecord`, `ConsentScope`, `ConsentCascade` | Scope, renewal, renegotiation, and withdrawal. |
| Transformation | `TransformationLog`, `WilsonValidity` | Researcher change, reciprocity, and long-term validity. |

These packages are most useful together in workflows where governance is not optional and a simple approve/reject state would be too coarse.
