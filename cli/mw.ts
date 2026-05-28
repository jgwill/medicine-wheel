#!/usr/bin/env node

/**
 * mw — Medicine Wheel CLI
 *
 * Talks to the running HTTP server by default (MW_API_URL).
 * Falls back to MCP via JSON-RPC (node mcp/dist/index.js).
 *
 * Usage:  mw <command> [args...]
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ── Config ────────────────────────────────────────────────────────
const MW_API_URL = process.env.MW_API_URL ?? 'http://localhost:3940';
const MW_FORMAT = process.env.MW_FORMAT ?? 'pretty';

function resolvePackageRoot(): string {
  try {
    const scriptDir = path.dirname(fs.realpathSync(process.argv[1]));
    return path.resolve(scriptDir, '..', '..');
  } catch {
    return process.cwd();
  }
}

function resolveMcpPath(): string {
  if (process.env.MW_MCP_PATH) return process.env.MW_MCP_PATH;
  const packageRoot = resolvePackageRoot();

  try {
    const scriptDir = path.dirname(fs.realpathSync(process.argv[1]));
    // dist/cli/mw.js → ../../mcp/dist/index.js
    const fromScript = path.resolve(scriptDir, '..', '..', 'mcp', 'dist', 'index.js');
    if (fs.existsSync(fromScript)) return fromScript;
  } catch { /* ignore */ }

  const fromCwd = path.join(process.cwd(), 'mcp', 'dist', 'index.js');
  if (fs.existsSync(fromCwd)) return fromCwd;

  // Optional installed @medicine-wheel/mcp package, if available.
  const fromModules = path.join(
    packageRoot, 'node_modules', '@medicine-wheel', 'mcp', 'dist', 'index.js',
  );
  if (fs.existsSync(fromModules)) return fromModules;

  try {
    return require.resolve('@medicine-wheel/mcp/dist/index.js', {
      paths: [packageRoot, process.cwd()],
    });
  } catch {
    // Fall through to empty result below.
  }

  return '';
}

const MW_MCP_PATH = resolveMcpPath();

// ── Colors ────────────────────────────────────────────────────────
const C = {
  east:  '\x1b[33m',
  south: '\x1b[31m',
  west:  '\x1b[34m',
  north: '\x1b[37m',
  green: '\x1b[32m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
  reset: '\x1b[0m',
};

// ── Arg parsing ───────────────────────────────────────────────────
interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      positional.push(...args.slice(i + 1));
      break;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ── HTTP API ──────────────────────────────────────────────────────
