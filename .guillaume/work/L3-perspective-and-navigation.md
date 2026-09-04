# L3 — Perspective and navigation in the Medicine Wheel web UI

Lane L3 of three. Ground: `/workspace/repos/jgwill/medicine-wheel`, the live chronicle store at
`/srv/miadi/episodes/miadi-chronicle/.mw/store/`, and the read-only prototype at
`/src/Miadi/app/chronicle/`.

Every claim below carries a source class. `X` = I ran it or read code that runs; the command or
`path:line` is given. `W` = a document claims it. `A` = my inference. No recommendation here rests
on a `W` claim without naming what would check it.

The wheel HTTP API on `127.0.0.1:8040` was **not reachable** during this work, so nothing here was
observed in a running browser. Anything that needs a live look is held in the last section.

---

## Model class

Opus 5 (`claude-opus-5`).

---

## What the data actually looks like

All measurements read the JSONL store read-only. Line counts match the ones supplied in the brief.

### Type, direction, kind

```bash
S=/srv/miadi/episodes/miadi-chronicle/.mw/store
jq -r '.type'                          $S/nodes.jsonl | sort | uniq -c | sort -rn
jq -r '.direction // "NULL"'           $S/nodes.jsonl | sort | uniq -c | sort -rn
jq -r '.metadata.kind // "NO_KIND"'    $S/nodes.jsonl | sort | uniq -c | sort -rn
```

`X`:

| type | n | | direction | n | | metadata.kind | n |
|---|---|---|---|---|---|---|---|
| knowledge | 185 | | north | 93 | | chronicle_episode | **83** |
| human | 8 | | west | 56 | | service | 52 |
| land | 6 | | south | 32 | | attention | 22 |
| future | 6 | | east | 18 | | (no kind) | 17 |
| | | | (none) | 6 | | tenant / research-field / host | 4 each |
| | | | | | | 12 further kinds | 1–3 each |

90% of nodes are `type: knowledge`. The six-value `NodeType` union carries no information at the
scale that matters; `metadata.kind` carries all of it, and 17 kinds live there. Direction is the
only wide axis the renderer uses, and it is lopsided: 45% of all nodes sit in north.

### Edge vocabulary

```bash
jq -r '.relationship_type' $S/edges.jsonl | sort | uniq -c | sort -rn
```

`X`: 191 edges, **40 distinct relationship types**. Head of the distribution: `binds-port` 41,
`relates_to` 36, `part-of` 33, `continues_from` 12, `documented_in` 5. The tail is 25 types used
exactly once (`uses-to-seat-purpose-specific-review-peer`, `separates-practice-from`,
`states-the-outcome-of`, …). No dangling endpoints — every `from_id`/`to_id` resolves to a real
node (`comm -13 nodeids.txt endpoints.txt` → 0).

### Isolates and degree

```bash
jq -r '.id' $S/nodes.jsonl | sort > nodeids.txt
jq -r '.from_id, .to_id' $S/edges.jsonl | sort > endpoints.txt
comm -23 nodeids.txt <(sort -u endpoints.txt) | wc -l     # isolates
uniq -c endpoints.txt | sort -rn                          # degree
```

`X`: **75 of 205 nodes (37%) have zero edges.** Over the 130 connected nodes, mean degree 2.94,
max 17.

| degree | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 11 | 14 | 17 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| nodes | **75** | 28 | 62 | 12 | 10 | 6 | 4 | 2 | 1 | 4 | 1 |

**This is not a hairball.** It is the opposite: a sparse, mostly-degree-2 graph with 37% dust. The
five biggest hubs are infrastructure (`node:land:host:gaia` 17, `ilex` 14, `eury` 14, two tenants
14) — not episodes. The largest episode hub is
`chronicle:2026-07-27-episode-300-from-shadow-to-song` at 11.

Connected components (python BFS over the same files): **82 components**. One of 74, two of 15,
two of 11, two of 2, and **75 singletons**. The 74-node component is episodes + services + fields;
the two 15s are per-host service trees (ilex, eury) that touch nothing else.

