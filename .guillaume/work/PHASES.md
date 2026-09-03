# PHASES — the synthesis

Written 2026-09-03 from three independent lanes (`L1`, `L2`, `L3`), each scored against
predictions committed before they reported (`PREDICTIONS.md`, `DELTA.md`).

Source classes: `X` executable, `W` written claim, `A` inference. Every fact below is `X`
unless marked.

---

## What the three lanes agree on, independently

They were briefed separately and did not read each other. All three landed on the same
shape: **medicine-wheel does not need much new capability. It needs the capability it
already has to be reachable.**

- `L3`: `relational-query` exports `neighborhood()` and `traverse()` with depth, direction,
  ceremony and time filters. `grep -rn "@medicine-wheel/relational-query" app/ lib/` →
  **empty**. Already a dependency. Never called.
- `L2`: Miadi declares **24** `@medicine-wheel/*` packages and imports **5**. It hand-wrote
  `lib/ceremonial-spiral.ts` (423 lines) implementing consensus over Redis while
  `@medicine-wheel/community-review` sat declared in its own `package.json`, unimported.
- `L1`: `mw_review_circle_open` exists with no tool to add a reviewer, record a voice, or
  close a circle. A circle opened through MCP **can never leave `gathering`**.

The pattern is one thing three times: **built, published, unreachable.**

## The three things that are genuinely absent

1. **An HTTP client.** `grep -rln "fetch(" src/*/src/` → empty across all 26 packages. The
   only client is `mcp/src/http-store.ts` (743 lines), sealed inside the MCP server, which
   publishes no `types`. The repo's own code admits the cost at
   `app/api/nodes/route.ts:26-31`. This is why "consume them elsewhere" has not happened.
2. **A notion of a person.** `community-review`'s `Reviewer.id` is an unauthenticated
   string. `review-service` has one shared bearer token (`auth-token.ts`) and zero identity
   columns. Neither system can tell two members of a community apart.
3. **An occurrence date.** `created_at` means "when the wheel learned this." 41 of 83
   episodes disagree with their real date; twelve May episodes all carry `2026-09-02`. Any
   timeline drawn today charts import batches.

## The correction that reframes everything

**The graph has been lying about its own size.** `src/storage-provider/src/jsonl.ts` —
`getAllNodes(limit = 100)`, `getAllEdges(limit = 100)`. `app/graph/page.tsx:167` fetches
both with no parameters. So the canvas renders **100 of 205 nodes and 100 of 191 edges**,
and the stats panel reads "100 Nodes / 100 Relations."

Reproducing that exact slice: **53 of the 100 rendered nodes have no drawable edge**, and
27 delivered edges are dropped silently because their endpoints were never sent.

Separately, **101 of 106 containment relations exist only in `metadata.parent_id` and were
never written as edges.** Materialising them takes connected components from 82 to 26 and
isolates from 75 to 22.

So the "cluster of nodes" is not a hairball. It is dust — 37% of the store is unconnected,
the largest hubs are systemd hosts rather than episodes, and half the data never arrived.

---

# The plan

Five phases. **Two npm publish cycles total**, both batched, because `RELEASING.md` makes a
cycle cost the same for six changes as for one.

## Phase 1 — Make the wheel show what it already holds *(no publish)*

Everything here is wiring against code that exists.

| step | file | from |
|---|---|---|
| 1.1 | `app/graph/page.tsx:167`, `app/api/edges/route.ts` | ask for the whole store; report `total` beside `count`. `app/api/nodes/route.ts:82` already has the unbounded path | L3-P1 |
| 1.2 | new `app/api/nodes/[id]/web/route.ts` | `GET ?depth=&direction=&kind=` calling `neighborhood()` from `relational-query`. No new capability | L3-P2 |
| 1.3 | `app/graph/page.tsx`, `MedicineWheelFlowGraph.tsx` | focus mode: pick a node, mount **only** that neighbourhood, Escape returns. Inspector gains an incident-relations list | L3-P2 |
| 1.4 | new `app/episodes/page.tsx` + `[id]/page.tsx` | `GET /api/nodes?kind=chronicle_episode` — **already works, no page calls it**. Attention board from `?kind=attention&parent_id=` | L3-P5 |
| 1.5 | `/src/Miadi/app/chronicle/lib/theme.ts` | import `DIRECTIONS`/`DIRECTION_COLORS` from `ontology-core` instead of redeclaring. Ends the west-colour split (`#5b78b4` vs `#1a1a2e`) | L2-P1 |

**1.1 must not ship alone** — at 205 nodes the wheel layout gets worse (north goes 33 → 93
nodes in the same 90°, spacing 7.1px → 2.5px against a 25.6px disc). It pairs with 1.2/1.3.

**What William can see at the end:** the true node count; one episode and its neighbours
alone on the canvas; an episode index; the open attention items on one screen. That is
complaints (a) and (b) answered without a single npm publish.

## Phase 2 — Repair the data that (c) depends on *(no publish)*

| step | what | measured effect |
|---|---|---|
| 2.1 | materialise every `metadata.parent_id` as a real edge, at registration time so it cannot drift again | components 82 → 26, isolates 75 → 22, chronicle root degree 2 → 82 |
| 2.2 | add optional `metadata.occurred_at`, populated for episodes from the `episode.yaml: date` already on disk. `created_at` keeps its correct meaning | a truthful time axis becomes possible |
| 2.3 | backfill ~170 `lineage:` entries (59 edges exist) and the 102 of 185 episode folders with no node | the wheel stops being a 40% sample |