async function api(method: string, urlPath: string, body?: unknown): Promise<unknown> {
  const url = `${MW_API_URL}${urlPath}`;
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function checkApi(): Promise<boolean> {
  try {
    const res = await fetch(`${MW_API_URL}/api/directions`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── MCP JSON-RPC ──────────────────────────────────────────────────
function mcpRaw(rpcMethod: string, params: Record<string, unknown>): string {
  if (!MW_MCP_PATH) {
    console.error('Error: MCP server path not found. Set MW_MCP_PATH or use the HTTP server via MW_API_URL.');
    process.exit(1);
  }

  const req = JSON.stringify({ jsonrpc: '2.0', method: rpcMethod, params, id: 1 });
  const result = spawnSync('node', [MW_MCP_PATH], {
    input: req,
    encoding: 'utf8',
    timeout: 10000,
  });

  if (result.error) {
    console.error('MCP error:', result.error.message);
    return '';
  }
  return result.stdout?.trim() ?? '';
}

function mcpCall(toolName: string, args: Record<string, unknown>): void {
  const raw = mcpRaw('tools/call', { name: toolName, arguments: args });
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const text = data?.result?.content?.[0]?.text ?? raw;
    pp(text);
  } catch {
    pp(raw);
  }
}

// ── Pretty print ──────────────────────────────────────────────────
function pp(raw: string): void {
  if (MW_FORMAT === 'json') { console.log(raw); return; }
  if (MW_FORMAT === 'quiet') return;
  try {
    const data = JSON.parse(raw);
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(raw);
  }
}

function ppValue(val: unknown): void {
  pp(JSON.stringify(val));
}

// ── Help ──────────────────────────────────────────────────────────
function cmdHelp(): void {
  console.log(`
${C.bold}🌿 mw — Medicine Wheel CLI${C.reset}

  CEREMONY LIFECYCLE
    mw ceremony open <intention>           Open ceremony (starts in East)
    mw ceremony close <id> [summary]       Close ceremony
    mw ceremony list [--direction east]    List ceremonies
    mw ceremony get <id>                   Get ceremony by ID

  DIRECTIONS
    mw direction [east|south|west|north]   Show direction metadata
    mw directions                          Show all four directions

  CYCLES
    mw cycle create <research_question>    Create research cycle
    mw cycle list                          List all cycles
    mw cycle advance <id> <direction>      Advance cycle direction

  NODES
    mw node create <name> <type> <desc>    Create relational node
    mw node list [--type human] [--direction east]
    mw node get <id>                       Get node by ID
    mw node search <query>                 Search nodes

  NARRATIVE
    mw beat create <dir> <title> <desc>    Create narrative beat
    mw beat list [--direction east]        List beats
    mw arc <cycle_id>                      Get narrative arc

  STRUCTURAL TENSION
    mw chart create <outcome> <reality> <dir>        Create STC
    mw chart list [--direction east]                  List charts
    mw chart progress <id>                            Get progress
    mw mmot <chart_id> <expected> <actual> <analysis> MMOT review

  RELATIONS
    mw edge create <from> <to> <type>     Create edge
    mw edge list [--node <id>]            List edges
    mw web <node_id> [depth]              Relational web

  VALIDATION
    mw validate wilson <description>       Wilson paradigm check
    mw validate ocap <data_plan_json>      OCAP® compliance check
    mw validate accountability <plan_json> Accountability audit
    mw validate bridge <concept> [dir]     Two-Eyed Seeing bridge

  MEMORY
    mw memory store <key> <value> [dir]   Store relational memory

  SYSTEM
    mw status                              Show system status
    mw tools                               List all MCP tools
    mw help                                This help

  ENVIRONMENT
    MW_API_URL   API base URL (default: http://localhost:3940)
    MW_MCP_PATH  Optional MCP server path (auto-detected when locally available)
    MW_FORMAT    Output format: pretty (default), json, quiet
`);
}

// ── Status ────────────────────────────────────────────────────────
async function cmdStatus(): Promise<void> {
  console.log(`${C.bold}🌿 Medicine Wheel Status${C.reset}\n`);

  const apiOk = await checkApi();
  if (apiOk) {
    console.log(`  ${C.green}✓${C.reset} API: ${MW_API_URL}`);
  } else {
    console.log(`  ${C.south}✗${C.reset} API: ${MW_API_URL} (not reachable)`);
  }

  if (MW_MCP_PATH && fs.existsSync(MW_MCP_PATH)) {
    console.log(`  ${C.green}✓${C.reset} MCP: ${MW_MCP_PATH}`);
  } else {
    console.log(`  ${C.south}✗${C.reset} MCP: not found (set MW_MCP_PATH)`);
  }

  // Locate store relative to cwd
  const storeDir = process.env.MW_DATA_DIR
    ?? path.join(process.cwd(), '.mw', 'store');
  if (fs.existsSync(storeDir)) {
    const count = (file: string): number => {
      try {
        return fs.readFileSync(path.join(storeDir, file), 'utf8')
          .split('\n').filter(Boolean).length;
      } catch { return 0; }
    };
    console.log(`  ${C.green}✓${C.reset} Store: ${storeDir}`);
    console.log(
      `    ${C.dim}${count('nodes.jsonl')} nodes · ` +
      `${count('edges.jsonl')} edges · ` +
      `${count('ceremonies.jsonl')} ceremonies · ` +
      `${count('cycles.jsonl')} cycles · ` +
      `${count('beats.jsonl')} beats · ` +
      `${count('charts.jsonl')} charts${C.reset}`,
    );
  } else {
    console.log(`  ${C.south}✗${C.reset} Store: .mw/store/ not found`);
  }

  console.log('');
}

// ── Tools ─────────────────────────────────────────────────────────
function cmdTools(): void {
  const raw = mcpRaw('tools/list', {});
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const tools: Array<{ name: string; description: string }> = data?.result?.tools ?? [];
    console.log(`\n  ${C.bold}${tools.length} tools available:${C.reset}\n`);
    for (const t of tools) {
      const desc = t.description.length > 70
        ? t.description.slice(0, 67) + '...'
        : t.description;
      console.log(`  ${t.name.padEnd(42)} ${C.dim}${desc}${C.reset}`);
    }
    console.log('');
  } catch {
    pp(raw);
  }
}

// ── Ceremony ──────────────────────────────────────────────────────
async function cmdCeremony(
  positional: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'open':
      mcpCall('mw_ceremony_open', {
        intention: positional.slice(1).join(' ') || 'Opening ceremony',
      });
      break;
    case 'close':
      mcpCall('mw_ceremony_close', {
        ceremony_id: positional[1] ?? '',
        summary: positional.slice(2).join(' ') || 'Ceremony complete',
      });
      break;
    case 'get':
      mcpCall('get_ceremony', { ceremony_id: positional[1] ?? '' });
      break;
    case 'list': {
      const dir = flags['direction'] ?? flags['d'];
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        const params = dir ? `?direction=${dir}` : '';
        ppValue(await api('GET', `/api/ceremonies${params}`));
      } else {
        mcpCall('list_ceremonies', {});
      }
      break;
    }
    default:
      console.error(`Unknown ceremony sub-command: ${sub}`);
  }
}

