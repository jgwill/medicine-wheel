#!/usr/bin/env node

import { readFileSync } from "fs";
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

import { allTools } from "./all-tools.js";
import { resources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";
import { getJsonlStore } from "./jsonl-store.js";
import { missingRequired } from "./validate-args.js";

// Single source of truth: derive name/version from package.json so the
// serverInfo advertised over MCP never drifts from the published version.
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as { name: string; version: string };

const server = new Server(
  {
    name: pkg.name,
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

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

  const args = (request.params.arguments || {}) as Record<string, unknown>;
  const missing = missingRequired(tool.inputSchema, args);
  if (missing.length) {
    return {
      content: [{ type: "text", text: JSON.stringify({
        status: "error",
        error: `${tool.name} requires ${missing.join(", ")}`,
        missing,
      }, null, 2) }],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(args);
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
  console.error(`🌿 ${pkg.name} server v${pkg.version} initializing...`);
  // `createStore` already named the backend it chose — an HTTP store prints the
  // URL its writes leave for. A second, unconditional line claiming the local
  // JSONL store contradicted it, and an operator who believed it thought writes
  // were staying on disk while they were reaching a server. Say it once, here,
  // and only when nothing else did.
  if (!process.env.MW_API_URL?.trim()) {
    console.error(`📂 Using JSONL file-backed store (${getJsonlStore().dataDir})`);
  }
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
