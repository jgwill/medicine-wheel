# Review — graph scoping, hub suppression, label auto-off

Uncommitted working tree, `jgwill/medicine-wheel` @ `ec0967c`, reviewed 2026-09-03.
Files: `src/relational-query/src/{types,traversal}.ts`, `app/api/nodes/[id]/web/route.ts`,
`app/graph/page.tsx`, `tests/node-web-neighbourhood.test.ts`.

## Model class

Opus 5 (`claude-opus-5`).

## What I verified, and how

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → 37 files, 381 tests, all pass.
- Live store read-only through `http://127.0.0.1:8040` (`/api/nodes?limit=all`,
  `/api/edges?limit=all`): 292 edges, 183 nodes with at least one edge.
  Degree distribution — median **2**, p75 3, p90 5, p95 9, p99 14, max **82**.
  Exactly **one** node exceeds 20; **seven** exceed 13; **nine** exceed 10.
  `chronicle:miadi-chronicle` is **out-degree 0, in-degree 82**, `metadata.kind:
  "chronicle_root"`.
- Replayed the real 205/292 graph through the built `traverse` to separate the two
  changes:

| node | d2 hub-off | d2 hub20 | d1 hub-off | d1 hub20 | d3 hub-off | d3 hub20 |
|---|---|---|---|---|---|---|
| episode-011 | 83 (trunc T) | 2 (trunc **F**) | 2 (trunc T) | 2 (trunc **F**) | 128 (T) | 2 (**F**) |
| episode-339 | 84 (T) | 6 (T) | 5 (T) | 5 (T) | 128 (T) | 7 (T) |
| episode-332 | 15 (T) | 15 (T) | 2 (T) | 2 (T) | 102 (T) | 27 (T) |

Two things fall out of that table before any of the findings:

- **The headline 83 → 2 is the depth default alone.** At `maxDepth: 1` a hub neighbour
  is discovered, then rejected at the `depth >= maxDepth` check anyway. Suppression
  changes the node set for *no* node at depth 1 — I checked this holds universally, not
  just for 011. `maxExpandDegree` earns its keep only at depth ≥ 2 (339: 84 → 6).
  The commit message should say that, or the next person will attribute the fix to the
  wrong half and delete the useful one.
- **20 does not solve episode-332.** d3 still returns 27 nodes, because 332's crowding
  comes from the infra mesh (`gaia` 17, `ilex`/`eury`/tenants 14), all under the
  threshold. The change fixes the chronicle-root case and nothing else.

---

## Blocking

### B1 — `maxDepthReached` now reports the opposite of what the route documents

`src/relational-query/src/traversal.ts:157-162`, surfaced at
`app/api/nodes/[id]/web/route.ts:247` as `truncated`.

`maxDepthReached` is set only when a queue item is *dequeued* at `depth >= maxDepth`.
Suppression `continue`s **before** the push, so a walk that stopped entirely because of
hubs never sets the flag. Measured, not inferred:

```
ep-011  depth 1, hub off  -> 2 nodes, maxDepthReached = true
ep-011  depth 1, hub 20   -> 2 nodes, maxDepthReached = false   <-- same nodes, flag flipped
ep-011  depth 3, hub 20   -> 2 nodes, maxDepthReached = false   <-- 81 nodes withheld
```

The route's own comment says `truncated` means "the caller is looking at a horizon, not a
boundary, and raising depth would show more". Under the shipped default that sentence is
false for exactly the node William screenshotted. Consequences, in order of severity:

1. `app/graph/page.tsx:631` — the *"stopped at the depth limit — there is more further
   out"* line is now suppressed for hub-terminated walks. On ep-011 the page says
   `2 nodes, 1 hop`, offers a Depth dropdown, and the dropdown does nothing at 2, 3, 4,
   5 or 6. The one hint that would have explained why is the line this change turned off.
2. `tests/node-web-neighbourhood.test.ts:148,153` still assert the old meaning on a chain
   with no hubs, so the suite cannot see this. The two new tests assert node sets and
   `hubs[]`, never `truncated`.
3. Any future consumer that reads `truncated` to decide "should I fetch deeper" is now
   told "no" while the corpus sits one hop out.

