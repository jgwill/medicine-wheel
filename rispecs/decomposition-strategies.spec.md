# decomposition-strategies — RISE Specification

> Companion capability spec for `@medicine-wheel/prompt-decomposition`. Defines a strategy framework that lets a single prompt be decomposed through several complementary approaches — a fast deterministic foundation, multi-pass LLM elaboration, and dual-framing reconciliation — each producing the same ontology-enriched decomposition shape.

**Version:** 0.1.0  
**Package:** `@medicine-wheel/prompt-decomposition` (capability layer)  
**Document ID:** rispec-decomposition-strategies-v1  
**Last Updated:** 2026-06-04  
**Companion of:** [`prompt-decomposition.spec.md`](./prompt-decomposition.spec.md)

---

## Desired Outcome

Users create **ontologically grounded decompositions whose depth they choose** — selecting, per prompt, how much elaboration the decomposition deserves:

- A **deterministic foundation** that classifies any prompt across the Four Directions instantly, with no external model and fully reproducible output.
- A **multi-pass elaboration** that progressively deepens a decomposition through sequential, intent-building passes when a prompt carries many interleaved concerns.
- A **dual-framing reconciliation** that surfaces blind spots by composing an open framing and a questioning framing into one confidence-aware decomposition.

Every strategy yields the same enriched decomposition shape, so anything downstream (narrative beats, relational enrichment, ceremony guidance) reads the result identically regardless of how deeply it was created.

---

## Creative Intent

**What this enables:** A decomposition becomes a *dial*, not a fixed routine. A focused prompt resolves on the deterministic foundation in milliseconds. A sprawling, ambiguous prompt advances through elaboration passes or dual framings that draw out secondary intents, dependency ordering, and ambiguity flags the foundation alone would leave implicit. The depth of attention matches the weight of the prompt.

**Structural Tension:**
- **Current Reality:** A prompt can be classified once, quickly and deterministically, across the Four Directions — but a single deterministic reading leaves deeper intents, dependency chains, and hidden assumptions only partially surfaced for complex or ambiguous prompts.
- **Desired Outcome:** The same prompt advances to whatever depth it warrants, through complementary strategies that each emit the identical enriched decomposition shape.
- **Natural Resolution:** A strategy selector lets the depth of decomposition rise to meet the complexity of the prompt. Simple prompts settle on the foundation; complex prompts naturally draw additional passes; ambiguous prompts naturally invite a second, questioning framing. The dial advances toward the right depth rather than forcing every prompt through the same cost.

**Lineage:** The deterministic foundation grows from the Four Directions decomposer described in [`prompt-decomposition.spec.md`](./prompt-decomposition.spec.md). The multi-pass and dual-framing strategies generalize an LLM-driven decomposition lineage (`mcp-pde` → progressive-refinement PDE) into the Medicine Wheel ontology.

---

## The Strategy Framework

A **decomposition strategy** is a named approach to turning one prompt into one enriched decomposition. Strategies are interchangeable: a caller selects one by name, and the framework guarantees the result conforms to the same decomposition shape.

### Strategy Identity

Every strategy exposes:

- **Behavior:** A stable `name` used in selectors and persisted metadata, and a human-readable `description` for help surfaces.
- **Behavior:** An optional **readiness check** run before execution. A strategy that depends on a resumable model declines early — with a clear, actionable message — when the available model cannot chain sessions, so a caller learns the strategy is unavailable *before* any model is invoked.
- **Behavior:** An **execution** that produces the final decomposition together with a per-pass trace, strategy metadata, and any non-fatal warnings.

### Execution Context

A strategy receives everything it needs through a single context, so each strategy stays stateless and the framework keeps session and model concerns centralized:

- **Behavior:** The original prompt text and the resolved decomposition options (whether to surface implicit intents, whether to map dependencies).
- **Behavior:** Lineage context for parent–child decomposition trees, so a child decomposition can be framed relative to its parent.
- **Behavior:** A single **pass-execution callback**. A strategy never calls a model directly; it invokes this callback with a composed prompt and optionally a prior session reference. The callback returns the model's text and a session reference. Routing this through one callback keeps session chaining, model selection, and workspace context in one place, so strategies describe *what* to ask, never *how* to reach the model.

