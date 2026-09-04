# VALIDATION — adversarial check of EXECUTION.md, 2026-09-03

Source classes: `X` executable (command run, output cited), `W` written (a document claims
it), `A` inference. EXECUTION.md, the three lane files and COORDINATOR-FINDINGS.md are all
`W`. Everything below marked `X` was re-run in this lane from
`/workspace/repos/jgwill/medicine-wheel` unless another cwd is named.

---

## Model class

**Opus 5** (`claude-opus-5`).

> **Read the addendum at the foot of this file before acting on any finding.** Execution
> began in parallel with this validation. Six items are already resolved; six are still live.

---

## Claims that did not reproduce

Eleven. Two of them (F2, F3) change what step 8 and step 5 should do.

### F1 — `belongs_to` has **2** uses, not 41

EXECUTION.md step 8: *"Uses `part-of` — already 33 uses against `belongs_to`'s 41."*

```
$ jq -r '.relationship_type' /srv/miadi/episodes/miadi-chronicle/.mw/store/edges.jsonl \
  | sort | uniq -c | sort -rn | head -6
     41 binds-port
     36 relates_to
     33 part-of
     12 continues_from
      5 documented_in
      4 speaks-with
...
      2 belongs_to
```

`part-of` = 33 `X`. `belongs_to` = **2** `X`. The 41 is `binds-port`, the top line of the
same listing. The comparison the plan uses to justify its choice is a misread of its own
evidence.

### F2 — `part-of` is the wrong relation for these 101 edges (this is F1's real cost)

The plan asserts `part-of` is the containment sense and `belongs_to` is episode→chronicle
membership. The direction of that reading is right; the conclusion is backwards for **this
set of edges**. Measured `X`:

```
$ jq -c 'select(.relationship_type=="part-of")|{from_id,to_id}' edges.jsonl | head -3
{"from_id":"node:human:tenant:mia-node-land-host-gaia","to_id":"node:land:host:gaia"}
{"from_id":"node:knowledge:service:iaip-server...","to_id":"node:human:tenant:mia-..."}
{"from_id":"node:knowledge:service:iaip-tailscale...","to_id":"node:human:tenant:mia-..."}
```

All 33 `part-of` edges are **infrastructure** containment: tenant→host, service→tenant. Not
one touches an episode.

