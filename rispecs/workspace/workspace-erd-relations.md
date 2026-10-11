# ERD 2 — Workspace to Workspace, and the Package Economy

> The second diagram exists because the first could not hold this without lying. A workspace's
> interior (ERD 1) is a containment story: one owner, many owned records. A relation *between*
> workspaces is a governance story: two owners, one record, neither holding the whole truth — plus,
> in software, a versioned flow of artifacts that has its own life.

**Document ID:** rispec-workspace-erd-relations-v1
**Status:** Design — extends `workspace-scope-and-access.spec.md`; the software entity kinds are a proposal
**Last Updated:** 2026-09-06

---

> [!CAUTION]
> **Diverged from the requirement — see `STATUS.md` (2026-09-06).** The requirement is **one server
> that resolves the store per request**. This document was written assuming one server per location.
> It is kept as evidence, not reverted. Read `STATUS.md` §6 for what in it survives.
>
> **Still not settled — `STATUS.md` §0.** The requirement was stated a third time after this banner
> was written: **one storage location, many workspaces inside it.** That is not the several-locations
> model this folder was corrected to, and the two are still both present. The requester's words:
> *"we did not understood each other on the definition of the workspace."*


## Why this is a separate diagram

Three things about workspace↔workspace relations refuse to sit inside ERD 1:

1. **The relation is its own record with its own owner problem.** `WorkspaceRelation` is not a
   foreign key on either workspace. Neither endpoint may unilaterally assert it, and withdrawal is
   a state change, not a delete.
2. **Visibility ≠ access.** Seeing that A relates to B tells you nothing about whether you may read
   B. The diagram has to show a relationship that deliberately does **not** propagate reachability.
3. **The artifact flow is a different graph.** "A produces packages that B consumes" is not one
   edge. It is a package, a stream of versioned releases, a declared range on the consumer's side,
   and a resolution between them that changes over time without anyone editing the relationship.

🌾 *The metaphor:* the **relation** is the agreement between two camps that one will send corn each
harvest. The **package economy** is the actual corn — which year's harvest, how much, whether it
arrived. Recording only the agreement tells you nothing about whether anyone ate. Recording only the
corn tells you nothing about whether it was owed, gifted, or taken.

---

## ERD 2a — The governed relationship

```mermaid
erDiagram
    WORKSPACE ||--o{ WORKSPACE_RELATION : "is from_workspace of"
    WORKSPACE ||--o{ WORKSPACE_RELATION : "is to_workspace of"
    WORKSPACE_RELATION }o--|| RELATIONSHIP_TYPE : "means"
    WORKSPACE_RELATION ||--o{ RELATION_ACCEPTANCE : "requires"
    WORKSPACE_RELATION ||--o{ RELATION_OBLIGATION : "carries"
    WORKSPACE_RELATION ||--o{ RELATION_EVENT : "records history in"
    SUBJECT ||--o{ RELATION_ACCEPTANCE : "gives"

    WORKING_SET }o--|| WORKSPACE : "has primary"
    WORKING_SET ||--o{ MOUNTED_WORKSPACE : "mounts"
    MOUNTED_WORKSPACE }o--|| WORKSPACE : "points at"
    MOUNTED_WORKSPACE ||--o{ CAPABILITY : "is limited to"

    WORKSPACE_RELATION ||--o{ QUALIFIED_REFERENCE : "makes meaningful"

    WORKSPACE {
        string id PK
        string slug UK
        string name
        string status
    }

    WORKSPACE_RELATION {
        string id PK
        string from_workspace_id FK "the proposing side, not the owning side"
        string to_workspace_id FK
        string relationship_type FK
        string directionality "directed | symmetric"
        string state "proposed | active | withdrawn | archived"
        string visibility "public | members | shared-members | restricted"
        string created_by FK
        string created_at
        string updated_at
        json metadata
    }

    RELATIONSHIP_TYPE {
        string name PK "governed vocabulary — not free text"
        string directionality "directed | symmetric"
        boolean requires_bilateral_acceptance
        boolean implies_artifact_flow "true for publishes-to / depends-on"
        string description
    }

    RELATION_ACCEPTANCE {
        string relation_id PK, FK
        string workspace_id PK, FK "which side is accepting"
        string subject_id FK "an authorized steward of that side"
        string state "pending | accepted | refused | withdrawn"
        string decided_at
    }

    RELATION_OBLIGATION {
        string relation_id PK, FK
        string obligation PK "what this relationship asks of the parties"
        string category "human | land | spirit | future"
        boolean honored
    }

    RELATION_EVENT {
        string id PK
        string relation_id FK
        string kind "proposed | accepted | refused | withdrawn | archived"
        string actor_subject_id FK
        string at
        json note "withdrawal keeps its reason — history is not deleted"
    }

    WORKING_SET {
        string id PK "session-scoped or saved preference"
        string primary_workspace_id FK "the only default write target"
        string subject_id FK
    }

    MOUNTED_WORKSPACE {
        string working_set_id PK, FK
        string workspace_id PK, FK
        boolean read_only "true unless a capability explicitly permits write"
    }

    CAPABILITY {
        string name PK "discover | read | write | administer | relate | invite"
        string derived_from "server policy — never client assertion"
    }

    SUBJECT {
        string id PK
        string display_name
    }

    QUALIFIED_REFERENCE {
        string uri PK "mw://workspace/:id/node/:id"
        string from_workspace_id FK
        string target_workspace_id "no access implied"
        string resolution "resolved | redacted | unavailable | withdrawn"
    }
```

