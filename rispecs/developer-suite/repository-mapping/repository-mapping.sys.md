# repository-mapping — system

Repository mapping: the rows an owner hub holds, the lifecycle a repository moves through, and the meta mapping that reads several hubs without copying them.

## erd: repository-mapping.erdf.json — repository_mapping

```mermaid
erDiagram
    OwnerHub ||--o{ Repository : "maps"
    OwnerHub ||--o{ OwnerRegistration : "registers"
    Repository ||--|| ActivityReading : "is observed as"
    Repository ||--o{ Feature : "holds"
    Capability ||--o{ Feature : "is realized by"
    Repository }o--o{ Capability : "provides"
    Repository }o--o{ ResearchField : "aligns with"
    Repository }o--o{ Prototype : "is prototyped as"
    Repository ||--o{ Relation : "is related through"
    OwnerHub {
        string hub PK "<owner>/<owner>"
        string owner "GitHub login"
        enum(owner_meta) kind
        string schema "medicine-wheel/repository-mapping"
        number version
        string description
    }
    OwnerRegistration {
        string hub PK "The registered <owner>/<owner>"
        string registered_in FK "The meta hub holding the row"
        string owner
        string source "Local path or https URL of the mapping folder; GitHub raw by default"
        string holder "The owner's human or agent node on the wheel"
        string registeredBy
        datetime registeredAt
    }
    Repository {
        string nodeId PK "repository:<owner>/<name>"
        string hub FK "The hub of the owner who holds it"
        enum(own_agent_community-fork) origin
        enum(unclassified_prototype_implementation_maintained_archived) lifecycle "Declared. The state machine repository_lifecycle moves it."
        string purpose "What it is and has done, at most 55 words"
        string horizon "What it might do, at most 55 words"
        enum(clear_unclear_undefinable_needs-resolution) status "needs-resolution: the statement did not fit 55 words, or two sources disagree."
        string[] fields "research-field:<slug> nodes"
        string[] prototypes "prototype:<slug> nodes of the Miadi prototype seam"
        string holder
        string statedBy "A model id, an agent seat or a person."
        datetime statedAt
        string[] grounding "What was read: paths, commits, URLs, owner/repo#n. At least one."
        enum(pending_revised_affirmed) revision "pending until a person reads it; every model-written row starts pending."
        string revisedBy
        datetime revisedAt
    }
    ActivityReading {
        string repository PK, FK
        string observedBy
        datetime observedAt "Also the time activity is measured from"
        number commits
        number commitsLast90Days
        datetime firstCommitAt
        datetime lastCommitAt
        number tags
        string branch
        string head
    }
    Feature {
        string nodeId PK "feature:<owner>/<name>#<slug>"
        string repository FK
        string name
        string statement "At most 55 words"
        enum(clear_unclear_undefinable_needs-resolution) status "needs-resolution: the statement did not fit 55 words, or two sources disagree."
        string realizes FK
        string statedBy "A model id, an agent seat or a person."
        datetime statedAt
        string[] grounding "What was read: paths, commits, URLs, owner/repo#n. At least one."
        enum(pending_revised_affirmed) revision "pending until a person reads it; every model-written row starts pending."
        string revisedBy
        datetime revisedAt
    }
    Capability {
        string nodeId PK "capability:<slug>"
        string name
        string statement "At most 55 words"
        enum(clear_unclear_undefinable_needs-resolution) status "needs-resolution: the statement did not fit 55 words, or two sources disagree."
        string[] providedBy "Repository or service nodes"
        string statedBy "A model id, an agent seat or a person."
        datetime statedAt
        string[] grounding "What was read: paths, commits, URLs, owner/repo#n. At least one."
        enum(pending_revised_affirmed) revision "pending until a person reads it; every model-written row starts pending."
        string revisedBy
        datetime revisedAt
    }
    Relation {
        string from PK
        enum(forked-from_grew-into_provides_realizes_consumes_field-aligns-with) type PK
        string to PK
        string description "Why the two are related, at most 55 words"
        string statedBy "A model id, an agent seat or a person."
        datetime statedAt
        string[] grounding "What was read: paths, commits, URLs, owner/repo#n. At least one."
        enum(pending_revised_affirmed) revision "pending until a person reads it; every model-written row starts pending."
        string revisedBy
        datetime revisedAt
    }
    ResearchField {
        string nodeId PK "research-field:<slug>"
        string name
    }
    Prototype {
        string nodeId PK "prototype:<slug>"
        string public_url
        string editor_url "Handed only to a viewer who may edit the episode"
    }
```

## machine: repository-lifecycle.smdf.json — RepositoryLifecycle

```mermaid
stateDiagram-v2
    [*] --> Unclassified
    Unclassified --> Prototype : explore
    Unclassified --> Implementation : implement
    Unclassified --> Maintained : release
    Unclassified --> Archived : archive
    Prototype --> Implementation : concretize
    Prototype --> Archived : archive
    Implementation --> Maintained : release
    Implementation --> Archived : archive
    Maintained --> Archived : archive
    Archived --> Unclassified : reopen
```

## sequence: meta-mapping.sqdf.json — meta_mapping

```mermaid
sequenceDiagram
  actor p1 as Person
  actor p2 as MappingAgent
  actor p3 as Cli
  actor p4 as OwnerHub
  actor p5 as MetaHub
  p1->>p2: 1 map miadisabelle's repositories into miadisabelle/miadisabelle
  p2->>p3: 2 mw-repomap init miadisabelle --owner miadisabelle
  p2->>p3: 3 mw-repomap observe <clones> --write
  opt for a repository whose purpose does not fit 55 words
    p2->>p4: f1.1 status needs-resolution, no purpose move to the next repository
  end
  p2->>p4: 4 repositories.jsonl: a prototype, purpose in 55 words, pending · explore
  opt when the evidence says the intent already grew into another repository
    p2->>p4: f2.1 relations.jsonl: grew-into, the prototype keeps its state
  end
  p2->>p4: 5 features.jsonl: its three core features
  p2->>p3: 6 mw-repomap validate
  p3-->>p2: 7 0 errors, warnings name capabilities held elsewhere
  p1->>p5: 8 owners.jsonl: register miadisabelle/miadisabelle
  p3->>p5: 9 mw-repomap serve jgwill: read owners.jsonl
  p3->>p4: 10 read .miadi/repository-mapping/ where it lives
  p3-->>p1: 11 one page: every hub, drift, rows pending revision
  p1->>p4: 12 affirm a row: revision affirmed, revisedBy, revisedAt

```
