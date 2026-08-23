# Verification report — mw-narrative-beats handoff

> **Resolution addendum (2026-07-26, same session):** everything below was acted on. v0.5.4 shipped (npm lockstep + mcp 4.5.4 + Docker `:0.5.4`/`:app`), tarball verified to carry the CLI surface, CI green from run 5 (verify job cold-builds; release job idempotency-gated), device deployed and door-verified against production, chronicle 299 provenance corrected (`64fff89`), fw#12 beats display live on 8031. Remaining open by design: PR #114 held for cultural review (§5 sharpening pending), orientation-discriminator redesign (decision 3), Miadi-side integration → `MIADI-BEATS-HANDOFF.md`.

**Verifier:** incoming coordinator (Fable), 2026-07-26.
**Method:** every Section-2 claim re-tested against npm, Docker Hub, GitHub, the live device, and the store file; all seven Section-5 decisions challenged — three by dedicated read-only analysis agents, decisions 5 and 7 read directly. Nothing was modified anywhere. This file records findings only.

---

## The headline: the correction itself was never shipped

The outgoing agent's named failure — *"I kept building the engine and skipping the surface"* — happened **one more time, in the act of correcting it**, and nobody caught it until now:

- npm `@medicine-wheel/app@0.5.3` was published **2026-07-25 14:24 UTC** (from `c3b73c4`).
- The correction commit `f83e574` — `mw beat register`, `mw orient`, the REST route change, **and** the `lib/store.ts` → engine delegation — landed **2026-07-26 05:13 UTC**, fifteen hours after publish.
- Verified in the published tarball: `dist/cli/` contains `mw.js`, `mwsrv.js`, `skills.js` only. **No `beats-register.js`, no `orientation.js`.** `npm i @medicine-wheel/app` gives a `mw` with neither verb.
- The device (ilex) runs `95ae4a1` — also **before** `f83e574`. Verified in `95ae4a1:lib/store.ts`: it imports only `actForDirection`, not `createBeat`. **The live wheel serving Guillaume's real episode data accepts REST beats with no engine validation, today.**
- Consequently the episode-299 beats (store timestamps 05:07 UTC) were written through a server that ran no validation. The confession ("validateBeatDraft never ran on them") is **accurate**; the beats.yaml header claim *"the first written by the authoring door rather than by hand"* is **not true of the deployed write path**. (The beats are content-valid — today's local `mw beat register --dry-run` passes all five.)

**"Done is when you can use it" — the fix exists only in this git checkout.**

---

## Section-2 claims: scorecard

| Claim | Verdict |
|---|---|
| Suite 0.5.3, 26 packages lockstep; MCP 4.5.3 | ✅ confirmed on npm |
| Three new packages first-published 0.5.3 | ✅ confirmed |
| Docker `0.5.3` + `app` tags | ✅ same digest `82f46afc74f3`, pushed Jul 25 |
| 210 tests pass, tsc clean | ✅ ran both, clean |
| Device on 0.5.3 and serving | ✅ serving, `v0.5.3-1-g95ae4a1` — **but without `f83e574`** (see headline) |
| Episode 299: five beats, four-direction arc | ✅ in store and via API, acts derived correctly |
| Git heads | ✅ (main is `be6d592` = brief commit atop `f83e574`) |
| PRs #114 #115, issues #109–#113, fw#12 #13 | ✅ all open; both PRs docs-only |
| **"CI has never run; zero secrets"** | ❌ **half false.** Secrets: 0, true. But the Release workflow has run **4 times: 1 success, 3 failures.** Latest failure was triggered by the handoff push itself (05:14 UTC Jul 26). CI has been red since the three packages landed. |

### Brief path errors (device)

Every ilex path in the brief is written `~/…`; the real roots are under `/data/data/com.termux/files/` — a **sibling** of home, not inside it:
- store: `/data/data/com.termux/files/srv/miadi/episodes/miadi-chronicle/.mw/store` (brief's `~/srv/...` does not exist)
- repos: `/data/data/com.termux/files/repos/...` (brief's `~/repos/...` does not exist)
- The claimed launcher/directory disagreement about forgewright **does not exist**: `~/.config/miadi-workbench/env` line 19 explicitly sets `FORGEWRIGHT_ROOT=.../forgewright-plan-episode-4`, agreeing with what serves 8031 (which is up and healthy, v0.1.0).
- Minor: an empty `beats.jsonl.tmp` (Jul 25 21:20) sits beside the live store — an interrupted write that didn't clean up. The `probe` test beat mentioned in the south beat's learnings is **no longer in the store** (only the 5 episode beats are).

---

## The seven decisions

### 1. Beats in `narrative-engine`, not `narrative-cluster` — **SOUND, premise unenforced**
Placement is right: the engine holds all five readers that assume the act-from-direction invariant; `narrative-cluster` is a film-production producer and would be a wrong gatekeeper; no circular dependency exists. But *"creation and validation must not be separable"* is a doc comment, not a constraint — `NarrativeBeat` is a plain interface, so any producer can still construct literals. And `beats.ts:12` names five producers that "emit BeatDrafts"; **none of the five actually does** — the real emitters are MCP, `lib/store.ts`, and the CLI. Three copies of the act map exist, **two inside `narrative-engine` itself** (`beats.ts:74` local vs `sequencer.ts:6` importing from ontology-core); issue #109 undercounts.

### 2. `lib/store.createBeat` delegates to the engine — **CONDITIONAL**
The coupling design is sound (dist-consumed, no path aliases, resolution verified; MCP write tools go through the same door). But: (a) **it is deployed nowhere** — see headline; (b) `mwsrv` local mode spawns `next dev` directly, skipping `predev`, so stale dist is a live path; (c) CI never runs `next build`, so app-level resolution breaks would surface only at docker build. Remaining bypass sites — issue #109 names 2, **there are 4**: `narrative-cluster/clusters.ts:85` (bypasses), `prompt-decomposition/decomposer.ts:595` (bypasses, unnamed in #109), the route (fixed in `f83e574`), the browser form (validated but see next).

Defects found nobody had named:
- **The browser form re-creates the exact bug commit `e0e7c2c` claimed fixed**: free `act` select + `|| 1` fallback; `validateBeatDraft` only warns on act/direction mismatch and `store.createBeat` doesn't pass `strictAct` — a west beat can be stored in act 1 from the UI.
- **Every validation warning is computed and discarded** on both production paths (route, MCP) — only `.valid` is read; `violations` never reach a response or a log.
- `sub_beats` assigned **after** `authorBeat` on REST — one-sided child links, bypassing the reciprocity `telescopeBeat` exists to guarantee.
- POST-as-update re-stamps `origin` to `{producer:'rest'}` on legacy beats — **provenance falsification**; and MCP telescoping of a legacy invalid parent can partial-write sub-beats then 400 on the parent link, no rollback.
- Three id schemes for one entity (REST UUID pre-empts engine `defaultId`; MCP has a third).
- Tests import engine **source** while production consumes **dist** — stale/mis-emitted dist passes the suite.

### 3. The orientation discriminator — **UNSOUND as implemented**
The "one question" is not a question the system asks — it is `typeof claim.restores === 'string' && …length > 0` on caller self-report (`creative-orientation/src/index.ts:131`). Executed against dist: iterative improvement of an existing feature → misclassified oscillating (prior state *exists* ≠ being *restored* — nothing compares outcome to baseline); recovery-plus-improvement → creating half invisible; refactoring and migration → land arbitrarily. `'ambiguous'` is declared and **never produced**; the `'structural-tension'` route targets a package that **doesn't exist** (#103, unbuilt). `gap-analysis`'s gate is a **tautology** — it passes its own baseline as `restores`, so it can only ever read oscillating. The signal layer does exact-word matching, so every inflected elimination marker ("prevents", "fixing", "removal") is silent. Fritz's structural distinction (competing tensions; problem-intensity diminishing as you act) is flattened to a temporal correlate. **As a prompt, useful; as an instrument, it measures the caller's typing, not the structure.**

### 4. Three packages shipped small — **UNSOUND at publish; conditional now**
Not stubs — 527 LOC, 17 working functions, real invariants. But at publish: zero operator surface (CLI came the next day and is *still* absent from `mw help`; gap-analysis and brainstorming have **no surface at all, still**), no package-level test scripts (root test file imports by relative path — published entry points untested), no rispecs (contradicting ALPHA.md's own claim), ALPHA.md **not in any tarball** (`files: ["dist","README.md"]`), no entry in the root README, and caret-range internal deps violating ALPHA.md's "pin exact versions." Plus: `pnpm-workspace.yaml` omits all three (pnpm installs break); brainstorming's `checkOptions` flags **100% of statements in any repair session** (evidence never threaded); one `answer()` silently closes multiple open gates (the "substitution" its own README forbids); `GATED_PHASES` enforced nowhere.

### 5. The Wampum spec's "no correspondence" — **SOUND, with two sharpenings**
The argument was read in full against the foundations packet, `coaia-narrative` source, and `ontology-core`. Every checkable claim verified (four four-membered sets exist as stated; coaia's `north_vision/east_intention/south_emotion/west_introspection` disagree with MW's `DIRECTIONS` exactly as described). The CARE/OCAP posture is right: quotes-with-attribution only, nothing authored, twelve knowledge-holder questions as the deliverable, PR held for cultural review, docs-only diff.

Sharpenings:
- **It does not actually contradict Guillaume's intuition.** "I think we create four perspective based on that model" is *preserved* by §3.5/§4.2: MW *may* gain a reading-position layer shaped like the engine's — open registry, read-time composition, refusal as a result. What the spec refuses is the **four-to-four correspondence claim** (fields↔directions, ELDER-set↔directions) as an *engineer's* assertion. Guillaume's intuition survives in the form that can be built; only the mapping table dies, and §6.2 leaves even that to knowledge holders.
- **§3.3's header overclaims.** "Candidate B does not correspond either" asserts a negative that its own §6.2 says only a knowledge holder may settle. §3.2's flat "does not exist" is defensible (candidate A is a dated research artifact vs a teaching — a provenance category error, decidable by engineers). §3.3's should read "may not be asserted by this suite." One-line fix before merge.
- The review path (§6.12) is named but not convened — the PR must not merge, only be reviewed, until it has an owner. The spec itself says this; hold it to it.

### 6. The CI design — **the third error exists, found, and it's live — and it is not alone**
On a clean runner, `npm run build:packages` builds `brainstorming` (workspace index 0) **before** its dependency `creative-orientation` (index 1) has emitted declarations → `TS2307`, exit 2, job dead at step 5 of 12. Local machines never see it because stale `dist/` masks it (`release.sh` removes `node_modules` but never `src/*/dist` — the manual path has **never cold-built**). The Release workflow is **currently red** — runs 2, 3, 4 failed; run 4 was triggered by the handoff push itself at 05:14 UTC. The brief's "CI has never run" was written without checking (secrets: 0 is true; runs: 4).

Full pipeline audit (dedicated agent; ranked):
- **BLOCKER — build order** (above). Fix: topological build order, or at minimum hoist `creative-orientation` into the explicit pre-step beside `ontology-core`.
- **BLOCKER — Dockerfile not hermetic.** `.dockerignore` masks only root `dist`/`node_modules`; every `src/*/dist` and `src/*/node_modules` ships into the build context, so image builds "succeed" by smuggling the host's prebuilt dists. A clean context hits the same TS2307. (Correction to the agent's report: Docker Hub **does** have `0.5.3` + `:app`, same digest, pushed Jul 25 14:33 UTC — built locally with exactly this smuggling.)
- **HIGH — approval gate at the wrong end.** `environment: release` pauses the job **before step 1** — the human approves before build/test/pack have proven anything, then publish runs unattended. The gate sits at the most reversible moment; the workflow's own comments claim the opposite.
- **HIGH — Docker login after `npm publish`.** A bad `DOCKERHUB_TOKEN` fails hard with npm already irreversibly published — exactly the npm↔image drift the redesign exists to end, relocated from wrong-trigger to wrong-step-order.
- **HIGH — tag push is the last mutating step.** Any Docker push failure leaves npm published with no `v*` tag on origin; no `if: always()` recovery.
- **HIGH — idempotency guard deleted; `:<version>` Docker tag overwritable.** Trigger is `paths: ['package.json']` — any dependency bump starts a full release run, and the unconditional `docker push` can overwrite `jgwill/medicine-wheel:0.5.3` with an image from a different commit while npm serves the original. Attempt 1's `TAG_VERSION != VERSION` defense was removed, nothing replaced it.
- **HIGH — lockstep never validated in CI.** `SKIP_BUMP=1` skips `sync-versions.mjs`, the only code that errors on version disagreement; a mixed-version suite would publish permanently.
- **MEDIUM** — the typecheck gate excludes `src/` and `mcp/` entirely (`tsconfig.json` excludes both), so it protects none of the packages it claims to; committed `tsconfig.tsbuildinfo` lets it exit 0 from a checked-in cache; the pack check dry-runs only the root package (the 24 `files:["dist"]` packages — the actual empty-glob hazard — never pack); CI never advances the `llms` submodule that every manual release advanced; the `Summary` step (`if: always()`) prints a success table naming npm/Docker/tag artifacts **even when nothing ran** — a red run that announces a release.
- Earlier attempts, for the record: attempt 1 pushed tags with `GITHUB_TOKEN` (which cannot trigger the tag-watching image workflow — drift guaranteed by design) and typechecked before any build (gitignored `dist/` = nothing resolves). Attempt 2 inherited both and let `workflow_dispatch` bypass its own guard.

**Verdict on the design itself: the shape (one workflow, merge-triggered, image in the same run) is right and fixes attempt 1's real defect. The execution has one fatal error (build order), two publish-safety orderings that must swap (login/tag), a gate at the wrong end, and a summary that lies. Do not add secrets until at minimum the blocker and the two HIGH orderings are fixed — with secrets today, a merge would burn a human approval, publish nothing, and announce success.**

### 7. Refusing to pick a side on #113 — **CORRECT, and understated**
Verified: `constants.ts` `DIRECTION_INFO.north.focus` holds "integration"; `cadence.ts` puts phase `integrating` on **west**. Deferral to a knowledge holder matches the governance rules and JGWILL.md (which sides with constants: NORTH — Integration). Not an evasion — the issue's own "both may be right in different framings → rename, don't correct" is the strongest available move. But the issue **understates**: the incoherence is inside `constants.ts` alone — `DIRECTIONS.west.teachings` says "Reflection, Truth, Introspection" while `DIRECTION_INFO.west.focus` says "Implementation, creation, manifestation," and "Reflection" appears in both west teachings and north focus; `CEREMONY_PHASES` (`opening, council, integration, closure`) is a third vocabulary in the same file whose 3rd-position `integration` likely seeded cadence's west assignment. The whole direction-teaching layer needs one provenance pass, not a two-file reconciliation.

---

## Section 8 (added mid-verification): the scope was right — the trap is what's missing

Guillaume corrected the scope question directly (`33a652c`): the three packages belong under `@medicine-wheel/*` **by design** — the naming is a deliberate teaching trap for problem-solving-biased agents, who search for "creative problem solving", land on these, and receive the orientation redirect. Verified: **the trap catches nothing** — no package carries `creative-problem-solving` in name, description, or keywords; the root README doesn't list them; `mw orient` is absent from `mw help`; no MCP tool exposes the door. Recovered steering from the outgoing session: Guillaume originally proposed the literal name `@medicine-wheel/creative-problem-solving` and floated a thin wrapper package; the rename to `creative-orientation` was the outgoing agent's move, agreed in principle — the discoverability half was dropped in the rename. A discovery-surface design (npm keywords, descriptions, README openings, MCP tool descriptions, `mw help`, wrapper-package decision) is being drafted for Guillaume's review; metadata changes ride the 0.5.4 republish that the unshipped `f83e574` already requires. This amends decision 4's verdict: the *scope* was never the defect — the shipping discipline and the missing discovery surface were.

Note also: the outgoing agent's lane is still live and has independently confirmed the unshipped-`f83e574` finding ("Needs 0.5.4"), and is deliberately holding rather than cutting a release mid-audit. Correct posture; the release decision now waits on this report.

---

## What this means for direction (the part that matters)

1. **The direction is sound. The shipping discipline is not.** Placement (1), coupling design (2), the Wampum boundary (5), and the #113 deferral (7) all survive adversarial review. What failed — every time — is the last mile: publish before the surface, deploy before the fix, claim before the check. The next unit of work is not new code; it is **shipping `f83e574`**: version bump, changelog, republish, rebuild + restart ilex via the launcher, re-verify the door end-to-end against production, fix CI build order so a clean machine can build (add explicit dependency-ordered build, or `creative-orientation` to the pre-step beside `ontology-core`).
2. **The orientation trio (3) needs a redesign decision before anyone builds on it**: either honestly re-document it as an advisory prompt (rename the claim, keep the door), or implement the structural reading (compare outcome to baseline, produce `ambiguous`, build or drop the `structural-tension` route). Publishing more surface on the current discriminator would compound a measurement that isn't one.
3. **Cultural material is in good order** — the one lane where the outgoing agent's care was fully adequate. #114 needs its one-line §3.3 header fix and an owner for the §6.12 review; nothing merges before that review.
4. **The chronicle needs one correction**: episode 299's beats.yaml header claim about the authoring door should be amended (or annotated) to record what actually happened — the record currently asserts provenance the deployed system cannot support.
