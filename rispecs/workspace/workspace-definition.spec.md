# Workspace — Revised Definition (Service Configuration Layer)

> The grounded definition. A workspace is a **named binding of a Medicine Wheel's services to a
> location and a set of endpoints**, from which data scope follows. This document supersedes the
> *definition* held in `workspace-scope-and-access.spec.md`; it does not discard that document's
> desired outcomes, and says explicitly which of them are deferred and why.

**Version:** 0.2.0 (definition revised on evidence)
**Packages / seams:** `@medicine-wheel/app` · `storage-provider` · `infra` · `mcp` · `mw` / `mwsrv`
**Document ID:** rispec-workspace-definition-v2
**Status:** Design — grounded in `workspace-prior-art.research.md` and in shipped `mwsrv` behavior
**Last Updated:** 2026-09-06
**Supersedes (definition only):** `workspace-scope-and-access.spec.md` §Data → `Workspace`
**Originating input:** `INPUT.md`, `INPUT-02.md`

---

> [!CAUTION]
> **Not settled — see `STATUS.md` §0 (2026-09-06).** The requirement has been stated three times and
> this folder matches none of them. The requester's last statement is **one storage location, many
> workspaces held inside it, one deployment** — not the several-locations-per-request model this
> document was corrected to. In the requester's words: *"we did not understood each other on the
> definition of the workspace."* Read this folder as evidence of two attempts, not as a plan.


## 1. Why the inherited definition was questioned

`workspace-scope-and-access.spec.md` is a careful document and most of its *values* survive intact.
Its **definition**, however, was imported rather than derived. It opens with `Workspace`,
`WorkspaceMembership`, `subject_id`, roles, invitations, and bilateral relation acceptance — the
shape of a SaaS tenancy boundary, the shape Slack, Notion and Linear use, where a workspace is
fundamentally *the billing and membership boundary*
([WorkOS](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear)).

The Medicine Wheel has no billing, no identity provider, no invitations, and — in the case that
actually exists today — no second administrative party. It has **one operator, several project
locations, and several services that must not collide.**

Six specific problems with the inherited definition:

| # | Problem | Evidence |
| --- | --- | --- |
| 1 | **It has no location.** `repo` is "an optional descriptor"; nothing in the model says *where a workspace's data lives*. But `mwsrv --directory <dir>` resolving `<dir>/.mw/store` is the mechanism that already works. A definition that cannot express "this wheel lives here" cannot launch a service. | `cli/mwsrv.ts:117,172` |
| 2 | **It partitions a shared backend and calls it isolation.** "Workspace selection scopes the selected provider; it does not select a provider" is precisely the Terraform CLI-workspace shape, which HashiCorp's own docs say is "not a suitable isolation mechanism." | [HashiCorp](https://developer.hashicorp.com/terraform/cli/workspaces) |
| 3 | **It leads with an access model it cannot implement.** Memberships and capabilities need a `subject_id`, and Open Decision #1 admits no identity provider is chosen. The largest surface in the spec is blocked on its own first open question. | spec §Open Decisions |
| 4 | **Bilateral acceptance presumes a counterparty.** `proposed → accepted by both sides` is ceremony with no second party in the case that exists. Right eventually; wrong first. | spec §WorkspaceRelation |
| 5 | **It never mentions a port, a process, or an endpoint.** Yet two wheels on one host collide on `:8040`, and `@medicine-wheel/infra` already ships `detectPortConflicts` for exactly this. The spec's Application Surfaces section is entirely browser-shaped. | `cli/mwsrv.ts:35`, `src/infra/src/ports.ts` |
| 6 | **It conflates client-side selection with server-side enforcement.** kubeconfig keeps these as two different objects on two sides of the wire — a *context* (client) and a *namespace* (server). One word for both is why "active workspace" reads as both a preference and a guarantee. | [Kubernetes](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) |

**What survives untouched:** isolation is not disconnection; a visible relationship is not an access
grant; reads may compose but writes name one destination; provenance is preserved; local
configurability is not authenticated privacy; nothing is a seventh `NodeType`. Those are the
document's real contribution and this revision keeps every one of them.

