# @medicine-wheel/gap-analysis

A gap analysis looks for what is missing. It measures what is true now against
a prior state that existed, names the difference, and lists elimination steps
you can verify. Root cause, incidents, regressions, troubleshooting: when
something worked and stopped, the technique can be useful.

It is not part of the creative orientation. This package lets the analysis
happen, then turns the work to the creative orientation.

One question confirms that an analysis fits:

> **Is there a prior state you are restoring?**

**Yes, and you can evidence it.** Open the analysis: baseline, observation, the
difference between them, and elimination steps you can verify.

**No, you cannot name a state that actually existed.** Then the difference has
nothing to be measured against, and
[`@medicine-wheel/creative-orientation`](https://www.npmjs.com/package/@medicine-wheel/creative-orientation)
will point you toward structural tension instead. A feeling of urgency is not
evidence.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## What it is for

A gap analysis looks for what is missing, and its main job here is to teach
the model using it. A model that has found what is missing is pulled toward
filling each missing item, one task per item. That is not what we are doing.

So the package lets the analysis happen, then names that pull and turns the
work to the creative orientation:

1. **Findings become current reality.** What the analysis found is kept as
   facts about today. It is not turned into a list of tasks.
2. **The pull is named.** The reflection says, in plain words, that the next
   impulse is to fill each missing item, and that this is not what we are doing.
3. **The desired outcome is asked for on its own terms.** What do we want to
   create, stated as something that will exist? It is not derived from the
   findings.
4. **The chart follows.** Current reality (including the findings) and the
   desired outcome go into a structural tension chart. Its action steps
   resolve tension toward the outcome. Some findings will matter to it, and
   others will not.

## The question at the door

Every analysis carries an orientation reading taken when it was opened, via
`@medicine-wheel/creative-orientation`. The question is always the same: *is a
prior state actually being restored?*

Opening an analysis **requires a baseline with evidence**. That requirement
separates a restore from a creating act, and a feeling of urgency cannot
satisfy it.

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

## The turn

```ts
import { turnToCreativeOrientation } from '@medicine-wheel/gap-analysis';

const turn = turnToCreativeOrientation(analysis);
turn.currentReality;   // the findings, as facts about today
turn.reflection;       // names the pull to fill each missing item
turn.nextStep;         // { tool: 'create_structural_tension_chart',
                       //   needs: ['desired_outcome', 'direction'], question }

const withOutcome = turnToCreativeOrientation(analysis, {
  desiredOutcome: 'every release publishes its image from the tag, with no one remembering a flag',
});
withOutcome.chartDraft;
// { desired_outcome, current_reality, action_steps: [] }
// No action step is taken from the findings. Add a direction and create the chart.
```

A desired outcome phrased as removing something is still placed in the draft,
with `desiredOutcomeAdvice` beside it.

The MCP server (`@medicine-wheel/mcp`) carries the same turn as the tool
`turn_to_creative_orientation`, called after `open_gap_analysis`.

### After a check

A check (a validator, an audit, a coverage reading) has no baseline that
existed. It reads a plan or a graph as it is and says what it does not find.
Its findings turn the same way:

```ts
const turn = turnToCreativeOrientation({
  check: 'accountability_validator',
  findings: ['CRITICAL: The plan has no Elder co-investigators; …'],
  holds: ['Hold the research while Elder co-investigators are part of the plan.'],
});
turn.currentReality;   // each finding as { from: 'finding' }, each hold as { from: 'hold' }
turn.reflection;       // names the pull, and says the holds stay as the check states them
```

A hold says what must be in place before the research continues: community
review, consent, governance. It is kept as current reality, reached with the
community, and never turned into a task. The MCP checks
(`accountability_validator`, `ocap_compliance_checker`, `wilson_paradigm_checker`,
`mw_snapshot_transformation`) answer `next_tool: "turn_to_creative_orientation"`
with `next_tool_args` ready to pass.

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
creative-orientation ......... the question asked first
    ├── gap-analysis ......... a prior state is being restored: looks for what is missing
    │     └── turnToCreativeOrientation ... findings become current reality
    └── structural-tension ... desired outcome, current reality stated as fact, action steps
```

Gap analysis is a technique the creative orientation does not include. The
orientation question comes first, and after an analysis the turn brings the
work back to a structural tension chart.

## Status

Small on purpose. `turnToCreativeOrientation` arrived in 0.26.3, and took a
check's findings in 0.26.4.

## License

MIT
