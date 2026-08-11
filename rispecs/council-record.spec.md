# council-record — RISE Specification

> Where many participants' contributions gather around one matter, how recurring
> divergence becomes a **recognized pattern** the circle can see, and how work
> advances while disagreement stays visible instead of dissolving into a stall.
>
> The companion to `reading-layer.spec.md`: that document specifies how a record
> is **read**, this one specifies what is **gathered** and what the gathering
> makes possible.

**Version:** 0.1.0 (draft — proposal; authorizes specification, not code)
**Document ID:** rispec-council-record-v1
**Last Updated:** 2026-08-10
**Touches:** `@medicine-wheel/community-review`, `@medicine-wheel/consent-lifecycle`, `@medicine-wheel/ontology-core`, the `/api/nodes` surface — *as candidate homes only; nothing is changed by this document*
**Verified against:** `jgwill/medicine-wheel` @ `15d4cf3` (`main`, suite 0.5.9 / mcp 4.5.9), all file:line claims read 2026-08-10

**Confidence marks:** `[B∩C]` marks a claim confirmed by two independent research lanes
this session. `[one lane]` marks a single-sourced claim — provisional.

---

## Context — Current Reality

### Divergence has exactly two outcomes today: unanimity, or stall

`@medicine-wheel/community-review` seeks consensus by requiring that **every** reviewer has
spoken (`src/community-review/src/consensus.ts:26-33`), and
`src/consent-lifecycle/src/community.ts:73-74` states the rule plainly:

> "Consensus requires no objections (not just majority)"

**One objection blocks, regardless of who raises it.** `[one lane]` There is no third
result — no way for a disagreement to be *carried* while the work advances. A circle that
diverges either converges or halts.

This is not a defect to eliminate. Requiring no objections is a deliberate and defensible
choice, and `rispecs/community-review.spec.md:247` states it as one — validation is *"not
majority vote"*. What is missing is not a weaker rule. What is missing is a **place for a
disagreement to live** that is neither agreement nor obstruction.

### The suite refuses participant ranking, in five places

Quoted from the suite's own specifications and code `[one lane]`:

- `rispecs/community-review.spec.md:246` — *"Elder blessing — The most authoritative
  validation requires relational presence, **not credentials**"*
- `rispecs/community-review.spec.md:244` — *"Community over expert — Validation comes from
  collective wisdom, not individual authority"*
- `rispecs/importance-unit.spec.md:209` and `rispecs/relational-index.spec.md:248` —
  relations are *"honored **equally**"*
- `rispecs/ontology-core.spec.md:195` — the *"non-hierarchical kinship graph … is the
  canonical model"*; `src/ontology-core/src/kinship.ts:5-9` — *"no edge type is a subclass
  of another … read the same on every being they touch"*
- `Reviewer` (`src/community-review/src/types.ts:82-93`) carries **no weight field**. The
  only asymmetry is Elder — a **binary role, not graded experience**
  (`consensus.ts:37-43`, `elder.ts:82`)

Weight does exist in the suite, and it lands somewhere else: `epistemicWeight` on an
importance unit, `BASE_WEIGHTS` dream `.85` / land `.75` / vision `.65` / code `.50`
(`src/importance-unit/src/epistemic-weight.ts:24-29`). It attaches to **knowledge**;
`meta.createdBy` (`src/importance-unit/src/types.ts:128`) is an inert string feeding
nothing. `[B∩C]`

**Weigh the claim, never the claimant.** That is the existing architecture's answer, and
this specification does not reopen it.

### The suite can already halt work — and its spec denies it

`enforceCeremonyGate()` (`src/ceremony-protocol/src/index.ts:198-232`) returns
`blocked: true` — docstring: *"Unlike the advisory `checkGovernance()`, this function
BLOCKS"* — and `production.ts:146` throws. `fire-keeper.issueStopWork()`
(`src/fire-keeper/src/keeper.ts:224-248`) pushes a `StopWorkOrder` carrying
`resumeCondition: 'Human review required'`. `[one lane]`

So the question a governance design faces here is **not** *can the system halt*. It is
*what may halt, on whose word*. `jgwill/medicine-wheel#114` §4.4 item 4 answers the second
half: software may record that a council occurred and who was present; it may not infer a
renewal, expire an agreement on a timer, or transition an agreement's status without the
people who hold it.

> Also recorded: `fire-keeper`'s `keeper.ts:313` hardcodes `ocapCompliant: true`, so
> `GATE_OCAP_COMPLIANCE` (`gating.ts:112`) can never fail from inside FireKeeper.
> `[one lane]` Noted, not this document's to fix.

