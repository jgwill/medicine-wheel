# medicine-wheel-transformation-tracker

Research transformation tracking for the Medicine Wheel Developer Suite.

> Wilson's validity criterion: "If research doesn't change you, you haven't done it right."

## Purpose

Tracks the transformative impact of research on researchers, communities, and relational networks. Without transformation tracking, the system can measure process compliance but cannot determine whether the research *succeeded* in Wilson's terms.

## Installation

```bash
npm install medicine-wheel-transformation-tracker
```

## Key Concepts

### TransformationLog

The primary container that tracks all transformation signals across a research cycle:
- **Snapshots** — periodic captures of the researcher's understanding state
- **Reflections** — researcher self-reflection entries
- **Community Impacts** — recorded benefits to the community
- **Relational Shifts** — changes in relational strength/quality
- **Reciprocity Ledger** — giving/receiving balance tracking
- **Seven-Generation Score** — long-term sustainability assessment

### Wilson Validity

The `wilsonValidityCheck()` function evaluates five dimensions:
1. **Researcher Transformation** — has the researcher been changed?
2. **Community Benefit** — has the community benefited?
3. **Relational Strengthening** — have relations been strengthened?
4. **Reciprocity Balance** — is giving and receiving balanced?
5. **Seven-Generation Consideration** — are future generations honored?

## API

### Researcher Module

- `logReflection(log, prompt, response, direction)` — add a reflection entry
- `snapshotUnderstanding(log, snapshot)` — capture current understanding state
- `compareSnapshots(before, after)` — diff two snapshots to detect growth
- `detectGrowth(log)` — analyze log for genuine growth signals

### Community Module

- `logCommunityImpact(log, impact)` — record community benefit
- `reciprocityBalance(log)` — compute giving/receiving balance
- `communityVoice(log)` — surface community perspective
- `impactTimeline(log)` — chronological impact narrative

### Relational Shift Module

- `trackRelationalChange(log, shift)` — record a relational shift
- `beforeAfter(log, relationId)` — get before/after for a relation
- `strengthDelta(log)` — aggregate relational strength changes
- `newRelationsFormed(log)` — count and describe new relations

### Seven Generations Module

- `sevenGenScore(log)` — compute seven-generation sustainability score
- `futureImpact(log)` — assess impact on future generations
- `sustainabilityCheck(log)` — check long-term relational sustainability

### Reciprocity Ledger Module

- `logGiving(log, entry)` — record giving
- `logReceiving(log, entry)` — record receiving
- `balanceCheck(log)` — is reciprocity balanced?
- `reciprocityDebt(log)` — what needs to be given back?

### Prompts Module

- `reflectionPrompts(phase)` — generate prompts for each ceremony phase
- `phaseTransitionPrompts(from, to)` — prompts for phase transitions
- `milestonePrompts(milestone)` — prompts at relational milestones

### Validity Module

- `wilsonValidityCheck(log)` — THE function: has the research transformed?

## License

MIT — IAIP Collaborative, Shawinigan, QC
