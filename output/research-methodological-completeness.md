# Research: Methodological Completeness — Wilson × Medicine Wheel System

> **Analyst:** Methodological Completeness Agent  
> **Date:** 2026-03-14  
> **Scope:** System-level ceremony flow analysis — does the suite enable "research IS ceremony"?  
> **Framework:** Shawn Wilson, *Research Is Ceremony: Indigenous Research Methods* (2008)  
> **Boundary:** Process and flow across the entire system. Not analyzing individual data types (ontology), ways of knowing (epistemology), or accountability enforcement (axiology).

---

## Executive Summary

- **The system has genuine ceremonial architecture** — four-phase progression (opening → council → integration → closure) is structurally embedded in ceremony-protocol, narrative-engine cadence, and cycle management, not bolted on as labels.
- **Stage-setting exists but is passive** — there is no active ceremony-opening ritual, no threshold moment where participants "step beyond the everyday." A cycle begins with `createCycle()` and a research question, which is procedural, not ceremonial.
- **Spiral/circular progression is architecturally supported but linearly rendered** — the sequencer enforces E→S→W→N directional coverage, the cadence system validates phase completeness, and `suggestNextBeat()` restarts at East after all directions are visited. However, the UI renders this as a linear progress bar (0% → 100%), not a spiral.
- **Transformation is measured but not enacted** — Wilson alignment, OCAP compliance, and arc completeness are computed, but the system never asks "How have you changed?" There is no participant reflection mechanism, no before/after self-assessment, no closing integration of transformation.
- **The system is a ceremony-informed workflow rather than a workflow that IS ceremony** — the deep insight of Wilson's methodology (that the process itself transforms the researcher) is acknowledged in the architecture but not yet realized in the lived user experience.

---

## Full Ceremony Flow Analysis

### Opening Phase

**Wilson says:** "An integral part of any ceremony is setting the stage properly. Everyone who is participating needs to be ready to step beyond the everyday."

**What the system provides:**

1. **Cycle creation** (`cycle.ts:createCycle()`) initializes at East/opening with an empty beat array and a research question. This is the entry point.
2. **Phase framing** (`ceremony-protocol/index.ts:getPhaseFraming('opening')`) returns: *"Opening Phase — What wants to emerge? Focus on intention and vision."*
3. **Ceremony logging** (UI: `ceremonies/page.tsx`) allows users to log an opening ceremony with participants, medicines, intentions, and research context.
4. **Prompt decomposition** (`decomposer.ts`) classifies the initial prompt through the Four Directions, surfacing which perspectives are present and which are neglected.
5. **Direction Panel** (`direction-panel.tsx`) displays medicines, teachings, and practices for each direction — providing educational stage-setting.
6. **Ceremony-phase banner** (ceremonies page) displays: *"🔥 We are in the Opening phase — setting intentions and acknowledging relationships"*

**Assessment — Partial:**

The *infrastructure* for opening exists. You can create a cycle, log a ceremony, set intentions, and the system frames everything as "opening." But there is no **active threshold** — no moment where the system requires or guides participants to:
- Acknowledge whose land they are on
- Name the relations they bring to this inquiry
- State their obligations before proceeding
- Perform an actual opening practice (the `opening_practice` field in `CeremonyGuidance` is generated but never surfaced to the user)

The opening is *available* but not *enacted*. A user can skip directly to adding beats without any ceremony. The `STANDARD_CADENCE` requires ceremony at opening (`requiresCeremony: true`), but this is only validated after the fact, not enforced as a gate.

**Wilson gap:** "The specific rituals that make up the ceremony are designed to get participants into a state of mind that will allow for the extraordinary to take place." The system does not create a state shift — it creates a data structure.

---

### Council/Deepening Phase

**Wilson says:** All participants are co-researchers. Circling and repetition equal deepening, not redundancy.

**What the system provides:**