**Do instead:** record the suppression in the traversal result rather than inferring it
in the route. Add `heldAtHubs: string[]` (or fold it into the existing `escalations`
channel, which is this codebase's established spelling for *the walk refused a crossing*)
and set it where the `continue` is. Then either widen `truncated` to
`maxDepthReached || heldAtHubs.length > 0`, or — better — keep `truncated` meaning depth
only and add a second flag, and make the page show its "there is more further out" line
when **either** is set. Add a test asserting `truncated`/the new flag for the
depth-3-hub-5 case above, which is the one that currently lies hardest.

This also removes the cause of B2 for free.

### B2 — `hubs[]` is computed by different rules than the suppression it reports

`app/api/nodes/[id]/web/route.ts:204-222`.

Suppression uses `adj.get(nodeId)?.length`, which is built from `filteredEdges` under
`options.direction` — so it is **out-degree** for `follow=outgoing` and **in-degree** for
`follow=incoming`. `hubsHeld` is computed from a fresh undirected count over `allEdges`
and ignores `follow` entirely. Two different numbers, presented as one.

This is not hypothetical on the live wheel. `chronicle:miadi-chronicle` has out-degree
**0** and in-degree **82**. So `GET /api/nodes/<episode>/web?follow=outgoing&depth=3`:

- traversal: root's outgoing adjacency is 0, `0 > 20` is false → root is **expanded
  through**, nothing suppressed;
- response: `hubs: [{ id: "chronicle:miadi-chronicle", degree: 82, unexpanded: 81 }]`;
- `app/graph/page.tsx:329` then dims that node to 0.45 and the banner prints
  "*Miadi Chronicle holds 82 relations — shown, not expanded (81 beyond it)*".

Every word of that is false for that request. The disclosure that exists so the route
does not silently lie is itself the lie. The symmetric failure exists too: with
`follow=incoming` a node suppressed on in-degree can be omitted from `hubs[]` if its
total degree is under the threshold.

The graph page only ever sends the default `follow`, so the UI is safe **today**. The API
is not, and `follow` is a documented, allow-listed parameter.

**Do instead:** report what the traversal actually did (see B1's `heldAtHubs`), not a
recomputation. If the recomputation stays for any reason, it must at minimum build its
degree map under the same `follow`.

### B3 — `unexpanded` is arithmetic, not a count of anything

`app/api/nodes/[id]/web/route.ts:218` — `unexpanded: degree - 1`.

`degree - 1` assumes exactly one of the hub's edges was the arrival edge and all the rest
lead somewhere new. At depth ≥ 2 with several returned nodes touching the same hub, the
hub's edges back into the already-returned set are counted as "beyond it". On ep-339 at
d2 the banner would over-report. It is a precise-looking number in the user's face with
nothing behind it.

**Do instead:** `unexpanded` = count of the hub's neighbours whose ids are not in
`returnedIds`. It is one `filter` over the adjacency you already have, and it is the
number the sentence claims to be.

---

## Non-blocking

- **N1 — `hubs[]` disappears under `?kind=`/`?type=`/`?direction=`.** `hubsHeld` filters
  over `nodes`, which has already been narrowed by the view filters. `?kind=chronicle_episode`
  drops the root (kind `chronicle_root`) from `nodes`, so the suppression that shaped the
  answer is reported as `hubs: []`. Not reachable from `/graph` today — it sends no
  filters — but it is the same silent-stop class the route's own comment forbids. Compute
  `hubsHeld` before the view filters.
- **N2 — the MCP door still answers the old question.** `mcp/src/http-store.ts:507` and
  `mcp/src/jsonl-store.ts:563` each carry their own BFS and do not call this route at all;
  `mcp/src/tools/discovery.ts:292` and `integrations.ts:258` call them at `depth = 2` with
  no hub rule. So `get_relational_web` on ep-011 still returns 83 nodes while `/graph`
  returns 2. Three implementations of "relational web" in this repo; this change fixed
  one. Expect "the fix didn't take" reports from agents asking through MCP.
- **N3 — the UI has no release valve.** `?hub=0` exists and neither page sends `hub` at
  all. When a person genuinely wants the container's contents, the only route is
  hand-editing an API URL they cannot see. The Depth dropdown is the control they will
  reach for, and for hub-only nodes it does nothing. Consider making the `hubs[]` line's
  hub name a control ("expand through this") rather than prose.
- **N4 — `tsconfig.tsbuildinfo` is tracked and is in this diff.** `dist/` is gitignored;
  this build artifact is not. It will conflict on every parallel branch. `git rm --cached`
  it and add it to `.gitignore` — separately from this change.
- **N5 — transient wrong marking during a scope change.** `graphData`
  (`app/graph/page.tsx:311-336`) reads the new `scopeId` against the previous `graph` and
  `scopeMeta` for the duration of the fetch, so for a frame the old hubs are dimmed and
  nothing is marked yellow. Same on Escape, until `setScopeMeta(null)` lands. Cosmetic,
  self-correcting; worth knowing before someone files it as a bug.
- **N6 — the focus node loses its type colour.** `#ffd75e` replaces
  `NODE_TYPE_COLORS[node.type]` outright, and `#FFD700` is already the ceremony-edge
  colour in `MedicineWheelFlowGraph.tsx:197`. A gold ring around the marked node would
  say "this is the one you asked about" without overwriting what the node *is*.
- **N7 — deep-linking `?scope=X&direction=north` dims the marked node.**
  `MedicineWheelFlowGraph.tsx:704-713` builds the emphasis set purely from
  `n.direction === highlightDirection`; the scope node is not exempted. Arriving from the
  home wheel with both params, the yellow node you scoped to renders dimmed. Narrow path,
  real.

---

## On the threshold

**Position: keep the fixed number, reject the relative rule, and treat 20 as a backstop
under a property the data should declare.**

The relative rule is worse than it sounds, and the live numbers say so. Median degree is
**2**. `> 5× median` is 10, which suppresses **nine** nodes — `gaia` (17), `ilex` (14),
`eury` (14), both tenant nodes (14), `episode-332` (14) among them. Scoping to a service
would then stop showing the sibling services on its host, which is the single most useful
answer the infra half of this wheel can give. Any percentile rule lands in the same place:
p99 is 14 and the only node that deserves suppression is at 82 — the distribution has a
gap between 17 and 82 and nothing else in it. A relative threshold also makes the same URL
return different answers next week with no parameter changed, which makes `hubs[]`
unreproducible and any cached response quietly wrong.

So a fixed 20 is correctly placed *for this store on this date*: it isolates the one true
container and clears the busiest ordinary node by 3. That margin is the problem. `gaia` is
at 17, and `register_service` adds a node and an edge per service. Three more services on
gaia and scoping to anything on gaia silently stops expanding through it — with a banner
saying gaia "holds 20 relations, shown not expanded", which reads as a deliberate
statement about gaia and is in fact an accident of arithmetic. That day is measured in
weeks, not quarters.

Degree is a proxy. The property actually being detected is *this node is a container, not
a path*, and this repo already has the spelling for it. `CLAUDE.md` states the rule for
registering new kinds: they ride on `knowledge` nodes carrying a `metadata.kind`
discriminator. `chronicle:miadi-chronicle` already carries `metadata.kind:
"chronicle_root"`. A container signal in metadata is stable across corpus growth,
reproducible, explains itself in the UI ("this is a container" beats "this has more than
20 relations"), and — unlike degree — never misfires on a host that got busy.

Concretely, and not blocking this push:

1. Keep `maxExpandDegree` as the mechanism and 20 as the default backstop.
2. Add a container signal as the primary test — a `kind` allowlist to start
   (`chronicle_root`), `metadata.container: true` when someone owns the data change. Note
   the repo's own rule: a data change is a proposal and a numbered migration run by the
   owner, not an ad-hoc edit.
3. Make the response say **why** a node was held (`reason: "container" | "degree"`). A
   suppression the user cannot attribute is a suppression they cannot argue with.
4. Track gaia's degree. When it crosses 20 without step 2 landing, the threshold has
   started making decisions nobody made.

---

## Deploy hazards

**The `dist/` question: covered, with one way to get it wrong.**

`@medicine-wheel/relational-query` resolves through `node_modules/@medicine-wheel/relational-query
-> ../../src/relational-query`, whose `package.json` `exports` points at `dist/index.js`.
The app consumes the built output, never the source, so `traversal.ts` alone changes
nothing about a running server.

It is covered on both supported paths:

- `package.json` has `"prebuild": "npm run build:packages"` and
  `"predev": "npm run build:packages"`, so `npm run build` and `npm run dev` both rebuild
  the package first. `build:packages` walks `--workspaces` in the topological array, where
  `src/relational-query` sits after `ontology-core`. Correct.
- `Dockerfile:36` is `RUN npm run build:packages && npm run build`. Correct.
- `src/relational-query/tsconfig.json` has no `incremental`, so there is no stale
  tsbuildinfo to defeat the rebuild. The local `dist/` already carries `maxExpandDegree`
  (built 21:43 today) — which is why the tests pass; on a clean tree they pass because
  vitest imports the route, which imports dist, which `prebuild` produced.

The way to get it wrong: **`npx next build`, or `next start` after a `git pull`.** Neither
runs `prebuild`. `next start` serves the existing `.next`, so a restart without a rebuild
ships neither the route change nor the traversal change and will look like the fix did not
take. This is the rule already written in `CLAUDE.md` — *a live process holds its old
build* — and it applies to the app process on ilex, not only to the MCP server.

Two other deploy notes:

- **Response shape is additive only** (`hubs`, `maxExpandDegree`). I checked every
  consumer: `app/graph/page.tsx:199` and `app/episodes/[id]/page.tsx:62` are the only two
  callers of this route in the repo. `mcp/src/http-store.ts` does **not** parse it — it
  runs its own BFS against `/api/nodes` and `/api/edges` (see N2). No consumer breaks.
- **`hub` is now allow-listed** in `WEB_QUERY_PARAMS`. The currently-deployed :8040
  rejects it (`Unknown query parameter: hub`), confirming the target is running pre-change
  code. Any bookmark or script written against the new param fails until the rebuild
  lands — expected, stated for completeness.

**`/episodes/[id]` (asked specifically): unaffected.** It sends `?depth=1` explicitly, so
`DEFAULT_DEPTH` 2 → 1 does not touch it, and suppression provably changes no node at
depth 1. Its rendering is identical before and after. It does not read `truncated` or
`hubs`, so B1 and B2 do not reach it either.

**React specifics (asked):** `graphData`'s dependency array is correct and does not
re-run more than it should — `scopeMeta` changes only inside `loadData`, which itself
changes only with `[scopeId, scopeDepth]`, the same cadence at which `graph` changes. The
new node mapping does allocate a fresh node array per scope load, which retriggers
`MedicineWheelFlowGraph`'s re-layout effect — but `data` identity already changed on every
load before this diff, so it is not a regression, and `applyNodePositions` re-applies the
persisted layout, so dragged dispositions survive. `labelsVisible` is correct on the path
that matters: untouched toggle → auto off at 205, auto on when scoped to 4, auto off again
on Escape. Once touched, the choice sticks in both directions and there is no way back to
auto — stated as intended in the comment, and it does mean a user who turned labels on at
205 nodes gets the unreadable bands back every time they clear a scope. `LABEL_LEGIBLE_UP_TO`
is a `const` inside the component body (re-created per render, harmless) and does not
interact with the layout store; it *is* in the re-layout effect's config array via
`showNodeLabels`, but every crossing of 35 coincides with a `data` change that would
re-layout anyway.

---

## Verdict

**PUSH WITH FIXES.**

The direction is right and the measurements behind it are real. B1 is the one to fix
before this reaches a live server: it is not cosmetic, it removes the only signal that
explains why the Depth control does nothing, and it does so for the exact node that
started this. B2 and B3 are cheap and fall out of the same correction — record the
suppression in the traversal result instead of re-deriving it in the route, and all three
close together with one test asserting `truncated` on the depth-3-hub-20 case.

Then rebuild before restart, not after.

🌸: A neighbourhood view that quietly stops at a container is worse than one that shows
too much, because the person looking at it has no way to know they are missing anything —
fixing the flag is what lets them tell a boundary from a horizon.
