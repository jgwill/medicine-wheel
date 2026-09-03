# Prediction delta — scored as each lane returns

Method per dispatch-discipline §7: `PREDICTIONS.md` was committed (`9a1caa6`) before any
lane reported. This file scores the difference. A confirmed prediction taught nothing; a
correction is what the lane was paid for.

---

## L1 — review → community choice (returned 2026-09-03)

### Coordinator-verified before recording

Two of L1's load-bearing claims re-run independently by the coordinator:

- `X` `src/community-review/src/consensus.ts:26-33` — `consensusReached = allSpoken &&
  reviewers.length > 0`. It compares reviewer ids against speaker ids. **It never reads a
  voice's content.** Consensus in this package means attendance. Confirmed.
- `X` `grep -rn "node:fs\|from 'fs'\|fetch(\|process.env" src/community-review/src/` →
  empty. Zero I/O. Confirmed.
- `X` `/src/Miadi/packages/review-service/app/lib/auth-token.ts` — one shared secret
  `MIADI_REVIEW_TOKEN`, compared with `timingSafeEqual`. No user, no session, no subject.
  `grep userId\|author\|session` in `reviews-store.ts` → empty. **The service cannot tell
  two people apart.** Confirmed.
- `X` `grep -rn "CREATE TABLE" review-service/` → empty. The Neon schema exists only inside
  the running database. Confirmed.

### Scoring

| # | prediction | outcome |
|---|---|---|
| P1.1 | community-review has no persistence; storage seam missing | **confirmed** |
| P1.2 | don't migrate the service wholesale; extract types | **confirmed, and strengthened** — L1 argues it should not move at all |
| P1.3 | inquiry-weave's contribution is its edge vocabulary | **corrected** |
| P1.4 | lane will argue NEW package; I lean to extending community-review | **lane right, coordinator wrong** |
| P0.1 | ep340's packet is a draft never exercised twice | **confirmed, and worse than predicted** |

### What the lane corrected (P1.3)

I predicted MW should absorb inquiry-weave's edge vocabulary. L1 found MW **already has it**
— `storage-provider/src/interface.ts:88-113` re-declares the record shape (37 live rows) and
`ontology-core/src/kinship.ts` carries a richer edge vocabulary than inquiry-weave's. So
there is nothing to absorb. What inquiry-weave uniquely holds is an idempotent projection
procedure plus `lineage-edge.ts:20-27`, which is **a bug report against MW's own API** — no
per-edge GET, 404 on a valid id. That is an MW fix, not a migration.

### Where I was wrong (P1.4)

I leaned toward extending `community-review` with a poll outcome, reasoning that issue #105
(consensus bound to a PR lifecycle) and a community poll are the same shape. L1 argues they
are siblings, not one thing: #105 is a **bounded, authorizing** circle; an audience poll is
**unbounded and authorizes nothing**. And `community-review`'s outcome enum runs the opposite
direction — a circle deciding *about* an artifact, versus a proposer offering options. I
accept the correction. New package.

### The finding nobody predicted

**Neither system has a notion of a person.** `community-review` has `Reviewer.id` as an
opaque string with no authentication behind it; `review-service` has one shared bearer token.
Before any community can be asked to choose, something has to decide what a chooser *is* —
and L1 correctly gated that on William's word rather than proposing a scheme.

### Also surfaced, unpredicted

- `X` `mcp/src/tools/governance-transformation.ts` exposes `mw_review_circle_open` and no
  tool to add a reviewer, record a voice, or close a circle. **A circle opened through MCP
  can never leave `gathering`.** It also persists as `metadata.is_review_circle`, violating
  this repo's own `metadata.kind` rule (`CLAUDE.md`, "Registering infrastructure in the
  wheel").
- `X` Store contains **0** occurrences of "poll" and **0** of "vote".
- `X` `RETURN-TO-EP339.md` asks William to choose A/B/C. Two later companion responses,
  through 2026-08-31, never answer it. The question is still open in the vessel.

---

## L2 — pending

## L3 — pending

---

## L2 — consumable surface (returned 2026-09-03)

### Coordinator-verified before recording

- `X` `grep -rln "fetch(" src/*/src/` → **empty**. No HTTP client anywhere in the 26
  packages. Confirmed.
- `X` root `package.json` has `zod: ^3.23.0` in `dependencies`. **Issue #107 describes a
  condition that does not hold.** Confirmed.
- `X` `src/storage-provider/package.json` has **no `exports` field**. Confirmed — that is
  why Miadi copied `CeremonialPhase` rather than importing the subpath.
