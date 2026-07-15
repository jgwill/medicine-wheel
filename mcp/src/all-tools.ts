/**
 * Aggregated tool registry — single import for all MCP tools.
 *
 * Used by both the stdio transport (index.ts) and the HTTP
 * StreamableHTTP endpoint (app/api/mcp/route.ts).
 */
import type { Tool } from "./types.js";

import { eastTools } from "./tools/east.js";
import { southTools } from "./tools/south.js";
import { westTools } from "./tools/west.js";
import { northTools } from "./tools/north.js";
import { validators } from "./validators/index.js";
import { integrationTools } from "./tools/integrations.js";
import { discoveryTools } from "./tools/discovery.js";
import { structuralTensionTools } from "./tools/structural-tension.js";
import { ceremonyLifecycleTools } from "./tools/ceremony-lifecycle.js";
import { epistemicTools } from "./tools/epistemic.js";
import { coordinationTools } from "./tools/coordination.js";
import { governanceTransformationTools } from "./tools/governance-transformation.js";
import { reasoningObservabilityTools } from "./tools/reasoning-observability.js";
import { inquiryWeaveTools } from "./tools/inquiry-weaves.js";
import { planPerspectiveTools } from "./tools/plan-perspectives.js";

export const allTools: Tool[] = [
  ...eastTools,
  ...southTools,
  ...westTools,
  ...northTools,
  ...validators,
  ...integrationTools,
  ...discoveryTools,
  ...structuralTensionTools,
  ...ceremonyLifecycleTools,
  ...epistemicTools,
  ...coordinationTools,
  ...governanceTransformationTools,
  ...reasoningObservabilityTools,
  ...inquiryWeaveTools,
  ...planPerspectiveTools,
];
