# Handoff brief — narrative beats into Miadi episodes

**For the agent taking the Miadi side of the beats work.** Authored 2026-07-26 by the mw-narrative-beats coordinator after shipping medicine-wheel 0.5.4. Every path, version, and hash below was verified by command output in the session that wrote this file, on the date above. Where something could not be verified, it is marked `[unverified]`. Companion files: `COORD-BRIEF.md` (the prior handoff), `VERIFICATION-REPORT.md` (what checking it found), `DISCOVERY-SURFACE-DESIGN.md`.

**The one rule this lineage keeps paying for: done is when it is delivered and a person (or agent) can use it. Committed is not published. Published is not deployed. Verify against the running system, and say which system you verified against.**

---

## 1. What 0.5.4 is (verified on npm and Docker Hub)

- All `@medicine-wheel/*` packages at **0.5.4** lockstep; `@medicine-wheel/mcp` at **4.5.4**; Docker `jgwill/medicine-wheel:0.5.4` + `:app` (digest `be3c09e7…`). Git: `jgwill/medicine-wheel` main `3021b27`, tag `v0.5.4`. CI run 5 green (verify job cold-builds; release job self-skips when the version is already out).
- The **authoring door is now real end-to-end**: REST POST `/api/narrative/beats` validates via the engine and 400s an illegal beat; **act is strictly derived from direction** (a contradicting act is refused, not stored); a 201 may carry a `warnings` array (advisory findings: no learnings, no relations honored); origin is preserved on update, not re-stamped.
- The published `mw` CLI (`@medicine-wheel/app` bin) has `mw beat register <episode-dir> [--dry-run]` and `mw orient` — verified inside the 0.5.4 tarball.
- New packages: `creative-orientation`, `gap-analysis`, `brainstorming`, and the signpost `creative-problem-solving` (pure re-export; the teaching trap for problem-solving-biased search). MCP 4.5.4 leads its tool list with `orient_before_solving`, `open_gap_analysis`, `check_emitted_outcome`.
- Device (ilex): see the deploy record at the end of this file.

## 2. Your mission

Make episode-working agents in Miadi produce narrative beats and register them into the chronicle wheel — built around `/a/src/Miadi/packages/*`, riding the `mw` CLI rather than new library plumbing (see §4-C6: `@medicine-wheel/narrative-engine` is declared in Miadi and imported nowhere; the CLI is the cheap, honest door).

Reference implementation of the authoring format: `/srv/miadi/episodes/miadi-chronicle/2026-07-25-episode-299-…/beats/beats.yaml` — the only beats file among 152 episodes; its header comment is the de-facto contract (direction decides act; `origin.producer: chronicle-episode`; `cycle_id` + `cycle_question` + `beats[]`). It matches `readBeatsFile` in `cli/beats-register.ts` exactly.

## 3. The work, in order

1. **Bump Miadi's `@medicine-wheel/*` floor to `^0.5.4`** — 22 deps in `/a/src/Miadi/package.json:38-59`. Use the sanctioned mechanism: `scripts/ops/miadi-refresh.sh` already whitelists `@medicine-wheel/*` in FIRST_PARTY and `pnpm-workspace.yaml` excludes it from the release-age cooldown. **Do NOT hand-pin `name@version` in CLAUDE.md's forbidden list style** (`/a/src/Miadi/CLAUDE.md:137-141`).
2. **Wire the beats path into episode tooling.** The seams, mapped: `mkepisode.js:271` (`resolveRegistration` — the precedent to copy), `:333-355` (registration receipt shape — mirror as `.mw-beats-registration.json`). Respect `mkepisode`'s stated design: the vessel is one directory + one manifest at birth (`:298-301`) — beats likely belong at episode-close, and **nothing currently marks episode close** (open question §5-Q3). `composition weave` also births episodes (`composition/src/cli.ts:119`) — a hook only in mkepisode misses those.
3. **Teach the agents.** `/srv/miadi/episodes/miadi-chronicle/AGENTS.md` is 15 lines and says nothing about beats, `mw`, or the wheel — highest leverage-per-line file in the whole task. Also `/a/src/Miadi/AGENTS.md:217-231` (inquiry-weave block) and `CLAUDE.md:297-299`.
4. **Fix the write-target hazard before any agent registers a beat** (§4-C3). Then registration works with the 0.5.4 CLI as-is.
5. **MCP config bump**: `MWCV` env var (currently `@medicine-wheel/mcp@4.4.12`) is interpolated by five configs across TWO trees — `/a/src/Miadi/etc/mcp-config-mw-*.json` AND `/usr/local/src/mightyeagle/etc/mcp-config-mw-*.json`; **the chronicle launcher uses the mightyeagle copy** (`NEW-CLAUDE-ILEX-MEDICINE-WHEEL.sh`). Where `MWCV` is exported is unknown (§5-Q1). Bump both trees or the fleet splits.

## 4. Hazards — verified, will bite