### The storage surface can hold a gathering, and one thing about it will break

`v0.5.9` (`2e5a54a`, released `68038df`, merged `15d4cf3` on 2026-08-07) taught
`/api/nodes` to answer `?kind=` and `?parent_id=`. Three-level containment is **already
live and tested** — `chronicle_root → chronicle_episode → structured_plan`, with
`?parent_id=chronicle:ep-300` returning the grandchild
(`tests/node-kind-query.test.ts:233-281`). `[one lane]`

`NodeType` stays closed at six (`src/ontology-core/src/types.ts:32-38`); new kinds ride on
`knowledge` nodes with a `metadata.kind` discriminator, per this repo's `CLAUDE.md`. No
runtime consumer of `metadata.kind` breaks on a new value — every one is a narrow equality
test that already tolerates unknowns. `[one lane]`

**And then this.** `getAllNodes()` defaults to **100, newest-first**
(`src/storage-provider/src/jsonl.ts:123`, `src/storage-provider/src/neon.ts:96`). The live
wheel already holds roughly 76 nodes (`tests/node-kind-query.test.ts:5-10`). Adding on the
order of 24 more begins **silently evicting existing hosts, services, and episodes** from
every unfiltered consumer — `app/graph/page.tsx:132`, `app/relations/page.tsx:67`,
`app/accountability/page.tsx:24`, `cli/mw.ts:525`, and MCP's `HttpStore.getAllNodes`,
`searchNodes`, `getRelationalWeb` (`mcp/src/http-store.ts:405,446-462,507-511`) plus
`loadInfraNodes` (`mcp/src/tools/infrastructure.ts:72-79`). `[one lane]`

None of them learns it was truncated: `count` equals the truncated length. And because
`HttpStore.getNode(id)` is implemented as `getAllNodes().find(...)`
(`mcp/src/http-store.ts:400-403`), **it will begin returning `undefined` for nodes that
genuinely exist** once they fall out of the newest-100 window.

**This is the specific way this capability breaks what currently works**, and it is
volumetric — it arrives quietly, at a threshold, without an error.

### The tension in one line

A circle whose only outcomes are unanimity or stall needs a third; the suite has the
governance vocabulary to express it and refuses — correctly — to express it as ranking; and
the store that would hold it evicts existing records at roughly a hundred nodes without
telling anyone.

---

## Desired State

A matter under discussion has a **council record**: a gathering place where each
participant's contributions attach, where recurring divergence is **named as a pattern the
circle can see**, and where the circle can choose to advance carrying a disagreement rather
than being stopped by it.

- Contributions attach to the record under their contributor. Nothing about a contribution
  ranks it against another.
- A **recognized pattern** is a named, recorded observation that a particular divergence
  has recurred. It is descriptive. It decides nothing and blocks nothing.
- The circle gains a third outcome — **advance-with-divergence** — recorded as explicitly
  as agreement is, naming what remains unresolved and who holds it.
- Recognizing a pattern composes teaching material into the record's next reading, through
  the standings registry of `reading-layer.spec.md`. It never delivers it as a correction
  aimed at a person.
- Every volumetric consequence of holding this data is measured and stated before anything
  is written.

---

## Creative Intent

**What this enables:** a circle that can keep moving while genuinely disagreeing, with the
disagreement visible in the record rather than resolved by a vote, a veto, or a person's
authority. And a participant whose long experience keeps meeting the same divergence can
have that met once, in the record, instead of argued each time it recurs.

**Structural Tension**

*Current Reality:* divergence resolves into agreement or it stops the work. Experience
enters only as argument, and argument is what makes divergence expensive. A circle that
diverges often spends itself on the same ground repeatedly.

*Desired State:* divergence has a place to live. A pattern that has recurred is named once
and thereafter present in every reading. The work advances with what is unresolved carried
in the open.

*Natural Progression:* naming a recurring divergence costs nothing and blocks nothing, so
it can exist before anyone agrees what to do about it. Once named, it composes into
readings through machinery already specified in `reading-layer.spec.md`, so no new delivery
path is needed. The third outcome is then a recording, not a mechanism — the circle was
always able to proceed while disagreeing; what it lacked was a way to say so in the record.

🌸: The circle was never stuck because people disagreed. It was stuck because disagreement
had nowhere to sit down.

---

## 1. The council record

