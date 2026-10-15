# Foundations: the wheel's events, and why the logic lives here

Two questions shaped `@medicine-wheel/events` (jgwill/medicine-wheel#164,
miadi-chronicle://548):

- **What is an event, and how does it travel?** This is the event-driven
  architecture side.
- **Why does logic first written in Miadi end up in a Medicine Wheel package
  that Miadi then installs?** This is the side of modules, packages and
  upstream work.

Both have a literature behind them. This page names it, says what each idea
asks of us, and points to where the wheel already does it, or does not yet.
It is a reading list with a map, not a survey.

---

## 1. Event-driven architecture

### What an event is

| Idea | Source | What it asks | In the wheel |
|---|---|---|---|
| An event states a fact that already happened, named in the past tense. A command asks for something to happen. | Hohpe & Woolf, *Enterprise Integration Patterns* (2003), "Event Message"; Fowler, "What do you mean by 'Event-Driven'?" (2017) | Name what happened, not what to do. | `cycle.opened`, `beat.recorded`, `chronicle.lineage.made` are past-tense facts the wheel has already committed. |
| An event can be one of four things: a **notification** ("something happened, ask me"), **event-carried state transfer** (the event holds the state), **event sourcing** (the events *are* the state), or **CQRS** (separate write and read models). | Fowler (2017) | Choose which one you mean. Mixing them by accident is where the trouble starts. | Notification. A payload names records and carries labels. A consumer reads the record back by `subject.id`. One deliberate exception carries state: `chronicle.lineage.*` repeats the lineage sentence that is already published in `episode.yaml`. The store is **not** rebuilt from events: this is not event sourcing. |
| Time is order, not a clock. Two observers may disagree about simultaneity, so name causes explicitly. | Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System", *CACM* 21(7), 1978 | Order by the log, and carry causation and correlation in the event rather than relying on timestamps. | Log order is the order. `correlation_id` groups a cycle with its beats, and a ceremony with its closing. `causation_id` is in the envelope and still unused. |
| One envelope, many producers. A common shape for event metadata lets unlike systems exchange events. | CNCF CloudEvents 1.0 (2019); jgwill/Miadi `rispecs/events/00-miadi-event-spine.rispec.md` (`MiadiEventEnvelope`) | Keep identity, type, source, subject and time in one agreed envelope, separate from the payload. | Every line is a `MiadiEventEnvelope` 0.1.0. A CloudEvents mapping is straightforward: `id`→`id`, `event_type`→`type`, `source.system/instance`→`source`, `subject.id`→`subject`, `observed_at`→`time`. It is not written yet. |

### The log at the centre

| Idea | Source | What it asks | In the wheel |
|---|---|---|---|
| The log, an append-only, totally ordered sequence of records, is the unifying abstraction underneath databases, replication and stream processing. | Kreps, "The Log: What every software engineer should know about real-time data's unifying abstraction" (LinkedIn Engineering, 2013); Kleppmann, *Designing Data-Intensive Applications* (2017), ch. 11 | Keep one append-only log. Each consumer keeps its own position in it. | `events.jsonl` is append-only and never rewritten. Each publisher or follower keeps a cursor (`events-cursor.<name>.json`), which is what Kafka calls a consumer offset. |
| **Transactional outbox:** write the event in the same transaction as the state change, then relay it. This avoids the dual write, where the state commits and the message is lost, or the reverse. | Richardson, microservices.io, "Pattern: Transactional outbox"; Kleppmann (2017) on dual writes | Commit the record and its event atomically, and relay later. | **Partly.** The event is appended right after the record is stored, in the same request. A JSONL store has no transaction, so a crash between the two leaves a record without its event. The failure is reported on stderr and never fails the write. A provider with transactions (Neon) could make it a true outbox: the open question Q3 in #164. |
| **At-least-once delivery with an idempotent receiver.** Retries mean duplicates, so a receiver recognises a message it has already handled. | Hohpe & Woolf (2003), "Idempotent Receiver", "Guaranteed Delivery"; Helland, "Life beyond Distributed Transactions" (CIDR 2007) | Give every event a stable key. Resend the same line, never a reconstructed one. | `idempotency_key` equals `id` and is fixed at write time. `rewind` (replay) resends the same lines with the same keys. |
| **Dead letters:** a message the receiver will never accept should not block the ones behind it. | Hohpe & Woolf (2003), "Dead Letter Channel" | Record it, pass it, keep going. | A `refused` receipt (any 4xx other than 408 or 429) is recorded, and the cursor passes it. A `failed` receipt stops the pass, and the next pass tries again. |
| **Smart endpoints, dumb pipes.** Keep the logic in the producers and consumers, and keep the channel simple. | Lewis & Fowler, "Microservices" (2014) | The transport should not need to understand the events. | Git carries the log as a file. `commitEventLog` knows nothing of what the events mean. `mw-events follow` hands each event to whatever command the follower names. |
| **Contracts for messages.** Producers and consumers agree on a schema. AsyncAPI does for channels what OpenAPI does for HTTP. | AsyncAPI 3.0 (2023); JSON Schema (draft-07) | Publish the contract as a file anyone can read and validate against. | `schema/wheel-events.schema.json` and `schema/asyncapi.json` are generated from one catalog. A test fails when they drift, and every event the routes write is validated against them. |

### Before a broker

Episode 548 asks which broker. The literature asks something earlier: **what
needs fanout, retention, independent consumers or replay that a file and a
cursor cannot give?** That is the Event Spine's rule: begin with the smallest
durable path, and add a broker only when one of those needs appears.

The wheel already has a log, cursors, receipts, replay and a carriage (git).
A broker becomes the next `Publisher` once a need appears that git and HTTP
cannot meet:

- many consumers at low latency;
- retention measured in time rather than in history;
- consumers that must not have to clone a repository.

---

## 2. Why the logic lives in the wheel

The practice you described: build something in your own space, notice that
it carries value beyond that space, move it into a shared package, then
consume the package. The code that stays behind gets smaller, and the larger
system gains a part it can install. The practice has several names, each
covering a different aspect of it.

| Idea | Source | What it says | Here |
|---|---|---|---|
| **Information hiding:** decompose a system by the design decisions likely to change, and hide each one behind a module. | Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules", *CACM* 15(12), 1972 | A module owns a decision, not a step in a flowchart. | "Which event does this write produce?" is one decision. It lives once in the deciders (`cycleWritten`, `relationWritten`, …), and both the HTTP routes and the MCP store call them. |
| **Package principles:** the unit of reuse is the unit of release (REP). Classes that change together belong together (CCP). Depend in the direction of stability (SDP). | Martin, *Agile Software Development: Principles, Patterns, and Practices* (2002) | Extract only what is released and versioned as a whole, and depend on what changes less often than you do. | `@medicine-wheel/events` is released with the suite, and Miadi would depend on it rather than copy it. The catalog changes less often than any consumer, and is versioned separately (`CATALOG_VERSION`). |
| **Rule of three:** write it once, notice the second time, extract the third time. | Fowler, *Refactoring* (1999), crediting Don Roberts | Do not extract on the first use. Extract when a second or third consumer shows what is shared. | The edge-projection code in Miadi's `inquiry-weave` (`projectLineageEdge`) already has siblings for reviews, notebooks, prototypes, rispecs, foundations and tracing. Each lists `/api/edges` and POSTs. That repetition is the signal. |
| **Bounded context, published language, open host service:** a model belongs to a context. Contexts meet through a published language, and a context can offer a stable service to many others. | Evans, *Domain-Driven Design* (2003) | Say which context owns a concept, and let others speak to it through a published contract. | Relations between nodes, chronicle episodes included, are the wheel's context. The events catalog plus the JSON Schema is the published language. Miadi owns episode manifests and their git landing. |
| **Upstream first:** fix or build in the shared project first, then consume the release, so you do not carry a private fork. | Common practice in the Linux kernel and at Red Hat (Fedora's "upstream first") | Contribute where it belongs, and consume the published version. | The repo already has the loop: Miadi's `medicine-wheel-upstream-delivery` skill. Open an issue in jgwill/medicine-wheel, publish a suite version, bump it in Miadi, deploy. |
| **Inner source:** open-source practices inside one organisation. Anyone can contribute to a shared component, and its owners review and release it. | O'Reilly (2000), coining the term; the InnerSource Commons | Make the shared component easy to contribute to, and keep its owners accountable. | `@medicine-wheel/*` is that shared component for the Miadi stack. |
| **Conway's law:** a system's structure mirrors the communication structure of the people who build it. | Conway, "How Do Committees Invent?", *Datamation* (1968) | Draw package boundaries where the relationships actually are. | The wheel holds relations, and Miadi holds the factory's episodes and voices. The boundary follows who answers for what. |

---

## 3. Open edges

- **Q3, a true outbox:** write the event and the record in one transaction
  where the provider allows it.
- **CloudEvents:** a binding for a broker that expects CloudEvents.
- **Upstreaming the lineage door:** `@medicine-wheel/client` could offer the
  edge projection that Miadi's `inquiry-weave` repeats in seven files (lineage,
  reviews, notebooks, prototypes, rispecs, foundations, tracing). Miadi would then
  consume it.
- **Causation:** `causation_id` is in the envelope and nothing sets it yet.

## References

- Conway, M. E. (1968). How Do Committees Invent? *Datamation*, 14(4), 28–31.
- Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley.
- Fowler, M. (1999). *Refactoring: Improving the Design of Existing Code*. Addison-Wesley.
- Fowler, M. (2017). What do you mean by "Event-Driven"? martinfowler.com/articles/201701-event-driven.html
- Helland, P. (2007). Life beyond Distributed Transactions: an Apostate's Opinion. *CIDR 2007*.
- Hohpe, G., & Woolf, B. (2003). *Enterprise Integration Patterns*. Addison-Wesley. enterpriseintegrationpatterns.com
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly. Ch. 11, Stream Processing.
- Kreps, J. (2013). The Log: What every software engineer should know about real-time data's unifying abstraction. LinkedIn Engineering.
- Lamport, L. (1978). Time, Clocks, and the Ordering of Events in a Distributed System. *CACM*, 21(7), 558–565.
- Lewis, J., & Fowler, M. (2014). Microservices. martinfowler.com/articles/microservices.html
- Martin, R. C. (2002). *Agile Software Development: Principles, Patterns, and Practices*. Prentice Hall.
- Parnas, D. L. (1972). On the Criteria To Be Used in Decomposing Systems into Modules. *CACM*, 15(12), 1053–1058.
- Richardson, C. Pattern: Transactional outbox. microservices.io/patterns/data/transactional-outbox.html
- AsyncAPI Initiative (2023). AsyncAPI Specification 3.0.0. asyncapi.com
- CNCF (2019). CloudEvents 1.0. cloudevents.io
