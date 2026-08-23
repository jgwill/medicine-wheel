# @medicine-wheel/creative-problem-solving

You arrived here looking for creative problem solving. One question first:

> **Is there a prior state you are restoring?**

**Yes — you can name it and it genuinely existed.** This is a fire, and
[`@medicine-wheel/gap-analysis`](https://www.npmjs.com/package/@medicine-wheel/gap-analysis)
is the right instrument: baseline with evidence, observation, the difference
between them, and elimination steps you can verify. That is correct work for
this situation. It carries no apology and needs no other name.

**No — nothing existed that you are returning to.** You are creating, and
structural tension is the instrument. Difference-closing language will mislead
you here, because there is no baseline to return toward: an outcome phrased as
removal optimises against a list of known failures rather than toward the state
you actually want.

A feeling of urgency is not evidence. Under pressure every situation feels like
a fire — which is why the question is asked at the door rather than afterward.

## This package is a signpost

It holds no logic and never will. Every export here comes from
[`@medicine-wheel/creative-orientation`](https://www.npmjs.com/package/@medicine-wheel/creative-orientation),
which is where the question is actually answered. Import either name — the
surface is identical. This one exists because it is the name you were looking
for.

```ts
import { readOrientation, THE_QUESTION } from '@medicine-wheel/creative-problem-solving';

THE_QUESTION;   // 'Is there a prior state you are restoring?'

readOrientation({
  outcome: 'catch cross-service contract breaks',
  restores: null,
}).route;       // 'structural-tension' — nothing is being restored

readOrientation({
  outcome: 'the published image matches the published packages',
  restores: 'true in the previously tagged release',
  evidence: 'tagged 2026-07-17',
}).route;       // 'gap-analysis' — a named, evidenced baseline
```

The baseline claim decides the route. Vocabulary only ever contributes signals,
because `reduce latency` is a correct outcome during an incident and a symptom
worth surfacing as a product vision.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## License

MIT