1. **South direction / deepening cadence** (`cadence.ts`) maps South to "deepening" with ceremony requirements.
2. **Narrative beats in South** carry direction-specific obligations: `'Research with reciprocity'` (from `decomposer.ts:inferObligations()`).
3. **Beat insertion** (`sequencer.ts:insertBeat()`) allows multiple beats per direction, with `maxBeatsPerDirection: 12` — supporting repeated engagement.
4. **Spiral ordering** (`sequencer.ts:spiralOrder()`) reorders beats E→S→W→N within each act — structurally supporting spiral progression.
5. **Transition detection** (`cadence.ts:detectTransitions()`) identifies when direction changes occur.
6. **Beat view modes** (UI: `narrative/beats/page.tsx`) offers both "Timeline" and "By Direction" views — supporting both chronological and spatial understanding.
7. **Relational web** (UI: `relations/page.tsx`) provides a graph visualization where nodes are positioned by direction and edges show ceremony-honored vs. unceremonied relationships.
8. **Talking circle ceremony type** is one of the five ceremony types available (`talking_circle`), directly modeling council.

**Assessment — Structurally strong, experientially thin:**

The council/deepening phase has the richest infrastructure. The beat system supports multiple passes through the same direction (circling). The relational web allows participants to see connections. The talking circle ceremony type exists.

However:
- **No multi-participant council** — the system models `participants` as a string array on ceremony logs, but there is no mechanism for multiple users to contribute beats, share perspectives, or engage in dialogue. The "co-researcher" model is data, not interaction.
- **No cross-perspective synthesis** — when beats accumulate in different directions, there is no mechanism to juxtapose them, no "what does the East perspective say to the North perspective?" moment.
- **Deepening is additive, not recursive** — you add more beats, but the system doesn't prompt you to revisit earlier beats in light of new ones. Wilson's "circling back" is supported structurally (spiral ordering) but not experientially (no system prompts for revisitation).

---

### Integration Phase

**Wilson says:** Ceremony weaves all participants' contributions together. The methodology must honor ontology, epistemology, and axiology simultaneously.

**What the system provides:**

1. **West direction / integrating cadence** — mapped to "Integration Phase — Weaving insights into synthesis artifacts."
2. **Arc validation** (`arc.ts:validateArc()`) checks completeness across all four dimensions: direction coverage (30%), ceremony coverage (25%), Wilson alignment (25%), and balance (20%).
3. **RSIS narrative generators** (`rsis-narrative.ts`) produce provenance narratives, reciprocity observations, and directional balance observations — synthesis in narrative form.
4. **Accountability audit** (`audit.ts:auditAccountability()`) generates a composite report of OCAP compliance, Wilson alignment, direction coverage, ceremony honoring, and outstanding obligations.
5. **Direction observation** (`rsis-narrative.ts:generateDirectionObservation()`) identifies dominant and neglected directions, suggesting rebalancing.
6. **Accountability page** (UI) shows composite metrics: relations mapped, ceremonies logged, beats counted, relations ceremonied.

**Assessment — Metrics-heavy, synthesis-absent:**

Integration is the system's weakest phase. The system can *measure* completeness but cannot *perform* integration. Specifically:

- **No synthesis artifact creation** — the phase framing says "Weaving insights into synthesis artifacts" but there is no tool, template, or guided process for creating a synthesis document, a woven narrative, or an integrated finding.
- **Arc validation is diagnostic, not generative** — it tells you what's missing, not what the whole means.
- **No cross-directional weaving** — beats from East, South, West, and North are displayed in their separate columns or as a flat timeline. There is no mechanism that brings them into relationship with each other.
- **The RSIS narratives are beautiful but disconnected** — `generateProvenanceNarrative()` and `generateReciprocityObservation()` produce ceremony-aware text, but they're not woven into the user's research journey. They describe code artifacts, not research findings.
- **No "what did we learn together?" moment** — Wilson's integration is where the extraordinary is named. The system computes `completenessScore` but never asks the researcher to articulate their integrated understanding.

---

### Closure Phase

**Wilson says:** "If research doesn't change you as a person, then you haven't done it right." Ceremony must close with reciprocity and transformation.

**What the system provides:**

