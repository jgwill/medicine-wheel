# Workspace Configuration — RISE Specification

> What it actually implies to stop hardcoding six workspace cards and let a Medicine Wheel
> deployment be configured with real workspaces: the seams that must change, the vocabulary that
> must be disambiguated first, and the invariants that must survive the change.

**Version:** 0.1.0 (implications analysis — no implementation authorized)
**Packages / seams:** `@medicine-wheel/app` · `@medicine-wheel/storage-provider` · `@medicine-wheel/mcp` · `mw` / `mwsrv` CLIs
**Document ID:** rispec-workspace-configuration-v1
**Status:** Analysis — establishes cost and boundary before any slice is cut
**Last Updated:** 2026-09-06
**Companion documents:** `workspace-scope-and-access.spec.md` (the architecture), `workspace-erd-internal.md` (ERD 1), `workspace-erd-relations.md` (ERD 2), `workspace-display-analysis.md` (display consequence)

> [!NOTE]
> **What in this document still governs, after `workspace-definition.spec.md` — 2026-09-06.**
> Every count, file reference, and cost estimate here stands and was re-verified. The *definition*
> it was written against has been superseded.
>
> | Section | Status |
> | --- | --- |
> | 1 — catalog bootstrap | Settled: a registry of `WorkspaceBinding` records carrying `location` and `provider` |
> | 2 — precedence chain | **Withdrawn.** The normative chain is `workspace-definition.spec.md` §2.4 |
> | 3 — scoping every read and write | Still the largest cost here, but it is **Slice 3**, not Slice 1 |
> | 4–8 — serving surfaces, migration, release, the privacy claim, the closed ontology | Unchanged |

---

## Desired Outcome

A Medicine Wheel deployment is told which workspaces exist and which one is active, and every
surface that can show or store a record — web page, REST route, `mw` command, MCP tool, browser
layout memory — answers from inside that one named context. Changing the active workspace changes
the data, not the label.

---

## Current Reality

The catalog is a literal in a React component.

```ts
// components/workspaces-panel.tsx
export const WORKSPACES: Workspace[] = [
  { id: "medicine-wheel", name: "Medicine Wheel", direction: "east",  ... },
  { id: "iaip",           name: "IAIP Platform",  direction: "south", ... },
  ...six entries
];
```

`components/navigation.tsx` holds the selection in `useState<Workspace>(WORKSPACES[0])`. Nothing
downstream reads it. Concretely, as of this document:

- **20 API route files** under `app/api/` take no workspace argument;
- the provider factory selects a **backend** from `MW_STORAGE_PROVIDER`, never a **scope**;
- `lib/store.ts` and `lib/jsonl-store.ts` still serve narrative beats and cycles outside the provider seam entirely;
- `/api/charts` and `/api/mmots` are direct file-backed routes;
- browser memory uses two global keys: `medicine-wheel:graph-layouts:v1` and `medicine-wheel:graph-animation:v1`;
- `mw` talks to `MW_API_URL` with no scope; the MCP server picks a store from env at boot and holds it;
- there is no authenticated subject anywhere in the system.

---

## The vocabulary problem that must be solved before anything else

This repository already uses the word *workspace* for something else, and uses it load-bearingly.

`package.json` carries a **27-entry `workspaces` array in deliberate topological order**, with a
comment above it forbidding alphabetization. `npm run <script> --workspaces` executes in that order.
`rispecs/medicine-wheel.spec.md` counts "27 ordered workspaces" as an architectural fact.

So the repo has two meanings of one word:

| | **Suite workspace** (exists today) | **Wheel workspace** (proposed) |
| --- | --- | --- |
| What it is | An npm package in the monorepo | A data and access boundary |
| Lives in | `package.json` `workspaces[]` | A catalog outside every workspace |
| Ordering | Topological, dependency-sensitive | Unordered; a set of peers |
| Lifetime | Build time | Run time |
| Count | 27 + root | Deployment-defined |
| Changes when | A package is added | A person creates a place to work |

**Implication:** every identifier, route segment, env var, CLI flag, MCP argument, and spec sentence
introduced by this work must be unambiguous *at the point of reading*. A field named `workspace`
in a build script and a field named `workspace` in a storage scope will be conflated by a tooling
change, a search-and-replace, or a tired reader — and the failure mode of that conflation is silent
data crossing between wheels.

