---
title: "Prompt Decomposition API"
description: "API reference for medicine-wheel-prompt-decomposition."
---

Source files: `src/prompt-decomposition/src/decomposer.ts`, `src/prompt-decomposition/src/relational_enricher.ts`, `src/prompt-decomposition/src/storage.ts`, `src/prompt-decomposition/src/types.ts`.

## Import Paths

```ts
import { MedicineWheelDecomposer, RelationalEnricher, saveDecomposition } from 'medicine-wheel-prompt-decomposition';
import { MedicineWheelDecomposer as BrowserDecomposer } from 'medicine-wheel-prompt-decomposition/browser';
```

The browser entry omits Node-based storage helpers.

## `MedicineWheelDecomposer`

```ts
class MedicineWheelDecomposer {
  constructor(options?: DecomposerOptions)
  decompose(prompt: string): OntologicalDecomposition
}
```

Options:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `extractImplicit` | `boolean` | `true` | Include intents inferred from hedging language. |
| `mapDependencies` | `boolean` | `true` | Link related research, action, and validation tasks. |
| `ceremonyThreshold` | `number` | `0.3` | Minimum ceremonial presence before guidance is required. |
| `workdir` | `string` | optional | Working directory for `.pde` storage. |

## Relational Enrichment

```ts
class RelationalEnricher {
  enrich(decomposition: OntologicalDecomposition, graph: RelationalGraph): EnrichmentResult
}
```

Supporting exports:

```ts
saveDecomposition(workdir: string, result: OntologicalDecomposition): StoredDecomposition
loadDecomposition(workdir: string, id: string): StoredDecomposition | null
listDecompositions(workdir: string): StoredDecomposition[]
decompositionToMarkdown(result: OntologicalDecomposition): string
detectEpistemicSource(text: string): EpistemicSourceHint
```

Example:

```ts
const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
});

const result = decomposer.decompose('Read the exports, write docs, and validate the examples.');
console.log(result.actionStack);
console.log(result.ceremonyRequired);
```

Combined pattern:

```ts
const enricher = new RelationalEnricher();
const enriched = enricher.enrich(result, { nodes, edges, relations });
saveDecomposition(process.cwd(), enriched.decomposition);
```

The most useful result fields to inspect are `secondary`, `actionStack`, `balance`, `neglectedDirections`, `ceremonyGuidance`, `ambiguities`, and `narrativeBeats`.

If you are deciding between the main and browser entries, the split is simple:

- use `medicine-wheel-prompt-decomposition` on the server when you need `.pde` persistence helpers
- use `medicine-wheel-prompt-decomposition/browser` in browser or edge bundles where Node built-ins are unavailable

The implementation detail that matters most is that `RelationalEnricher` only enriches what it can map. If an intent does not match a node in `src/prompt-decomposition/src/relational_enricher.ts`, it stays structurally valid but relationally thin, which is why `accountabilityGaps` and `relationalHealth` are worth checking before you execute the action stack.