// ── Direction ─────────────────────────────────────────────────────
async function cmdDirection(positional: string[]): Promise<void> {
  const dir = positional[0];
  if (!dir) { await cmdDirections(); return; }
  mcpCall('mw_get_direction', { direction: dir });
}

async function cmdDirections(): Promise<void> {
  const apiAvailable = await checkApi();
  if (apiAvailable) {
    const dirs = await api('GET', '/api/directions') as Array<{
      name: string; ojibwe: string; season: string;
      medicine?: string[]; teachings?: string[];
    }>;
    const icons: Record<string, string> = {
      east: '🌅', south: '🔥', west: '🌊', north: '❄️',
    };
    const colors: Record<string, string> = {
      east: C.east, south: C.south, west: C.west, north: C.north,
    };
    console.log('');
    for (const d of dirs) {
      const icon = icons[d.name] ?? '🌿';
      const color = colors[d.name] ?? C.reset;
      console.log(`  ${icon} ${color}${d.name.toUpperCase().padEnd(6)}${C.reset} (${d.ojibwe}) — ${d.season}`);
      if (d.medicine?.length) {
        console.log(`    ${C.dim}Medicine: ${d.medicine.join(', ')}${C.reset}`);
      }
      if (d.teachings?.length) {
        console.log(`    ${C.dim}${d.teachings.slice(0, 2).join(', ')}${C.reset}`);
      }
      console.log('');
    }
  } else {
    for (const d of ['east', 'south', 'west', 'north']) {
      mcpCall('mw_get_direction', { direction: d });
    }
  }
}

// ── Cycle ─────────────────────────────────────────────────────────
async function cmdCycle(positional: string[]): Promise<void> {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'create': {
      const question = positional.slice(1).join(' ');
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        ppValue(await api('POST', '/api/narrative/cycles', {
          research_question: question,
          current_direction: 'east',
        }));
      } else {
        mcpCall('create_research_cycle', {
          research_question: question,
          current_direction: 'east',
        });
      }
      break;
    }
    case 'list': {
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        const cycles = await api('GET', '/api/narrative/cycles') as Array<{
          id: string; research_question: string; current_direction?: string;
          wilson_alignment?: number; ocap_compliant?: boolean; archived?: boolean;
        }>;
        const icons: Record<string, string> = {
          east: '🌅', south: '🔥', west: '🌊', north: '❄️',
        };
        console.log('');
        for (const c of cycles) {
          const d = c.current_direction ?? 'east';
          const icon = icons[d] ?? '🌿';
          const archived = c.archived ? ' [archived]' : '';
          console.log(`  ${icon} ${c.id.slice(0, 30)}`);
          console.log(`    "${c.research_question}"`);
          console.log(`    Direction: ${d} · Wilson: ${c.wilson_alignment ?? 0} · OCAP: ${c.ocap_compliant ?? false}${archived}`);
          console.log('');
        }
      } else {
        mcpCall('list_cycles', {});
      }
      break;
    }
    case 'advance':
      mcpCall('update_cycle_direction', {
        cycle_id: positional[1] ?? '',
        new_direction: positional[2] ?? '',
      });
      break;
    case 'get':
      mcpCall('get_cycle', { cycle_id: positional[1] ?? '' });
      break;
    case 'arc':
      mcpCall('get_narrative_arc', { cycle_id: positional[1] ?? '' });
      break;
    default:
      console.error(`Unknown cycle sub-command: ${sub}`);
  }
}