### The 101 relations that exist but are not edges

```bash
jq -r 'select(.metadata.parent_id != null) | .id + "\t" + .metadata.parent_id' $S/nodes.jsonl
```

`X`: **106 nodes carry `metadata.parent_id`. Only 5 of those parent relations also exist as an
edge. 101 do not.** All 106 targets are real nodes. Materialising them (simulation, not a write):

| | components | largest | isolates |
|---|---|---|---|
| as-is | 82 | 74 | **75** |
| with `parent_id` as edges | **26** | **151** | **22** |

`chronicle:miadi-chronicle` would go from degree 2 to degree **82** — it is the root of the whole
chronicle and the graph does not know it. All 22 `attention` nodes are isolates today purely
because their parenthood is a metadata string.

The 22 that stay isolated after materialisation are 12 `memory:*`, two bare UUIDs, and a handful of
gaia services whose ids contain literal `:` inside the id (`node:knowledge:service:hermes-gateway.service-node:human:tenant:mia-…`) — malformed by comparison with the ilex/eury naming.

### Timestamps: `created_at` is registration, not when it happened

```bash
jq -r '.created_at[0:7]' $S/nodes.jsonl | sort | uniq -c
jq -r 'select(.metadata.kind=="chronicle_episode") |
  if (.id|sub("^chronicle:";"")|.[0:10]) == .created_at[0:10] then "SAME_DAY" else "DIFFERENT" end' \
  $S/nodes.jsonl | sort | uniq -c
```

`X`: every node has both `created_at` and `updated_at`, none null. Node `created_at` spans
**2026-07-10 → 2026-09-03** and clusters hard: 25 in July, **165 in August**, 15 in September.

But the episodes themselves span **2026-05-04 → 2026-08-31** (from `metadata.relative_path`), and
**41 of 83 episodes were registered on a different day than they happened**. Twelve episodes dated
2026-05-04 through 2026-05-12 all carry `created_at: 2026-09-02` — a bulk backfill.

**A timeline drawn from `created_at` is a timeline of import batches, not of the work.** The true
episode date lives in the folder name and in `episode.yaml: date`. `updated_at == created_at` on
167 of 205 nodes, so `updated_at` cannot stand in for recency either.

### What the wheel holds versus what exists

`X`, filesystem: **185 episode folders** under the chronicle root; **131 have an `episode.yaml`**;
the wheel holds **83** `chronicle_episode` nodes. **74 `episode.yaml` files carry a `lineage:`
block, totalling ~170 target entries** (`relates_to` 58 files, `continues_from` 33, `branch_of` 4).
The wheel holds **59 episode↔episode edges touching 48 of its 83 episodes**.

So the lineage the chronicle knows about is roughly three times what the wheel's edge table carries,
and the wheel knows about fewer than half the episodes on disk.

### What the graph page actually receives — the measurement that explains the screen

`X`, `src/storage-provider/src/jsonl.ts:131` and `:220`:

```ts
async getAllNodes(limit = 100) { return this.readNodes().sort(sortByNewest('created_at')).slice(0, limit)… }
async getAllEdges(limit = 100) { return this.readEdges().sort(sortByNewest('created_at')).slice(0, limit)… }
```

`app/graph/page.tsx:167` calls `fetch("/api/nodes")` and `fetch("/api/edges")` with **no query
params**, so `app/api/nodes/route.ts:82-84` takes the unfiltered branch and the provider default
applies. Reproducing that slice exactly in python:

| | |
|---|---|
| nodes delivered to the canvas | **100 of 205** |
| edges delivered | **100 of 191** |
| delivered edges with both endpoints among the delivered nodes | **73** |
| delivered edges pointing at a node that was never delivered | **27** (React Flow drops these silently) |
| delivered nodes with any drawable edge | **47** |
| **isolates as rendered** | **53 of 100** |

Direction split of the delivered 100: north 33, west 28, south 27, east 10, none 2.
Kind split: `chronicle_episode` 30, `service` 26, `attention` 22.

