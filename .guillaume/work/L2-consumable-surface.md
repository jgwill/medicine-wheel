# L2 — The consumable surface of `jgwill/medicine-wheel`

Lane L2 of three. Investigated 2026-09-03 in `/workspace/repos/jgwill/medicine-wheel`.

**Source classes used throughout, per William's rule.** `X` = I ran a command or read code
that runs, cited by command or `path:line`. `W` = a document *claims* this. `A` = my
inference. No recommendation below rests on a `W` claim without saying so.

## Model class

Opus 5 (`claude-opus-5`).

---

## Drift found in my own brief, before anything else

Two things the dispatch gave me as `X` did not hold when I checked them. Both matter,
because they are the same failure mode the rest of this report is about.

| Brief said | `X` measured | Why it matters |
|---|---|---|
| MW head is `1712577` | `git log --oneline -1` → `3576997 little upgrade to the prompt that I sent to Claude…` | The tree moved between dispatch and lane start. Nothing in my findings depends on the difference, but a lane that assumed the hash would have been wrong. |
| Issue #107: "zod missing from root dependencies" (OPEN) | `node -e "console.log(require('./package.json').dependencies.zod)"` → `^3.23.0` | zod **is** in root dependencies. The issue is stale. |

Combined with the coordinator's own finding that #86, #87 and #116 propose creating
packages that are already published at 0.6.4, the conclusion is structural, not
incidental:

