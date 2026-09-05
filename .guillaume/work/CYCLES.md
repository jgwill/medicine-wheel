# Test cycles — what each agent found that the previous one could not

Four releases in one night, each cut because an agent using the *published*
package found something the repo's own tests could not. 395 tests pass at every
one of these points; none of them caught any of this.

## The species

Every defect below is one thing: **a tool reporting success while withholding or
contradicting.** Nothing crashed. Nothing errored. Each answered confidently
about a fraction of what it had looked at.

## Cycle 1 — `4.7.0`

Fixed going in: the MCP ran its own BFS and its own truncation, so
`get_relational_web` on an episode with **one** relation returned 31 nodes and
100 edges (81KB). `getAllNodes()` took the server's 100-row default, and
`getNode()` — which reads all, then finds — reported **every node past row 100
as missing**.

Agent found: listing the 84 chronicle episodes was 73,411 characters, over the
tool-result limit, so the answer spilled to a file it had to read back. Removing
the 100-row cap fixed one defect and exposed another it had been hiding.

## Cycle 2 — `4.8.0`

Fixed: `list_relational_nodes` defaults to a summary projection — 25,849
characters for the same 84.

Agent found four:
- `list_ceremonies` asked for `type: "closing"`, returned **82 opening
  ceremonies**, and echoed `type: "closing"` back as honoured. An `if/else-if`
  picked one filter — the same shadowing `list_relational_nodes` had already had
  removed, in the tool beside it.
- `/api/ceremonies` read 100 rows *then* filtered, so `?direction=east` searched
  only the newest 100 and older east ceremonies were unreachable.
- `get_relational_web` centred **on** a container: 157,233 characters. The guard
  protects a walk that *encounters* a hub and did nothing for one that starts on
  one.
- `list_structural_tension_charts` returned `count: 0` plus a teaching about the
  strategic landscape while `stc_chart` nodes exist. (The chart store really is
  empty — the count was right, the silence was the defect.)

## Cycle 3 — `4.9.0`

Fixed all four above.

Acceptance agent scored **2/4**. Two of the failures were not code:

- **R2 and R1 were already fixed** and scored as failures because ilex was
  serving `0.8.0 @ 118c75e` while the route fix shipped in `0.9.0 @ 7585bb1`.
  Proven by absence: the response carried no `total` or `truncated` keys, which
  only the new route emits.
- After the deploy, measured on the live server: `/api/ceremonies` returns
  **377 of 377** instead of 100; a direction filter reaches back to
  `2026-07-24` instead of stopping inside the newest page; and `type: "closing"`
  finds **4** closing ceremonies.

**The agent's warning landed on itself.** It wrote: *"a reader who trusts
`truncated: false` will conclude no closing ceremony was ever held."* It then
reported 0 closing ceremonies — from a look at 100 of 377 records. Four
ceremonies that had actually been closed were invisible, stated as certainty.

R3 was a genuine miss: I had capped the node *count* and not the node *bodies*,
so a hub-centred web was still 110,961 characters.

## Cycle 4 — `4.10.0`

Fixed five more of the species:

| tool | claimed |
|---|---|
| `list_relational_nodes` | `total_available` equalled whatever you asked for — `limit: 1` reported a store of 1, against 207 |
| `search_nodes` | no completeness signal at all; exactly `limit` hits, no way to tell a page from an answer; 108,522 chars at limit 100 |
| `get_relational_web` + `edge_types` | `nodes_count: 1, edges_count: 0` beside `capped: {returned: 60, available: 83}` — contradicting itself in place |
| `get_narrative_arc` | two different measurements both named `total_ceremonies`, saying 1 and 2 in one response |
| `list_edges` | `count: 200` of `total_available: 292`, no `truncated` |

## The two process lessons

**Order matters: publish → push → rebuild → verify the version at the door →
then test.** Testing before deploying produced two false failures tonight and I
nearly reported both as defects.

**`npm view` lies right after a publish.** Twice a package looked *skipped* when
it was propagating — `npm view` stale, and once the packument itself lagged ~90
seconds. npm says so in its own output: *"Your package is being processed and
may take a few minutes to become available."* Check the publish log line, wait,
then re-check the packument. Never re-cut a release on `npm view`.

## Open, and not engineering's to close

- **`MWCV`** pins the MCP version across five configs in two trees and nobody
  knows where it is exported. Publishing reaches nothing still pinned at
  `4.6.4`. Recorded in this repo's own `.mw-handoff/MIADI-BEATS-HANDOFF.md` as
  an unanswered question since before tonight.
- **Test-fixture ceremonies in the production wheel** — "Test ceremony opening",
  "Elder Mary", "Tobacco" — roughly twenty groups, newest at `2026-09-05T02:15`.
  Something is writing them.
- **A publish hook rewrites `README.md`** on every release, appending an
  OpenCollective block with `github.com/undefined/undefined` URLs. Excluded from
  four release commits so far; it will keep returning.