### Proposed governed vocabulary

Free-text `relationship_type` is how a vocabulary dies. A starting governed set, each row a decision
someone must actually make:

| `name` | Directionality | Bilateral acceptance | Implies artifact flow | Meaning |
| --- | --- | --- | --- | --- |
| `publishes-to` | directed | yes | **yes** | The producer releases artifacts the consumer takes up |
| `depends-on` | directed | yes | **yes** | The inverse view, asserted by the consumer |
| `derived-from` | directed | no | no | This workspace began as a fork, extraction, or descendant |
| `mirrors` | symmetric | yes | no | Two workspaces intentionally hold the same material |
| `collaborates-with` | symmetric | yes | no | Shared active work without shared records |
| `shares-context-with` | symmetric | yes | no | Mutual discoverability for agents composing a working set |

Reuse existing kinship vocabulary from `ontology-core` **where its meaning truly applies** — not
mechanically. A workspace relation is between *places*; kinship edges are between *beings*. Where
the words coincide, check the meaning before borrowing it.

### Two invariants the diagram is drawn to enforce

- **`WORKSPACE_RELATION` has no owner side.** `from_workspace_id` records who *proposed*, and
  `RELATION_ACCEPTANCE` carries one row per endpoint. `state` becomes `active` only when both
  required acceptances are `accepted`. Withdrawal writes a `RELATION_EVENT` and moves state; nothing
  is deleted.
- **Nothing in this diagram grants read access.** `MOUNTED_WORKSPACE` is the *only* path to another
  workspace's records, it is explicit, it defaults to read-only, and its capabilities are derived
  server-side. A `WORKSPACE_RELATION` next to it is context, not a key. Membership in A never
  implies membership in B.

---

## ERD 2b — The package economy

This is the requester's example made explicit: *the result of one workspace creates packages
consumed within another workspace.*

The producing side and the consuming side are **not** two halves of one edge. They are two
assertions that may disagree, and a resolution that changes without either of them being edited.

