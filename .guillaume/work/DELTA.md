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
