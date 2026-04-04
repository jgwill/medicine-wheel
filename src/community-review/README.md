# medicine-wheel-community-review

> Community-based ceremonial review protocol — implements Wilson's validation through Elder review circles, consensus-seeking, and relational accountability assessment.

Part of the [Medicine Wheel Developer Suite](https://github.com/jgwill/medicine-wheel).

## Overview

Wilson describes research validation not through peer review but through *community review* — Elders, knowledge keepers, and community members validate whether research honors relational accountability. This package implements that vision.

## Core Concepts

### Review Circle
A community body that evaluates an artifact through talking circle, Elder validation, and consensus. Circles progress through: `gathering → reviewing → deliberating → decided`.

### Talking Circle
Each participant shares their voice in turn, honoring all directions. Voices are recorded with directional and role context.

### Elder Validation
Elders provide final validation and blessing, ensuring artifacts honor relational accountability.

### Wilson's Three R's Check
Every review outcome includes a check against Wilson's three R's:
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
} from 'medicine-wheel-community-review';

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
- `reviewAgainstWilson(circle)` — Check against Wilson's 3 R's
- `reviewAgainstOcap(circle)` — Check against OCAP®
- `relationalHealthReview(circle)` — Assess relational health

### Outcomes
- `approveWithBlessings(circle, blessing)` — Approve
- `requestDeepening(circle, areas)` — Needs more work
- `returnToCircle(circle, reason)` — Send back
- `ceremonialHold(circle, reason)` — Pause for ceremony

## Dependencies

- `medicine-wheel-ontology-core` ^0.1.1
- `medicine-wheel-ceremony-protocol` ^0.1.0
- `zod` ^3.23.0

## License

MIT