**Behavior:** The deterministic foundation strategy ignores the pass-execution callback entirely — it computes its result directly from the prompt — which is exactly why it needs no external model and stays synchronous and reproducible.

### Execution Result

Every strategy returns the same envelope:

- **The decomposition** — the final enriched result, normalized so missing fields take ontology-aware defaults.
- **The pass trace** — for each pass: its index, a label (e.g. `coarse`, `directions`, `actions`, `calibrate`, `open`, `questioning`), the raw model text, and the parsed partial it contributed. The trace makes a multi-pass decomposition auditable.
- **Strategy metadata** — the strategy name, the total number of passes, optional per-pass durations, and (for reconciliation strategies) the reconciliation approach used.
- **Warnings** — non-fatal notes accumulated during execution, so graceful continuation is always visible rather than silent.
- **A session reference** — the last session produced, so a downstream decomposition can continue the lineage.

---

## Strategies

### `heuristic` (default)

The deterministic Four Directions decomposition described in [`prompt-decomposition.spec.md`](./prompt-decomposition.spec.md), now addressable as a named strategy.

- **Behavior:** One synchronous classification pass. No external model is invoked.
- **Behavior:** Fully reproducible — the same prompt always yields the same decomposition.
- **When it fits:** Focused, well-scoped prompts; latency-sensitive or cost-sensitive contexts; any setting where reproducibility matters or no model is available.

**This is the default.** Selecting no strategy is identical to selecting `heuristic`, preserving every current caller's behavior exactly.

### `llm-standard`

A single model-assisted pass that reads the whole prompt at once and emits the full enriched decomposition.

- **Behavior:** One pass through the pass-execution callback.
- **Behavior:** Asynchronous; requires an available model.
- **When it fits:** Prompts where a model's reading adds nuance the keyword foundation cannot, but a single reading still captures the intent.

### `iterative-refinement`

Four sequential, session-chained passes, each building on the last:

| Pass | Label | What it draws out |
|------|-------|-------------------|
| 1 | **coarse** | Primary intent + secondary intents |
| 2 | **directions** | Four Directions mapping, context requirements, expected outputs |
| 3 | **actions** | Ordered action stack with dependency edges |
| 4 | **calibrate** | Ambiguity flags + recalibrated confidence scores |

- **Behavior:** Each pass resumes the prior pass's session, so later passes reason with the accumulated decomposition in view.
- **Behavior:** **Graceful continuation** — only the first (coarse) pass is foundational. If a later pass cannot complete, the strategy continues with the decomposition accumulated so far and records a warning naming the pass that was skipped. The decomposition still emerges; it simply carries a visible note about its depth.
- **Behavior:** Declines early (readiness check) when the available model cannot resume sessions.
- **When it fits:** Complex prompts with multiple interleaved concerns; parent–child decomposition lineages; any prompt where a single reading produces a shallow or under-sequenced action stack.

### `adversarial-consensus`

Two parallel framings of the same prompt, then reconciled:

| Framing | Posture | Confidence range | Ambiguity stance |
|---------|---------|-----------------|------------------|
| **open** | Assumes clarity, draws maximum intents | higher | flags only the genuinely unclear |
| **questioning** | Assumes ambiguity, stays conservative | lower | flags assumptions exhaustively |

- **Behavior:** Both framings run in parallel as independent sessions, so wall-clock time stays close to a single pass while two readings are produced.
- **Behavior:** **Confidence-aware reconciliation** composes the two readings into one decomposition: the primary intent is taken from the framing more confident in it; secondary intents, context, and outputs are composed as unions with duplicates removed; directional insights and the action stack are composed and de-duplicated; ambiguity flags lead with the questioning framing's concerns.
- **Behavior:** **Single-framing continuation** — if one framing cannot complete, the surviving framing's reading is used directly, with a warning recording that reconciliation was skipped. Only if *both* framings fail does the strategy stop.
- **When it fits:** Ambiguous or high-stakes prompts where surfacing hidden assumptions matters more than minimizing model calls.

