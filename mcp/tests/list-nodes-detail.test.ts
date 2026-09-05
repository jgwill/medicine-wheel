/**
 * `list_relational_nodes` — a listing is for choosing, not for carrying prose.
 *
 * Removing the silent 100-row cap on 2026-09-03 fixed one defect and exposed
 * another that it had been hiding: a complete read of the chronicle's 84
 * episodes with full node bodies is ~73,500 characters, which overruns the
 * MCP tool-result limit. The caller's answer arrives spilled to a file it then
 * has to read back — found by a test agent exercising the published 4.7.0, not
 * by any test in this repo.
 *
 * The same 84 episodes in summary form are ~25,800 characters: 35% of full, and
 * readable in place.
 *
 * @see mcp/src/tools/discovery.ts
 */

import { describe, expect, it } from 'vitest';
import { allTools } from '../src/all-tools.js';

const listNodes = allTools.find((t) => t.name === 'list_relational_nodes');

describe('list_relational_nodes detail modes', () => {
  it('is registered and offers both detail modes', () => {
    expect(listNodes).toBeDefined();
    const schema = listNodes!.inputSchema as {
      properties: { detail?: { enum?: string[] } };
    };
    expect(schema.properties.detail?.enum).toEqual(['summary', 'full']);
  });

  it('names the size problem in the schema, so an agent can avoid it', () => {
    const schema = listNodes!.inputSchema as {
      properties: { detail?: { description?: string } };
    };
    const description = schema.properties.detail?.description ?? '';
    // The reason `summary` is the default has to travel with the parameter. An
    // agent reads the schema and nothing else before choosing.
    expect(description).toMatch(/summary/i);
    expect(description).toMatch(/full/i);
    expect(description).toMatch(/tool-result limit|overruns/i);
  });

  it('defaults to summary rather than full', () => {
    const schema = listNodes!.inputSchema as {
      properties: { detail?: { description?: string } };
    };
    expect(schema.properties.detail?.description).toMatch(/summary \(default\)/i);
  });

  it('every listing tool that can return a whole collection caps or projects', () => {
    // A tool that can return an unbounded collection at full fidelity is the
    // shape that produced this bug. Each of these must either take a `limit`
    // with a default, or offer a projection.
    const collectionTools = [
      'list_relational_nodes',
      'list_edges',
      'list_ceremonies',
      'list_narrative_beats',
    ];

    for (const name of collectionTools) {
      const tool = allTools.find((t) => t.name === name);
      expect(tool, name).toBeDefined();
      const schema = tool!.inputSchema as {
        properties: Record<string, { description?: string }>;
      };
      const bounded = 'limit' in schema.properties || 'detail' in schema.properties;
      expect(bounded, `${name} can return an unbounded collection`).toBe(true);
    }
  });
});
