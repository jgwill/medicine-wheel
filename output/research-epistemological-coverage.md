# Research: Epistemological Coverage — Wilson × Medicine Wheel Packages

**Date:** 2026-03-14  
**Analyst Angle:** Epistemology — how the codebase models relational ways of knowing  
**Wilson Reference:** *Research Is Ceremony: Indigenous Research Methods* (Shawn Wilson, 2008)  
**Packages Analyzed:** narrative-engine, prompt-decomposition, session-reader  
**Scope Boundary:** Epistemology only — ontology, axiology, and methodology covered by sibling agents

---

## Executive Summary

1. **The narrative-engine treats story as *structured data about sequence*, not as an epistemological method.** Beats are sorted, validated, and counted — but they do not carry relational meaning forward, transform through retelling, or deepen through spiraling. Narrative is a container, not a way of knowing.

2. **prompt-decomposition is the strongest epistemological site in the suite.** Its Four Directions classification, implicit intent surfacing, and relational obligation inference genuinely model a form of knowing-through-relationship. However, its core algorithm (keyword matching) is extractive — it dissects the prompt rather than entering into relationship with it.

3. **session-reader is epistemologically inert.** It parses JSONL events into flat analytics (tool counts, error counts, prompt counts). It preserves no relational context, detects no epistemological deepening, and cannot distinguish a session where understanding emerged from one where tasks were merely completed.

4. **The inseparability of knower/known — Wilson's central epistemological claim — is not modeled anywhere.** All three packages treat the human/prompt/session as an external object to be processed. The system never asks *who is knowing* or *how the knowing changes the knower*.

5. **Spiral/circular epistemology (where revisiting is deepening, not redundancy) is structurally present in narrative-engine's `spiralOrder()` but semantically absent.** The spiral sorts beats by direction order — it does not detect, honor, or facilitate the *epistemological deepening* that Wilson describes when knowledge circles back through ceremony.

---

## Detailed Analysis

### narrative-engine: Story as Way of Knowing

#### Core Question: Does narrative-engine model narrative as epistemology or just as sequenced data?

**Verdict: Sequenced data.** The package is fundamentally a *beat management system* — it sorts, validates, groups, and visualizes narrative units. At no point does it model the epistemological claim that story *carries* knowledge or that the act of narrating *creates* knowing.

#### Beats as "Living" Relational Carriers vs. Flat Events

The `NarrativeBeat` type (ontology-core, line 177) contains:
```typescript
{
  id, direction, title, description, prose?, ceremonies: string[],
  learnings: string[], timestamp, act, relations_honored: string[]
}
```

**Epistemological strengths:**
- `learnings: string[]` — acknowledges that a beat can carry knowledge forward
- `relations_honored: string[]` — connects the beat to relational accountability
- `prose?: string` — optional narrative text, allowing story to ride alongside structure
- `ceremonies: string[]` — links beats to ceremonial context

**Epistemological gaps:**
- `learnings` is a flat `string[]` — there is no structure for *how* the learning was obtained (through story? dream? ceremony? participation?). Wilson's epistemology insists the *source* of knowledge matters: knowledge from ceremony has different epistemic weight than knowledge from analysis.
- Beats have no concept of *audience* or *who received the knowledge*. Knowledge in Wilson's framework is always knowledge-in-relationship — it exists between knower and known, not as a standalone artifact.
- There is no field for *transformation* — how this beat changed the understanding of previous beats. In Indigenous epistemology, a new story doesn't just add to a sequence; it retroactively recontextualizes what came before.
- `relations_honored` is stored as `string[]` (IDs) — the actual relational substance is elsewhere. The beat *points to* relations but doesn't *embody* them.

#### The Sequencer: `sequencer.ts`

The sequencer (lines 18–129) is entirely positional:
- `sequenceBeats()` sorts by act then timestamp
- `insertBeat()` validates constraints (max beats, direction order)
- `spiralOrder()` sorts east→south→west→north within each act
- `nextDirection()` finds the first unvisited direction
- `suggestNextBeat()` suggests the next position to fill