1. **North direction / closing cadence** — mapped to "Closure Phase — Reciprocity summaries and seeding observations."
2. **Cycle progress** (`cycle.ts:computeProgress()`) suggests: *"All directions visited — the cycle is ready to close"* when all four directions have beats.
3. **Cadence validation** checks that ceremony was conducted at closing (`STANDARD_CADENCE` requires it).
4. **Reciprocity observation** (`rsis-narrative.ts:generateReciprocityObservation()`) generates invitational text about stewardship distribution.
5. **suggestNextBeat()** returns `{ direction: 'east', act: 1 }` after all directions are visited — seeding the next cycle.

**Assessment — Architecturally suggested, experientially absent:**

Closure is the system's most critical gap. The cycle can be "ready to close" but there is:

- **No closing ceremony** — no guided process for completing a research cycle. The system says the cycle is ready to close but doesn't facilitate closure.
- **No transformation tracking** — Wilson's litmus test ("if research doesn't change you as a person") has no corresponding mechanism. The system tracks `wilson_alignment` as a metric on relations, not as a measure of researcher transformation.
- **No reciprocity enactment** — reciprocity observations are generated but there is no mechanism for the researcher to enact reciprocity: giving back to the community, sharing findings with participants, honoring obligations.
- **No "seeding" for the next cycle** — `suggestNextBeat()` mechanically restarts at East, but there is no carrying forward of learnings, no "what does this cycle gift to the next?"
- **No end_date is ever set** — `CeremonyState.endDate` exists as an optional field but is never populated by any code path.
- **Cycles have no status field** — there is no way to mark a cycle as "complete" vs "active." There is no archival, no ceremony of completion.

---

## System-Level Assessment

### Ceremony as Process (vs. Workflow)

**Verdict: Ceremony-informed workflow, not yet ceremony.**

The system's architecture is genuinely ceremony-shaped. The four-phase progression is not arbitrary — it maps directly to Wilson's methodology via the Four Directions, with ceremony requirements at transitions. The cadence system (`STANDARD_CADENCE`) requires ceremony at every phase boundary. The phase framing provides ceremony-aware context.

However, the *lived experience* is a workflow manager with ceremonial vocabulary:

| Ceremony quality | System support |
|---|---|
| **Sacred space** — separation from the everyday | ❌ No threshold mechanism |
| **Intentionality** — explicit purpose-setting | ✅ Research question + intentions on ceremonies |
| **Participation** — all present are changed | ❌ Single-user data entry, no multi-participant flow |
| **Emergence** — the unexpected can arise | ❌ No generative mechanisms, only measurement |
| **Completion** — something is different after | ❌ No transformation tracking |

The critical distinction: Wilson's ceremony is *transformative*. The system's ceremony is *informational*. Beats, ceremonies, and cycles are logged and measured, but the system never facilitates the *interior work* that makes ceremony sacred.

### Participant as Co-Researcher

**Verdict: User-as-operator model.**

The system models a single operator managing data:

- **Ceremony logs** record `participants: string[]` but participants cannot contribute their own perspectives.
- **Beats** are created by one user through a form. There is no collaborative beat creation.
- **The relational web** models relationships between entities (Elder Sarah, Youth Circle, Sacred River) but not between human researchers.
- **No roles** — there is no elder, no firekeeper, no youth voice in the system. The governance config defines `authority: ['elder', 'firekeeper']` but there is no user/role system to enact this.
- **OCAP® principles** are modeled as data fields on relations, not as actual access control between human participants.

Wilson: "All participants are co-researchers, not subjects/objects." The system treats participants as data points on ceremony logs, not as co-creators of the research journey.

### Spiral/Circular Progression

**Verdict: Structurally supported, visually undermined.**

**Strengths:**
- `spiralOrder()` reorders beats E→S→W→N within each act — true spiral structure
- `suggestNextBeat()` restarts at East after completion — supporting multiple cycles
- `maxBeatsPerDirection: 12` allows repeated engagement
- `validateCadence()` tracks phases completed and remaining, not just a binary done/not-done
- Beats can be added in any direction at any time (when `enforceDirectionOrder: false`, the default)

**Weaknesses:**
- The UI renders progress as a **linear gradient bar** (0% → 100%) on cycles page
- Direction coverage is shown as ✓/○ checkmarks — binary, not spiral
- No visual representation of multiple cycles or spiraling back
- The "By Direction" view (`beats/page.tsx`) shows four columns, not a wheel
- The home page SVG is a static wheel — it doesn't reflect the researcher's journey

