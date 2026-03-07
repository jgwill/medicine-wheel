/**
 * Medicine Wheel MCP Server — Type Definitions
 *
 * Re-exported from @medicine-wheel/ontology-core (medicine-wheel-ontology-core).
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
} from 'medicine-wheel-ontology-core';

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
