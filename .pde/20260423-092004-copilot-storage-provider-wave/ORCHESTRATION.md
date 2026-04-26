# Medicine Wheel storage-provider Copilot wave

Goal: converge the committed `src/storage-provider` work from v0 with the staged local `src/data-store-postgres` scaffold, preserve JSONL compatibility as default behavior, and deliver a minimal trustworthy backend-selection path.

## Operating sequence

1. Scout sub-agent
- Inspect repo state, current storage packages, committed v0 work, staged local scaffold, JSONL usage, and any running app/server expectations.
- Read:
  - `rispecs/storage-provider-abstraction.spec.md`
  - `rispecs/data-store-postgres.spec.md`
  - `src/storage-provider/**`
  - `src/data-store/**`
  - `app/**`, `mcp/**`, `lib/jsonl-store.ts`, `mcp/src/jsonl-store.ts` if present
  - `scripts/001-create-medicine-wheel-tables.sql`
- Output: `artifacts/01-scout.md`

2. Design sub-agent
- Propose the target architecture.
- Requirement: JSONL remains default/local-compatible; backend selection must be additive and env-driven.
- Decide whether local staged `data-store-postgres` is merged, partially absorbed, or dropped in favor of `storage-provider`.
- Output: `artifacts/02-design.md`

3. Design review sub-agent
- Critique the design for duplication, migration risk, compatibility with JSONL workflow, and compatibility with deployed Neon/Redis use.
- Output: `artifacts/03-design-review.md`

4. Implementation sub-agent
- Apply the approved design with minimal scope.
- Prefer converging into `src/storage-provider` rather than sustaining parallel packages unless clearly justified.
- Keep changes small and reversible.
- Output: code + `artifacts/04-implementation-notes.md`

5. Implementation review sub-agent
- Review for spec compliance and code quality.
- Output: `artifacts/05-implementation-review.md`

6. Revision sub-agent
- Fix review findings.
- Output: `artifacts/06-revision.md`

7. Test sub-agent
- Run build/lint/tests/smoke checks.
- If there is a running local server or easy startup path, include runtime smoke checks.
- Output: `artifacts/07-validation.md`

## Constraints

- Do not break JSONL/local filesystem mode.
- Treat JSONL as current default behavior.
- Treat Neon/Postgres as the first production backend to harden.
- Redis/Upstash may remain secondary if not fully implemented in this wave.
- Avoid parallel long-term architectures unless the review explicitly justifies them.
- Keep repo-grounded notes; no vague summaries.

## Context dirs to load into Copilot

- `/workspace/repos/jgwill/medicine-wheel`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/agents`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins`

## Deliverables

- `artifacts/01-scout.md`
- `artifacts/02-design.md`
- `artifacts/03-design-review.md`
- `artifacts/04-implementation-notes.md`
- `artifacts/05-implementation-review.md`
- `artifacts/06-revision.md`
- `artifacts/07-validation.md`
- Updated code in repo

## Completion criteria

- One clear storage convergence path chosen
- JSONL compatibility preserved
- Minimal backend-selection mechanism documented or implemented
- Validation run recorded with exact commands and results
- Final summary names changed files and remaining gaps