And the 5 parent_id pairs that *are* already materialised use the other two names (python,
matching each node's `metadata.parent_id` against the edge list):

```
nodes with parent_id: 106
already materialised: {'belongs_to': 2, 'documented_in': 3}   distinct froms: 5
missing count: 101
missing child kinds: {'chronicle_episode': 78, 'attention': 22, 'chronicle_episode_legacy': 1}
missing by parent:   {'chronicle:miadi-chronicle': 79, <6 episode parents>: 22}
parent ids NOT present as nodes: set()
```

So the 101 split into **79 episode→`chronicle:miadi-chronicle`** — for which the existing
precedent is `belongs_to`, both of whose 2 uses are exactly that pair — and **22
attention→episode**, whose only sibling precedent is `documented_in` (3 uses,
structured-plan→episode).

Writing `part-of` would put a third vocabulary on a relation that already has one, and would
contradict the two `belongs_to` edges and commit `bbe2d08` *"Make ceremony belonging directly
queryable"*.

### F3 — `metadata.is_review_circle` appears on **zero** rows in the live store

EXECUTION.md step 5: *"keeping the old flag as a **read alias** — existing rows carry it."*

```
$ grep -rc is_review_circle /srv/miadi/episodes/miadi-chronicle/.mw/store/
nodes.jsonl:0   edges.jsonl:0   ceremonies.jsonl:0   beats.jsonl:0
captures.jsonl:0  cycles.jsonl:0  inquiry-weaves.jsonl:0  plan-perspectives.jsonl:0
```

**Corrected after a wider sweep — and the correction is worse for the plan, not better.**
Rows carrying the flag *do* exist. They are in the wrong wheels. Eleven `.mw/store` node
files exist on this host `X`:

```
/srv/miadi/episodes/miadi-chronicle/.mw          nodes=205   is_review_circle=0
/home/mia/workspace/chronicles/miadi/…/.mw       nodes=89    is_review_circle=0
/workspace/repos/jgwill/Miadi/.mw                nodes=49    is_review_circle=1
/workspace/repos/miadisabelle/mightyeagle/.mw    nodes=49    is_review_circle=1
/home/mia/Miadi/.mw                              nodes=49    is_review_circle=1
/home/mia/workspace/repos/jgwill/Miadi/.mw       nodes=49    is_review_circle=1
/home/mia/.openclaw/…/Miadi-431-run/.mw          nodes=23    is_review_circle=1
/workspace/repos/jgwill/medicine-wheel/.mw       nodes=16    is_review_circle=0
+ 3 more with 1-8 nodes, all 0
```

All five hits are the **same single row**, replicated because those folders are copies of one
store `X`:

```
id        circle-1780507850023-e5toce
type      knowledge          created  2026-06-03T17:30:50.023Z
kind      NONE               circle_status  gathering
artifact  cycle-1780507736849-zbh6vr / research
```

One review circle has ever been opened, on 2026-06-03. It is still in `gathering` — exactly
the dead end L1 predicted, since no tool exists to advance it. It carries no `metadata.kind`.
And it landed in a **Miadi-local decoy store, not the chronicle**.

So the read alias should stay — but for the opposite reason the plan gives. It is not
"existing rows carry it" in the store being repaired (0 there `X`); it is that the one row
that exists is evidence of a misrouted write. See B14.

### F4 — chronicle root degree before the repair is **3**, not 2

```
BEFORE components 82  isolates 75  root degree 3
AFTER  components 26  isolates 22  root degree 82
```

`82 → 26` `X` and `75 → 22` `X` both reproduce exactly. Only the root-degree start value is
off.

### F5 — `app/lib/` does not exist

Step 2 builds `client` from *"`app/lib/{ceremony,beat,cycle}-response.ts`"*.
`ls app/lib` → `No such file or directory`. The files are at repo root: `lib/ceremony-response.ts`,
`lib/beat-response.ts`, `lib/cycle-response.ts` `X`.

### F6 — `/src/Miadi/lib/mw-store.ts` is not a hand-rolled HTTP client

Step 2: *"`/src/Miadi/lib/mw-store.ts` (30 hand-rolled lines) becomes a thin wrapper over the
typed client."* It is 30 lines `X`, and every one of them wraps
`@medicine-wheel/storage-provider`:

```ts
import { createProvider, type StorageProvider } from '@medicine-wheel/storage-provider';
export function getMwStore(): Promise<StorageProvider> { ... createProvider() ... }
```

It reaches the `.mw/store` **directly** (jsonl or neon). There is no `fetch` in it. See B5 —
converting it to an HTTP client is a regression, not a consumption.

### F7 — the `AuthUser` the plan names is not the one the RBAC layer uses

Plan: `AuthUser` at `lib/auth-token.ts:17-22`. Actual `lib/auth-token.ts:16-21` `X`. And
STPB has **three** `AuthUser` declarations `X`:

```
lib/auth-token.ts:16     email?: string
lib/auth-helper.ts:10    email: string          name?: string | null
app/api/story-beats/route.ts:8
```

`lib/auth/rbac-middleware.ts:6` imports `AuthUser` from `@/lib/auth-helper`, not from
`auth-token`. The two shapes disagree on whether `email` is optional. `auth-helper.ts` also
re-exports `requireRole`/`requireRoleLevel`/`AuthContext` **from** `rbac-middleware`, which
imports **from** `auth-helper` — a live circular import.

### F8 — `StoryCircle` is `lib/community/types.ts:54-92`, not `54-97`

`grep -n` `X`: `StoryCircle` opens at 54 and closes at 92; 93-119 is `CollectiveInsight`.

### F9 — `PersonRole` is `src/community-review/src/types.ts:14-21`, not `17-23` `X`

### F10 — the lineage backfill numbers do not reproduce under any stated definition

Plan: *"Backfill ~170 `lineage:` entries (59 edges exist)."* Measured `X`: 75 `episode.yaml`
files carry a `lineage:` block, holding **242** list items. Lineage-shaped edges
(`continues_from|continues-from|continued_by|descends_from|BORN_FROM`) = **17**. 59 is
reachable only by also counting `relates_to`, `documented_in` and `informed_by` as lineage,
which is a choice the plan does not state. Not blocking; re-measure before sizing the work.

### F11 — `ProductionRelation` is at `types.ts:521`, not inside `501-506` `X`

`501-505` is the comment block; `ProductionEntityKind` is `506-514`; `ProductionRelation`
opens at `521`. The substantive claim reproduces: `grep ProductionRelation
src/ontology-core/src/schemas.ts` returns nothing, and both types are exported at
`index.ts:46-47`. **Issue #90 is genuinely undone.**

### What did reproduce (spot list, all `X`)

Suite `0.6.4` / mcp `4.6.4` on the registry, including `perception-layer`, `narrative-cluster`,
`infra`, `app`, `community-review` — so #86, #87 and #116 do describe shipped work.
`grep -rln "fetch(" src/*/src/` → empty (exit 1). `mcp` exports exactly `.`, `./all-tools`,
`./types`, no `types` field. `http-store.ts` = 745 lines. `storage-provider` is the only
`@medicine-wheel/*` package without an `exports` map; `ontology-core` has seven.
Root `zod: ^3.23.0` is present, so **#107 describes a condition that does not hold**.
`src/_/package.json` = `medicine-wheel@1.0.5`, `main: index.js` with no `index.js`, outside
`workspaces`, and published (`npm view medicine-wheel version` → `1.0.5`).
STPB's `.gitmodules` names only `llms`; `lib/medicine-wheel` is gone.
106 nodes carry `metadata.parent_id`, 5 materialised, 101 missing, no dangling edges, no
duplicate node ids. `CeremonialPhase` **is** re-exported at `storage-provider/src/index.ts:31`.
`neighborhood` is at `relational-query/src/traversal.ts:217` and is imported by nothing
outside its own `index.ts`. West colour split confirmed: `#5b78b4` (Miadi theme.ts) vs
`#1a1a2e` (`ontology-core/constants.ts:67`). All three new package names are free
(`npm view` → E404 on `client`, `community-identity`, `community-choice`). Issues #83 #86
#87 #90 #103 #105 #107 #113 #116 all OPEN.

---

## Blocking findings

### B1 — six steps each say "Publish `0.7.0`". Only one of them can. (steps 1-6)

The suite is lockstep and `publish:all` publishes **every** workspace:

- `scripts/publish-workspaces.mjs` iterates `getWorkspacePackages()` with
  `INDEPENDENT_PACKAGES = new Set()` — deliberately empty — and calls
  `execFileSync('npm', ['publish','--workspace',…])` with no skip-if-exists.
- `npm publish` over an existing version exits non-zero; `execFileSync` throws; the loop
  aborts. The **second** `publish:all` at `0.7.0` therefore dies on the first package and
  publishes nothing.

Worse, a mid-loop failure is not resumable: packages published before the failure cannot be
re-published at the same version, so recovery requires a fresh bump of the whole suite.

**Do instead:** state one of these explicitly in the plan and follow it.
(a) One release, at the end: steps 1-6 land as source changes, then a single
`version:minor` + `publish:all` + `RELEASING.md` steps 5-7. Simplest, and it matches the
lockstep design.
(b) A patch per step: `0.7.0`, `0.7.1`, `0.7.2`, … with `bump-versions.mjs patch` between
each. Six full publish cycles of 30 packages; only worth it if a step must be installed
before the next can be written.

### B2 — a new package born at `0.0.0` hard-fails the version chain before any publish (steps 2, 3, 4)

`npm run version:minor` = `bump-versions.mjs minor && sync-versions.mjs && rm -rf node_modules && npm install`.

`bump-versions.mjs` runs `npm version minor` across every workspace, so a package created at
`0.0.0` becomes `0.1.0` while the rest go `0.6.4 → 0.7.0`. `sync-versions.mjs` then:

```js
const lockstepVersions = new Set(lockstepEntries.map(([, v]) => v));
if (lockstepVersions.size > 1) { console.error('❌ ERROR: Not all lockstep packages …'); process.exit(1); }
```

Exit 1 breaks the `&&` chain. Nothing is synced, nothing is installed, nothing is published,
and the tree is left with mixed versions.

**Do instead:** create each new `package.json` with `"version": "0.6.4"` — the current suite
version — so the minor bump lands it on `0.7.0` with everything else. Verify with
`node scripts/sync-versions.mjs` (read-only until it writes) before bumping.

### B3 — `workspaces` does not imply root `dependencies`, and the release detector does not look where step 5 writes

`sync-versions.mjs` only rewrites versions of dependencies **already listed**. It never adds
one. Measured `X`:

```
workspaces: 27   root deps declaring them: 23
IN workspaces but NOT in root dependencies:
  @medicine-wheel/infra  @medicine-wheel/brainstorming
  @medicine-wheel/gap-analysis  @medicine-wheel/creative-problem-solving
```

Harmless today — the RELEASING.md detector run against the current tree returns
`MISSING from dependencies: none`, because `dist/cli` only requires `creative-orientation`
and `narrative-engine`.

Step 5 adds `app/api/choice-sets/route.ts` importing `@medicine-wheel/community-choice`. The
root package publishes `app/**/*` and `mwsrv` runs it. If the root `dependencies` do not gain
`community-choice` (and `client`, and `community-identity` wherever `app/` or `lib/` uses
them), `@medicine-wheel/app@0.7.0` reproduces the 2026-08-02 defect exactly.

**And the guard will not catch it:** RELEASING.md's detector walks `dist/cli` only. Extend it
to `app/` and `lib/` in the same change, or the procedure that exists to prevent this class of
bug is blind to the place this plan introduces it.

### B4 — `^0.6.1` does not resolve to `0.7.0`, and Miadi pins **24** packages that way

```
$ npx semver -r '^0.6.1' 0.7.0 0.6.9
0.6.9
```
`X` — `0.7.0` is not printed. Caret on a `0.x` version pins the minor.

Step 1 widens two ranges. Miadi declares 24 `@medicine-wheel/*` at `^0.6.1` `X`. Widening
only `ontology-core` and `storage-provider` puts Miadi on `0.7.0` for those two and `0.6.x`
for the other 22 — including `graph-viz`, `ui-components`, `ceremonial-diary` and
`github-ceremony`, which all depend on `ontology-core` and would each pull their **own**
`0.6.4` copy of it under `node_modules`. Two ontology-cores in one process, with a
`DIRECTION_COLORS` change between them.

**Do instead:** widen all 24 to `^0.7.0` in one edit, or widen none until the whole set moves.

### B5 — step 1's "consume" is not a mechanical import, and half of it is a UI regression

Two separate problems.

*Shape.* `/src/Miadi/app/chronicle/lib/theme.ts` exports
`DIRECTIONS: Record<DirectionKey, {key,label,oj,gloss,color,glyph}>`.
`ontology-core` exports `DIRECTIONS: Direction[]` with `ojibwe`, `season`, `lifeStage`,
`ages`, `medicine[]`, `teachings[]`, `practices[]` and **no** `gloss` `X`. Record vs array,
`oj` vs `ojibwe`, and `"Vision · Spring"` has no source in the wheel. Every call site changes.

*Colour.* `theme.ts`'s own header states the design **commits** to a `#151515` ground
regardless of app theme. `DIRECTION_COLORS.west` in ontology-core is `#1a1a2e` `X`. Adopting
it paints west near-black on near-black. Miadi's `#5b78b4` exists because the Chronicle is
dark.

Ending the west split is a design decision that has to go the other way (ontology-core adopts
a legible west) or not at all. It is not a mechanical dedup, and it should not be done
silently inside a release step.

### B6 — step 8 must write `belongs_to`, not `part-of`

Per F1/F2. Concretely: 79 edges `episode → chronicle:miadi-chronicle` as `belongs_to`
(matching the 2 that exist); the 22 `attention → episode` edges need an explicit choice —
`documented_in` is the only precedent for a child artefact pointing at an episode. Skip the 5
pairs that already have an edge; do not double-edge them.

### B7 — write through the store's lock, and snapshot first (step 8)

`mcp/src/jsonl-store.ts:11` documents `flush()` as *"file lock + read-modify-write —
concurrent writes merge"*; `src/storage-provider/src/jsonl.ts` carries the same lock at
`:643`/`:724`. No `.lock` file is present right now `X`. A raw append script bypasses that.

There are **five** live medicine-wheel MCP servers on this host, not one. `ps` `X`:

```
3016652  17d   npm exec @medicine-wheel/mcp@4.6.1   (claude, /home/mia/workspace/.mcp.json)
 737610   3d   npm exec @medicine-wheel/mcp@4.6.3
1148313  12d   npm exec @medicine-wheel/mcp@4.6.3
2123845   3d   npm exec @medicine-wheel/mcp@4.6.3
 796023   6h   npm exec @medicine-wheel/mcp@4.6.3   (claude, mcp-config-mw-ilex.json,
                                                     --add-dir /srv/miadi/episodes/miadi-chronicle)
```

Every one carries `MW_API_URL=http://127.0.0.1:8040` `X`. Per `mcp/src/store.ts` that routes
them all to `HttpStore`, and nothing listens on 8040 — so none is a competing JSONL writer,
and **every MCP write any of them has attempted has failed**, for between 6 hours and 17 days.
Three versions are in the field (4.6.1, 4.6.3) against a published 4.6.4.

Also live and not to be disturbed: tmux sessions `mw-film-prod-concordia` (3d) and
`mw-guillaume-260831` (5h) `X`.

Something else *does* write the chronicle JSONL directly: `nodes.jsonl` mtime
`2026-09-03 15:14`, `edges.jsonl` `15:12` `X`. That writer is unidentified and is the real
concurrency risk for step 8.

**Do:** copy `nodes.jsonl` and `edges.jsonl` before the repair; write through
`storage-provider`'s `createEdge` (which takes the lock), not a script; state the rollback —
restore the two files, or remove the 101 edges by id, both of which are only possible because
you took the copy.

### B8 — tests written inside `src/community-choice/` will not run (step 4)

`vitest.config.ts` `X`:

```js
test: { include: ['mcp/tests/**/*.test.ts', 'tests/**/*.test.ts'], testTimeout: 15000 }
```

The repo's 28 test files all live in root `tests/`. A test placed in the new package is
silently skipped and `npx vitest run` stays green — the exact failure shape
`pipeline-masks-the-exit` warns about, one level up. Put step 4's tests in `tests/`, or widen
`include` in the same commit.

### B9 — step 5's MCP verbs cannot be verified end to end from this seat

`mcp/src/store.ts` routes to `HttpStore` whenever `MW_API_URL` is set, and throws at startup
if it is malformed. The chronicle seat sets it to `http://127.0.0.1:8040`; `ss -ltnp` shows
nothing bound there `X` (re-confirmed this lane), and all five live MCP servers point at it
(B7). So `mw_register_review`,
`mw_choice_set_open` and the review-circle verbs would be written and published without a
single successful round trip.

**Do:** either schedule bringing 8040 up as a named step (it is a port and a relation — say
whose), or verify against a scratch `.mw/store` with `MW_API_URL` **unset** and report in the
release notes that the HTTP path was not exercised. Do not report step 5 as verified on the
strength of unit tests.

### B10 — do not publish STPB's token model as written (step 3)

`/src/STPB/lib/auth-token.ts` `X`:

```ts
const token = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64')
```
```sql
SELECT user_id, expires_at, scopes FROM api_tokens WHERE token = ${token} …
```

The token is derived from `Math.random()` (not cryptographic) plus two values an attacker
often knows, and it is stored and compared **in plaintext**. That is survivable inside one
app nobody is deploying. Publishing it under `@medicine-wheel/*` distributes it to every
community that installs the package, and npm versions cannot be withdrawn after 72 hours.

**Do:** the port takes a **hash** (`getTokenByHash(hash)`), minting uses
`crypto.randomBytes(32)`, and the plaintext token is returned to the caller exactly once and
never stored. This is a change to the extraction, not a follow-up.

### B11 — the `UserRole` ↔ `PersonRole` mapping is not total in either direction, and one loss is governance-bearing

The plan says the two are *"reconciled … a mapping function both directions, not a silent
merge."* Measured `X`:

| direction | value | target | what happens |
|---|---|---|---|
| STPB → review | `participant` | `community-member`? `contributor`? | two plausible targets, no rule |
| STPB → review | `emerging_guide` | — | none |
| STPB → review | `ceremony_facilitator` | — | none |
| STPB → review | `story_keeper` | — | none |
| STPB → review | `lighthouse_admin` | `steward`? | platform admin ≠ ceremonial steward |
| STPB → review | `eva_ai`, `integration_ai` | — | **non-human agents with no person role** |
| review → STPB | `elder` | — | **none** |
| review → STPB | `youth` | — | none |
| review → STPB | `contributor`, `community-member` | `participant` | 2 → 1, collapses |

`firekeeper` is the only total pair.

The governance-bearing one is `elder`. `src/community-review/src/consensus.ts` `X`:

```ts
const elderSpoke = circle.talkingCircleLog.some(
  (e) => e.speakerId === circle.elderValidator && e.role === 'elder',
);
emergingOutcome = elderSpoke ? 'approved-with-blessings' : 'deepen-required';
```

`elder` is the difference between a blessing and a request to go deeper. STPB has no elder.
Any mapping that manufactures one — from `firekeeper`, from `story_keeper`, from
`lighthouse_admin` — makes a platform role able to bless. A mapping that returns `null`
instead is honest, but then it is not the bidirectional total function the plan describes and
the plan should stop calling it one.

The other end is as bad in a quieter way: `eva_ai` and `integration_ai` are AI accounts. If
they map to any `PersonRole`, an AI can be counted in `seekConsensus`'s reviewer denominator.
The plan's own boundary rule for step 4 — *"connectors report numbers; they never produce a
`kind: 'member'` respondent"* — has no counterpart here.

**Do:** ship `mapRole` as `R | null` in both directions, name `elder` and the two AI roles as
deliberate holes in the type, and test the holes.

### B12 — the suite already ships **two** conflicting `PersonRole` types; the plan would make three

Nobody in the three lanes or the coordinator's survey found this. `X`:

```
src/ontology-core/src/types.ts:313     'steward' | 'contributor' | 'elder' | 'firekeeper'
src/ontology-core/src/constants.ts:169 export const PERSON_ROLES: PersonRole[] = [...4]
src/community-review/src/types.ts:14   …the same four plus 'community-member' | 'youth'
```

`community-review` imports `DirectionName`, `AccountabilityTracking` and `OcapFlags` from
`ontology-core` — and then **shadows** `PersonRole` with a wider union. A consumer that
imports both packages holds two symbols with the same name and incompatible domains, and TS
will happily accept `ontology-core`'s value where `community-review`'s is expected but not
the reverse.

Adding `MemberRole` makes it three vocabularies across three packages. Step 6 ("bind
community-review to community-identity's MemberRole") would make it three in a dependency
chain.

**Do:** resolve these two before introducing a third. Either `community-review` imports and
widens `ontology-core`'s type explicitly (`type PersonRole = OntologyPersonRole | 'community-member' | 'youth'`),
or `ontology-core` widens to six and `community-review` re-exports. Either is a small edit;
neither is optional if a fourth role concept is about to be published.

### B13 — zod 3 in the suite, zod 4 in the consumer

`X` every zod-carrying package in the suite declares `^3.23.0` (`ontology-core`,
`community-review`, `consent-lifecycle`, `importance-unit`, `infra`,
`transformation-tracker`, root). `/src/Miadi/package.json` declares `zod: "latest"` → 4.x,
and `packages/review-service/app` declares `^4.4.3`.

Steps 1, 3 and 4 are largely *"ship Zod schemas"*. Installed into Miadi, they arrive as a
nested zod 3 alongside the app's zod 4. Standalone `.parse()` still works; composition does
not — a zod-3 schema cannot be a field of a zod-4 `z.object`, `instanceof z.ZodType` fails,
and the inferred types diverge. The plan's whole step-1 rationale (runtime validation
consumers can use) is undercut by this.

**Do:** decide before publishing — either move the suite to zod 4, or declare zod as a
`peerDependency` with a range the consumer satisfies, or accept and document that MW schemas
are terminal validators and never composed. Pick one; do not discover it at install time.

### B14 — eleven `.mw` stores exist and the plan never names its write target (steps 5, 8)

`X` — eleven `.mw/store/nodes.jsonl` files on this host (listed under F3). Two look like a
chronicle: `/srv/miadi/episodes/miadi-chronicle` (205 nodes, the real one) and
`/home/mia/workspace/chronicles/miadi/miadi-chronicle` (89 nodes). The repo itself carries
`/workspace/repos/jgwill/medicine-wheel/.mw` with 16 nodes.

`mcp/src/store.ts` falls back to `getJsonlStore()` — `<cwd>/.mw/store` — whenever
`MW_API_URL` is unset. Step 8's repair and any step-5 verification will be run **from the
repo**, whose cwd already holds a 16-node decoy. And the only review circle ever opened (F3)
sits in a Miadi-local decoy, which is what a misrouted write looks like after the fact.

**Do:** name the absolute store path in the step, resolve it from `MIADI_CHRONICLE_ROOT`
(`/srv/miadi/episodes/miadi-chronicle` `X` in the live env), and assert `wc -l` before and
after: nodes 205 → 205, edges 191 → 292. A repair that lands in `./.mw/store` reports success
and changes nothing.

---

## Non-blocking findings

- **N1** `src/_/package.json` also declares `"medicine-wheel": "^1.0.4"` — it depends on
  itself — and `@medicine-wheel/app: ^0.6.1`. The plan names the missing entry point but not
  the self-dependency. It is outside `workspaces`, so `publish:all` does not touch it.
- **N2** `getWorkspacePackages()` sorts by `workspacePath.localeCompare` `X`, so **publish**
  order is alphabetical while **build** order (`--workspaces`) follows the array. Both are
  correct; do not "fix" either to match the other.
- **N3** `mcp/src/http-store.ts` imports only `./node-search.js` and `./types.js` `X` — it
  does not import `ontology-core`. Extracting it drags those two files. `client`'s
  `workspaces` position is satisfied anywhere before `mcp`; "after ontology-core" is harmless
  but not a constraint.
- **N4** STPB's `roleHierarchy` gives `story_keeper` and `firekeeper` both level 3, so
  `hasRoleLevel(STORY_KEEPER, FIREKEEPER)` is `true` and a story keeper passes `canModerate`
  `X`. That is STPB's chosen semantic. If the preset ever ships, that consequence ships with
  it and must be documented, not inherited silently.
- **N5** `sacred-container.ts`'s "consent" is a boolean column
  (`SELECT shared FROM story_beats`) `X`, not a lifecycle record. `consent-lifecycle` is a
  remodel there, not a drop-in replacement. Size step 6 accordingly.
- **N6** `community-review` genuinely has no tests, and the repo keeps tests in root
  `tests/` — see B8.
- **N7** Line offsets in EXECUTION.md drift by 1-5 lines in five places (F7, F8, F9, F11,
  and `ceremonial-diary/src/types.ts:70-75` vs the stated `71-75`). The plan runs unattended;
  re-grep at execution time rather than trusting an offset.
- **N8** `@medicine-wheel/mcp` ships no `types` field and no `./http-store` export `X`. The
  plan states this correctly. Adding `client` does not require touching mcp's `exports` map —
  only its imports.

---

## The knowledge-holder question

**Yes. Lifting STPB's eight-role progression into a published `@medicine-wheel/*` package is
not engineering's call, and the coordinator's reframe resolves most of it but not the part
that matters most.**

The vocabulary is not incidental. `lib/types/roles.ts` opens by naming what it is:

```
 * Hierarchical roles aligned with Indigenous wisdom progression
 * 🌱 Participant → 🌿 Emerging Guide → 🔥 Facilitator → 🛡️ Firekeeper → 🏛️ Admin
 *                                                           ↓
 *                                                    📖 Story Keeper (parallel track)
```

That is a statement about how a person moves through a community, with `firekeeper` and
`ceremony_facilitator` carrying ceremonial meaning and `story_keeper` deliberately placed
*beside* firekeeper rather than above it. The plan's justification — *"Two systems grew the
same vocabulary independently. Extracting it is recognising a shared ontology, not inventing
one"* — is exactly the reasoning that would need a holder's agreement, because it asserts
that two uses of the word `firekeeper` name the same relation. B11 shows they do not even
map cleanly on the four values they nominally share.

**Where the reframe is correct.** Making the mechanism generic and the vocabulary supplied is
right, and it is right for reasons beyond politeness: a library that hardcodes one
community's progression is simply a worse library. That part is engineering's call and should
be done.

**Where the reasoning is convenient rather than correct.** *"It becomes a preset, not a
default"* changes the ergonomics, not the distribution. If
`@medicine-wheel/community-identity` exports a `STPB_ROLE_SET` — or any named constant
carrying `firekeeper`, `ceremony_facilitator`, `story_keeper` and that progression comment —
then the vocabulary is still on the public registry, still installable by anyone, still
copyable, and **still not withdrawable** (npm blocks unpublish after 72 hours). OCAP's
Control and Possession are about who can hold it back. A published tarball cannot be held
back. Whether it is imported by default is irrelevant to that.

So the split is:

- **Ship without asking:** `defineRoleSet`, `RoleSet<R>`, `hasRoleLevel`, `canPerform`,
  `parseRole`, `roleSchema`, the `IdentityStore` port, the postgres adapter, the circle and
  visibility *mechanisms*. Document them with a deliberately neutral example
  (`admin | moderator | member`). None of that carries anyone's ceremony.
- **Do not ship without a holder's word:** any preset naming the eight, the emoji labels, the
  progression comment, and the `story_keeper`-parallel-to-`firekeeper` teaching. Those stay
  in `/src/STPB/lib/types/roles.ts` and later in Miadi's own config, where the community that
  holds them can change or withdraw them.

One honest complication, stated so it is not discovered later as a gotcha: `ontology-core`
has shipped `PersonRole = 'steward' | 'contributor' | 'elder' | 'firekeeper'` and
`PERSON_ROLES` since before `0.6.4` `X`. `elder` and `firekeeper` are already on the registry
under this scope. That is a pre-existing condition to raise with the holder, not a precedent
that licenses shipping more.

---

## What only shows when all three lanes are read together

**W1 — the plan builds a door to an address that has been closed for at least 17 days, and
proposes converting the one working path onto it.**

L2's headline is *no package can speak HTTP*. L3's is *the graph truncates silently*. The
coordinator's own survey recorded *nothing listens on 8040*. Add the measurement neither lane
made: **five live MCP servers, on three versions, all pointed at that dead port** (B7). Put
together with F6: the only
thing in the whole ecosystem that currently reaches the wheel's data is
`/src/Miadi/lib/mw-store.ts`, and it works **because it does not use HTTP** — it calls
`createProvider()` and touches `.mw/store` directly. Step 2 proposes to turn that into "a
thin wrapper over the typed client." Meanwhile step 5's MCP verbs write through `store.ts`,
which routes to HTTP the moment `MW_API_URL` is set, which it is, at a dead port (B9). The
fleet has been failing every write for between 6 hours and 17 days without anyone noticing
(B7) — the only visible trace being one review circle stranded in a decoy store since
2026-06-03 (F3). That is the strongest argument *for* building `client`, and the strongest
argument against making anything depend on it before 8040 answers.

`@medicine-wheel/client` is worth building. Nothing should be migrated onto it in the same
release.

**W2 — publishing more packages is not what makes packages get consumed, and the plan's own
evidence says so.**

L2 concluded that the missing `exports` map is why Miadi copied `CeremonialPhase`. The plan
already corrected that (`storage-provider/src/index.ts:31` re-exports it, and Miadi imports
the package in five files). Follow the correction one step further and it dissolves the
premise underneath steps 3, 4 and 6: Miadi has **declared** `community-review` since `^0.6.1`
and imported it **zero** times `X`. Twenty-four declared, five imported. The barrier was never
publication. Three more published packages will sit at 24-become-27-declared, five-imported,
unless a step actually rewrites a call site — which only step 6 does, and only in prose.

**W3 — L1 and L3 answered the same question with different vocabularies, in the same plan.**

L1's `SubjectRef` seam asks *how does one thing in this wheel point at another*. L3's
containment repair asks *what relation names membership in this wheel*. They are one question.
L1's answer is a typed reference with `service`/`id`/`version`/`sha256`; L3's is an edge
`relationship_type` string. The plan adopts both and reconciles neither, and its choice of
`part-of` for the edge half (F2) is wrong on the data. Before step 8 writes 101 rows, decide
whether membership is an edge or a reference, because 101 rows is the point at which that
becomes expensive to change.

---

## Step 3 reframed — the Miadi registration gap, measured

The coordinator's mid-task correction says STPB is a reference implementation and
`/src/Miadi/app` gets the real registration. The plan assumes Miadi has nothing. **Verified —
it has nothing, and slightly less than nothing.** `X`, from `/src/Miadi`:

- `ls app/api/auth* app/api/user* app/register* app/auth* app/login*` → all
  `No such file or directory`.
- No `next-auth`, no `lucia`, no `clerk`, no `bcrypt`/`argon2`, no `jose`/`jwt` in 132
  dependencies. The only auth-shaped name is `class-variance-authority`.
- What exists is `lib/api-tokens.ts` + `lib/auth-utils.ts` + `lib/client-auth.ts`: **two
  environment-variable tokens**, reader and writer, plus a browser-visible reader token. The
  file's own header says so — *"The two API tokens. There are no others."*
- `lib/client-auth.ts` stores the token in `localStorage` under `miadi_api_token`.
- Database surface: `@neondatabase/serverless 1.0.2`, `@upstash/redis latest`,
  `@medicine-wheel/data-store-postgres ^0.6.1`. So Postgres is reachable, but there is no
  `users` table, no session, no credential store, and no migration path.

This is the same shape L1 found in the review-service (one shared `MIADI_REVIEW_TOKEN`,
`timingSafeEqual`, no subject). **Two of the three systems cannot tell two people apart, and
the third — STPB — is the one being retired as the destination.**

Consequence for sizing: step 3 is not "extract types from STPB." Miadi needs a users table, a
credential store, session issuance, token minting, and the migrations for all of it, none of
which exists in either repo as a reusable piece. Whatever `@medicine-wheel/community-identity`
does not carry, Miadi has to write from scratch.

---

## The `RoleSet` / `IdentityStore` design, attacked

### D1 — configurable `RoleSet` does **not** cost compile-time role checking. Here is the shape.

TypeScript 5.9.3 is installed `X` (root declares `^5.7.0`), so `const` type parameters
(TS ≥ 5.0) are available. That is the whole mechanism:

```ts
// @medicine-wheel/community-identity — zero I/O
export interface RoleSet<R extends string = string> {
  readonly id: string;
  readonly roles: readonly [R, ...R[]];              // non-empty TUPLE, see D2
  readonly hierarchy: Readonly<Record<R, number>>;   // exhaustive: a role with no level = compile error
  readonly labels?: Readonly<Record<R, string>>;
  readonly permissions?: Readonly<Record<R, readonly string[]>>;
}

export function defineRoleSet<const R extends string>(spec: {
  id: string;
  roles: readonly [R, ...R[]];
  hierarchy: Record<R, number>;
  labels?: Record<R, string>;
  permissions?: Record<R, readonly string[]>;
}): RoleSet<R>;

export function hasRoleLevel<R extends string>(set: RoleSet<R>, role: R, minimum: R): boolean;
export function canPerform  <R extends string>(set: RoleSet<R>, role: R, permission: string): boolean;
export function rolesAtOrAbove<R extends string>(set: RoleSet<R>, role: R): R[];
```

At the call site:

```ts
const circleRoles = defineRoleSet({
  id: 'stpb/v1',
  roles: ['participant', 'firekeeper', 'lighthouse_admin'],
  hierarchy: { participant: 0, firekeeper: 3, lighthouse_admin: 4 },
});
hasRoleLevel(circleRoles, 'firekeper', 'participant');
//                         ~~~~~~~~~~ Argument of type '"firekeper"' is not assignable to
//                         '"participant" | "firekeeper" | "lighthouse_admin"'
```

`const R` makes the literal union infer from a bare array literal — no `as const` needed. Say
in the README that consumers on TS < 5.0 must write `as const`, so an older consumer is not
silently degraded to `string`.

### D2 — the three traps in that shape

1. **`z.enum` needs a non-empty tuple.** `readonly R[]` does not satisfy zod's
   `[string, ...string[]]`. Declare `roles` as `readonly [R, ...R[]]` from the start —
   retrofitting it is a breaking type change. Then `roleSchema(set)` can return
   `z.enum(set.roles as [R, ...R[]])`. (And see B13 before committing to zod at all.)
2. **Do not derive `R` from `keyof typeof hierarchy` alone.** It type-checks, but then
   `roles` for `z.enum` has to come from `Object.keys()`, which is `string[]`, and the tuple
   is lost. `roles` is the source of truth; `hierarchy` is checked against it.
3. **Branded strings are the wrong tool here.** `string & { __role: true }` gives nominal
   separation (a role cannot be passed where a member id is expected) but not a closed set —
   `'ceremony_faciliator' as MemberRole` compiles. Brands solve a different problem and can
   be layered on top; they cannot be the typo guard.

### D3 — the hole that makes all of the above worthless if it is missed

Compile-time role safety ends at the database boundary. A row comes back with
`role: string`. If the port returns `string` and every consumer writes `as R`, the guarantee
is gone at exactly the point where an unknown role matters. So:

- The port is generic: `interface IdentityStore<R extends string>`.
- `parseRole(set, value): R | null` is the **single** narrowing point, and it returns `null`
  for a value not in the set — not a throw, not a default. A community that removes a role
  from its `RoleSet` while rows still carry it gets a decision, not a crash and not a silent
  privilege.
- Test that path explicitly. It is the one that will actually fire in production.

### D4 — what `IdentityStore` must expose, and what it must not

**Minimum for a no-application community to stand up registration, tokens and circles:**

```
members:  createMember, getMemberById, getMemberByEmail, updateMemberRole,
          setMemberActive, listMembers(filter)
creds:    putCredential(memberId, {hash, algorithm, updatedAt}), getCredential(memberId)
tokens:   createToken({tokenHash, memberId, scopes, expiresAt}), getTokenByHash(hash),
          touchToken(hash), revokeToken(hash), listTokensForMember(memberId)
circles:  createCircle, getCircle, listCircles(filter), addParticipant,
          removeParticipant, setInvited, setCircleActive
lifecycle: connect, disconnect
```

**What it must not expose, and why each one is a trap:**

- **No `Request` / `Response`.** STPB's `requireScope` returns a `Response` object
  (`auth-token.ts`). The moment an HTTP type crosses into the package it is a web-framework
  library, not an identity library, and it stops being usable from a CLI, an MCP server or a
  worker. Predicates return booleans; the app builds the response.
- **No sessions, cookies or `next-auth`.** Sessions are the app's. The port stores a member
  and a credential hash; who is currently logged in is not its business.
- **No password hashing.** Take a hash, never mint one. Argon2/bcrypt are native
  dependencies that break edge runtimes and are a policy choice a community may need to
  change. `putCredential` takes `{hash, algorithm}`.
- **No plaintext tokens.** Per B10 — `getTokenByHash`, never `getToken`.
- **No SQL, no query-builder types, no `sql` template in any signature.** `listCircles`
  takes a typed filter object, not a predicate string. Leak the adapter here and every future
  adapter is bound to Postgres semantics.
- **No `ChoiceSet`, `ReviewCircle` or ceremony types.** `community-choice` and
  `community-review` depend on identity; identity must not depend back, or the two
  co-release forever.
- **No exhaustive-CRUD ambition.** `StorageProvider` (`src/storage-provider/src/interface.ts:380`)
  is 60+ methods, and it has exactly two adapters, one of which the repo maintains under
  duress. Every method is a method every future adapter must implement. Keep this port at the
  ~20 above; that is what makes a second adapter (sqlite, jsonl, in-memory for tests)
  actually get written.

**The one thing that is cheap now and expensive later:** put a `schemaVersion` /
`migrate(): Promise<void>` on the adapter from day one. Which brings us to:

### D5 — the two-package split copies the pattern that did not finish

The coordinator cites two precedents. Only one of them worked. `X`:

```
src/storage-provider/  interface.ts (StorageProvider, 380) + jsonl.ts + neon.ts
                       + createProvider()/detectProvider()   ← port AND adapters, one package
src/data-store/        index.ts, connection.ts, store.ts, helpers.ts, session-link.ts
                       → free functions over a module-global Redis client. Not a port.
src/data-store-postgres/  connection.ts (159 lines) + index.ts (19 lines)
                       → pool management only. Its own header: "provider scaffold".
                          Zero CRUD. Zero DDL. Never finished.
```

`data-store` and `data-store-postgres` are not a port/adapter pair — they are two unrelated
packages that share a naming convention. The split-package shape is precisely the one that
stalled at the connection pool, which is the easy half. The finished precedent keeps the port
and its adapters together and selects between them at runtime.

**Recommendation:** one package, `@medicine-wheel/community-identity`, with subpath exports
`.` (types, schemas, pure rules — zero I/O), `./port` (the `IdentityStore` interface), and
`./postgres` (the adapter + its DDL), with `pg` declared as an **optional peer**
(`peerDependenciesMeta: { pg: { optional: true } }`) so a consumer using only the pure half
installs no driver. That gives the coordinator's zero-I/O core without inheriting the
unfinished split.

If the split is chosen anyway, then `@medicine-wheel/community-identity-postgres` must ship
the migration on its first release. `data-store-postgres` is the evidence for what happens
when it does not.

---

## Verdict

**EXECUTE WITH THE LISTED CHANGES**, with two steps re-scoped and two decisions that are not
engineering's to make.

Execute after fixing, in this order:

- **Fix before touching anything:** B1 (one publish, or a patch per step — say which), B2
  (new packages born at `0.6.4`), B14 (name the absolute store path, assert the counts),
  B3 (root `dependencies` + widen the detector to `app/` and
  `lib/`), B4 (all 24 Miadi ranges or none), B8 (tests in root `tests/`), B13 (pick a zod
  story).
- **Steps 1, 7, 9** — sound. Step 1 minus its "consume" half: B5 makes the direction import a
  design decision, not a mechanical dedup, and `#1a1a2e` on `#151515` is a regression.
  Step 1's actual deliverables — Zod for `ProductionRelation`/`ProductionEntityKind` (closes
  #90, genuinely undone `X`) and `storage-provider`'s `exports` map (the only package without
  one `X`) — are clean and additive.