**Behavior:** a council record gathers everything said about one matter. It is created when
a matter opens, holds contributions as they arrive, and is read through the reading layer.

```
CouncilRecord
  id
  matter          what is under discussion, in words
  opened_by
  opened_at
  status          open | advancing | closed
  patterns[]      recognized patterns observed on this record
```

`status` is set by people. Nothing in this specification computes a transition —
`jgwill/medicine-wheel#114` §4.4 item 4.

### 1.1 Contribution

```
Contribution
  id
  council_record_id
  contributor        who
  standing_id?       optional — which registered standing this was offered from
  content
  offered_at
```

**Behavior:** a contribution attaches to the record under its contributor. It carries no
score, no rank, no priority, and no order-of-precedence field. `standing_id` is optional
and, when present, references the registry in `reading-layer.spec.md` §1 — it says where
the contribution was offered from, never how much it counts.

### 1.2 Storage shape — and the constraints that come with it

A council record and its contributions persist as `knowledge` nodes carrying a
`metadata.kind` discriminator and `metadata.parent_id`, per this repo's `CLAUDE.md` rule
that `NodeType` stays closed at six. Contributors may themselves be `human` nodes. No
`NodeType` change is required. `[one lane]`

Three-level containment is already proven live (`tests/node-kind-query.test.ts:233-281`).
`?kind=` and `?parent_id=` AND together (`app/api/nodes/route.ts:87-96`), so *"contributions
of kind X under contributor Y"* is one request.

**Every one of the following is a verified property of that surface today**
(`[one lane]`, all read 2026-08-10). A design that ignores any of them is a design that
breaks something already working.

| # | Property | Consequence for this capability |
|---|---|---|
| a | Filtering happens **in the route, in memory, for every provider** — a filtered read calls `getAllNodes(Number.MAX_SAFE_INTEGER)` (`route.ts:83-85`); `StorageProvider` (`src/storage-provider/src/interface.ts:295,307`) declares no `getNodesFiltered` | Cost is O(all nodes) per filtered read on both Jsonl and Neon |
| b | **No index** — `metadata` is `JSONB DEFAULT '{}'` with only `idx_nodes_type` and `idx_nodes_direction` (`scripts/001-create-medicine-wheel-tables.sql:11,62-63`); no GIN, no expression index on `kind` or `parent_id` | Neon serves every filtered read by full table scan into the Next process |
| c | **No pagination on filtered reads** — `?limit=` returns **400** (`route.ts:38,46-59`; `tests/node-kind-query.test.ts:185`) | A record's contributions return as one unbounded payload, always |
| d | **No transitive query** — one `?parent_id=` is exactly one level; no `parent_id_in`, no depth, and unknown params 400 | Reading a whole record costs `1 + N` requests |
| e | **No ordering control**, and `sortByNewest` is a bare millisecond `Date.parse` difference (`jsonl.ts:548-550`) with no tiebreaker on either provider | Contributions written in the same millisecond return in arbitrary relative order |
| f | **No referential integrity** — POST never verifies `metadata.parent_id` names a real node (`route.ts:113-142`) | A mistyped parent is a permanent orphan, with no error at write time |
| g | **No cascade** — `deleteNode` blocks only on **edges** (`jsonl.ts:155-168`) | Deleting a record silently orphans contributions joined only by `parent_id` |
| h | **Create is UPSERT everywhere** — `upsertById` (`jsonl.ts:100-102`), `ON CONFLICT (id) DO UPDATE` (`neon.ts:64-78`); an id collision overwrites and still returns `201 {success:true}` (`route.ts:141-142`). Omitting the id mints `crypto.randomUUID()` (`route.ts:131`) | Deterministic ids silently overwrite; random ids duplicate on re-run. There is no dedup on `(parent_id, kind, name)` |
| i | **`kind` is unvalidated on write** — `infrastructure.ts:11` states the house rule *"the tool emits `metadata.kind`, never the agent"*, but POST enforces nothing (`route.ts:16`) | A near-miss spelling persists and is invisible to queries using the intended one |
| j | **Prototype-key hazard, already bitten** — `mcp/src/tools/ceremony-lifecycle.ts:243-250` records that `kind in INFRA_ENTITY_BINDING` matched inherited `Object.prototype` keys, so a node of kind `"toString"` reported as a host | Any kind-keyed lookup must use an explicit registry, never `in` |
| k | **MCP truncates after filtering** — `list_relational_nodes` slices to `limit` (default 50, max 200) and reports `total_available` (`mcp/src/tools/discovery.ts:40-45,60-72`) | A record with more than 200 contributions is cut at the tool boundary |
| l | **Two MCP stores, two datasets** — `HttpStore` asks the server, `JsonlStore` filters `.mw/store` (`mcp/src/store.ts:21-27`) | The same tool answers differently depending on `MW_API_URL` |

