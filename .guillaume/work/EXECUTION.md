# EXECUTION — upgrade, publish, install, consume

Every step names: the package, what changes in it, the version it publishes at, where it
gets installed, the exact file that consumes it, and why. Paths verified 2026-09-03.

Current state: suite `0.6.4`, `@medicine-wheel/mcp` `4.6.4`. Miadi declares 24 wheel
packages at `^0.6.1` and imports 5. STPB declares zero and carries the wheel as a git
submodule at `lib/medicine-wheel`.

---

## PHASE 1 — Repair the wheel's own app. **No publish.**

Nothing here leaves this repo, so there is nothing to install. It exists because the graph
is currently lying about its size and every later phase is judged on a screen that works.

**1.1 — `src/storage-provider/src/jsonl.ts` + `app/api/edges/route.ts`**
`getAllNodes(limit = 100)` and `getAllEdges(limit = 100)` silently truncate.
`app/graph/page.tsx:167` fetches both with no parameters, so the canvas draws 100 of 205
nodes and 100 of 191 edges and the panel reads "100 Nodes / 100 Relations".
Change: `/api/edges` takes `?limit=` the way `/api/nodes` already does
(`app/api/nodes/route.ts:82` already has the unbounded path); both payloads return `total`
beside `count`; the graph page asks for everything.

**1.2 — new `app/api/nodes/[id]/web/route.ts`**
`GET /api/nodes/{id}/web?depth=&direction=&kind=` → `{ nodes, edges, truncated }`,
implemented by calling `neighborhood()` (`src/relational-query/src/traversal.ts:217`) and
`traverse()` (`:46`). `@medicine-wheel/relational-query` is already a dependency;
`grep -rn "@medicine-wheel/relational-query" app/ lib/` returns nothing. No new capability
is written — a shipped function gets a URL.

**1.3 — `app/graph/page.tsx` + `src/graph-viz/src/interactive/MedicineWheelFlowGraph.tsx`**
Focus mode over 1.2: select a node, the canvas mounts **only** that neighbourhood, Escape
restores the wheel. The inspector gains an incident-relations list, each row linking to the
other node.
**1.1 must not ship without 1.3** — at 205 nodes the wheel layout worsens (north goes
33 → 93 nodes in the same 90°, spacing 7.1px → 2.5px against a 25.6px disc).

**1.4 — new `app/episodes/page.tsx` and `app/episodes/[id]/page.tsx`**
`GET /api/nodes?kind=chronicle_episode` already works (`app/api/nodes/route.ts:38` accepts
`kind` and `parent_id`). No page passes either. The detail page shows the episode's
attention items via `?kind=attention&parent_id=<episode>` and its relations from 1.2.

**1.5 — attention board on `app/page.tsx`**
The 22 attention nodes are isolates in the graph purely because their containment was never
materialised as an edge (Phase 2.1). They are readable by `parent_id` today.

**Done when:** the graph reports 205/191, one click isolates an episode's neighbourhood, and
an episode index exists. Complaints (a) and (b) answered without a release.

---

## PHASE 2 — Repair the data. **No publish.**

**2.1 — materialise containment.** 106 nodes carry `metadata.parent_id`; exactly **5** have
a matching edge. Write the other 101 as real edges, and write them at registration time in
the MCP path so they cannot drift again.
Measured effect: connected components 82 → 26, isolates 75 → 22, chronicle root degree
2 → 82.
**Held: `part-of` or `belongs_to`.** Both are already in the vocabulary (33 and 41 uses).
One word from you.

**2.2 — `metadata.occurred_at`.** `created_at` means "when the wheel learned this": 41 of 83
episodes disagree with their real date, and twelve May episodes all carry `2026-09-02`.
Populate `occurred_at` for episodes from the `date:` already in each `episode.yaml`. Leave
`created_at` alone — its current meaning is correct.

**2.3 — backfill.** ~170 `lineage:` entries exist on disk against 59 episode↔episode edges;
102 of 185 episode folders have no node at all. The wheel is a 40% sample of its own
chronicle.

---

## PHASE 3 — One publish cycle: `0.7.0` / mcp `4.7.0`

Batched because `RELEASING.md` makes a cycle cost the same for five changes as for one.

### 3.1 CREATE `@medicine-wheel/client` — the missing door

- **Why:** `grep -rln "fetch(" src/*/src/` is **empty**. Not one of the 26 packages can talk
  to a wheel over HTTP. The only client is `mcp/src/http-store.ts` (745 lines), and
  `@medicine-wheel/mcp@4.6.4` exposes `.`, `./all-tools`, `./types` — `http-store` is not
  among them and `types` is `undefined` in its manifest. The wheel's own code names the cost
  at `app/api/nodes/route.ts:26-31`. **This is why "consume it elsewhere" has never
  happened: there is no door, only a description of one.**
