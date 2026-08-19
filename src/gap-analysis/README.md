# @medicine-wheel/gap-analysis

Problem-solving, built properly and without apology. Root cause, incidents,
regressions, troubleshooting — if something worked and stopped, you are in the
right room.

One question confirms it:

> **Is there a prior state you are restoring?**

**Yes, and you can evidence it.** Stay. This is the instrument: baseline,
observation, the difference between them, and elimination steps you can verify.

**No — you cannot name a state that actually existed.** Then the difference has
nothing to be measured against, and
[`@medicine-wheel/creative-orientation`](https://www.npmjs.com/package/@medicine-wheel/creative-orientation)
will point you toward structural tension instead. A feeling of urgency is not
evidence.

That requirement — a baseline with evidence — is what separates a fire from a
creating act, and it is why this package carries the name it does.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Why it exists

Sometimes the forest is on fire. Digitally too. When something worked and
stopped working, closing the difference between the current state and the prior
one is the **right** move — oscillating back to a baseline is the goal when you
are below the baseline.

Work like that deserves a real instrument rather than a euphemism, so this
package is built as a first-class citizen of the suite and not smuggled in under
a nicer name.

## The question at the door

Every analysis carries an orientation reading taken when it was opened, via
`@medicine-wheel/creative-orientation`. The question is always the same: *is a
prior state actually being restored?*

Opening an analysis **requires a baseline with evidence**. That requirement is
the whole point — it is the thing that separates a fire from a creating act, and
it cannot be satisfied by a feeling of urgency.

```ts
import { openGapAnalysis, addStep, doorAdvice } from '@medicine-wheel/gap-analysis';

let analysis = openGapAnalysis(
  { description: 'the published image matched the published packages',
    evidence: 'true in the previously tagged release, verified from registry and image metadata' },
  { description: 'the newest image tag trails npm; an intermediate release has no image',
    source: 'Docker Hub tags API, read 2026-07-25' },
  'the image no longer tracks npm because building it depends on a human remembering a flag',
);

doorAdvice(analysis);   // null — the situation and the instrument agree

analysis = addStep(analysis, {
  action: 'build the image from the tag in CI rather than from release.sh',
  verifiedBy: 'a v* tag push produces :app and :<version> without anyone running anything',
});
```

## It advises; it never refuses

If you open an analysis without evidence for the baseline, you get the analysis
**and** advice saying the routing rests on a feeling. You are not blocked. A
package that refuses is a package you learn to route around, and sometimes the
caller knows something the check does not.

## Steps must be verifiable

`addStep` rejects a step with no `verifiedBy`. An elimination step you cannot
check is a wish; the fire is out only when something says so.

## Where it sits

```
creative-orientation ......... the gate
    ├── gap-analysis ......... you are here — the fire path
    └── structural-tension ... the advancing path
```

Gap analysis is a borrowed instrument. It is genuinely available, and it is not
the foundation — the orientation question comes first, and this package reports
to it rather than the reverse.

## Status

First release. Small on purpose.

## License

MIT