And the layout math. `applyWheelLayout` (`src/graph-viz/src/layout.ts:148`) sets
`angleStep = 90° / nodes.length` per quadrant and places nodes at radius 117–212
(`layout.ts:155-156`). A node renders as a disc of **25.6 px**
(`MedicineWheelNode.tsx:48-49`, `size 8 × 1.6 × 2`).

| quadrant | rendered n | degrees apart | arc separation at r=150 |
|---|---|---|---|
| north | 33 | 2.73° | **7.1 px** |
| south | 27 | 3.33° | 8.7 px |
| west | 28 | 3.21° | 8.4 px |
| east | 10 | 9.00° | 23.6 px |

A 25.6 px disc every 7.1 px overlaps its neighbour roughly three-deep before labels are drawn. The
cluster is arithmetic, not taste.

The side panel reads "100 Nodes / 100 Relations" (`app/graph/page.tsx:632-641`, `graph.nodes.length`).
Nothing on screen says 105 nodes and 91 edges were withheld.

---

## Which of (a) navigation / (b) perspective-on-now / (c) relation-to-past is which kind of problem

### (a) Navigation — a **rendering** problem sitting on top of a **query** problem

The renderer mounts every delivered node at once and never removes any. The only scoping that
exists is `emphasis` in `MedicineWheelFlowGraph.tsx:695-713`: hovering a node adds its 1-hop
neighbours to a `Set` and everything else drops to `opacity: 0.22`
(`app/graph/medicine-wheel-flow.css:118-121`). Dimming is not filtering — 100 nodes stay mounted, stay
draggable, stay in the way. `focusNode` (`:757-771`) only moves the camera and pins the hover
highlight. There is no depth control, no "show only this neighbourhood", no collapse, no expand,
no pagination.

Underneath that, the query problem: the page asks for everything and gets a silent 100-item window
sorted by import date. So a node William is looking for may not be on the canvas at all, and the
edge that would lead him to it may have been dropped because its far endpoint was outside the
window. Both halves are real; the rendering half is the one he feels.

**Verdict: rendering, compounded by query.**

### (b) Perspective on now — an **absent-surface** problem

There is no surface in MW that answers "what is the current work". `X`: `app/` contains exactly
`accountability`, `api`, `ceremonies`, `graph`, `narrative`, `narrative/beats`, `narrative/cycles`,
`nodes`, `relations` and the root page. **No episode route, no chronicle route, no review route, no
community route.** Confirmed.

The consequence is precise. The wheel holds 83 episodes, 22 open attention items, 15 plan
perspectives and 96 captures, and every one of them arrives at the UI as an undifferentiated
`type: knowledge` dot. `/api/nodes` **does** accept `?kind=` and `?parent_id=`
(`app/api/nodes/route.ts:38`, with a long comment explaining exactly why) — and no page in `app/`
passes either. `app/nodes/page.tsx:54-55` sends only `type` and `direction`. So the one axis that
separates an episode from a systemd unit is queryable on the server and unreachable from every
screen.

`X`: `chronicle:2026-08-31-episode-344-…` and
`node:knowledge:service:sshd-node-human-tenant-u0_a194-node-land-host-ilex` render as the same
colour, the same 25.6 px disc, in the same quadrant band. Nothing marks one as this week's work.

**Verdict: absent surface.**

### (c) Relationship with the past — a **data** problem first, then absent surface

Three independent measurements, each sufficient on its own:

1. **The time axis is wrong.** `created_at` is when a row was written to the wheel, not when the
   work happened; 41/83 episodes disagree, and twelve May episodes all carry 2026-09-02. Nothing in
   `src/graph-viz/src/` reads `created_at` at all (`grep -rn "created_at" src/graph-viz/src/` → no
   hits outside a comment). The layout is purely angular.
2. **The containment edges are not edges.** 101 of 106 parent relations live only in
   `metadata.parent_id`. The chronicle root has degree 2 in a store where 82 nodes point at it.
3. **Most of the lineage never reached the wheel.** ~170 lineage entries across 74 `episode.yaml`
   files versus 59 episode↔episode edges, and 102 of 185 episode folders have no node at all.