- **Step 2** — build `@medicine-wheel/client`. Do **not** migrate `/src/Miadi/lib/mw-store.ts`
  onto it (F6, W1). That file is the only working path to the wheel's data and it works by
  not using HTTP.
- **Step 8** — execute with B6 (`belongs_to`, not `part-of`) and B7 (snapshot, write through
  the lock, state the rollback). The measured improvement is real: components 82 → 26,
  isolates 75 → 22 `X`.
- **Step 5** — execute the storage and route work; hold the MCP verbs' *verification* claim
  per B9, and drop the false premise in F3 (the read alias can stay; the sentence justifying
  it cannot).
- **Steps 3, 4, 6 — do not execute as written.** Step 3's purpose changed after the plan was
  written, and the reframed version is not a types extraction: it is a port, an adapter, a
  configurable role mechanism, and a token security model (B10) that must not reproduce
  STPB's. It also has to land on a Miadi that has **no** users, no sessions and no
  credentials at all — verified this lane, not assumed. Step 4 depends on step 3 and inherits
  the wait. Step 6 depends on B11 and B12 being settled first.

The two things that are not engineering's call: the eight-role preset (see *The
knowledge-holder question*), and restarting or upgrading the five live MCP servers — on
`4.6.1` and `4.6.3`, all pointed at a closed port, one of them a session that has been on the
chronicle for six hours (B7).