```mermaid
erDiagram
    WORKSPACE ||--o{ PACKAGE : "produces"
    PACKAGE ||--o{ PACKAGE_RELEASE : "emits versions"
    PACKAGE }o--|| PUBLICATION_CHANNEL : "is published through"
    WORKSPACE ||--o{ PACKAGE_CONSUMPTION : "declares"
    PACKAGE_CONSUMPTION }o--|| PACKAGE : "requests"
    PACKAGE_CONSUMPTION ||--o| PACKAGE_RELEASE : "resolves to (at a moment in time)"
    PACKAGE_RELEASE ||--o{ RELEASE_VERIFICATION : "must pass"
    WORKSPACE_RELATION ||--o{ PACKAGE_CONSUMPTION : "governs and witnesses"

    KNOWLEDGE_NODE ||--o| PACKAGE : "is the in-wheel portrait of"
    KNOWLEDGE_NODE ||--o| PACKAGE_RELEASE : "is the in-wheel portrait of"

    WORKSPACE {
        string id PK
        string slug UK
        string name
    }

    PACKAGE {
        string workspace_id PK, FK "the producing workspace — the only writer"
        string id PK
        string name UK "registry-visible name, e.g. @medicine-wheel/ontology-core"
        string channel_id FK
        string version_line "e.g. 0.x suite line, 4.x mcp line"
        string status "active | deprecated | withdrawn"
    }

    PUBLICATION_CHANNEL {
        string id PK
        string kind "npm | container-registry | git-tag | file"
        string endpoint "registry URL or path"
        boolean public
    }

    PACKAGE_RELEASE {
        string workspace_id PK, FK
        string package_id PK, FK
        string version PK "semver — immutable once emitted"
        string released_at
        string integrity "digest, not a promise"
        boolean install_verified "RELEASING.md: publish is not deploy"
        boolean withdrawn "deprecation is a state, never an edit of an old version"
    }

    RELEASE_VERIFICATION {
        string package_id PK, FK
        string version PK, FK
        string step PK "published | installed-globally | binary-ran"
        boolean passed
        string evidence
        string at
    }

    PACKAGE_CONSUMPTION {
        string workspace_id PK, FK "the CONSUMING workspace — its own assertion"
        string id PK
        string package_name "by name — the producer may be unknown or unreachable"
        string producer_workspace_id FK "nullable: an external package has no wheel"
        string range "declared range, e.g. ^0.10.0"
        string resolved_version FK "what is actually installed right now"
        string surface "runtime | build | dev | peer"
        boolean is_internal "true for suite workspaces inside one wheel"
    }

    KNOWLEDGE_NODE {
        string workspace_id PK, FK
        string id PK
        string type "knowledge — the union stays closed at six"
        string metadata_kind "package | release | repository (proposed SoftwareEntityKind)"
        string direction "west — the thing that executes"
    }

    WORKSPACE_RELATION {
        string id PK
        string from_workspace_id FK
        string to_workspace_id FK
        string relationship_type "publishes-to / depends-on"
        string state
    }
```

### The flow, end to end

```mermaid
flowchart LR
    subgraph A["🔥 Workspace A — producer"]
        A1["Suite workspaces<br/>topological build order"] --> A2["PACKAGE<br/>@medicine-wheel/ontology-core"]
        A2 --> A3["PACKAGE_RELEASE<br/>0.10.0"]
        A3 --> A4{"RELEASE_VERIFICATION<br/>published → installed → ran"}
    end

    A4 -->|"passes"| CH["📦 PUBLICATION_CHANNEL<br/>npm registry"]
    A4 -.->|"fails → ship the next version,<br/>never annotate a broken one"| A3

    subgraph B["🔥 Workspace B — consumer"]
        B1["PACKAGE_CONSUMPTION<br/>range ^0.10.0"] --> B2["resolved_version 0.10.0"]
        B2 --> B3["B's own records<br/>built on A's artifact"]
    end

    CH --> B1

    REL["🪢 WORKSPACE_RELATION<br/>A publishes-to B · state: active<br/>obligations: notify on breaking change"]
    REL -.->|"witnesses, governs,<br/>grants no read access"| B1
    A -.-> REL
    B -.-> REL

    style A fill:#2b2118,stroke:#d4a373,color:#f5efe6
    style B fill:#241d2b,stroke:#b08bbb,color:#f3ecf6
    style CH fill:#1f2933,stroke:#7fb3d5,color:#eef4f8
    style REL fill:#1c2a22,stroke:#89b39a,color:#e9f3ed
```