- **Built from:** `mcp/src/http-store.ts` + `mcp/src/store.ts:22-41` +
  `app/lib/{ceremony,beat,cycle}-response.ts`. `mcp` is then rewritten to depend on it,
  losing its private copy.
- **`workspaces` position:** after `src/ontology-core`, before `mcp`. The array is
  topological, not alphabetical — a wrong position fails `TS2307` on a clean tree.
- **Install:** `cd /src/Miadi && npm i @medicine-wheel/client@^0.7.0`
- **Consume:** `/src/Miadi/lib/mw-store.ts` (30 lines today) becomes a thin wrapper over the
  typed client instead of a hand-rolled fetch. Any Miadi route can then read the wheel.

### 3.2 UPGRADE `@medicine-wheel/ontology-core` — runtime schemas

- **Why:** `src/ontology-core/src/types.ts:501-506` defines `ProductionEntityKind` and
  `ProductionRelation`, `index.ts:46-47` exports them, and
  `grep ProductionRelation src/ontology-core/src/schemas.ts` returns **nothing**. Types with
  no runtime validation cannot guard a boundary. **This closes issue #90** — the one
  film-production issue that survived checking (#86 and #87 are OPEN and already published
  at `0.6.4`).
- **Change:** Zod schemas for `ProductionRelation`, `ProductionEntityKind`, and the
  infra/academic kinds, added to the existing `./schemas` subpath (already in `exports`).
- **Install:** already declared in Miadi at `^0.6.1`; `npm update` resolves it.
- **Consume:** `/src/Miadi/app/chronicle/lib/theme.ts` (105 lines) drops its redeclared
  directions and imports `DIRECTIONS` / `DIRECTION_COLORS` from `ontology-core`, keeping its
  own `glyph` and `THEMES`, which the wheel does not own. Ends the west-colour split
  (`#5b78b4` vs `#1a1a2e`).

### 3.3 UPGRADE `@medicine-wheel/storage-provider` — subpath exports

- **Why:** it is the only package with **no `exports` field** (`ontology-core` has seven
  subpaths; this has none). Add `./interface`, `./jsonl`, `./neon`.
- **Correction to the lane report, checked directly:** `CeremonialPhase` *is* re-exported at
  the package root (`src/storage-provider/src/index.ts:31`), and Miadi already imports
  `@medicine-wheel/storage-provider` in five files. So `/src/Miadi/types/ceremony.ts:15-20`
  copied the Ojibwe five **while the real one was reachable** — the copy was not forced by a
  missing export. The subpath map is still worth adding; it is not the cause here.
- **Install:** `npm update @medicine-wheel/storage-provider` in `/src/Miadi`.
- **Consume:** `/src/Miadi/types/ceremony.ts` deletes its local `CeremonialPhase` and imports
  it.

### 3.4 CREATE `@medicine-wheel/community-choice` — where the community chooses

- **Why not extend `community-review`:** they run in opposite directions. A `ReviewCircle`
  is a bounded, named, role-carrying body whose consensus *authorizes* something; an audience
  poll has loosely-identified participants, options authored in advance by the proposer, and
  a result that authorizes nothing. `ReviewOutcomeType` is a closed five-enum and every
  producer in `outcomes.ts` returns *the circle's* decision carrying `elderBlessing` and
  `wilsonCheck`. Adding a poll would make an Elder's blessing apply to a Facebook audience.
  And `seekConsensus` (`consensus.ts:26-33`) computes consensus as **all reviewers having
  spoken** — attendance. For a named circle that is a defensible proxy; for an open audience
  the denominator does not exist.
- **Why not `consent-lifecycle`:** a poll response is not a grant. Modelling it there makes
  "the audience chose B" readable as "the audience consented to B". It *is* the right owner
  of the precondition — hence `consentGate` below.
- **Shape:** `ChoiceSet { subject: SubjectRef, question, options[], authority, boundaries[],
  consentGate?, state, readingRef? }`, `ChoiceOption { id, label, consequence, deferral }`,
  `ChoiceResponse`, `ChoiceResult`. Zero I/O, matching `community-review`'s discipline — and
  **with tests**, which `community-review` has none of.
- **Two invariants in code**, taken from the two errors you caught by hand in the only
  exercise that has ever run: `validateChoiceSet` rejects fewer than two options, any option
  missing `consequence`, and an empty `boundaries`; `closeChoiceSet` returns a result,
  **never a permission**.
- **`workspaces` position:** after `src/consent-lifecycle`.
- **Install:** `cd /src/Miadi && npm i @medicine-wheel/community-choice@^0.7.0`
- **Consume:** the review-steward seat stops hand-computing receipts into Markdown and
  registers a `ChoiceSet` whose `subject` is `{ service: 'miadi-review', id, version, url,
  sha256 }` — the receipt block `audience-choice-packet-01.md` already computes by hand.

### 3.5 UPGRADE `@medicine-wheel/storage-provider` + `app` — choice persistence