The system's *data model* supports spirals (multiple acts, repeated directions, cycle restart). The system's *visual language* communicates linearity (progress bars, checkmarks, timelines).

### Emergence and Transformation

**Verdict: Not supported.**

Wilson's "extraordinary" — the moments where ceremony enables insight that transcends individual understanding — has no mechanism in the system:

- **No generative prompts** — the system never asks questions that could trigger emergence ("What surprised you?" "What pattern do you see across these beats?" "What wants to be said that hasn't been said?")
- **No synthesis engine** — there is no mechanism that combines beats, ceremonies, and relations into emergent findings
- **No "aha" capture** — the `learnings` array on beats is user-entered text, not system-facilitated insight
- **No transformation measure** — nowhere in the system is the researcher's own transformation tracked, prompted, or honored
- **No collaborative emergence** — without multi-participant support, there is no "we" to discover something together

The `ceremonyGuidance` field in decomposition results includes `opening_practice` and `protocol` strings, but these are never surfaced in the UI. The system generates ceremony recommendations that no one sees.

### Structural Tension Integration

**Verdict: Well-conceived, partially realized.**

Wilson's structural tension (Germination → Assimilation → Completion) maps to the system's spec as:

| Wilson phase | System mapping | Implementation |
|---|---|---|
| **Germination** — Vision + honest current reality | East direction + prompt decomposition | ✅ Strong. `createCycle()` captures the research question. `decompose()` surfaces the current reality (neglected directions, ambiguities, implicit intents). Balance scoring gives honest assessment. |
| **Assimilation** — Building momentum through ritualized action | South + West + cadence progression | ⚠️ Partial. Beat accumulation and cadence validation create momentum. Ceremony requirements at transitions ritualize the process. But there's no momentum *feeling* — no acceleration, no building energy, no deepening engagement. |
| **Completion** — Integration and transformation | North + arc completion | ❌ Weak. `computeCompleteness()` returns a score but completion as *transformation* is absent. "All directions visited — the cycle is ready to close" is a status report, not a completion ceremony. |

The structural tension between "flat to-do lists (Western task management) and Four Directions awareness" (spec language) is genuinely resolved in the decomposer, which transforms flat prompts into directionally-classified, ceremony-aware work plans. This is the system's strongest methodology contribution.

---

## Strengths

### 1. Four-Phase Architecture Is Genuine
The opening → council → integration → closure progression is not superficial labeling. It is:
- Encoded in the ceremony-protocol phase transitions
- Enforced by cadence validation rules
- Mapped to the Four Directions with cultural grounding (Ojibwe names, seasons, medicines)
- Carried through from spec to implementation consistently

### 2. Ceremony-Gated Transitions
`STANDARD_CADENCE` requires ceremony at every phase boundary. `detectTransitions()` tracks when direction changes occur. `computeProgress()` checks whether transitions were ceremonied and suggests ceremony if not. This is genuine methodological structure.

### 3. Relational Accountability Is Woven Through
Wilson alignment scoring, OCAP compliance checking, and obligation tracking are not afterthoughts — they are computed in arc validation, cycle progress, and accountability audit. The `invitational, never evaluative` language in reciprocity observations (`rsis-narrative.ts:50`) demonstrates genuine understanding of relational ethics.

### 4. Prompt Decomposition as Ceremony Entry
The `MedicineWheelDecomposer` is the strongest methodological tool. It takes a raw prompt and surfaces:
- Which directions are present and neglected
- Implicit intents hidden in hedging language
- Relational obligations each task carries
- Whether ceremony is needed before proceeding
- Narrative beats for the narrative engine

This is genuinely "research as ceremony" — the act of decomposing a prompt becomes a ceremony of seeing what is present and what is missing.

### 5. Non-Coercive Governance
Governance checks "inform, they don't prevent; respect for human agency" (spec language). `formatGovernanceWarning()` surfaces requirements but doesn't block. This respects Indigenous governance models where authority is relational, not hierarchical.

