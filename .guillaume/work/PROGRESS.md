# PROGRESS — execution log

Started after `VALIDATION.md` returned **EXECUTE WITH THE LISTED CHANGES**.
Every entry has a commit and a verification.

## Done

| # | what | commit | verified by |
|---|---|---|---|
| B12 | `PersonRole` unshadowed — `community-review` now widens `ontology-core`'s type by reference instead of redeclaring a wider union; its Zod enum carries a compile-time exhaustiveness check so type and validator cannot drift | `a79f298` | `tsc` clean; suite green |
| 7.1 | Both read routes take `?limit=<n>\|all`; `/api/nodes` reports `total` and `truncated`; four pages ask for the whole store | `a79f298` | 3 new tests, 372 pass |
| 7.2 | `GET /api/nodes/[id]/web` — bounded traversal over `relational-query`, which shipped and nothing imported | `e0910bc` | 7 new tests, 379 pass |
| 7.4 | `/episodes` and `/episodes/[id]` — index, open attention, relations; nav entry | `a6e3142` | `next build` 28 pages; live store returns 83 episodes, 22 attention across 5 |
| 8.1 | 101 `metadata.parent_id` links materialised as real edges on the **live** chronicle store | `37fef03` | measured below |
| 7.3 | Graph scoping — `scopeId` replaces the graph with one neighbourhood; depth 1–6; Escape returns; `?scope=` deep link | `b719d29` | `next build` clean, 379 pass |

## The data repair, measured

Rehearsed on a copy, then applied to
`/srv/miadi/episodes/miadi-chronicle/.mw/store`. Snapshot at
`.backup-2026-09-04T00-35-42-114Z` — rollback is restoring `nodes.jsonl` and
`edges.jsonl` from it.

| | before | after |
|---|---|---|
| edges | 191 | **292** |
| connected components | 82 | **26** |
| isolated nodes | 75 | **22** |
| chronicle root degree | 3 | **82** |
| attention nodes with no relation | 22 of 22 | **0 of 22** |

Relation types came from the 5 pairs already materialised, not from choice:
`chronicle_episode → chronicle_root` = `belongs_to` (2 existing);
child artefact → episode = `documented_in` (`structured_plan` ×3, `stc_chart` ×2).

**`part-of` was not used.** `EXECUTION.md` originally specified it on a
miscount — all 33 of its uses are infrastructure containment (tenant→host,
service→tenant) and none touch an episode; the "41" cited for `belongs_to` was
actually `binds-port`. Writing 101 `part-of` edges would have mixed the
chronicle into the infra vocabulary permanently. Caught by `VALIDATION.md` F1/F2
and confirmed against the data before writing.

## Two things the work itself taught

- **The script's edge-count guard earned its place on its first run.**
  `JsonlProvider` writes into exactly the directory it is handed and does not
  append `store/`. Passing `MW_DATA_DIR` instead of the store directory creates a
  second, empty set of JSONL files one level up and reports success. Caught on a
  copy, never on the live store.
- **A second shadowed type, same class as B12.** `storage-provider`'s
  `RelationalEdge` makes `id` optional (relations are identified by their pair)
  while `ontology-core`'s requires it. This one is deliberate and documented, so
  the web route adapts at the boundary with the pair-derived id rather than
  loosening the ontology or tightening the store.

## Not done, and why

| what | status |
|---|---|
| 8.2 `metadata.occurred_at` | **next.** Measured: **0 of 83** episodes carry it, so `/episodes` is entirely in registration order and says so in a banner. The dates exist in each `episode.yaml`. |
| 8.3 lineage + missing episode backfill | after 8.2. ~170 `lineage:` entries against 59 edges; 102 of 185 folders have no node |
| 9 `LineageWeb` layout | depends on 8.2 — on `created_at` it would stack twelve May episodes on one September pixel and look right while being wrong |
| Steps 1, 2, 5 (publish `0.7.0`) | ready to write; **one** release at the end per `VALIDATION.md` B1, new packages created at `0.6.4` per B2, Miadi's 24 ranges widened together per B4 |
| Steps 3, 4, 6 (identity, choice, review binding) | **held.** `VALIDATION.md` answered the knowledge-holder question plainly: the generic mechanism is engineering's call, the eight-role preset is not. Ship the mechanism, not the vocabulary — and npm cannot be unpublished after 72 hours. Also B10: STPB mints tokens as `base64(userId:Date.now():Math.random())` stored in plaintext; that must not be published in any form. |