// ── Node ──────────────────────────────────────────────────────────
async function cmdNode(
  positional: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'create': {
      const [, name, type, ...descParts] = positional;
      const desc = descParts.join(' ');
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        ppValue(await api('POST', '/api/nodes', { name, type, description: desc }));
      } else {
        mcpCall('create_relational_node', { name, type, description: desc });
      }
      break;
    }
    case 'list': {
      const type = flags['type'] ?? flags['t'];
      const dir = flags['direction'] ?? flags['d'];
      const params = new URLSearchParams();
      if (type && typeof type === 'string') params.set('type', type);
      if (dir && typeof dir === 'string') params.set('direction', dir);
      const query = params.toString() ? `?${params}` : '';
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        const nodes = await api('GET', `/api/nodes${query}`) as Array<{
          id: string; name: string; type?: string; direction?: string;
        }>;
        const icons: Record<string, string> = {
          human: '👤', land: '🌍', spirit: '✨',
          ancestor: '👴', future: '🌱', knowledge: '📚',
        };
        for (const n of nodes) {
          const icon = icons[n.type ?? ''] ?? '•';
          const dStr = n.direction ? ` [${n.direction}]` : '';
          console.log(`  ${icon} ${n.name}${dStr}`);
          console.log(`    ${n.id}`);
        }
        console.log(`\n  ${nodes.length} nodes`);
      } else {
        mcpCall('list_relational_nodes', {});
      }
      break;
    }
    case 'get':
      mcpCall('get_relational_node', { node_id: positional[1] ?? '' });
      break;
    case 'search':
      mcpCall('search_nodes', { query: positional.slice(1).join(' ') });
      break;
    default:
      console.error(`Unknown node sub-command: ${sub}`);
  }
}

// ── Beat ──────────────────────────────────────────────────────────
async function cmdBeat(positional: string[]): Promise<void> {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'create':
      mcpCall('create_narrative_beat', {
        direction: positional[1] ?? '',
        title: positional[2] ?? '',
        description: positional.slice(3).join(' '),
        learnings: [],
      });
      break;
    case 'list': {
      const apiAvailable = await checkApi();
      if (apiAvailable) {
        ppValue(await api('GET', '/api/narrative/beats'));
      } else {
        mcpCall('list_narrative_beats', {});
      }
      break;
    }
    default:
      console.error(`Unknown beat sub-command: ${sub}`);
  }
}

// ── Edge ──────────────────────────────────────────────────────────
function cmdEdge(
  positional: string[],
  flags: Record<string, string | boolean>,
): void {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'create':
      mcpCall('create_relational_edge', {
        from_node_id: positional[1] ?? '',
        to_node_id: positional[2] ?? '',
        relationship_type: positional[3] ?? '',
      });
      break;
    case 'list': {
      const node = flags['node'] ?? flags['n'];
      mcpCall('list_edges', node ? { node_id: node } : {});
      break;
    }
    default:
      console.error(`Unknown edge sub-command: ${sub}`);
  }
}

// ── Web ───────────────────────────────────────────────────────────
function cmdWeb(positional: string[]): void {
  const nodeId = positional[0] ?? '';
  const depth = parseInt(positional[1] ?? '2', 10);
  mcpCall('get_relational_web', { node_id: nodeId, depth });
}