---

## Strategy Selection

**Behavior:** A caller selects a strategy by name. An unknown name is declined with a message listing the available strategies, so selection mistakes surface immediately rather than silently falling back.

**Behavior:** Omitting the selector resolves to `heuristic`. The deterministic foundation is always the path of least surprise.

### Decision Guidance

| Prompt characteristic | Strategy | Why |
|-----------------------|----------|-----|
| Focused, single concern | `heuristic` | The foundation captures it instantly and reproducibly |
| Multi-concern, well-defined | `heuristic` or `llm-standard` | Foundation often suffices; a model reading adds nuance |
| Complex, interleaved concerns | `iterative-refinement` | Progressive passes draw out structure and dependency order |
| Ambiguous or underspecified | `adversarial-consensus` | The questioning framing surfaces hidden assumptions |
| Latency- or cost-sensitive | `heuristic` | One synchronous pass, no model |
| Reproducibility required | `heuristic` | Deterministic by construction |

**Behavior:** Selection is explicit. The framework does not infer prompt complexity automatically; the caller chooses the depth, keeping decompositions predictable.

---

## Two Decomposition Surfaces

The strategy framework adds an advancing layer **beside** the existing decomposer rather than replacing it.

### Deterministic surface (unchanged)

- **Behavior:** The existing synchronous decomposition remains exactly as specified in [`prompt-decomposition.spec.md`](./prompt-decomposition.spec.md). A caller that wants a fast, reproducible Four Directions reading calls it directly and receives a result without awaiting anything. This surface is identical to selecting the `heuristic` strategy.

### Strategy-aware surface (new, optional)

- **Behavior:** An asynchronous **strategy runner** accepts a prompt, a strategy name, and decomposition options. It resolves the strategy, runs its readiness check, executes it, normalizes the result into the enriched decomposition shape, and returns the execution envelope (decomposition + trace + metadata + warnings).
- **Behavior:** Because the deterministic surface and the strategy runner emit the identical enriched decomposition shape, every downstream consumer — relational enrichment, narrative beats, ceremony guidance, storage — reads either one without change.

This separation keeps the synchronous foundation intact while the strategy runner offers depth on demand.

---

## MCP Manifestation

The decompose tool exposed by the Medicine Wheel MCP server gains strategy awareness while staying backward compatible.

- **Behavior:** The decompose tool accepts an optional `strategy` parameter. Omitting it preserves today's behavior exactly — the deterministic foundation runs synchronously and returns the same response shape current callers already receive.
- **Behavior:** When a `strategy` selects an LLM-backed approach, the tool reports, alongside the decomposition: which strategy ran, the number of passes, any warnings (so graceful continuation is visible to the agent), and an optional compact pass trace (labels and durations) for observability.
- **Behavior:** If a selected strategy is unavailable in the current environment (e.g. no resumable model), the tool returns a clear, actionable message naming the deterministic foundation as the always-available alternative, rather than failing opaquely.
- **Behavior:** The tool continues to teach — the decompose response keeps its EAST framing that honoring the vision precedes the action.

---

## Trace, Provenance & Relational Accountability

Multi-pass and dual-framing strategies create richer traces than a single deterministic pass. Because those traces may carry the original prompt and raw model text, the spec treats trace persistence as a relational-accountability concern aligned with OCAP® principles.

- **Behavior:** The deterministic foundation discloses nothing externally — it is the privacy-preserving default.
- **Behavior:** Raw pass text (`rawResponse`) is **trace detail**, retained only when a caller opts into full auditability. A compact trace (labels, durations, warnings) is sufficient for routine observability and carries no model prose.
- **Behavior:** When a strategy persists its work, the recorded metadata names the strategy, the passes, the warnings, and the session/provider lineage — so a later reader can account for *how* a decomposition was created and *which* relations (models, sessions) participated.
- **Behavior:** A decomposition created through an external model records that provenance, so consent and accountability reviews can see when reasoning left the deterministic foundation.

