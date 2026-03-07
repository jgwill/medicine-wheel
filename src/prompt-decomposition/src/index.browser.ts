/**
 * medicine-wheel-prompt-decomposition — Browser Entry
 *
 * Re-exports everything EXCEPT storage (which requires Node.js built-ins).
 * Use this entry when bundling for browser/edge environments.
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

// NOTE: Storage functions (saveDecomposition, loadDecomposition, etc.)
// are NOT exported here — they require Node.js built-in modules.
// Import from 'medicine-wheel-prompt-decomposition' (main entry) for server usage.