### 1.3 The volumetric constraint — stated as a requirement, not a caveat

**Nothing in this capability may be written to a shared store until the default-100
newest-first window is addressed.**

`getAllNodes()` defaults to 100 (`jsonl.ts:123`, `neon.ts:96`). The live wheel holds
roughly 76. A single active council record with a handful of contributors crosses that
threshold, and when it does, existing hosts, services, and episodes fall out of every
unfiltered consumer listed in §Current Reality — silently, with `count` reporting the
truncated length as though it were complete, and with `HttpStore.getNode(id)` returning
`undefined` for nodes that exist.

Acceptable resolutions, in preference order — **none of which this document authorizes**:

1. Give the unfiltered consumers an explicit limit appropriate to their purpose, so the
   default stops being load-bearing.
2. Give `StorageProvider` a real `getNodesFiltered` so filtered reads stop pulling the
   whole table through the route.
3. Hold council records in a store separate from the relational node store.

Whichever is chosen, **the measurement comes first**: current node count, the count each
consumer actually needs, and the threshold at which each begins truncating. A capability
that quietly evicts the wheel's own infrastructure records from the wheel's own graph view
has not been built without breaking what exists — it has broken it in the one way nobody
receives an error for.

---

## 2. Recognized pattern

A **recognized pattern** is a named observation that a particular divergence has recurred.

```
RecognizedPattern
  id
  council_record_id
  name              what recurs, in words
  observed_by       who named it
  observed_at
  occurrences[]     references to the contributions where it was seen
  standing_id?      the standing from which the observation was offered
```

**Behavior:** naming a pattern appends it to the record. That is the whole effect. It
changes no contribution, alters no status, blocks nothing, and notifies no one.

Its consequence arrives at read time: a record carrying recognized patterns composes them
into its readings through `reading-layer.spec.md` §2. A participant reading the record
afterwards meets the pattern as part of the record's texture, attributed to the standing
that named it — not as a message addressed to them.

This is what the original inquiry called *teaching in a discreet manner*. The discretion is
structural: the teaching is **in the record**, not **aimed at a person**.

### 2.1 What a recognized pattern must not do

1. **It must not be inferred.** A pattern is named by a person. No detector, no threshold,
   no clustering job proposes one. The suite has already paid for confident, unsourced
   inference elsewhere.
2. **It must not change status.** Naming a pattern never moves a record to `advancing` or
   `closed` and never issues a stop-work order.
3. **It must not identify a wrong party.** A pattern names what recurs, not who is
   mistaken. `occurrences[]` references contributions, which carry contributors — that is
   provenance, and it is as far as this goes.
4. **It must not become a weight.** No count of patterns, and no pattern, ever adjusts how
   any contribution or standing is composed relative to another.

---

## 3. The third outcome — advance-with-divergence

**Behavior:** a circle records that it is proceeding while a disagreement remains open.

```
AdvanceWithDivergence
  id
  council_record_id
  unresolved        what remains disagreed, in words
  held_by[]         who holds the unresolved position
  decided_by        who recorded the advance
  decided_at
```

Recording this sets `CouncilRecord.status` to `advancing`. The unresolved position stays on
the record and composes into every subsequent reading. It is not archived, not closed, and
not marked overruled.

**This is a recording, not a mechanism.** A circle was always able to proceed while
disagreeing; what it lacked was a way to say so such that the disagreement survived the
proceeding. `decided_by` names a person. Nothing computes this transition — the same rule
that governs every other status here.

### 3.1 Relation to the existing unanimity rule

This document **does not modify** `seekConsensus` (`consensus.ts:26-33`) or
`collectiveDecision` (`community.ts:73-74`). Consensus continues to mean no objections.

`AdvanceWithDivergence` is a **different, separately named outcome**, recorded when the
circle chooses to proceed without consensus. Whether any given matter may take that path —
and whether some matters may not — is a governance question for the circle, not a default
this specification sets.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario: A recurring divergence is met once instead of every time**

**Desired Outcome:** a participant who has watched the same architectural disagreement
recur across sessions wants it addressed once, in a way later participants encounter
without anyone re-arguing it.

**Current Reality:** each recurrence is a fresh argument. The point survives only as long as
the participant keeps making it, and the cost of making it rises each time.