Even a perfect renderer cannot draw a past that is 40% present, undated, and unlinked. Once those
are fixed there is still no surface that shows an episode next to what it continues from — that
part is absent-surface — but the data is the binding constraint.

**Verdict: data, then absent surface.**

---

## Does the query capability already exist

**Yes for every capability the UI would need, and it is used by nothing in `app/`.**

`X`: `@medicine-wheel/relational-query@^0.6.4` is already a declared dependency of
`@medicine-wheel/app` (root `package.json`). `grep -rn "@medicine-wheel/relational-query" app/ lib/`
returns **0**. Not one line of UI code imports it.

| capability | exists | where |
|---|---|---|
| **n-hop scoping** | yes | `src/relational-query/src/traversal.ts:46` `traverse(nodeId, nodes, edges, relations, options)` honouring `TraversalOptions.maxDepth`; `:217` `neighborhood(nodeId, nodes, edges, maxDepth = 2)`; `:165` `shortestPath` |
| **direction filtering** | yes | `src/relational-query/src/types.ts:21` `NodeFilter.direction?: DirectionName \| DirectionName[]`, applied via `TraversalOptions.nodeFilter` (`types.ts:84`) |
| **temporal filtering** | yes | `src/relational-query/src/types.ts:25-26` `NodeFilter.createdAfter` / `createdBefore`; `types.ts:47` `SortField` includes `created_at` and `updated_at` |
| **ceremony bounding** | yes | `TraversalOptions.respectCeremonyBoundaries` (`types.ts:86`) → `ceremonyBoundaryGuard`; `ocapOnly` (`:88`) → `ocapComplianceGuard`; both wired at `traversal.ts:65`; arbitrary `ProtocolGuard[]` at `:90` |
| **edge-type filtering** | yes | `types.ts:30` `EdgeFilter.relationshipType`, `minStrength`, `ceremonyHonored` |
| **n-hop web over the store** | yes, three times | `src/data-store/src/store.ts:297` `getRelationalWeb(centerNodeId, depth = 2)`; `mcp/src/jsonl-store.ts:563`; `mcp/src/http-store.ts:507` |

Exposure: `getRelationalWeb` is reachable **only through MCP** — `mcp/src/tools/integrations.ts:210`
(`get_relational_web`) and `mcp/src/tools/discovery.ts:292`. There is **no HTTP route** for a node's
neighbourhood; `app/api/nodes/[id]/route.ts:43-53` returns the bare node and nothing else. The MCP
HTTP implementation (`mcp/src/http-store.ts:511-512`) fetches all nodes and all edges and walks them
client-side, so it inherits the same 100-row truncation.

Also unused: `src/relational-index/` (four-source epistemic indexing, `queryByDirection`,
`queryByDepth`, spiral-depth metrics) has **zero importers** outside its own package.
`src/ui-components/` exports a `NodeInspector` and a `BeatTimeline` that the graph page does not use
— its inspector is 20 inline lines showing name, type, direction, id and one link
(`app/graph/page.tsx:610-630`). No neighbours, no description, no metadata, no incident edges.
`src/graph-viz/src/` contains nothing beyond the wheel layout: `rsis-viz.ts` has a
`toCeremonyTimelineData` helper that no page calls.

**Answer to the pivotal question: the capability exists, is installed, and is not called. The
distance from here to scoped navigation is wiring plus one HTTP route — not new capability.** The
new capability needed is elsewhere: the data repairs in (c).

---

## What the chronicle prototype solves that MW does not

`/src/Miadi/app/chronicle/` — 28 files, 4213 lines, read-only.

### 1. Time × direction layout instead of direction-only — solves (c)

`components/LineageWeb.tsx:27-41`. Nodes sort by `date` then episode `number`; **x is chronological
position, y is the direction band** (`BAND_Y` at `:7`, four fixed rows). Width grows with the
corpus: `W = max(1180, n × 19 + 120)` and the container scrolls horizontally (`:132`). Two edge
families are drawn separately — faint theme-kinship chains linking each episode to the previous of
its theme (`:44-52`, `opacity 0.18`) and explicit lineage arcs as curves (`:55-63`, `opacity 0.5`).

