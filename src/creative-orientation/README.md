# @medicine-wheel/creative-orientation

Before the work, one question:

> **Is there a prior state you are restoring?**

**Yes, and you can name it.** This is a fire. Route to
[`@medicine-wheel/gap-analysis`](https://www.npmjs.com/package/@medicine-wheel/gap-analysis)
— evidenced baseline, observation, difference, verifiable steps.

**No, nothing existed that you are returning to.** You are creating. Route to
structural tension — the outcome named as a state that will exist, held against
current reality.

Looking for creative problem solving? It lands here first, then goes one way or
the other. The package that carries that name
([`@medicine-wheel/creative-problem-solving`](https://www.npmjs.com/package/@medicine-wheel/creative-problem-solving))
is a signpost pointing at this one.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Why it exists

Problem-solving is not the degraded case. It is the **correct** case for a
specific situation: something worked, it stopped working, restore it. Creating
is correct for a different one: bring into being a state that has never
existed.

They produce different structures. Problem-solving oscillates back to a
baseline — which is exactly right when you are below the baseline. Creating
advances toward an outcome. Using the wrong one is how rigorous work goes in
circles: chart an oscillating goal and you build a very careful machine for
returning to where you started.

This package answers the routing question and nothing else.

## The discriminator

A feeling of urgency is not evidence. Under pressure every situation feels like
a fire. One question separates them:

> **Is there a prior state you are restoring?**

If you can name it and it genuinely existed — fire. Gap analysis is the right
instrument. If you cannot, you are creating, and difference-closing language
will mislead you, because there is no baseline to close toward.

## Usage

```ts
import { readOrientation, worthSaying } from '@medicine-wheel/creative-orientation';

const reading = readOrientation({
  outcome: 'catch cross-service contract breaks',
  restores: null,
});

reading.orientation;      // 'advancing'
reading.route;            // 'structural-tension'
worthSaying(reading);     // true — the phrasing and the situation disagree
reading.advice;
// "This outcome is phrased as removing something, but nothing is being
//  restored. Elimination framing here optimises against a list of known
//  failures rather than toward the state you actually want."
```

The baseline claim decides the route. Vocabulary only ever contributes signals,
because `reduce latency` is a correct outcome during an incident and a symptom
worth surfacing as a product vision. A blocklist would be wrong in precisely
the situation where that vocabulary is right.

## It advises; it does not refuse

Nothing here blocks a caller. A package that refuses is a package people learn
to route around, and routing around it teaches nothing. The reading is
returned, the disagreement is named, and the caller proceeds — because
sometimes the caller knows something the check does not.

## Where it sits

```
creative-orientation ......... the gate
    ├── gap-analysis ......... the fire path
    └── structural-tension ... the advancing path
```

`@medicine-wheel/brainstorming` calls this on every outcome statement it emits,
including its own questions. That is the load-bearing use: an elimination-shaped
option label, once selected by a human, stops looking like an agent's bias and
starts looking like a requirement.

## Status

First release. The surface is small on purpose — the judgement of whether a
claimed baseline is *real* stays with a person, and everything around that
socket is deterministic so it can be tested and cannot be forgotten under load.

## License

MIT