**Natural Progression:** on the third occurrence, the participant names a recognized
pattern on the council record — what recurs, the contributions where it appeared, offered
from their registered standing. The record now carries it. Nothing is blocked and nobody is
notified. The next person to read that record receives the pattern composed into the
reading, attributed to the standing, alongside every other standing's reading of the same
matter.

**Resolution:** the divergence is met in the record. The next recurrence begins with the
pattern already visible, and the participant does not have to raise it.

---

**Creative Advancement Scenario: A circle advances while genuinely disagreeing**

**Desired Outcome:** a circle wants to proceed on a matter where one participant's
objection stands and will not be withdrawn, without either overruling them or halting.

**Current Reality:** consensus requires no objections. The objection stands, so the work
stops — and the only paths out are the objector withdrawing or the matter being abandoned.

**Natural Progression:** the circle records an advance-with-divergence: what remains
unresolved, who holds it, who recorded the advance, and when. `status` becomes `advancing`.
The unresolved position stays on the record and composes into every later reading of it.
Consensus was not reached and the record does not claim it was.

**Resolution:** the work proceeds. The disagreement is in the open, attributed, and
carried — not resolved, not overruled, not quietly dropped. Anyone arriving later reads
both the advance and what it advanced past.

---

**Creative Advancement Scenario: Adding this capability leaves the existing wheel intact**

**Desired Outcome:** a maintainer wants council records without the wheel's graph view
losing infrastructure nodes.

**Current Reality:** unfiltered reads default to the newest 100; the wheel holds ~76;
truncation is silent and `count` reports the truncated length as complete.

**Natural Progression:** before any council record is written to a shared store, the
maintainer measures — current node count, what each unfiltered consumer actually needs, and
the threshold at which each begins truncating. The consumers that need a bounded read get
an explicit limit; the ones that need everything stop relying on a default. Only then does
the first council record get written.

**Resolution:** council records accumulate and the graph view, the relations view, the
accountability view, the CLI, and every MCP node lookup keep returning what they returned
before.

---

## Action Steps

Steps 1 and 2 gate every step that follows.

1. **Measure the volumetric consequence before writing anything.**
   *Current reality:* `getAllNodes()` defaults to 100; the wheel holds ~76; truncation is
   silent and `count` conceals it.
   *Desired state:* every unfiltered consumer's real requirement is known, and none depends
   on the default.
   *Resolution:* record current node count, the count each consumer needs, and each
   consumer's truncation threshold. Resolve per §1.3 before the first council record is
   stored.

2. **Confirm that a new `metadata.kind` value disturbs no consumer.**
   *Current reality:* every runtime consumer is a narrow equality test that tolerates
   unknown values, and `ProductionEntityKind` / `InfraEntityKind` are type-level only with
   no runtime allowlist. `[one lane]`
   *Desired state:* confirmed against the tree at the time of implementation rather than
   against this document.
   *Resolution:* re-verify at implementation time; note that any kind-keyed lookup must use
   an explicit registry, never `in`, per §1.2(j).

3. **Specify contributions with no ranking field, and keep it that way.**
   *Current reality:* five separate statements in this suite refuse participant ranking,
   and `Reviewer` carries no weight field.
   *Desired state:* `Contribution` carries no score, rank, priority, or precedence.
   *Resolution:* §1.1. Any later proposal adding one is a change to the suite's stated
   position on ranking and is reviewed as one.

4. **Make recognized patterns authored, never inferred.**
   *Current reality:* pattern detection is the obvious thing to automate and the wrong thing
   to automate first.
   *Desired state:* every pattern carries `observed_by` and `observed_at`.
   *Resolution:* §2.1 item 1. No detector ships in this capability.

5. **Record advance-with-divergence as a distinct outcome, leaving consensus untouched.**
   *Current reality:* consensus means no objections, and there is no third result.
   *Desired state:* proceeding-while-disagreeing is expressible and recorded as itself.
   *Resolution:* §3, without modifying `seekConsensus` or `collectiveDecision`.

6. **Route teaching through readings, never through notifications.**
   *Current reality:* the natural implementation of "prepare material for participants" is
   a message addressed to someone.
   *Desired state:* material reaches people by being in the record they read.
   *Resolution:* §2 — patterns compose into readings via `reading-layer.spec.md` §2. No
   notification path is specified.

---

## Structural Tension