**Epistemological critique:** This is *spatial* logic — where does the next beat go? Wilson's epistemology would ask: *what relationship needs attention next?* The sequencer never considers the *content* of beats, only their positional metadata. Two beats with identical direction and act but radically different relational content are treated identically.

The `spiralOrder()` function (line 121) deserves special attention. It implements a spiral *sort* — but a spiral sort is not spiral knowing. Wilson writes that circling back through the same territory with deeper understanding is the epistemological method of ceremony. `spiralOrder()` arranges beats in circular order but cannot detect whether the later beats represent *deepened understanding* of the earlier ones.

#### Cadence: `cadence.ts`

Cadence maps directions to phases: opening → deepening → integrating → closing (line 16-28).

**Epistemological strength:** The phase names themselves — especially "deepening" — acknowledge that movement through directions is not mere progression but epistemological development. The `requiresCeremony` flag (line 37-41) means transitions between ways of knowing require ceremonial attention.

**Epistemological gap:** Cadence is *validated*, not *experienced*. The `validateCadence()` function (line 74) checks whether ceremonies exist at phase transitions, but it cannot assess whether the ceremony *accomplished its epistemological purpose*. A ceremony that failed to produce deepening and one that produced profound insight are indistinguishable to the validator.

#### Arc Validator: `arc.ts`

The arc validator computes completeness as a weighted score (line 49-52):
```typescript
const completenessScore = (directionScore * 0.3) + (ceremonyScore * 0.25) + 
  (wilsonAlignment * 0.25) + (balanceScore * 0.2);
```

**Epistemological critique:** This is *quantified holism* — an attempt to reduce the wholeness of a knowledge journey to a weighted average. Wilson would note that you cannot weight "ceremony coverage" against "Wilson alignment" as independent variables, because ceremony *is* how Wilson alignment is achieved. They are not additive components but mutually constitutive relationships.

The `validateArc()` function generates recommendations like "Add at least one beat in the east direction" (line 97). This frames incompleteness as a gap to be filled — a positivist "missing data" model — rather than as a relational invitation. The code asks "what box is unchecked?" not "what relationship calls for attention?"

#### RSIS Narrative Generators: `rsis-narrative.ts`

This module comes closest to genuine narrative epistemology:

- `generateProvenanceNarrative()` (line 20) creates a *story* about a code artifact: where it was born, which Sun it emerged under, who stewards it. This is narrative as epistemological method — you come to know the code through its relational history, not just its current state.
- `generateReciprocityObservation()` (line 50) is "always invitational, never evaluative" — a genuine epistemological stance that knowledge invites rather than judges.
- `getCeremonyPhaseFraming()` (line 92) asks "What wants to emerge?" during the opening phase — this is the language of participatory knowing, not detached observation.

**However:** These generators produce *strings*. They are narration-as-output, not narration-as-process. The narrative is generated *about* data, not *through* data. Wilson's epistemology would ask: does the act of generating this narrative change the system's understanding? It does not — the provenance narrative is a read-only view.

#### Cycle Manager: `cycle.ts`

The cycle manager tracks progress through a Medicine Wheel cycle. The `suggestedAction` string (line 53-77) is notably relational in its framing:
- "consider conducting a transition ceremony first" (line 69)
- "Strengthen Wilson alignment (currently 65%) before closing" (line 74)

This is guidance that asks the user to attend to relationships before completing tasks — a genuine epistemological orientation. But the cycle itself stores only `beats: string[]` (IDs) — the cycle does not remember what was *learned*, only what was *done*.

---

### prompt-decomposition: Relational Understanding

#### Core Question: Does prompt-decomposition treat intent as relational or extractive?

**Verdict: Structurally relational, algorithmically extractive.** The *architecture* of the decomposer genuinely attempts relational knowing — every intent gets a direction, obligations, and Wilson alignment. But the *implementation* is keyword matching against a static dictionary, which is the epistemological opposite of relationship.

