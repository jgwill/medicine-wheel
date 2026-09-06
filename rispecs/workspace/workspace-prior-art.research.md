# Prior Art — What "Workspace" Means Where It Already Works

> Research record. Ten systems that solved some version of this problem, what each one actually
> means by its scoping word, and what each implies for the Medicine Wheel. Gathered because the
> inherited definition in `workspace-scope-and-access.spec.md` was assumed rather than grounded, and
> because a definition that cannot survive contact with prior art will not survive contact with
> operators either.

**Document ID:** rispec-workspace-prior-art-v1
**Status:** Research — evidence for `workspace-definition.spec.md`
**Gathered:** 2026-09-06
**Method:** Web research against primary documentation where available; secondary sources named as such

---

## The finding that reorganised everything

**The Medicine Wheel already has workspaces. They are anonymous.**

```
mwsrv --directory ~/my-research --port 4000
      └─ resolves ~/my-research/.mw/store
      └─ binds :4000
      └─ sets MW_DATA_DIR
mw    → talks to MW_API_URL (default http://localhost:8040)
mcp   → JsonlStore on .mw/store, or HttpStore when MW_API_URL is set
```

That tuple — **project location + store + port + provider + client endpoint** — is a workspace. It
exists, it ships, it works, and it has no name. It is re-typed by hand on every invocation, and
nothing in the system can enumerate the ones that exist, notice that two of them want port 8040, or
tell an agent which one it is talking to.

`rispecs/docker-containerized-app.kin.md` states the goal in the requester's own earlier words:
*"we'd supply the path of the project we want a .mw/store folder being created (or exist) so we can
launch the service and connect the MCP to it … the goal is that on the network, we are capable to
connect all agent to the medicine-wheel app and potentially have many of them opened in different
workspace (project location)."*

**Workspace (project location).** The parenthesis was the definition all along.

🔑 *The analogy:* this is `kubectl --server=… --user=… --namespace=…` typed on every single command,
before anyone invented `kubectl config use-context`. The work is not to invent scoping. The work is
to **give a name to a binding that is already being made anonymously**, and then let services
resolve that name instead of re-deriving it.

---

## The ten systems

### 1. kubectl contexts — the closest match, and the one to copy

> "A *context* element in a kubeconfig file is used to group access parameters under a convenient
> name. Each context has three parameters: cluster, namespace, and user."
> — [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)

Two structural lessons, both load-bearing:

- **A context is a *named binding*, not a container.** It owns nothing. It says: when I say `dev`, I
  mean *this* server, as *this* identity, defaulting to *this* namespace.
- **Contexts are client-side configuration; namespaces are server-side resources.** They are
  different objects on different sides of the wire. The `current-context` lives in a kubeconfig file
  and the cluster has never heard of it.

