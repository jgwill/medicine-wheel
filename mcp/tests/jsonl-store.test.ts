/**
 * JsonlStore Persistence Robustness
 *
 * The Web UI and the MCP server write the same .mw/store/*.jsonl files. These
 * tests pin the behaviours that keep one process from serving a stale or
 * damaged view of what the other wrote.
 *
 * @see mcp/src/jsonl-store.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonlStore } from '../src/jsonl-store.js';

let dataDir: string;
let consoleError: ReturnType<typeof vi.spyOn>;

function node(id: string, name: string) {
  return {
    id,
    type: 'human',
    name,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  };
}

function writeLines(file: string, records: unknown[]): void {
  fs.writeFileSync(file, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
}

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-jsonl-'));
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  consoleError.mockRestore();
});

describe('JsonlStore cache invalidation', () => {
  it('sees an external rewrite that lands on the same mtime', () => {
    const store = new JsonlStore(dataDir);
    const file = path.join(dataDir, 'nodes.jsonl');

    // A timestamp the filesystem can store exactly, so the rewrite below is
    // indistinguishable from the first write by mtime alone.
    const frozen = new Date(Math.floor(Date.now() / 1000) * 1000);

    writeLines(file, [node('n1', 'Elder')]);
    fs.utimesSync(file, frozen, frozen);
    expect(store.getAllNodes()).toHaveLength(1); // loads and stamps the file

    // The Web UI rewrites the same file. A same-millisecond write, or any
    // mount with coarse timestamp granularity, looks exactly like this.
    writeLines(file, [node('n1', 'Elder'), node('n2', 'Youth Circle')]);
    fs.utimesSync(file, frozen, frozen);
    expect(fs.statSync(file).mtimeMs).toBe(frozen.getTime());

    expect(store.getAllNodes()).toHaveLength(2);
    expect(store.getNode('n2')?.name).toBe('Youth Circle');
  });
});

describe('JsonlStore corruption windows', () => {
  it('survives a half-written final line and does not resurrect it on write', () => {
    const store = new JsonlStore(dataDir);
    const file = path.join(dataDir, 'nodes.jsonl');

    // A writer killed mid-append leaves a truncated JSON object behind.
    fs.writeFileSync(
      file,
      JSON.stringify(node('n1', 'Elder')) + '\n' + '{"id":"n2","type":"hum',
      'utf-8'
    );

    expect(store.getAllNodes().map(n => n.id)).toEqual(['n1']);

    store.createNode(node('n3', 'Sacred River'));

    const reread = new JsonlStore(dataDir);
    expect(reread.getAllNodes().map(n => n.id).sort()).toEqual(['n1', 'n3']);
    for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
      if (line.trim()) expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('creates a missing data directory rather than failing the first write', () => {
    const nested = path.join(dataDir, 'deep', 'store');
    const store = new JsonlStore(nested);

    store.createNode(node('n1', 'Elder'));

    expect(fs.existsSync(path.join(nested, 'nodes.jsonl'))).toBe(true);
    expect(new JsonlStore(nested).getAllNodes()).toHaveLength(1);
  });

  it('merges a concurrent writer instead of clobbering it', () => {
    const a = new JsonlStore(dataDir);
    const b = new JsonlStore(dataDir);

    a.createNode(node('n1', 'Elder'));
    b.createNode(node('n2', 'Youth Circle'));

    expect(new JsonlStore(dataDir).getAllNodes().map(n => n.id).sort()).toEqual(['n1', 'n2']);
  });
});