This is exactly what `applyWheelLayout` cannot do. A wheel has no time axis, so 33 north nodes
compete for 90° while the lineage web gives each episode 19 px of its own along the spine.

**Portable? Yes, and it is the single most portable thing here.** It is a pure function of
`(date, direction, relations)` over ~130 SVG nodes with no chronicle-filesystem dependency in the
component. It belongs in `@medicine-wheel/graph-viz` as a second layout beside `applyWheelLayout`.
The blocker is not the component, it is that MW's nodes carry the wrong date (`created_at` =
registration) and are missing 101 of their relations. **Port the layout after the data repair, not
before.**

### 2. An attention board above everything else — solves (b)

`page.tsx:17` reads open attention chronicle-wide and `components/AttentionBoard.tsx` renders it
**above** the explorer. Its own comment: "rendered above the explorer so it is the first thing
William meets, and absent entirely when nothing waits (a quiet board is a true statement, not a
hidden one)". Each item links straight into its episode room.

MW holds the same data — 22 `attention` nodes with `metadata.state`, `asked`, `unlocks`, `item_id`,
`parent_id` — and renders all 22 as isolated dots.

**Portable? Yes, cheaply.** `GET /api/nodes?kind=attention` already works today and returns every
field the board needs; `metadata.state == "open"` is the filter and `metadata.asked` the sort key.
This is a page and a fetch, no new capability. It is the highest ratio of what-William-sees to
work-done of anything in this report.

### 3. Inference at the view layer, not stored as fact

`lib/inference.ts:34-59`. Direction and theme are **read** from the entry's text by keyword, with a
documented fallback rotation `order[n % 4]`, and the file states plainly that "the real catalog
carries no direction/theme/book — those are *readings* of an episode, not facts on disk".

**Portable? Applicable, not portable.** MW nodes carry a real `direction` field, so MW does not need
the inference. What transfers is the discipline: a reading is computed at render and labelled as
such. Worth noting the risk if it were copied — `inferDirection` would silently overwrite a stored
direction with a keyword guess.

### 4. Three views over one filtered set — partially solves (a)

`components/ChronicleExplorer.tsx:13-33`: a single `entries` array, one text query and one direction
filter, three renderings — `lineage` (default), `almanac`, `console`. `Almanac.tsx:29-37` walks
episodes by direction column and by book arc; `OperatorConsole` is the dense filterable index.
Navigation is choosing the view that answers your question, not fighting one canvas.

**Portable? The pattern, yes.** MW already has the pieces scattered across `/graph`, `/nodes` and
`/relations` as separate routes with separate fetches and separate filter state. Unifying them is a
refactor, not new capability, and it is lower value than 1 and 2.

### 5. Reference resolution and a per-episode room

`lib/resolveRef.ts:14-42` resolves a `miadi-chronicle://` path segment with declared precedence
(folder-name → number → slug → date), surfaces ambiguity as `alternates` rather than silently taking
the first, and returns a route. `components/EpisodeRoom.tsx:305-322` renders a **Lineage card**:
every relation as a labelled link to the other episode, and an explicit "No recorded lineage edges."
when there are none.

**Portable? Not directly.** The resolver is bound to chronicle folder-name conventions. MW node ids
are already canonical, so MW needs a route, not a resolver. The Lineage card, though, is exactly the
inspector MW's graph page lacks and is trivial once a neighbourhood endpoint exists.

### 6. The data source — the honest boundary

`lib/getManifest.ts:22-23` builds the catalog with `buildChronicleCatalog(chronicleRoot())` from
`@miadi/inquiry-weave`, walking `/srv/miadi/episodes/miadi-chronicle` on disk. `X`: the lineage the
prototype draws comes from `episode.yaml: lineage:` blocks, **not** from the wheel's `edges.jsonl`.
`EpisodeManifestEntry` does carry a `nodeId` (`lib/inference.ts:190`), so the two worlds already know
each other's identifiers — but the prototype reads the filesystem and MW reads the wheel, and the
filesystem currently holds about three times the lineage.