**Held decision, one word:** `part-of` or `belongs_to` for 2.1. Both are in the vocabulary.
This is a naming call, not an engineering one.

## Phase 3 — One publish: build the doors *(suite `0.7.0` / mcp `4.7.0`)*

Batched into a single release cycle.

- **`@medicine-wheel/client`** — NEW. Extracted from `mcp/src/http-store.ts` +
  `app/lib/*-response.ts`; `mcp` rewritten to depend on it. Goes into `workspaces` **after
  `ontology-core`, before `mcp`** — the array is topological, and a wrong position fails
  `TS2307` on a clean tree. *This is the single highest-leverage item in the plan.*
- **`storage-provider`** — an `exports` map (`./interface`, `./jsonl`, `./neon`). It is the
  only package with none, which is why Miadi copied `CeremonialPhase` character-for-character.
- **`ontology-core`** — Zod schemas for `ProductionRelation` / `ProductionEntityKind`
  (this closes **#90**, the one film-production issue that is genuinely undone) and the
  infra/academic kinds.
- **`@medicine-wheel/community-choice`** — NEW. `openChoiceSet`, `recordResponse`,
  `closeChoiceSet`, `tallyChoices`; zero I/O, matching `community-review`'s discipline; with
  tests, which `community-review` has none of. **Not** an extension of `community-review`:
  that package's circle is bounded and authorizing, an audience poll is unbounded and
  authorizes nothing. Siblings, not one thing.
- **`storage-provider` + `app`** — `ChoiceSetRecord` / `ChoiceResponseRecord` and
  `app/api/choice-sets/*`. Copy `inquiry-weaves.ts` and `plan-perspectives.ts` exactly.
- **`mcp`** — `mw_choice_*` tools, **plus the three missing review-circle verbs**
  (`add_reviewer`, `voice`, `close`) that make the existing dead-end door usable. Move
  review-circle persistence to `metadata.kind`, keeping `is_review_circle` as a read alias.

Then `RELEASING.md`: publish → **global install** → run the installed binary → fix → bump →
publish again. A green publish proves nothing.

## Phase 4 — Consume, and read the past *(no publish)*

- **4.1** Replace the consensus and talking-circle half of `/src/Miadi/lib/ceremonial-spiral.ts`
  (423 hand-rolled lines) with `@medicine-wheel/community-review`, keeping Redis as the
  storage adapter. Privacy defaults move to `consent-lifecycle`. Both packages are pure,
  synchronous and schema-backed — **nothing has to change in them to be consumed.** This is
  the direct answer to your closing line, for the half of it that is wiring.
- **4.2** Port `LineageWeb`'s geometry (`LineageWeb.tsx:27-78`, ~50 lines) into
  `src/graph-viz/` as a second layout beside `applyWheelLayout`: x chronological, y direction
  band, relation arcs above the spine. **Depends on 2.2** — run on `created_at` today it
  would stack twelve May episodes on one September pixel and look right while being wrong.

**What William can see:** the past as a spine he can read left to right, and Miadi running
on the wheel's ceremony logic instead of its own copy.

## Phase 5 — Held for William's word *(then `0.8.0`)*

Two decisions that are not engineering's to make. Both block real work.

- **Q1 — What is a chooser?** Three candidates, from L1: (a) named respondents seeded from
  `PersonRole` — works for a circle, not a public event; (b) opaque per-response tokens
  minted per event — works for an event, carries nothing across events; (c) attributed-only,
  a human operator records each response — slow, honest, needs nothing deployed.
  **This decides whether "the community chooses" is real or decorative.**
- **Q2 — Which ceremony phase vocabulary is canonical?** Four incompatible ones are live,
  **two inside medicine-wheel itself**: `ontology-core`'s `opening|council|integration|closure`
  versus `storage-provider`'s Ojibwe five. `ceremony-protocol` cannot be made persistable
  until this is settled. A knowledge holder's call, not an engineer's.

Downstream of the answers: `ceremony-protocol` gains a persistable record;
`@medicine-wheel/structural-tension` extracts STC from the MCP-only tool (**#103**, the one
open issue whose premise survived checking).

---

## Two hazards found on the way

1. **`src/_` publishes `medicine-wheel@1.0.5` to npm** with `main: index.js` — and the
   folder contains only `package.json` and `README.md`. Outside `workspaces`, versioned
   above the suite, entry point does not exist. This is precisely the class of failure
   `RELEASING.md` documents for `mcp` and it was never fixed.
2. **Five open issues describe shipped work.** #86 and #87 are built and published at
   `0.6.4`; #107 claims zod is missing from root deps and it is there at `^3.23.0`; #116
   likewise. Reading the tracker to find the frontier will cost a cycle. Only **#90**, **#103**
   and **#83** (`app/narrative/cycles/page.tsx:98`, unguarded `cycle.beats.length`, 5 cycles
   live) survived checking.

## What would falsify this plan

- `curl localhost:8040/api/nodes | jq '.count'` — if the live provider returns 205 rather
  than 100, Phase 1.1 is already solved and the graph findings need re-reading. The port was
  not listening during this investigation, so **the entire UI analysis is reasoned from code
  and data, never from watching it fail.**
- A saved `localStorage` graph layout in William's browser would mean `applyWheelLayout`
  never ran for him and the crowding arithmetic describes a layout he has never seen.
- `\d reviews` against the Neon database — the review-service schema exists nowhere in
  source, so its shape is inferred from SQL string literals.
- If Q1 is answered "attributed-only", Phases 3's `community-choice` and 5 collapse into a
  much smaller piece of work.
