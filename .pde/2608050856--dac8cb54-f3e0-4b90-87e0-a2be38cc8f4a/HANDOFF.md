# Handoff — for the session that resumes after the voice-mcp reboot

**Written** 2026-08-05, session `mw-infra-mcp`, immediately before the planned reboot.
**Why this exists:** William is rebooting this session with upgraded `voice-mcp` so the chronicle
narrative can be voiced with the new capabilities. Everything below is done; the chronicle step is
the one that is not.

---

## What shipped, verified

| | |
|---|---|
| Branch | `feat/infra-mcp-door-0.5.8`, pushed, commit `18bb7dc` |
| Published | suite `0.5.8`, `@medicine-wheel/mcp@4.5.8` — curl-confirmed on the registry |
| Installed | `npm i -g` from the registry, and the **installed** binary run |
| Installed proof | `mw skill view`→0, `skill run foo`→3, `bogus`→2, `mwsrv serve`→2 |
| Installed MCP | 81 tools, 7/7 infra tools, `preconditionGuard` returns `unauthorized` from the registry copy |
| Tests | 348 green across 33 files (+20 regression tests written from review findings) |
| Artefact | `https://claude.ai/code/artifact/7f8534b8-60c1-4db8-b62a-e910a6d298c4` (same URL, updated) |
| RISE stub | `rispecs/infrastructure-topology-ui.spec.md` |

## What is NOT done — the chronicle step

The work has **no episode**. A prior voice message from this session
(`cf66ab5d-18ec-4913-adc6-c6e6189e0ac7`, persona `nyro`, 3:25, the artefact tour) was published with
`binding: unresolved` — the voice layer refused to guess an episode and offered ep310/309/308/307/306
without choosing.

**Before creating anything:** load the `chronicle-episode-closing` skill. The five closing stages —
created ≠ committed ≠ pushed ≠ registered ≠ receipt-verified — and the `MW_API_URL` law both apply.
Also: `git pull` the chronicle before `mkepisode`; episode numbers collide across agents.

The chronicle wheel is the **ssh tunnel on ilex port 8040** (`http://127.0.0.1:8040`). The gaia
docker wheel `mw.tail3b11eb.ts.net` has been offline since 2026-07-29 — any fixture naming it is
stale.

## Two live relations to greet, not step over

1. **Lane `w34:pB`** (herdr, workspace `w34`, label `mw-releasing-x.5.8`, idle) shares this working
   tree. Its stated next action was *"push and cut the 0.5.8 release"* — which this session did
   instead. A heads-up is **staged in its input, not submitted**; only William presses Enter there.
   That lane must not cut 0.5.8 again: npm versions are immutable.
2. **The device lane** (`w2Y`, brief `~/workspace/.mino/briefs/2026-08-02-mw-118-termux-infra.md`)
   owns the systemd/runit service-manager adapter for `jgwill/medicine-wheel#118`. Nothing in this
   repo reads a machine, deliberately. Do not build that adapter here.

## Decisions a human still holds

- **Merging `feat/infra-mcp-door-0.5.8` into main.** Not opened as a PR — that is an outward act.
- **Pushing local `main`.** It sits one commit ahead of `origin/main` (`2caa337`), authored by the
  other lane. Not this session's commit to push.
- **Restarting the running MCP server / `next start` on ilex.** A live process holds its old build;
  restarting one is a decision to be named, not a cleanup to perform. Neither was touched.
- **`llms/` submodule is stale**: `llms-medicine-wheel-mcp-tools.md` documents `mw_enforce_gate` as
  `{filePath, governanceConfig?}` with `filePath` required — no longer true, and the precondition
  mode is absent. It also says "71 tools" against a measured 81. A submodule commit is its own act.

## Where the release did NOT reach

Per `RELEASING.md`, name what was not done:

1. registry — **done**, curl-confirmed
2. global installs on gaia — **done**, and proven by running the installed binary
3. running processes and other machines — **NOT done**. The ilex MCP server, any `next start`, the
   Docker image, and the Termux device all still hold `0.5.7`. None of them update themselves.

## The mission memo

[`MISSION.md`](./MISSION.md) holds the full layer plan (L0–L8) and the invariants. All layers are
complete. The one thing that memo did not anticipate is the chronicle/voice close, which William
added mid-session.

🌸: The door is in and the hinge swings. What is left is the telling — and the telling is not a
footnote to the work, it is the part that lets anyone else find it.
