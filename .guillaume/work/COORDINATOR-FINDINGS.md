# Coordinator findings — checked during dispatch, owned by no lane

Source classes per `README.md`: `X` executable, `W` written, `A` assumed.

## C1 — The film-production issue line is mostly built, and every issue is still OPEN

`.guillaume/260831-input.md` opens by pointing at #86 / #89 / #90 / #91 as the frontier.
Measured 2026-09-03:

| issue (`W`) | claim | measured state (`X`) |
|---|---|---|
| #86 add `@medicine-wheel/perception-layer` | OPEN | **Built and published.** `src/perception-layer/src/{index,ingest,observers,types}.ts`; in the `workspaces` array; `npm view @medicine-wheel/perception-layer version` → `0.6.4` |
| #87 add `narrative-cluster` + storyteller/production ceremony gates | OPEN | **Built and published.** `src/narrative-cluster/src/{clusters,edit-brief,index}.ts` → `0.6.4`; `src/community-review/src/storyteller.ts` and `src/ceremony-protocol/src/production.ts` both exist |
| #90 runtime Zod schemas for `ProductionRelation` / `ProductionEntityKind` | OPEN | **Genuinely not done.** The *types* exist (`src/ontology-core/src/types.ts:501-506`, exported at `index.ts:46-47`) but `grep ProductionRelation src/ontology-core/src/schemas.ts` returns nothing. Types without runtime validation. |
| #89 MCP tool surface for perception / narrative-cluster / storyteller / production-ceremony | OPEN | **Unresolved by this check.** `mcp/src/tools/west.ts` and `north.ts` mention storyteller/production, but no tool `name:` matched those domains. L1/L2 to settle. |
| #91 provenance + OCAP consent review for the episode-066 fixture | OPEN | Fixture exists: `tests/fixtures/episode-066-transcript-excerpt.txt`. Whether the consent review happened is a `W` question, not a code question. |

**What this means for the phase plan.** The issue tracker is a `W` record that has drifted
behind the code. Any phase built from reading issue titles would re-specify work already
shipped in `0.6.4`. Before any phase-1 commitment, the film-production issues need a state
pass — close what shipped, keep #90 and whatever #89 turns out to be.

This is also the coordinator's prediction `P0.2` in `PREDICTIONS.md`, resolved: **partly
built, partly abandoned, entirely unreconciled.**

## C2 — The wheel API this seat is told to use is not answering

`X` `curl http://127.0.0.1:8040/api/nodes` → HTTP `000`. `ss -ltnp` shows nothing bound to
8040, 3940, 3131, or 8768. Only `127.0.0.1:3335` (a `next-server`) listens.

The MCP server `medicine-wheel-miadi-chronicle` is connected to this session and may still
reach the store by another route — that is untested here. But **no lane can exercise the
live web UI in this loop**, which is exactly the surface William is describing in his third
concern. L3 was told to read the JSONL store and the code, and to raise a live look as a
held question rather than starting a server.

`A` Consequence: whatever the phase plan says about the graph UI is reasoned from code and
data, not from watching it fail. That is a real limit on the confidence of L3's findings and
must survive into the synthesis.
