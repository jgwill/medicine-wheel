# RISE Alignment Review — Medicine Wheel Specifications

> Automated analysis of existing rispecs against the [RISE Framework for LLMs](https://llms.jgwill.com/llms-rise-framework.txt) (v1.2).
> Generated via Mission 3 subagent orchestration (claude-opus-4.6).

## Summary

| Spec | Score | Type | Key Finding |
|------|-------|------|-------------|
| `fire-keeper.spec.md` | 72 | Upgrade | Strong creative orientation; test scenarios need CAS conversion; reactive language in 4 phrases |
| `prompt-decomposition.spec.md` | 72 | Upgrade | Good structural tension; "bridges" anti-pattern; TypeScript coupling violates autonomy |
| `ceremony-protocol.spec.md` | 62 | Upgrade | Clear desired outcome; "Governance Enforcement" is force-based framing; no CAS |
| *(new)* `plugin-integration-framework` | — | New Proposal | No generalizable plugin contract exists; 15 packages lack extension API surface |

---

## Upgrade: fire-keeper.spec.md (72/100)

### Strengths
- Strong Desired Outcome section with clear creative focus on what users CREATE (actively-governed ceremony spaces)
- Explicit Structural Tension defined between autonomous execution and relational accountability
- Five-phase ceremony lifecycle provides a natural progression model
- Specification Autonomy maintained — no file paths, codebase-agnostic conceptual model

### Recommended Changes

1. **Convert test scenarios to Creative Advancement Scenarios**
   Replace the 8 numbered test scenarios with CAS format:
   ```
   **Creative Advancement Scenario**: [Name]
   **Desired Outcome**: [What the user wants to create]
   **Current Reality**: [Starting state]
   **Natural Progression**: [How structural dynamics enable advancement]
   **Resolution**: [Achieved desired result]
   ```

2. **Replace reactive language**
   | Current (reactive) | Recommended (creative) |
   |---|---|
   | "prevents violations, not just reports them" | "creates conditions where relational integrity naturally emerges" |
   | "Stop-work orders can halt work that violates relational accountability" | "Stop-work capability creates space for relational reflection" |
   | "Work cannot proceed until relational conditions are met" | "Relational conditions naturally shape the pace of advancement" |
   | "Without one, ceremony degrades into process" | "The fire keeper sustains the ceremonial quality of each phase" |

3. **Add SpecLang `**Behavior:**` sections** to each module description — describe user experiences, not API surface

4. **Move TypeScript interfaces** to an appendix — the main spec body describes behaviors conceptually

5. **Add Natural Resolution** subsection under Structural Tension showing how fire keeper creates advancing movement

---

## Upgrade: prompt-decomposition.spec.md (72/100)

### Strengths
- Explicit Desired Outcome with creating focus ("Users create ontologically grounded task decompositions")
- Creative Intent section describes what the feature enables
- Four-phase pipeline (EAST/SOUTH/WEST/NORTH) is a strong advancing pattern
- Quality Criteria uses RISE checklist format

### Recommended Changes

1. **Remove "bridges" anti-pattern**
   | Current | Recommended |
   |---|---|
   | "The decomposer bridges these by classifying…" | "Classification into directions naturally surfaces neglected perspectives, resolving the tension between flat lists and directional awareness" |
   | "Where attention is needed" | "Where creative energy naturally flows" |
   | "Poor directional balance triggers ceremony guidance" | "Directional balance awareness invites ceremony guidance" |

2. **Add 2–3 Creative Advancement Scenarios** showing a user creating a balanced decomposition from a complex prompt

3. **Add `**Behavior:**` blocks** for each decomposition phase, independent of TypeScript types

4. **Decouple from implementation** — move TypeScript interfaces to an appendix; spec should describe conceptual behaviors

5. **Expand Advancing Patterns** to show how each pattern builds on the previous (classification → enrichment → ceremony → narrative)

---

## Upgrade: ceremony-protocol.spec.md (62/100)

### Strengths
- Strong Desired Outcome ("users create ceremony-aware development workflows")
- Structural Tension between open development and Indigenous governance
- Phase transitions model natural advancement (opening → council → integration → closure)
- Non-blocking guidance pattern respects human agency

### Recommended Changes

1. **Rename "Governance Enforcement" → "Governance Awareness"** — remove force-based framing

2. **Replace reactive language**
   | Current (reactive) | Recommended (creative) |
   |---|---|
   | "require [elder, firekeeper] approval" | "invite [elder, firekeeper] review" |
   | "not just access control" | "beyond access control — enabling relational participation" |
   | "they don't prevent" | "they create space for" |
   | "Access Level Resolution" | "Access Level Discovery" |

3. **Add 2–3 Creative Advancement Scenarios** replacing raw API examples

4. **Convert TypeScript interfaces** into `**Behavior:**` sections describing what the system creates

5. **Split Structural Tension** into explicit "Current Reality" and "Desired Outcome" subsections

6. **Remove Dependencies section** or abstract it — npm package names violate Specification Autonomy

---

## New Proposal: Plugin Integration Framework

### Structural Tension
- **Current Reality**: 15 packages with rich extension surfaces (fire keeper gating, ceremony protocol, consent lifecycle, community review) but no contract for how external plugins hook into them
- **Desired Outcome**: Community developers and third-party tools create Medicine Wheel plugins that honor relational accountability, pass through Fire Keeper gating, respect OCAP principles, and integrate with ceremony — without modifying core packages

### Proposed File
`rispecs/plugins/plugin-integration-framework.proposal.md`

### Outline
1. **Purpose** — Why a plugin integration framework is needed beyond the Copilot plugin
2. **Desired Outcome** — What plugin authors create with this framework
3. **Current Reality** — Existing extension surfaces across the 15 packages
4. **Plugin Manifest Schema** — Universal manifest shape for any Medicine Wheel plugin
5. **Extension Points Registry** — Hookable surfaces: ceremony phase transitions, fire keeper gate evaluation, direction inquiry enrichment, consent cascade listeners
6. **Relational Accountability Contract** — Required Wilson alignment scores, OCAP compliance declarations, consent lifecycle participation
7. **Plugin Lifecycle** — Registration → discovery → activation → deactivation → withdrawal (mapped to Fire Keeper phases: gathering → kindling → tending → harvesting → resting)
8. **Permission Tiers for Plugins** — How plugins declare and are granted observe/analyze/propose/act tiers
9. **Creative Advancement Scenarios** — Scenario A: Community member creates a Land-based knowledge plugin; Scenario B: Research team creates a transformation-tracker extension
10. **Validation Expectations** — What a conforming plugin must demonstrate