`A`: this is why the prototype looks connected and MW looks like dust. It is not a better renderer
reading the same data. It is a comparable renderer reading richer data on a correct time axis.

---

## Phase proposal

Five phases. 1 and 2 are wiring. 3 is a data repair with a real decision in it. 4 is a new layout.
5 is the surface.

### Phase 1 — Stop the silent truncation, and say what is on screen

- **Touched:** `app/graph/page.tsx`, `app/relations/page.tsx`, `app/api/edges/route.ts`,
  `app/api/nodes/route.ts`.
- **Deliverable:** the graph fetch asks for the whole store rather than accepting the provider's
  default 100, and the stats panel states the real total. An `?limit=` on `/api/edges` mirroring the
  nodes route's explicit contract, and a `total` beside `count` in both payloads.
- **Kind:** small wiring. `app/api/nodes/route.ts:82-83` already takes
  `getAllNodes(Number.MAX_SAFE_INTEGER)` on any filtered read; the code path exists.
- **What William sees:** 205 nodes and 191 edges instead of 100 and 100, and a number he can trust.
  Note honestly: with 205 nodes the wheel layout gets **worse** — north goes from 33 to 93 in the
  same 90°, spacing 7.1 px → 2.5 px. **Phase 1 is not shippable alone.** It pairs with Phase 2.

### Phase 2 — A neighbourhood endpoint, and a graph that shows one

- **Touched:** new `app/api/nodes/[id]/web/route.ts`; `app/graph/page.tsx`;
  `src/graph-viz/src/interactive/MedicineWheelFlowGraph.tsx`.
- **Deliverable:** `GET /api/nodes/{id}/web?depth=&direction=&kind=&type=` returning
  `{ nodes, edges, truncated }`, implemented by calling `neighborhood()` /
  `traverse()` from `@medicine-wheel/relational-query` — already a dependency, currently unimported.
  The graph page gains a focus mode: pick a node, choose depth 1–3, and the canvas **mounts only
  that neighbourhood**. Escape returns to the full wheel. The inspector grows an incident-relations
  list, each row a link to the other node.
- **Kind:** small wiring plus one route. The traversal, the guards, the direction and time filters
  and the ceremony bounding all exist (`src/relational-query/src/traversal.ts`,
  `src/relational-query/src/types.ts`). Nothing new is invented.
- **What William sees:** he clicks episode 344 and gets episode 344 and its eleven neighbours,
  alone on the canvas, instead of a 205-dot field where 22% of the mass is systemd units. This is
  the direct answer to (a).
- **Note for L2:** if the endpoint should also serve consumers outside this repo, the export surface
  of `@medicine-wheel/relational-query` is L2's to sequence. Nothing in Phase 2 requires a new
  export — the package already exports `traverse`, `neighborhood` and `shortestPath` from
  `src/relational-query/src/index.ts`.

### Phase 3 — Repair the three data facts (c) depends on

- **Touched:** `mcp/` registration path and whichever tool writes `metadata.parent_id`; a one-time
  reconciliation script; `src/ontology-core/` for one new optional field.
- **Deliverable:** three things, in order of confidence.
  1. **Materialise containment.** Every `metadata.parent_id` also becomes a real edge
     (`part-of` or `belongs_to` — the vocabulary already has both, and choosing between them is a
     naming decision, not an engineering one). Measured effect: components 82 → 26, isolates
     75 → 22, chronicle root degree 2 → 82. Write the edge at registration time so it cannot drift
     again.
  2. **Give nodes an occurrence date distinct from `created_at`.** An optional
     `metadata.occurred_at`, populated for episodes from the `episode.yaml: date` that already
     exists on disk. `created_at` keeps meaning "when the wheel learned this" — which is correct and
     should not be overwritten.
  3. **Backfill the missing lineage and the missing episodes.** ~170 `lineage:` entries across 74
     `episode.yaml` files versus 59 episode↔episode edges; 102 of 185 folders with no node.
