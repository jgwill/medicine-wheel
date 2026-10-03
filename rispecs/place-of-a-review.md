# The Place of a Review — RISE Chapter

> Where a review stands in the Medicine Wheel, what it is to its community, how it turns a cycle, and which repository holds which part. Drafted 2026-10-03 during screenwalks on grounding the Concordia proposal in Wilson (2008). Everything below is a proposal; nothing is implemented.

**Version:** 0.2.0 (draft for Guillaume's review)
**Document ID:** rispec-place-of-a-review-v0
**Last Updated:** 2026-10-03
**Changed in 0.2:** Wilson's own statement about a review (pp. 43–44) replaces "Wilson never speaks of reviews"; the review and its community; the review as a turn of a cycle; directions named by the teaching they come from; the three R's, cited correctly; small implementation steps.

---

## Desired Outcome

A review has one clear place in the wheel:
- **One word for each thing.** A *review* is the written, versioned account of a recording (the Miadi Review service). A *review circle* is the community process that holds a review (`@medicine-wheel/community-review`).
- **One kind**, registered here in `ontology-core`, beside the production, infrastructure and academic kinds.
- **A direction**, chosen from a teaching the system names.
- **Its steps visible as relations**, so the wheel shows how a review came to be.
- **Its community visible**: who it was given back to, and what they changed.
- **A cycle**, so each screenwalk, its review and its circle make one turn that seeds the next.

---

## What Wilson Says About a Review

Chapter 3 of *Research Is Ceremony* is Wilson's own literature review, and he says what kind of thing it is.

- **A review, not a critique.** Critiquing others' work "does not follow the Indigenous axiology of relational accountability", because judging "would imply that I know more about someone else's work and the relationships that went into it than they do themselves" (p. 43). So what follows "is properly termed a review rather than a critique" (p. 43).
- **A review builds on.** Done "in a style that is not critical, but builds upon the work of others, it can also form the context for relational accountability" (p. 44).
- **A review is written for its audience.** "The academic audience that requires a literature review is in itself the context for and through which it is written" (p. 43).
- **The academy's opposite habit.** Manu Meyer: students are challenged to find fault and the weak link in others' work, so that their own looks better (p. 57).

And around it:
- **Hearing yourself is analysis.** Rewatching videos of his own talks helped his ideas become "more firmly anchored or internalized" (p. 131).
- **Analysis builds relationships.** Ask "how the analysis of these ideas will help to further build relationships" (p. 119); "the strings between the knots" make the net work (p. 120).
- **Give it back.** Credibility comes from continuous feedback with all participants (p. 121). The record Wilson reviews shows the opposite: results "seldom if ever explained to those who have been studied" (p. 48).
- **Show how you came to it.** "some system of showing how we came to our final product" (p. 123).
- **Not a score.** "value judgements lose their meaning"; what matters is "fulfilling a role and obligations in the research relationship" (p. 77, cited through Wulff 2010). The method "refuses a single category or any other formula" (Hermes, p. 53).

The pages are indexed privately in `miadisabelle/Etuaptmumk-RSM` → `sources/wilson-2008-research-is-ceremony/` (`INDEX.md`, `GUIDANCE.md`). Pages 77 and 99 were checked through the book's text and secondary citations, not yet against photos.

---

## Structural Tension

**Current reality** (read 2026-10-03):

| Where | What it says about a review |
|---|---|
| Miadi, `@miadi/episodic-memory-schema` (`src/episode-review.ts`) | A review is the node `review:<uuid>`, with `metadata.kind: "miadi_review"`. The kind is defined in Miadi, not here. |
| Miadi, `@miadi/inquiry-weave` (`src/review.ts`) | When an episode attaches a review, it creates that node as `knowledge`, direction **east**, plus one edge `chronicle:<episode>` → `review:<uuid>` named by its use (jgwill/Miadi#630, after Episode 345). |
| Miadi, `lib/review-ceremony.ts` | A talking circle about the review opens, in the East (jgwill/Miadi#682). |
| Miadi, `package.json` | Depends on `@medicine-wheel/community-review`; no code imports it. `packages/community/PAGE-POST-CIRCLE.md` lists five open questions (R1–R5) before it can be used. |
| Here, `ontology-core` | A ceremony's `subject_id` may be `review:<uuid>` (0.15.5, #146). No review kind is registered. `MedicineWheelCycle` exists (`research_question`, `beats`, `ceremonies_conducted`, `relations_mapped`); reviews are not part of any cycle. |
| Here, `@medicine-wheel/community-review` | "Review" means a circle validating an artifact. It credits validation by "Elder blessing" to Wilson, and scores "Wilson's three R's" mechanically. |
| The review service | Each review grows in three steps (correct, ground, relate). None of these reach the wheel. |

**The tension:** one word names two things; the kind that places a review is defined outside the ontology that owns meaning; every review faces East; a review's steps and its community stay off the wheel; and the circle package that should hold a review speaks in Wilson's name about things his pages do not say.

---

## Where a Review Sits

**The wheel here holds more than one teaching, and they place reflection differently.**

| Teaching | Where it is used | West | North |
|---|---|---|---|
| Life-cycle teachings (`constants.ts` `DIRECTIONS`) | seasons and ages; `CYCLES.md`; the MCP direction tools | Reflection, truth (autumn) | Wisdom, completion (winter) |
| Focus labels (`constants.ts` `DIRECTION_INFO`) | the entity bindings: a service is west ("the thing that executes"), a research field east | Implementation, creation | Reflection, integration, wisdom |
| The Diné-named sequence in `Etuaptmumk-RSM` (`CLAUDE.md`): Nitsáhákees, Nahat'á, Iina, Siihasin | the Four Directions agents; the screenwalk practice | Living and action | Assurance and reflection |

`ontology-core.spec.md` already says the two vocabularies in `constants.ts` are "related but not interchangeable". Wilson's own circle is ontology ↔ epistemology ↔ methodology ↔ axiology (p. 108), not the directions, and Hampton speaks of "the six directions" (p. 53): forms differ between Nations.

**Proposal.** A rule that places a review names the teaching it follows, as naming sources keeps us accountable (pp. 114–115). Using the focus labels, which the entity bindings already use:

| A review of… | Rests in | Why |
|---|---|---|
| Our own recording: a screenwalk (these reviews mark themselves `type: internal`) | **North**: reflection, integration | What has been learned. Hearing yourself (p. 131). |
| Someone else's work entering an episode | **East**: vision, emergence | A seed received. It builds on their work (p. 44). |

Under the life-cycle teachings, the same internal review would rest in the **West** (reflection, autumn). Choosing is Guillaume's decision; what matters is that the choice is named.

---

## A Review and Its Community

1. **A review is unfinished until it is given back.** The circle held about a review (`subject_id`) is where it is given back. Its responses become the review's next versions, named: who spoke, and when (p. 121; naming per knowledge, pp. 114–116).
2. **The community can steer it.** The community decides what is researched and has direct access to decisions (Cora and Lewis, p. 110). The circle can change a review, hold it ("Let's sleep on it", p. 113), return it, or deepen it. `community-review` already has these outcomes: `ceremonialHold`, `returnToCircle`, `requestDeepening`.
3. **It builds on; it does not judge.** A review in Wilson's sense situates and builds on someone's work (pp. 43–44). Step 2 of the review service corrects *our generated text*, never the maker of the video.
4. **Who the community is.** People in the circle, and the seats (`agent` nodes, 0.17.0) that speak and are accountable to the people they serve. Seats do not stand in for the community.
5. **Credibility, not a score.** Credibility comes from co-researchers' feedback (p. 121) and from those who know the work confirming it (p. 131). Nothing in the pages read scores it, and no source found describes an "Elder blessing" as a validation step.

---

## A Review Turns a Cycle

Guillaume, 2026-10-03: a screenwalk gives him something to review later, and that review is itself a new cycle in the wheel, with a relation to the ceremony. Wilson says the same of his own work: the analysis "has been ongoing and has helped to shape the very nature of the research as it progresses" (p. 131).

Using the Diné-named sequence the screenwalk practice already follows:

| Moment | Direction | In our records |
|---|---|---|
| The intention a screenwalk opens with | East: Nitsáhákees, thinking | The person's opening prompt; the cycle's `research_question` |
| Who is in the circle, consent to record, the plan | South: Nahat'á, planning | Seats and teams; consent asked before recording someone else (Jane, p. 113) |
| The recorded work | West: Iina, living and action | The screenwalk's capture |
| The review and the circle that receives it | North: Siihasin, assurance and reflection | The review node; the talking circle (`subject_id`) |
| What the circle opens | back to East | The next screenwalk cites this review ("each screenwalk is reviewed the next day and cited by the one after it", review `d64a2fdf`) |

**Proposal.** One `MedicineWheelCycle` per research question (for example, one per episode inquiry). Each screenwalk, review and circle is one turn. The review's circle counts in `ceremonies_conducted`; the review's relations count in `relations_mapped`; the beats spoken in the circle carry the cycle's `cycle_id`. The cycle feature exists and is unused; this gives it its first real work.

---

## Proposals

### 1. Two words for two things
*review*, the account; *review circle*, the process (`community-review` already names its type `ReviewCircle`).

### 2. Register the kind here
A review rides a `knowledge` node with a `metadata.kind` discriminator and a direction binding, beside `ProductionEntityKind`, `InfraEntityKind` and `AcademicEntityKind`. Miadi then reads the kind from `ontology-core`. Adopt `miadi_review` as it stands, or register `review` and migrate the existing nodes.

### 3. The steps and the circle as relations

| Review step | Relation (proposed name) | To | Exists today? |
|---|---|---|---|
| The account | `reviews` | The screenwalk's `CaptureRecord` (kind `video`, `uri` the video's address; *capture* is the canonical word, `capture-registry.spec.md`) | The registry, yes; the link, no. The review node holds only `metadata.source_url`. |
| Academic fields | `grounded-in` | A `research-field` node (`AcademicEntityKind`, East) | The kind, yes; the edge, no |
| Related review | `related-to`; for parts of one screenwalk, `follows` | Another review | No |
| Internal usage | `proposes-to` | A team or package node | No |
| Held by an episode | Named by its use, e.g. `discusses` | `chronicle:<episode>` → the review | Yes (jgwill/Miadi#630) |
| Given back | The ceremony's `subject_id` | The circle held about it | Yes (#146, jgwill/Miadi#682) |
| Changed by the circle | `revised-after` | From the new review version to the ceremony whose responses it carries | No |

Each relation carries the review version that made it.

### 4. Let `community-review` hold a Miadi review, in Wilson's terms
Answering Miadi's R1–R5 (`packages/community/PAGE-POST-CIRCLE.md`):
- **R1 Storage.** A review circle is the talking-circle ceremony Miadi already opens, with its spoken turns as beats. `ReviewCircle` becomes a read over that ceremony, not a second store.
- **R2 Roles.** Map from `community-identity` roles. An Elder is a relationship a community recognizes, not a role an administrator assigns (pp. 113–116).
- **R3 Artifact.** A review is `knowledge`, or a registered review kind (proposal 2).
- **R4 Outcomes.** Keep `ceremonialHold` (p. 113), `returnToCircle` (p. 121) and `requestDeepening` (pp. 119–120). `approveWithBlessings` should not require an "Elder blessing": no source supports it as a validation step.
- **R5.** Upstream first, here, then Miadi bumps.

### 5. Say Wilson's words correctly
- **The three R's.** Wilson writes "respect, reciprocity and responsibility" in his own voice (ch. 4, around pp. 77–78; ch. 6, p. 99). The label "three R's" he credits to Cora Weber-Pillwax, whose set, as he quotes it, is "Respect, Reciprocity and Relationality" (p. 58). Cite the pages and credit the label.
- **What the checks measure.** `reviewAgainstWilson` passes respect when two directions are present, and reciprocity when an Elder or community voice appears in the log. In Wilson's pages, respect is listening intently, not insisting your idea prevails (p. 58), and reciprocity is the work giving back (pp. 48, 121, 127). Name each check by what it measures ("directions present", "voices heard", "accountability stated"), and add "returned to participants".
- **Scores.** `wilsonAlignment` and the gates that block work below it (fire-keeper 0.65; elsewhere 0.5, 0.6, 0.67, 0.7) are our construct. Label them so, and prefer questions asked of people (the relational accountability lens) to a gate on a number.

---

## Small Implementation Steps

Each needs its issue first, per `medicine-wheel-upstream-delivery`.

| # | Where | Change | Size |
|---|---|---|---|
| 1 | Miadi `packages/inquiry-weave/src/review.ts` (node creation) | Direction from the review's type: internal → the teaching's reflection direction; outside work → east | small |
| 2 | Miadi `lib/review-ceremony.ts` (circle and ceremony) | The circle's direction follows its review's, instead of `"east"` hard-coded | small |
| 3 | Review service | Provenance per section (who wrote, who checked, from what); a circle's response becomes a version that names its speakers | small |
| 4 | Here, `ontology-core` | Register the review kind and its binding (proposal 2) | small |
| 5 | Here, `community-review` | Rename the three checks to what they measure; add "returned to participants"; drop the Elder-blessing requirement; cite pages | small |
| 6 | Miadi | Bind the review circle to a `MedicineWheelCycle` for the episode's inquiry (`cycle_id` on its beats) | medium |
| 7 | Here, docs | `CYCLES.md` and `CEREMONIES.md`: cite the R's correctly, name the teaching their directions follow, and rewrite the West line that frames structural tension as a distance to close, in structural tension's own words (the tension between desired outcome and current reality seeks resolution) | small |

---

## Who Holds What

| Repository | Holds |
|---|---|
| `jgwill/medicine-wheel` (`ontology-core`, `community-review`) | What a review *is* on the wheel: its kind, its direction rule and the teaching it follows, its relation names. The review circle, and the cycle. |
| `jgwill/Miadi` (`review-service`, `episodic-memory-schema`, `inquiry-weave`) | Writing and versioning reviews; opening their circles; projecting both onto the wheel with this kind and these relations. |

`ontology-core` defines meaning; other repositories define representation (coaia-narrative `KINSHIP.md`).

---

## Decisions for Guillaume

- [ ] Two words: *review* and *review circle*
- [ ] Kind name: adopt `miadi_review` here, or register `review` and migrate
- [ ] Which teaching places a review, and so where an internal review rests: North (focus labels, Diné-named sequence) or West (life-cycle teachings)
- [ ] The relation names in proposal 3
- [ ] One cycle per episode inquiry, or another grain

---

## Related

- Here: `rispecs/community-review.spec.md`, `rispecs/CYCLES.md`, `rispecs/CEREMONIES.md`, `rispecs/capture-registry.spec.md`, `rispecs/ontology-core.spec.md`, `src/ontology-core/src/types.ts`, `src/ontology-core/src/constants.ts`
- jgwill/Miadi: `packages/episodic-memory-schema/src/episode-review.ts`, `packages/inquiry-weave/src/review.ts`, `lib/review-ceremony.ts`, `packages/community/PAGE-POST-CIRCLE.md`, `packages/review-service/skills/`
- miadisabelle/Etuaptmumk-RSM: `sources/wilson-2008-research-is-ceremony/` (private): `INDEX.md`, `GUIDANCE.md`, `LEDGER.md`
- Outside sources checked: Kirkness & Barnhardt (1991), *Journal of American Indian Education* 30(3), 1–15; Wilson (2001), *Canadian Journal of Native Education* 25(2), 175–179; Wulff (2010), *The Qualitative Report* 15(5)
