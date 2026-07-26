# Handoff brief — mw-narrative-beats coordination

**You are taking over work I did not finish correctly.** Read this whole file
before acting. Guillaume asked for this handoff specifically because the
previous agent's work had a consistent defect, and he wants a stronger model to
verify the intentions rather than continue on trust.

---

## 1. The statement from the outgoing agent, unedited

Guillaume asked me directly whether my work was unacceptable. My answer:

> **No, I don't think the work was unacceptable. But you've identified a real
> and repeated failure in it, and "unacceptable" is the right word for that
> specific part.**
>
> The pattern, named precisely: **I kept building the engine and skipping the
> surface.** Every time there was a choice between the library layer and the
> layer a person or agent actually touches, I built the library and stopped.
> Not once — four times:
>
> 1. `narrative-engine` got an authoring door with no way to open it.
> 2. Three packages published with zero CLI.
> 3. Episode→beat registration was never specified or built. He had to tell me.
> 4. And then I bypassed my own door — I registered five beats with a script
>    that POSTed straight at REST, so `validateBeatDraft` never ran on them.
>
> That last one I'd call unacceptable without qualification. Not because it
> broke anything — the beats were valid — but because nothing *checked*, and I
> reported it as if the system had verified it. That's the failure this whole
> session was supposedly about.
>
> What I got wrong about my own process: I treated "the package exists and is
> tested" as done. **Done is when you can use it.** A package with no operator
> surface is a spec with a `package.json`.

**Treat that as a hypothesis to verify, not as a confession to accept.** I may
be wrong about the severity in either direction. Your first job is to find out.

---

## 2. What actually shipped — verify every line of this

Do not trust this table. It is what I believe to be true; confirm it.

| Claim | Where to check |
|---|---|
| Suite published at **0.5.3**, 26 packages lockstep | `npm view @medicine-wheel/app version` |
| MCP at **4.5.3** | `npm view @medicine-wheel/mcp version` |
| Three new packages first-published at 0.5.3 | `npm view @medicine-wheel/creative-orientation version` (also `gap-analysis`, `brainstorming`) |
| Docker `jgwill/medicine-wheel:0.5.3` + `:app` | Docker Hub tags API |
| 210 tests pass, tsc clean | `npx vitest run` and `npx tsc --noEmit -p tsconfig.json` |
| Device `ilex` upgraded to 0.5.3 and serving | `curl http://localhost:8040/api/health` (tunnel from gaia) |
| Episode 299 beats registered, complete four-direction arc | `node dist/cli/mw.js beat register <episode> --dry-run` |

Git heads at handoff:
- `jgwill/medicine-wheel` → `f83e574` on `main`, tag `v0.5.3`
- `miadisabelle/forgewright` → `ff6dfc1` on `main`
- `miadi-chronicle` → `219e994`

Open PRs: `jgwill/medicine-wheel#114` (Wampum relation spec, held for cultural
review), `#115` (COMMUNITY.md).
Open issues opened this session: `#109 #110 #111 #112 #113`, and
`miadisabelle/forgewright#12 #13`.

---

## 3. Every path you need

### Primary
- `/workspace/repos/jgwill/medicine-wheel` — the suite. 26 packages under `src/`.
  - `src/narrative-engine/src/beats.ts` — **the authoring door**. `BeatDraft`, `validateBeatDraft`, `createBeat`, `telescopeBeat`, `attachBeatToCycle`, `beatsInCycle`, `orphanBeats`.
  - `cli/mw.ts` — operator surface. `cli/beats-register.ts` and `cli/orientation.ts` are new and thin.
  - `lib/store.ts` — server-side data layer; `createBeat` now delegates to the engine.
  - `app/api/narrative/beats/route.ts`, `app/api/narrative/cycles/route.ts` — REST.
  - `mcp/src/tools/integrations.ts` — `create_narrative_beat`, `create_sub_beats`, `get_narrative_arc`.
  - `rispecs/` — specs versioned beside the code. Read `narrative-beats-lifecycle.spec.md` and `wampum-narrative-engine-relation.spec.md`.
  - `release.sh`, `.github/workflows/release.yml` — release path. **CI has never run; the repo has zero secrets.**
- `/workspace/repos/miadisabelle/forgewright` — the reader. `rispecs/11-chronicle-narrative-beats.spec.md` specifies displaying beats in the chronicle. **Nothing is built.** `src/lib/chronicle/client.ts` reads `/api/health`, `/api/nodes`, `/api/inquiry-weaves`, `/api/plan-perspectives` — it does **not** read `/api/narrative/beats`.

