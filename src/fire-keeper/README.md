# @medicine-wheel/fire-keeper

> The Fire Keeper — ceremony coordination agent for Medicine Wheel

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

The Fire Keeper tends the ceremony fire: it holds work on consent (OCAP) and ceremony phase, reports trajectory confidence as advice, and brings value conflicts to a person (`humanNeeded`). It does not measure relational accountability; people judge that (#155).

## Purpose

This package holds that a ceremony needs a keeper, and that without one it degrades into process. That is our design principle, not a sentence from Wilson; Wilson (2008) does describe ceremony as preparation and setting the stage properly (pp. 61, 69). The Fire Keeper embodies relational accountability as an active agent that:

- **Evaluates** incoming ImportanceUnits against gating conditions
- **Gates** work through relational check-back protocol
- **Tracks** extended ceremony phases (gathering → kindling → tending → harvesting → resting)
- **Escalates** to human decision-makers at defined decision points
- **Issues** stop-work orders when relational accountability is violated

## Key Modules

| Module | Purpose |
|--------|---------|
| `keeper.ts` | FireKeeper class — core coordination engine |
| `gating.ts` | Gate evaluation and default gates (Wilson, OCAP, ceremony phase) |
| `decisions.ts` | Human-in-the-loop decision detection and permission escalation |
| `check-back.ts` | Four-step relational check-back protocol |
| `ceremony-state.ts` | Extended ceremony state management |
| `trajectory.ts` | Trajectory confidence and value divergence detection |
| `messages.ts` | A2A message type definitions |

## Usage

```typescript
import {
  FireKeeper,
  DEFAULT_GATES,
  type FireKeeperConfig,
} from '@medicine-wheel/fire-keeper';

const config: FireKeeperConfig = {
  trajectoryThreshold: 0.65,
  permissionTiers: ['observe', 'analyze', 'propose', 'act'],
  gatingConditions: DEFAULT_GATES,
  humanDecisionPoints: [],
};

const keeper = new FireKeeper(config);
const ceremony = keeper.beginCeremony('inquiry::my-research');
const result = keeper.evaluateImportance({ id: 'unit-1', title: 'Vision' }, 'inquiry::my-research');
```

## Permission Tiers

| Tier | Scope | Human Required |
|------|-------|---------------|
| 🟢 observe | Read files, gather context | No |
| 🟡 analyze | Produce analysis, create ImportanceUnits | No |
| 🟠 propose | Draft artifacts, suggest schemas | No (Fire Keeper reviews) |
| 🔴 act | Generate code, create commits | **Yes** |

## Relational Check-Back Protocol

Before any autonomous action, the Fire Keeper verifies:

1. **Does this action honor existing relations?**
2. **Does it strengthen the Spirit-Body relationship?**
3. **Is it accountable to all four directions?**
4. **Would an Elder approve?** A program cannot know. This step checks consent (OCAP) and ceremony phase, notes low trajectory confidence as advice, and leaves the question to the people involved.

## License

MIT