The recommendation is not to rename the npm array (it is upstream vocabulary and cannot be renamed
honestly). It is to make the new one always qualified in code: `workspaceId` / `WorkspaceScope` /
`MW_WORKSPACE` never appear in build tooling, and `scripts/workspace-packages.mjs` and
`scripts/publish-workspaces.mjs` keep the npm meaning exclusively. Where a document could be read
either way, it says **wheel workspace** or **suite workspace** explicitly.

## What implementing workspace configuration implies

### 1. The catalog needs a home outside every workspace — a bootstrap decision

The moment the catalog stops being a literal, something must hold it, and that something cannot be
workspace-scoped without circularity. Three live options, none free:

| Source | Shape | Cost |
| --- | --- | --- |
| Config file | `.mw/workspaces.json` beside the store | Operator-visible, version-controllable, no auth story; two deployments can disagree |
| Registry records | `.mw/store/workspaces.jsonl` + Neon `workspaces` table | One persistence story; requires registry-level (unscoped) provider operations to exist *first* |
| Environment | `MW_WORKSPACES=` list | Immediate, but unwritable at runtime — no "create a workspace" |

**Implication:** `StorageProvider` gains a second class of operation. Today every operation is
"about records." It must now distinguish **registry-level** (about workspaces, memberships,
relations — deliberately unscoped) from **workspace-owned** (about nodes, edges, ceremonies —
scope mandatory). That distinction is the actual API break, and it is a break in a package that all
27 suite workspaces sit downstream of.

The recommended resolution is *registry records with a file-config seed*: the catalog persists
through the provider, and a `.mw/workspaces.json` may seed a fresh deployment once, idempotently.

### 2. Active-workspace resolution must be a single documented precedence chain

Six surfaces can each claim to know the active workspace: the URL, a header, a cookie, browser
storage, an env var, and the "there is only one" default. If they can disagree, they eventually
will, and the failure is a write landing in the wrong wheel.

> [!IMPORTANT]
> **The chain proposed here is withdrawn.** This section originally carried a six-level chain that
> ranked the request header (2) above the explicit CLI/MCP argument (3). The normative chain is now
> the seven-level one in **`workspace-definition.spec.md` §2.4**, which reverses those two and adds
> the implicit-cwd layer that every existing install already depends on.
>
> Two documents holding two orderings of the same chain is the failure this section exists to
> prevent, so only one of them may state it. `workspace-erd-services.md` encodes the surviving one as
> `CLIENT_SESSION.resolved_from`.

**What survives from this section, unchanged:** resolution must be a *single* documented chain, it
must be written down before code, and every layer below the explicit ones is *presentation*. A
client-supplied cookie is a request, not an authority — once identity exists, the server re-validates
it and may refuse. Writing the chain down is cheap now and impossible to retrofit later without an
audit of every caller.

### 3. Every workspace-owned read and write changes shape

This is the bulk of the work and it is not optional or partial. Scope is enforced *before* lookup,
mutation, count, filter, and delete — a client-side filter is never isolation, and a direct record
id must not bypass the scope.

The blast radius, counted:

- **`src/storage-provider`** — interface, factory, `jsonl.ts`, `neon.ts`, and the parity test suite. JSONL gains per-workspace directories; Neon gains `workspace_id` on every owned table with `(workspace_id, id)` node identity and workspace-aware edge keys so an internal edge cannot silently span two wheels.
- **20 API route files** — **but not all 20 gain a scope.** The count is the inventory, not the work item: `app/api/directions/route.ts` serves the Four Directions, which ERD 1 places on the *global* plane and says are never copied per workspace; `app/api/health/route.ts` reports deployment-level provider state; `app/api/mcp/route.ts` is transport. Each of the 20 needs a classification (workspace-owned / catalog / global / transport) recorded before any of them is rewritten, and only the owned ones gain scoped paths, plus a documented compatibility window mapping historical unscoped routes to the legacy/default workspace. Compatibility behavior must be *deterministic*, never derived from UI state.
- **`lib/store.ts` / `lib/jsonl-store.ts`** — narrative beats and cycles are outside the provider seam today. They must either move onto the seam or be scoped separately; leaving them global means the wheel's narrative layer bleeds across workspaces while the node layer does not, which is worse than either consistent choice.
- **`/api/charts`, `/api/mmots`** — direct file access; each needs classification (owned / catalog / global) before it can be routed.
- **`lib/graph-layout-storage.ts`** — `medicine-wheel:graph-layouts:v1` must become workspace-qualified, and the historical key must be adopted *once* by the legacy/default workspace.
- **`lib/graph-animation-storage.ts`** — `medicine-wheel:graph-animation:v1` must **stay** global. It is a user accessibility preference, not workspace data. Scoping it would be a regression disguised as consistency.

