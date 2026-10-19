# Repository mapping — the mapping agent's prompt, revised

Revised 2026-10-18 by Mia (Claude Opus 5.5) from `input-prompt.md` beside it and its
decomposition `pde-872139f0-b71c-4e94-9781-a5546182e3c1.md`, after phase one shipped the
tools the original prompt asked the agent to invent. For a miadiRun:
`miadiRun-<yyMMddHHmm>-<tmuxName>-repository-mapping`. The facts below were read on
2026-10-18; re-check any you act on.

## Your task

Map the repositories you can reach, one owner at a time, into that owner's hub
`<owner>/<owner>/.miadi/repository-mapping/`, so a person can browse them with
`mw-repomap serve`. Start with the two reference prototypes:

1. the author's desk: `jgwill/Miadi`, `packages/authors-desk`;
2. the recreation of GitHub Copilot Workspace: `miadisabelle/Etuaptmumk-RSM`,
   `prototypes/artefacts/MiAICo-251203-CopilotWorkspace-N0v2akS7SXyFCRiSpAxDNQ/`
   (its reverse-engineered specs are `copilot-workspace-specs.md` there).

They live inside larger repositories, so map them as features of those repositories
(`feature:jgwill/Miadi#authors-desk`, …) and name the capabilities they realize.

## Your tools

```bash
npm install -g @medicine-wheel/developer-repository-mapping@0.21.0
mw-repomap help
```

- `mw-repomap init <hub clone> --owner <login>` (add `--meta` for `jgwill/jgwill` only).
- `mw-repomap observe <clones…>` prints git readings; with `--dir <hub> --write` it stores them on rows that exist.
- `mw-repomap validate <hub>` must report 0 errors before you stop.
- `mw-repomap list`, `show`, `serve` to read back what you wrote.

The row rules are in `rispecs/developer-suite/repository-mapping/repository-mapping.spec.md`
of `jgwill/medicine-wheel`; the state machine's `prompt` per state, in
`repository-lifecycle.smdf.json` beside it, says what to do with a repository in each
lifecycle state. Read `repository-mapping.kin.md` there before your first row.

## How to write a row

- Classify the lifecycle from evidence (git log, tags, published packages, deployments), not
  from what a README promises. Unsure: leave `unclassified`.
- A purpose, a feature or a capability in at most 55 words. When it does not fit, stop:
  write `status: needs-resolution` without the statement and move to the next one.
- A prototype gets its three core features, no more.
- Every row: `statedBy` (your model id), `statedAt`, `grounding` (the paths, commits or
  URLs you read, at least one), `revision: pending`. You never write `affirmed`.
- Relations (`forked-from`, `grew-into`, `consumes`, `provides`, `realizes`,
  `field-aligns-with`) each cite their evidence in `grounding`.
- Research fields are `research-field:<slug>` ids. Link a prototype node
  (`prototype:<slug>`) only when the Miadi prototype seam already holds it; never write an
  editing address into a row.
- Assume your reading is biased: most of your training comes from one culture's way of
  knowing, and many of these repositories were written by earlier models whose claims may
  be wrong. `pending` is how the mapping says so.

## The stores

- Each owner's hub clone, at the path where you cloned it. A hub holds only its owner's
  repositories.
- `jgwill/jgwill` is the meta hub: its `owners.jsonl` registers the other hubs, and its
  `capabilities.jsonl` holds the platform's capabilities. It copies no other hub's rows.
- The four hubs exist on GitHub (public, branch `main`), none with `.miadi/` yet:
  `jgwill/jgwill`, `miadisabelle/miadisabelle`, `avadisabelle/avadisabelle`,
  `guillaumedescoteauxisabelle/guillaumedescoteauxisabelle`.

## Not yours

- Do not write into any repository other than the hubs, and nothing outside
  `.miadi/repository-mapping/` in them.
- Do not create a missing `<owner>/<owner>` repository, open a PR or an issue, or write
  into a medicine wheel. Name what you would do and stop there.
- Do not decide what `guillaumedescoteauxisabelle/guillaumedescoteauxisabelle` shows a
  recruiter; map its owner's repositories like any other.
- Do not copy text from `miadisabelle/Etuaptmumk-RSM/sources/wilson-2008-research-is-ceremony/`;
  cite its pages.

## Done when

1. Each hub you mapped passes `mw-repomap validate` with 0 errors (paste the count line).
2. Its rows are committed on a branch `repository-mapping/<yymmdd>` of that hub and pushed.
3. `mw-repomap hub` in `jgwill/jgwill` reads every hub you mapped (paste its output).
4. A list of what you marked `needs-resolution` or `unclear`, one line each, for a person to read.
