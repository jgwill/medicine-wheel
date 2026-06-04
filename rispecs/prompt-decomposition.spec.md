# prompt-decomposition — RISE Specification

> Ontology-enriched prompt decomposition engine — intent extraction, Four Directions classification, relational dependency mapping, ceremony-aware action stacking, and narrative beat generation.

**Version:** 0.2.0  
**Package:** `@medicine-wheel/prompt-decomposition`  
**Document ID:** rispec-prompt-decomposition-v1  
**Last Updated:** 2026-06-04  
**Companion spec:** [`decomposition-strategies.spec.md`](./decomposition-strategies.spec.md) — optional strategy layer (multi-pass & dual-framing depth on demand)  

---

## Desired Outcome

Users create **ontologically grounded task decompositions** where:
- Every prompt is classified across the Four Directions (vision, analysis, validation, action)
- Implicit intents are surfaced from hedging language ("probably", "somehow", "I assume")
- Dependencies are mapped between tasks with directional inference
- Ceremony is recommended when directional balance is poor
- Action stacks are ordered by direction flow (East → South → West → North)
- Narrative beats are generated for each action, ready for the narrative-engine

---

## Creative Intent

**What this enables:** Complex prompts become structured, relationally accountable work plans. An LLM receiving a decomposition knows not just *what* to do, but which direction each task serves, what relational obligations it carries, and whether ceremony is needed before proceeding.

**Structural Tension:** Between flat to-do lists (Western task management) and Four Directions awareness (each task serves a different ceremonial role). Classification into directions naturally surfaces neglected perspectives, resolving the tension between flat lists and directional awareness — each task settles into the direction it serves.

**Depth on demand:** A focused prompt resolves on this deterministic foundation instantly and reproducibly. When a prompt carries many interleaved concerns or rests on unstated assumptions, an optional strategy layer (see [`decomposition-strategies.spec.md`](./decomposition-strategies.spec.md)) lets the decomposition advance to greater depth through multi-pass elaboration or dual-framing reconciliation — every strategy emitting this same enriched decomposition shape.

**Lineage:** `mcp-pde` → `ava-langchain-prompt-decomposition` → `@medicine-wheel/prompt-decomposition`

---

## MedicineWheelDecomposer

### Construction

```typescript
const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,       // Extract implicit intents from hedging
  mapDependencies: true,       // Infer task dependencies
  ceremonyThreshold: 0.3,     // Below this, ceremony is recommended
});
```

### Decomposition

```typescript
const result = decomposer.decompose(prompt);
// Returns: OntologicalDecomposition
```

### Four-Phase Pipeline

1. **EAST (Classification):** Keyword-based directional scoring, intent extraction with action verb matching, hedging language detection
2. **SOUTH (Enrichment):** Direction inference for each intent, relational obligation assignment, dependency mapping between directions
3. **WEST (Assessment):** Balance scoring, ceremony need detection, ambiguity flagging, Wilson alignment computation
4. **NORTH (Action):** Topological sort by direction flow, action stack generation, narrative beat creation

---

## Direction Keywords

| Direction | Keywords |
|-----------|----------|
| East (Vision) | vision, goal, purpose, intention, want, need, desire, dream, imagine, envision, create, build, design |
| South (Analysis) | learn, research, investigate, understand, study, analyze, explore, discover, examine, dependency, context |
| West (Validation) | test, verify, validate, check, ensure, confirm, reflect, review, audit, ceremony, accountable, consent |
| North (Action) | implement, execute, deploy, run, build, code, script, install, configure, setup, write, ship, commit |

---

## Decomposition Result

```typescript
interface OntologicalDecomposition {
  id: string;
  timestamp: string;
  prompt: string;
  primary: PrimaryIntent;
  secondary: RelationalIntent[];
  context: ExtractionContext;
  outputs: ExpectedOutputs;
  directions: Record<DirectionName, OntologicalDirection>;
  actionStack: ActionItem[];
  ambiguities: AmbiguityFlag[];
  balance: number;                    // 0–1, directional evenness
  leadDirection: DirectionName;
  neglectedDirections: DirectionName[];
  ceremonyGuidance: CeremonyGuidance | null;
  ceremonyRequired: boolean;
  wilsonAlignment: number;
  narrativeBeats: NarrativeBeat[];
}
```

### Relational Intent (enriched secondary intent)

```typescript
interface RelationalIntent {
  id: string;
  action: string;
  target: string;
  implicit: boolean;
  dependency: string | null;
  confidence: number;
  direction: DirectionName;
  obligations: RelationalObligation[];
  wilsonAlignment: number;
}
```

### Ontological Direction

```typescript
interface OntologicalDirection {
  name: DirectionName;
  ojibwe: string;          // Ojibwe name
  season: string;          // Associated season
  act: number;             // Narrative act (1–4)
  insights: DirectionalInsight[];
  obligations: RelationalObligation[];
  ceremonyRecommended: boolean;
}
```

---

## RelationalEnricher

Post-decomposition enrichment with graph data:

```typescript
const enricher = new RelationalEnricher();
const result = enricher.enrich(decomposition, {
  nodes: relationalNodes,
  edges: relationalEdges,
  relations: firstClassRelations,
});

// Returns: EnrichmentResult
{
  decomposition: OntologicalDecomposition,  // Updated Wilson scores
  mappings: IntentNodeMapping[],             // Intent → graph node matches
  accountabilityGaps: AccountabilityGap[],   // Where creative energy naturally flows
  relationalHealth: number,                  // 0–1 composite score
}
```