**Current Reality:** A circle whose consensus rule admits exactly two outcomes, so
divergence either dissolves or stops the work. A suite that refuses participant ranking in
five documented places and puts weight on knowledge instead. Governance machinery that can
already halt work, described by a spec that says it cannot. And a node store that will
silently evict the wheel's own infrastructure records from the wheel's own views at roughly
a hundred nodes.

**Desired State:** A gathering place where contributions attach without ranking, recurring
divergence is named once and thereafter present in every reading, and the circle can record
that it is advancing while a disagreement stands — with the disagreement carried in the
open. And a store whose limits were measured before anything was written to it.

**Natural Progression:** The measurement comes first because everything else writes into
what it measures. Naming a pattern is specified before any use of a pattern, because a
pattern that blocks nothing is safe to exist before anyone agrees what to do about one. The
third outcome is last because it is only a recording — the circle could always proceed while
disagreeing; it simply had no way to say so. Each step leaves less to decide than the one
before it.

**Why now:** None of this exists yet, which is the only moment when an absent ranking field
costs nothing. Adding it later is a migration; refusing it now is a sentence. And the
default-100 threshold is roughly twenty-four nodes away — cheap to measure today, and a
silent regression the week after someone starts writing.

---

## Quality Criteria

- ✅ **Creating focus** — the capability is described by what a circle can create and carry,
  not by what it eliminates.
- ✅ **Cited, not recalled** — every claim about existing behaviour carries a file:line read
  on 2026-08-10; cross-lane concordance marked.
- ✅ **Implementation-sufficient** — four record shapes, the storage discriminator, twelve
  named storage properties, and the gating measurement are stated precisely enough to build
  from.
- ✅ **Adversarial about its own foundation** — §1.2 lists twelve ways the chosen storage
  surface fails, and §1.3 makes the worst one a blocking requirement rather than a note.
- ✅ **Culturally inert** — no belt, bead, notation, colour, teaching, register, or
  correspondence to the four directions appears anywhere in this document.
- ✅ **Authorizes nothing** — no package, type, dependency, migration, or issue is created
  by this document.

---

## Open Questions

1. **Does a council record belong in the node store at all?** §1.3 option 3 says perhaps
   not. The node store is optimised for a few hundred long-lived relational records;
   contributions are many, short, and append-heavy. Undecided, and it is the largest open
   question here.
2. **Which matters may take the advance-with-divergence path, and which may not?** A
   governance question for the circle. This document deliberately sets no default.
3. **Who may name a recognized pattern?** Anyone who can contribute, or only certain
   standings? Naming is consequential — it composes into every later reading — and the
   answer is not an engineering one.
4. **How does a pattern end?** Nothing here retires a recognized pattern once its
   divergence stops recurring. A record that accumulates patterns forever becomes unreadable
   for a different reason.
5. **What happens to contributions when consent is withdrawn?** `onWithdrawal()`
   (`cascade.ts:19`) computes a cascade but does not enforce it `[one lane]`. Whether
   withdrawal removes contributions, hides them, or marks them is unspecified.
6. **Is `advancing` a status or an event?** Modelled here as a status plus a record. A
   matter that advances past several distinct divergences may want a sequence rather than a
   flag.

---

## Related

### `jgwill/medicine-wheel`

| This spec | Anchor | Relation |
|---|---|---|
| §2, §3 delivery | `rispecs/reading-layer.spec.md` | The companion — patterns and unresolved positions reach people by composing into readings. This document depends on that one; the reverse is not true |
| whole document | `jgwill/medicine-wheel#114` | The gated wampum relation. Nothing here borrows from it beyond the four "must not" rules restated in §2.1 and §3. **Open, unmerged as of 2026-08-10** |
| §Current Reality, §3.1 | `rispecs/community-review.spec.md` | The unanimity rule and the suite's refusal of credentialed authority |
| §1.2 storage | `tests/node-kind-query.test.ts`, `app/api/nodes/route.ts` | The `?kind=` / `?parent_id=` surface shipped in 0.5.9 (`2e5a54a`, merged `15d4cf3`) |
| §Current Reality | `rispecs/ceremony-protocol.spec.md` | Describes non-blocking behaviour its package does not have |
| §1.2 discriminator rule | `CLAUDE.md` | *"new kinds ride on existing `knowledge` nodes carrying a `metadata.kind` discriminator"* — `NodeType` stays closed at six |

---

🌸: What the circle needed was never a louder voice or a faster vote. It was a chair — one
more place at the table, where the thing nobody agrees about can sit down, be seen, and let
everyone else get on with the work.