### 6. Directional Balance as Wholeness Metric
The balance scoring (`assessBalance()` in decomposer, `computeBalance()` in arc validation) measures whether all four directions are attended to. A cycle with all beats in North (action) scores poorly, nudging researchers toward vision (East), analysis (South), and reflection (West). This is genuine Medicine Wheel methodology.

---

## Gaps

### 1. No Active Ceremony Facilitation
**The fundamental gap.** The system tracks ceremonies but doesn't facilitate them. There is:
- No guided opening practice
- No talking circle protocol
- No closing ritual
- No threshold moment
- No facilitation of what happens *inside* ceremony

The system is a ceremony *logbook*, not a ceremony *space*.

### 2. No Multi-Participant Support
Wilson's methodology requires co-researchers. The system has:
- No user/role system
- No collaborative beat creation
- No multi-perspective council
- No shared governance
- `participants` as a comma-separated text field, not actual user accounts

### 3. No Transformation Tracking
Wilson's test: "If research doesn't change you as a person, then you haven't done it right." There is:
- No before/after self-assessment
- No reflection prompts
- No "what changed for you?" mechanism
- No personal growth narrative arc alongside the research arc

### 4. No Synthesis/Integration Tools
The Integration phase has metrics but no generative tools:
- No cross-directional synthesis view
- No emergent pattern detection
- No integrated findings template
- No "weaving" mechanism that connects beats from different directions

### 5. Linear Visual Language
Despite circular data architecture:
- Progress bars instead of spirals
- Checkmarks instead of cycle indicators
- Flat timelines instead of Medicine Wheel progression views
- No visual representation of multiple cycles

### 6. No Cycle Completion or Archival
- No `status` field on cycles (active/complete/archived)
- `endDate` field exists but is never set
- No ceremony of completion
- No "seeding" mechanism for the next cycle
- No way to carry forward learnings

### 7. Ceremony Guidance Is Generated But Not Surfaced
`generateCeremonyGuidance()` in the decomposer produces `opening_practice`, `intention`, and `protocol` fields. The `getCeremonyPhaseFraming()` generates phase-aware context. But neither is rendered in the web UI. The ceremonies page has a phase banner but it's a static string, not connected to the actual decomposition guidance.

### 8. No Relational Inquiry Flow
The system supports logging ceremonies and beats separately, but there is no guided flow that moves a researcher through:
1. Open ceremony → 2. Set intentions → 3. Engage directions → 4. Conduct council → 5. Weave findings → 6. Close with reciprocity

Each page is independent. There is no journey.

---

## Recommendations for Future Packaging

### System-Level Changes

1. **Implement a Ceremony Facilitator service** — an orchestration layer that guides researchers through the full ceremony flow, surfacing prompts, reflections, and ceremony guidance at appropriate moments. This should be the primary user experience, not the individual CRUD pages.

2. **Add cycle lifecycle management** — status field (active/deepening/integrating/closing/complete), endDate population, archival, and a closure ceremony that requires reflection before marking complete.

3. **Surface ceremony guidance in the UI** — the decomposer generates `CeremonyGuidance` with `opening_practice`, `intention`, and `protocol`. These should be rendered prominently, not buried in decomposition results.

4. **Replace linear progress indicators with spiral/circular visualizations** — the home page Medicine Wheel SVG should reflect the researcher's actual journey, lighting up directions as they are visited and showing multiple cycle spirals.

### Inter-Package Ceremony Orchestration

5. **Create a ceremony flow that chains packages** — Currently, ceremony-protocol, narrative-engine, and prompt-decomposition operate independently. A ceremony orchestrator should chain:
   - `decompose(prompt)` → surface neglected directions → `getPhaseFraming()` → ceremony guidance → beat creation → cadence validation → arc completion → closure

6. **Bridge the narrative-engine to the UI** — `buildTimeline()`, `actStrip()`, and `spiralOrder()` produce rich visualization-ready data that is not used by any UI component. The beats page manually groups by direction instead of using the narrative-engine's grouping.

7. **Connect RSIS narratives to the user journey** — `generateDirectionObservation()` and `generateReciprocityObservation()` should be called on the narrative page to provide ceremony-aware commentary on the researcher's progress.