---

## 2. The definition

> **A workspace is a named store location that a request can select, and that one running server
> resolves per request — so the same server reads and writes a different location depending on which
> workspace the request named.**
>
> **The name and the registry exist to make that selection possible. Access control attaches later
> and is never implied by it.**

**Corrected 2026-09-06 — see `DIVERGENCE` in `STATUS.md`.** The definition previously read here was
*"a named, resolvable binding of one Medicine Wheel — its store location, its storage provider, and
the service endpoints that serve it."* That is one process per location, with switching between
locations deferred. It is the wrong shape: the requirement is one server serving several locations at
once. `§2.2` and `§2.3` below still describe the superseded shape and are corrected in `§2.0`.

### 2.0 What per-request resolution requires

Three things, and none of them is a name:

1. **A request carries a workspace.** Path segment, header, or session — the mechanism is open; that
   it is *on the request* is not.
2. **The server holds several open stores at once**, keyed by workspace, rather than one resolved at
   import. `lib/store.ts:32` and `mcp/src/store.ts:49` are the module-level constants that make this
   impossible today, and changing them is the feature.
3. **Every operation downstream takes the resolved store**, so no route, tool or helper can reach a
   store it was not handed.

That third point is what `workspace-scope-and-access.spec.md` called mandatory scope at the storage
seam, and what ERD 1 draws as `workspace_id` in the primary key. **Those were right.** This document
superseded them in favour of separate processes, which is the divergence.

### 2.1 It already exists; it is anonymous

```
mwsrv --directory ~/my-research --port 4000
  → store  ~/my-research/.mw/store
  → listen :4000
  → export MW_DATA_DIR
mw   → MW_API_URL (default http://localhost:8040)
mcp  → JsonlStore(.mw/store) | HttpStore(MW_API_URL)
```

Every one of those values is passed by hand, per invocation, with no name attached. Nothing can list
the bindings that exist, notice that two want `:8040`, or tell an agent which wheel it is holding.

🔑 *The analogy that fixes the scope of this work:* this is `kubectl --server=… --user=…
--namespace=…` typed on every command, in the era before `use-context`. **We are not inventing
scoping. We are naming a binding that is already being made anonymously** — and once it has a name,
services can resolve the name instead of re-deriving the tuple.

### 2.2 Three layers, never one word

The single biggest correction. Prior art keeps these separate and so must we:

| Layer | What it is | Where it lives | Enforced by | Exists today |
| --- | --- | --- | --- | --- |
| **Selection** | A name a request carries, resolved to a store per request | Server, at the request boundary | The resolver — not a convenience | No: resolved once at import |
| **Scope** | The boundary a request may touch | Server, at the storage seam | Provider + API | No |
| **Governance** | Who may do what, and how wheels relate | Server, after identity | Authz | No |

The inherited spec named all three "workspace." A binding that *feels* like a guarantee is how a
client-side preference gets mistaken for isolation.

### 2.3 `WorkspaceBinding`

```ts
/**
 * A named binding. Client-side configuration, in the kubeconfig `context` sense:
 * it groups access parameters under a convenient name and owns no records itself.
 */
interface WorkspaceBinding {
  /** Stable, explicit, never reused, NEVER derived from the directory name. */
  id: string;
  /** Human name. Renaming this must not change `id`. */
  name: string;

  // ── What makes the name mean something ──
  /** Where this wheel lives. Local path, or a provider-specific handle. */
  location:
    | { kind: "local"; directory: string }        // → <directory>/.mw/store
    | { kind: "postgres"; connectionRef: string } // → a named secret, never an inline URL
    | { kind: "remote"; apiUrl: string };         // → an already-running wheel
  /** jsonl | neon | redis — per binding, NOT per deployment. */
  provider: string;
  /** How clients reach the services serving this binding. */
  endpoints?: {
    api?: string;   // MW_API_URL
    web?: string;
    mcp?: string;
  };

  // ── Descriptors: presentation only, no behavior ──
  descriptors?: {
    blurb?: string;
    color?: string;
    direction?: "east" | "south" | "west" | "north";
    repo?: string;
  };

  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}
```

