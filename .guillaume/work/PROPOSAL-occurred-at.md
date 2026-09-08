# Proposal — `metadata.occurred_at`

A schema change: one optional field on every episode node. Written before the
diff, per the rule earned tonight — data and schema changes arrive as prose you
can refuse, and run as a migration on the authority host, never as an ad-hoc
script.

## The problem, measured

`created_at` records **when the wheel learned of an episode**, not when the
episode happened. On the live store right now:

- **0 of 84** episode nodes carry any occurrence date.
- Twelve May episodes all carry the same September `created_at` — one import
  batch.
- So `/episodes` is entirely in registration order, and says so in a banner
  rather than implying a history it does not have.

The dates are not missing. They are on disk: **119 of 133** `episode.yaml`
files carry a `date:` field, starting at `2026-05-04` for episode 001.

## What changes

Add optional `metadata.occurred_at` (ISO date) to episode nodes, populated from
each `episode.yaml`'s existing `date:`.

`created_at` is **not** touched. Its current meaning is correct and useful —
"when this entered the wheel" — and overwriting it would destroy the only record
of registration order. The two answer different questions and both are worth
having.

## What it unblocks

1. **`/episodes` sorts by when things happened.** The banner disappears because
   the list stops being a lie by omission.
2. **The lineage layout becomes possible.** `LineageWeb` — x chronological, y
   direction band, relation arcs above the spine — is ~50 lines of geometry in
   `/src/Miadi/app/chronicle/components/LineageWeb.tsx:27-78`, portable into
   `graph-viz` as a second layout beside `applyWheelLayout`. **It cannot ship
   before this.** Run on `created_at` it would stack twelve May episodes on one
   September pixel and look right while being wrong.
3. **"Relationship with the past"** — the third of the three things named on
   2026-08-31 — becomes answerable. The first two (navigate, see now) shipped
   tonight.

## How it runs

`scripts/migrations/0002-backfill-occurred-at.mjs`, in the shape earned today:

- dry-run by default, `--commit` required, explicit target
- reports what it would write, per episode, before writing anything
- writes through the API or the provider's lock, never by appending to JSONL
- idempotent: skips a node that already has `occurred_at`
- records that it ran, so it cannot double-apply
- **you run it on ilex**, or say the word and I run it through the API

The 14 files without a `date:` are left alone and named in the output. A node
with no `occurred_at` keeps falling back to `created_at`, exactly as
`/episodes` already handles.

## What could go wrong

- A `date:` in an `episode.yaml` could be wrong or a placeholder. The dry run
  prints all 119 for you to scan before anything is written.
- Sorting changes what you see first on `/episodes`. That is the point, and it
  is reversible: the field is additive and removing it restores today's order.

## What I need

One word: run it, or hold it.