- **C3 / the decoy wheel.** The live agent env on gaia has `MW_API_URL=https://mw.tail3b11eb.ts.net` — the docker decoy, explicitly "not a write target" per `/a/src/Miadi/AGENTS.md:206`. The chronicle wheel is the ilex tunnel `http://127.0.0.1:8040` (`MIADI_CHRONICLE_MW_URL` in `/home/mia/.bashrc`, which non-login shells may not source). `mw beat register` defaults to `$MW_API_URL`. **An unguarded run writes episode beats into the decoy.** Fix the env contract first; consider requiring `--url` explicitly in any scripted path.
- **C4 / fail-open vs fail-loud.** `mkepisode` registration is fail-open by contract (any failure → `pending`, vessel never at risk). The 0.5.4 beats route 400s an illegal beat *on purpose*. Inheriting fail-open converts "this beat is illegal, fix it" into "retry later" forever. The boundary must be decided (§5-Q4), not inherited. Same pattern sits in `episode-node.ts:150-159`.
- **C5 / warnings dropped.** Every Miadi POST-reader reads only `{error}`; 0.5.4's `warnings[]` on a 201 is invisible to all of them. If beats registration should surface advisories, the reader needs to look.
- **C1 / the Storybeat trap.** `EpisodicMemory.narrative?` (`episodic-memory-schema/src/types.ts:27`) is an empty, inviting slot that leads to `Storybeat`. It is **deliberately unconsumed** — the boundary is specified in `rispecs/wampum-narrative-engine-relation.spec.md` (PR jgwill/medicine-wheel#114, held for cultural review): three vocabularies stay three; projections only narrow, explicit, recorded-lossy, **culturally inert**. Do not fill the slot.
- **C2 / four beat vocabularies live in Miadi.** Besides the wheel's `NarrativeBeat`: a vendored stale `coaia-narrative` 0.13.5 fork (`/a/src/Miadi/lib/coaia-narrative/`), the unconsumed `Storybeat`, and — unrecorded anywhere until now — **`app/api/narrative-bridge/`**: a live, Redis-backed `StoryBeat` whose `act` is *computed from content* (`get-position/route.ts:48`), directly contradicting the wheel's derived-from-direction law. **It is a different system, not a bug to fix.** Its fate is Guillaume's call (§5-Q7). Touch nothing there without his word.

## 5. Questions only Guillaume answers (do not resolve these yourself)

1. Where is `MWCV` exported? (Live env says 4.4.12; defined in no file found.)
2. Which wheel do beats go to, and how is the write-target pinned so a missing env can't redirect a write?
3. Does `mkepisode` grow a beats step, or do beats land at episode-close — and what marks close?
4. Fail-open or fail-loud when the wheel refuses a beat?
5. Does `inquiry-weave` gain a `beats` verb, or is `mw beat register` the only door? (Its stated boundary: "relates and syncs; never generates content.")
6. Fate of the vendored `coaia-narrative` 0.13.5 fork.
7. Fate of `app/api/narrative-bridge/` (document as a fourth vocabulary in the spec? deprecate? leave?).
8. Is `@medicine-wheel/narrative-engine` ever to be imported in Miadi, or is the CLI the whole story?
9. Where does the beat authoring protocol for agents live — episode-local AGENTS.md, repo AGENTS.md, or both?
10. Does `composition weave` get the same beats path as `mkepisode`?

## 6. Rules that carried over (not negotiable)

- Cultural material: never invent or extend a teaching; a knowledge-holder question is a valid spec outcome. PR #114 is held for cultural review — respect the hold.
- Never "bridge/close the gap" for the creating case; the space between current and desired states is tension to resolve. Never the word "comprehensive".
- Stage only what you tended; no `git add -A` ever.
- The device is live; Guillaume's episode data is real. Back up before you delete; verify before you write; use the launcher (`ensure-miadi-workbench.sh restart`), never kill processes.
- **Run device builds detached (`nohup … > log &`), never tethered to your SSH** — two builds died on a dropped pipe in this session alone; episode 299 chronicled a third.
- Report reality: if a step was skipped, say so; if a check failed, show it. The chronicle rots when provenance is written from memory.

## 7. Deploy record (verified 2026-07-26, end of session)

- ilex medicine-wheel: `3021b27` (v0.5.4), BUILD_ID `IQ3Iim4Cx5_vSBRMb0Rzn`, serving 8040 healthy. Door verified against production: act-contradiction POST → 400 with the strictAct message; empty-description POST → 400; store intact at 5 beats; `mw beat register --dry-run` on episode 299 → all legal; `mw help` leads with ORIENTATION.
- ilex forgewright (`forgewright-plan-episode-4`, serves 8031): `2be480a`, BUILD_ID `anJn-dakb3OaFKOGQzCin`, healthy, `narrativeBeats: read-only` capability, `/api/chronicle/beats` serving `count: 5, droppedCount: 0`. (Branch `4-plan-episode-visibility` was behind main, not ahead — no stranded work.)
- smcraft on device: the fw build requires `@smcraft/bridge-*` as `file:` deps; these exist only on branch `12-realtime-design-bridge` (`b2c6b73`, on origin). Device now has that branch checked out with the three bridge packages built. **fw#10 (drift resolution / published 0.2.0) remains the honest fix** — tonight's arrangement is a working stopgap, recorded here so nobody mistakes it for the design.
- Restart discipline: `~/bin/ensure-miadi-workbench.sh restart` gates on both production builds existing — a missing `.next/BUILD_ID` aborts the whole restart. Build first, always detached.
- Real device paths (the prior brief had these wrong): repos at `/data/data/com.termux/files/repos/…`, store at `/data/data/com.termux/files/srv/miadi/episodes/miadi-chronicle/.mw/store/` — siblings of home, not inside it.
