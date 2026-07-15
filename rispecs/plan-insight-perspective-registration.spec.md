# RISE Spec: Plan Insight Perspective Registration

Anchor: `jgwill/Miadi#483`.

Companion lanterns:

- `jgwill/Miadi:packages/plan-insight/rispecs/plan-perspective-registration.spec.md`
  - producer contract and registration command
- `miadisabelle/forgewright:rispecs/10-plan-perspective-visibility.spec.md`
  - read-only plan and episode rendering

Status: **specification only**. This file authorizes no medicine-wheel code
change in the `@miadi/plan-insight` implementation session.

## Reverse Engineering

- Commit `e23ab5f` established the implemented Inquiry Weave pattern:
  storage-provider abstraction, JSONL and Neon persistence, REST registration
  and query endpoints, and MCP tools.
- `@miadi/plan-insight` discovers authoritative
  `<session>/plans/miette_perspective.md` files through
  `@miadi/hooks-core` and projects them as `PerspectiveRecord`.
- A perspective is one narrative artifact. Its episode relations are an array
  that may begin empty and grow without duplicating the narrative.
- Medicine-wheel has no plan-perspective projection today.

## Intent

Medicine-wheel stores a queryable relational projection so plans and all
related episodes can find Miette's perspective. It never becomes the author or
source of truth: the session file remains authoritative, and medicine-wheel
never generates, edits, or rewrites narrative Markdown.

## Specifications

### Shared payload

Consume the exact `PerspectiveRecord` contract pinned by
`@miadi/plan-insight`:

- upsert key: `id = plan-perspective:<session_id>`
- schema key: `perspective: 1`
- immutable interpreted-plan identity: `plan_sha256`
- bounded projected narrative: `title`, `body_markdown`, optional
  `mia_context`
- lineage references and counts by default; excerpts only when explicitly
  supplied
- zero-to-many `episodes[]` relations
- generator and registration provenance

### REST surface

- `POST /api/plan-perspectives`
  - validates `PerspectiveRecord`
  - upserts by `id`
  - preserves the original `source.registered_at`
  - refreshes `source.updated_at`
  - unions `episodes[]` by exact path, retaining a known episode number
- `GET /api/plan-perspectives?episode_path=<path>`
  - requires `episode_path`
  - returns records where any `episodes[].path` exactly matches
- `GET /api/plan-perspectives/:id`
  - returns one record by id
  - returns 404 when absent

Malformed records return 400. Storage failures are explicit server failures;
no success-shaped empty fallback is allowed for writes.

### Storage providers

Mirror the file layout and provider discipline established for Inquiry Weaves:

- add the plan-perspective methods to the storage-provider interface
- JSONL provider stores/upserts the complete projection
- Neon provider stores the record and supports indexed id and episode-path
  queries
- implementations return the merged authoritative projection after upsert

The persistence layer stores projections only. It receives no generator,
prompt, model, or filesystem authority.

### MCP surface

Add `mcp/src/tools/plan-perspectives.ts` with tools equivalent to:

- register/upsert one `PerspectiveRecord`
- get one perspective by id
- list perspectives by episode path

MCP tools call the same service/storage contract as REST and cannot generate or
rewrite perspective prose.

## Exportation

- Follow the implemented Inquiry Weave registration architecture rather than
  creating a parallel storage stack.
- Add contract, storage-provider, JSONL, Neon, REST, and MCP tests.
- Prove repeated registration unions episode paths and preserves
  `registered_at`.
- Prove a zero-episode record is valid and retrievable by id.
- Prove episode queries match any array entry and return an empty list when no
  perspective is related.

No implementation or build is part of the Miadi carrier session.
