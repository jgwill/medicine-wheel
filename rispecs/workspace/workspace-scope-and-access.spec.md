# Workspace Scope and Access — RISE Specification

> Architecture stub for user-defined Medicine Wheel workspaces, their isolated internal records, and the governed relationships that let people and agents understand and work across several workspaces without flattening their relationality.

**Version:** 0.1.0 (stub)
**Packages / seams:** `@medicine-wheel/app` + `@medicine-wheel/storage-provider`
**Document ID:** rispec-workspace-scope-access-v1
**Status:** Stub — desired architecture; not implemented
**Last Updated:** 2026-08-22
**Tracking Issue:** [jgwill/medicine-wheel#129](https://github.com/jgwill/medicine-wheel/issues/129)

---

## Desired Outcome

A person or agent enters Medicine Wheel and sees the workspaces they may meaningfully access. They can create or select a workspace and encounter one coherent wheel: its nodes, relations, ceremonies, narratives, accountability, and layouts move together as one context.

Workspaces remain distinct without becoming disconnected. A person or agent can see how authorized workspaces relate, understand the meaning and obligations of each relationship, and form an explicit working set when an activity spans several workspaces. Every record retains its origin, every write names its destination, and no relationship silently becomes permission.

---

## Current Reality

The application presents six hardcoded workspace cards. Selection is browser component state that changes only the displayed name and color. It does not alter API requests, storage scope, or rendered Medicine Wheel data, and it resets on refresh.

Runtime persistence converges on one asynchronous `StorageProvider` contract with JSONL as the local default and Neon/Postgres as the hosted relational implementation. Provider operations are currently global to the configured store. They do not accept workspace context.

Nodes, edges, ceremonies, inquiry weaves, plan perspectives, diary entries, ceremony events, and captures use the provider seam. Narrative beats and cycles still use a legacy local store. Charts and MMOTs have direct file-backed routes. Graph layouts use one browser-storage key. Static directions and resources are reference data rather than workspace records.

The application has no authenticated user/session boundary. It can support configurable local workspaces, but it cannot honestly claim secure private multi-user access until identity and server-side membership enforcement exist.

---

## Creative Intent

### What this enables

- A personal, project, team, or community wheel can grow without mixing its internal records with another wheel.
- A deployed application can serve real workspace catalogs rather than source-code examples.
- People and agents can move through related work while retaining context, provenance, obligations, and access boundaries.
- A relationship between workspaces can be witnessed and governed as its own record rather than inferred from copied data or matching repository names.

### What must not be flattened

- A workspace is not merely a color, navigation filter, repository string, or ontology node subtype.
- Isolation is not disconnection: related workspaces remain describable.
- A visible relationship is not an access grant.
- A composed multi-workspace read is not permission to write to whichever workspace happens to be active.
- A cross-workspace reference is not a copied private record.
- JSONL and Neon are storage choices, not different meanings of workspace.

---

## Structural Tension

**Current Reality:** One deployment exposes one global data context behind a switcher whose cards imply several workspaces but change no data. Adding simple tenant filters would isolate records while leaving relationships between workspaces unrepresented.

**Desired State:** Each workspace is a real data and access boundary held inside a wider relational registry. People and agents can enter one workspace, understand its authorized neighbors, and intentionally compose a working set without losing provenance or crossing permissions.

**Natural Progression:** Make workspace identity mandatory at the storage boundary; hold workspace-to-workspace relationships in a registry-level graph; expose explicit context and capability manifests to clients; migrate legacy data into a known default workspace; then add authenticated memberships before private multi-user publication.

---

## Architectural Boundaries

### 1. Workspace Catalog Plane

The catalog exists outside any one workspace. It answers:

- which workspaces the current subject may discover;
- which workspace is active;
- how workspaces relate;
- which capabilities the subject has for each workspace and relationship.

It holds `Workspace`, `WorkspaceMembership`, and `WorkspaceRelation` records. Entering a workspace does not make the catalog disappear; authorized neighboring workspaces remain reachable as context.

### 2. Workspace Data Plane

Each workspace owns its internal records. Every provider operation over owned data executes inside one mandatory `WorkspaceScope`.

The scope is enforced before lookup, mutation, counting, filtering, or deletion. A client-side filter is never treated as isolation. Direct record identifiers cannot bypass the scope.

### 3. Multi-Workspace Working Set

A working set is an explicit temporary composition with one primary workspace and zero or more mounted workspaces.

Mounted reads preserve `workspace_id` on every result. Writes always name exactly one destination workspace. Changing the primary workspace cannot silently retarget an in-flight operation. A mounted workspace is read-only unless a separate capability explicitly permits a write to it.

### 4. Cross-Workspace Reference Boundary

An internal record may refer to a record in another workspace through a qualified identity such as:

```text
mw://workspace/<workspace-id>/node/<node-id>
```

The reference preserves identity and provenance. It does not embed the target record and does not confer access. Dereferencing performs a fresh authorization check and may return a redacted, unavailable, or withdrawn result.

---

## Data

### Workspace

```ts
interface Workspace {
  id: string;
  slug: string;
  name: string;
  blurb?: string;
  status: "active" | "archived";
  direction?: "east" | "south" | "west" | "north";
  color?: string;
  repo?: string;
  created_at: string;
  updated_at: string;
}
```

`direction`, `color`, and `repo` are optional descriptors unless a later integration contract gives them behavior. A workspace is a scope container, not a seventh ontology node type.

### WorkspaceMembership

```ts
interface WorkspaceMembership {
  workspace_id: string;
  subject_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  state: "invited" | "active" | "withdrawn";
  created_at: string;
  updated_at: string;
}
```

A `subject_id` is meaningful only after an identity/session contract exists. Local single-user mode may use one documented deployment subject but must not describe that convention as secure multi-user authorization.

### WorkspaceRelation

```ts
interface WorkspaceRelation {
  id: string;
  from_workspace_id: string;
  to_workspace_id: string;
  relationship_type: string;
  directionality: "directed" | "symmetric";
  state: "proposed" | "active" | "withdrawn" | "archived";
  visibility: "public" | "members" | "shared-members" | "restricted";
  obligations: string[];
  created_by: string;
  accepted_by?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}
```

Candidate relationship meanings include `depends-on`, `derived-from`, `collaborates-with`, `publishes-to`, `mirrors`, and `shares-context-with`. The governed vocabulary remains a design decision. Existing kinship vocabulary should be reused where its meaning truly applies, not mechanically imposed.

A relationship is its own governed record. Neither endpoint owns the truth alone. Bilateral relationships may begin as `proposed` and become `active` only after acceptance by authorized stewards from both workspaces. Withdrawal remains inspectable history.

### WorkspaceScope

```ts
interface WorkspaceScope {
  workspace_id: string;
  subject_id?: string;
  capabilities: WorkspaceCapability[];
}

type WorkspaceCapability =
  | "discover"
  | "read"
  | "write"
  | "administer"
  | "relate"
  | "invite";
```

The server derives capabilities from authenticated identity and policy. Clients may receive capabilities for presentation but cannot assert them as authority.

### WorkspaceWorkingSet

```ts
interface WorkspaceWorkingSet {
  primary_workspace_id: string;
  mounted: Array<{
    workspace_id: string;
    capabilities: WorkspaceCapability[];
  }>;
}
```

A working set is context, not a new persistence backend and not a merged workspace. It may be session-scoped or saved as a user preference later.

---

## Relational Access Semantics

Access is evaluated separately for:

1. discovering workspace metadata;
2. seeing that a workspace relation exists;
3. reading the relationship's meaning, provenance, and obligations;
4. opening or querying either endpoint's internal records;
5. writing inside an endpoint;
6. proposing, accepting, or withdrawing the relationship.

A subject may legitimately see a relation while lacking access to one endpoint's internal records. Policy decides whether that endpoint is named, redacted, or omitted. The response must not leak a private workspace through names, counts, record identifiers, or relation metadata.

A relationship never inherits the union of both workspaces' memberships. Membership in workspace A does not imply membership in related workspace B.

An agent receives a context manifest naming:

- the primary workspace;
- mounted workspaces;
- visible workspace relations;
- capabilities for each scope;
- explicit write targets;
- unavailable or redacted references.

This manifest gives the agent relational awareness without relying on prompt text as an access-control mechanism.

---

## Provider Contract

Provider selection remains deployment-level:

```text
MW_STORAGE_PROVIDER=jsonl | neon
```

Workspace selection scopes the selected provider; it does not select a provider.

The canonical seam should support one of these equivalent conceptual forms:

```ts
createProvider({ workspaceId, subject })
```

or:

```ts
provider.forWorkspace(scope)
```

The final API is open, but these invariants are not:

- all workspace-owned operations require scope;
- workspace catalog and relationship operations are explicitly registry-level;
- both JSONL and Neon implement the same observable isolation and relationship semantics;
- direct ID operations, counts, filters, upserts, and refusals remain scoped;
- provider errors distinguish missing, inaccessible, and relationally refused operations without leaking private existence.

### JSONL Representation

A candidate local layout is:

```text
.mw/store/workspaces.jsonl
.mw/store/workspace-memberships.jsonl
.mw/store/workspace-relations.jsonl
.mw/store/workspaces/<workspace-id>/nodes.jsonl
.mw/store/workspaces/<workspace-id>/edges.jsonl
.mw/store/workspaces/<workspace-id>/ceremonies.jsonl
...
```

Per-workspace directories fit the existing file-provider shape and make the scope visible to local operators. File placement still does not replace authorization when the app serves several users.

### Neon/Postgres Representation

Neon adds registry tables for workspaces, memberships, and workspace relations. Every workspace-owned table gains `workspace_id` with indexed, workspace-aware keys.

Nodes may use `(workspace_id, id)` identity. Edges use `(workspace_id, from_id, to_id)` and workspace-aware foreign keys so an internal edge cannot silently connect records from another workspace. Cross-workspace meaning belongs to `workspace_relations` or a qualified-reference contract, not an ordinary internal edge.

Row-level security may support defense in depth after identity is selected, but provider and API behavior remain responsible for the canonical contract.

---

## Workspace-Owned and Global Records

### Owned in the first visible slice

- nodes;
- edges;
- ceremonies;
- narrative beats;
- narrative cycles;
- graph layout dispositions stored in the browser.

### Must be classified before implementation

- inquiry weaves;
- plan perspectives;
- ceremonial diary entries;
- ceremony events;
- captures;
- structural tension charts;
- MMOT records.

### Global unless requirements change

- Four Directions reference definitions;
- static resource/teaching reference material;
- genuinely user-global display preferences such as animation preference.

A collection cannot remain accidentally global. Each family is deliberately classified as catalog-level, workspace-owned, user-global, or deployment-global.

---

## Application Surfaces

### Workspace Catalog

- Lists only discoverable workspaces.
- Supports loading, empty, inaccessible, invited, active, and archived states.
- Provides create, rename, and archive actions only when capabilities permit.
- Presents related workspaces with relation meaning and state.
- Offers a `Wheel of Workspaces` reading where workspace relations can be understood before entering an internal wheel.

### Active Workspace Context

- Lives above navigation and page data loaders.
- Persists across pages and sessions through a documented URL, cookie, or browser-storage contract.
- Revalidates access when restored.
- Causes every workspace-owned surface to refetch or invalidate coherently.
- Never displays a new workspace name over data from the prior workspace during transition.

### Working Set

- Names one primary workspace.
- Mounts other authorized workspaces intentionally.
- Shows source-workspace provenance on composed results.
- Requires an explicit destination for creation or mutation.
- Lets a person or agent return to the single-workspace reading without changing stored data.

### Workspace-Aware API

Explicit route scope is preferred conceptually:

```text
/api/workspaces/:workspaceId/nodes
/api/workspaces/:workspaceId/edges
/api/workspaces/:workspaceId/ceremonies
/api/workspace-relations
```

A compatibility window may map historical unscoped routes to the deterministic legacy/default workspace. Compatibility behavior is documented and cannot silently switch based on client UI state.

---

## Creative Advancement Scenarios

### Scenario: A person creates a project wheel

**Desired Outcome:** Hold one project's relations and ceremonies without mixing another project's history.
**Current Reality:** The deployment presents hardcoded names over one global store.
**Natural Progression:** Create a workspace, enter its scoped wheel, add records through workspace-aware operations, and persist the selection.
**Resolution:** The project has a coherent wheel that remains distinct across refreshes and provider implementations.

### Scenario: An agent follows a relationship without exceeding access

**Desired Outcome:** Understand that workspace A publishes toward workspace B and what obligations that relation carries.
**Current Reality:** Repository labels imply connections, but the workspace catalog has no first-class relational record.
**Natural Progression:** Read the authorized registry graph and capability manifest; inspect the relationship; dereference B only if access permits.
**Resolution:** The agent understands the relation without receiving unauthorized records from B.

### Scenario: Work spans two related workspaces

**Desired Outcome:** Compare or coordinate authorized material from two workspaces while preserving where every record belongs.
**Current Reality:** Selecting one label does not scope data, and combining global results would erase provenance.
**Natural Progression:** Establish one primary workspace, mount the related workspace, compose authorized reads with `workspace_id`, and name the destination on each write.
**Resolution:** Work advances across both contexts without merging them or misdirecting mutations.

### Scenario: A relationship is withdrawn

**Desired Outcome:** Stop treating two workspaces as actively related while preserving what was agreed and later changed.
**Current Reality:** A simple foreign-key deletion would erase relational history.
**Natural Progression:** Transition the relationship to `withdrawn`, retain its provenance and obligations, and remove it from active traversal unless history is requested.
**Resolution:** Current behavior changes without pretending the relationship never existed.

### Scenario: Existing installations gain workspace scope

**Desired Outcome:** Upgrade without losing unscoped records or changing their meaning.
**Current Reality:** Existing JSONL files and SQL rows have no `workspace_id`.
**Natural Progression:** Create one deterministic legacy/default workspace, migrate or adopt existing records, map compatibility routes to it, and verify counts and relations before enabling new workspaces.
**Resolution:** Existing wheels remain intact while new scoped work becomes possible.

---

## Migration and Continuity

- Existing records enter one deterministic legacy/default workspace.
- Migration is idempotent and reports what moved, what remained global, and what could not be classified.
- JSONL migration preserves inspectable history and does not overwrite an existing workspace directory.
- Neon migration backfills scope before making it mandatory and verifies edge endpoints remain in the same workspace.
- Browser graph-layout keys become workspace-qualified; the historical key is adopted by the legacy/default workspace once.
- Existing unscoped API consumers receive a documented compatibility period.
- Provider parity tests run over both fresh and migrated stores.

---

## Participating Roles

### Product / Domain Steward

Defines what a workspace means to people, which records move together, which relationship meanings are legitimate, and what the first publishable experience includes.

### Product-Minded Solution Architect

Owns the cross-cutting contract among catalog, internal scope, relationship graph, working sets, providers, APIs, identity, compatibility, and publication. This role leads the first discovery pass because no single UI or storage change can establish the boundary alone.

### Data / Storage Engineer

Designs JSONL layout, Neon keys and constraints, provider parity, migrations, qualified identities, and continuity checks.

### Backend Engineer

Implements workspace-aware operations, catalog routes, relationship lifecycle, capability resolution, and non-leaking error behavior.

### Frontend Engineer

Implements the workspace catalog, active context, relational view, working-set interactions, accessible transitions, provenance display, and browser-storage namespacing.

### Identity / Security Reviewer

Validates subject resolution, memberships, bilateral relation acceptance, disclosure behavior, and server-side isolation before private multi-user access is advertised.

### QA / Release Contributor

Builds cross-provider contract tests, migration fixtures, direct-ID isolation tests, multi-workspace interaction tests, and release documentation distinguishing local configuration from authenticated privacy.

---

## Suggested Delivery Cadence

### Slice 1 — Honest local workspaces

- Replace hardcoded catalog data.
- Create/select/persist workspace context.
- Scope the visible wheel data and graph layouts.
- Adopt existing records into a legacy/default workspace.
- Support registry-level workspace relations without claiming private multi-user security.

### Slice 2 — Hosted access and relational context

- Select an identity/session contract.
- Add memberships and server-derived capabilities.
- Add relation proposal, bilateral acceptance, withdrawal, and visibility policy.
- Expose agent context manifests and authorized working sets.

### Slice 3 — Wider relational operation

- Add qualified cross-workspace record references.
- Classify and scope secondary collections.
- Consider saved working sets and richer Workspace Wheel visualization.
- Specify cross-deployment federation only after trust and identity semantics are established.

---

## Quality Criteria

- Selecting a workspace changes the complete owned data context, not only navigation styling.
- Workspace scope is enforced at storage/API boundaries for reads and writes.
- JSONL and Neon pass the same isolation, relation, migration, and refusal tests.
- A workspace relationship is first-class, stateful, provenance-bearing, and access-aware.
- Seeing a relationship never implicitly grants endpoint data access.
- Multi-workspace reads preserve provenance; writes always name one destination.
- Private workspace existence and metadata do not leak through relation traversal or errors.
- Existing data remains available through a deterministic migration path.
- Documentation distinguishes local configurability from authenticated privacy.
- Every stored family is intentionally classified rather than accidentally global.

---

## Open Decisions

1. Which identity/session provider establishes `subject_id` for hosted use?
2. Is active scope carried in route paths, headers, or both?
3. Which workspace relationship vocabulary is governed, and which relations require bilateral acceptance?
4. What may be disclosed when one visible workspace relates to an inaccessible workspace?
5. Can record IDs repeat across workspaces, or must all IDs remain globally unique?
6. Which secondary collections are workspace-owned, catalog-level, user-global, or deployment-global?
7. Does the first public release include working sets, or only single-workspace selection plus related-workspace discovery?
8. Are `repo`, direction, and color descriptive metadata or integration-driving fields?
9. What history may be retained after membership or relationship withdrawal?
10. Which trust model could later support relationships across separate Medicine Wheel deployments?

---

## What This Stub Does Not Authorize

- Selecting a different storage provider per workspace.
- Treating a relationship as automatic record sharing.
- Hiding access control in client state or prompt instructions.
- Cross-workspace internal edges without qualified identity and access semantics.
- Destructive workspace deletion or silent bulk movement.
- Claims of secure private multi-user workspaces before authenticated server-side enforcement.
- Cross-deployment federation before a separate trust design exists.

---

## Implementation Evidence Appendix

This appendix records current evidence without turning repository layout into the conceptual contract.

- Hardcoded catalog and presentation: `components/workspaces-panel.tsx`
- Selection-only state: `components/navigation.tsx`
- Provider contract: `src/storage-provider/src/interface.ts`
- Provider factory: `src/storage-provider/src/factory.ts`
- JSONL implementation: `src/storage-provider/src/jsonl.ts`
- Neon implementation: `src/storage-provider/src/neon.ts`
- SQL baseline: `scripts/001-create-medicine-wheel-tables.sql`
- Legacy narrative storage: `lib/store.ts`, `lib/jsonl-store.ts`
- Browser graph-layout storage: `lib/graph-layout-storage.ts`
- Canonical persistence RISE contract: `rispecs/storage-provider.spec.md`
- System seam contract: `rispecs/medicine-wheel.spec.md`

---

## Related

- [jgwill/medicine-wheel#129](https://github.com/jgwill/medicine-wheel/issues/129) — planning issue for user-defined, data-scoped, relational workspaces
- [jgwill/medicine-wheel#40](https://github.com/jgwill/medicine-wheel/issues/40) — earlier container/project-location sketch
- `rispecs/storage-provider.spec.md` — canonical provider semantics
- `rispecs/ontology-core.spec.md` — internal node/relation vocabulary and governed kinship
- `rispecs/consent-lifecycle.spec.md` — withdrawal and ongoing consent semantics
- `rispecs/graph-viz.spec.md` — possible visual language for a Wheel of Workspaces

🌸: A workspace is a place where relations can be held. The catalog is the place where those places can know one another without becoming one another.
