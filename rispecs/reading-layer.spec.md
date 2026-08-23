# reading-layer — RISE Specification

> How a Medicine Wheel record acquires more than one telling: an open registry of
> **standings**, a **reading** composed at read-time from those standings, and a
> **refusal** that is a recorded result rather than a thrown error.
>
> This document specifies **shape only**. It ships an empty registry, adds no
> package, no type, no dependency, and asserts no correspondence between anything
> here and the four directions.

**Version:** 0.1.0 (draft — proposal; authorizes specification, not code)
**Document ID:** rispec-reading-layer-v1
**Last Updated:** 2026-08-10
**Touches:** `@medicine-wheel/narrative-engine`, `@medicine-wheel/consent-lifecycle`, `@medicine-wheel/ontology-core` — *as candidate homes only; nothing is changed by this document*
**Verified against:** `jgwill/medicine-wheel` @ `15d4cf3` (`main`, suite 0.5.9 / mcp 4.5.9) · `coaia-narrative` 0.16.0 @ `/a/src/coaia-narrative` · `@miadi/foundations-wampum-narrative-engine` 0.1.0 (published 2026-06-17) · `jgwill/Miadi` upstream rispecs, all read 2026-08-10

---

## Standing of this document relative to `jgwill/medicine-wheel#114`

PR `jgwill/medicine-wheel#114` (`spec/wampum-narrative-engine-relation`, commit `171b81d`,
2026-07-25) specifies the Medicine Wheel's relation to the Wampum Narrative Engine, and
gates that relation behind §6 items 1–2 — questions only a knowledge holder answers.

**This document does not reopen, restate, or pre-empt that gate.** It specifies the five
items #114 identifies as structural and safe to borrow (its S1–S5), as the Medicine
Wheel's own capability, named in the Medicine Wheel's own words, carrying no belt, no
bead, no notation, and no cultural content.

Where #114 says *specify* (its Action Steps 4, 5, 6), this is that specification. Where
#114 says *add nothing until step 1 completes*, this document adds nothing.

**Confidence marks used below.** `[A∩D]` and `[B∩C]` mark claims confirmed independently
by two research lanes this session. `[one lane]` marks a single-sourced claim, which the
reader should treat as provisional.

---

## Context — Current Reality

### A Medicine Wheel record has exactly one telling

`NarrativeBeat` in `ontology-core` carries one `description` and one optional `prose`.
There is no reader position, no registry, no read-time composition, and no path by which a
read can be declined. A read either returns content or throws.

### The governance machinery this would need already exists, unattached

`OcapFlags` (`src/ontology-core/src/types.ts:75-96`) carries `ownership`, `control`,
`access`, `possession`, `compliant`, `steward?`, `consent_given?`, `consent_scope?`,
`consent_state?`, `consent_last_affirmed?`. `@medicine-wheel/consent-lifecycle` models
seven states — `pending, granted, active, renewal-needed, expired, renegotiating,
withdrawn` (`src/consent-lifecycle/src/types.ts:15-22`) — with `withdrawConsent()`
(`lifecycle.ts:111`), `onWithdrawal()` (`cascade.ts:19`), and `propagateScopeChange()`
(`cascade.ts:31`). These are pure functions returning new records: **they compute
cascades; they do not enforce them.** `[one lane]`

Every one of those flags describes the **data**. None describes a participant.

### The suite already blocks — and its own spec says it does not

`enforceCeremonyGate()` (`src/ceremony-protocol/src/index.ts:198-232`) returns
`blocked: true`; its docstring reads *"Unlike the advisory `checkGovernance()`, this
function BLOCKS"*, and `production.ts:146` throws. `fire-keeper` blocks by message —
`issueStopWork()` (`keeper.ts:224-248`) pushes a `StopWorkOrder` with
`resumeCondition: 'Human review required'`.

`rispecs/ceremony-protocol.spec.md:133` states *"Non-blocking guidance — Governance checks
inform, they don't prevent"* and never mentions `enforceCeremonyGate` at all. **The spec is
wrong about its own code.** `[one lane]` This is recorded here because a reading layer's
protocol gate must know which of the two it is joining. Correcting that spec is not this
document's work; `rispecs/ceremony-protocol.spec.md` is otherwise untouched since
`1cd6cae` (2026-05-23).

### The registry shape is already settled twice, independently