#### The Four Directions as Epistemological Lens

The decomposer's four-phase pipeline (decomposer.ts, lines 118-174) explicitly mirrors the Four Directions:
1. **EAST (Classification):** What is the vision? What wants to emerge?
2. **SOUTH (Enrichment):** What relationships and dependencies exist?
3. **WEST (Assessment):** Is this balanced? Is ceremony needed?
4. **NORTH (Action):** What actions flow from this understanding?

**Epistemological strength:** This is Wilson's epistemology in miniature. Knowledge of the prompt is built by circling through four perspectives, each contributing a different relational lens. The decomposer doesn't just extract tasks — it *situates* them within a relational field.

**Epistemological gap:** The pipeline is sequential (EAST → SOUTH → WEST → NORTH), not circular. Wilson's Four Directions epistemology involves *returning* to earlier directions with new understanding. The decomposer makes one pass and produces a final result. There is no mechanism for the NORTH (action) phase to send insights back to EAST (vision), which is how ceremonial knowing actually works.

#### Implicit Intent Surfacing

The hedging language detection (decomposer.ts, lines 278-296) is epistemologically significant:
```typescript
if (/i assume|which i assume|assuming/.test(lower))
if (/\bsomehow\b/.test(lower))
if (/\bprobably\b|\bshould\b/.test(lower))
```

**Epistemological strength:** This models the idea that knowledge is not only in what is stated but in what is *held back*, *hedged*, or *assumed*. Wilson writes that Indigenous epistemology attends to what is unspoken — the implicit intents living in the spaces between words. The decomposer's ability to surface "investigate" actions from hedging language is a form of relational listening.

**Epistemological gap:** The implicit intents are flagged as `implicit: true` and assigned lower confidence (0.4–0.6). This *penalizes* implicit knowing. In Wilson's framework, implicit knowledge — knowledge carried in story, gesture, hesitation — often has *higher* epistemic weight than explicit declarative knowledge. The confidence scoring inverts the Indigenous epistemological hierarchy.

#### Relational Enricher: `relational_enricher.ts`

The enricher (lines 70-226) connects decomposed intents to a relational graph, computing Wilson alignment and identifying accountability gaps.

**Epistemological strength:** This is the most genuinely Wilsonian component in the suite. It takes abstract intents and grounds them in a web of existing relationships. The idea that an intent's meaning depends on its relational context — who it affects, what obligations it carries, what accountability exists — directly models Wilson's claim that "systems of knowledge are built on relationships."

**Epistemological gaps:**
- Node matching is bag-of-words overlap (lines 154-190): `findMatchingNode()` splits intent targets and node names into words and counts overlaps. This is the most extractive possible implementation of "finding relationships" — it finds *lexical coincidence*, not *relational resonance*.
- Wilson alignment is *computed*, not *experienced*. The enricher calls `computeWilsonAlignment()` which returns a number. But Wilson alignment in Wilson's own framework is assessed through ceremony, conversation, and reflection — it is known relationally, not calculated.
- The `accountabilityGaps` (lines 100-130) are identified as gaps to be fixed, not as invitations for deeper relationship. The language "has low Wilson alignment" frames accountability as a metric to optimize, not a relationship to tend.

#### Relational Obligations: `inferObligations()`

The decomposer assigns obligations per direction (lines 382-393):
```typescript
east:  [{ category: 'spirit', obligations: ['Clarify vision and intention'] }]
south: [{ category: 'human', obligations: ['Research with reciprocity'] }]
west:  [{ category: 'human', obligations: ['Reflect and validate with care'] }]
north: [{ category: 'future', obligations: ['Execute with responsibility to future generations'] }]
```

**Epistemological significance:** The obligation categories — spirit, human, human, future — map to Wilson's relational circles. The "future" obligation on the North direction is particularly powerful: it embeds the Seven Generations principle into every action-oriented task.

