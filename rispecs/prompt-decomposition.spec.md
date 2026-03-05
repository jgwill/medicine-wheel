# prompt-decomposition — RISE Specification

> Ontology-enriched prompt decomposition engine — intent extraction, Four Directions classification, relational dependency mapping, ceremony-aware action stacking, and narrative beat generation.

**Version:** 0.1.0  
**Package:** `medicine-wheel-prompt-decomposition`  
**Document ID:** rispec-prompt-decomposition-v1  
**Last Updated:** 2026-02-23  

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

**Structural Tension:** Between flat to-do lists (Western task management) and Four Directions awareness (each task serves a different ceremonial role). The decomposer bridges these by classifying intents into directions and detecting neglected perspectives.

**Lineage:** `mcp-pde` → `ava-langchain-prompt-decomposition` → `medicine-wheel-prompt-decomposition`

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
  accountabilityGaps: AccountabilityGap[],   // Where attention is needed
  relationalHealth: number,                  // 0–1 composite score
}
```

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

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.0
- **Node.js:** `fs`, `path` (for storage)
- **Types consumed:** `DirectionName`, `RelationalObligation`, `CeremonyGuidance`, `NarrativeBeat`, `AccountabilityTracking`
- **Constants consumed:** `DIRECTIONS`, `DIRECTION_ACTS`, `OJIBWE_NAMES`, `DIRECTION_SEASONS`
- **Functions consumed:** `computeWilsonAlignment`, `findAccountabilityGaps`

---

## Advancing Patterns

- **Four Directions as cognitive lens** — Every task is seen through vision, analysis, validation, and action
- **Implicit intent surfacing** — Hedging language becomes explicit task items
- **Ceremony as organizational tool** — Poor directional balance triggers ceremony guidance
- **Narrative-ready output** — Action stacks become narrative beats for the narrative-engine
- **Graph enrichment** — Decompositions connect to relational webs for accountability scoring

---

## Quality Criteria

- ✅ Creative Orientation: Prompts become relationally accountable work plans
- ✅ Structural Dynamics: Four-directional balance drives ceremony recommendations
- ✅ Implementation Sufficient: Complete class API, types, and storage documented
- ✅ Codebase Agnostic: Decomposer works on any text input
