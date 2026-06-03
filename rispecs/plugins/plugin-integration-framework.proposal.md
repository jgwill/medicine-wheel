# Plugin Integration Framework

> **Status**: proposal
> **RISE Guidance**: [llms-rise-framework.txt](https://llms.jgwill.com/llms-rise-framework.txt) v1.2

## Desired Outcome

Plugin authors create Medicine Wheel extensions that participate in relational accountability, pass through Fire Keeper gating, respect OCAP principles for data access, and integrate with ceremony protocol — all without modifying core packages.

## Current Reality

The Medicine Wheel system comprises 15+ packages with rich extension surfaces — ceremony protocol phase hooks, fire keeper gate evaluation, consent lifecycle cascades, community review workflows, and Four Directions vocabulary. However, these surfaces are internal. No contract defines how an external plugin registers itself, discovers available extension points, or satisfies relational accountability requirements. Plugin development today is ad-hoc: the `plugins/` directory defines one specific Copilot plugin but offers no generalizable integration pattern.

## Structural Tension

The system's internal modularity (ontology-core, fire-keeper, ceremony-protocol, consent-lifecycle, community-review) naturally supports extension — each package already operates through well-defined interfaces. Yet without a plugin framework, the only way to extend Medicine Wheel is to modify core packages directly. This creates an oscillating pattern: community contributors fork, diverge, and reconcile repeatedly rather than advancing through composable extensions.

A plugin integration framework resolves this tension by creating an advancing pattern: plugins compose with core packages through declared contracts, and the system's existing relational accountability mechanisms (Fire Keeper gating, consent lifecycle, community review) naturally govern plugin participation.

## Plugin Manifest Schema

Every Medicine Wheel plugin declares a manifest describing its identity, capabilities, and relational commitments:

- **Identity** — name, version, author, description, license
- **Extension Points** — which core surfaces the plugin hooks into (ceremony phase transitions, fire keeper gate evaluators, direction enrichment providers, consent cascade listeners)
- **Permission Tier** — the tier the plugin operates at (observe / analyze / propose / act)
- **Relational Declarations** — Wilson alignment acknowledgment, OCAP compliance scope, consent lifecycle participation level
- **Lifecycle Phase** — current phase in the plugin lifecycle (gathering / kindling / tending / harvesting / resting)

## Extension Points Registry

Core packages expose named extension points that plugins can register against:

- **Ceremony Phase Transitions** — plugins observe or enrich phase transitions (opening → council → integration → closure)
- **Fire Keeper Gate Evaluation** — plugins contribute additional gate conditions or provide contextual data for gate decisions
- **Direction Inquiry Enrichment** — plugins add domain-specific perspectives to Four Directions decomposition (East vision, South analysis, West validation, North action)
- **Consent Cascade Listeners** — plugins participate in consent lifecycle events, receiving notifications and contributing consent-relevant metadata
- **Community Review Hooks** — plugins surface review-relevant information during community review workflows

## Relational Accountability Contract

Plugins declare and demonstrate relational accountability:

- **Wilson Alignment** — plugins declare which Wilson paradigm principles they honor and how
- **OCAP Compliance** — plugins specify their data access scope and demonstrate ownership, control, access, and possession alignment
- **Consent Participation** — plugins declare their consent lifecycle participation level: passive (receive notifications only), active (contribute metadata), or governing (participate in consent decisions)

## Plugin Lifecycle

Plugin lifecycle maps to Fire Keeper phases, creating a natural progression:

1. **Gathering** — Plugin is proposed; manifest is submitted for review
2. **Kindling** — Community review validates relational accountability declarations; Fire Keeper evaluates gate conditions
3. **Tending** — Plugin is active; operates within declared permission tier; participates in ceremony and consent lifecycle
4. **Harvesting** — Plugin outputs are integrated; contributions are acknowledged through relational index
5. **Resting** — Plugin is deactivated gracefully; data obligations are fulfilled; consent cascades are completed

## Permission Tiers for Plugins

Plugins declare and operate within a permission tier:

| Tier | Capability | Fire Keeper Gate |
|------|-----------|-----------------|
| **Observe** | Read-only access to public ceremony state, direction outputs, and published relational data | Minimal — identity verification |
| **Analyze** | Compute derived insights from observed data; contribute analysis to community review | Standard — Wilson alignment check |
| **Propose** | Submit proposals for ceremony transitions, direction enrichment, or relational index entries | Extended — OCAP compliance + consent participation |
| **Act** | Execute changes within the system (create nodes, advance ceremonies, update relational data) | Full — community review + Fire Keeper approval |

## Creative Advancement Scenarios

**Creative Advancement Scenario**: Land-Based Knowledge Plugin

**Desired Outcome**: A community member creates a plugin that enriches Four Directions decomposition with land-based knowledge perspectives specific to their territory.

**Current Reality**: The prompt-decomposition system produces generic East/South/West/North classifications. Territory-specific knowledge exists in community practice but has no pathway into the system.

**Natural Progression**: The plugin registers as a Direction Inquiry Enrichment provider at the Analyze permission tier. During decomposition, the system invites the plugin to contribute territory-specific perspectives for each direction. The plugin's contributions flow through Fire Keeper gating (Wilson alignment verified) and appear alongside standard decomposition output.

**Resolution**: Direction inquiry outputs naturally incorporate land-based knowledge. The community member's expertise advances the system's awareness without requiring core package modifications.

---

**Creative Advancement Scenario**: Transformation Tracker Extension

**Desired Outcome**: A research team creates a plugin that tracks transformation patterns across multiple ceremony cycles, surfacing emergent themes.

**Current Reality**: Individual ceremony cycles produce transformation data, but cross-cycle pattern recognition requires manual analysis. No automated pathway exists for longitudinal insight.

**Natural Progression**: The plugin registers as a Ceremony Phase Transition observer and Consent Cascade listener at the Observe tier. It accumulates anonymized transformation signals across cycles (respecting OCAP declarations). When patterns emerge, the plugin advances to Propose tier to suggest ceremony themes informed by historical patterns.

**Resolution**: The research team creates longitudinal transformation insights that naturally feed into future ceremony planning. Pattern recognition advances through structural dynamics rather than forced analysis.

## Validation Expectations

A conforming plugin demonstrates:

- ✅ Manifest completeness — all required fields present and valid
- ✅ Permission tier consistency — plugin operations stay within declared tier
- ✅ Relational accountability — Wilson alignment, OCAP compliance, and consent participation match declarations
- ✅ Lifecycle compliance — plugin transitions through Fire Keeper phases in order
- ✅ Non-oscillation — plugin contributes to advancing patterns, not dependency loops
- ✅ Specification Autonomy — plugin manifest is codebase-agnostic; implementation details are separate from behavioral contracts