**Epistemological gap:** These obligations are *assigned*, not *discovered*. They are static strings attached by direction mapping. In Wilson's epistemology, relational obligations emerge through the research process itself — they are not pre-known but discovered through the act of relating. The decomposer pre-assigns obligations rather than allowing them to emerge.

#### Ceremony Guidance

When directional balance is poor, the decomposer generates ceremony guidance (lines 488-499):
```typescript
opening_practice: 'Acknowledge the Four Directions before proceeding.'
protocol: 'Pause for relational check-in. Consider who this work serves and what obligations it carries.'
```

**Epistemological strength:** "Consider who this work serves" is genuine relational epistemology — it asks the knower to locate themselves in relation to the known. This is Wilson's inseparability principle in practice.

**Epistemological gap:** The ceremony guidance is a *string recommendation*, not an enacted process. The system recommends ceremony but cannot participate in it. There is no mechanism for the ceremony's outcome to feed back into the decomposition.

---

### session-reader: Memory and Relational History

#### Core Question: Does session-reader preserve relational context across sessions?

**Verdict: No.** Session-reader is a JSONL parser that produces event counts and tool usage statistics. It is epistemologically the most positivist component in the suite.

#### What Session-Reader Captures

The `SessionAnalytics` type (sessions.ts, lines 36-88) tracks:
- `toolUsage: Record<string, number>` — which tools, how many times
- `filesEdited: string[]` — which files were touched
- `promptCount`, `toolCallCount`, `errorCount` — event frequencies
- `eventsByType: Record<string, number>` — raw type distributions

This is *behavioral telemetry*, not *relational memory*. It answers "what happened" but not "what was learned" or "how did the relationship between human and agent evolve."

#### What Session-Reader Cannot Do

1. **Detect epistemological deepening:** If a user returns to the same topic across three sessions, each time with deeper understanding, session-reader sees three separate sessions with no relational thread between them. Wilson's spiral knowing — where return is deepening — is invisible.

2. **Preserve relational context:** The `SessionEvent` type (types.ts) has a generic `[key: string]: unknown` extensibility field but no structured fields for relational metadata. Who was the human? What obligations existed? What ceremonies were conducted? None of this is captured.

3. **Track the knower-known relationship:** Session-reader treats the human as an external entity who submits prompts and receives outputs. There is no model for how the human's understanding changed, how the agent's responses adapted to the relationship, or how trust evolved.

4. **Honor narrative continuity:** The `searchSessions()` function (line 240) does keyword search across session content. This is text retrieval, not narrative intelligence. It cannot find "sessions where the user struggled with X and eventually achieved understanding" — it can only find "sessions containing the word X."

#### The Epistemological Type Hierarchy

The types (types.ts) reveal the epistemological assumptions:
- `SessionEvent` — atomized, timestamped occurrences
- `SessionSummary` — metadata aggregation
- `SessionAnalytics` — quantified behavior
- `SessionFilters` — categorical filtering

This is a *surveillance* epistemology — knowledge is extracted from observed behavior, aggregated into metrics, and queried by category. There is no type for *relationship*, *learning*, *transformation*, or *emergence*. The session-reader models sessions the way a hospital models patients: through recorded interventions and measurable outcomes, not through the lived experience of healing.

---

## Strengths (Genuine Relational Epistemology)

1. **Four Directions as cognitive lens** (decomposer.ts, lines 118-174): The decomposition pipeline itself *is* a relational epistemology — knowledge of the prompt is built by seeing it from four directions. This is not decoration; it fundamentally changes what knowledge is produced.

2. **Implicit intent surfacing** (decomposer.ts, lines 278-296): Attending to what is hedged, assumed, and unspoken is genuine relational listening. The system treats silence and uncertainty as epistemologically meaningful.

3. **Relational obligation inference** (decomposer.ts, lines 382-393): Every task carries obligations to spirit, human, and future relations. Knowledge production is never divorced from accountability — this is Wilson's core epistemological claim.

