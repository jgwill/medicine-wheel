# Coordinator predictions — written BEFORE the lanes reported

Per dispatch-discipline §7.2: record what I expect each lane to say differently, so the
delta cannot be quietly absorbed. Committed with a timestamp for that reason.

Coordinator model class: **Opus 5**. Lanes: **Opus 5** (L1, L2), **Opus 5** (L3).

## What I expect L1 (review → choice) to say

- P1.1 That `@medicine-wheel/community-review` is **pure functional state transitions with
  no persistence** — it takes a circle and returns a circle — and therefore cannot back the
  review-service without a store adapter. I expect the lane to confirm this and name
  `@medicine-wheel/storage-provider` or `data-store` as the missing seam.
- P1.2 That the review-service's Neon/Postgres store and `community-review`'s in-memory
  circle model do **not** share a schema, and that migrating the service wholesale into MW
  is the wrong first move — the right first move is extracting the *review record + version*
  types into MW and leaving the Next.js app where it is.
- P1.3 That `inquiry-weave`'s contribution is **relations, not content** (its own package
  description says so) — so what migrates into MW is the *edge vocabulary* (episode↔artefact
  ↔issue), not the CLI.
- P1.4 I expect the lane to disagree with me on where the "audience choice" type lives. I
  predict it will argue for a NEW package; I currently lean toward extending
  `community-review` with a `choice`/`poll` outcome, because issue #105 already proposes
  binding consensus to an external lifecycle (PRs) and a poll is the same shape.

## What I expect L2 (consumable surface) to say

- P2.1 That MW's real export problem is **`app/` is not a workspace package**, so every UI
  affordance in it (the graph page, the node inspector) cannot be consumed by
  `/src/Miadi/app` or `medicine-wheel-guillaume` — only `src/ui-components` and
  `src/graph-viz` can. I expect this to be the single largest finding.
- P2.2 That `@medicine-wheel/ontology-core` is already the working contract (proved by
  `medicine-wheel-guillaume` depending on `0.6.0`) and the phase-1 move is widening it, not
  replacing it.
- P2.3 That the valuable thing to bring back FROM the prototypes is
  `/src/Miadi/app/chronicle/lib/` — resolveRef, inventory, diagram, episodeRoom — because
  those are the episode-addressing primitives MW has none of.
- P2.4 I expect the lane to surface a dependency-direction risk I have not named:
  MW must not depend on `@miadi/*`, or the ceremonial layer inherits the narrative layer's
  release cadence.

## What I expect L3 (perspective / navigation) to say

- P3.1 That the 205-node cluster is a **layout problem masking an absent query problem** —
  `applyWheelLayout` places every node on one wheel with no scoping, and there is no
  "show me this episode and its 2-hop neighbourhood" path. I expect the lane to recommend
  scoped subgraph queries via `@medicine-wheel/relational-query` before any visual work.
- P3.2 That "relationship with the past" needs a **time axis the wheel does not have** —
  nodes carry `created_at` but the graph never uses it. I expect a recommendation for a
  temporal filter or a lineage-walk view.
- P3.3 That MW has no episode route at all, and `/src/Miadi/app/chronicle` is the only place
  episodes are viewable — so the phase is *bring chronicle viewing into MW*, not *improve
  the graph*.
- P3.4 I expect the lane to tell me the graph is fine and the problem is elsewhere. I
  predict I am wrong about at least one of "the graph is the problem."

## Where I expect to be corrected overall

- P0.1 I am probably over-weighting Episode 340 because it reads as a finished intent.
  William has said the chronicle is revisable. I expect at least one lane to find that 340's
  four-layer packet is a *drafted proposal that was never exercised twice*, and therefore
  weak ground for a phase plan.
- P0.2 I expect the film-production issue line (#84–#91) to turn out either already
  satisfied by code that exists, or abandoned — and I have not checked which.