---

## Exports

The package provides two entry points to support both Node.js and browser environments:

### Default Entry (`@medicine-wheel/prompt-decomposition`)

Full-featured entry including storage (requires Node.js `fs` and `path`):

```typescript
// Decomposition engine
export { MedicineWheelDecomposer } from './decomposer';
export { RelationalEnricher } from './enricher';

// Storage (Node.js only — uses node:fs)
export { saveDecomposition, loadDecomposition, listDecompositions, decompositionToMarkdown } from './storage';

// Types
export type { OntologicalDecomposition, RelationalIntent, OntologicalDirection, ... } from './types';
```

### Browser Entry (`@medicine-wheel/prompt-decomposition/browser`)

Storage-free entry for browser bundles — excludes all `node:fs` / `node:path` usage:

```typescript
// Decomposition engine (same as default)
export { MedicineWheelDecomposer } from './decomposer';
export { RelationalEnricher } from './enricher';

// Types (same as default)
export type { OntologicalDecomposition, RelationalIntent, OntologicalDirection, ... } from './types';
```

Use the `./browser` export when bundling for environments without Node.js built-ins (e.g., Vite, webpack, Next.js client).

---

## Storage

```typescript
saveDecomposition(workdir, result): StoredDecomposition
// Saves to .pde/{id}.json and .pde/{id}.md

loadDecomposition(workdir, id): StoredDecomposition | null
listDecompositions(workdir): StoredDecomposition[]
decompositionToMarkdown(result): string
// Git-diffable markdown with Four Directions table, balance, action stack
```

---

## Dependencies

- **Runtime:** `@medicine-wheel/ontology-core` ^0.1.0
- **Node.js:** `node:fs`, `node:path` (for storage — excluded from `./browser` entry)
- **Types consumed:** `DirectionName`, `RelationalObligation`, `CeremonyGuidance`, `NarrativeBeat`, `AccountabilityTracking`
- **Constants consumed:** `DIRECTIONS`, `DIRECTION_ACTS`, `OJIBWE_NAMES`, `DIRECTION_SEASONS`
- **Functions consumed:** `computeWilsonAlignment`, `findAccountabilityGaps`

---

## Strategy Layer (Depth on Demand)

The four-phase deterministic pipeline above is the **default foundation** — synchronous, reproducible, and model-free. Beside it, an optional **strategy layer** lets a caller choose how deeply a given prompt is decomposed, without changing the result shape.

- **Behavior:** Selecting no strategy is identical to today's deterministic decomposition (the `heuristic` strategy). Every current caller's behavior is preserved exactly.
- **Behavior:** Selecting an LLM-backed strategy (`llm-standard`, `iterative-refinement`, or `adversarial-consensus`) runs an asynchronous strategy runner that advances the decomposition to greater depth — multi-pass elaboration or dual-framing reconciliation — and returns the same enriched decomposition shape alongside a pass trace and any warnings.
- **Behavior:** Because every strategy emits the identical `OntologicalDecomposition`, the `RelationalEnricher`, narrative-beat generation, ceremony guidance, and storage all read either path without change.

The full strategy framework — strategy identity, execution context, the three LLM-backed strategies, MCP manifestation, and trace/OCAP persistence policy — is specified in its companion: [`decomposition-strategies.spec.md`](./decomposition-strategies.spec.md).

---

## Creative Advancement Scenarios

**Creative Advancement Scenario:** A complex prompt becomes a balanced decomposition
**Desired Outcome:** A developer wants "Build a user management service, and probably add audit logging" turned into a relationally accountable work plan.
**Current Reality:** The prompt mixes an explicit build intent with a hedged ("probably") secondary intent, and says nothing about validation.
**Natural Progression:** The EAST phase classifies intents and surfaces the hedged audit-logging intent as implicit; SOUTH infers each intent's direction and dependencies; WEST scores directional balance and notices West (validation) is neglected, inviting ceremony guidance; NORTH orders the action stack along the direction flow and generates narrative beats.
**Resolution:** A decomposition emerges that names both intents, foregrounds the neglected validation direction, and arrives ready for the narrative-engine.

**Creative Advancement Scenario:** Surfaced ambiguity invites ceremony
**Desired Outcome:** A team wants to know whether a prompt is ready to act on, or needs reflection first.
**Current Reality:** A prompt leans heavily on action language and barely touches vision or validation.
**Natural Progression:** Directional scoring reveals a strong lead direction and an uneven balance; balance awareness invites ceremony guidance before the action stack is acted upon.
**Resolution:** The team receives a decomposition whose ceremony guidance creates space for relational reflection, so the work advances from a grounded, balanced footing.

---

## Advancing Patterns

- **Four Directions as cognitive lens** — Every task is seen through vision, analysis, validation, and action
- **Implicit intent surfacing** — Hedging language becomes explicit task items
- **Ceremony as organizational tool** — Directional balance awareness invites ceremony guidance
- **Narrative-ready output** — Action stacks become narrative beats for the narrative-engine
- **Graph enrichment** — Decompositions connect to relational webs for accountability scoring

---

## Quality Criteria

- ✅ Creative Orientation: Prompts become relationally accountable work plans
- ✅ Structural Dynamics: Four-directional balance drives ceremony recommendations
- ✅ Implementation Sufficient: Complete class API, types, and storage documented
- ✅ Codebase Agnostic: Decomposer works on any text input