**F0 (`X`).** The MW issue tracker is a record of past intent, not of present state. At
least five open issues (#86, #87, #107, #116, and #103 in part) describe work that is
already done. Any phase plan built by reading issue titles will re-do shipped work. Read
the code; use issues only for the *why*.

---

## Export surface table

`X` — every row from the package's own `package.json` (`exports`/`main`/`types`) and
`src/index.ts`. Published column from one batched loop over `npm view @medicine-wheel/<n>
version`. Schema counts from `grep -rhoE "export const [A-Za-z0-9_]+Schema"` per package.

`npm view` is cached and can lie for minutes after a publish (`W`, `RELEASING.md`); these
readings are all consistent at 0.6.4 and were not taken after a publish, so I treat them
as reliable.

| # | Package | Subpath exports beyond `.` | npm | Runtime schemas | Character |
|---|---|---|---|---|---|
| 1 | `ontology-core` | `./types` `./schemas` `./vocabulary` `./rdf-interop` `./constants` `./queries` | 0.6.4 | **29 Zod** | Types + constants + schemas + 22 pure query helpers. The nucleus. |
| 2 | `infra` | `./types` `./schemas` | 0.6.4 | **18 Zod** | Types + one pure fn (`detectPortConflicts`). Zero I/O by design (`W`, CLAUDE.md — confirmed `X`, no `fs`/`fetch`). |
| 3 | `creative-orientation` | — | 0.6.4 | 0 | Pure functions, types-only boundary. |
| 4 | `session-reader` | `./types` `./sessions` | 0.6.4 | 0 | JSONL session parsing. Node-only (`fs`). No deps. |
| 5 | `ceremony-protocol` | — | 0.6.4 | **0** | Pure fns over `RSISConfig`. **No persistence, no `CeremonyLog`, no async.** See F5. |
| 6 | `storage-provider` | **none — `exports` field absent** | 0.6.4 | 0 | The real persistence seam: `StorageProvider` iface (454 ln), `JsonlProvider` (739 ln), `NeonProvider` (687 ln), `createProvider`. |
| 7 | `data-store` | `./connection` `./store` `./session-link` `./helpers` | 0.6.4 | 0 | Redis CRUD. Overlaps (6). |
| 8 | `data-store-postgres` | `./connection` | 0.6.4 | 0 | Postgres provider. Overlaps (6). |
| 9 | `graph-viz` | `./interactive` | 0.6.4 | 0 | React component + pure layout/converters/mermaid. Peers: `react`, `react-dom`, `@xyflow/react`. |
| 10 | `importance-unit` | `./types` `./schemas` `./unit` `./epistemic-weight` `./accountability` `./circle-tracking` | 0.6.4 | **12 Zod** | Best-factored package in the suite: 6 subpaths, schema-backed. |
| 11 | `narrative-engine` | — | 0.6.4 | 0 | Beats, arcs, cadence, sequencer. ~27 exported types, no schemas. |
| 12 | `narrative-cluster` | — | 0.6.4 | 0 | Clusters + edit-brief. |
| 13 | `perception-layer` | — | 0.6.4 | 0 | Ingest + observers. |
| 14 | `prompt-decomposition` | `./browser` `./types` (+ `browser` condition on `.`) | 0.6.4 | 0 | Only package with a browser build. |
| 15 | `relational-index` | `./types` | 0.6.4 | 0 | Four-source dimensional indexing. |
| 16 | `relational-query` | — | 0.6.4 | 0 | Traversal, guards, cypher, audit, migrate. |
| 17 | `ui-components` | `./tokens.css` (ships `src/tokens.css` raw) | 0.6.4 | 0 | **5 components only**: DirectionCard, BeatTimeline, NodeInspector, OcapBadge, WilsonMeter. Peer: `react`. |
| 18 | `brainstorming` | — | 0.6.4 | 0 | On creative-orientation. |
| 19 | `gap-analysis` | — | 0.6.4 | 0 | On creative-orientation. |
| 20 | `creative-problem-solving` | — | 0.6.4 | 0 | On creative-orientation. |
| 21 | `community-review` | — | 0.6.4 | **10 Zod** | Circles, elder validation, consensus, talking circle, storyteller gate. **All synchronous, all in-memory.** |
| 22 | `consent-lifecycle` | `./types` `./schemas` | 0.6.4 | **6 Zod** | Lifecycle, cascade, scope, alerts. **All synchronous, all in-memory.** |
| 23 | `fire-keeper` | — | 0.6.4 | 0 | ~43 exported types, gating/trajectory/check-back. No schemas. |
| 24 | `transformation-tracker` | `./types` `./schemas` | 0.6.4 | **8 Zod** | Wilson validity, seven-generations, reciprocity ledger. |
| 25 | `ceremonial-diary` | `./types` `./markdown` `./relate` | 0.6.4 | 0 | On ontology-core + storage-provider. |
| 26 | `github-ceremony` | `./detect` `./process` | 0.6.4 | 0 | On ontology-core + storage-provider. |
| — | `mcp` (`mcp/`) | `./all-tools` `./types` | **4.6.4** | 0 | Bin `medicine-wheel-mcp`. Holds `HttpStore`, `node-search`, STC tools. **No `types` field in manifest.** |
| — | root `@medicine-wheel/app` | **no `exports`, no `main`** | 0.6.4 | — | Bin-only + file payload. See "The app/ verdict". |
| — | `src/_` → bare `medicine-wheel` | `main: index.js` (**file does not exist**) | **1.0.5** | — | Meta-package depending on all 27. Off-lockstep. See F1. |

### What the table says

**F1 (`X`). All 26 packages + mcp + app are published and in lockstep at 0.6.4 / 4.6.4.**
Nothing is unpublished. The consumable surface is not missing from npm — it is missing
*shape*. There is one exception: the bare `medicine-wheel` package (`src/_`) is at
**1.0.5**, is not in the `workspaces` array, is not touched by `bump-versions.mjs`, and
its `main: index.js` names a file that does not exist in the folder. It is an
install-everything alias frozen at a version above the suite's. It is the exact hazard
`RELEASING.md` documents for mcp — a package on a different line that release automation
does not see — and unlike mcp it was never fixed.

**F2 (`X`). Zod coverage is 5 packages out of 26.** Only `ontology-core` (29),
`infra` (18), `importance-unit` (12), `community-review` (10), `transformation-tracker`
(8) and `consent-lifecycle` (6) carry runtime schemas. The other 20 are types-only. The
coordinator's `ProductionRelation` observation generalises: `src/ontology-core/src/types.ts:501-506`
defines `ProductionEntityKind`/`ProductionRelation`, `index.ts:46-47` exports them, and
`grep ProductionRelation src/ontology-core/src/schemas.ts` returns nothing. The same holds
for the newer additive kinds — `InfraEntityKind`, `AcademicEntityKind`,
`AcademicAppointment`, `AcademicRelation` are all exported types with no Zod backing.

Consequence for a consumer, and this is the operative one: **a Next.js API route cannot
validate anything the wheel added after the original six node types.** `app/api/nodes/route.ts`
proves it by counter-example — it validates with `NodeTypeSchema` and `DirectionNameSchema`
(both real), then hand-rolls a local `z.object` for everything else, and its own comment
says the additive kinds ride in `metadata.kind` where nothing checks them.

**F3 (`X`). `storage-provider` — the one package with a real persistence seam — has no
`exports` field at all.** Every other package declares one. It resolves through `main`
only, so `@medicine-wheel/storage-provider/interface` or `/jsonl` is unreachable, and a
consumer wanting only the `StorageProvider` type pulls in the Neon and Redis code paths.
It is also the package with the most exported surface (28 types, 5 provider modules) and
the one `/src/Miadi` actually depends on hardest.

---

## What `/src/Miadi` consumes and what it reimplements

### Declared vs. actually imported

`X` — declarations from `grep -n "@medicine-wheel" /src/Miadi/package.json`; imports from
`grep -rhoE "@medicine-wheel/[a-z-]+"` across `app/ packages/ lib/ components/ scripts/ src/`.

`/src/Miadi/package.json:39-62` declares **24** `@medicine-wheel/*` deps at `^0.6.1`
(suite is at 0.6.4). **No `/src/Miadi/packages/*/package.json` declares a single one** —
`grep -l "@medicine-wheel" packages/*/package.json` returns nothing.

Actually imported: **5 packages, in 10 files.**

| Package | Import count | Where |
|---|---|---|
| `storage-provider` | 5 | `lib/mw-store.ts` (the shared provider singleton) |
| `ontology-core` | 5 | `lib/ceremony-spiral-hooks.ts`, `components/ceremony/DirectionPanel.tsx`, `app/ceremony/page.tsx`, `app/ceremony/ceremonies/page.tsx`, `app/api/ceremony/list/route.ts` |
| `ui-components` | 2 | `lib/nav-items.ts`, `components/section-nav.tsx` — **and one of the two is a comment referencing `tokens.css`, not an import** |
| `github-ceremony` | 2 | `app/api/ceremony/webhook/github/route.ts` |
| `ceremonial-diary` | 2 | `app/api/ceremonial-diary/route.ts` |

**F4 (`X`). 19 of 24 declared packages are never imported.** Miadi carries
`community-review`, `consent-lifecycle`, `fire-keeper`, `ceremony-protocol`,
`narrative-engine`, `relational-query`, `relational-index`, `importance-unit`,
`transformation-tracker`, `graph-viz`, `perception-layer`, `narrative-cluster`,
`prompt-decomposition`, `brainstorming`, `creative-problem-solving`, `session-reader`,
`data-store`, `data-store-postgres`, and `app` in its dependency tree and imports none of
them. Three published packages are not even declared: `creative-orientation`,
`gap-analysis`, `infra`.

This is the shape of "consumption" today: a lockfile relationship, not a code one.

### What Miadi reimplements that MW already exports

**R1. The four directions, with drift. `/src/Miadi/app/chronicle/lib/theme.ts:37-58`.**

```ts
export type DirectionKey = "east" | "south" | "west" | "north"
export const DIRECTIONS: Record<DirectionKey, DirectionMeta> = {
  east: { …, oj: "Waabinong", gloss: "Vision · Spring", color: "#FFD700", glyph: "🌅" },
  …
  west: { …, oj: "Epangishmok", gloss: "Reflection · Fall", color: "#5b78b4", … },
```

`ontology-core` already exports `DIRECTIONS`, `DIRECTION_COLORS`, `OJIBWE_NAMES`,
`DIRECTION_SEASONS`, `DIRECTION_NAMES`, `DirectionName`. The Ojibwe names match exactly.
**The west colour does not**: Miadi `#5b78b4`, `ontology-core` `#1a1a2e`
(`src/ontology-core/src/constants.ts:41,67`). Two live surfaces paint the same direction
two different colours, and no test can see it because there is no shared import.

**R2. The ceremony phase vocabulary, copied not derived. `/src/Miadi/types/ceremony.ts:15-20`.**

```ts
export type CeremonialPhase =
  | 'miigwechiwendam' | 'nindokendaan' | 'ningwaab' | 'nindoodam' | 'migwech';
```

That is character-for-character `src/storage-provider/src/interface.ts:184-189`. Miadi
depends on `storage-provider` and imports it in `lib/mw-store.ts`, but re-declared the
type locally instead of importing it. `storage-provider` has no `exports` map (F3), so
`…/interface` was not reachable as a subpath — the copy is what the missing export field
produced.

**R3. Ceremony orchestration over a second backend. `/src/Miadi/lib/ceremonial-spiral.ts`
(423 lines) + `lib/ceremony-spiral-hooks.ts` (319 lines).** Implements ceremony phases,
`ConsensusStatus` with `phase: 'Review'|'Dialogue'|'Synthesis'|'Agreement'`, participants,
viewpoints with `'supporting'|'partial'|'concerns'|'opposing'`, and relational connections
— over Upstash Redis, entirely independent of `lib/mw-store.ts`. MW ships
`community-review` with `seekConsensus`, `talkingCircle`, `recordVoices`,
`resolveDisagreement`, `Reviewer`, `TalkingCircleEntry` — **schema-backed, 10 Zod schemas**
— and Miadi uses none of it.

**R4. Structural tension, with the banned framing. `/src/Miadi/types/ceremony.ts:42-47`.**

```ts
export interface StructuralTension {
  currentState: string; desiredState: string; gapPercentage: number; nextSteps: string[];
}
```

`ontology-core` exports `StructuralTensionChart`, `ActionStep`, `TensionPhase` and
`StructuralTensionChartSchema` (a real Zod schema). The local copy also encodes tension as
a `gapPercentage`, which is the framing the house rules and the RISE guidance say not to
use. Importing the MW type resolves the vocabulary drift as a side effect of resolving the
duplication.

### What Miadi holds that is genuinely its own

The chronicle surface is **not** a reimplementation of MW. `/src/Miadi/app/chronicle/lib/getManifest.ts`
builds from `@miadi/inquiry-weave` and `@miadi/episodic-memory-schema`, and
`lib/attention.ts` explicitly delegates: *"The read model and answer transaction live in
@miadi/inquiry-weave so the app, MCP, and passages CLI cannot drift."* That package
boundary is already drawn correctly. `X`: **no `@miadi/*` package depends on any
`@medicine-wheel/*` package** — `grep -l "@medicine-wheel" /src/Miadi/packages/*/package.json`
returns nothing.

---

## The app/ verdict

### Reconciling the `W` claim with what is there

`W` (`CLAUDE.md`) says `@medicine-wheel/app` is published. `X`: it is, at 0.6.4. The
brief's concern — "if the published `app` is not the root `app/`, that matters" — resolves
as follows, from the root `package.json`:

- `name` is `@medicine-wheel/app`, and its `files` array includes `app/**/*`,
  `components/**/*`, `hooks/**/*`, `lib/**/*`, `public/**/*`, `dist/cli/**/*`.
- So the published tarball **does** contain the root `app/` — as raw `.tsx` Next.js
  source, unbuilt.
- But the manifest has **no `main` and no `exports`**. `import … from
  "@medicine-wheel/app"` resolves to `index.js` at the package root, which does not exist.

**F5 (`X`). `@medicine-wheel/app` ships the root `app/` as an unimportable payload.** It
is two things bolted together: a bin package (`mw`, `mwsrv` from `dist/cli`) and a
file-drop of Next.js source that only `mwsrv` can do anything with. `/src/Miadi` declares
it (`package.json:39`) and — consistent with F4 — imports nothing from it, which is the
only possible outcome.

This also explains why `app/` is absent from `workspaces` while being published: it is the
*root*, so it is published by `npm publish --access public` directly (`publish:all`),
never by `publish-workspaces.mjs`. There is no inconsistency to fix there. The
inconsistency is that a package containing 10 reusable `lib/` modules and 4 components
exposes none of them.

### Extract, leave, or split — file by file

**Split.** Three groups, with different destinations.

**Group A — extract to a package. These are pure, tested-shaped, and every consumer needs them.**

| File | Lines | Why |
|---|---|---|
| `lib/ceremony-response.ts` | 84 | `normalizeCeremonyLog` / `extractCeremonies`. Its own docstring states the case: *"a ceremony logged before any of those fields existed takes the whole page down rather than rendering thin."* |
| `lib/beat-response.ts` | 58 | `normalizeNarrativeBeat`. Deliberately additive-safe — keeps unknown fields so the narrative engine can grow. |
| `lib/cycle-response.ts` | 66 | `normalizeMedicineWheelCycle`, plus `ApiMedicineWheelCycle`, the actual over-the-wire shape (base type + `archived`). |
| `lib/types.ts` | 23 | Pure re-export of ontology-core. Extraction deletes it rather than moving it. |

These 208 lines are the **response contract of the wheel's HTTP API**. Right now every
consumer that reads `/api/ceremonies` or `/api/narrative/beats` must re-derive them or
crash on old records. They belong in the same package as the client (below).

**Group B — extract, but as consolidation, not addition.**

| File | Lines | Verdict |
|---|---|---|
| `lib/jsonl-store.ts` | 682 | **Duplicate.** `src/storage-provider/src/jsonl.ts` is 739 lines doing the same job. `lib/store.ts:26` half-admits it: *"For async provider access (Neon), use API routes or import from @medicine-wheel/storage-provider directly."* Two JSONL engines write the same `.mw/store/*.jsonl`. |
| `lib/store.ts` | 334 | A **sync** facade over the duplicate engine, existing because `storage-provider` is async-only. That is a real need; the answer is a sync read path in `storage-provider`, not a second engine. |

**Group C — leave in `app/`.** `lib/utils.ts`, `lib/format-time.ts`,
`lib/graph-animation-storage.ts`, `lib/graph-layout-storage.ts` (localStorage, browser-only,
this app's own UX state), and all four `components/*.tsx` — `navigation.tsx`,
`theme-provider.tsx`, `workspaces-panel.tsx`, `direction-panel.tsx`. These are one app's
chrome. Note `direction-panel.tsx` overlaps `ui-components/DirectionCard`; that is a
widening of `ui-components`, not an extraction of the app's copy. **L3 owns graph
navigation UX** — I flag `graph-*-storage.ts` only because a package boundary would touch
them, and recommend it does not.

**Do not extract the API routes.** `app/api/*/route.ts` are Next.js `NextResponse`
handlers — framework-bound by construction. What consumers need is not the server; it is
the *client and the contract*, which is Group A plus the next section.

---

## Coming back into the wheel

Candidate by candidate. Verdicts are mine (`A`) on evidence cited above.

### NEW packages

**N1 — NEW `@medicine-wheel/client`.** The largest hole in the surface.

**F6 (`X`). There is no HTTP client in the entire suite.** `grep -rln "fetch("
src/*/src/` across all 26 packages returns **nothing**. The only client is
`mcp/src/http-store.ts` (743 lines, `class HttpStore`, `getHttpStore`), locked inside the
MCP server package — which has no `types` field in its manifest, so even a consumer
willing to depend on the MCP server gets no types for it.

The wheel's own code names the cost. `app/api/nodes/route.ts:26-31`:

> *"Both were reachable only by fetching the whole graph and filtering client-side;
> forgewright's `chronicle/client.ts` and this repo's own `HttpStore.searchNodes` each do
> exactly that, the latter under the comment 'Server has no search endpoint yet'."*

That is two independent hand-rolled clients, documented in-tree. Any consumer that wants
to read the wheel over HTTP writes a third.

Contents: `HttpStore` lifted from `mcp/src/http-store.ts`; `HttpStoreError`,
`WriteFailure`; the `MW_API_URL` validation from `mcp/src/store.ts:22-41` (it already
refuses a non-absolute or non-http URL with a named error — good behaviour that only the
MCP server currently gets); and Group A's three normalizers as the response contract.
`mcp` then depends on `client` instead of owning it, which is a strict reduction.

**N2 — NEW `@medicine-wheel/structural-tension`.** Issue #103 (`W`) proposes this. `X`
confirms the diagnosis is still accurate: STC logic lives in `mcp/src/tools/structural-tension.ts`
and `mcp/src/tools/orientation.ts`, while only the *types and schema*
(`StructuralTensionChart`, `ActionStep`, `TensionPhase`, `StructuralTensionChartSchema`)
are in `ontology-core`. `/src/Miadi/types/ceremony.ts:42-47` reimplements a degraded
version (R4). #103 is the one open issue in my area whose premise survives checking.

**N3 — LATER, not now: `@medicine-wheel/chronicle-view`.** `/src/Miadi/app/chronicle/lib/inference.ts`
(222 lines) infers direction and theme from episode text by keyword, and `theme.ts` holds
the palette (R1). The *inference* is a reusable reading of the four directions; the
*keyword lists* are Miadi's chronicle vocabulary. Splitting them is real work with no
current second consumer. Correct move now is R1 alone: make `theme.ts` import
`ontology-core`'s directions instead of redeclaring them.

### EXTEND existing

**E1 — EXTEND `storage-provider`: add an `exports` map.** F3. Cheapest high-value change
in this report. `./interface`, `./jsonl`, `./neon` as subpaths makes R2's copied type
importable and stops the next copy.

**E2 — EXTEND `storage-provider`: a sync read path.** `lib/store.ts` (334 lines) exists
only because `createProvider` is async-only. Either a sync JSONL reader or a
`getProviderSync()` for the file backend retires that file rather than moving it.

**E3 — EXTEND `ontology-core`: Zod schemas for the additive kinds.** F2. `ProductionRelation`,
`InfraEntityKind`, `AcademicEntityKind`, `AcademicAppointment`, `AcademicRelation` are
exported types with no runtime backing. Until they have schemas, no consumer can validate
a `metadata.kind` payload at an API boundary, and every route hand-rolls a local
`z.object` as `app/api/nodes/route.ts:6-18` does.

**E4 — EXTEND `ui-components`.** Five components is thin for a suite of 26 packages. The
concrete widening the consumers ask for: a direction panel (both `app/components/direction-panel.tsx`
and `/src/Miadi/components/ceremony/DirectionPanel.tsx` exist independently), and the
`tokens.css` export made usable — `/src/Miadi/lib/nav-items.ts` currently *mentions*
`@medicine-wheel/ui-components/tokens.css` in a comment rather than importing it.

**E5 — EXTEND `community-review` / `consent-lifecycle` with a persistence seam.** See F7
below; this is the answer to William's closing line and is argued there.

### LEAVE

- **`@miadi/inquiry-weave`, `@miadi/episodic-memory-schema`, `@miadi/composition-to-episode`,
  `@miadi/plan-insight`** — LEAVE in Miadi. These encode the chronicle's own file layout
  and episode grammar. Nothing in the wheel needs them, and moving them would invert the
  dependency direction (see below).
- **`@miadi/attention-ui`** — LEAVE, but note it as the model to copy. Its docstring is
  the contract `ui-components` should hold: *"transport-agnostic: it never fetches,
  resolves a path, holds a token, or knows a medicine-wheel URL."* Zero dependencies, a
  `./styles.css` subpath export. `ui-components` should look like this.
- **`/src/Miadi/packages/feedback`, `/src/Miadi/packages/community`** — LEAVE. `X`: neither
  has a `package.json`. `feedback/` holds `AGENTS.md`, `llms.txt`, `rispecs/`; `community/`
  holds only `AGENTS.md`. They are intent folders, not packages. There is nothing to move.
- **`/src/STPB/lib/ceremony/`** — LEAVE. Argued under F8.
- **`app/` components and browser-storage libs** — LEAVE, per Group C.

---

## Answering William's closing line

> *"and if not enouhht , neither of them consume the packages that our MW has in relation
> to a 'ceremony' !"* — `.guillaume/260831-input.md`, committed as `3576997` (`X`)

**1. Does `/src/Miadi` import the ceremony packages? No — and this is worse than not
declaring them.**

`X`: `grep -rn "@medicine-wheel/\(ceremony-protocol\|consent-lifecycle\|fire-keeper\|community-review\)"
/src/Miadi --include=*.ts --include=*.tsx` (excluding `node_modules` and `dist`) returns
**zero matches**. All four *are* declared — `package.json:42,43,44,48`. So the distinction
the coordinator asked for lands on the bad side: they are installed, version-pinned,
resolved in the lockfile, and never referenced. William is right, and the dependency list
was actively hiding it.

**2. `/src/STPB`? No, and by a different mechanism.**

`X`: `/src/STPB/package.json` contains **no `@medicine-wheel` string at all**. Instead
`.gitmodules` declares:

```
[submodule "lib/medicine-wheel"]
	path = lib/medicine-wheel
	url = git@github.com:jgwill/medicine-wheel.git
```

That checkout is dated **Mar 6**, contains **9** package folders (ceremony-protocol,
data-store, graph-viz, narrative-engine, ontology-core, prompt-decomposition,
relational-query, session-reader, ui-components) against today's 26, and has **no root
`package.json`**. And `grep -rn "lib/medicine-wheel" app/ components/ lib/` — excluding the
submodule itself — returns **nothing**. STPB vendored the wheel six months ago as source,
never wired it, and the submodule has been dead since.

**3. Why: hard to consume, or nobody wired it? Both, and the split is clean.**

My position (`A`, on the evidence below): **`ceremony-protocol` is genuinely not consumable
by a web app. `community-review` and `consent-lifecycle` are consumable and nobody wired
them.** These need different phases, and treating them as one item is what has kept both
undone.

**F7 (`X`). `ceremony-protocol` cannot hold a ceremony.** Measured:

- `grep -n "CeremonyLog\|StorageProvider\|async \|fs\." src/ceremony-protocol/src/*.ts`
  → **zero matches**. No persistence, no async, no reference to `CeremonyLog` — the type
  `ontology-core` defines for a ceremony that happened.
- Its entire input surface is `RSISConfig`, `GovernanceConfig`, `CeremonyPhase`, `SunName`
  — a **config-file format**. `loadCeremonyState(config)`, `nextPhase(current)`,
  `getPhaseFraming(phase)`, `checkGovernance(filePath, config)`.
- Zero Zod schemas.

So it answers "what phase does this repo's RSIS config say it is in, and is this file
path protected?" A Next.js app that wants a user to *begin* a ceremony, record who was
present, and close it has nowhere to put any of that. **This is "make it consumable
first."** It needs a ceremony record with a lifecycle over `StorageProvider`, and a Zod
schema, before wiring it means anything.

The vocabulary problem compounds it. **Four incompatible ceremony phase types are live,
two of them inside MW itself:**

| Vocabulary | Values | Where |
|---|---|---|
| `CeremonyPhase` | opening, council, integration, closure | `src/ontology-core/src/constants.ts:158` |
| `CeremonialPhase` | miigwechiwendam, nindokendaan, ningwaab, nindoodam, migwech | `src/storage-provider/src/interface.ts:184-189` |
| `CeremonialPhase` | *identical to the above* | `/src/Miadi/types/ceremony.ts:15-20` (copy, R2) |
| `CeremonyStage` | preparation, moment, integration, transmission | `/src/STPB/lib/ceremony/types.ts:28-32` |

`ceremony-protocol` speaks the first. `ceremonial-diary` — which Miadi *does* import —
speaks the second. A consumer cannot use both without a translation layer nobody has
written. **Naming which vocabulary is canonical is a knowledge-holder's decision, not an
engineer's**; it is in Open questions below.

By contrast, **`community-review` and `consent-lifecycle` are ready.** `X`: `grep -rn
"async \|StorageProvider\|fetch(" src/community-review/src/` and the same over
`src/consent-lifecycle/src/` both return **nothing** — every function is synchronous and
pure, taking a value and returning a new one (`createReviewCircle`, `addReviewer`,
`submitForReview`, `closeCircle`, `seekConsensus`, `talkingCircle`, `recordVoices`,
`resolveDisagreement`). They carry **10 and 6 Zod schemas**. Pure and schema-backed is the
*easiest* thing to consume from a React Server Component: call it, validate, hand the
result to `StorageProvider`. Nothing blocks it. Nobody wired it — while Miadi wrote
`lib/ceremonial-spiral.ts` (423 lines) implementing consensus over Redis by hand (R3).

That is the sharpest single finding in this report: **MW's most consumable ceremony
package and Miadi's largest hand-rolled ceremony file solve the same problem, and were
written past each other.**

**4. Are STPB's routes a ceremony lifecycle reimplemented? Yes — but not MW's ceremony.**

`X`, `/src/STPB/lib/ceremony/` is 1,936 lines across 7 files:

| File | Lines | What |
|---|---|---|
| `ceremony-orchestrator.ts` | 426 | Four-Movement Vulnerability Ceremony: preparation → moment → integration → transmission, over `sql` from `@/lib/db` |
| `companionship-protocol.ts` | 370 | Response/timing/presence guards on advice-giving language |
| `sacred-container.ts` | 327 | Rate limiting, silence honoring, anti-commodification, privacy defaults |
| `wellbriety-wisdom.ts` | 324 | Wellbriety teachings |
| `types.ts` | 234 | `CeremonyStage`, `CeremonyStatus`, `CeremonySession` |
| `seven-rings.ts` | 231 | Seven Emerald Rings |
| `index.ts` | 24 | barrel |

Plus `lib/healing/wound-tracker.ts` (343) and `lib/community/community-service.ts` (616).

This is a **human healing ceremony** — recovery, vulnerability, Wellbriety — not the
**research ceremony** MW encodes (smudging, talking circle, spirit feeding, opening,
closing; Wilson's Indigenous research paradigm). MW's `CeremonyType` union is closed at
five and `NodeType` at six (`W`, CLAUDE.md — *"The `NodeType` union is closed at six and
stays closed"*). STPB's four movements cannot be expressed in it. **Forcing STPB's
ceremony into `ceremony-protocol` would be the relabeled-extraction failure the workspace
docs warn about.** So: LEAVE `lib/ceremony/`.

Two adjacent files are different, and these are the real answer to the question:

| STPB file | Lines | MW equivalent | Verdict |
|---|---|---|---|
| `lib/ceremony/sacred-container.ts` | 327 | `@medicine-wheel/consent-lifecycle` — its config is consent-shaped: `new_stories_private_by_default`, `explicit_sharing_consent_required`, `data_retention_days`, `hide_engagement_metrics` | **Should consume.** This is OCAP by another name. |
| `lib/community/community-service.ts` | 616 | `@medicine-wheel/community-review` — circles, witness, share-story; routes at `app/api/community/circles/[circleId]/{join,invite,stories}` and `/witness` | **Should consume** the circle and talking-circle primitives. |

And `app/commitment`, `app/journey`, `app/reflection`, `app/insight`, `app/wisdom` are
each a single `page.tsx` with no lib of their own — they render the ceremony state
`lib/ceremony/` holds. They are views, not a duplicated lifecycle.

---

## Dependency direction rule

**The rule: `@medicine-wheel/*` must never depend on `@miadi/*`. `@miadi/*` may depend on
`@medicine-wheel/*`. Neither may depend on the other's application layer.**

The brief asked me not to assume the inverse because it sounds tidy, so here is the
argument, and where I would break the rule.

**Why this way, on evidence.**

1. **The graph is already acyclic and one-directional-capable.** `X`: no `@miadi/*`
   package depends on any `@medicine-wheel/*` package, and no MW package depends on
   `@miadi/*`. There is no cycle to preserve or break — this is a free choice, made once.
2. **Ontological containment.** MW encodes what is true of a relational ontology
   regardless of application: four directions, six node types, five ceremony types, OCAP,
   Wilson alignment. `@miadi/episodic-memory-schema` encodes what is true of *the Miadi
   chronicle's folder layout*. The first is a vocabulary; the second is one corpus in it.
   A vocabulary that imports one corpus's file format stops being a vocabulary.
3. **Consumer count.** MW has three named consumers (Miadi, medicine-wheel-guillaume,
   STPB) plus mcp and forgewright. `@miadi/*` has one. Depending downward from the
   many-consumer package to the one-consumer package would make every MW release wait on
   Miadi's.
4. **Release cost is asymmetric.** MW moves 27 packages in lockstep (below). `@miadi/*`
   packages version independently (`inquiry-weave` 0.8.3, `plan-insight` 0.3.2,
   `attention-ui` 0.1.2, `composition-to-episode` 0.2.0). Putting a lockstep suite
   downstream of independently-versioned packages means every `@miadi` patch can force a
   27-package MW republish.

**Where I would break it, and why I do not need to.** The honest case for MW depending on
`@miadi/*` is the chronicle read-model: `buildChronicleCatalog` in `@miadi/inquiry-weave`
is genuinely good, MW's own `app/` has no equivalent, and the wheel's episode nodes are
chronicle episodes. If the wheel ever needs to *walk the chronicle*, it will want that
code.

It does not need to, because the coupling is data, not code. The wheel stores chronicle
episodes as `knowledge` nodes with `metadata.kind` and `metadata.parent_id`
(`app/api/nodes/route.ts:20-31`, `X`) — a discriminator on a closed type, exactly the
mechanism CLAUDE.md prescribes. Miadi builds the catalog and *writes nodes to the wheel*.
The wheel never reads a chronicle folder. Keep it that way.

**Corollary for the extraction work above.** N1 `@medicine-wheel/client` must not know
what an episode is. It moves `RelationalNode`, `RelationalEdge`, `CeremonyLog`,
`NarrativeBeat` over HTTP. `metadata.kind: "chronicle_episode"` is a string to it. This is
the same discipline `@miadi/attention-ui` already states for itself.

---

## The publish reality

`X` — `RELEASING.md`, `scripts/bump-versions.mjs`, `scripts/publish-workspaces.mjs`, root
`package.json`, and the `npm view` loop.

### Verifying the three `W` claims from CLAUDE.md

| Claim | Verdict | Evidence |
|---|---|---|
| Suite moves in lockstep on `0.x` | **HOLDS, with one exception** | All 26 + root at 0.6.4 (`X`, npm loop). `bump-versions.mjs:41-43` bumps every workspace not in `TRACKED_PACKAGES`, and `INDEPENDENT_PACKAGES` is `new Set()` — empty, with a comment saying so on purpose. **Exception: bare `medicine-wheel` at 1.0.5** (F1) — outside `workspaces`, so `getWorkspacePackages()` never sees it. |
| `mcp` on `4.x`, tracking suite minor/patch | **HOLDS** | `bump-versions.mjs:26` `TRACKED_PACKAGES = new Map([['@medicine-wheel/mcp', 'mcp']])`; lines 66-88 preserve the major and take suite minor.patch. Measured: suite 0.6.4, mcp 4.6.4. The trap the file documents (reading the suite version from the root, which does not move) is actually guarded — line 62-66 reads from `workspaces[0]`, a package just bumped. |
| `workspaces` is topological, not alphabetical | **HOLDS** | `ontology-core` first, `mcp` last; `infra`, `creative-orientation`, `session-reader` before their dependents. Not alphabetical (`infra` at index 1, `brainstorming` at 17). The `"//workspaces"` key above the array states the rule in-file. |

All three claims survive checking. That is worth stating plainly given F0: the release
machinery is the best-documented and most accurate part of this repo. The issue tracker is
the worst.

### What a publish-and-consume cycle actually costs

From `RELEASING.md`'s 8 steps (`W` as a procedure, but each step is a real command):

1. `bump-versions.mjs` + `sync-versions.mjs` — **all 27 packages move**, whether or not
   they changed.
2. `version:patch` also runs `shx rm -rf node_modules src/*/node_modules package-lock.json
   && npm install --legacy-peer-deps` — a **full clean reinstall of a 27-workspace tree**,
   every release, from the root script itself.
3. `npm run build:packages` (topological, 27 tsc runs) + `build:cli` + `vitest run`.
4. `publish:all` — 27 `npm publish` calls, serial (`publish-workspaces.mjs:28-34`), then
   the root.
5. `curl` the registry directly, because **`npm view` serves stale cache for minutes**
   after a publish (`W`, and it has caused a real `ETARGET` — I relied on `npm view` for
   the table above, which is safe only because I published nothing).
6. `npm i -g` — **atomic across arguments**: one bad spec and nothing installs.
7. Run the *installed* binary. Non-negotiable; it is the only step that catches an
   undeclared dependency.
8. On failure: fix, **bump again**, repeat from 1. Never annotate a broken version.

Then, per `RELEASING.md`'s closing section, the version must reach **three** places:
registry, global installs on each host, and every running process — *"None of these update
themselves."* And CLAUDE.md (`W`, and correct as engineering): a live MCP server or `next
start` holds its old build; restarting it is a decision with an owner, not a cleanup.

**Cost, stated as a rule for the phase plan.** A publish is a ~27-package lockstep event
with a mandatory clean reinstall, a serial publish loop, a global-install verification, and
a per-host and per-process rollout with a named owner. It is not free and it is not
parallel.

**Two consequences the phases below obey.**

- **Batch by cycle, never by package.** Three packages changed in one cycle cost the same
  as one. A phase that publishes twice costs twice, regardless of how little it changed.
- **`^0.6.1` is doing real work right now.** Miadi's caret ranges already resolve to 0.6.4
  (`X`), so **a pure-addition release reaches Miadi at its next install with no
  package.json edit**. `medicine-wheel-guillaume` does not get this: it pins
  `"@medicine-wheel/ontology-core": "0.6.0"` **exactly** (`X`,
  `/workspace/repos/jgwill/medicine-wheel-guillaume/package.json`). It is four patches
  behind and will stay there until someone edits that line. It also runs Next 16.1.6 /
  React 19.2.4 against MW's Next 15.3 / React 19.0 — fine for `ontology-core` (zero peers,
  it only imports `DIRECTIONS` and `Direction` in `components/medicine-wheel-section.tsx:4`),
  but it is the constraint to check before offering it `ui-components` or `graph-viz`,
  which peer-depend on react.

---

## Phase proposal

Four phases. Two npm publishes total. Ordering is forced by the publish cost, not by
preference.

### Phase 1 — Stop the drift, no publish

**Packages touched:** none in `src/`. Edits land in `/src/Miadi` only.

**Deliverable:** `/src/Miadi/app/chronicle/lib/theme.ts` imports `DIRECTIONS`,
`OJIBWE_NAMES`, `DIRECTION_COLORS` from `@medicine-wheel/ontology-core` instead of
redeclaring them (R1), keeping its own `glyph` and `ArcKey`/`THEMES`, which MW does not
own. `/src/Miadi/types/ceremony.ts` imports `StructuralTensionChart` from `ontology-core`
in place of the local `StructuralTension` (R4).

**Unblocks in `/src/Miadi`:** the west-colour split (`#5b78b4` vs `#1a1a2e`) becomes one
value; the chronicle surface starts consuming the ontology it illustrates.

**Publish needed:** **No.** Miadi's `^0.6.1` already resolves to 0.6.4.

**Ordering:** first because it costs one install and zero release cycles, and because it
converts "Miadi depends on MW" from a lockfile fact into a code fact — which is the
premise everything after it assumes.

### Phase 2 — Make the surface reachable, one publish → 0.7.0

**Packages touched:** `storage-provider` (E1, E2), `ontology-core` (E3), NEW
`@medicine-wheel/client` (N1).

**Deliverable:**
- `storage-provider` gains an `exports` map with `./interface`, `./jsonl`, `./neon` (F3),
  and a sync read path for the JSONL backend (E2).
- `ontology-core` gains Zod schemas for `ProductionRelation`, `InfraEntityKind`,
  `AcademicEntityKind`, `AcademicAppointment`, `AcademicRelation` (F2/E3).
- `@medicine-wheel/client` is created from `mcp/src/http-store.ts` +
  `mcp/src/store.ts:22-41` + `app/lib/{ceremony,beat,cycle}-response.ts`. `mcp` is
  rewritten to depend on it. Goes into `workspaces` **after `ontology-core`, before
  `mcp`** — the array is topological (verified) and a wrong position fails `TS2307` on a
  clean tree.

**Unblocks in `/src/Miadi`:** `types/ceremony.ts:15-20` deletes its copied
`CeremonialPhase` and imports `@medicine-wheel/storage-provider/interface` (R2);
`lib/mw-store.ts` can offer sync reads; any Miadi route can talk to the wheel's HTTP API
with a typed client and normalizers instead of a fourth hand-rolled fetch (F6).

**Publish needed:** **Yes — one cycle.** New package + new exports + new schemas. Minor
bump: `0.7.0` / mcp `4.7.0`. `client` is additive; the `exports` and schema additions are
backward-compatible.

**Ordering:** must precede Phase 3, because Phase 3's ceremony work needs a persistence
seam that is reachable by subpath and a client that can carry it. Batched into one cycle
precisely because a cycle costs the same for three changes as for one.

### Phase 3 — Wire the ceremony packages that are already ready, no publish

**Packages touched:** none in `src/`. Consumption work in `/src/Miadi`, and optionally
`/src/STPB`.

**Deliverable:** `/src/Miadi/lib/ceremonial-spiral.ts` (423 lines) has its consensus and
talking-circle logic replaced by `@medicine-wheel/community-review`'s `seekConsensus`,
`talkingCircle`, `recordVoices`, `resolveDisagreement`, keeping its Redis persistence as
the storage adapter (R3). Sharing/privacy defaults move to
`@medicine-wheel/consent-lifecycle`. This is the direct answer to William's line, for the
half of it that is wiring rather than building.

**Unblocks in `/src/Miadi`:** ~400 hand-rolled lines get 10 Zod schemas behind them, and
four packages stop being dead weight in `package.json:42-48` (F4).

**Publish needed:** **No.** Both packages are pure, synchronous and schema-backed (F7) —
nothing needs to change in them to be consumed.

**Ordering:** after Phase 2 because the storage seam is what makes the pure functions
persistable; before Phase 4 because it proves consumption works on the easy packages
before anyone redesigns a hard one. If Phase 4 slipped indefinitely, Phase 3 would still
have delivered most of what William asked for.

### Phase 4 — Make `ceremony-protocol` consumable, one publish → 0.8.0

**Packages touched:** `ceremony-protocol` (E5), NEW `@medicine-wheel/structural-tension`
(N2, issue #103), `ui-components` (E4).

**Deliverable:** `ceremony-protocol` gains a ceremony record with a lifecycle over
`StorageProvider` and a Zod schema — the thing F7 shows it does not have. STC logic moves
out of `mcp/src/tools/structural-tension.ts` into its own package. `ui-components` gains a
direction panel and a usable `tokens.css` path.

**Unblocks in `/src/Miadi`:** `app/ceremony/*` can open, record, and close a ceremony
against the wheel instead of against Redis. Unblocks STPB's `sacred-container.ts` and
`community-service.ts` adopting MW consent and circle primitives.

**Publish needed:** **Yes — one cycle.** Minor bump: `0.8.0` / mcp `4.8.0`.

**Ordering:** last, and **blocked on a decision, not on code.** The four-vocabulary
conflict (F7) must be settled before a ceremony record can pick a phase type. That is a
knowledge holder's call. Engineering can prepare everything else and stop at the type.

### Also, whenever a cycle is open

`src/_` (bare `medicine-wheel`, 1.0.5, `main: index.js` pointing at nothing, outside
`workspaces`) is F1 — the exact hazard `RELEASING.md` documents. It costs nothing to fix
inside a cycle that is already running and cannot be fixed without one. Decide whether it
is deprecated or brought into lockstep; do not leave it at 1.0.5 above a 0.x suite.

---

## What would falsify this

Specific, runnable. Each names what it would overturn.

1. **F6 — is there really no HTTP client?**
   `grep -rn "fetch(\|axios\|got(" /workspace/repos/jgwill/medicine-wheel/src/*/src/`
   Any hit falsifies N1's premise. I searched `src/*/src/` only; a client in `cli/` or
   `lib/` that I classified as app-layer would change the extraction target, not the
   verdict.

2. **F4 — are the 19 packages really unimported?**
   `cd /src/Miadi && grep -rn "@medicine-wheel/" --include=*.ts --include=*.tsx --include=*.mjs .`
   with **no** `node_modules` filter, then inspect hits. I excluded `node_modules` and
   `dist`; a build artifact or generated file importing them would mean the dependency is
   live in a way source-grep cannot see.

3. **F7 — is `ceremony-protocol` really unpersistable?**
   `npm i @medicine-wheel/ceremony-protocol@0.6.4 && node -e "const c=require('@medicine-wheel/ceremony-protocol'); console.log(Object.keys(c))"`
   from a scratch dir. If the published surface has anything the source `index.ts` does not
   (it should not — same build), the "make it consumable first" verdict weakens.

4. **The publish cost claim.** `npm run publish:dry` from the repo root, timed. That
   exercises `prepublishOnly` (clean + build all + build:cli) and 27 dry publishes without
   touching the registry. If it runs in a couple of minutes, my "batch by cycle" ordering
   is over-cautious and phases could split. **This writes `dist/` via `prepublishOnly`, so
   it is outside my scope boundary — the coordinator or William must run it.**

5. **The `^0.6.1` assumption in Phase 1.** `cd /src/Miadi && npm ls @medicine-wheel/ontology-core`
   (or `pnpm why`). If the lock pins 0.6.1 rather than resolving to 0.6.4, Phase 1 needs a
   dependency bump and stops being publish-free.

6. **`npm view` freshness.** `curl -s https://registry.npmjs.org/@medicine-wheel%2Fapp | python3 -c "import json,sys;print(json.load(sys.stdin)['dist-tags']['latest'])"`
   `RELEASING.md` says `npm view` lies from cache. My whole table used `npm view`. A
   mismatch on any package would mean some are not at 0.6.4.

7. **STPB's dead submodule.** `git -C /src/STPB submodule status lib/medicine-wheel` and
   `git -C /src/STPB log -1 --format=%ci -- lib/medicine-wheel`. If it has moved recently,
   "vendored six months ago and abandoned" is wrong and STPB's relationship to MW is
   something else.

8. **The direction-colour drift.** `grep -rn "5b78b4\|1a1a2e" /src/Miadi /workspace/repos/jgwill/medicine-wheel --include=*.ts --include=*.tsx --include=*.css`
   If `#5b78b4` also appears in MW, the two are not in conflict and R1 is cosmetic.

---

## Open questions for William

Only the ones that change the work.

**Q1. Which ceremony phase vocabulary is canonical?** Four are live (F7): `ontology-core`'s
`opening|council|integration|closure`, `storage-provider`'s Ojibwe five, Miadi's copy of
the Ojibwe five, and STPB's `preparation|moment|integration|transmission`. **Phase 4 cannot
start without this answer**, because a persisted ceremony record must have one phase type.
This is a knowledge holder's call, not an engineer's, and I have not made it. It may also
be that all four are correct at different altitudes — as JGWILL.md already says of
`DIRECTIONS` versus `DIRECTION_INFO` — in which case the deliverable is a named
translation, not a merge.

**Q2. Is STPB a consumer or a fork?** Its MW submodule is six months stale and unwired
(F8). Three readings, and they lead to different work: (a) reconnect it as an npm
consumer, deleting the submodule; (b) it is an independent ceremony tradition that should
borrow only `consent-lifecycle` and `community-review`; (c) it is dormant and out of scope
now. My reading of the evidence is (b), but the submodule says someone once intended (a).

**Q3. What is `src/_` / the bare `medicine-wheel@1.0.5` for?** It is outside `workspaces`,
above the suite version, and its `main` points at a file that does not exist (F1). If it
is a deliberate install-everything alias it needs bringing into lockstep; if it is
residue it should be deprecated on npm. Either is cheap inside a cycle already running,
and neither is possible without one.

**Q4. Does `@medicine-wheel/app` want to be importable, or is it a bin?** Today it is both
and neither (F5). If Miadi is meant to import anything from it, it needs an `exports` map;
if not, it should stop shipping `app/**`, `components/**` and `lib/**` as an unreachable
payload and Phase 2's extraction is the whole answer.

**Q5. Should `medicine-wheel-guillaume` be pulled forward off its exact `0.6.0` pin?** It
is the only consumer that will not receive a release automatically. It runs Next 16 /
React 19.2 against MW's Next 15.3 / React 19.0 — irrelevant for `ontology-core`, which is
all it uses, but decisive if it is ever offered `ui-components` or `graph-viz`. Note also
that its `components/work-section.tsx:22` tells readers there are "Seven packages
published on npm under the @medicine-wheel/ scope"; there are 28. That is public-facing
copy, so correcting it is William's call, not mine.

---

## Lane boundaries touched

- **L1 (community review/choice):** `@medicine-wheel/community-review` appears here only
  as an export-surface finding — it is pure, synchronous, 10 Zod schemas, and unconsumed
  while Miadi hand-rolls consensus (R3, F7). The *design* of community choice is L1's.
- **L3 (graph navigation, episode viewing UX):** I classify `app/lib/graph-layout-storage.ts`
  and `graph-animation-storage.ts` as LEAVE (Group C), and note `@medicine-wheel/graph-viz`
  peer-depends on `react`/`react-dom`/`@xyflow/react` — relevant if L3 proposes consuming
  it from a React 19.2 host. Both are export-boundary observations only.

---

🧠 The wheel's packages are all published and all in lockstep; what is missing is not code
but reach — no HTTP client, no `exports` map on the one package with persistence, and
schemas on 5 of 26. Miadi declares 24 packages and imports 5.

🌸 Someone maintaining Miadi today writes ceremony code by hand that already exists,
tested, four directories away, and nothing in either repo tells them so.