**Implication:** "which collection belongs to whom" is a classification exercise that must complete
*before* implementation, not during it. `workspace-scope-and-access.spec.md` lists the families
already classified and the ones still open; that list is the gate.

### 4. Serving surfaces beyond the browser inherit the requirement

Configuration that only the web app honours is not configuration; it is a second hardcoding.

- **`mw` CLI** — every data command needs `--workspace`, resolving through the chain above, and `mw status` must print the active workspace or the whole notion is invisible to the operator.
- **`mwsrv`** — passes provider selection into the container today (`MW_STORAGE_PROVIDER=jsonl`); it must pass a default scope too, and must not conflate the two.
- **`@medicine-wheel/mcp`** — the sharpest case. The MCP server resolves its store **at boot** and holds it. An agent that switches workspace in the UI does not switch the agent's context. Either every MCP tool takes an explicit `workspace_id`, or the server's scope is a startup fact that must be surfaced in every tool response so an agent cannot silently write to the wrong wheel. Per `CLAUDE.md`: *a live process holds its old build* — it holds its old scope for exactly the same reason, and restarting it is a decision to be named.

### 5. Migration is mandatory, not a follow-up

Existing JSONL files and SQL rows have no `workspace_id`. There is no version of this work that
doesn't touch them.

The path: create one deterministic legacy/default workspace → adopt existing records into it →
map compatibility routes to it → verify counts and relation endpoints → *then* allow a second
workspace to exist. Migration is idempotent, reports what moved and what stayed global, never
overwrites an existing workspace directory, and Neon backfills scope before making the column
mandatory.

**Implication:** the first release cannot ship a second workspace. Slice 1 ships *one* workspace
that is honestly scoped. That is the whole deliverable, and it is the one that proves the seam.

### 6. Release mechanics are affected

The suite moves in lockstep on `0.x`, with `@medicine-wheel/mcp` on `4.x` following the suite's
minor and patch. A change to the `StorageProvider` interface is a change every dependent package
recompiles against, in the topological order the root `workspaces` array pins.

Per `RELEASING.md` and `CLAUDE.md`: publish → **install globally** → **run the installed binary** →
fix → bump → publish again. A workspace-scoped provider that resolves through a repo symlink and
fails on a fresh global install is exactly the failure class that procedure exists to catch. And no
package is skipped for being on a different version line.

### 7. What this does **not** buy, and must not be claimed

There is no authenticated subject in this system. Configurable workspaces give **isolation of
records in a deployment**, not **private multi-user access**. `WorkspaceMembership.subject_id` is
meaningful only after an identity contract exists. Documentation, release notes, and UI copy must
distinguish *local configurability* from *authenticated privacy*, and the moment they don't, the
project has made a security claim it cannot honour.

Also unauthorized by this analysis: a different storage provider per workspace; a workspace relation
that automatically shares records; access control living in client state or prompt text;
cross-workspace internal edges without qualified identity; destructive workspace deletion.

### 8. The ontology invariant survives untouched

A wheel workspace is **not** a seventh `NodeType`. `src/ontology-core/src/types.ts` closes the union
at six and states the additive rule: new kinds ride existing nodes via a `metadata.kind`
discriminator (`ProductionEntityKind`, `InfraEntityKind`, `AcademicEntityKind`).

A workspace does not ride a node either — it is the **container** the nodes are in, one plane up.
The only place a workspace legitimately appears *as a node* is inside a meta-workspace whose subject
matter happens to be the estate of workspaces; there it is a `knowledge` node with
`metadata.kind: "workspace"`, and it is a *portrait* of the catalog record, never the record itself.

---

## Structural Tension

**Current Reality:** One global store behind a switcher whose six cards imply plurality and change
nothing, in a repo where the word "workspace" already means an npm package in a dependency-ordered
build array.