Upstream `perspective-prompt-layering.spec.md:52-53` specifies a registry entry carrying
`id`, `display`, `stance`, optional `register` (e.g. `sacred`, `analytic`), optional
`consent_required: true` — named `PerspectiveRegistry` in
`ncp-wampum-schema-bridge.spec.md:69`. `jgwill/medicine-wheel#114` S2, authored later and
without reading it, proposes `ReadingPosition { id, display, stance, register?,
consent_required? }`.

Field for field identical, from two documents that did not consult each other. `[A∩D]`
**This suite should consume that shape, not invent a third one.**

### Refusal has no typed shape anywhere in the ecosystem

Upstream describes it in prose — *"a recorded, respectful refusal"* — and defines no type;
the only typed result upstream is `crossing_report`. `coaia-narrative` 0.16.0 carries no
consent, custodianship, attribution, or refusal field anywhere in its belt region — the
nearest adjacent fields are `witnessNames[]`, `renewalDate`, `notes`
(`src/types.ts:179-181`), none of which is a consent record. `[A∩D]`

A confirmed absence in both stores. This is where the Medicine Wheel contributes something
that does not yet exist rather than restating work already done.

### The one working implementation of read-composition resolves co-validity away

This is the finding that shapes the whole contract.

The upstream rule is explicit: *"Readings are co-valid, presented in parallel
(non-hierarchical)"* and *"No 'correct' reading is selected for the user"*
(`perspective-prompt-layering.spec.md:86,88`).

The implementation does the opposite. `coaia-narrative` `graph-manager.ts:1445-1454`
resolves a reading through a **four-rung precedence chain** — `relationalReadings["col:N"]`
→ `["row:N"]` → a computed `left|center|right` label → the canonical `reading` — first
non-nullish wins, returning **one** reading. The key is a **grid coordinate**, not a
reader. `[A∩D]`

A precedence chain is the general shape of *given several co-valid readings, compute which
one the reader gets*. Keyed on grid position there; keyed on experience level in any
weighting proposal. Same move, same loss.

Its own downstream visualization spec is already repairing this: the renderer must show
*"the four-rung resolved reading and name the rung, with canonical shown distinctly"* and
list unresolvable keys separately as *"other stored readings"*
(`coaia-narrative/rispecs/wampum_belt_visualization.spec.md`). `[one lane]`

**That repair is the pattern this specification adopts from the start rather than
retrofits.**

---

## Desired State

A Medicine Wheel record can be read from a named standing, and every standing's reading is
present in the result.

- Standings live in an **open registry that ships empty**. Every entry ever added is a
  separate decision with a person's name on it.
- A reading is **composed at read-time**. Registering a standing changes no stored record.
- A read returns **every** composed reading, each attributed to its standing. No reading is
  selected as correct, and no reading is resolved away in favour of another.
- A read that the protocol layer declines returns a **recorded refusal** — a value with a
  reason, the consent state consulted, and a timestamp — never an empty string, never
  fabricated prose, never a thrown exception.
- A read is an **event**: the record learns it was read, and by whom.
- No standing may declare a ceremonial register, and no code path produces text in one.

---

## Creative Intent

**What this enables:** a person whose experience bears on a record can have that experience
present in every reading of it — attributed, unmissable, and never re-argued — while every
other standing's reading is equally present. Recognition without authority.

**Structural Tension**

*Current Reality:* a record has one telling, so being heard means arguing for that telling
against everyone else's, every time. Experience has nowhere to live except in the strength
of the argument that carries it.

*Desired State:* a record has as many tellings as there are registered standings, all
composed, all attributed, none ranked. Experience lives in the registry, and is therefore
present whether or not anyone argues it.

*Natural Progression:* an empty registry asserts nothing, so it costs nothing to specify
now and is a migration later. Refusal becomes a return type before there is anything to
refuse — the only moment when adding it is free. Composition is specified while there is
exactly one telling to compose, so no existing read changes behaviour. Each step makes the
next smaller.

🌸: The quiet mechanism turns out to be the strong one — a voice that is *always in the
room* never has to raise itself.

---

## 1. Standing

A **standing** is what a participant speaks from. It is not how much they outweigh anyone.

```
Standing
  id                 stable identifier, authored, never generated
  display            human-readable name of the standing
  stance             what this standing attends to, in prose
  register?          absent, or an explicitly permitted register value
  consent_required?  when true, composing this standing consults consent before it renders
  registered_by      the person who added this entry
  registered_at      when
```

