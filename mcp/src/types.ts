/**
 * Medicine Wheel MCP Server — Type Definitions
 *
 * Re-exported from @medicine-wheel/ontology-core.
 * MCP server-specific types (Tool, Resource, Prompt) kept local with `any`
 * for compatibility with existing handler signatures.
 */

export type {
  Direction,
  DirectionName,
  RelationalObligation,
  ObligationCategory,
  CeremonyGuidance,
  DirectionResponse,
  RelationalNode,
  RelationalEdge,
  Relation,
  OcapFlags,
  AccountabilityTracking,
  CeremonyType,
  CeremonyLog,
  NarrativeBeat,
  MedicineWheelCycle,
  NodeType,
  TensionPhase,
  StructuralTensionChart,
  ActionStep,
} from '@medicine-wheel/ontology-core';

/**
 * The filters `list_relational_nodes` and the `/api/nodes` route both accept.
 *
 * `type` is a closed enum of six and `direction` one of four, so neither can
 * name an artifact kind. Every kind the ecosystem invented — `chronicle_episode`,
 * `structured_plan`, `service`, `stc_chart` — entered through `metadata.kind`,
 * and containment through `metadata.parent_id`. Both stores implement
 * `getNodesFiltered` against this shape so the answer does not depend on which
 * backend is mounted.
 */
export interface NodeFilters {
  type?: string;
  direction?: string;
  /** `metadata.kind` — the open extension point beside the closed `type` enum. */
  kind?: string;
  /** `metadata.parent_id` — containment, e.g. every episode under a chronicle root. */
  parent_id?: string;
}

// MCP server-specific types — kept local with `any` for handler compatibility
export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: any;
}

export interface Prompt {
  name: string;
  description: string;
  arguments?: any[];
  handler: (args: any) => Promise<any>;
}
