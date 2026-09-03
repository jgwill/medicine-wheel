# Coordinator survey — 2026-09-03, verified in the dispatch turn

All `X` unless marked. Commands were run from `/workspace/repos/jgwill/medicine-wheel`.

## Repos and doors

- `X` `git rev-parse --show-toplevel` → `/workspace/repos/jgwill/medicine-wheel`;
  `origin` = `git@github.com:jgwill/medicine-wheel.git`; `git worktree list` shows **one**
  worktree at `1712577 [main]`. No second door into this repo.
- `X` `/workspace/repos/jgwill/medicine-wheel-guillaume` is a **different repository**
  (`git@github.com:jgwill/medicine-wheel-guillaume.git`, branch `main`, head `29e9f42`).
  Its log names `@medicine-wheel/ontology-core 0.6.0` as a dependency — a live consumer.
- `X` `/src/Miadi` → `/a/src/Miadi-18`; `/src/STPB` → `/a/src/STPB` (readlink -f).

## Package surface

- `X` `src/` holds 26 package folders; `package.json` `workspaces` lists 26 entries
  topologically + `mcp`. `app/` is at repo root and is NOT in the workspaces array.
- `X` `src/community-review/src/` = accountability, circle, consensus, elder, index,
  outcomes, schemas, storyteller, types. Has `dist/`.
- `X` `/src/Miadi/packages/review-service/` has **no `package.json` at its root.** It is a
  folder holding `app/` (a Next.js 16 app whose package.json `name` is `"my-project"`,
  deps include `@neondatabase/serverless`, `@ai-sdk/google`, `zod@^4`), plus
  `skills/miadi-review/`, `cli-prototype-ai-studio/`, `.pde/`, `.context/`.
  It is not an npm package and cannot currently be `npm install`ed by name.
- `X` review-service app routes: `/review/index`, `/review/manage` (+`actions.ts`),
  `/review/[id]`, `/review/list`, `/review/feed.xml`, `/api/reviews`.
  `app/lib/`: auth-token, db, manual-import(+test), portal-auth(+test), public-review,
  public-url, reviews-store, review, utils, youtube.
- `X` `@miadi/inquiry-weave@0.8.3`, deps `@miadi/episodic-memory-schema@^0.8.0` + `yaml`.
  27 source files incl. `mcp-server.ts`, `catalog.ts`, `lineage-edge.ts`, `attention.ts`,
  `story-library.ts`, `chronicle-terminal.ts`.

## The wheel's data, right now

- `X` `wc -l /srv/miadi/episodes/miadi-chronicle/.mw/store/*.jsonl`:
  nodes **205**, edges **191**, ceremonies **272**, captures 96, beats **39**,
  inquiry-weaves 37, cycles 5, plan-perspectives 15. Total 860 lines.
- `X` `curl http://127.0.0.1:8040/api/nodes` → HTTP code `000`; `ss -ltnp` shows nothing on
  8040. The chronicle wheel API is **not reachable from this seat right now.** Only
  `127.0.0.1:3335` (next-server) is listening among the known Miadi ports.
  → Any lane needing live wheel data must read the JSONL store directly and say so.

## UI surface

- `X` `app/` routes: `/`, `/graph`, `/nodes`, `/relations`, `/ceremonies`,
  `/accountability`, `/narrative`, `/narrative/cycles`, `/narrative/beats`.
  There is **no** episode, chronicle, review, or community route.
- `X` `app/graph/page.tsx` is 661 lines; `src/graph-viz/src/interactive/
  MedicineWheelFlowGraph.tsx` is 1073 lines; `MedicineWheelGraph.tsx` 372.
- `X` `/src/Miadi/app/chronicle/` has `page.tsx`, `[episode]/page.tsx`, `books/page.tsx`,
  16 `lib/` modules and 7 components (Almanac, EpisodeAttention, LineageWeb,
  OperatorConsole, ChronicleExplorer, AttentionBoard, EpisodeRoom).
- `X` `/src/STPB/app/` has 17 route folders incl. `community/`, `inquiry/`, `wisdom/`,
  `reflection/`, `commitment/`, `journey/`, `lighthouse/`, `trading/`, `admin/`, `auth/`.
  Most are 1–2 `.tsx` files; `docs/` (9) and `auth/` (7) are the largest.

## Live relations (do not dispatch over these)

- `X` `herdr workspace list` → one workspace `llms-txt-and-guillaume-credibility` (w4B),
  9 panes. `w4B:p4` sits in `medicine-wheel-guillaume`.
- `X` `tmux ls` (user mia) → 20+ sessions. Three touch this topic:
  `miadi-review-in-chronicle`, `miadi-review-service`, `miadi-ok-miadi-pi-network`.
  Read: none is holding this question. `miadi-review-service` last pushed a GitHub Pages
  submodule fix (`448db817`); `miadi-ok-miadi-pi-network` is on the pi-network plugin.
- `X` `sudo -n -u gmusic tmux ls` → no socket.

## Issues (state read this turn)

`X` OPEN: #84, #85, #86, #87, #89, #90, #91 (film-production line);
#103 (NEW `@medicine-wheel/structural-tension`), #104 (transformation-tracker archive),
**#105 (UPGRADE community-review — PR-lifecycle consensus binding)**,
#125 (community-held teaching profiles), #127 (Graph Inspired Connected Papers),
#129 (user-defined, data-scoped, relational workspaces), #113, #111, #107.

## Written claims, NOT facts (`W`)

- `W` Episode 340 `2026-08-27-episode-340-reviews-become-choices` exists with
  `audience-choice-packet-01.md` and `ROOM-HANDOFF.md`, sourced to `jgwill/Miadi#630`.
  It states a four-layer packet shape (practitioner source / William's reading / Miadi
  proposition / audience poll) and a production statement William read aloud. **It is a
  draft, and its own text says the wording "is not declared final."** Treat as a proposal.
- `W` Issue #86 states perception-layer scope and acceptance criteria. The package exists
  in `src/` (`X`) — whether it satisfies the issue is unverified.