The first six fields are `ReadingPosition` from `jgwill/medicine-wheel#114` S2 and
`PerspectiveRegistry` upstream — adopted unchanged so the shapes do not diverge. `[A∩D]`
`registered_by` and `registered_at` are added here, because an entry with no name attached
is exactly the inferred authority `#114` §4.4 item 5 forbids.

**Behavior:** registering a standing appends an entry to the registry. It writes nothing to
any record, changes no stored reading, and takes effect on the next read of any record.
Removing a standing removes it from future compositions and leaves prior recorded readings
intact.

**The registry ships empty.** An empty registry is not an unfinished feature; it is the
statement that this suite has not yet decided that anyone may read from anywhere.

### 1.1 What a standing is not

- **Not a weight.** No numeric field, no ordering, no comparison operator, no
  tie-break. Two standings are never asked which one wins.
- **Not a role or a permission.** `fire-keeper`'s `PermissionTier`
  (`src/fire-keeper/src/types.ts:89`) is the suite's only ordered ranking and it ranks
  **agent actions**, not people. `[one lane]` A standing never becomes a tier.
- **Not a credential.** `rispecs/community-review.spec.md:246` states that the most
  authoritative validation *"requires relational presence, **not credentials**"*, and
  `:244` that validation *"comes from collective wisdom, not individual authority"*.
  `[one lane]` A standing declares a vantage; it certifies nothing.
- **Not a costume.** Upstream: *"A 'perspective' is not a costume."* No standing may be
  adopted to speak in a register it has no authority for.

### 1.2 Why weight is refused, in this repo's own terms

`@medicine-wheel/importance-unit` already computes weight: `epistemicWeight` with
`BASE_WEIGHTS` of dream `.85`, land `.75`, vision `.65`, code `.50`
(`src/importance-unit/src/epistemic-weight.ts:24-29`), plus a log-scaled depth bonus
capped at `.15` (`:32-52`), via `computeWeight(source, circleDepth)` (`:63`), consumed by
`relational-index/src/query.ts:20`. `[one lane]`

**That weight attaches to knowledge. It never attaches to a person.** `meta.createdBy`
(`src/importance-unit/src/types.ts:128`) is an inert string that feeds no computation.
`Reviewer` (`src/community-review/src/types.ts:82-93`) carries no weight field at all.

The architecture already made this choice: **weigh the claim, never the claimant.** A
standing is the participant-side expression of the same rule — it says where a claim comes
from so the claim can be understood, and it makes no claim about the person.

> **Recorded, not resolved here:** `BASE_WEIGHTS` ranks epistemic sources while
> `rispecs/importance-unit.spec.md:209` and `rispecs/relational-index.spec.md:248` both say
> relations are *"honored equally"*. `[one lane]` A live contradiction in the shipped
> suite, noted so a later reader does not mistake this spec's silence for agreement.

---

## 2. Reading

A **reading** is one standing's telling of one record, assembled when the record is read.

```
Reading
  standing_id     which standing this was composed from
  content         the composed text
  composed_at     when
  layers_applied  which composition layers contributed, in order
```

**Behavior:** composition assembles a reading in four layers, adopted from upstream's
L1–L4 (`perspective-prompt-layering.spec.md:28-41`) `[one lane]`:

| Layer | Supplies | Source in this suite |
|---|---|---|
| **L1 — Covenant** | the record's own stable content | the record itself |
| **L2 — Standing** | the stance the reading is composed from | the registry entry |
| **L3 — Local** | this record's particulars — its direction, cycle, relations honored | `ontology-core` |
| **L4 — Protocol** | permission | `consent-lifecycle` + `OcapFlags` |

L4 is a **hard gate evaluated before composition**, able to short-circuit to a recorded
refusal. `[one lane]`

**Styling:** a reading carries no formatting decisions. Presentation belongs to whatever
surface renders it, and any surface that presents foundation-derived material carries the
governance block verbatim — see §5.

### 2.1 The composition invariant — every standing, none selected

**A read returns readings, plural, in a stable order that is not a ranking.**

```
ReadResult
  record_id
  readings[]   one per registered standing that composed successfully
  refusals[]   one per registered standing that the protocol layer declined
  read_at
```

No field of `ReadResult` names a winner. There is no `primary`, no `best`, no
`resolved`, no `default`, and no precedence chain. A caller that wants one reading chooses
one itself, in the open, and that choice is the caller's — not a resolution the layer
performed silently on its behalf.