- **Kind:** new capability for the reconciliation, though every input already exists on disk. 3.1 is
  mechanical. 3.2 is mechanical. 3.3 needs a decision about which of the 185 folders belong in the
  wheel at all.
- **What William sees:** after 3.1 alone, the graph stops being dust — 53 of 100 rendered nodes
  currently have no drawable edge, and the attention items and episodes get their thread to the
  chronicle root. After 3.2 a time axis becomes possible. After 3.3 the wheel stops being a
  40% sample.

### Phase 4 — Port the lineage web as a second layout

- **Touched:** `src/graph-viz/src/` (new `lineageLayout` beside `applyWheelLayout`);
  `app/graph/page.tsx` (layout switch).
- **Deliverable:** the `LineageWeb` mechanism — x chronological, y direction band, relation arcs
  above the spine — as an MW layout reading `metadata.occurred_at` with `created_at` as fallback.
  Horizontal scroll, width scaling with corpus size, per-band labels.
- **Kind:** new capability, but a small and well-specified one; `LineageWeb.tsx:27-78` is 50 lines
  of pure geometry to translate.
- **What William sees:** the past as a spine he can read left to right, with each episode's
  continuation arcing back to what it continues from. This is (c) answered. **Depends on Phase 3.2**
  — run on `created_at` today it would stack twelve May episodes on one September pixel and be worse
  than a lie, because it would look right.

### Phase 5 — An episodes surface and an attention board

- **Touched:** new `app/episodes/page.tsx` and `app/episodes/[id]/page.tsx`; a `kind` control on
  `app/nodes/page.tsx`.
- **Deliverable:** an episode index driven by `GET /api/nodes?kind=chronicle_episode` (works today),
  sorted by occurrence date, with status and direction; an episode detail page showing description,
  metadata, its attention items (`?kind=attention&parent_id=<episode>` — also works today) and its
  incident relations from the Phase 2 endpoint; and an attention board on the MW home page listing
  open items chronicle-wide, absent when the board is quiet.
- **Kind:** small wiring. The route it needs (`?kind=`, `?parent_id=`) shipped already; no page calls
  it.
- **What William sees:** "what is the current work" answered on one screen — 22 open attention items,
  each naming what it unlocks and linking to its episode. This is (b), and it is reachable without
  touching the graph at all.

**Ordering.** 5 first if the goal is the fastest thing William can see (it depends on nothing).
2 next for navigation. 1 only alongside 2. 3 before 4, always.

---

## What would falsify this

- **The 100-row truncation.** Falsified if `createProvider()` on the live deployment returns a
  provider whose `getAllNodes()` default is not 100, or if the deployment sets a different limit
  than `src/storage-provider/src/jsonl.ts:131`. Check: `curl -s localhost:8040/api/nodes | jq '.count'`
  — if it returns 205, the truncation claim is wrong and (a) is purely a layout problem. I could not
  run this; port 8040 was not listening.
- **Which store the deployment reads.** Every measurement above is of
  `/srv/miadi/episodes/miadi-chronicle/.mw/store/`. If the running app is configured for the Neon
  provider (`src/storage-provider/src/neon.ts`) against a different dataset, all the numbers change,
  though the code findings do not. Check: `/api/health` or the `provider` field the nodes route
  already returns.
- **The parent_id gap.** Falsified if `getRelatedNodes` or the provider synthesises parent edges at
  read time. `X`: `src/storage-provider/src/jsonl.ts` `getAllEdges` reads `edges.jsonl` and nothing
  else, so the JSONL provider does not. A Neon provider with a view could.
- **"The capability is unused."** Falsified by a single import of `@medicine-wheel/relational-query`
  in a file I did not search. I searched `app/`, `lib/` and `src/` with
  `grep -rn "@medicine-wheel/relational-query"` — the only non-`src/relational-query` hits are
  comments and one `package.json`. A dynamic import built from a string would evade this.
- **The layout crowding.** Falsified if the deployment ships a stored named disposition covering most
  nodes, since `app/graph/page.tsx:229-238` skips `applyWheelLayout` entirely when
  `activeLayout.positions` is non-empty — and positions live in **localStorage**
  (`lib/graph-layout-storage`), so William's browser may hold a hand-arranged layout that my
  reading of the default cannot see. This one can only be settled by looking at his screen.
