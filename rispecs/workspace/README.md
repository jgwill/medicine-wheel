# `rispecs/workspace/` — The Workspace Specification Set

> [!CAUTION]
> **Answers the wrong question — see `STATUS.md` (2026-09-06).** The requirement is **one server that
> resolves the store per request**, so choosing a workspace changes what the running server reads and
> writes on disk. This folder assumes one server per location, with switching deferred to a slice it
> does not plan. Do not implement from this document.


> Everything the Medicine Wheel knows about **wheel workspaces**: what one is, what it would take to
> stop hardcoding them, how they relate to each other, and what happens to the drawn wheel once it
> is drawn per workspace.

**Status:** Design and analysis. **Nothing here is implemented as a *named* workspace layer.** The
application ships a hardcoded six-entry catalog in `components/workspaces-panel.tsx`; the selection
lives in `components/navigation.tsx:30` and nothing downstream reads it.

> **Definition revised 2026-09-06.** `workspace-definition.spec.md` supersedes the *definition* held
> in `workspace-scope-and-access.spec.md`, on evidence gathered in `workspace-prior-art.research.md`.
> Read the revision first.

---

## The definition, in one paragraph

**A workspace is a named, resolvable binding of one Medicine Wheel — its store location, its storage
provider, and the service endpoints that serve it — under a stable identity that people, services and
agents can refer to.** Data scope is a *consequence* of the binding; access control attaches later
and is never implied by it.

The binding already exists and is anonymous — `mwsrv --directory … --port …` makes it by hand on
every invocation. The evidence, the three layers it separates (binding / scope / governance), and
what each layer is enforced by are in **`workspace-definition.spec.md` §2**. They are not restated
here; an index that restates its own contents is a second place for them to drift.

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

---

## File set

| File | Kind | Purpose |
| --- | --- | --- |
| `GOAL.md` | Statement of intent | **Read this first.** What configurable workspaces are *for*, in two paragraphs, before any mechanism |
| `STATUS.md` | **Record — read first** | Why this folder answers the wrong question, what survives, and where the actual work is (`lib/store.ts:32`, `mcp/src/store.ts:49`) |
| `INPUT.md` | Record | First request, verbatim — implications, ERDs, display analysis |
| `INPUT-02.md` | Record | Second request, verbatim — question the definition, research it, name the service layer |
| `workspace-definition.spec.md` | **RISE spec — current definition** | **Start here.** The revised, grounded definition: six problems with the inherited one, `WorkspaceBinding`, three layers, whole-binding resolution, the service configuration layer, revised 4-slice cadence |
| `workspace-prior-art.research.md` | Research | Ten systems that already solved a version of this — kubectl contexts, Terraform's own warning, k8s namespaces, Postgres tenancy, VS Code, MCP scopes, Compose project names, level-triggered reconciliation, 12-factor, Slack/Notion/Linear. With sources |
| `workspace-scope-and-access.spec.md` | RISE spec — *definition superseded* | The inherited architecture. Values kept in full; its data shapes remain the reference for Slices 3–4. Carries a supersession banner |
| `workspace-configuration.spec.md` | RISE spec | Seam-by-seam implications: the homonym, catalog bootstrap, precedence chain, 20 API routes, legacy stores, browser keys, CLI/MCP, migration, release mechanics |
| `workspace-erd-services.md` | **ERD 3** | The service configuration layer: bindings → service intents → per-host port scarcity → declared vs observed → drift. Builds on shipped `@medicine-wheel/infra` |
| `workspace-erd-internal.md` | ERD 1 | The scope layer (Slice 3): a workspace's interior, mandatory scope in the primary key, qualified references |
| `workspace-erd-relations.md` | ERD 2 | The governance layer (Slice 4): the governed relationship record, and the package economy |
| `workspace-display-analysis.md` | Analysis | What scoping does to the drawn wheel, surface by surface, plus the Wheel of Workspaces and the colour collision |

---

## Reading order

0. **`GOAL.md`** — what this is for, before what it is.
1. **`workspace-definition.spec.md`** — the current definition, and why the previous one was wrong.
2. **`workspace-prior-art.research.md`** — the evidence behind it.
3. **`workspace-erd-services.md`** (ERD 3) — the layer that actually runs.
4. **`workspace-configuration.spec.md`** — what it costs, seam by seam.
5. **`workspace-erd-internal.md`** (ERD 1) then **`workspace-erd-relations.md`** (ERD 2) — the scope
   and governance layers, deferred to Slices 3–4 but modelled.
6. **`workspace-display-analysis.md`** — the consequence a person actually sees.
7. **`workspace-scope-and-access.spec.md`** — the inherited architecture, read as desired state.
8. **`INPUT.md`**, **`INPUT-02.md`** — what was asked, verbatim.

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
- **A binding resolves whole, from one source.** No field-level merging across sources — half a
  binding from a cookie and half from an env var is how a wheel named `research` writes to `~/other`.
- **`id` is never derived from a directory name.** Compose derives its project name from the folder,
  and the documented consequence is collisions and orphaned volumes. Moving a project edits
  `location`; it does not create a workspace.
- **A service never reads the registry to discover itself.** The registry configures the *caller* and
  resolves a name into environment; the service reads environment. That is the twelve-factor line.
- **Declared and observed never merge.** Their disagreement is the product — `undeclared` most of all.

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