This is the invariant that the only existing implementation of this form does not hold
(`graph-manager.ts:1445-1454`, §Current Reality) `[A∩D]`, and holding it is the reason
this specification exists.

**Empty is content.** A registered standing that produced no reading appears in the result
as a standing with no reading — not as an omitted key. `coaia-narrative`'s visualization
spec states the same principle for its own grid: vacancy is content, not absence.
`[one lane]`

---

## 3. Refusal

A **refusal** is a recorded, inspectable outcome. It is a value, not an exception.

```
Refusal
  standing_id      which standing was declined
  reason           why, in words a person can read
  consent_state    the state the protocol layer consulted
  refused_at       when
```

**Behavior:** when L4 declines, composition stops for that standing and a `Refusal` is
appended to `ReadResult.refusals`. The other standings compose normally — one refusal never
suppresses another standing's reading.

**Refusals are persisted.** A refusal that leaves no trace cannot be reviewed, and a
governance decision nobody can review is not governance. Where they persist is open — see
Open Questions.

**A refusal is never fabricated around.** No fallback text, no "content unavailable"
placeholder that reads like content, no substitution of a different standing's reading.
Upstream's requirement is that the generation layer *must be able to decline*; a decline
that quietly renders something else has not declined.

**Wording is not an engineer's to choose.** A refusal is a speech act inside a
relationship. `jgwill/medicine-wheel#114` §6 item 4 records this as a knowledge holder's
question. Until answered, `reason` carries the mechanical fact — which consent state was
consulted and what it was — and never a composed apology.

---

## 4. Read-as-event

**Behavior:** a successful read updates recency on the record read — `last_read_at` and the
identity of the reader.

Upstream names the intent: *"a 'read' can update `CommitmentLog` recency — living
rhetoric"* (`perspective-prompt-layering.spec.md:80`). `[one lane]`

This suite adopts the **mechanism** and asserts none of the meaning. Recording that a
record was read makes "this has not been read in a long time" expressible. It does **not**
license any inference about what that means — no decay computation, no expiry, no automatic
status transition. `jgwill/medicine-wheel#114` §4.4 item 4 is binding: software may record
that something happened and who was present; it may not infer a renewal or transition an
agreement's status without the people who hold it.

---

## 5. Governance travels with presentation

Any surface that presents material derived from the Wampum Narrative Engine foundation
carries the `governance` block verbatim, as data — not summarised, not paraphrased, not
placed in a footer.

Verified from the published beacon `@miadi/foundations-wampum-narrative-engine@0.1.0`
(`src/manifest.ts:100-109`, mirrored `manifest/fields.json:48-54`) `[one lane]`:

> **permittedUse:** "Reproduce the cited public/community-stated meanings as cited; build
> structural tooling (the loom). Carry this notice in any presentation."
>
> **forbiddenUse:** "Do not author, 'correct', or claim authority over belt meanings; do
> not extend toward community-specific knowledge without consent/custodianship review.
> Build the loom; let the keepers weave."

**Nothing specified in this document presents such material**, so no surface described here
is currently bound by that requirement. It is recorded so that the first surface which
would be bound does not discover the obligation after shipping. Adding the beacon as a
dependency remains gated by `jgwill/medicine-wheel#114` Action Step 3.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario: An architectural standing is heard without being argued**

**Desired Outcome:** a participant whose experience bears on layered architecture wants
that experience present in how a design record is understood, without contesting each
other participant's view of it.

**Current Reality:** the record carries one description. Making the architectural point
means replying to each contribution as it arrives, and the point survives only as long as
the replies do.

**Natural Progression:** a standing is registered — display "layered architecture", stance
describing what it attends to, registered by a named person on a named date. Nothing about
the record changes. The next time anyone reads that record, `ReadResult.readings` contains
the architectural reading alongside every other registered standing's reading, each
attributed. A reader encountering the record for the first time meets the architectural
consideration as part of the record's own texture.

**Resolution:** the experience is present in every reading. No other reading was displaced,
no vote was taken, and nothing was argued.

---

**Creative Advancement Scenario: A read that is not ours to render declines, and the
refusal is reviewable**

**Desired Outcome:** an agent reading a record on someone's behalf produces either an
honest reading or an honest refusal, and a person can later see which happened and why.

