# ERD 3 — The Service Configuration Layer

> The diagram the first two were missing. ERD 1 modelled what a workspace *holds*; ERD 2 modelled how
> workspaces *relate*. Neither modelled the thing that actually runs: a binding resolved into
> services, ports claimed on a host, and declared state reconciled against what is really running.

**Document ID:** rispec-workspace-erd-services-v1
**Status:** Design — extends `workspace-definition.spec.md`; builds on shipped `@medicine-wheel/infra`
**Last Updated:** 2026-09-06

---

> [!NOTE]
> **Corrected 2026-09-06 — see `STATUS.md`.** The requirement is **one server that resolves the store
> per request**: choosing a workspace changes what the running server reads and writes on disk. This
> document has been corrected to that; where older sections still describe one server per location,
> they say so.


## Scope of this diagram — corrected 2026-09-06

This models **several servers on one or more hosts**: ports, preconditions, and declared-versus-
observed drift. That is real and it is `@medicine-wheel/infra`'s territory.

It is **not** the requirement. The requirement is *one* server resolving a store per request — see
`STATUS.md` and `workspace-definition.spec.md` §2.0. Where this diagram implies that switching
workspace means starting or restarting a service, that implication is superseded: switching is a
resolver lookup inside a running process. `SERVICE_INTENT` here declares a server; it does not
declare a workspace.

---

## What this layer answers

Four questions the system cannot answer today:

1. Which wheels exist on this machine, by name?
2. Which are running, and on what ports?
3. Is what is running the same as what was declared?
4. **Is something running that nobody wrote down** — holding the port the next wheel wants?

⚙️ *The metaphor:* the binding is the **written arrangement** — who camps where, which fire is whose.
The running services are the **fires actually burning**. `reconcile()` is walking the camp at dusk
and comparing. `undeclared` is the fire nobody claims, in the spot the next family was promised.

---

## ERD 3 — bindings, services, ports, drift