---

## Strategy Metadata Persistence

When a decomposition is stored, the strategy that created it is recorded as additive metadata, so existing stored decompositions remain fully readable:

- **Behavior:** The stored record names the strategy, lists each pass with its label, and carries any warnings.
- **Behavior:** Records created by the deterministic foundation simply name `heuristic` with a single pass — the same shape, at minimal depth.
- **Behavior:** The enriched decomposition itself is identical in shape regardless of strategy, so a reader needs no strategy-specific logic to consume it.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario:** Foundation settles a focused prompt
**Desired Outcome:** A developer wants a quick, reproducible Four Directions reading of "Add pagination to the /users endpoint."
**Current Reality:** The prompt is focused and well-scoped; no deeper elaboration is warranted.
**Natural Progression:** The developer selects no strategy. The deterministic foundation classifies the prompt synchronously, surfacing the primary intent, directional balance, and a small action stack.
**Resolution:** A reproducible decomposition appears instantly, with no model invoked — the depth matches the simplicity of the prompt.

**Creative Advancement Scenario:** Elaboration deepens a sprawling prompt
**Desired Outcome:** A developer wants a well-sequenced plan from "Redesign authentication to support OAuth2, SAML, and magic links while keeping the existing session-cookie flow."
**Current Reality:** The prompt carries several interleaved concerns; a single reading would under-sequence the work.
**Natural Progression:** The developer selects `iterative-refinement`. The coarse pass names primary and secondary intents; the directions pass maps them across the Four Directions with context and outputs; the actions pass orders an action stack along dependency edges; the calibrate pass flags ambiguities and recalibrates confidence. A model hiccup on the calibrate pass is met with graceful continuation — the decomposition emerges with a warning naming the skipped pass.
**Resolution:** A dependency-ordered, ambiguity-aware decomposition emerges, its depth proportional to the prompt's complexity, and its trace records exactly how it was created.

**Creative Advancement Scenario:** Dual framing surfaces hidden assumptions
**Desired Outcome:** A team wants the blind spots drawn out of "Migrate the monolith to microservices with zero downtime, preserving all API contracts."
**Current Reality:** The prompt reads as confident but rests on unstated assumptions about contracts, data, and rollout.
**Natural Progression:** The team selects `adversarial-consensus`. An open framing and a questioning framing read the prompt in parallel; confidence-aware reconciliation composes them, leading with the questioning framing's ambiguity flags.
**Resolution:** One decomposition arrives that both names the work and foregrounds its assumptions, in roughly the wall-clock time of a single reading.

---

## Advancing Patterns

- **Depth on demand** — the deterministic foundation is always present; richer strategies layer additional depth only when a prompt warrants it, each building on the same enriched shape.
- **Uniform result shape** — every strategy emits the identical ontology-enriched decomposition, so downstream consumers advance without strategy-specific branches.
- **Graceful continuation** — multi-pass and dual-framing strategies keep producing a usable decomposition when a step cannot complete, recording warnings rather than collapsing.
- **Centralized model access** — a single pass-execution callback keeps session and model concerns in one place, so each strategy stays a stateless description of *what to ask*.
- **Accountable provenance** — strategy metadata and trace policy let a later reader account for how each decomposition was created and which relations participated.

---

## Quality Criteria

- ✅ Creative Orientation: Decomposition becomes a dial whose depth the user chooses, not a fixed routine
- ✅ Structural Dynamics: A strategy selector lets decomposition depth rise to meet prompt complexity
- ✅ Advancing Patterns: Each strategy layers depth atop a shared enriched shape; graceful continuation sustains forward movement
- ✅ Backward Compatible: The deterministic foundation is the default; omitting a selector preserves current behavior exactly
- ✅ Codebase Agnostic: Strategies, context, and result envelope are described conceptually, re-implementable from this spec alone
- ✅ Relationally Accountable: Trace persistence honors OCAP® principles; the deterministic foundation discloses nothing externally