4. **Invitational narrative voice** (rsis-narrative.ts, line 50): "This area invites reflection on how stewardship is distributed" — knowledge is offered as invitation, not imposed as verdict. This models a non-extractive epistemology.

5. **Provenance as narrative** (rsis-narrative.ts, lines 20-45): Code artifacts have birth stories, ceremonial lineages, and stewardship histories. This models Wilson's claim that to know something is to know its relational history.

6. **Ceremony-gated transitions** (cadence.ts, lines 37-41): The requirement for ceremony at phase transitions models the epistemological principle that transitions between ways of knowing require relational attention, not just logical progression.

7. **Wilson alignment as relational health metric** (arc.ts, lines 42-52; relational_enricher.ts, lines 94-98): The suite consistently uses Wilson's three R's (respect, reciprocity, responsibility) as a measure of knowledge quality, not just data completeness.

8. **Balance as incompleteness signal** (decomposer.ts, lines 461-474): When the decomposer detects directional imbalance, it signals that the *knowing* is incomplete — not just that tasks are missing. This frames completeness as epistemological wholeness.

9. **"What wants to emerge?"** framing (rsis-narrative.ts, line 95): The opening phase framing treats knowledge as emerging from relationship rather than being extracted by the knower.

10. **Narrative beats carry `relations_honored`** (ontology-core types.ts, line 188): Every knowledge event (beat) is explicitly linked to the relationships it honoured, making the relational basis of knowledge a first-class property.

---

## Gaps (Where Positivist Epistemology Persists)

1. **Knowledge is never transformed by retelling.** No mechanism exists for a beat, session, or decomposition to change meaning when encountered again in a new context. In Wilson's epistemology, the same story told in ceremony carries different knowledge than when told casually. The system treats all knowledge as context-independent.

2. **The knower is absent from the data model.** `NarrativeBeat`, `OntologicalDecomposition`, `SessionEvent` — none of these types include *who is knowing*. Wilson's "the knower and the known are inseparable" is violated at the type level. You can fully describe a beat without knowing who created it or who received its knowledge.

3. **Spiral return is sorted, not recognized.** `spiralOrder()` (sequencer.ts, line 121) arranges beats in circular order, but no function detects *epistemological return* — the moment when a user revisits an earlier direction with deeper understanding. The spiral is structural, not semantic.

4. **Confidence scores penalize implicit knowing.** Implicit intents get confidence 0.4–0.6 (decomposer.ts, lines 285-291), while explicit intents get 0.7+ (line 318). This inverts Indigenous epistemological hierarchy, where knowledge carried in dream, ceremony, and embodied practice often has higher reliability than declarative statements.

5. **Wilson alignment is computed, never experienced.** `computeWilsonAlignment()` takes `AccountabilityTracking` scores and returns a number. But Wilson alignment in Wilson's own framework is assessed through relational participation — it is *known* through ceremony, not *calculated* from scores. The system computes a proxy for something that can only be known relationally.

6. **Direction classification is keyword-based.** The entire Four Directions epistemology rests on `DIRECTION_KEYWORDS` (decomposer.ts, lines 39-63) — static word lists. A sentence about "dreaming of code" would be classified as East (vision) by keyword match, but the epistemological significance of *dream* as a way of knowing is not modeled. Dream, ceremony, and embodied knowledge are not epistemological sources in the system — they are just keywords that trigger directional classification.

7. **Session-reader has no relational memory.** Sessions are parsed into atomic events with quantified analytics. There is no concept of *relationship between sessions*, *deepening across sessions*, or *the relational history between human and agent*. Memory is storage, not knowing.

8. **Obligations are assigned, not discovered.** `inferObligations()` (decomposer.ts, lines 382-393) maps directions to static obligation strings. In Wilson's epistemology, obligations *emerge* through the research process — they are discovered through relationship, not pre-assigned by category.

