# Medicine Wheel × Wilson: Deep Research Synthesis & Packaging Recommendations

> **Date:** 2026-03-14
> **Source:** 5 parallel Opus 4.6 research agents analyzing all 9 `src/` packages against Shawn Wilson's "Research Is Ceremony"
> **Issue:** jgwill/medicine-wheel#19
> **Total Research:** 2,912 lines across 5 reports

---

## Executive Synthesis

### Current State: ~55-60% Wilson Alignment

The Medicine Wheel developer suite has built a **remarkably deep ontological foundation** — first-class relations, OCAP® governance types, Wilson's Three R's, Four Directions throughout — but three critical patterns emerge:

1. **Representation Without Enforcement** — The system can *describe* relational accountability but cannot *prevent* violations. Governance checks are advisory, OCAP® flags are decorative, consent is a boolean, and the WilsonMeter displays a number it cannot influence.

2. **Structure Without Ceremony** — Ceremony phases exist as state machines, narrative beats exist as sequenced data, but the system is a *ceremony logbook* rather than a *ceremony space*. It records what happened but doesn't facilitate the transformative threshold Wilson describes.

3. **Knowledge Without Weight** — All knowledge in the system is flat. Dream-state insights carry the same epistemic weight as rational analysis. There's no mechanism to track how understanding deepens through spiral/circular revisitation.

### Wilson Coverage Map

| Pillar | Current | After Proposed Changes |
|--------|---------|----------------------|
| Ontology (Relational Reality) | 75% → | 100% |
| Epistemology (Relational Knowing) | 45% → | 100% |
| Axiology (Relational Accountability) | 65% → | 100% |
| Methodology (Research as Ceremony) | 50% → | 100% |

### Key Findings by Agent

| Agent | Core Finding |
|-------|-------------|
| 🌍 Ontological | `Relation` type is genuine achievement; but `RelationalEdge` creates an escape hatch from Wilson's ontology; data-store can't persist full Relations |
| 📖 Epistemological | Narrative-engine treats story as sequenced data, not epistemological method; no spiral deepening detection; session-reader is epistemologically inert |
| ⚖️ Axiological | Near-zero enforcement — governance is advisory by design; consent is one-time boolean; ceremony-protocol explicitly chose "human agency" over relational accountability |
| 🔄 Methodological | System is ceremony-informed workflow, not workflow-as-ceremony; no active threshold, no multi-participant council, no transformation tracking |
| 🕸️ Gap Analysis | 6 absent Wilson concepts, 11 partial, 8 full out of 25 mapped; 6 new packages proposed with full interfaces |

---

## Full Stack Packaging Recommendations

### 6 New Packages

| Priority | Package | Purpose | Effort |
|----------|---------|---------|--------|
| 🔴 P0 | `@medicine-wheel/importance-unit` | Relational knowledge units with epistemic weight, source dimensions, circle depth | Medium |
| 🔴 P0 | `@medicine-wheel/fire-keeper` | Ceremony coordination agent — gating, check-back, stop-work, permission tiers | Large |
| 🔴 P0 | `@medicine-wheel/transformation-tracker` | Research impact tracking — Wilson's validity criterion | Medium |
| 🟠 P1 | `@medicine-wheel/relational-index` | Four-source dimensional indexing (Land/Dream/Code/Vision) | Medium |
| 🟠 P1 | `@medicine-wheel/consent-lifecycle` | Consent as ongoing relationship, not boolean | Small-Medium |
| 🟡 P2 | `@medicine-wheel/community-review` | Ceremonial review protocol with Elder validation | Medium |

### 9 Existing Package Enhancements

| Package | Key Enhancement |
|---------|----------------|
| ontology-core | Specialized relation subtypes (Land/Ancestor/Future/Cosmic), consent lifecycle types, seasonal awareness |
| ceremony-protocol | Extended 5-phase model (gathering→resting), outcome tracking, ceremony enforcement gates |
| narrative-engine | Epistemological depth tracking, cross-beat synthesis, transformation markers |
| data-store | Full Relation persistence (not just RelationalEdge), ImportanceUnit storage |
| relational-query | Value-gating traversal, consent-aware queries, ImportanceUnit queries |
| prompt-decomposition | Source dimension detection, epistemic weighting, ceremony guidance |
| graph-viz | Spiral visualization, transformation timeline, consent status overlay |
| ui-components | Interactive WilsonMeter, consent dashboard, transformation journal |
| session-reader | Relational context preservation, epistemological deepening detection |

### Implementation Phases

```
Phase 1 (Foundation):     importance-unit → ontology-core enhancements → ceremony-protocol enhancements
Phase 2 (Activation):     fire-keeper → relational-index → consent-lifecycle
Phase 3 (Transformation): transformation-tracker → community-review
Phase 4 (Integration):    existing package enhancements → MCP tool expansion → app integration
```

---

## Development Team Assignments (5 Agents)

| Agent | Role | Deliverables |
|-------|------|-------------|
| Dev 1 | Foundation Lead | `importance-unit` package + `ontology-core` enhancements |
| Dev 2 | Ceremony Lead | `fire-keeper` package + `ceremony-protocol` enhancements |
| Dev 3 | Transformation Lead | `transformation-tracker` package + `consent-lifecycle` package |
| Dev 4 | Epistemology Lead | `relational-index` package + `narrative-engine` + `prompt-decomposition` enhancements |
| Dev 5 | Integration Lead | `community-review` package + rispecs for all new packages + data-store/relational-query enhancements |

---

## Source Research Documents

- `output/research-ontological-alignment.md` (490 lines)
- `output/research-epistemological-coverage.md` (437 lines)
- `output/research-axiological-enforcement.md` (508 lines)
- `output/research-methodological-completeness.md` (419 lines)
- `output/research-gap-analysis.md` (1,058 lines)

---

*This synthesis was produced from 5 parallel deep-research agents (Claude Opus 4.6) analyzing the complete Medicine Wheel codebase against Shawn Wilson's "Research Is Ceremony: Indigenous Research Methods."*