```mermaid
erDiagram
    WORKSPACE_BINDING ||--|| STORE_LOCATION : "resolves to"
    WORKSPACE_BINDING ||--o{ SERVICE_INTENT : "declares"
    WORKSPACE_BINDING ||--o| WORKSPACE_SCOPE : "may further partition into"
    SERVICE_INTENT }o--|| HOST : "is intended for"
    SERVICE_INTENT ||--o{ DECLARED_PORT_BINDING : "claims"
    HOST ||--o{ DECLARED_PORT_BINDING : "has slots claimed on"
    HOST ||--o{ OBSERVED_STATE : "is read by"
    OBSERVED_STATE ||--o{ RUNNING_SERVICE : "reports"
    RUNNING_SERVICE ||--o{ OBSERVED_PORT_BINDING : "actually holds"
    SERVICE_INTENT ||--o| RUNNING_SERVICE : "reconciles against"
    SERVICE_INTENT ||--o{ PRECONDITION : "must satisfy"
    DECLARED_PORT_BINDING ||--o{ PORT_CONFLICT : "may collide in"
    OBSERVED_PORT_BINDING ||--o{ PORT_CONFLICT : "may collide in"
    RECONCILE_RESULT }o--|| SERVICE_INTENT : "reports on"
    CLIENT_SESSION }o--|| WORKSPACE_BINDING : "has active"
    KNOWLEDGE_NODE ||--o| SERVICE_INTENT : "is annotated by (ServiceFacet)"

    WORKSPACE_BINDING {
        string id PK "stable, explicit, NEVER derived from directory name"
        string name
        string location_kind "local | postgres | remote"
        string provider "jsonl | neon | redis — per binding, not per deployment"
        string api_endpoint "MW_API_URL clients resolve to"
        string mcp_endpoint
        json descriptors "color, direction, repo, blurb — presentation only"
        string status "active | archived"
        boolean is_default
    }

    STORE_LOCATION {
        string binding_id PK, FK
        string kind PK "local | postgres | remote"
        string directory "local: resolves to <directory>/.mw/store"
        string connection_ref "postgres: a named secret, never an inline URL"
        string api_url "remote: an already-running wheel"
    }

    SERVICE_INTENT {
        string binding_id PK, FK
        string id PK
        string role "api (mwsrv) | web (next) | mcp"
        string host_id FK "ports are scarce PER HOST"
        string mode "process | docker"
        string working_directory "the docker-zulip .env-read-from-cwd finding"
        string exec_stop "'compose stop', never 'compose down'"
        json metis "invisible work the grid must hold, not flatten"
    }

    HOST {
        string node_id PK "annotates a RelationalNode of type 'land'"
        string hostname
        json reachable_via "lan | tailnet | cloudflare | ngrok"
    }

    DECLARED_PORT_BINDING {
        string host_id PK, FK
        string proto PK "tcp | udp — absent normalises to tcp"
        number port PK
        string bound_by FK "SERVICE_INTENT.id"
    }

    OBSERVED_STATE {
        string host_id PK, FK "the host this reading was taken ON"
        string observed_at PK "ISO 8601 — required"
        string observed_by "required: a reading with no reader is a rumour"
    }

    RUNNING_SERVICE {
        string host_id PK, FK
        string unit PK "systemd unit or container name"
        string binding_id FK "NULL when undeclared — the dangerous case"
        string store_path "what it is ACTUALLY serving"
    }

    OBSERVED_PORT_BINDING {
        string host_id PK, FK
        string proto PK
        number port PK
        string bound_by FK "RUNNING_SERVICE.unit"
    }

    PORT_CONFLICT {
        string host_id PK, FK "scarce per host, not globally"
        string proto PK
        number port PK
        json claimants "distinct, sorted — same service twice is NOT a conflict"
    }

    PRECONDITION {
        string service_intent_id PK, FK
        string kind PK "linger | port-free | unit-present | store-writable"
        string verdict "satisfied | unsatisfied | unauthorized | unknown"
        string consent_ref "→ ConsentRecord — a machine fact NEVER carries consent"
    }

    RECONCILE_RESULT {
        string service_intent_id PK, FK
        string computed_at PK
        string drift "converged | drifted | unrealized | undeclared"
        json differences "named fields, not a boolean"
    }

    WORKSPACE_SCOPE {
        string binding_id PK, FK
        string workspace_id PK "only needed when ONE store holds several wheels"
        string note "Slice 3 — see ERD 1"
    }

    CLIENT_SESSION {
        string id PK
        string active_binding_id FK "client-side, like kubeconfig current-context"
        string resolved_from "route | flag | header | cookie | env | default | cwd"
    }

    KNOWLEDGE_NODE {
        string id PK
        string type "knowledge — union stays closed at six"
        string metadata_kind "service (INFRA_ENTITY_BINDING)"
        string direction "west — the thing that executes"
    }
```

---

## The reconciliation loop

```mermaid
flowchart LR
    subgraph DECLARED["📝 Declared — the registry"]
        D1["WORKSPACE_BINDING<br/>research → ~/my-research · :4000"]
        D2["WORKSPACE_BINDING<br/>medicine-wheel → ~/mw · :8040"]
    end

    subgraph OBSERVED["👁️ Observed — read from the host, with a reader and a time"]
        O1["mwsrv :4000<br/>store ~/my-research/.mw/store"]
        O2["mwsrv :8040<br/>store ~/OTHER/.mw/store"]
        O3["mwsrv :8041<br/>started by hand at 2am"]
    end

    D1 --> R{"reconcile()<br/>level-triggered,<br/>remembers no transitions"}
    D2 --> R
    O1 --> R
    O2 --> R
    O3 --> R

    R -->|"declared == observed"| C1["✅ converged<br/>research"]
    R -->|"both exist, disagree"| C2["⚠️ drifted<br/>medicine-wheel serving the wrong store —<br/>an agent may be writing there NOW"]
    R -->|"declared, not running"| C3["🕳️ unrealized<br/>mw will fail to connect"]
    R -->|"running, undeclared"| C4["🔥 undeclared<br/>nobody wrote it down —<br/>and it holds the next binding's port"]

    style DECLARED fill:#2b2118,stroke:#d4a373,color:#f5efe6
    style OBSERVED fill:#1f2933,stroke:#7fb3d5,color:#eef4f8
    style C2 fill:#3a2418,stroke:#d98f5a,color:#f8ece2
    style C4 fill:#3a1c1c,stroke:#d96a6a,color:#f8e4e4
```

