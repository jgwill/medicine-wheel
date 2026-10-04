# The Place of a Review — RISE Chapter

> Where a review stands in the Medicine Wheel, what it is to its community, how it turns a cycle, and which repository holds which part. Drafted 2026-10-03 during screenwalks on grounding the Concordia proposal in Wilson (2008). Everything below is a proposal; nothing is implemented.

**Version:** 0.5.0 (draft for Guillaume's review)
**Document ID:** rispec-place-of-a-review-v0
**Last Updated:** 2026-10-04
**Changed in 0.5.1:** p. 99: a review is a definition of a recording and loses its context alone (Tafoya's Principle of Uncertainty), so the `reviews` relation keeps them together; summaries keep rough transitions.
**Changed in 0.5:** chapter 4 read (pp. 70–81): the teller checks a retelling (p. 71); the review steps as relations are the method, not bookkeeping (p. 79); a review circle asks Wilson's six questions (p. 77) instead of scoring; the three R's on p. 77.
**Changed in 0.4:** two decisions recorded (two words; an internal review rests in the North); the kind name, the relation names and the cycle's grain explained in plain words, each with a recommendation; a section for the local agent; p. 35 replaces p. 53 as the ground against scores (on the page, Hermes's "formula" is a recipe for method).
**Changed in 0.3:** the end of chapter 3 (pp. 59–61): Atkinson's principles say what a review does and that approval belongs to the community; Kinunwa on ceremony as the preparation.
**Changed in 0.2:** Wilson's own statement about a review (pp. 43–44) and Cora's return to the community (p. 125) replaces "Wilson never speaks of reviews"; the review and its community; the review as a turn of a cycle; directions named by the teaching they come from; the three R's, cited correctly; small implementation steps.

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
- **What a review does.** Among Judy Atkinson's principles, which Wilson quotes: "quietly aware watching", deep listening "with more than the ears", "A reflective non-judgemental consideration of what is being seen and heard", and fidelity to what was heard (p. 59). Read in order, they are a screenwalk and its review.
- **Approval is the community's.** Atkinson's first principle: "Aboriginal people themselves approve the research and the research methods"; many communities let researchers in only once their own conditions are met (p. 59).
- **Ceremony is the preparation.** For the Elder Lionel Kinunwa, quoted by Wilson, a ceremony is not just the period at the end of the sentence (p. 60); it is the "preparation that happens long before the event" (p. 61).

And around it:
- **Hearing yourself is analysis.** Rewatching videos of his own talks helped his ideas become "more firmly anchored or internalized" (p. 131).
- **Analysis builds relationships.** Ask "how the analysis of these ideas will help to further build relationships" (p. 119); "the strings between the knots" make the net work (p. 120).
- **Presentation is continuing relationships, and it ends by going back.** "So the presentation or knowledge transfer is again all about continuing healthy relationships" (p. 125). Cora: after the writing, "it means going back to the community, talking to those people to say, 'Okay, this is what I thought. And out of all this, this is my thinking…'" (p. 125).
- **Give it back.** Credibility comes from continuous feedback with all participants (p. 121). The record Wilson reviews shows the opposite: results "seldom if ever explained to those who have been studied" (p. 48).
- **Name the teller.** Wilson's co-researchers did not want anonymity, because a story "would lose its power without knowledge of the teller" (p. 130).
- **Show how you came to it.** "some system of showing how we came to our final product" (p. 123).
- **Not a score.** It is not Wilson's intention to judge any one paradigm "as being better or worse than another" (p. 35); he justifies his own strategies rather than arguing against others (p. 35, after Meyer 2001). "value judgements lose their meaning"; what matters is "fulfilling a role and obligations in the research relationship" (p. 77, cited through Wulff 2010).
- **Choosing what to review is axiology.** Axiology judges "which information is worthy of searching for" and asks what the knowledge "will be used for" (p. 34). Which screenwalks get reviewed, and what a review proposes, are axiological choices.

The pages are indexed privately in `miadisabelle/Etuaptmumk-RSM` → `sources/wilson-2008-research-is-ceremony/` (`INDEX.md`, `GUIDANCE.md`). Pages 33–35, 43–60 and 108–132 are held as photos and p. 61 as an earlier text extraction, so chapter 3 is complete; pages 77 and 99 were checked through the book's text and secondary citations only.

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
| Someone else's work entering an episode | **East**: vision, emergence | A seed received. It builds on their work (p. 44). *Still a proposal.* |

**Decided (Guillaume, 2026-10-04): an internal review rests in the North.** His reason: "we capture when we are at the West." The recording is living and action (West, Iina); the review reflects on what was captured (North, Siihasin). The teaching followed is the Diné-named sequence, which the focus labels agree with. The life-cycle teachings, which put reflection in the West, are not the teaching that places reviews.

**Stored data stays as it is.** Review nodes Miadi already wrote carry `east`. Placing new ones North changes nothing stored; moving the old ones would be a migration and its own decision.

Under the life-cycle teachings, the same internal review would rest in the **West** (reflection, autumn). Choosing is Guillaume's decision; what matters is that the choice is named.

---

## A Review and Its Community

1. **A review is unfinished until it is given back.** After the writing comes going back to the community (Cora, p. 125). The circle held about a review (`subject_id`) is where it is given back. Its responses become the review's next versions, named: who spoke, and when (p. 121; naming per knowledge, pp. 114–116).
2. **The community can steer it.** The community decides what is researched and has direct access to decisions (Cora and Lewis, p. 110). The circle can change a review, hold it ("Let's sleep on it", p. 113), return it, or deepen it. `community-review` already has these outcomes: `ceremonialHold`, `returnToCircle`, `requestDeepening`.
3. **It builds on; it does not judge.** A review in Wilson's sense situates and builds on someone's work (pp. 43–44). Step 2 of the review service corrects *our generated text*, never the maker of the video.
4. **The teller checks the retelling.** Wilson retold Cora's story, she felt misrepresented, and he used her own published version, which she could check "to ensure that they represent the intent of her message" (p. 71). A review retells someone's words: wherever possible, the speaker checks it. An inaccurate translation of her grandfather's words was what hurt most (p. 72); generated summaries and translations say that they are generated.
5. **Who the community is.** People in the circle, and the seats (`agent` nodes, 0.17.0) that speak and are accountable to the people they serve. Seats do not stand in for the community.
6. **Credibility, not a score.** Credibility comes from co-researchers' feedback (p. 121) and from those who know the work confirming it (p. 131). Nothing in the pages read scores it.
7. **Approval belongs to the community, on its conditions.** The people themselves approve the research *and its methods* (Atkinson, quoted p. 59). For a Miadi review, that means the circle can approve how the screenwalk was made, not only what the review says. What has no source is a fixed "Elder blessing" as a validation step.

---

## A Review Turns a Cycle

Guillaume, 2026-10-03: a screenwalk gives him something to review later, and that review is itself a new cycle in the wheel, with a relation to the ceremony. Wilson says the same of his own work: the analysis "has been ongoing and has helped to shape the very nature of the research as it progresses" (p. 131). And Kinunwa's ceremony is the preparation long before the event (pp. 60–61): screenwalks and reviews are part of the ceremony, not a prelude to some later product.

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
A review rides a `knowledge` node with a `metadata.kind` discriminator and a direction binding, beside `ProductionEntityKind`, `InfraEntityKind` and `AcademicEntityKind`. Miadi then reads the kind from `ontology-core`. Recommended: adopt `miadi_review` as it stands, so no stored node changes (see Decisions).

### 3. The steps and the circle as relations

For Wilson, "the methodology is simply the building of more relations" (p. 79). Writing a review's steps as relations is the method itself, not bookkeeping; each new relation must respect the ones around it, and both sides share its power (p. 79). The first relation matters most: a review defines a recording, and a definition loses its context when it travels alone (Tafoya's Principle of Uncertainty, p. 99). A generated summary also keeps the recording's rough transitions rather than inventing smooth ones (p. 99).

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
- **R4 Outcomes.** Keep `ceremonialHold` (p. 113), `returnToCircle` (p. 121) and `requestDeepening` (pp. 119–120). `approveWithBlessings` should not require an "Elder blessing": no source supports it as a validation step. What does have a source is approval by the community, on its own conditions, covering the methods as well as the work (Atkinson, quoted p. 59). Record who approved and on what conditions; do not count blessings. In place of `reviewAgainstWilson`'s score, the circle asks Wilson's six questions of its members (p. 77; in the MCP resource as `researcher_questions`): respectful relationships with the topic and with the participants, a stronger shared relationship with the idea, one's role and responsibilities, obligations to all one's relations, and what is given back.
- **R5.** Upstream first, here, then Miadi bumps.