---

## What ERD 2b is deliberately saying

**The same shape appears at two scales, and only one of them exists today.**
Inside the `medicine-wheel` wheel workspace, 27 suite workspaces already produce packages consumed
by each other — that is the topological `workspaces` array in root `package.json`, and it is an
*intra*-workspace dependency graph. Across wheel workspaces (medicine-wheel → iaip), the identical
shape becomes *inter*-workspace. `PACKAGE_CONSUMPTION.is_internal` is the flag that distinguishes
them, and it is the whole reason the two must not be modelled as one relation type.

**Producer and consumer assert separately, on purpose.** `PACKAGE` is written only by the producing
workspace. `PACKAGE_CONSUMPTION` is written only by the consuming workspace. Neither can edit the
other's row. A consumer may declare a dependency on a package whose producing workspace it cannot
read, or that has no wheel at all (`producer_workspace_id` nullable — most of npm). This is not a
modelling compromise; it is the honest shape of the world.

**The resolution moves without an edit.** `range` is a declaration; `resolved_version` is a fact
about right now. A lockfile change moves the fact without touching the declaration or the
relationship. Modelling this as a single `depends-on` edge would make every install a relationship
change, which is both false and unusably noisy.

**`RELEASE_VERIFICATION` is in the diagram because `RELEASING.md` says it must be.** Publishing is
not deploying, and a green publish is not a working install. The three steps — published, installed
globally, binary ran — are separate rows because two of them have historically passed while the
third failed, and the whole procedure exists to catch that gap. A `PACKAGE_RELEASE` with
`install_verified: false` is a release nobody should consume.

**Cycles are legal at the relation level and illegal at the release level.** A and B may each
`publishes-to` the other — that is reciprocity, and reciprocity is not a bug. But
`PACKAGE_CONSUMPTION → PACKAGE_RELEASE` must be acyclic *for any single resolution moment*, because
a build has to terminate. Two different diagrams, two different rules; drawing them as one graph
would force a false constraint onto one of them.

**Software entities ride existing nodes.** `KNOWLEDGE_NODE.metadata_kind` proposes a
`SoftwareEntityKind` of `package | release | repository`, following the pattern already established
by `ProductionEntityKind`, `InfraEntityKind`, and `AcademicEntityKind` in
`src/ontology-core/src/types.ts`. Direction binding follows the infra precedent: a package is
**west** — the thing that executes. The `NodeType` union stays closed at six. The knowledge node is
the *portrait* of the package in the wheel; `PACKAGE` is the registry record. They are joined
optionally, and the wheel can hold either without the other.

---

## Open decisions specific to ERD 2

1. Does `publishes-to` require bilateral acceptance, or may a producer declare it unilaterally
   (given that consumers frequently do not know they are known)?
2. Is a `PACKAGE_CONSUMPTION` on an unreachable producer workspace visible in that producer's own
   view? Disclosing it leaks that B exists; hiding it leaves A blind to its own reach.
3. Where does `RELEASE_VERIFICATION` evidence live — as records, or as CI attestations referenced by
   qualified identity?
4. Should `SoftwareEntityKind` be added to `ontology-core` at all, or should packages stay purely
   catalog-plane records with no in-wheel portrait?
5. What obligation vocabulary is governed for `publishes-to` — "notify on breaking change" is a
   real reciprocal duty, and unenforced obligations that are never named are how reciprocity
   quietly becomes extraction.

---

## Related

- `workspace-erd-internal.md` — ERD 1: what a workspace holds
- `workspace-configuration.spec.md` — the implications of building it
- `workspace-scope-and-access.spec.md` — relational access semantics in full
- `../ontology-core.spec.md` — the additive-kind pattern this proposal follows
- `../../RELEASING.md` — why `RELEASE_VERIFICATION` has three steps

🌸: A dependency is a relationship someone is having whether or not it was agreed to. The catalog is where it can become an agreement.