// ── Chart / STC ───────────────────────────────────────────────────
function cmdChart(positional: string[]): void {
  const sub = positional[0] ?? 'list';

  switch (sub) {
    case 'create':
      mcpCall('create_structural_tension_chart', {
        desired_outcome: positional[1] ?? '',
        current_reality: positional[2] ?? '',
        direction: positional[3] ?? 'east',
      });
      break;
    case 'list':
      mcpCall('list_structural_tension_charts', {});
      break;
    case 'progress':
      mcpCall('get_chart_progress', { chart_id: positional[1] ?? '' });
      break;
    default:
      console.error(`Unknown chart sub-command: ${sub}`);
  }
}

// ── MMOT ──────────────────────────────────────────────────────────
function cmdMmot(positional: string[]): void {
  mcpCall('creator_moment_of_truth', {
    chart_id: positional[0] ?? '',
    expected_outcome: positional[1] ?? '',
    actual_outcome: positional[2] ?? '',
    analysis: positional[3] ?? '',
    adjustments: [],
    feedback_system: '',
  });
}

// ── Validate ──────────────────────────────────────────────────────
function cmdValidate(positional: string[]): void {
  const sub = positional[0] ?? 'wilson';

  switch (sub) {
    case 'wilson':
      mcpCall('wilson_paradigm_checker', {
        research_description: positional.slice(1).join(' '),
      });
      break;
    case 'ocap':
      mcpCall('ocap_compliance_checker', {
        data_plan: JSON.parse(positional[1] ?? '{}'),
      });
      break;
    case 'accountability':
      mcpCall('accountability_validator', {
        research_plan: JSON.parse(positional[1] ?? '{}'),
      });
      break;
    case 'bridge':
      mcpCall('two_eyed_seeing_bridge', {
        concept: positional[1] ?? '',
        direction: positional[2] ?? 'integrate_both',
      });
      break;
    default:
      console.error(`Unknown validate sub-command: ${sub}`);
  }
}

// ── Memory ────────────────────────────────────────────────────────
function cmdMemory(positional: string[]): void {
  const sub = positional[0] ?? 'store';

  switch (sub) {
    case 'store': {
      const args: Record<string, unknown> = {
        key: positional[1] ?? '',
        value: positional[2] ?? '',
      };
      if (positional[3]) args.direction = positional[3];
      mcpCall('mw_store_memory', args);
      break;
    }
    default:
      console.error(`Unknown memory sub-command: ${sub}`);
  }
}

// ── Main dispatch ─────────────────────────────────────────────────
async function main(): Promise<void> {
  const { flags, positional } = parseArgs(process.argv);

  if (flags['help'] || flags['h']) { cmdHelp(); return; }

  const cmd = positional[0] ?? 'help';
  const rest = positional.slice(1);

  switch (cmd) {
    case 'help':                          cmdHelp(); break;
    case 'status':                  await cmdStatus(); break;
    case 'tools':                         cmdTools(); break;
    case 'ceremony': case 'c':      await cmdCeremony(rest, flags); break;
    case 'direction': case 'dir':   await cmdDirection(rest); break;
    case 'directions': case 'dirs': await cmdDirections(); break;
    case 'cycle': case 'cy':        await cmdCycle(rest); break;
    case 'node': case 'n':          await cmdNode(rest, flags); break;
    case 'beat': case 'b':          await cmdBeat(rest); break;
    case 'edge': case 'e':                cmdEdge(rest, flags); break;
    case 'web': case 'w':                 cmdWeb(rest); break;
    case 'chart': case 'stc':             cmdChart(rest); break;
    case 'mmot':                          cmdMmot(rest); break;
    case 'validate': case 'v':            cmdValidate(rest); break;
    case 'memory': case 'mem':            cmdMemory(rest); break;
    case 'arc':
      mcpCall('get_narrative_arc', { cycle_id: rest[0] ?? '' });
      break;
    default:
      console.error(`${C.south}Unknown command: ${cmd}${C.reset}`);
      console.error("Run 'mw help' for usage.");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
