---
title: "Decomposing Real Prompts"
description: "Use prompt decomposition on practical requests, persist the result, and enrich it with graph context."
---

This guide focuses on realistic requests rather than toy prompts. The goal is to inspect what the decomposer actually produces and how to decide whether the result is balanced enough to proceed.

<Steps>
<Step>
### Create the decomposer

```ts
import { MedicineWheelDecomposer } from 'medicine-wheel-prompt-decomposition';

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3,
});
```

</Step>
<Step>
### Decompose a prompt with mixed intent

```ts
const result = decomposer.decompose(`
  Read the public exports, document the architecture, verify the examples,
  and produce API reference pages for the most important modules.
`);

console.log(result.primary);
console.log(result.balance);
console.log(result.neglectedDirections);
console.log(result.ceremonyRequired);
```

</Step>
<Step>
### Persist the result for review

```ts
import { saveDecomposition, decompositionToMarkdown } from 'medicine-wheel-prompt-decomposition';

const stored = saveDecomposition(process.cwd(), result);
console.log(stored.markdownPath);
console.log(decompositionToMarkdown(result));
```

</Step>
<Step>
### Enrich it with relational context

```ts
import { RelationalEnricher } from 'medicine-wheel-prompt-decomposition';

const enricher = new RelationalEnricher();

const enriched = enricher.enrich(result, {
  nodes,
  edges,
  relations,
});

console.log(enriched.mappings);
console.log(enriched.accountabilityGaps);
console.log(enriched.relationalHealth);
```

</Step>
</Steps>

Complete runnable example:

```ts
import {
  MedicineWheelDecomposer,
  RelationalEnricher,
  detectEpistemicSource,
} from 'medicine-wheel-prompt-decomposition';

const decomposer = new MedicineWheelDecomposer({
  extractImplicit: true,
  mapDependencies: true,
  ceremonyThreshold: 0.3,
});

const result = decomposer.decompose(
  'Research the exported modules, implement the docs pages, validate the examples, and publish the final output.'
);

console.log(result.actionStack.map((item) => [item.direction, item.text]));
console.log(detectEpistemicSource('implement a new function and validate the API'));

const enricher = new RelationalEnricher();
const enriched = enricher.enrich(result, { nodes, edges, relations });

console.log(enriched.relationalHealth);
```

The review loop is the important part. If `ceremonyRequired` is `true`, or if the enricher returns multiple `accountabilityGaps`, treat the decomposition as a draft that still needs context or governance before execution.

Two practical heuristics help in real projects:

- If `leadDirection` is `north` and `neglectedDirections` includes `east` or `west`, the prompt is usually rushing toward implementation before vision or validation has been made explicit.
- If many `secondary` intents are implicit, rewrite the original prompt before you automate anything downstream. The decomposer will still return a valid structure, but the ambiguity is now documented rather than resolved.