### 5. Say Wilson's words correctly
- **The three R's.** Wilson: respect, reciprocity and responsibility "are key features of any healthy relationship and must be included in an Indigenous methodology"; Cora Weber-Pillwax "calls these the 3 R's of Indigenous research and learning" (p. 77; again p. 99). A variant of hers, quoted by Evelyn Steinhauer, has Relationality as the third R (p. 58). Cite the page and credit the label to her.
- **What the checks measure.** `reviewAgainstWilson` passes respect when two directions are present, and reciprocity when an Elder or community voice appears in the log. In Wilson's pages, respect is listening intently, not insisting your idea prevails (p. 58), and reciprocity is the work giving back (pp. 48, 121, 127). Name each check by what it measures ("directions present", "voices heard", "accountability stated"), and add "returned to participants".
- **Scores.** `wilsonAlignment` and the gates that block work below it (fire-keeper 0.65; elsewhere 0.5, 0.6, 0.67, 0.7) are our construct. Label them so, and prefer questions asked of people (the relational accountability lens) to a gate on a number.

---

## Small Implementation Steps

Each needs its issue first, per `medicine-wheel-upstream-delivery`.

| # | Where | Change | Size |
|---|---|---|---|
| 1 | Miadi `packages/inquiry-weave/src/review.ts` (node creation) | Direction from the review's type: internal → **north** (decided); outside work → east (proposal). New nodes only. | small |
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