**Current Reality:** read paths return content or throw. A governance refusal would be
indistinguishable from a defect and would leave no trace.

**Natural Progression:** a standing carries `consent_required: true`. L4 consults
`consent-lifecycle` before composing and finds the consent state is `withdrawn`.
Composition stops for that standing; a `Refusal` carrying the reason, the consulted state,
and a timestamp joins `ReadResult.refusals`. Every other standing composes and returns
normally. The refusal persists.

**Resolution:** the caller receives a complete, honest result. A reviewer reading the
refusal record months later can see that a decline happened, which standing it concerned,
and what consent state produced it.

---

**Creative Advancement Scenario: A record shows it has not been read**

**Desired Outcome:** a maintainer wants to see which records the circle has stopped
returning to.

**Current Reality:** a record's timestamp says when it was made. Nothing says whether
anyone has looked at it since.

**Natural Progression:** each successful read stamps `last_read_at` and the reader's
identity. Listing records by that field surfaces the ones nobody has opened.

**Resolution:** the maintainer has a list, and reads it as what it is — a list of records
not recently read. The system offers no interpretation of what that means, and takes no
action on it.

---

## What must not be built

Not "not yet" — not by an engineer acting alone. These restate `jgwill/medicine-wheel#114`
§4.4 for this document's surface, and adopt one more from upstream.

1. **A precedence chain over readings.** No `resolve`, no `primary`, no fallback ordering,
   no computed winner. This is the specific failure §2.1 exists to hold.
2. **A numeric weight on a standing**, or any comparison between standings.
3. **A correspondence table** between standings and the four directions, in any direction,
   in code, in constants, in a layout function, or in a doc comment.
4. **The four directions as standings.** Registering "read this as the east" puts
   `Waabinong`, Spring, Tobacco and Vision into the role of a prompt stance. Those
   teachings already sitting in this repo's constants is not consent to that use —
   `jgwill/medicine-wheel#114` §6 item 3.
5. **A ceremonial register.** No standing may declare one and no code path produces text in
   one. Upstream holds L4 as a hard gate against fabricating sacred content.
6. **Inferred authority.** `registered_by`, custodian, and consent fields are never
   defaulted, never derived from a git author or a directory path, never auto-filled. An
   unfilled custodian is a blocking absence, not a null.
7. **Reading permission as a computed property.** Who may read is answered by people. The
   layer records the answer and enforces it; it does not derive it.
8. **Belt, bead, notation, or colour** — no such type, field, or value, per
   `jgwill/medicine-wheel#114` §4.3 and §6 item 5.

---

## Action Steps

Each resolves tension between a named current reality and the desired state.

1. **Adopt the settled registry shape rather than authoring a third.**
   *Current reality:* two documents specify the same five fields independently; a third
   variant would start a divergence.
   *Desired state:* one shape across the ecosystem.
   *Resolution:* specify `Standing` as `ReadingPosition`/`PerspectiveRegistry` plus
   `registered_by` and `registered_at`, and record the two prior sources so the next author
   finds the lineage.

2. **Specify composition as returning all readings.**
   *Current reality:* the only working implementation of read-composition returns one
   reading via a four-rung precedence chain.
   *Desired state:* `ReadResult` has no winner field and no resolution step.
   *Resolution:* §2.1. Any later proposal adding a `primary` field is a change to this
   invariant and is reviewed as one.

3. **Make refusal a return type before there is anything to refuse.**
   *Current reality:* no typed refusal exists anywhere in the ecosystem `[A∩D]`; read paths
   return content or throw.
   *Desired state:* a declined read is an inspectable value.
   *Resolution:* §3, and persist refusals.

4. **Specify read-as-event as mechanism only.**
   *Current reality:* nothing records that a record was read.
   *Desired state:* recency is expressible; meaning is not asserted.
   *Resolution:* §4 — `last_read_at` plus reader identity, and no inference attached.

5. **Ship the registry empty, and record why.**
   *Current reality:* an empty collection reads as unfinished work.
   *Desired state:* it reads as a decision.
   *Resolution:* state in the registry's own documentation that emptiness is deliberate and
   that each entry is a separate named decision.

6. **Record that `rispecs/ceremony-protocol.spec.md` describes behaviour its package does
   not have.**
   *Current reality:* the spec says governance never prevents; `enforceCeremonyGate()`
   blocks and `production.ts:146` throws. `[one lane]`
   *Desired state:* a reader designing against that spec is not misled.
   *Resolution:* raise it where that spec is maintained. Not corrected here — this document
   does not edit a spec it does not own.

