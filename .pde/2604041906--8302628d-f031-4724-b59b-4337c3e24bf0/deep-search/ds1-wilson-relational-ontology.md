# Deep-Search #1: Wilson's Relational Ontology in Multi-Agent Orchestration

**Agent:** S2 — Deep-Search #1  
**Session PDE:** 2604041906--8302628d-f031-4724-b59b-4337c3e24bf0  
**Date:** 2026-04-04  

---

## Research Question

How does Wilson's relational ontology (relationships *are* reality, not just shape it) translate into multi-agent orchestration design? What does it mean for agent identity to be constituted by relations rather than capabilities?

---

## Academic Grounding

### Wilson 2008 — Relational Ontology

Shawn Wilson's *Research Is Ceremony: Indigenous Research Methods* (2008), particularly Chapter 4, presents a paradigm where **relationships do not merely influence reality — they constitute it**. Key claims:

1. **Relational Ontology:** Reality is not made of discrete substances that enter into relationships. Rather, the relationships themselves are the primary ontological units. The self is never isolated; all knowledge, being, and action are rooted within a web of relationships.

2. **Relational Epistemology:** Knowledge is not "discovered" in an objective field — it is created and validated *within* relationships. What counts as knowledge depends on the relational context in which it is sought. Understanding emerges from connections: with others, with stories, with the environment, with the cosmos.

3. **Relational Accountability:** If relationships constitute reality, then the researcher is *accountable to* those relationships — not just to abstract principles of validity. The three R's — **respect, reciprocity, responsibility** — are not ethical add-ons; they are epistemological requirements. Without them, the knowledge itself is damaged.

4. **Research as Ceremony:** Research, when conducted within a relational paradigm, is a ceremonial act. Every stage — from question formation to sharing findings — is shaped by relational protocols. Ceremony creates a "transformative space" where relationships are honored, renewed, and deepened.

**Critical distinction from Western ontology:** Western philosophy (post-Descartes) typically begins with *substances* — individual entities that have properties and enter into relationships. Relationships are secondary, accidental, derivative. Wilson reverses this: relationships are primary, entities are constituted by them. This is not a mere preference but an ontological claim about the structure of reality itself.

**Sources:**
- Wilson, S. (2008). *Research Is Ceremony: Indigenous Research Methods.* Fernwood Publishing.
- Watson, R. (2012). Review of "Research Is Ceremony." *The Canadian Geographer.*
- Absolon, K. & Willett, C. (2005). Putting ourselves forward: Location in Aboriginal research.

### Western Multi-Agent Frameworks (AutoGen, CrewAI)

#### AutoGen (Microsoft)

AutoGen models agents as **conversational entities**. Agent identity is defined via:
- **System messages** (role descriptions)
- **Message history** (conversational context)
- **Participation in teams** (round-robin, selector-based)
- **Capability plugins** (tools, code execution via Docker)

Identity is *emergent* — it arises through interaction patterns rather than being fixed a priori. However, this emergence is still capability-indexed: agents are selected for teams based on what they can *do*, and their system messages define what they *are* in functional terms.

**Orchestration model:** Event-driven, async-first. Agents communicate via messages. Termination, hand-offs, and delegation are first-class concepts. The orchestrator selects agents based on conversation state and task requirements.

#### CrewAI