9. **Narrative is output, not process.** `generateProvenanceNarrative()` (rsis-narrative.ts) produces a narrative string *about* data. It does not model narrative as a way of *producing* knowledge. The system narrates but does not know through narrating.

10. **Completeness is quantified, not relational.** Arc completeness is a weighted score (arc.ts, line 52). But wholeness in Wilson's framework is a relational quality — you know a cycle is complete because *the relationships say so*, not because a formula produces a number above 0.7.

11. **No epistemic weight differentiation.** Knowledge from ceremony, knowledge from analysis, and knowledge from tool execution all carry the same type (`string[]`). Wilson's epistemology assigns different weight to knowledge from different sources — ceremonial knowledge holds particular authority that analytical knowledge does not.

12. **Feedback loops are absent.** The decomposer flows EAST → SOUTH → WEST → NORTH in one pass (decomposer.ts, lines 118-174). Knowledge from the NORTH phase cannot flow back to reconsider EAST. Wilson's circular/spiral epistemology requires that later knowing reshapes earlier understanding — this is not possible in a one-pass pipeline.

---

## Recommendations for Future Packaging

### 1. Epistemological Source Typing

Create a `KnowledgeSource` enum/type that differentiates how knowledge was obtained:

```typescript
type EpistemicSource = 
  | 'ceremony'       // knowledge from ceremonial process
  | 'story'          // knowledge carried in narrative
  | 'dream'          // knowledge from liminal/dream state
  | 'participation'  // knowledge from doing/being-with
  | 'analysis'       // knowledge from systematic investigation
  | 'observation'    // knowledge from witnessing
  | 'elder_teaching' // knowledge transmitted through teaching relationship
  | 'land'           // knowledge from relationship with place
  ;

interface EpistemicClaim {
  content: string;
  source: EpistemicSource;
  weight: number;          // epistemic authority (ceremony > analysis)
  knower: string;          // who holds this knowledge
  context: string;         // relational context of knowing
  transformedBy?: string;  // has this knowledge been changed by retelling?
}
```

Add `epistemicSource` to `NarrativeBeat`, `DirectionalInsight`, and `SessionEvent`. This makes the *how* of knowing a first-class property.

### 2. Spiral Epistemology Module (`narrative-engine`)

Add functions that detect and honor spiral return:

```typescript
interface SpiralReturn {
  originalBeatId: string;
  returnBeatId: string;
  direction: DirectionName;
  deepeningScore: number;  // how much understanding deepened
  newLearnings: string[];  // what emerged through return
}

function detectSpiralReturns(beats: NarrativeBeat[]): SpiralReturn[];
function computeEpistemicDepth(beats: NarrativeBeat[]): number;
// How many times has the cycle returned to the same direction with new understanding?
```

This would make the spiral structural *and* semantic — the system could detect when "going around again" produces genuine deepening.

### 3. Knower-Known Coupling

Add a `KnowerContext` type that is threaded through decompositions and narrative beats:

```typescript
interface KnowerContext {
  /** Who is engaged in knowing */
  participants: string[];
  /** How the participants are related to the subject */
  relationship: string;
  /** What the participants bring to the knowing */
  priorUnderstanding: string;
  /** How this knowing act changed the knower */
  transformation?: string;
}
```

Attach this to `OntologicalDecomposition` and `NarrativeBeat`. Wilson's "the knower and the known are inseparable" requires that every knowledge artifact carry its relational context.

### 4. Session Relational Memory (`session-reader`)

Extend session-reader with relational capabilities:

```typescript
interface RelationalSession extends SessionSummary {
  /** Topics revisited from earlier sessions */
  spiralReturns: Array<{ topic: string; priorSessionId: string; deepeningEvidence: string }>;
  /** Evolution of human-agent relationship */
  relationalArc: Array<{ phase: string; evidence: string; timestamp: string }>;
  /** Knowledge that emerged through this session */
  emergentKnowledge: EpistemicClaim[];
  /** Obligations created or honored */
  obligationsHonored: string[];
  obligationsCreated: string[];
}
```