---

## What ERD 3 is deliberately saying

**`WORKSPACE_BINDING` and `WORKSPACE_SCOPE` are different tables, on purpose.** kubeconfig keeps
*context* (client-side, groups access parameters under a convenient name) separate from *namespace*
(server-side resource). Collapsing them is what let a colour-switcher be mistaken for isolation.
`WORKSPACE_SCOPE` is drawn as `||--o|` — **optional** — because it is only needed when one store
holds several wheels. Bind separate locations and you may never need it.

**Declared and observed are separate tables that never merge.** Not two views of one truth. The
whole value is in their disagreement. `OBSERVED_STATE` requires `observed_by` and `observed_at`
because `src/infra/src/reconcile.ts` says it: *an observation with no reader and no time is a rumour,
and reconciling against a rumour is how the snapshot problem comes back wearing a different hat.*

**`RUNNING_SERVICE.binding_id` is nullable, and that null is the point.** It is the `undeclared`
state — the `mwsrv` someone started by hand, which is exactly the service holding the port the next
binding is about to be given. A model without that null cannot report the failure that actually
happens.

**`host_id` is part of every port key.** Ports are scarce *per host*. `:4444` on `eury` and `:4444` on
`gaia` are not in tension; the shipped `detectPortConflicts` already encodes this, along with the
rule that the same service claiming a slot twice (once declared, once observed) is not a conflict.

**`PRECONDITION.verdict` has four values, not two.** `unauthorized` is its own verdict: the machine
is ready and the human has not said yes. `preconditions.ts` guards this explicitly — once granted
consent is inferred from a machine fact, withdrawing consent stops meaning anything, because the flag
is still set. A store directory being writable is never permission to write in it.

**`metis` survives into the service layer.** `MetisHold` exists so the ontology can *hold* the
"restart it twice, the first start races the mount" that keeps a system alive. A workspace registry
that normalises that away would be a legibility grid doing the harm it was built to avoid.

**`SERVICE_INTENT` annotates a node; it is not a node.** Per `INFRA_ENTITY_BINDING`, a service rides
a `knowledge` node facing **west** — the thing that executes. `FACET_NODE_TYPES` is typed against the
closed union on purpose, so the union cannot widen without a compile error. Nothing here adds a
seventh `NodeType`.

**`CLIENT_SESSION.resolved_from` is recorded, not just resolved.** When something goes wrong the
first question is *why does this client think it is in that workspace* — and the answer must not
require guessing which of seven sources won.

---

## Related

- `workspace-definition.spec.md` — the definition this diagram serves
- `workspace-prior-art.research.md` — kubectl contexts, Compose project names, level-triggered reconciliation
- `workspace-erd-internal.md` — ERD 1, the scope layer (Slice 3)
- `workspace-erd-relations.md` — ERD 2, the governance layer (Slice 4)
- `src/infra/` — `ServiceFacet`, `PortBinding`, `detectPortConflicts`, `reconcile`, `Precondition`, `MetisHold`

> [!NOTE]
> **The root `CLAUDE.md` understates what `infra` ships.** It reads *"`@medicine-wheel/infra` is
> types plus one pure function (`detectPortConflicts`)"*. `src/infra/src/index.ts` says otherwise
> and the files are there: `ports.ts` (S3), `preconditions.ts` (S4), `reconcile.ts` (S6),
> `schemas.ts`, alongside `MetisHold` (S5) in `types.ts`. Everything this diagram builds on exists
> and is exported. A reader who checks `CLAUDE.md` first will conclude ERD 3 rests on code that was
> never written; correcting that line is `CLAUDE.md`'s owner's call, not this folder's.
- `../infrastructure-topology-ui.spec.md` — the operator-facing surface this could render into

🌸: Configuration that cannot be compared against what is running is not configuration. It is a wish with a filename.