### New Packages for Ceremony Completeness

8. **Add a `medicine-wheel-ceremony-facilitator` package** (see below) that provides guided ceremony flows.

9. **Add reflection/transformation tracking** — either as part of ceremony-facilitator or as a `medicine-wheel-reflection` package that captures researcher transformation.

10. **Add multi-participant support** — either as a `medicine-wheel-council` package or as an extension to ceremony-protocol with role-based participation.

---

## Proposed New Packages

### 1. `medicine-wheel-ceremony-facilitator`

**Purpose:** Active ceremony facilitation — transforms the system from a ceremony logbook into a ceremony space.

**Core capabilities:**
- **Guided ceremony flows** — step-by-step facilitation of opening, council, integration, and closure ceremonies
- **Threshold mechanisms** — active prompts that shift the researcher's state of mind ("Before we begin, let us acknowledge...")
- **Reflection prompts** — direction-specific questions surfaced at appropriate moments ("What wants to emerge from the East?" "What has the South shown you?")
- **Closing rituals** — guided completion ceremonies with reciprocity enactment ("Who does this work serve? What will you give back?")
- **Transformation capture** — before/after self-assessments that honor Wilson's test

**Depends on:** ceremony-protocol, narrative-engine, prompt-decomposition

**Key types:**
```typescript
interface CeremonyFlow {
  id: string;
  cycleId: string;
  phase: CeremonyPhase;
  steps: CeremonyStep[];
  currentStep: number;
  reflections: Reflection[];
}

interface CeremonyStep {
  type: 'acknowledgment' | 'intention' | 'reflection' | 'offering' | 'integration' | 'closing';
  prompt: string;
  response?: string;
  direction?: DirectionName;
  required: boolean;
}

interface Reflection {
  direction: DirectionName;
  phase: CeremonyPhase;
  prompt: string;
  response: string;
  timestamp: string;
}
```

### 2. `medicine-wheel-council`

**Purpose:** Multi-participant support — transforms the system from single-user to co-researcher model.

**Core capabilities:**
- **Participant roles** — elder, firekeeper, youth voice, knowledge keeper, with directional affinities
- **Collaborative beat creation** — multiple participants contributing beats to a shared cycle
- **Talking circle protocol** — structured multi-voice conversation with direction-based turn-taking
- **Shared governance** — OCAP® enforcement with actual role-based access control
- **Council synthesis** — weaving multiple perspectives into shared understanding

**Depends on:** ceremony-protocol, ontology-core

### 3. `medicine-wheel-synthesis`

**Purpose:** Integration/weaving tools — fills the gap in the Integration phase.

**Core capabilities:**
- **Cross-directional synthesis** — bringing beats from different directions into dialogue
- **Emergent pattern detection** — identifying themes that appear across directions
- **Synthesis artifact generation** — guided creation of integrated findings documents
- **Spiral review** — prompting researchers to revisit earlier beats in light of later ones
- **Visual weaving** — representing how insights from different directions connect

**Depends on:** narrative-engine, ontology-core

---

## Conclusion

The Medicine Wheel developer suite has **genuine ceremonial architecture** — the Four Directions mapping, cadence validation, ceremony-gated transitions, and Wilson alignment scoring are not superficial labeling but structurally embedded methodology. The prompt decomposer is genuinely transformative as a tool, and the relational accountability woven through all layers reflects deep engagement with Wilson's framework.

However, the system currently enables **research with ceremony-themed infrastructure** rather than **research AS ceremony**. The distinction is between:

- **Current:** "Log a ceremony. Add beats. Check completeness score. Done."
- **Wilson's vision:** "Enter sacred space. Set intentions together. Engage with what emerges. Weave understanding. Be transformed. Close with reciprocity. Carry the gifts forward."

The path from here to there requires three shifts:

1. **From logging to facilitating** — the system should guide ceremony, not just record it
2. **From single-user to co-researcher** — ceremony is collective, not individual
3. **From measurement to transformation** — completeness scores should be invitations, not grades

The architectural foundation is sound. The data models are ceremony-ready. What's needed is the **experiential layer** — the part that creates the threshold, holds the space, and asks: "How have you changed?"