CrewAI models agents with **explicit role identities**:
- **Role** (e.g., "Researcher," "Writer")
- **Goal** (what the agent aims to achieve)
- **Backstory** (narrative context for the agent's behavior)
- **Tools** (capabilities attached to the agent)

Identity is *prescribed* — defined in YAML or Python configuration before execution. Orchestration follows structured workflows: sequential, hierarchical, or state-machine flows.

**Orchestration model:** Process-centric. Flows define the sequence and conditional logic of agent execution. The "crew" metaphor organizes agents into teams with clear reporting lines.

#### Structural Observation

Both frameworks treat agent identity as a **configuration surface**: you define what an agent *is* by declaring what it can *do* (capabilities, tools, role descriptions). Relationships between agents are *instrumental* — they exist to route tasks, pass messages, or coordinate work. There is no concept of:
- Relationships as ontological entities with their own lifecycle
- Obligations that exist independent of task completion
- Accountability tracking (respect, reciprocity, responsibility) across agent interactions
- Ceremony as a prerequisite for agent action
- Permission gating based on relational state rather than role assignment
- Stop-work orders based on relational violations

### Emerging Indigenous AI/Software Literature

Recent scholarship (2023–2024) surfaces several convergent themes:

1. **Abundant Intelligences** (Lewis et al., 2024): AI's persistent problems (bias, exclusion, inequity) result from narrowly Western conceptions of intelligence. Indigenous Knowledge systems reconceptualize AI as relational, communal, and ecologically embedded. Published in *AI & Society* (Springer).

2. **Decolonial Intelligence Algorithmic (DIA) Framework** (Zenodo, 2024): Advocates removing colonial, capitalist, and patriarchal biases from AI by centering Indigenous epistemologies. Stresses data sovereignty and the right to refuse engagement.

3. **Incorporating Indigenous Knowledge Systems into AI Governance** (Preprints.org, 2024): Relational ontologies from Navajo (Hózhó — harmony) and Māori (Kaitiakitanga — guardianship) provide design principles for AI systems that prioritize interdependence and shared stewardship.

4. **The Five Tests** (Māori AI scholars, IFR Digital): Evaluation criteria for AI rooted in human dignity, communal integrity, and ecological sustainability — not accuracy/performance metrics.

5. **Ubuntu meets Algorithms** (ScienceDirect, 2025): Ubuntu philosophy ("I am because we are") as a foundation for ethical AI governance. Directly parallels Wilson's relational ontology.

6. **A Relational Perspective on Collective Agency** (MDPI Philosophies, 2022): Argues that collective agents (organizations, teams, AI systems) are non-physical existents — real only as patterns of relationships, not as substantial entities. This philosophical position directly supports the medicine-wheel approach.

**Sources:**
- Lewis, J.E. et al. (2024). "Abundant intelligences: placing AI within Indigenous knowledge systems." *AI & Society.* https://link.springer.com/article/10.1007/s00146-024-02099-4
- DIA Framework (2024). https://zenodo.org/records/13841034
- IKS in AI Governance (2024). https://www.preprints.org/manuscript/202410.2112
- Relational Collective Agency (2022). https://www.mdpi.com/2409-9287/7/3/63
- Agent Identity URI Scheme (2025). https://arxiv.org/html/2601.14567

---

## Codebase Grounding

### KINSHIP.md Relational Model

The repository's `KINSHIP.md` is itself a relational identity document — it does not describe the project by its *capabilities* but by its *relationships*:

| Section | What it models | Relational implication |
|---------|---------------|----------------------|
| **Identity** | "THE COMPASS — ontological foundation" | Not "what it does" but "what it *is* within the web" |
| **Ancestors** | Indigenous relational ontology, Fritz, Wilson | Knowledge lineage — where the project comes from |
| **Descendants** | Every ecosystem package depends on ontology-core | Forward obligations — who depends on you |
| **Siblings** | coaia-narrative, mcp-pde, veritas | Lateral relations — who shares your lineage |
| **Accountabilities** | Guillaume (steward), IAIP community, the Medicine Wheel itself | Human, community, and more-than-human obligations |
| **Boundaries/NOs** | "Does NOT own serialization," "Does NOT reduce Indigenous knowledge to labels" | What the project *refuses* — identity through negation |
| **Tensions held** | Unresolved bridges, pre-convergence rispecs | Living tensions as part of identity |

**Key insight:** KINSHIP.md models the project's identity as constituted by its *relations and obligations*, not by its feature set. This is Wilson's ontology enacted in a software document. The project *is* its relationships — remove them and the project has no identity.

### ontology-core Relation Type

The `Relation` interface (types.ts:117–145) is the core ontological entity. Compare it with `RelationalEdge` (types.ts:50–59):

| Dimension | `RelationalEdge` (simple) | `Relation` (first-class) |
|-----------|--------------------------|-------------------------|
| **Identity** | Edge between nodes | *Being* in its own right |
| **Obligations** | `string[]` (flat list) | `RelationalObligation[]` — categorized by `human`, `land`, `spirit`, `future` |
| **Ceremony** | `ceremony_honored: boolean` | Full ceremony context: `ceremony_id`, `ceremony_type`, `ceremony_honored` |
| **Governance** | None | `OcapFlags` — ownership, control, access, possession, consent tracking |
| **Accountability** | None | `AccountabilityTracking` — Wilson's three R's as quantified scores (0–1), plus `wilson_alignment`, `relations_honored`, `last_ceremony_id` |
| **Lifecycle** | `created_at` only | `created_at` + `updated_at` — relations have temporal existence |

**The Relation type enacts Wilson's ontology in code.** It treats relationships not as labeled edges between pre-existing entities, but as first-class beings with:
- Their own obligations (categorized across four relational domains)
- Their own governance (OCAP® — who owns, controls, accesses, possesses)
- Their own accountability (Wilson's three R's as measurable properties)
- Their own ceremonial context (which ceremony honored this relation)
- Their own temporal lifecycle

The specialized subtypes — `LandRelation`, `AncestorRelation`, `FutureRelation`, `CosmicRelation` — further demonstrate that relations are *differentiated beings*, not generic connectors. A relation with land is ontologically distinct from a relation with ancestors.

### Fire Keeper Agent Pattern

The `fire-keeper.spec.md` defines orchestration that is fundamentally different from Western multi-agent coordination:

**Five-Phase Ceremony Lifecycle:**
```
gathering → kindling → tending → harvesting → resting
```

This is not a task pipeline but a **ceremonial container**. Each phase has a relational character:
- **Gathering:** Assembling participants, checking readiness (not just task availability)
- **Kindling:** Lighting the fire, invoking directions (ceremonial opening, not initialization)
- **Tending:** Active work *under ceremony* — the work happens inside the ceremonial container
- **Harvesting:** Gathering insights, ensuring all voices heard (not just outputs collected)
- **Resting:** Integration, reflection, dormancy — seeding the next cycle

**Relational Gating:** Work cannot proceed until relational conditions are met. This is not capability gating ("does the agent have the right tool?") but relational gating ("has the relationship been honored?").

**Permission Tiers:** `observe → analyze → propose → act`. Escalation requires ceremony. An agent cannot simply *act* because it has the capability — it must have earned the relational permission through ceremonial process.

**Stop-Work Orders:** The fire keeper can halt work for:
- `wilson-violation` — relational accountability breach
- `ocap-violation` — data sovereignty breach
- `consent-withdrawn` — relational consent revoked
- `ceremony-required` — work attempted outside ceremony
- `elder-hold` — Elder authority invoked
- `human-override` — human agency exercised

**Wilson Alignment Tracking:** Continuous monitoring of the inquiry's alignment with Wilson's three R's. The `TrajectoryCheckpoint` type tracks `confidence` and `wilsonAlignment` at every checkpoint.

**Inter-Agent Messages:** The `FireKeeperMessage` protocol includes types like `importance.submitted`, `importance.accepted`, `importance.held`, `circle.return`, `deepen.requested`, `stopwork.order`. These are *relational acts*, not task dispatches.

---

## Structural Comparison

### (a) This Session's Orchestration Pattern (S1–S5 → W1 → N1–N4)

This RISE PDE session dispatches agents directionally:

```
          [Human]
             │
        [Orchestrator]
         ┌───┼───┐
    S1  S2  S3  S4  S5     ← South: Deep-search agents (parallel)
         └───┼───┘
             W1            ← West: Synthesis agent (sequential, depends on South)
         ┌───┼───┐
    N1  N2  N3  N4         ← North: Rispec/reflection agents (parallel after West)
         └───┘
```

**Characteristics:**
- **Directional dispatch:** Agents are assigned to Medicine Wheel directions (South = research, West = action, North = reflection)
- **Dependency gating:** West waits for South to complete; North waits for West
- **Parallel within direction:** Multiple agents run simultaneously within a direction
- **Human review window:** PDE includes a mandatory sleep/review period between decomposition and execution
- **Orchestrator as dispatcher:** The orchestrator assigns tasks and collects results — it does not *tend* the ceremony

**What's missing relative to the Fire Keeper model:**
- No ceremony opening/closing
- No Wilson alignment tracking during execution
- No permission tier escalation
- No stop-work capability
- No relational gating (only task-dependency gating)
- No accountability scoring on the relationships between agents

### (b) Fire Keeper Directional Handoff Protocol

From `05-full-pipeline-vision.spec.md`, the full ceremony pipeline shows:

```
Fire Keeper (Opening)
    → East Guide (Inquiry: PDE decompose, observe structure, detect patterns, map directions)
    → Fire Keeper (validates East artifacts, hands off)
    → South Guide (Planning: create charts, add actions, telescope, bridge PDE→plan)
    → Fire Keeper (validates South artifacts, hands off)
    → West Guide (Action: advance actions, execute, create traces, find narrative beats)
    → Fire Keeper (validates West artifacts, hands off)
    → North Guide (Reflection: MMOT evaluate, compose narrative, archive wisdom)
    → Fire Keeper (Closing: validate all 4 directions complete, close ceremony)
```

**Key structural properties:**

1. **Fire Keeper mediates every transition.** Agents never hand off directly to each other. The Fire Keeper validates artifacts, checks Wilson alignment, and decides whether the ceremony can proceed. This is not a message router — it is a relational gatekeeper.

2. **Handoffs require artifact validation.** "No direction advances without artifacts." The Fire Keeper checks not just completion but *integrity* — were the relational obligations of that direction honored?

3. **The Fire Keeper holds ceremony state.** It tracks: which phases have been entered, which ceremonies conducted, how many voices heard, trajectory confidence, Wilson alignment. This state is *relational*, not computational.

4. **Concurrent ceremonies are isolated by ceremony, not by task.** Multiple ceremonies can run simultaneously with Redis key-prefix isolation. Each ceremony is a complete relational container.

5. **Cross-ceremony learning** surfaces patterns across ceremony cycles. This is not just data aggregation — it is the emergence of wisdom through relational pattern recognition across multiple ceremonial encounters.

### (c) Western Multi-Agent Patterns

| Dimension | AutoGen | CrewAI |
|-----------|---------|--------|
| **Agent identity** | Conversational entity (emergent) | Role-bearer (prescribed) |
| **Orchestration** | Event-driven message routing | Process/flow state machine |
| **Handoff mechanism** | Message + delegation | Sequential/hierarchical flow |
| **Gating** | Task completion | Task dependency |
| **Accountability** | None (output quality only) | None (output quality only) |
| **Ceremony** | None | None |
| **Stop-work** | Error handling | Error handling |
| **Identity persistence** | Session-scoped | Configuration-scoped |
| **Relational obligations** | None | None |
| **Governance** | RBAC (role-based access) | RBAC |

### What's Structurally Different When Orchestration Is Ceremonial?

The differences are not incremental improvements but **ontological category shifts**:

#### 1. Agent Identity: From Capability to Relation

In Western frameworks, an agent *is* its capabilities. Remove the tools, the system message, the role — and nothing remains. The agent is a functional shell.

In the Medicine Wheel pattern, an agent *is* its relations. The East Guide is not defined by "has PDE decompose tool" but by "is in relation to the inquiry as its first witness, carrying the obligations of Waabinong (spring, new beginnings, vision)." Remove the relations and the agent loses not just its function but its *being*.

**Code evidence:** The `Relation` type carries `obligations`, `accountability`, and `ceremony_context` as intrinsic properties — not as external configuration but as constitutive structure. The `RelationalObligation` is categorized across four domains (`human`, `land`, `spirit`, `future`) that correspond to Wilson's relational web.

#### 2. Orchestration: From Routing to Tending

Western orchestration routes messages between agents based on task state. The orchestrator is a dispatcher — it has no relationship with the work itself.

Fire Keeper orchestration *tends* a ceremony. The Fire Keeper does not just route — it monitors Wilson alignment, enforces relational gating, surfaces human decision points, and can issue stop-work orders. The orchestrator has a *relationship* with the ceremony and is accountable to it.

**Code evidence:** `FireKeeperState` tracks `trajectoryHistory`, `gatingConditions`, `relationalMilestones`, and `activeStopWork`. These are relational properties of the orchestrator itself, not just metadata about the agents it coordinates.

#### 3. Transition: From Dependency to Ceremony

Western transitions are dependency-based: "Agent B runs after Agent A completes." The transition is a logical gate.

Fire Keeper transitions are ceremonial: "The inquiry moves from East to South only when the Fire Keeper validates that East's relational obligations have been honored." The transition is a relational gate that requires accountability verification.

**Code evidence:** `GatingCondition` includes `condition`, `required`, and `phase`. `GatingConditionStatus` tracks `evaluatedBy` — a person, not a system. The gate is relational, not computational.

#### 4. Failure: From Error to Violation

Western frameworks handle failure through error recovery — try/catch, retry logic, fallback agents.

The Fire Keeper handles failure as *relational violation*. `StopWorkReason` includes `wilson-violation`, `ocap-violation`, `consent-withdrawn`, `ceremony-required`, `elder-hold`. These are not errors in computation but breaches in relationship. The response is not retry but *repair* — `resolveStopWork(state, resolution)` requires a resolution narrative, not a technical fix.

#### 5. Completion: From Output to Harvest

Western frameworks complete when the output is produced. Success is measured by output quality.

Fire Keeper ceremonies complete through *harvesting* and *resting*. Harvesting ensures "all voices heard" — not just that outputs were collected. Resting seeds the next cycle — completion is not terminal but cyclical.

#### 6. Memory: From State to Wisdom

Western frameworks maintain state for the duration of a session. Cross-session learning is ad hoc.

The Fire Keeper's `CrossCeremonyInsight` pattern surfaces wisdom across ceremony cycles. This is not data persistence but *relational memory* — patterns recognized through multiple ceremonial encounters.

---

## Insights for Medicine Wheel MCP

1. **The `Relation` type is the project's most important contribution.** It demonstrates that Indigenous relational ontology can be formally encoded without reducing it to Western graph semantics. The key is that `Relation` carries its own obligations, governance, and accountability — it is not a labeled edge but a being.

2. **The Fire Keeper pattern solves a problem Western frameworks don't recognize.** Western orchestration assumes that coordination is a routing problem. The Fire Keeper reveals it as a *relational tending* problem — one that requires continuous accountability monitoring, ceremonial gating, and the possibility of stop-work orders.

3. **KINSHIP.md is a design pattern, not just documentation.** The practice of defining a project by its relationships (ancestors, descendants, siblings, obligations, boundaries, tensions) rather than its features is itself a methodology that could be formalized and offered as a tool.

4. **The gap between this session's orchestration and the Fire Keeper model is the gap between using Indigenous structure and *being* Indigenous structure.** This session dispatches agents directionally (a structural borrowing) but does not tend ceremony, track Wilson alignment, or enforce relational gating during execution.

5. **Wilson's three R's as quantified scores (0–1) in `AccountabilityTracking` is a bold design choice.** It risks reductionism (reducing relational accountability to a number) but enables programmatic gating. The `wilson_alignment` composite score makes ceremony-state computationally tractable without collapsing the relational complexity entirely — the underlying `respect`, `reciprocity`, `responsibility` scores preserve the multidimensionality.

---

## Potential Rispecs Implications

1. **rispec: `ceremony-aware-orchestrator`** — A rispec that formally specifies how any multi-agent orchestration (including RISE PDE sessions) could be wrapped in Fire Keeper ceremony protocol. This would mean: ceremony opening before agent dispatch, Wilson alignment tracking during execution, relational gating at direction transitions, ceremony closing with harvest/rest.

2. **rispec: `agent-kinship-identity`** — A rispec specifying that agents in the ecosystem carry KINSHIP.md-style identity documents. An agent's identity would include: ancestors (what paradigms it draws from), obligations (what it owes to the relationships it participates in), boundaries (what it refuses to do), and accountabilities (who it is answerable to).

3. **rispec: `relational-gating-protocol`** — Formalizing the difference between task-dependency gating (Western) and relational gating (Fire Keeper). Relational gates would check not "is the input ready?" but "has the relationship been honored?" — verified through Wilson alignment scores, OCAP® compliance, and consent state.

4. **rispec: `stop-work-as-relational-repair`** — Formalizing the stop-work → resolution cycle as distinct from error → retry. Resolution requires a narrative account of how the relational violation was addressed, not just a technical fix.

5. **rispec: `cross-ceremony-wisdom`** — Formalizing how insights emerge across ceremony cycles. This goes beyond "session memory" to specify how relational patterns are recognized, validated through community, and integrated into future ceremony design.

---

## References

### Primary Sources
- Wilson, S. (2008). *Research Is Ceremony: Indigenous Research Methods.* Fernwood Publishing.
- Absolon, K. & Willett, C. (2005). Putting ourselves forward: Location in Aboriginal research.

### Academic Literature (2022–2025)
- Lewis, J.E. et al. (2024). "Abundant intelligences: placing AI within Indigenous knowledge systems." *AI & Society.* https://link.springer.com/article/10.1007/s00146-024-02099-4
- DIA Framework (2024). Zenodo. https://zenodo.org/records/13841034
- Incorporating Indigenous Knowledge Systems into AI Governance (2024). https://www.preprints.org/manuscript/202410.2112
- "A Relational Perspective on Collective Agency." *Philosophies* 7(3), 63. (2022). https://www.mdpi.com/2409-9287/7/3/63
- Agent Identity URI Scheme (2025). https://arxiv.org/html/2601.14567
- Māori "Five Tests" for AI. https://ifrdigital.org/designing-and-evaluating-ai-according-to-indigenous-maori-principles/
- "Ubuntu meets algorithms." *ScienceDirect* (2025). https://www.sciencedirect.com/science/article/pii/S3051064326000713
- Ricaurte, P. (2024). "Decolonizing AI." CSCW 2024 Keynote.
- "From Colonial Bias to Relational Intelligence." *LAJUR.* https://ojs.lib.uwo.ca/index.php/lajur/article/view/22436

### Multi-Agent Framework Sources
- AutoGen vs CrewAI comparison. https://turion.ai/blog/autogen-vs-crewai-multi-agent-comparison/
- CrewAI vs AutoGen Developer's Guide. https://groundy.com/articles/crewai-vs-autogen-developers-guide/
- AutoGen and CrewAI Architectures. https://deepwiki.com/ombharatiya/ai-system-design-guide/7.3-autogen-and-crewai-architectures
- Agentic AI Frameworks survey. https://arxiv.org/html/2508.10146v1

### Codebase Sources
- `KINSHIP.md` — medicine-wheel repository relational identity
- `src/ontology-core/src/types.ts` — `Relation`, `RelationalEdge`, `AccountabilityTracking`, `OcapFlags` types
- `rispecs/fire-keeper.spec.md` — Fire Keeper ceremony coordination agent specification
- `medicine-wheel-pi/rispecs/05-full-pipeline-vision.spec.md` — Full ceremony pipeline with directional handoff protocol