**Three rules the shape encodes:**

- **`id` is never derived from the directory name.** Docker Compose derives its project name from the
  directory its compose file lives in, so a different path is a different project and different
  volumes ([Compose tip 053](https://lours.me/posts/compose-tip-053-project-name-workdir/)); two
  checkouts under the same folder name therefore collide, and a rename leaves the old volumes with
  no project to claim them. Moving a project is a `location` edit on an existing binding, never the
  birth of a new one.
- **`provider` moves into the binding.** This is the direct answer to the Terraform warning. Two
  bindings may point at two different stores — that is *separate backends*, the isolation HashiCorp
  actually recommends — instead of two labels over one `MW_STORAGE_PROVIDER`. It also supersedes the
  inherited spec's "What This Stub Does Not Authorize" line forbidding per-workspace providers:
  that prohibition was protecting a shared-backend design this revision abandons.
- **Descriptors are quarantined in their own object.** `color`, `direction`, and `repo` cannot
  quietly acquire behavior, which closes inherited Open Decision #8 by construction. If one of them
  ever drives layout or integration, it must be promoted out of `descriptors` deliberately, in a
  diff someone reviews.

### 2.4 Resolution: whole-binding, highest source wins

Adopted from Claude Code's MCP scope rule, which states it exactly: *"The entire server entry from
that source is used; fields are not merged across scopes."*
([Claude Code — MCP installation scopes](https://code.claude.com/docs/en/mcp#mcp-installation-scopes)).

**This chain is the single normative one for the whole folder.** `workspace-configuration.spec.md` §2
proposed an earlier six-level version that ranked the request header above the explicit flag; that
ordering is withdrawn and that section now points here.

```text
1. explicit route scope   /api/workspaces/:workspaceId/...      ← always wins
2. explicit flag / arg    mw --workspace <id>  ·  { workspace_id }
3. request header         MW-Workspace: <id>
4. session cookie         mw_workspace=<id>                     ← what the UI sets
5. environment            MW_WORKSPACE=<id>
6. registry default       the binding marked default
7. implicit cwd binding   a .mw/store under the working directory
```

**Why the explicit flag outranks the header (2 above 3).** A flag is typed by the operator running
the command. A header is set by whatever sits between the client and the server — a proxy, a browser
extension, a misconfigured gateway. Ranking the header higher would let an injected `MW-Workspace`
silently retarget a write that a human had already named on the command line.

**Why layer 7 exists and what it may not do.** An implicit `.mw/store` under the working directory is
how every wheel is reached today, so the chain has to admit it or Slice 1 breaks every existing
install. It resolves to the *default* binding's identity when one claims that directory, and
otherwise to an anonymous binding that `mw status` must print as unnamed. It never supplies a field
to a binding resolved at any other layer — that would be the field-level merging the rule forbids.

**No field-level merging, ever.** A name from one source and a directory from another is how you get
a wheel labelled `research` writing into `~/other`. Layers 1–5 are *requests*; once identity exists
the server re-validates and may refuse.

### 2.5 Twelve-factor is not violated

> "env vars … are never grouped together as 'environments'" — [12factor.net/config](https://12factor.net/config)

These are two different config surfaces, and the boundary is a rule, not a compromise:

- **The registry configures the *caller*.** It resolves a name into environment. This is what
  kubeconfig, AWS profiles and `.code-workspace` files do.
- **The service reads the *environment*.** `mwsrv` continues to read `MW_DATA_DIR`, `PORT`,
  `MW_STORAGE_PROVIDER` and know nothing about a catalog.

**A service must never read the registry to discover itself.** Doing so would make the registry a
runtime dependency of every process and reintroduce exactly the coupling twelve-factor removes.

---

## 3. The service configuration layer

This is what the requester's clarification made explicit, and the repository is further along than
the inherited spec suggests.

### 3.1 A workspace binding *declares* services

Resolving a binding produces service intents: an API server on a port, optionally a web server,
optionally an MCP server. Those intents are already expressible as `ServiceFacet` +`PortBinding` in
`@medicine-wheel/infra` — riding `knowledge` nodes per `INFRA_ENTITY_BINDING`, with the `NodeType`
union untouched.

### 3.2 Port scarcity is the first real constraint

`mwsrv` defaults to `:8040`. Two bindings started with defaults collide on one host, and today the
second one simply fails at bind time with no explanation naming the first.

`detectPortConflicts` already computes this, and its two documented properties are exactly the ones
needed: the same service claiming a slot twice is not a conflict, and **ports are scarce per host,
not globally**. A registry that knows its bindings can return the collision *as rows, before the
second server is started.*

### 3.3 Reconciliation, not a snapshot

`src/infra/src/reconcile.ts` is level-triggered by design — it compares the declared set against the
observed set every time and remembers no transitions, because "it was caused by a fact that had been
true" ([Kubebuilder](https://book-v1.book.kubebuilder.io/basics/what_is_a_controller.html)).

Map the four drift states onto workspaces and each becomes an operator-legible sentence:

| Drift state | For a workspace binding | Why it matters |
| --- | --- | --- |
| `converged` | Declared and running as configured | The boring, correct case |
| `drifted` | Running on a different port/store than declared | An agent may be writing to the wrong wheel *right now* |
| `unrealized` | Declared, nothing running | `mw` will fail to connect; the UI shows a wheel nobody serves |
| `undeclared` | **A wheel running that no binding names** | The `mwsrv` someone started by hand — holding the port the next binding wants |

`undeclared` is the state that pays for this whole layer. It is also the state the current system
cannot even represent.

### 3.4 A live process holds its binding

`CLAUDE.md`: *a live process holds its old build.* It holds its old **binding** for the same reason.
`mcp/src/store.ts` resolves its store at boot. Switching workspace in the browser does not move a
running MCP server, and no amount of UI state will.

The same is true of the web server, and it is not only an MCP problem. `lib/store.ts:30` is
`const store = getJsonlStore()` at module scope, resolving `MW_DATA_DIR` (or a walked-up `.mw/store`)
once per process; `mcp/src/store.ts:49` is `export const store = createStore()`, the same shape.

**So Slice 1 is one process per binding, and the chain's layer 1 is inert until Slice 3.** A route
scope — `/api/workspaces/:workspaceId/...`, the layer that always wins — presumes one server able to
answer for several bindings. No shipped process can do that: `location` and `provider` are resolved
at boot and held. Until the storage seam takes a scope per request (Slice 3), a binding is served by
its own `mwsrv`, the route layer has nothing to switch between, and the honest `mw workspace use`
either starts a different process or points the client at a different port.

Three honest consequences:
- every MCP tool response should name the workspace it answered from, so an agent cannot be wrong
  silently;
- re-binding a running service is a **restart** — a decision to be named, not a cleanup performed
  quietly;
- the precedence chain must ship documented in full and *implemented* only down to the layers a
  one-process-per-binding deployment can honour, rather than shipping a layer that silently no-ops.

---

## 4. What is deferred, and why that is the point

Explicitly **not** in the first slice — kept as desired state, not deleted:

| Deferred | Why | Unblocked by |
| --- | --- | --- |
| `WorkspaceMembership`, `subject_id`, roles, invitations | No identity contract exists | Inherited Open Decision #1 |
| Capability manifests | Capabilities must be server-derived; there is no server-side subject | Identity |
| Bilateral relation acceptance | No second administrative party in the real case | A second party |
| Working sets / mounted workspaces | Composition is meaningless before one binding is honest | Slice 1 shipping |
| Cross-workspace qualified references | Needs stable ids across bindings first | Slice 1 shipping |

Prior art supports deferring rather than dropping: Slack, Notion and Linear all ship **sensible
defaults with opt-in complexity** — none require permission configuration on day one
([WorkOS](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear)).

**And the honesty rule tightens.** Kubernetes declines to call a namespace a security boundary even
with RBAC and admission control ([Mirantis](https://www.mirantis.com/blog/kubernetes-multi-tenancy-best-practices/)).
A Medicine Wheel with no identity contract at all must claim strictly less. Multi-tenancy is a trust
model, not a security property.

---

## 5. Delivery cadence — corrected 2026-09-06

The cadence previously here put per-request scope **third**, behind naming and service legibility.
That deferred the requirement. Corrected:

**Slice 1 — Per-request store resolution.** A request names its workspace; the server resolves it to
a store and hands that store to every operation downstream. `lib/store.ts` and `mcp/src/store.ts`
stop being module-level constants. One workspace registry, so a name resolves to a location. This is
the feature; nothing below is usable without it.

**Slice 2 — The switch means something.** The UI selection, the `mw --workspace` flag and the MCP
tool argument all reach the resolver. Every response names the workspace it answered from. Existing
data adopted into a default workspace.

**Slice 3 — Several servers, several hosts.** Ports, conflict detection, declared-versus-observed
drift. Real, and orthogonal: it is about running more than one server, not about one server serving
more than one workspace. `workspace-erd-services.md` covers it.

**Slice 4 — Identity, then governance.** Memberships, capabilities, relation lifecycle. Unchanged,
still blocked, still not claimed before it runs.

## 6. Quality criteria

- `mw status` and every MCP tool response name the active binding.
- A binding resolves whole, from one source; no field-level merging.
- `id` is never derived from a directory name; moving a project edits `location`.
- Starting a second binding on a taken port fails with a row naming the incumbent, before bind.
- `undeclared` wheels are reportable.
- No service reads the registry to discover itself.
- Documentation nowhere implies authenticated privacy.
- If both providers are offered, their isolation strengths are stated, not assumed equal. **They
  are stated here, and they are not equal:** JSONL under `location.kind: "local"` is
  directory-per-workspace — the strongest of the three Postgres tenancy shapes, because a separate
  path is a separate store. Neon under the Slice 3 model is shared-schema with `workspace_id` in the
  primary key — the cheapest and the leakiest, whose failure mode is one query written without the
  scope. Making `workspace_id` part of the key rather than a filter column is the right mitigation
  and it is not parity. Any claim that the two providers have "the same observable isolation
  semantics" is a claim about the *API surface*, never about what a mistake costs.
- The `NodeType` union is still closed at six; the npm `workspaces` array is still topological.

---

## 7. Open decisions this revision creates

1. **Is `provider` truly per-binding?** This one question currently carries three answers in this
   folder, which is two too many:
   - `workspace-scope-and-access.spec.md` §What This Stub Does Not Authorize forbids it outright
     ("Selecting a different storage provider per workspace"), and that document's supersession
     banner says its non-definition content stands;
   - §2.3 above authorizes it and calls that prohibition superseded;
   - this list calls it open.

   **The status of record is open, and nothing may be built on it until it is decided.** §2.3 states
   the case *for* — separate backends are the isolation HashiCorp actually recommends — and a case
   is not a decision. Whoever decides it edits all three places in one diff.
2. Where does the registry file live — `~/.mw/workspaces.json`, or per-project, or both with VS
   Code-style precedence?
3. Does a binding own its port, or request one from a per-host allocator?
4. Can one binding be served by several service instances (web + api + mcp) on different hosts, and
   does the registry hold all of them?
5. When a wheel is `undeclared`, may the registry adopt it, or only report it?

---

## Related

- `workspace-prior-art.research.md` — the evidence, with sources
- `workspace-erd-services.md` — ERD 3: the service configuration layer
- `workspace-erd-internal.md` / `workspace-erd-relations.md` — ERD 1 and 2 (scope and governance layers)
- `workspace-scope-and-access.spec.md` — the inherited architecture; values kept, definition superseded
- `workspace-configuration.spec.md` — seam-by-seam implications
- `../../rispecs/docker-containerized-app.kin.md` — "many of them opened in different workspace (project location)"

🌸: The binding was always being made. We were just making it again every time, by hand, and hoping we remembered the same values twice.