- **The prototype comparison.** Falsified if `buildChronicleCatalog` in `@miadi/inquiry-weave`
  actually reads the wheel rather than the filesystem. `X`: `lib/getManifest.ts:15` defaults the
  root to `/srv/miadi/episodes/miadi-chronicle` and passes it to the catalog builder; I did not read
  `@miadi/inquiry-weave` itself, so the possibility that it also consults `.mw/store/` is `A`, not
  ruled out.
- **The episode counts.** `185 folders / 131 episode.yaml / 83 nodes` counts `ls -d 2026-*`, so
  folders named otherwise are excluded and a folder that is not an episode would be included.

---

## Open questions for William

Only the ones that change the work.

- **Q1 — Which does the "cluster" describe: the graph canvas, or `/nodes`?** The two fail
  differently. The canvas fails by overlap and truncation; `/nodes` fails by having no `kind` filter,
  so 83 episodes sit in a list beside 52 systemd units. Phase 5 fixes the second and does nothing for
  the first. **This changes the phase order.**

- **Q2 — Do you have a saved graph disposition in that browser?** If localStorage holds hand-placed
  positions, `applyWheelLayout` never ran and my crowding arithmetic describes a layout you have
  never seen. **Only settleable by looking at the live app** — held rather than guessed. (`/graph`,
  side panel, "N positions remembered".)

- **Q3 — Should all 185 episode folders be in the wheel, or only some?** The wheel holds 83. If the
  answer is "all", Phase 3.3 is a backfill. If "only registered ones", then the wheel is a
  deliberate subset and the 102 absent folders are correct — but then the lineage arcs will point at
  episodes that have no node, and the renderer needs to say so rather than drop the edge.

- **Q4 — `part-of` or `belongs_to` for materialised containment?** The store already uses both (33
  and 2). `A`: this reads as a naming decision with a word-owner, not an engineering one, so I have
  not chosen. It blocks Phase 3.1 and nothing else.

- **Q5 — Is #129 the same request you just made in speech?** My reading: **no.** #129 is tenancy —
  a `Workspace` record with `WorkspaceMembership`, roles owner/admin/editor/viewer, and
  `workspace_id` as the scope key on every owned read and write, so one deployment can serve
  separate projects and communities without mixing their graphs. Your speech asks for *navigation and
  perspective within one dataset that you already own*: focus on a node, see its neighbours, see how
  now relates to the past. They share the word "scope" and nothing else. Building #129 would not
  make the graph navigable, and Phases 1–5 above do not need #129. **Adjacent, not the same.**
  Worth naming that Phase 2's `?depth=&direction=&kind=` endpoint is the natural place a workspace
  filter would later attach — so doing Phase 2 first makes #129 cheaper, not more expensive.

- **Q6 — #127 (Connected Papers) — is the ask the *layout* or the *interaction*?** The issue body is
  a title, three screenshots and `- [ ] TODO`; there is no text stating what to build. Connected
  Papers does two separable things: a force layout where similar papers sit near each other, and a
  focus-graph built from **one seed** with everything else excluded. The second is Phase 2 and is
  cheap. The first would need a similarity metric MW does not have. **Which one you meant changes
  whether #127 is a week or a quarter.**

Also noted in passing, outside this lane's scope: **#83 is still live.** `X`:
`app/narrative/cycles/page.tsx:98` still reads `cycle.beats.length` with no guard, and the store
holds 5 cycles. Not mine to fix, but it will crash the page the moment a legacy cycle is rendered.
**#112 is also still true** — `getAllEdges`/`getAllNodes` slice *after* sorting, but
`list_narrative_beats` truncates before ordering, which is the same class of defect as the graph
page's silent 100.

---

🌸: The clearest thing this measurement gives William is permission to stop blaming his own reading
of the screen — the graph really was showing him half the data, with a third of it unconnected, and
knowing that changes what is worth fixing first.
