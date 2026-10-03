# The Place of a Review — RISE Chapter

> Where a review stands in the Medicine Wheel, what it is related to, and which repository holds which part. Drafted 2026-10-03 during a screenwalk on grounding the Concordia proposal in Wilson (2008). Everything below is a proposal; nothing is implemented.

**Version:** 0.1.0 (draft for Guillaume's review)
**Document ID:** rispec-place-of-a-review-v0
**Last Updated:** 2026-10-03

---

## Desired Outcome

A review has one clear place in the wheel:
- **One word for each thing.** A *review* is the written, versioned account of a recording (the Miadi Review service). A *review circle* is the community process that holds an artifact (`@medicine-wheel/community-review`).
- **One kind**, registered here in `ontology-core`, beside the production, infrastructure and academic kinds.
- **A direction** that follows what the review is about.
- **Its three steps visible as relations**, so the wheel shows how a review came to be.

---

## Structural Tension

**Current reality** (read 2026-10-03):

| Where | What it says about a review |
|---|---|
| Miadi, `@miadi/episodic-memory-schema` (`src/episode-review.ts`) | A review is the node `review:<uuid>`, with `metadata.kind: "miadi_review"`. The kind is defined in Miadi, not here. |
| Miadi, `@miadi/inquiry-weave` (`src/review.ts`) | When an episode attaches a review, it creates that node as `knowledge`, direction **east**, plus one edge `chronicle:<episode>` → `review:<uuid>` named by what the episode uses the review for (jgwill/Miadi#630, after Episode 345). |
| Miadi, `lib/review-ceremony.ts` | A talking circle can be held about the review. It opens in the East (jgwill/Miadi#682). |
| Here, `ontology-core` `types.ts` | A ceremony's `subject_id` may be `review:<uuid>` (0.15.5, #146). No review kind is registered. |
| Here, `@medicine-wheel/community-review` | "Review" means a circle validating an artifact: gathering → reviewing → deliberating → decided. Its *Wilson Alignment* section cites no pages. |
| The review service | Each review grows in three steps: the account corrected, academic fields with sources, then relations to other reviews and to teams. None of these steps reaches the wheel. |

**The tension:**
- One word names two things in two repositories.
- The kind that places a review is defined outside the ontology that owns meaning. The ecosystem's own rule says otherwise: `ontology-core` defines meaning, other repositories define representation (coaia-narrative `KINSHIP.md`).
- Every review faces East, whether it brings an outside idea in or reflects on our own work.
- What makes a review worth holding, its three steps, stays off the wheel.

---

## What Wilson Gives, and What He Does Not

Wilson (2008) never speaks of reviews, recordings or a medicine wheel. His circle is ontology ↔ epistemology ↔ methodology ↔ axiology (p. 108), not the four directions. What follows is our reading, with his pages beside it.

- **Hearing yourself is analysis.** Rewatching videos of his own talks helped his ideas become "more firmly anchored or internalized" (p. 131). A review of a screenwalk is that rewatching, written down.
- **Analysis builds relationships.** Ask "how the analysis of these ideas will help to further build relationships" (p. 119). In Peter's fishing net, it is "the strings between the knots" that make the net work (p. 120). A review is a knot; its relations are the strings.
- **Give it back.** Credibility comes from continuous feedback: participants get their ideas back and hear each other's (p. 121). The circle held about a review is that giving back.
- **Show how you came to it.** Wilson asks for "some system of showing how we came to our final product" (p. 123).
- **Name where it came from.** Naming sources keeps us accountable to them (pp. 114–115); whether to name someone is decided per knowledge (p. 116).

The full page index is private: `miadisabelle/Etuaptmumk-RSM` → `sources/wilson-2008-research-is-ceremony/` (`INDEX.md`, `GUIDANCE.md`).

---

## Proposals

### 1. Two words for two things

- **review**: the written, versioned account (Miadi Review service).
- **review circle**: the community process. `community-review` already names its type `ReviewCircle`.

They already meet: a circle holds a review as its subject (`subject_id`). In Wilson's terms (p. 121), the account becomes shared knowledge when a circle gives it back.

### 2. Register the kind here

Follow `ProductionEntityKind`, `InfraEntityKind` and `AcademicEntityKind`: a review rides a `knowledge` node with a `metadata.kind` discriminator and a direction binding. Then Miadi reads the kind from `ontology-core` instead of defining it.

Choice of name: adopt `miadi_review` as it stands (every existing review node already carries it), or register `review` and migrate those nodes.

### 3. A direction that follows what is reviewed

Using `ontology-core`'s own direction meanings (`constants.ts`):

| A review of… | Direction | Why |
|---|---|---|
| Someone else's work entering an episode (an outside talk or video) | **East**: "Vision, intention, emergence" | A seed received: what wants to emerge here. |
| Our own recording (a screenwalk; these reviews already mark themselves `type: internal`) | **North**: "Reflection, integration, wisdom" | What has been learned (Wilson, p. 131). |

Limit: a node holds one direction. A review used both ways keeps the direction of its first use, and each episode's edge says how that episode uses it.

One inconsistency to settle here: `CYCLES.md` names West "reflection", while `constants.ts` names West "implementation" and North "reflection". This chapter follows `constants.ts`.

### 4. The three steps as relations

| Review step | Relation (proposed name) | To | Exists today? |
|---|---|---|---|
| The account | `reviews` | What was captured: the screenwalk's `CaptureRecord` (kind `video`, its `uri` the video's address; `capture-registry.spec.md`, where *capture* is the canonical word) | The registry, yes; the link, no. Today the review node holds only `metadata.source_url`. |
| Academic fields | `grounded-in` | A `research-field` node (`AcademicEntityKind`, East) | The kind, yes; the edge, no |
| Related review | `related-to`; for parts of one screenwalk, `follows` | Another review | No |
| Internal usage | `proposes-to` | A team or package node | No |
| Held by an episode | Named by its use, e.g. `discusses` | `chronicle:<episode>` → the review | Yes (jgwill/Miadi#630) |
| Given back | The ceremony's `subject_id` | The circle held about it | Yes (#146, jgwill/Miadi#682) |

Each relation should carry the review version that made it, since a review keeps moving. Miadi already records the version each episode used.

### 5. Ground `community-review`'s Wilson section

Its *Wilson Alignment* section cites no pages. The pages that could ground it:
- named voices, with naming decided per knowledge (pp. 114–116)
- collaborative analysis and continuous feedback (p. 121)
- co-researchers confirming the work is authentic (p. 131)
- the circle and consensus (pp. 110, 113)

One caution for that spec: Wilson describes a community of scholars checking the work, not a score. `wilsonAlignment` (0–1) is our construct, and should say so.

---

## Who Holds What

| Repository | Holds |
|---|---|
| `jgwill/medicine-wheel` (`ontology-core`, `community-review`) | What a review *is* on the wheel: its kind, its direction rule, its relation names. And the review circle. |
| `jgwill/Miadi` (`review-service`, `episodic-memory-schema`, `inquiry-weave`) | Writing and versioning reviews, and projecting them onto the wheel with this kind and these relations. |

This is the rule the ecosystem already keeps: `ontology-core` defines meaning; other repositories define representation.

---

## Before Any Code

Per `medicine-wheel-upstream-delivery`: first an issue in jgwill/medicine-wheel (the kind, the direction rule, the relation names), then one in jgwill/Miadi (read the kind, write the step relations from `inquiry-weave`).

Decisions for Guillaume:
- [ ] Two words: *review* and *review circle*
- [ ] Kind name: adopt `miadi_review` here, or register `review` and migrate
- [ ] Direction rule: East for outside work, North for our own recordings
- [ ] The relation names in proposal 4

---

## Related

- Here: `rispecs/community-review.spec.md`, `rispecs/capture-registry.spec.md`, `rispecs/ontology-core.spec.md` (additive kinds), `rispecs/CYCLES.md`, `src/ontology-core/src/types.ts`, `src/ontology-core/src/constants.ts` (directions)
- jgwill/Miadi: `packages/episodic-memory-schema/src/episode-review.ts`, `packages/inquiry-weave/src/review.ts`, `lib/review-ceremony.ts`, `packages/review-service/skills/`
- miadisabelle/Etuaptmumk-RSM: `sources/wilson-2008-research-is-ceremony/` (private)
