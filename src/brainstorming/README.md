# @medicine-wheel/brainstorming

Idea into committed design, through approval gates a human holds.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Why it exists

Convergence has a shape: read the ground, ask one question at a time, offer two
or three approaches with trade-offs, present the design in sections each
approved before the next, write the spec, let the human read it, then plan. This
package holds that shape as data rather than as advice, so it cannot be
forgotten under load.

## The part that matters

It routes **every outcome statement it emits** through
`@medicine-wheel/creative-orientation` — including its own questions.

That is not decoration. An outcome phrased as elimination inside a
multiple-choice option becomes the human's *selected answer*, and from that
moment it stops looking like the agent's bias and starts looking like a
requirement. The moment of speaking is the only point where that is still
catchable.

```ts
import { openSession, checkOptions, ask, suspendedOn, advance } from '@medicine-wheel/brainstorming';

const session = openSession('every cross-repository change arrives verified against its consumers');

checkOptions(session, [
  'Catch cross-service contract breaks',
  'Every change arrives already verified',
]);
// → one finding, on the first option: phrased as removing something,
//   while nothing is being restored.
```

## Gates are suspended states, not pauses

`ask()` suspends the session on a question. `advance()` **refuses** while a gate
is unanswered.

This is the one place refusal is correct. Everywhere else in this suite a check
advises and lets the caller proceed — but a gate is a question addressed to a
person, and answering it on their behalf is not a shortcut. It is a
substitution.

```ts
const waiting = ask(session, 'thin convention, or a framework?');
suspendedOn(waiting);   // the gate, holding
advance(waiting);       // throws — the question belongs to someone else
```

## Phases

`explore → clarify → approaches → design → spec → review → plan`

Four of them are gated: `clarify`, `approaches`, `design`, `review`. Those are
the points where a half-finished creative process waits for its human — and
where, today, we still have nowhere good to put that suspended state when the
connection drops.

## Where it sits

```
creative-orientation ......... the gate
    ├── gap-analysis ......... the fire path
    └── structural-tension ... the advancing path

brainstorming ................ calls the gate on everything it says
```

## Status

First release. The protocol is expressed; the surface for *holding* a suspended
session across a dropped connection is not solved here and is named as open.

## License

MIT
