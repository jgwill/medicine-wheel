/**
 * StreamableHTTP MCP endpoint
 *
 * Enables MCP clients to connect to the Medicine Wheel server
 * via HTTP POST instead of stdio. Accepts JSON-RPC MCP messages
 * and dispatches them to the same tool/resource/prompt registry
 * that the stdio transport uses.
 *
 * Supported methods:
 *   - tools/list   → lists all registered MCP tools
 *   - tools/call   → invokes a tool by name with arguments
 *
 * @see https://github.com/jgwill/medicine-wheel/issues/69
 */
import { NextRequest, NextResponse } from "next/server";
import { allTools } from "@medicine-wheel/mcp/all-tools";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.jsonrpc || body.jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request: expected JSON-RPC 2.0",
          },
          id: body.id ?? null,
        },
        { status: 400 }
      );
    }

    const { method, params, id } = body;

    // ── tools/list ──
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          tools: allTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
        id: id ?? null,
      });
    }

    // ── tools/call ──
    if (method === "tools/call") {
      const toolName = params?.name;
      const tool = allTools.find((t) => t.name === toolName);
      if (!tool) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: `Unknown tool: ${toolName}`,
          },
          id: id ?? null,
        });
      }

      try {
        const result = await tool.handler(params?.arguments || {});
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              { type: "text", text: JSON.stringify(result, null, 2) },
            ],
          },
          id: id ?? null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: errorMessage,
                    direction:
                      "Please ensure all required parameters are provided",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          },
          id: id ?? null,
        });
      }
    }

    // ── Unsupported method ──
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Method '${method}' is not supported. Available: tools/list, tools/call`,
        },
        id: id ?? null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null,
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "available",
    transport: "StreamableHTTP",
    description:
      "Medicine Wheel MCP StreamableHTTP endpoint. Send JSON-RPC 2.0 POST requests to interact.",
    capabilities: ["tools", "resources", "prompts"],
  });
}