- `X` `src/_/package.json` = `medicine-wheel@1.0.5`, `main: index.js`, and the folder holds
  only `package.json` + `README.md`. **A published package whose entry point does not
  exist**, outside `workspaces`, versioned above the suite.
- `X` Miadi declares **24** `@medicine-wheel/*` deps at `^0.6.1`; source imports exactly
  **5** (storage-provider, ontology-core, ui-components, github-ceremony, ceremonial-diary).
  `grep` for `ceremony-protocol|consent-lifecycle|fire-keeper|community-review` in Miadi
  source → **empty**. Confirmed: declared, never imported.

### Scoring

| # | prediction | outcome |
|---|---|---|
| P2.1 | `app/` not being a workspace package is the largest export finding | **wrong** — `@medicine-wheel/app` IS published at 0.6.4; the largest finding is **no HTTP client exists in any package** |
| P2.2 | ontology-core is the working contract; widen it | **confirmed** |
| P2.3 | bring `/src/Miadi/app/chronicle/lib/` back into MW | **partly** — L2 routes most of it to "leave it"; L3 independently found the one piece worth porting (`LineageWeb`) |
| P2.4 | lane surfaces a dependency-direction risk I did not name | **confirmed, differently** — the risk is not cadence, it is that **four incompatible ceremony phase vocabularies are live, two of them inside MW itself** |

### Where I was wrong (P2.1)

I predicted `app/` was unconsumable and that this was the headline. It is published and
consumable. The actual hole is that **nothing in the suite can talk to a wheel over HTTP** —
`mcp/src/http-store.ts` (743 lines) is the only client and it is locked inside the MCP
server, which exposes no `types`. The wheel's own code admits the cost at
`app/api/nodes/route.ts:26-31`. Every consumer hand-rolls its own fetch. That is why
"consume them elsewhere" has not happened: there is no door, only a description of one.

---

## L3 — perspective and navigation (returned 2026-09-03)

### Coordinator-verified before recording

The coordinator's first check **disagreed with L3 and was wrong** — it guessed edge keys
(`source`/`target`) that this store does not use. Re-run against the real shape
(`from_id`/`to_id`), every number reproduces:

- `X` nodes 205, edges 191, **isolates 75 (37%)**, mean degree over the connected 2.94.
- `X` `metadata.parent_id` present on **106** nodes; materialised as an edge on **5**.
  **101 containment relations exist only as metadata and are invisible to the graph.**
- `X` Top hubs are `node:land:host:gaia` (17), `node:human:tenant:...ilex` (14),
  `node:land:host:ilex` (14) — **infrastructure, not episodes.**
- `X` Reproducing the exact slice the UI renders (newest-100 nodes, newest-100 edges):
  **53 of the 100 rendered nodes have no drawable edge; 27 edges are dropped silently**
  because they point at nodes that were never delivered.
- `X` `src/storage-provider/src/jsonl.ts` — `getAllNodes(limit = 100)` and
  `getAllEdges(limit = 100)`, both `sortByNewest('created_at')`. `app/graph/page.tsx:167`
  fetches `/api/nodes` and `/api/edges` **with no parameters.**
- `X` `grep -rn "@medicine-wheel/relational-query" app/ lib/` → **empty**, while
  `src/relational-query/src/traversal.ts:46` exports `traverse` and `:217` `neighborhood`.

### Scoring

| # | prediction | outcome |
|---|---|---|
| P3.1 | layout problem masking an absent query problem | **confirmed, and under-stated** — it is also a silent truncation problem, which neither of us predicted |
| P3.2 | no time axis; `created_at` unused by the graph | **confirmed, and worse** — `created_at` is registration time, not occurrence; 41 of 83 episodes disagree |
| P3.3 | MW has no episode route; that is the phase | **confirmed** |
| P3.4 | "I predict I am wrong about the graph being the problem" | **half right** — the renderer is a real problem, but not the first one |

### The finding neither of us predicted

**The graph has been showing 100 of 205 nodes and 100 of 191 edges, and saying "100 Nodes /
100 Relations" as if that were the total.** A third of what it does render has nothing to
connect to. William's read of his own screen was accurate; the screen was not.

### On issue #129

L3's position: **not the same request.** #129 is tenancy (`Workspace`,
`WorkspaceMembership`, `workspace_id` as a scope key). William asked for navigation within
one dataset he already owns. The phases below do not need #129, and doing the neighbourhood
endpoint first makes #129 cheaper, because a workspace filter attaches there.
