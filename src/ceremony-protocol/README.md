# medicine-wheel-ceremony-protocol

Ceremony lifecycle protocol for **Medicine Wheel** — manages ceremony state, phase transitions, governance enforcement, and ceremonial review workflows.

## Overview

This package provides a protocol for managing the lifecycle of ceremonies within the Medicine Wheel framework. It handles:

- **Ceremony State Management** — Track current cycle, host sun, and ceremony phase
- **Phase Transitions** — Manage progression through opening, council, integration, and closure phases
- **Governance Enforcement** — Enforce OCAP (Ownership, Control, Access, Possession) principles through path-based governance rules
- **Ceremonial Review Workflows** — Identify changes that require ceremonial review based on governance configuration

## Installation

```bash
npm install medicine-wheel-ceremony-protocol
```

## Usage

### Ceremony State

```typescript
import { loadCeremonyState, getPhaseFraming } from 'medicine-wheel-ceremony-protocol';
import type { RSISConfig } from 'medicine-wheel-ontology-core';

const config: RSISConfig = { /* ... */ };
const state = loadCeremonyState(config);
const framing = getPhaseFraming(state?.phase);
```

### Phase Transitions

```typescript
import { nextPhase, PHASE_ORDER } from 'medicine-wheel-ceremony-protocol';

const currentPhase = 'opening';
const next = nextPhase(currentPhase); // 'council'
```

### Governance Enforcement

```typescript
import {
  checkGovernance,
  isIndexExcluded,
  checkCeremonyRequired,
  getAccessLevel,
  formatGovernanceWarning,
} from 'medicine-wheel-ceremony-protocol';

const config: GovernanceConfig = { /* ... */ };

// Check if a path is protected
const rule = checkGovernance('/sacred/path', config);

// Check if excluded from indexing
const excluded = isIndexExcluded('/node_modules', config);

// Check if ceremonial review is required
const requiresCeremony = checkCeremonyRequired('/src/core.ts', config);

// Get access level for a path
const access = getAccessLevel('/protected/file.ts', config);

// Format a warning message
if (rule) {
  console.log(formatGovernanceWarning(rule));
}
```

## Ceremony Phases

The protocol recognizes four ceremony phases:

1. **Opening** — What wants to emerge? Focus on intention and vision.
2. **Council** — Cross-Sun perspectives on code relationships.
3. **Integration** — Weaving insights into synthesis artifacts.
4. **Closure** — Reciprocity summaries and seeding observations.

## Governance Access Levels

- `open` — No restrictions
- `ceremony_required` — Changes require ceremonial review
- `restricted` — Restricted to specific authorities
- `sacred` — Sacred space requiring special protocols

## Dependencies

- `medicine-wheel-ontology-core` — Core ontology types and interfaces

## License

MIT

## Contributing

This package is part of the Medicine Wheel project. See the main repository for contribution guidelines.