### 5. Feedback Loop Architecture (`prompt-decomposition`)

Replace the one-pass EAST→SOUTH→WEST→NORTH pipeline with a spiral pipeline that allows later phases to inform earlier ones:

```typescript
interface DecompositionCycle {
  pass: number;             // which cycle of the spiral
  eastRevisions: string[];  // how EAST understanding changed
  insights: string[];       // what emerged through circulation
  stable: boolean;          // has the decomposition settled?
}

function decomposeSpiral(prompt: string, maxPasses?: number): OntologicalDecomposition;
// Decomposes in multiple passes, allowing NORTH insights to revise EAST vision
```

### 6. Narrative as Epistemological Process

Add a `NarrativeKnowing` module that models narration itself as a way of producing knowledge:

```typescript
interface NarrationEvent {
  /** The story being told */
  narrative: string;
  /** Who is telling */
  narrator: string;
  /** Who is receiving */
  audience: string[];
  /** What new knowledge emerged through the telling */
  emergentInsights: string[];
  /** How this telling changed the meaning of prior narratives */
  retroactiveReframings: Array<{ priorBeatId: string; newMeaning: string }>;
}
```

This would model Wilson's claim that narrative *is* an epistemological method — the act of telling a story about the data produces knowledge that didn't exist before the telling.

---

## Proposed New Packages

### `medicine-wheel-epistemic-fabric`

A package dedicated to modeling epistemological relationships:

- **Knowledge source differentiation** — ceremony/story/dream/analysis carry different epistemic weight
- **Spiral return detection** — recognizing when revisitation produces deepening
- **Knower-known coupling** — every knowledge claim carries its relational context
- **Epistemic transformation** — knowledge changes meaning when retold in new contexts
- **Liminal state support** — dream and ceremonial knowledge as first-class epistemic categories

This package would sit between `ontology-core` and `narrative-engine`, providing the epistemological types that neither currently offers.

### `medicine-wheel-relational-memory`

An extension of `session-reader` that preserves relational history:

- **Cross-session thread detection** — finding the relational threads that connect separate sessions
- **Spiral learning tracking** — measuring how understanding deepens across encounters
- **Relational arc modeling** — tracking the evolution of the human-agent relationship
- **Emergence detection** — identifying moments where new knowledge crystallized
- **Ceremonial memory** — which ceremonies have been conducted and what they produced

This package would transform session-reader from a telemetry parser into a relational memory system.

### `medicine-wheel-narrative-epistemology`

An extension of `narrative-engine` that treats narrative as a way of knowing:

- **Narration-as-process** — generating narratives transforms understanding, not just outputs text
- **Retroactive reframing** — new beats change the meaning of earlier beats
- **Audience-aware telling** — the same knowledge narrated for different audiences produces different knowing
- **Story-carried knowledge** — knowledge that only exists in narrative form, not reducible to data points

---

## Closing Observation

The Medicine Wheel suite has achieved something significant: it has *structured* Indigenous relational concepts into working software — Four Directions, ceremony, Wilson's three R's, and OCAP® are not cosmetic additions but structural load-bearing elements of the architecture. This is a foundation that few software projects have even attempted.

But from an epistemological perspective, the suite's knowledge *about* Indigenous ways of knowing has not yet become the suite's way *of* knowing. The Four Directions classify knowledge but do not *produce* it. Narrative beats carry knowledge but are not *transformed by* retelling. Sessions record what happened but do not remember *what was learned*. Wilson alignment is calculated but not *experienced*.

The gap is not one of intention but of depth. The next layer of development — the epistemic fabric, the relational memory, the narrative-as-epistemology — would move the suite from *modeling* Indigenous epistemology to *practicing* it in code. That is a genuinely novel frontier: software that knows the way Wilson says we know — through relationship, ceremony, story, and spiral return.