### Decided

- [x] **Two words.** A *review* is the written, versioned account of a recording. A *review circle* is where people talk together about a review. In Guillaume's words (2026-10-04): "one is an actual activity where we talk to each other in relationship to a review".
- [x] **North.** An internal review rests in the North, because "we capture when we are at the West" (Guillaume, 2026-10-04).

### Still open, in plain words

**1. 🏷️ The kind's name.**
- **What it is.** Think of a label on a jar. Every review Miadi has put on the wheel is a jar labelled `miadi_review`; that label is the node's `metadata.kind`. medicine-wheel keeps the official list of labels: production, infrastructure, academic. A review is not on that list yet.
- **The question.** Do we add `miadi_review` to the list as it is? Or do we add a plainer `review` and relabel every jar already on the shelf? Relabelling rewrites stored nodes, in Neon and JSONL; that is a migration.
- **Recommendation: keep `miadi_review`.** Nothing stored changes, and the label says where the review comes from. If reviews ever come from somewhere else, they get their own label beside it.

**2. 🧵 The relation names.**
- **What it is.** On the wheel, a link between two things is a *relation*, and every relation has a name: a short verb. Miadi already writes one, from an episode to the review it discusses. Each review step would add a link:

| The review step | Links the review to | Proposed name |
|---|---|---|
| Watching the recording | the video | `reviews` |
| Academic fields | each field | `grounded-in` |
| Relations to other reviews | another review | `related-to` (or `follows`, for parts of one screenwalk) |
| Internal usage | a team or package | `proposes-to` |
| A circle changed it | the circle's ceremony | `revised-after` |

- **The question.** Are these the right words? Once relations are written, a rename is a migration, so now is the moment to change one.
- **Recommendation: accept them**, changing any word that feels wrong before the first one is written.

**3. 🌾 The grain of a cycle.**
- **What it is.** A cycle (`MedicineWheelCycle`, a feature that exists and has never been used) is one journey around the wheel, held together by one research question; it has a `research_question` field. Each screenwalk → review → circle is one *turn* inside it. "Grain" is how big one cycle is. If a turn is a day, is the cycle a season or a single day?
- **The choices.**
  - (a) One cycle per research question. For example, "grounding the Concordia proposal in Wilson" is one cycle and the T4 chart path is another.
  - (b) One cycle per episode.
  - (c) One cycle per screenwalk. Then every cycle has a single turn, which loses what a cycle is for.
- **Recommendation: (a).** It is Wilson's Topic step: the question is what holds the turns together (p. 108).

---

## For the local agent

What can start now, and what waits. Each item needs its issue first (`medicine-wheel-upstream-delivery`).

| Step | Can start | Depends on |
|---|---|---|
| Miadi step 1: new review nodes placed North when internal | now | decided |
| Miadi step 2: the circle's direction follows its review's | now | decided |
| Review service step 3: provenance per section; circle responses named | now | nothing |
| medicine-wheel step 4: register the kind | after decision 1 | recommended default: `miadi_review` |
| Relations from the review steps (proposal 3) | after decision 2 | recommended: the names above |
| medicine-wheel step 5: `community-review` checks and outcomes | after #155's decisions | R1–R5 answers in proposal 4 |
| Miadi step 6: bind circles to a cycle | after decision 3 | recommended: one cycle per research question |
| medicine-wheel step 7: `CYCLES.md`, `CEREMONIES.md` | now | nothing |

The answers to Miadi's R1–R5 (`packages/community/PAGE-POST-CIRCLE.md`) are proposal 4 above. When a decision is made, record it here and in the issue, so the next agent reads one place.

---

## Related

- Here: `rispecs/community-review.spec.md`, `rispecs/CYCLES.md`, `rispecs/CEREMONIES.md`, `rispecs/capture-registry.spec.md`, `rispecs/ontology-core.spec.md`, `src/ontology-core/src/types.ts`, `src/ontology-core/src/constants.ts`
- jgwill/Miadi: `packages/episodic-memory-schema/src/episode-review.ts`, `packages/inquiry-weave/src/review.ts`, `lib/review-ceremony.ts`, `packages/community/PAGE-POST-CIRCLE.md`, `packages/review-service/skills/`
- miadisabelle/Etuaptmumk-RSM: `sources/wilson-2008-research-is-ceremony/` (private): `INDEX.md`, `GUIDANCE.md`, `LEDGER.md`
- Outside sources checked: Kirkness & Barnhardt (1991), *Journal of American Indian Education* 30(3), 1–15; Wilson (2001), *Canadian Journal of Native Education* 25(2), 175–179; Wulff (2010), *The Qualitative Report* 15(5)
