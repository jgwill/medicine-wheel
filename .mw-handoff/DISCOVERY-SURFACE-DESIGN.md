# Discovery surface design — the teaching trap that catches

**Status: proposal for Guillaume's review. Nothing implemented, nothing renamed, nothing published.**
Drafted 2026-07-26 by an Opus 5 design agent under the incoming coordinator, from the Section-8 correction and the recovered steering (Guillaume's original `creative-problem-solving` proposal; the fire/forest teaching; the wrapper idea). Companion to `VERIFICATION-REPORT.md`.

---

## Measured ground (npm search API, probed live today)

- Exact hyphenated **name** match beats popularity ~3× (`ripple-thinker` at 6 dl/wk outscores `@material/ripple` at 843k).
- The query `creative-problem-solving` has **no exact match anywhere on npm** — the address is empty and winnable at #1.
- Multi-word natural-language queries and `keywords:debugging` are download-ranked and unwinnable — do not design for them.
- **The three packages published 2026-07-25 are not yet in npm's search index at all.** Search is the slow dividend; the surfaces that pay immediately are the ones with no index: name-guess `npm view`/`npm i` (today returns E404 — the trap's exact failure), the MCP tool list, `mw help`, README first screen, `package.json` in `node_modules`.

## The design, in six pieces

### 1. Publish `@medicine-wheel/creative-problem-solving` — a signpost, not a door
Thin wrapper at 0.5.4, lockstep: one `export * from '@medicine-wheel/creative-orientation'`, one `THE_QUESTION` const, one JSDoc that IS the teaching, a README whose first screen is the redirect. It settles the naming disagreement without either side conceding: **the door keeps its name** (`creative-orientation` — a doctrine named after what it removes performs the pattern it teaches against), **the signpost takes the traveler's name** (a signpost named for where the traveler believes they are going is hospitality, not oscillation). Guillaume's instinct and the rename both survive. It holds no logic, ever. (This is *not* the non-technical-audience wrapper — that is a different outcome, left named and unstarted.)

### 2. Keywords and descriptions — trap terms split in two classes
- **Class A — creating work in problem-solving clothes** (`creative-problem-solving`, `problem-solving`, `ideation`, `creative-thinking`): placed on the wrapper, `creative-orientation`, `brainstorming` → these searchers get **routed**.
- **Class B — genuine fire vocabulary** (`root-cause`, `incident-response`, `postmortem`, `regression`, `troubleshooting`): placed on `gap-analysis` → these searchers get **served**, because they are already in the right room. Redirecting them would be the euphemism Guillaume refused.
Full replacement `description` strings and keyword arrays (≤12 each) are in the agent report appended below.

### 3. README openings — redirect first, alpha warning second
All three current READMEs put the `[!WARNING]` alpha block at lines 5–11, pushing the teaching below the npmjs.com/WebFetch fold. Every README opens with the routing question; the warning moves beneath it. Exact opening blocks drafted for all three plus the wrapper.

### 4. MCP tools — the highest-value surface (no index lag, no ranking)
New `mcp/src/tools/orientation.ts`, spread **first** in `allTools` (list order is scan order):
- `orient_before_solving` — "Call this BEFORE any problem-solving, debugging, fixing, troubleshooting, root-cause, or creative-problem-solving work…" — the trap, with "urgency is not evidence" in the description.
- `open_gap_analysis` — the fire path, served with respect: baseline-with-evidence required, never blocked.
- `check_emitted_outcome` — the speaking-moment check ("an elimination-shaped option, once a human selects it, stops looking like the agent's proposal and starts looking like the requirement").
Honesty constraint throughout: every string says the tool **reads a claim you supply** — no false detection promises, because the discriminator is a self-report field (see VERIFICATION-REPORT decision 3).

### 5. `mw help` — ORIENTATION section first, and repair the missing entries
`mw orient` and `mw beat register` are both dispatched but absent from help today. ORIENTATION goes at the top of the help output (help is read top-down); the NARRATIVE section gains `beat register` and `beat register --dry-run` lines.

### 6. Anti-patterns (binding on every string)
No snark, no "bias detected", no shaming — routing a traveler, not correcting a character. No false detection claims. Never "comprehensive". Never "bridge/close the gap" for the creating case — that space is tension to resolve; and keep the irony crisp: `gap-analysis` is the *correct* name for the fire instrument, where an evidenced baseline makes the difference literally the object of work. Never frame problem-solving as degraded. Nothing refuses. No keyword bloat chasing unwinnable queries. The wrapper never grows logic. Not README-only — README is fourth in the reading order.

## Sequencing

Metadata + wrapper ride the **0.5.4 release that `f83e574` already requires** — no extra publish event. Order: CI blockers fixed (build order, dockerignore, login-before-publish, tag ordering) → 0.5.4 with f83e574 + this surface → ilex rebuild + `ensure-miadi-workbench.sh restart` → end-to-end door verification against production → `rispecs/creative-orientation.spec.md` authored (the wrapper documented inside it as a discovery surface — a signpost does not deserve a spec of its own).

---

## Appendix — full agent design (verbatim: exact package.json, README, index.ts, tool descriptions, help text)

See the design agent's complete output preserved in the session; on approval, the exact strings above are implemented from that text. Key artifacts: wrapper `package.json` (name, lockstep version, description carrying the routing question, 9 keywords, `sideEffects: false`, repository.directory), wrapper README (question → two answers → signpost statement → code sample → alpha warning), wrapper `src/index.ts` (JSDoc teaching + `export *` + `THE_QUESTION`), three replacement descriptions + keyword arrays, three README opening blocks, three MCP tool descriptions with input-schema field descriptions that carry the teaching ("Leave this empty when nothing is being restored — the emptiness IS the answer, not a missing field"), and the two `mw help` sections.
