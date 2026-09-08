# community-choice — RISE Specification *(STUB)*

> A proposer offers options with stated consequences; an audience responds; the result authorizes nothing unless it was said in advance that it would.

**Version:** 0.0.0 — **STUB, not yet specified**
**Package:** `@medicine-wheel/community-choice` *(does not exist)*
**Document ID:** rispec-community-choice-v0
**Last Updated:** 2026-09-08
**Status:** stub for reflection — depends on `community-identity`, which has a held question

---

## Why this stub exists

From William, 2026-08-31: *"use of my miadi-review within a process where I
expose what I've reviewed to try to help or process evolve and have people
choose within the community in advance."*

That has no type today. Measured on the chronicle store: **0 occurrences of
"poll", 0 of "vote".** Episode 340 drafted a four-layer packet ending in an
audience poll; it ran **once**, and its own `RETURN-TO-EP339.md` asks William to
choose A/B/C — two companion responses later, through 2026-08-31, nobody
answered it.

---

## Desired Outcome *(draft)*

A review William has made becomes a set of options a community can respond to,
where every option states its consequence, at least one path is "don't act
yet", and the result is a count — never a permission.

---

## Why not extend `community-review` — the argument, for challenging

They run in **opposite directions**.

| | `community-review` | `community-choice` |
|---|---|---|
| participants | bounded, named, role-carrying | unbounded or loosely identified |
| options | none — the circle forms its own outcome | authored in advance by the proposer |
| result | **authorizes** (a blessing, a merge permit) | **authorizes nothing** by default |
| consensus | `seekConsensus` = every reviewer has spoken | attendance has no denominator here |

`ReviewOutcomeType` is a closed five-enum and every producer in `outcomes.ts`
returns *the circle's* decision carrying `elderBlessing` and `wilsonCheck`.
Adding a poll outcome would make an Elder's blessing apply to a Facebook
audience.

And `seekConsensus` (`src/community-review/src/consensus.ts:26-33`) computes
consensus as **all reviewers having spoken** — attendance. For a named circle
that is a defensible proxy. For an open audience the denominator does not exist.

**Why not `consent-lifecycle`:** a poll response is not a grant. Modelling it
there makes "the audience chose B" readable as "the audience consented to B" —
the single conflation Episode 340 names twice. It *is* the right owner of the
**precondition**, hence `consentGate` below.

---

## Shape — sketch, not decided

```typescript
type ChoiceAuthority = 'influence-only' | 'advisory' | 'binding';   // default: influence-only

interface SubjectRef {            // a reference, never a coupling
  kind: 'review' | 'episode' | 'node';
  service?: string;               // e.g. 'miadi-review'
  id: string; version?: number;
  url?: string; sha256?: string;  // the receipt ep340 computes by hand today
}

interface ChoiceOption {
  id: string; label: string;
  consequence: string;            // REQUIRED — an option without a stated cost is a leading question
  deferral: boolean;              // at least one path must be "don't act yet"
}

interface ChoiceSet {
  id: string; subject: SubjectRef; question: string;
  options: ChoiceOption[];        // >= 2
  authority: ChoiceAuthority;
  boundaries: string[];           // REQUIRED, non-empty — what a response does NOT authorize
  consentGate?: string;           // a ConsentRecord that must be 'active' before opening
  state: 'draft' | 'open' | 'closed' | 'withdrawn';
  readingRef?: string;            // path to the packet holding the reasoning
}

interface ChoiceResponse { choiceSetId: string; optionId: string; respondent: RespondentRef; at: string }
interface ChoiceResult   { counts: Record<string, number>; total: number; byRespondentKind: Record<string, number>; unresolvedDivergence: string[] }
```

### Two invariants that belong in code

Both are **William's own corrections**, made by hand in the only exercise that
has ever run (`RETURN-TO-EP339.md`: *"Challenge two replaced a leading
adopt/reject question with pilot, gather-first, and defer options whose
consequences and limited authority are explicit"*):

- `validateChoiceSet` rejects fewer than two options, any option missing
  `consequence`, and an empty `boundaries`.
- `closeChoiceSet` returns a `ChoiceResult`, **never a permission**. `binding`
  authority requires an explicit `consentGate` resolved to `active`.

`byRespondentKind` exists so an anonymous connector tally can never be silently
added to a count of named members. **Facebook and other connectors report
numbers; they never produce a `kind: 'member'` respondent.**

---

## The four-layer packet: type or convention?

Episode 340's shape is practitioner source / William's reading / Miadi
proposition / audience poll. **Half of each:**

- Layers 1–3 stay a **document convention**. Their value is that a human wrote
  them and a second pass challenged them; a schema would formalise prose and
  gain nothing.
- Layer 4 needs a **type**, because it is the only layer receiving input from
  outside the room and so needs counting, respondent identity, and an authority
  boundary that survives being read by someone who never saw the handoff.

What the type takes from 1–3 is not their text but their **provenance** —
`SubjectRef` plus `readingRef`.

---

## Open questions

1. **Blocked on `community-identity`.** Without a `RespondentRef` there is no
   way to tell one response from two by the same person, and every count is
   unbacked. That package has a held question of its own.
2. **Where do responses live?** `storage-provider` with jsonl + neon, copying
   `inquiry-weaves.ts` and `plan-perspectives.ts`? Or in the app that collects
   them, with the wheel holding only the `ChoiceSet`?
3. **Is `miadi-review` absorbed, referenced, or mirrored?** The investigation
   concluded **stay put, build the seam** — the service's public URLs are
   already cited as durable receipts inside the chronicle, and moving the store
   orphans every receipt already written.
4. **Is a `ChoiceSet` a wheel node?** `mw_register_review` was proposed so a
   review becomes a `knowledge` node with `metadata.kind`. A `ChoiceSet` could
   follow, or stay a record. The `NodeType` union stays closed at six either way.
5. **`community-review` issue #105** proposes binding consensus to a PR
   lifecycle. Same verb "choose", opposite authority. Siblings over the same
   storage — and both need the missing MCP verbs that leave a circle stuck in
   `gathering`.

---

## Related

- `.guillaume/work/L1-review-to-choice.md` — the full argument, 506 lines
- `.guillaume/work/EXECUTION.md` step 4
- `rispecs/community-identity.spec.md` — the chooser this depends on
- `rispecs/community-review.spec.md` — the sibling, not the parent
- `rispecs/consent-lifecycle.spec.md` — the gate, not the record