**Implication:** the Medicine Wheel needs *both*, named separately. A **binding** (client-side, "when
I say `research`, I mean this store on this port") and, later, a **scope** (server-enforced, "this
request may only touch these records"). The inherited spec collapsed them into one word, which is
why it could not describe launching a service.

### 2. Terraform workspaces — the cautionary tale, from the vendor itself

> "CLI workspaces within a working directory use the same backend, so they are not a suitable
> isolation mechanism for this scenario."
> — [HashiCorp: Manage workspaces](https://developer.hashicorp.com/terraform/cli/workspaces)

HashiCorp goes further, recommending *separate configurations with different backends* when strong
separation is wanted, and noting that workspaces suit "a parallel, distinct copy of a set of
infrastructure to test a set of changes."

**This is the single most important warning for us.** `MW_STORAGE_PROVIDER` is deployment-level;
`workspace-scope-and-access.spec.md` correctly states that "workspace selection scopes the selected
provider; it does not select a provider." That is *exactly the Terraform shape* — one backend,
several logical partitions — and Terraform's own docs say that shape is **not an isolation
mechanism**. So either:

- the Medicine Wheel accepts that shared-backend workspaces are an *organisational* boundary and
  stops calling them isolation; **or**
- a workspace binds its own store location (a different `.mw/store`, a different database), which is
  the separate-backend answer — and which is exactly what `mwsrv --directory` already does.

The second is both stronger and already built. That is the recommendation.

### 3. Kubernetes namespaces — "boundary" does not mean "security boundary"

Namespace boundaries are described by practitioners and the Kubernetes documentation as *weak*, and
soft multi-tenancy is characterised as trusting tenants to be non-malicious — minimising accidents
rather than resisting attack. Isolation comes from namespaces **plus** RBAC, network policy, quotas,
and pod security standards, layered.
— [Mirantis: Kubernetes Multi-Tenancy Best Practices](https://www.mirantis.com/blog/kubernetes-multi-tenancy-best-practices/) · [AWS EKS: Tenant Isolation](https://docs.aws.amazon.com/eks/latest/best-practices/tenant-isolation.html) · [AmberWolf: Breaking Boundaries](https://blog.amberwolf.com/blog/2025/september/kubernetes_namespace_boundaries/)

**Implication:** this is the strongest available support for the inherited spec's own most honest
sentence — that local configurability is not authenticated privacy. Even Kubernetes, with RBAC and
admission control, declines to call a namespace a security boundary. A Medicine Wheel with **no
identity contract at all** must not claim more. Multi-tenancy is a *trust model*, not a *security
property*.

### 4. Postgres tenancy patterns — three shapes, and ours is already chosen

The field settles on three: shared schema with a `tenant_id` and row-level security (cheapest,
leakiest — "the danger is a missing `WHERE tenant_id = ?`"); schema-per-tenant (better isolation,
migrations must run per tenant); database-per-tenant (strongest isolation, connection pooling
becomes the constraint).
— [PlanetScale: Approaches to tenancy in Postgres](https://planetscale.com/blog/approaches-to-tenancy-in-postgres)

**Implication:** the inherited spec's Neon design (`workspace_id` on every owned table, composite
keys) is the *shared-schema* pattern, and inherits the shared-schema failure mode. Its own mitigation
— making `workspace_id` part of the **primary key** rather than a filter column — is the right one:
a bare record id stops naming a row. But the JSONL side (`.mw/store/workspaces/<id>/…`) is
*directory-per-tenant*, i.e. the strongest pattern. **The two providers would not be at the same
isolation strength**, which is a parity problem the spec's own "same observable isolation semantics"
requirement does not currently acknowledge.

### 5. VS Code workspaces — configuration layering done in the open

A `.code-workspace` file names a set of root folders *and carries settings*. Precedence is explicit:
**User → Workspace → Folder**, most specific winning.
— [VS Code: Multi-root Workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) · [VS Code: User and workspace settings](https://code.visualstudio.com/docs/getstarted/settings)

Note the repo already contains `WS__medicine-wheel.code-workspace`.

**Implication:** the dev-tool meaning of "workspace" is *a named set of locations plus the
configuration that applies to them*. That is far closer to what the Medicine Wheel needs than the
SaaS meaning, and it comes with a precedence chain worth copying wholesale.

### 6. Claude Code MCP scopes — the anti-merge rule

Server configs resolve **local → project → user**, and the highest-precedence definition **wins
entirely; fields are not merged across scopes**.
— [Claude Code: Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart)

**Implication:** adopt this rule verbatim. A workspace binding resolves as **a whole**, from one
source. Half a binding from a cookie and half from an env var is the bug class that produces "the
name says `research` and the store is `~/other`". No field-level merging, ever.

### 7. Docker Compose project names — the naming failure we must not repeat

`COMPOSE_PROJECT_NAME` prefixes every container, network, and volume, and lets the same stack run
many times on one host. **By default it is the lowercased directory name** — so two checkouts in
folders both called `app` collide, and renaming the directory makes Compose think it is a brand-new
project: it cannot find the old containers, and named volumes are orphaned.
— [Docker: Compose networks](https://docs.docker.com/reference/compose-file/networks/) · [Compose tip: project name and working directory](https://lours.me/posts/compose-tip-053-project-name-workdir/)

**Implication, and it is concrete:** *do not derive workspace identity from the directory name.* The
directory is the *location*, an attribute of the binding; the `id` is stable, explicit, and never
reused (ERD 1 already says "stable, never reused" — this is why). Moving a project must be a
`location` change on an existing workspace, never the birth of a new one that orphans the old store.

### 8. Level-triggered reconciliation — the repo already implements this

A level-triggered controller ignores individual events and compares current declared state against
current observed state, every time. It is why Kubernetes survives missed events and restarts.
— [Kubebuilder: What is a Controller](https://book-v1.book.kubebuilder.io/basics/what_is_a_controller.html) · [Level Triggering and Reconciliation in Kubernetes](https://medium.com/hackernoon/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)

`src/infra/src/reconcile.ts` is already this, explicitly, with four drift states — `converged`,
`drifted`, `unrealized`, `undeclared` — and its doc comment names the outage it answers: *"It was
caused by a fact that had been true."*

**Implication:** the workspace registry is a **declared** set. Running servers are the **observed**
set. `reconcile()` already exists to compare them, and `undeclared` — *running and nobody wrote it
down* — is precisely the `mwsrv` somebody started by hand that holds the port the next workspace
wants. This is the mechanism that makes workspace configuration real rather than decorative, and no
new engine has to be written for it.

### 9. Twelve-factor config — the honest counter-argument

> "In a twelve-factor app, env vars are granular controls, each fully orthogonal to other env vars,
> and are never grouped together as 'environments'."
> — [The Twelve-Factor App: Config](https://12factor.net/config)

This is a direct objection to named bundles, and it deserves a real answer rather than being
ignored.

**The answer is that these are two different config surfaces.** Twelve-factor governs *a running
deploy's own configuration* — the server process should read `MW_DATA_DIR` and `PORT` from its
environment and know nothing about a catalog. The named binding governs *a client choosing among
many targets* — which is exactly what kubeconfig, AWS profiles, and `.code-workspace` files are for,
and none of them violate twelve-factor, because they configure the *caller*, not the *deploy*.

**Implication:** the boundary is sharp and must be written down. The workspace registry resolves a
name into env; the service reads env. A service must never read the registry to discover itself.

### 10. Slack / Notion / Linear — the meaning we must *not* import

In Notion a workspace handles billing and members, while team spaces organise pages and permissions;
all three products scope customisation at a product-specific boundary, with sensible defaults and
opt-in complexity.
— [WorkOS: Multi-tenant permissions done right](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear) · [Notion: Workspace vs Team Space](https://connex.digital/blog/notion-workspace-vs-team-space-understanding-the-key-differences/)

**Implication — this is the diagnosis of the inherited spec.** In SaaS, "workspace" means *the
billing and membership boundary*. That is why `workspace-scope-and-access.spec.md` leads with
`WorkspaceMembership`, `subject_id`, roles, invitations, and bilateral relation acceptance: it
imported the SaaS meaning of the word. But the Medicine Wheel has **no billing, no identity
provider, no invitations, and no second administrative party** — so it imported the vocabulary of a
problem it does not have, while omitting the one it does: *several project locations, several
running services, one operator, one machine.*

The "opt-in complexity" lesson applies literally: none of those products make you configure
permissions on day one. Neither should this.

---

## Comparative table

| System | Its scoping word | What the word actually binds | Enforced by | Lesson for us |
| --- | --- | --- | --- | --- |
| kubectl | context | cluster + user + namespace | Nothing — client convenience | **Name the binding; keep it client-side** |
| Terraform | workspace | state key in *one shared* backend | Nothing | Shared backend ⇒ not isolation. Bind the store instead |
| Kubernetes | namespace | API object scope | RBAC + policy, layered | "Boundary" ≠ "security boundary" |
| Postgres | tenant | rows / schema / database | DB constraints or app code | Composite PK, not a filter column |
| VS Code | workspace | folder set + settings | Nothing | Explicit precedence: user → workspace → folder |
| Claude Code | MCP scope | server definition | Nothing | Highest scope wins **whole**; never merge fields |
| Compose | project | container/network/volume prefix | Docker daemon | Never derive identity from directory name |
| Kubernetes | reconcile loop | declared vs observed | Controller | Level-triggered; `undeclared` is the dangerous state |
| 12-factor | (rejects grouping) | per-deploy env vars | Convention | Registry configures the *caller*, not the deploy |
| Slack/Notion/Linear | workspace | billing + membership | Server-side authz | **The meaning we accidentally imported** |

---

## What the research changes

1. **A workspace is primarily a binding, not a tenancy.** Named, client-side, resolvable, whole.
2. **The binding includes a location.** `repo`, `direction`, and `color` are descriptors; `location`
   and `provider` are not — they are what makes the name mean something.
3. **Membership and bilateral relation acceptance are deferred, not central.** They are the SaaS
   meaning, they need an identity contract that does not exist, and importing them first is how the
   simple, working, already-shipped case gets buried.
4. **Services are the point.** The layer configures `mwsrv`, the Next server, and the MCP server —
   and `@medicine-wheel/infra` already supplies port-conflict detection and level-triggered
   reconciliation to make that safe.
5. **Two providers, two isolation strengths.** Directory-per-workspace (JSONL) and shared-schema
   (Neon) are not equally strong; the parity claim must be stated honestly or the design changed.
6. **The Terraform warning is the one to heed.** Do not build a shared-backend partition and call it
   isolation.

---

## Sources

- [Kubernetes — Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [HashiCorp — Manage workspaces (Terraform CLI)](https://developer.hashicorp.com/terraform/cli/workspaces)
- [Mirantis — Kubernetes Multi-Tenancy Best Practices](https://www.mirantis.com/blog/kubernetes-multi-tenancy-best-practices/)
- [AWS — EKS Best Practices: Tenant Isolation](https://docs.aws.amazon.com/eks/latest/best-practices/tenant-isolation.html)
- [AmberWolf — Breaking Boundaries: Kubernetes Namespaces and multi-tenancy](https://blog.amberwolf.com/blog/2025/september/kubernetes_namespace_boundaries/)
- [PlanetScale — Approaches to tenancy in Postgres](https://planetscale.com/blog/approaches-to-tenancy-in-postgres)
- [VS Code — Multi-root Workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces)
- [VS Code — User and workspace settings](https://code.visualstudio.com/docs/getstarted/settings)
- [Claude Code — Connect to MCP servers](https://code.claude.com/docs/en/mcp-quickstart)
- [Docker — Define and manage networks in Docker Compose](https://docs.docker.com/reference/compose-file/networks/)
- [Compose, Break, Repeat — Compose project name and working directory](https://lours.me/posts/compose-tip-053-project-name-workdir/)
- [Kubebuilder — What is a Controller](https://book-v1.book.kubebuilder.io/basics/what_is_a_controller.html)
- [HackerNoon — Level Triggering and Reconciliation in Kubernetes](https://medium.com/hackernoon/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [WorkOS — Multi-tenant permissions done right: Slack, Notion, Linear](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear)

🌸: The word arrived carrying someone else's problem. The research is how we found out which parts of it were ours.
