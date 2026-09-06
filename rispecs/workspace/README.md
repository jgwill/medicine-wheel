# `rispecs/workspace/` — The Workspace Specification Set

> Everything the Medicine Wheel knows about **wheel workspaces**: what one is, what it would take to
> stop hardcoding them, how they relate to each other, and what happens to the drawn wheel once it
> is drawn per workspace.

**Status:** Design and analysis. **Nothing here is implemented.** The application still ships a
hardcoded six-entry catalog in `components/workspaces-panel.tsx` whose selection changes only a
label and a colour.

---

## ⚠️ Two meanings of "workspace" — read this first

This repository uses the word for two different things, and conflating them is the failure mode this
folder exists to prevent.

| | **Suite workspace** | **Wheel workspace** |
| --- | --- | --- |
| What | An npm package in the monorepo | A data and access boundary |
| Where | root `package.json` → `workspaces[]` | A catalog outside every workspace |
| Order | **Topological, never alphabetical** | Unordered peers |
| When | Build time | Run time |
| Count | 27 + root app | Deployment-defined |
| Owned by | `scripts/workspace-packages.mjs`, `scripts/publish-workspaces.mjs` | Nothing yet |

**Every document in this folder means *wheel workspace* unless it says "suite workspace".**
The npm array is not being renamed; the new concept is always qualified in code
(`workspaceId`, `WorkspaceScope`, `MW_WORKSPACE`) and never appears in build tooling.

🪶 The suite workspaces are the **poles of the lodge** — ordered, load-bearing, meaningless out of
sequence. The wheel workspaces are the **lodges** — each complete, each holding its own fire.

---

## File set

| File | Kind | Purpose |
| --- | --- | --- |
| `INPUT.md` | Record | The originating request, verbatim, kept for compliance and provenance |
| `workspace-scope-and-access.spec.md` | RISE spec | **The architecture.** Catalog plane, data plane, working sets, cross-workspace references, provider contract, migration, delivery cadence. Moved here from `rispecs/` |
| `workspace-configuration.spec.md` | RISE spec | **The cost.** What implementing configurable workspaces implies across every seam — vocabulary, catalog bootstrap, precedence chain, 20 API routes, legacy stores, browser keys, CLI/MCP, migration, release mechanics, and what must not be claimed |
| `workspace-erd-internal.md` | ERD 1 | A workspace and its interior: the three planes, owned records, mandatory scope in the primary key, qualified references, unclassified collections |
| `workspace-erd-relations.md` | ERD 2 | Workspace↔workspace: the governed relationship record, bilateral acceptance, working sets — and the package economy (producer, releases, consumption, resolution) |
| `workspace-display-analysis.md` | Analysis | What scoping does to the drawn wheel, surface by surface, plus the Wheel of Workspaces and the colour collision |

---

## Reading order

1. **`INPUT.md`** — what was asked.
2. **`workspace-scope-and-access.spec.md`** — the desired architecture in full.
3. **`workspace-configuration.spec.md`** — what it costs and what it breaks.
4. **`workspace-erd-internal.md`** then **`workspace-erd-relations.md`** — the data model, in two
   diagrams because one would have flattened containment into governance.
5. **`workspace-display-analysis.md`** — the consequence a person actually sees.

---

## Invariants every document here upholds

- A wheel workspace is **not** a seventh `NodeType`. The union in `src/ontology-core/src/types.ts`
  stays closed at six. A workspace is the container, one plane up — not a member of the ontology.
- **Isolation is not disconnection.** Related workspaces remain describable.
- **A visible relationship is not an access grant.** Seeing that A relates to B implies nothing about
  reading B.
- **Reads may compose; writes name exactly one destination.**
- **Local configurability is not authenticated privacy.** There is no identity contract in this
  system; nothing here may be documented as secure multi-user access.
- The npm `workspaces` array stays topological.

---

## Move record

`rispecs/workspace-scope-and-access.spec.md` → `rispecs/workspace/workspace-scope-and-access.spec.md`
(`git mv`, history preserved, 2026-09-06). No inbound references existed at the time of the move.

`rispecs/docker-containerized-app.kin.md` was **not** moved: it is a containerization note that
mentions supplying a project path for `.mw/store`. It is workspace-*adjacent* (and is the origin of
[#40](https://github.com/jgwill/medicine-wheel/issues/40), referenced from the architecture spec),
but it is not a workspace specification.

---

## Related, outside this folder

- `../medicine-wheel.spec.md` — system seams and the suite-workspace topology
- `../storage-provider.spec.md` — the canonical persistence contract that must gain scope
- `../ontology-core.spec.md` — the closed union and the additive `metadata.kind` pattern
- `../consent-lifecycle.spec.md` — withdrawal semantics reused by relation withdrawal
- `../graph-viz.spec.md` — the visual language for both the wheel and the Wheel of Workspaces
- [jgwill/medicine-wheel#129](https://github.com/jgwill/medicine-wheel/issues/129) — planning issue

🌸: Six cards that change a colour are a promise. This folder is the accounting of what keeping it would cost.