`ChoiceSetRecord` / `ChoiceResponseRecord` in `src/storage-provider/src/interface.ts` with a
sibling `choice-sets.ts` for filter semantics, jsonl + neon implementations, and
`app/api/choice-sets/route.ts` + `[id]/route.ts` + `[id]/responses/route.ts`. Copy
`inquiry-weaves.ts` and `plan-perspectives.ts` exactly — they are the working template.

### 3.6 UPGRADE `@medicine-wheel/mcp` → `4.7.0` — open the dead-end door

`mw_review_circle_open` exists in `mcp/src/tools/governance-transformation.ts` with **no**
tool to add a reviewer, record a voice, or close a circle. A circle opened through MCP can
never leave `gathering`. Add `mw_review_circle_add_reviewer`, `_voice`, `_close`, plus
`mw_choice_set_open`, `mw_choice_respond`, `mw_choice_close`, `mw_choice_result`.
While there: move review-circle persistence from `metadata.is_review_circle` to
`metadata.kind` (this repo's own rule in `CLAUDE.md`), keeping the old flag as a read alias —
existing rows carry it.

### The publish, per `RELEASING.md`

`npm run publish:all` → **global install** → run the installed `mw` binary → fix → bump →
publish again. A green publish proves nothing; only a fresh global install finds the missing
peer dependency class of bug. `mcp` is never excluded because it is on a different major.

---

## PHASE 4 — Consume. **No publish.**

**4.1 — `/src/Miadi/lib/ceremonial-spiral.ts` (423 lines).** Its consensus and
talking-circle logic (`:166` `initialize consensus workflow`, `:187` `update consensus with
a viewpoint`, `:221-224` phase advance on participation rate over Redis) is replaced by
`@medicine-wheel/community-review`'s `seekConsensus`, `talkingCircle`, `recordVoices`,
`resolveDisagreement`. Redis stays as the storage adapter.
**Nothing has to change in `community-review` to make this possible** — it is pure,
synchronous and schema-backed, and Miadi has declared it at `package.json:42-48` without
importing it once. This is the direct answer to your closing line, for the half that is
wiring rather than building.

**4.2 — port `LineageWeb` into `src/graph-viz/`.** `/src/Miadi/app/chronicle/components/
LineageWeb.tsx:27-78` is ~50 lines of pure geometry: x chronological, y direction band,
relation arcs above the spine. It becomes `lineageLayout` beside `applyWheelLayout`, with a
layout switch on `app/graph/page.tsx`.
**Depends on 2.2.** Run on `created_at` today it would stack twelve May episodes on one
September pixel and look right while being wrong.

**4.3 — STPB.** `/src/STPB` declares **zero** `@medicine-wheel` dependencies and carries
this repo as a git submodule at `lib/medicine-wheel` that nothing imports.
`lib/ceremony/sacred-container.ts` hand-rolls sharing consent (`:192`, `:207`, `:216-226`)
where `@medicine-wheel/consent-lifecycle` has six Zod schemas. Replace the submodule with
`npm i @medicine-wheel/consent-lifecycle @medicine-wheel/community-review` and consume them
in `lib/ceremony/sacred-container.ts` and `lib/community/community-service.ts`.

---

## PHASE 5 — `0.8.0`, blocked on two words that are not an engineer's

**Q1 — what is a chooser?** Neither system can tell two people apart:
`community-review`'s `Reviewer.id` is an unauthenticated string, and `review-service` has
one shared bearer token (`app/lib/auth-token.ts`) with no identity column. Three answers,
each real: named respondents you invite; an anonymous token minted per event; or you record
each response yourself. This decides whether a published count means anything.

**Q2 — which ceremony phase vocabulary is canonical?** `ontology-core/src/types.ts:307`
says `'opening' | 'council' | 'integration' | 'closure'`. `ceremonial-diary/src/types.ts:71-75`
carries the Ojibwe five (`miigwechiwendam`, `nindokendaan`, `ningwaab`, `nindoodam`,
`migwech`), re-exported through `storage-provider/src/index.ts:31`. Miadi copied the Ojibwe
five into `types/ceremony.ts:15-20`. `ceremony-protocol` cannot be made persistable until
this is settled, which is why nothing consumes it.

Downstream of the answers: `ceremony-protocol` gains a persistable ceremony record over
`StorageProvider`; `@medicine-wheel/structural-tension` extracts STC charting out of the
MCP-only tool (**issue #103** — the other open issue whose premise survived checking).

---

## Two hazards to fix on the way

1. **`src/_` publishes `medicine-wheel@1.0.5`** with `main: index.js`, and the folder holds
   only `package.json` and `README.md`. Outside `workspaces`, versioned above the suite,
   entry point does not exist. Exactly the class of failure `RELEASING.md` documents.
2. **Five open issues describe shipped work** — #86, #87, #107 (claims zod is missing from
   root deps; it is there at `^3.23.0`), #116. Only #90, #103 and #83 survived checking.