**Desired State:** A configured catalog of real wheel workspaces, each a genuine data boundary,
resolved through one documented precedence chain, honoured identically by web, REST, CLI, and MCP,
over both JSONL and Neon, with existing data migrated intact.

**Natural Progression:** Disambiguate the vocabulary → decide where the catalog lives → split
registry-level from workspace-owned provider operations → classify every stored family → make scope
mandatory at the storage boundary → migrate into a legacy/default workspace → extend the chain to
CLI and MCP → *only then* allow a second workspace → *only after identity* claim privacy.

---

## Quality Criteria

- Selecting a workspace changes the complete owned data context, not navigation styling.
- No surface (web, REST, CLI, MCP) can reach owned data without a resolved scope.
- The precedence chain is documented, deterministic, and identical across surfaces.
- JSONL and Neon pass the same isolation, migration, and refusal tests.
- A direct record id cannot bypass scope on any provider.
- The animation preference remains global; the layout memory becomes scoped; both are deliberate.
- `mw status` and every MCP tool response name the active workspace.
- Existing records survive migration with verified counts and same-workspace edge endpoints.
- Documentation nowhere implies authenticated privacy.
- The `NodeType` union is still closed at six.
- The npm `workspaces` array is still topological.

---

## Open Decisions Inherited

These belong to `workspace-scope-and-access.spec.md` and are not re-decided here; they are the
gates this analysis is blocked behind. **Numbering follows that document's own list** — an earlier
draft renumbered them 1–6 here, which sent `#6` and `#8` to different decisions depending on which
file the reader started from.

- **#1** Which identity/session provider establishes `subject_id`?
- **#2** Route path, header, or both for active scope? *(resolved in `workspace-definition.spec.md`
  §2.4: both, route winning, and the explicit flag above the header)*
- **#3** Which relationship vocabulary is governed? *(ERD 2 proposes a starting set)*
- **#5** Can record ids repeat across workspaces, or must they be globally unique?
- **#6** Which secondary collections are owned vs catalog vs user-global vs deployment-global?
- **#8** Are `repo`, `direction`, and `color` descriptive metadata or integration-driving fields?
  *(closed by construction in `workspace-definition.spec.md` §2.3 — quarantined in `descriptors`)*

---

## Implementation Evidence Appendix

- Hardcoded catalog: `components/workspaces-panel.tsx` (`WORKSPACES`, six entries)
- Selection-only state: `components/navigation.tsx` (`useState<Workspace>(WORKSPACES[0])`)
- Provider contract / factory: `src/storage-provider/src/interface.ts`, `src/storage-provider/src/factory.ts`
- Provider implementations: `src/storage-provider/src/jsonl.ts`, `src/storage-provider/src/neon.ts`
- Unscoped routes: `app/api/**/route.ts` (20 files)
- Legacy narrative storage: `lib/store.ts`, `lib/jsonl-store.ts`
- Browser memory: `lib/graph-layout-storage.ts`, `lib/graph-animation-storage.ts`
- CLI scope surfaces: `cli/mw.ts` (`MW_API_URL`), `cli/mwsrv.ts` (`MW_STORAGE_PROVIDER`)
- MCP store resolution at boot: `mcp/src/store.ts`, `mcp/src/http-store.ts`
- Closed ontology + additive-kind rule: `src/ontology-core/src/types.ts`
- Suite workspace topology (the homonym): root `package.json` `workspaces[]` + its `//workspaces` note
- Release procedure: `RELEASING.md`, `CLAUDE.md`

---

## Related

- `workspace-scope-and-access.spec.md` — the architecture this analysis costs out
- `workspace-erd-internal.md` — ERD 1, a workspace within the wheel
- `workspace-erd-relations.md` — ERD 2, workspace-to-workspace and the package economy
- `workspace-display-analysis.md` — what this does to the drawn wheel
- `../storage-provider.spec.md` — canonical persistence semantics
- `../ontology-core.spec.md` — the closed union and the additive-kind rule
- `../medicine-wheel.spec.md` — system seams and the suite-workspace topology
- [jgwill/medicine-wheel#129](https://github.com/jgwill/medicine-wheel/issues/129) — planning issue

🌸: Configuration is not a settings screen. It is the moment the application stops asserting what exists and starts asking.
