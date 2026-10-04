# @medicine-wheel/community-review

> Community-based ceremonial review protocol — review circles, consensus-seeking and relational accountability assessment, after the community-grounded credibility Wilson describes (*Research Is Ceremony*, 2008, pp. 121, 125, 131). Its Elder validation step is the package's own design.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

Part of the [Medicine Wheel Developer Suite](https://github.com/jgwill/medicine-wheel).

## Overview

Wilson (2008) grounds the credibility of research in relationships, not in peer review: continuous feedback with all participants, who check the analysis and hear each other (p. 121); going back to the community after the writing (Cora, p. 125); co-researchers confirming the work (p. 131). He describes no Elder blessing or Elder review circle as a validation step. This package holds that community-grounded credibility; its Elder validation step is its own design, and whether and how an Elder takes part follows each community's protocol.

## Core Concepts

### Review Circle
A community body that evaluates an artifact through talking circle, Elder validation, and consensus. Circles progress through: `gathering → reviewing → deliberating → decided`.

### Talking Circle
Each participant shares their voice in turn, honoring all directions. Voices are recorded with directional and role context.

### Elder Validation
Elders provide final validation and blessing, ensuring artifacts honor relational accountability.

### Respect, Reciprocity, Responsibility Check
Every review outcome includes a check against respect, reciprocity and responsibility, which Wilson names as features of relational accountability (*Research Is Ceremony*, 2008, p. 77; p. 99). Cora Weber-Pillwax, he writes, "calls these the 3 R's of Indigenous research and learning" (p. 77); a variant of hers, quoted by Evelyn Steinhauer, has Relationality as the third R (p. 58). The checks below are this package's reading:
- **Respect** — Are all perspectives honored?
- **Reciprocity** — Does the artifact give back?
- **Responsibility** — Is accountability explicit?

## Usage

```typescript
import {
  createReviewCircle,
  addReviewer,
  submitForReview,
  talkingCircle,
  requestElderValidation,
  seekConsensus,
  approveWithBlessings,
  closeCircle,
} from '@medicine-wheel/community-review';

// Create a circle
let circle = createReviewCircle('research-001', 'research');

// Add reviewers
circle = addReviewer(circle, {
  id: 'reviewer-1',
  role: 'steward',
  direction: 'east',
  accountableTo: ['community', 'future-generations'],
});

// Submit for review
circle = submitForReview(circle);

// Add voices in the talking circle
circle = talkingCircle(circle, {
  speakerId: 'reviewer-1',
  role: 'steward',
  direction: 'east',
  voice: 'This research honors the land and our relations.',
  timestamp: new Date().toISOString(),
});

// Request Elder validation
circle = requestElderValidation(circle, 'elder-1');

// Seek consensus
const consensus = seekConsensus(circle);

// Produce outcome
const outcome = approveWithBlessings(circle, 'This work carries our blessing.');
circle = closeCircle(circle, outcome);
```

## API

### Circle Management
- `createReviewCircle(artifactId, artifactType)` — Create a new circle
- `addReviewer(circle, reviewer)` — Add a participant
- `submitForReview(circle)` — Transition to reviewing
- `closeCircle(circle, outcome)` — Finalize with outcome
- `circleStatus(circle)` — Current state summary

### Elder Validation
- `requestElderValidation(circle, elderId)` — Request Elder review
- `elderGuidance(circle)` — Get Elder's guidance
- `elderBlessing(circle, elderId, blessing)` — Record blessing

### Consensus
- `seekConsensus(circle)` — Attempt consensus
- `talkingCircle(circle, entry)` — Add a talking circle entry
- `recordVoices(circle)` — Summarize all voices
- `resolveDisagreement(circle, process)` — Handle disagreement

### Accountability
- `reviewerAccountability(reviewer)` — Accountability chain
- `reviewAgainstWilson(circle)` — Check against respect, reciprocity and responsibility
- `reviewAgainstOcap(circle)` — Check against OCAP®
- `relationalHealthReview(circle)` — Assess relational health

### Outcomes
- `approveWithBlessings(circle, blessing)` — Approve
- `requestDeepening(circle, areas)` — Needs more work
- `returnToCircle(circle, reason)` — Send back
- `ceremonialHold(circle, reason)` — Pause for ceremony

## Dependencies

- `@medicine-wheel/ontology-core`
- `@medicine-wheel/ceremony-protocol`
- `zod`

## License

MIT