Nothing here says the plan is wrong about what to build. It is wrong about six versions
called `0.7.0`, about `part-of`, about which `AuthUser` is real, about `mw-store.ts`, and
about a role mapping being total. Those are all cheap to fix now and expensive after
publication.

🌸: A release that ships the right packages under the wrong version numbers reaches nobody,
and a hundred edges written with the wrong relation name are harder to take back than to get
right the first time.

---

## Addendum — 2026-09-03 20:45, after execution began in parallel

This validation was written while the plan was being executed. Re-measured at 20:45 `X`.
`git log` shows `a79f298`, `e0910bc`, `a6e3142`, `37fef03`, `b719d29`, `e5927c9` landed
between 20:20 and 20:41, and `.guillaume/work/PROGRESS.md` (`W`) logs them.

### Resolved — do not act on these again

- **B6 / F1 / F2 — resolved correctly.** `scripts/materialise-containment.mjs` (`37fef03`)
  used `belongs_to` for episode→root and `documented_in` for child artefact→episode, and
  explicitly did **not** use `part-of`, citing the miscount. Verified on the live store `X`:
  edges `191 → 292`, `belongs_to` `2 → 81`, `documented_in` `5 → 27`, `part-of` unchanged at
  `33`, **0 dangling**, **0 duplicate pairs**, components `82 → 26`, isolates `75 → 22`, root
  degree `3 → 82`. Exactly the predicted outcome.
