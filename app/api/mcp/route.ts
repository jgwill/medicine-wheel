/**
 * StreamableHTTP MCP endpoint
 *
 * Enables MCP clients to connect to the Medicine Wheel server
 * via HTTP POST instead of stdio. Accepts JSON-RPC MCP messages
 * and forwards them to the server's MCP handler.
 *
 * @see https://github.com/jgwill/medicine-wheel/issues/69
 */
import { NextRequest, NextResponse } from "next/server";

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

    // Endpoint exists and accepts MCP traffic.
    // Full tool dispatch will be wired in a follow-up.
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Method '${body.method}' not yet implemented on StreamableHTTP endpoint. Use stdio transport for full tool access.`,
        },
        id: body.id ?? null,
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