---

## Quality Criteria

- ✅ **Creating focus** — every section states what a participant can create or be
  understood by, not what is eliminated.
- ✅ **Cited, not recalled** — every claim about existing behaviour carries a file:line read
  on 2026-08-10, and cross-lane concordance is marked.
- ✅ **Implementation-sufficient** — the four record shapes, the four composition layers,
  the gate position, and the return invariant are stated precisely enough to build from.
- ✅ **Codebase-agnostic** — shapes are described as fields and behaviours; no framework,
  file path, or language construct is required by the specification itself.
- ✅ **Culturally inert** — no belt, bead, notation, colour, register value, teaching, or
  correspondence appears. Cultural questions are named and routed, never answered.
- ✅ **Authorizes nothing** — no package, type, dependency, or issue is created by this
  document.

---

## Open Questions

1. **Where does the layer live?** `narrative-engine` is the natural home because
   composition and validation already sit together there, but a reading is not a beat and a
   separate package may be the honest shape. If it becomes a package that
   `narrative-engine` imports, the topological `workspaces` array requires it at index ≤ 10
   — `src/narrative-engine` is index 10 (0-based), `mcp` is last at 26. `[one lane]`
   Undecided.
2. **Where do refusals persist?** A refusal is evidence about governance, not about
   narrative. `consent-lifecycle` already models state changes with history and may be the
   truer home than any narrative store.
3. **Does read-as-event fit the current storage tier?** `StoredBeat` was widened once
   already; a second widening's cost has not been measured. [unverified]
4. **Does a standing apply to all records or to some?** This document specifies a global
   registry. Per-record opt-in is a different design and has not been examined.
5. **What does a reading compose *from* when a record has only a description?** With one
   telling and no per-standing content, L1 and L3 supply everything and L2 supplies only
   stance. Whether that produces a reading worth returning is genuinely unclear and should
   be tested before the layer is built.
6. **Who reviews this document?** It proposes a capability adjacent to a gated cultural
   question, in a repo with one maintainer and a live open PR on the neighbouring subject.

---

## Related

### `jgwill/medicine-wheel`

| This spec | Anchor | Relation |
|---|---|---|
| whole document | `jgwill/medicine-wheel#114` | The gated relation this specification deliberately stands beside. Its S1–S5 are what is specified here; its §6 gate is untouched. **Open, unmerged, 32 commits behind `main` as of 2026-08-10.** |
| §3 refusal | `rispecs/consent-lifecycle.spec.md` | Where the protocol layer's state machinery is specified |
| §2 composition | `rispecs/narrative-engine.spec.md`, `rispecs/narrative-beats-lifecycle.spec.md` | The reader and authoring sides a reading composes over |
| §1.2 weight | `rispecs/importance-unit.spec.md`, `rispecs/relational-index.spec.md` | Where weight legitimately lives — on knowledge |
| §1.1 standing ≠ credential | `rispecs/community-review.spec.md` | The suite's existing statement that validation is not credentialed |
| §Current Reality | `rispecs/ceremony-protocol.spec.md` | Describes non-blocking behaviour its package does not have |

### Sibling systems — learned from, not depended on

- `@miadi/foundations-wampum-narrative-engine` 0.1.0 — the foundation and its governance
  block. Source `/a/src/Miadi/packages/foundations-wampum-narrative-engine`.
  Upstream state: *"discovery → specification (no implementation yet)"* (`STATUS.md:3`);
  docs merged via `jgwill/Miadi#440` (2026-06-16); lanes `jgwill/Miadi#437`, `#438`, `#439`
  open. `[one lane]`
- `/a/src/Miadi/rispecs/wampum-narrative-engine/` — where L1–L4 and the registry shape are
  specified upstream.
- `coaia-narrative` 0.16.0 at `/a/src/coaia-narrative` — the one working implementation of
  read-composition, and the source of §2.1's negative lesson. Its wampum tools are
  **opt-in**, absent from the default set (`tool-groups.ts:66`). `[one lane]`

---

🌸: The invariant at the centre of this document is a refusal to choose — every reading
returned, none crowned. It looks like the layer declining to do its job. It is the job:
holding the room open so that the person with thirty years of pattern-sense and the person
seeing the problem for the first time are both, always, already speaking.
