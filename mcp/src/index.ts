#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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
import { resources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";

const server = new Server(
  {
    name: "medicine-wheel-mcp",
    version: "4.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

const allTools = [
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
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = allTools.find((t) => t.name === request.params.name);
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);

  try {
    const result = await tool.handler(request.params.arguments || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: errorMessage, direction: "Please ensure all required parameters are provided" }, null, 2) }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resource = resources.find((r) => r.uri === request.params.uri);
  if (!resource) throw new Error(`Resource not found: ${request.params.uri}`);
  return {
    contents: [{ uri: resource.uri, mimeType: resource.mimeType || "application/json", text: JSON.stringify(resource.content, null, 2) }],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map((p) => ({ name: p.name, description: p.description, arguments: p.arguments })),
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompt = prompts.find((p) => p.name === request.params.name);
  if (!prompt) throw new Error(`Prompt not found: ${request.params.name}`);
  const messages = await prompt.handler(request.params.arguments || {});
  return { messages };
});

async function main() {
  console.error("🌿 Medicine Wheel MCP Server v4.0 initializing...");
  console.error("📂 Using JSONL file-backed store (.mw/store/)");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Medicine Wheel MCP Server running on stdio");
  console.error("🌅 East | 🌞 South | 🌄 West | 🌌 North");
  console.error("All my relations 🌿");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
