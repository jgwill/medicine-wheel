/**
 * medicine-wheel-prompt-decomposition
 *
 * Ontology-enriched Prompt Decomposition Engine for the Medicine Wheel
 * Developer Suite. Bridges the ava-langchain-prompt-decomposition primitives
 * with medicine-wheel-ontology-core types.
 *
 * Architecture:
 * - MedicineWheelDecomposer: heuristic decomposer grounded in Four Directions
 * - RelationalEnricher: enriches decompositions with relational-query traversal
 * - Storage: .pde/ persistence (JSON + Markdown)
 * - Types: ontology-enriched PDE types (OntologicalDecomposition, RelationalIntent, etc.)
 *
 * Lineage: mcp-pde → ava-langchain-prompt-decomposition → medicine-wheel-prompt-decomposition
 */

// Types
export type {
  Urgency,
  PrimaryIntent,
  SecondaryIntent,
  ExtractionContext,
  AmbiguityFlag,
  ExpectedOutputs,
  DirectionalInsight,
  OntologicalDirection,
  RelationalIntent,
  OntologicalDependency,
  OntologicalDecomposition,
  ActionItem,
  StoredDecomposition,
  DecomposerOptions,
} from './types.js';

// Decomposer
export { MedicineWheelDecomposer } from './decomposer.js';

// Relational Enricher
export {
  RelationalEnricher,
  type RelationalGraph,
  type EnrichmentResult,
  type IntentNodeMapping,
  type AccountabilityGap,
} from './relational_enricher.js';

// Storage
export {
  saveDecomposition,
  loadDecomposition,
  listDecompositions,
  decompositionToMarkdown,
} from './storage.js';