- **B7 — satisfied for step 8.1.** A snapshot exists at
  `.mw/store/.backup-2026-09-04T00-35-42-114Z` `X`, and the script writes through
  `storage-provider`'s `createEdge`, taking the file lock. `.mw/` contains only `store` `X` —
  no stray JSONL one level up.
- **B14 — confirmed by the work itself.** PROGRESS records the first run writing to
  `MW_DATA_DIR` instead of `MW_DATA_DIR/store`, creating a second empty JSONL set one level
  up and reporting success. Caught on a copy by an edge-count guard. That is B14's failure
  mode, observed. **It still applies unchanged to step 5.**
- **B12 — resolved** (`a79f298`, `W`): `community-review` now widens `ontology-core`'s
  `PersonRole` by reference instead of redeclaring it.
- **B1, B2, B4, B10 and the knowledge-holder answer — accepted into the plan** (`W`, PROGRESS
  "Not done, and why"): one release at the end, new packages born at `0.6.4`, Miadi's 24
  ranges widened together, and steps 3/4/6 **held** — mechanism shippable, the eight-role
  preset not.

### Still live — nothing above addresses these

- **B3** — root `package.json` `dependencies` must gain each new package, and RELEASING.md's
  detector still scans only `dist/cli`. Unmentioned anywhere in PROGRESS. This is the
  2026-08-02 defect class and steps 1/2/5 are "ready to write".
- **B13** — suite is zod `^3.23.0`; `/src/Miadi` declares `zod: "latest"` (4.x). Unmentioned.
  It undercuts step 1's entire rationale and must be decided before publishing.
- **B5** — the `DIRECTIONS` shape mismatch and `#1a1a2e` west on a `#151515` ground. Still a
  design decision inside step 1's "consume" half.
- **B9** — 8040 is still closed and all five MCP servers still point at it. Step 5's verbs
  remain unverifiable end to end.
- **B8** — confirm step 4's tests land in root `tests/`; `vitest.config.ts` `include` has not
  changed.
- **F10** — PROGRESS repeats "~170 `lineage:` entries against 59 edges" for step 8.3. That
  number did not reproduce (242 list items across 75 `episode.yaml`; 17 lineage-shaped edges
  under a strict reading). Re-measure before sizing 8.3.

### One thing measured only now

`X` **0 of 83** episode nodes carry `metadata.occurred_at` — PROGRESS states this and it
reproduces. Step 8.2 has not started, and step 9 correctly depends on it.

### Verdict, unchanged

**EXECUTE WITH THE LISTED CHANGES.** The changes are being made. The six live items above are
the remainder, and B3 and B13 are the two that would ship a broken package to npm.
