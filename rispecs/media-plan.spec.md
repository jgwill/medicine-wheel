# media-plan — RISE Specification

> A plan for a piece of media, kept on the wheel before anything renders, so a person, a talking circle or a decision model can still change what gets made.

**Document ID:** rispec-media-plan-v1
**Last Updated:** 2026-11-05
**Touches:** `@medicine-wheel/ontology-core`
**Issue:** jgwill/medicine-wheel#173
**Consumer:** `@miadi/inquiry-weave` (jgwill/Miadi#940), through the notebook door

---

## Desired Outcome

A plan made in an episode exists on the wheel as one element per version. A ceremony can gather around one version, a delayed resolution can wait on it, and a person's ruling can attach to it. A reader can ask for the plans of a notebook and follow a plan back to the plan it was seeded from.

## Current Reality

Gemini Notebook can stop a slide deck at its outline and a video at its producer notes. Nothing renders until someone sends the plan on, and the tool then keeps neither the plan nor the feedback. DeepDiver saves each plan as a numbered file in the episode's `captures/notebook-<uuid>/`, so the record is safe in files. Before this specification, the wheel could hold the node but had no word for what it was.

## What a media plan is

It is what a deck or a video intends. It rides a `knowledge` node, like a shot or an edit brief, and the `NodeType` union stays closed.

| part | value |
|---|---|
| kind | `metadata.kind: 'media-plan'`, in `ProductionEntityKind` |
| node id | `media-plan:<card uuid>`, from `mediaPlanNodeId` |
| metadata | `MediaPlanMetadataSchema` |
| containment | `metadata.parent_id`, the node holding it |
| state | `paused`, `sent_on`, `rendered`, `released` |

There is one node per version, because each version is another card in the tool that made it. So `<card>#<n>` names one item in one version, with no id to mint.

## What it is not

**Not a `plan_perspective`.** That record is Miette's reading of a Claude Code session's plan, keyed by session (`plan-insight-perspective-registration.spec.md`). A media plan is a plan for a piece of media, keyed by its card. Miette reading a media plan would be a new perspective on it, not the same record.

**Not a capability.** A capability says what a repository provides (`repository-mapping`). A media plan is what was made with one, which `made_with` names.

**Not the plan's text.** The text, the feedback and any reading of it stay in the episode's files, and the node points at them with `path`. Text copied onto the wheel could drift from what people read.

## Edges

Both are in `KINSHIP_EDGE_TYPES`, and both are `ProductionRelation` types.

| from | edge | to | inverse |
|---|---|---|---|
| a notebook | `holds-plan` | a media plan | `plan-held-by` |
| a media plan | `seeded-from` | the plan it started from | `seed-of` |

What a plan became is `rendered_as` in its metadata, since a rendered artifact has no node of its own. `seeded-from` reads as PROV's `wasDerivedFrom` (jgwill/medicine-wheel#161).

## Reading it

```text
GET /api/nodes?kind=media-plan&parent_id=notebook:<uuid>      the plans of a notebook
GET /api/nodes/media-plan:<card uuid>                         one version
GET /api/ceremonies?subject_id=media-plan:<card uuid>         the ceremonies held about it
```

A ceremony held about one version names it in `subject_id`, which takes any node, so no change was needed to hold one. A circle opens only for a person, and what may leave a circle for the tool that renders is still with Guillaume (Q11 of jgwill/miadi-orchestration-kit#133).

## Creative Advancement Scenario

**User Intent**: Guillaume wants to talk over an outline before anything renders, then find later what shaped it.
**Current Reality**: The plan is a file in an episode, and a card waiting in the tool.
**Natural Progression Steps**:
  1. A seat stops at the plan and keeps it, and the notebook door puts it on the wheel as `paused`.
  2. A person opens a ceremony with that version as its subject.
  3. People and agent-spirits speak, and what they agree becomes feedback, or a new version seeded from this one.
  4. The door refreshes the plan's state, and a new version points back with `seeded-from`.
**Achieved Outcome**: From a finished deck's plan, a reader reaches the version before it and the circle that discussed it.

## Exportation

- `src/ontology-core/src/media-plan.ts`, `kinship.ts`, `types.ts`. Tests: `tests/media-plan.test.ts`.
- The episode-side specification: `rispecs/episode-media-plan/` in Episode 251 of the chronicle.
- A plan's place at the Author's Desk and in an episode's script is still open: miadisabelle/Etuaptmumk-RSM#283.