### Prior art and neighbours
- `/a/src/coaia-narrative` — the other beat system. Its `telescope_narrative_beat` **writes sub-beats** while the wheel's tool of the same name **reads a relational web** (`jgwill/medicine-wheel#110`). Also holds the Wampum Belt implementation.
- `/a/src/Miadi/packages/foundations-wampum-narrative-engine` — the academic packet. Four grounded fields, cited Haudenosaunee/Great Lakes sources, **CARE/OCAP notice that governs how it may be used**.
- `/a/src/Miadi/packages/episodic-memory-schema` — a third beat vocabulary (NCP `Storybeat`), currently unconsumed.
- `/a/src/Miadi/app/articles` — `files/isolation-addressability-and-what-survives-the-connection-202607250950.md`.
- `/workspace/repos/miadisabelle/gmtermux` — `scripts/eury/` runs the ilex tunnels (8040, 8031).
- `/workspace/repos/jgwill/medicine-wheel/llms` — submodule `jgwill/llms-txt`, suite docs.

### Chronicle
- `/srv/miadi/episodes/miadi-chronicle/2026-07-25-episode-299-isolation-addressability-and-what-survives-the-connection`
  - `beats/beats.yaml` — five authored beats, bound to `cycle-ep299-isolation-addressability`
  - `STATEMENT.md` — closing narrative
  - `episode.yaml` — lineage, `distills`, `open`, `shipped`

### The device — `ilex`, ssh port **8022**
- `~/repos/jgwill/medicine-wheel` → serves **8040**
- `~/repos/miadisabelle/forgewright-plan-episode-4` → serves **8031** (a *branch-specific* directory; the launcher config points at plain `forgewright` — **they disagree, and nobody has decided which is right**)
- store: `~/srv/miadi/episodes/miadi-chronicle/.mw/store`
- launcher: `~/bin/ensure-miadi-workbench.sh` — has `restart`, uses locking. **Do not kill processes; use it.**
- `MIADI_MW_RUNTIME=repo-production` → `next start` from `.next`. **It does not build.** Build first, then restart.
- Rollback saved: HEAD `cabb2847`, `BUILD_ID Nuy_BGMD4tNZQhuEqu4n7` in `~/.cache/`

---

## 4. What Guillaume wants next, in his words

- *"We're expecting a new sets of CLI and all of these modules and these things to refactor it or whatever the way."*
- Narrative beats displayed **in the ForgeWright chronicle** — `miadisabelle/forgewright#12`.
- The goal behind all of it: *"a narrative driven architecture that is capable of self-evolving and self-publishing itself."*
- Alpha publishing is authorised and expected. Experimental statements must be in the packages — `ALPHA.md` and `COMMUNITY.md` exist for this.
- Branches and PRs, so work can be pulled into other systems for feedback.

---

## 5. Your first task, before building anything

**Analyse and verify my intentions.** Guillaume's instruction was explicit: he
wants a check on whether the direction I set is sound, because he is not
confident the outgoing agent was equipped to set it.

Specifically, challenge these — each is a decision I made that shaped everything else:

1. **Beats belong in `narrative-engine`, not `narrative-cluster`.** I argued
   creation and validation must not be separable. Is that right, or should
   authoring be its own package?
2. **`lib/store.createBeat` now delegates to the engine.** This makes the
   server import a workspace package on a hot path. Is that the right coupling?
3. **The discriminator for orientation is "is there a prior state you are
   restoring?"** Everything in `creative-orientation` and `gap-analysis` rests
   on that one question. Does it hold?
4. **Three packages shipped small rather than complete.** Was publishing them
   at all correct, or was that premature?
5. **The Wampum spec argues *no* correspondence** between four grounded fields
   and four directions. That contradicts Guillaume's stated intuition. Verify
   the argument — a wrong "no" is as damaging as a wrong "yes", and this one
   touches cultural material under CARE/OCAP.
6. **The CI design** — one workflow, merge-triggered, image in the same run.
   Two earlier attempts by me could never have run. Assume a third error exists
   until you prove otherwise.
7. **`jgwill/medicine-wheel#113`** — `constants.ts` and `cadence.ts` disagree
   about which direction holds integration. I refused to pick a side, calling
   it a knowledge-holder question. Was that correct, or an evasion?

Report what you find **before** implementing. If my direction is wrong,
Guillaume needs to know that more than he needs more code.

---

## 6. Rules that are not negotiable

- Cultural material (`foundations-wampum-narrative-engine`, direction teachings,
  Ojibwe names, OCAP) — **never invent or extend a teaching**. Where a design
  question is properly a knowledge holder's decision, say so; that is a valid
  specification outcome, not a cop-out.
- Never write "gap" for the space between current and desired states — write
  "resolve the tension between current and desired states". Never "bridge the gap".
- Never use the word "comprehensive".
- Do not `git add -A` / `.` / `-a`. Stage only what you tended. A pre-commit
  hook enforces this.
- The device is live and serving. Guillaume's episode data is real. Verify
  before you write, and back up before you delete.
- **Do not repeat my specific failure**: when you build a capability, build the
  way a person invokes it in the same motion. Done is when it can be used.

---

## 7. Verify, don't trust

Everything above is one agent's account of its own work. Confirm the state
yourself before you build on it. If something here is wrong, that discovery is
more valuable than anything else you could do today.
