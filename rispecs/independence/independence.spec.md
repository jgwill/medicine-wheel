# The medicine wheel, independent: delayed resolution with its own provider, prompts and tracing

**Spec status:** proposed direction, not started (2026-10-27). William said "probably" and "a major refactoring": this spec states the outcome he named so a later cycle can choose it. It changes no code.
**Origin:** Episode 297 (miadi-chronicle://297), William's screenwalk 2610221013 over the T1 video, `captures/screenwalk-2610221013-DD-VideoExplainerFeedback-001/transcription-gemini.txt` in that episode, at 09:25 to 10:37 and 20:54 to 21:46 (feedback map V5 and V7).
**Relational context:** `independence.kin.md`. **State:** `STATUS.md`.

## Intent

William, 09:25 to 09:47: "optimally, the Medicine Wheel would be capable of doing everything about strategic delaying resolution without the two other packages. So it would imply, probably as well, … to implement its own provider and access to a prompt management system and tracing, and … everything that it needs, and it could learn that from the Myadi factory."

William, 20:54 to 21:46: "instead of naming your package with the provider name, you try to abstract the identity. So it's called the Large Language Model Ops … It even probably involve a major refactoring of the Medicine Wheel to actually learn from these two other packages that I talked about, and become independent, have whatever sets of amount of packages needed for that, and they would be consumed by our Myadi Factory Large Language Model Ops package. That way, it would make our packages uh grounded on solid foundation."

## Desired outcome

The medicine wheel does strategic delaying resolution end to end on its own: a step records a chosen delay, names the follow-up prompt composed when it was chosen, and the wheel itself holds that prompt's versions and the traces of the sessions that take it up, through its own packages behind a provider-free identity. `@miadi/llmops` consumes those packages for the factory. coaia-narrative and coaiajs remain independent lineages the wheel learned from, never dependencies.

## Current reality (measured 2026-10-27 at suite 0.27.0)

- The wheel records delayed resolution natively: `delay_resolution`, `list_delayed_resolutions`, `end_delayed_resolution`, a step's `follow_up_prompt`, and the session reference with `trace` and `rehydrate_with` (rispec `../delayed-resolution.spec.md`).
- `trace`, `rehydrate_with` and `follow_up_prompt.address` are stored as strings beginning with `miadi-`. The wheel resolves none of them. `@miadi/llmops` 0.1.1 resolves them, and the prompts live in Langfuse's ceremony domain, outside the wheel.
- No package in the wheel holds prompts, prompt versions or traces. Its provider abstractions are for storage (`storage-provider`, `data-store`, `data-store-postgres`) and memory (`memory`, `honcho`).
- No wheel package depends on an `@miadi/*` package, and `@miadi/llmops` depends on no wheel package.
- The checks (`accountability_validator`, `ocap_compliance_checker`, `wilson_paradigm_checker`) and the gap-analysis turn point to `turn_to_creative_orientation` (0.26.3 to 0.27.0).

## Structural tension

The outcome asks for a wheel that keeps its own prompts and traces and serves them to the factory under an identity that names no provider. Current reality holds the delay and the addresses in the wheel while the prompts, their versions and the traces live with a provider the wheel never touches. Each step below resolves part of that tension without making the wheel depend on the two lineages it learned from.

## Creative Advancement Scenarios

**Creative Advancement Scenario**: A delay's follow-up prompt held by the wheel

**User Intent**: A person choosing a delay in the wheel writes the follow-up prompt and finds it again, versioned, when the circle meets at the date.
**Current Reality**: The step stores the prompt's address and, optionally, its text. The versions live in Langfuse.
**Natural Progression Steps**:
  1. The wheel's own prompt package stores the composed prompt as a version under a name the step records.
  2. Revising it in the circle adds a version and keeps the earlier one.
  3. The step's `follow_up_prompt.address` resolves inside the wheel.
**Achieved Outcome**: The follow-up prompt and its history are part of the wheel's record of the delay.
**Supporting Features**: a prompt package with versions and labels, behind a provider interface.

**Creative Advancement Scenario**: The factory consumes the wheel, not the reverse

**User Intent**: `@miadi/llmops` gives every Miadi surface one identity for records, instruments and assessments.
**Current Reality**: `@miadi/llmops` resolves addresses to Langfuse projects per domain. It knows nothing of the wheel.
**Natural Progression Steps**:
  1. The wheel's prompt and trace packages expose the same operations as a provider.
  2. `@miadi/llmops` lists the wheel as one provider among others, by configuration.
  3. A wheel deployment with no outside provider still holds its delays, prompts and traces.
**Achieved Outcome**: The wheel stands on its own, and the factory builds on it.
**Supporting Features**: a provider interface the wheel's packages answer; `@miadi/llmops` consuming it.

## What would be decided before building

- Whether to refactor at all, and when (William: "probably", "a major refactoring").
- The packages' names: identity names, never a provider's name (20:54).
- Which of the wheel's existing packages carry prompts and traces, or whether new ones do.
- What `@miadi/llmops` needs from the wheel to consume it.
