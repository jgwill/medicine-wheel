/**
 * The door itself — registering infrastructure through MCP and finding it again.
 *
 * `@medicine-wheel/infra` shipped its facets and was imported by nothing. These
 * tests exercise the tools end to end against a temporary JSONL store, because
 * the defect being closed was never "the types are wrong" — it was that no agent
 * could reach them.
 *
 * MW_API_URL is deleted before the store singleton is built. On this host it
 * points at the live chronicle wheel; a test suite that wrote there would be
 * registering fixtures into someone's actual estate.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const originalApiUrl = process.env.MW_API_URL;
const originalDataDir = process.env.MW_DATA_DIR;

let dataDir: string;
let tools: Map<string, (args: any) => Promise<any>>;

const call = (name: string, args: any = {}) => {
  const handler = tools.get(name);
  if (!handler) throw new Error(`tool ${name} is not registered`);
  return handler(args);
};

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-infra-tools-'));
  process.env.MW_DATA_DIR = dataDir;
  delete process.env.MW_API_URL;

  const { allTools } = await import('../src/all-tools.js');
  tools = new Map(allTools.map(t => [t.name, t.handler]));
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.MW_API_URL;
  else process.env.MW_API_URL = originalApiUrl;
  if (originalDataDir === undefined) delete process.env.MW_DATA_DIR;
  else process.env.MW_DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('the infrastructure tools are registered at all', () => {
  it('registers every tool the door needs', () => {
    for (const name of [
      'register_host', 'register_tenant', 'register_service',
      'detect_port_conflicts', 'hold_metis', 'list_infra_topology',
      'reconcile_infra_state',
    ]) {
      expect(tools.has(name), `${name} missing from allTools`).toBe(true);
    }
  });
});

describe('registration', () => {
  let hostId: string;
  let tenantId: string;
  let serviceId: string;

  it('registers a host as a land node carrying a validated facet', async () => {
    const result = await call('register_host', {
      hostname: 'eury', os: 'debian', reachable_via: ['tailnet'],
    });
    expect(result.status).toBe('created');
    expect(result.node.type).toBe('land');
    expect(result.node.metadata.kind).toBe('host');
    expect(result.facet.hostname).toBe('eury');
    hostId = result.node_id;
  });

  it('gives a host NO direction — the land is not a quadrant inside the wheel', async () => {
    const node = await call('get_relational_node', { node_id: hostId });
    expect(node.node.direction).toBeUndefined();
  });

  it('updates rather than duplicating when the same hostname is registered again', async () => {
    // Without this an agent re-running a provisioning step fills the wheel with
    // duplicate hosts, and every service then appears to collide with itself.
    const again = await call('register_host', { hostname: 'eury', os: 'debian 13' });
    expect(again.status).toBe('updated');
    expect(again.node_id).toBe(hostId);
    expect(again.facet.os).toBe('debian 13');
  });

  it('registers a tenant as a human node serving South', async () => {
    const result = await call('register_tenant', {
      account: 'ava', on_host: 'eury', linger: 'enabled', uid: 1001,
    });
    expect(result.status).toBe('created');
    expect(result.node.type).toBe('human');
    expect(result.node.direction).toBe('south');
    expect(result.facet.onHost).toBe(hostId);
    tenantId = result.node_id;
  });

  it('accepts a hostname where a host node id is expected', async () => {
    // The caller knows the machine by its name. Refusing that would make the
    // tool answerable only to something that had already called register_host.
    const result = await call('register_tenant', { account: 'gmusic', on_host: 'eury' });
    expect(result.status).toBe('created');
    expect(result.facet.onHost).toBe(hostId);
    expect(result.facet.linger).toBe('unknown'); // honest when nobody has looked
  });

  it('refuses a tenant on a host that was never registered', async () => {
    const result = await call('register_tenant', { account: 'nobody', on_host: 'atlantis' });
    expect(result.status).toBe('error');
    expect(result.message).toContain('atlantis');
  });

  it('registers a service as a knowledge node serving West', async () => {
    const result = await call('register_service', {
      unit: 'assembly-mux.service', owned_by: 'ava', scope: 'user',
      ports: [{ port: 9081, proto: 'tcp', host: 'eury' }],
      exec_stop: 'docker compose stop',
    });
    expect(result.status).toBe('created');
    expect(result.node.type).toBe('knowledge');
    expect(result.node.direction).toBe('west');
    expect(result.node.metadata.kind).toBe('service');
    expect(result.facet.ports[0].boundBy).toBe(result.node_id);
    serviceId = result.node_id;
  });

  it('falls back to the owning tenant’s host when a port names none', async () => {
    const result = await call('register_service', {
      unit: 'fallback.service', owned_by: 'gmusic', ports: [{ port: 4444 }],
    });
    expect(result.status).toBe('created');
    expect(result.facet.ports[0].host).toBe(hostId);
  });

  it('rejects a port outside 1-65535 and writes nothing', async () => {
    // A misparsed 0 would otherwise silently never collide with anything.
    const result = await call('register_service', {
      unit: 'bad.service', owned_by: 'ava', ports: [{ port: 0, host: 'eury' }],
    });
    expect(result.status).toBe('error');
    expect(result.issues.some((i: any) => i.field.includes('port'))).toBe(true);

    const topology = await call('list_infra_topology', { perspective: 'service' });
    expect(topology.services.some((s: any) => s.unit === 'bad.service')).toBe(false);
  });

  it('emits part-of and binds-port edges into the governed vocabulary', async () => {
    const web = await call('get_relational_web', {
      node_id: serviceId, depth: 1, edge_types: ['part-of', 'binds-port'],
    });
    const types = web.edges.map((e: any) => e.relationship_type);
    expect(types).toContain('part-of');
    expect(types).toContain('binds-port');
    expect(web.unregistered_edge_types).toBeUndefined();
  });

  it('names an edge type that is not in the governed registry', async () => {
    const web = await call('get_relational_web', {
      node_id: serviceId, depth: 1, edge_types: ['invented-edge'],
    });
    expect(web.unregistered_edge_types).toEqual(['invented-edge']);
  });
});

describe('what a re-registration must not destroy', () => {
  it('keeps métis and every other field when re-registered without them', async () => {
    // The defect this pins: rebuilding the facet from arguments alone silently
    // dropped whatever hold_metis had put there. A package whose reason to exist
    // is that the grid must not flatten what people know cannot let its most
    // ordinary operation delete it.
    const created = await call('register_host', { hostname: 'merge-probe', os: 'debian', reachable_via: ['tailnet'] });
    await call('hold_metis', {
      node_id: created.node_id, held_by: 'William', exceptions: ['restart twice'],
    });

    const again = await call('register_host', { hostname: 'merge-probe' });
    expect(again.status).toBe('updated');
    expect(again.facet.metis.heldBy).toBe('William');
    expect(again.facet.metis.exceptions).toEqual(['restart twice']);
    expect(again.facet.os).toBe('debian');
    expect(again.facet.reachableVia).toEqual(['tailnet']);
  });

  it('keeps a service’s port claims when re-registered without `ports`', async () => {
    await call('register_tenant', { account: 'merger', on_host: 'merge-probe' });
    const created = await call('register_service', {
      unit: 'multi.service', owned_by: 'merger',
      ports: [{ port: 8080, host: 'merge-probe' }, { port: 8443, host: 'merge-probe' }],
    });
    expect(created.facet.ports).toHaveLength(2);

    const again = await call('register_service', {
      unit: 'multi.service', owned_by: 'merger', description: 'just a description change',
    });
    expect(again.status).toBe('updated');
    expect(again.facet.ports).toHaveLength(2);
    expect(again.facet.ports.map((p: any) => p.port).sort()).toEqual([8080, 8443]);
  });

  it('keeps an observed linger when re-registered without it', async () => {
    await call('register_tenant', { account: 'lingerer', on_host: 'merge-probe', linger: 'enabled' });
    const again = await call('register_tenant', { account: 'lingerer', on_host: 'merge-probe', home: '/home/lingerer' });
    expect(again.facet.linger).toBe('enabled');
  });

  it('writes one binds-port edge per slot, not one per host pair', async () => {
    // EdgeCollection keys on `id || from_id:to_id`, so two ports on one host
    // collapsed into a single edge and the graph read one claim where two exist.
    const topology = await call('list_infra_topology', { perspective: 'service' });
    const multi = topology.services.find((s: any) => s.unit === 'multi.service');
    const web = await call('get_relational_web', {
      node_id: multi.node_id, depth: 1, edge_types: ['binds-port'],
    });
    expect(web.edges).toHaveLength(2);
    expect(web.edges.map((e: any) => e.metadata.port).sort()).toEqual([8080, 8443]);
  });

  it('collapses concurrent registrations of one identity onto a single node', async () => {
    // Read-then-write is a TOCTOU: both callers found nothing and both created.
    // A deterministic id makes the second a write to the same key instead.
    await Promise.all([
      call('register_host', { hostname: 'racer' }),
      call('register_host', { hostname: 'racer' }),
      call('register_host', { hostname: 'racer' }),
    ]);
    const topology = await call('list_infra_topology', {});
    expect(topology.hosts.filter((h: any) => h.hostname === 'racer')).toHaveLength(1);
  });
});

describe('port conflicts', () => {
  it('finds the collision the moment the second service claims the slot', async () => {
    const second = await call('register_service', {
      unit: 'sanctuaire.service', owned_by: 'gmusic',
      ports: [{ port: 9081, proto: 'tcp', host: 'eury' }],
    });
    expect(second.status).toBe('created');
    expect(second.port_conflicts).toHaveLength(1);
    expect(second.warning).toContain('do not provision');

    const conflicts = await call('detect_port_conflicts', {});
    const row = conflicts.conflicts.find((c: any) => c.port === 9081);
    expect(row.claimants).toHaveLength(2);
    expect(row.claimant_names.sort()).toEqual(['assembly-mux.service', 'sanctuaire.service']);
  });

  it('does not call the same port on a different host a conflict', async () => {
    await call('register_host', { hostname: 'gaia' });
    await call('register_tenant', { account: 'mia', on_host: 'gaia' });
    const result = await call('register_service', {
      unit: 'gaia-mux.service', owned_by: 'mia', ports: [{ port: 9081, host: 'gaia' }],
    });
    expect(result.port_conflicts).toHaveLength(0);
  });

  it('unions live-read bindings with the record', async () => {
    const conflicts = await call('detect_port_conflicts', {
      observed: [{ port: 4444, proto: 'tcp', host: 'eury', bound_by: 'something-nobody-declared' }],
    });
    expect(conflicts.observed_bindings).toBe(1);
    const row = conflicts.conflicts.find((c: any) => c.port === 4444);
    expect(row.claimants).toContain('something-nobody-declared');
  });

  it('reports an unregistered observed host instead of inventing one', async () => {
    // The fallback this replaces let an unknown hostname become its own host
    // key, so its claims collided with nothing and the caller was handed
    // "No slot is claimed twice" over a real collision.
    const result = await call('detect_port_conflicts', {
      observed: [{ port: 9081, proto: 'tcp', host: 'atlantis', bound_by: 'ghost' }],
    });
    expect(result.unresolved_hosts).toEqual(['atlantis']);
    expect(result.observed_bindings).toBe(0);
    expect(result.warning).toContain('atlantis');
    expect(result.teaching).not.toContain('No slot is claimed twice');
  });

  it('refuses a scope host that is not registered', async () => {
    expect((await call('detect_port_conflicts', { host: 'atlantis' })).status).toBe('not_found');
  });
});

describe('hold_metis', () => {
  let serviceId: string;

  beforeAll(async () => {
    const topology = await call('list_infra_topology', { perspective: 'service' });
    serviceId = topology.services.find((s: any) => s.unit === 'assembly-mux.service').node_id;
  });

  it('holds tacit knowledge with its carrier named', async () => {
    const result = await call('hold_metis', {
      node_id: serviceId, held_by: 'William',
      exceptions: ['compose stop, never down — down drops the volumes'],
    });
    expect(result.status).toBe('held');
    expect(result.metis.heldBy).toBe('William');
  });

  it('appends rather than replacing, and accumulates carriers', async () => {
    // A second operator's knowledge must not overwrite the first's, and holding
    // something must not reassign authorship of what someone else wrote down.
    const result = await call('hold_metis', {
      node_id: serviceId, held_by: 'gaia-agent',
      invisible_work: ['BELL917 BSSID lock is load-bearing'],
    });
    expect(result.metis.exceptions).toHaveLength(1);
    expect(result.metis.invisibleWork).toHaveLength(1);
    expect(result.metis.heldBy).toBe('William, gaia-agent');
  });

  it('refuses to record a carrier with nothing carried', async () => {
    const result = await call('hold_metis', { node_id: serviceId, held_by: 'someone' });
    expect(result.status).toBe('error');
    expect(result.message).toContain('forgets their knowledge');
  });

  it('refuses an empty carrier — an empty string anonymises while passing every check', async () => {
    const result = await call('hold_metis', { node_id: serviceId, held_by: '  ', notes: ['a note'] });
    expect(result.status).toBe('error');
    expect(result.message).toContain('must name a person');
  });

  it('refuses a node that is not infrastructure', async () => {
    const plain = await call('create_relational_node', {
      name: 'a teaching', type: 'knowledge', description: 'not a service',
    });
    const result = await call('hold_metis', { node_id: plain.node_id, held_by: 'x', notes: ['y'] });
    expect(result.status).toBe('error');
  });
});

describe('finding it again — the defect that blocked the whole goal', () => {
  it('finds a service by kind, without depending on a word surviving into text', async () => {
    const result = await call('search_nodes', { query: 'service', kind: 'service' });
    expect(result.count).toBeGreaterThan(0);
    expect(result.nodes.every((n: any) => n.metadata.kind === 'service')).toBe(true);
  });

  it('does not return hosts when filtering for services', async () => {
    const result = await call('search_nodes', { query: 'eury', kind: 'service' });
    expect(result.nodes.every((n: any) => n.metadata.kind === 'service')).toBe(true);
  });

  it('finds a registered service by words scattered across name and metadata', async () => {
    const result = await call('search_nodes', { query: 'assembly mux eury' });
    expect(result.nodes.some((n: any) => n.name === 'assembly-mux.service')).toBe(true);
  });
});

describe('list_infra_topology — many perspectives on one estate', () => {
  it('nests tenants and services under machines by default', async () => {
    const result = await call('list_infra_topology', {});
    // Asserted by name rather than by count — a count couples this test to every
    // fixture any other test in this file registers.
    const hostnames = result.hosts.map((h: any) => h.hostname);
    expect(hostnames).toContain('eury');
    expect(hostnames).toContain('gaia');
    const eury = result.hosts.find((h: any) => h.hostname === 'eury');
    expect(eury.tenants.map((t: any) => t.account).sort()).toEqual(['ava', 'gmusic']);
  });

  it('scopes to a single host by hostname', async () => {
    const result = await call('list_infra_topology', { host: 'gaia' });
    expect(result.counts.hosts).toBe(1);
    expect(result.counts.tenants).toBe(1);
  });

  it('marks contested slots in the port perspective', async () => {
    const result = await call('list_infra_topology', { perspective: 'port', host: 'eury' });
    const contested = result.ports.filter((p: any) => p.contested);
    expect(contested.length).toBeGreaterThan(0);
    expect(contested.every((p: any) => p.port === 9081)).toBe(true);
  });

  it('returns only what people hold in the métis perspective, with carriers', async () => {
    const result = await call('list_infra_topology', { perspective: 'metis' });
    expect(result.metis.length).toBeGreaterThan(0);
    expect(result.metis.every((m: any) => m.metis.heldBy)).toBe(true);
  });

  it('says so rather than inventing a host that was never registered', async () => {
    expect((await call('list_infra_topology', { host: 'atlantis' })).status).toBe('not_found');
  });

  it('shows a cross-host port claim in the reading of the host it occupies', async () => {
    // A tenant on eury may legitimately claim a slot on gaia. Scoping by
    // containment alone hid that claim from the machine whose slot it takes —
    // the one place "ports are scarce per host" has to hold.
    await call('register_service', {
      unit: 'crosshost.service', owned_by: 'ava', ports: [{ port: 5555, host: 'gaia' }],
    });
    const gaia = await call('list_infra_topology', { host: 'gaia', perspective: 'port' });
    const row = gaia.ports.find((p: any) => p.port === 5555);
    expect(row).toBeDefined();
    expect(row.service).toBe('crosshost.service');
  });

  it('does not leak a co-owned service’s other-host slots into a scoped reading', async () => {
    const gaia = await call('list_infra_topology', { host: 'gaia', perspective: 'port' });
    expect(gaia.ports.every((p: any) => p.host_name === 'gaia')).toBe(true);
  });

  it('carries métis onto the port rows, where restart-it-twice matters most', async () => {
    const ports = await call('list_infra_topology', { perspective: 'port', host: 'eury' });
    const held = ports.ports.filter((p: any) => p.metis);
    expect(held.length).toBeGreaterThan(0);
    expect(held.every((p: any) => p.metis.heldBy)).toBe(true);
  });
});

describe('mw_enforce_gate — precondition mode', () => {
  let serviceId: string;

  beforeAll(async () => {
    const topology = await call('list_infra_topology', { perspective: 'service' });
    serviceId = topology.services.find((s: any) => s.unit === 'assembly-mux.service').node_id;
  });

  it('blocks on a withdrawn consent and does not call it a technical failure', async () => {
    const result = await call('mw_enforce_gate', {
      service_node_id: serviceId,
      preconditions: [{
        id: 'p1', gates: serviceId,
        fact: { kind: 'linger', facetNodeId: 'node:human:ava', expected: 'enabled', observed: 'enabled' },
        consent: { consentId: 'c1', state: 'withdrawn' },
      }],
    });
    expect(result.blocked).toBe(true);
    expect(result.blocking[0].verdict).toBe('unauthorized');
    expect(result.consent_note).toContain('restarting');
  });

  it('warns that a service with no declared preconditions verified nothing', async () => {
    const result = await call('mw_enforce_gate', { service_node_id: serviceId, preconditions: [] });
    expect(result.ready).toBe(true);
    expect(result.warning).toContain('nothing was verified');
  });

  it('refuses a node that is not a registered service', async () => {
    const result = await call('mw_enforce_gate', { service_node_id: 'node:land:nope' });
    expect(result.status).toBe('not_found');
  });

  it('still enforces the ceremony gate when given a filePath', async () => {
    const result = await call('mw_enforce_gate', { filePath: 'README.md' });
    expect(result.mode).toBe('ceremony');
    expect(typeof result.blocked).toBe('boolean');
  });

  it('refuses to answer when given neither a path nor a service', async () => {
    expect((await call('mw_enforce_gate', {})).status).toBe('error');
  });

  it('does not open on an enabled linger flag that names no consent', async () => {
    // The single verdict combination through which a machine fact can stand in
    // for a human. It must not read satisfied.
    const result = await call('mw_enforce_gate', {
      service_node_id: serviceId,
      preconditions: [{
        id: 'p:linger-only', gates: serviceId,
        fact: { kind: 'linger', facetNodeId: 'node:human:ava', expected: 'enabled', observed: 'enabled' },
      }],
    });
    expect(result.blocked).toBe(true);
    expect(result.blocking[0].verdict).toBe('unknown');
  });

  it('rejects a fabricated fact kind instead of evaluating it as satisfied', async () => {
    const result = await call('mw_enforce_gate', {
      service_node_id: serviceId,
      preconditions: [{
        id: 'p:invented', gates: serviceId,
        fact: { kind: 'reachability', facetNodeId: 'node:land:eury', expected: 'tailnet', observed: 'tailnet' },
      }],
    });
    expect(result.status).toBe('error');
    expect(result.blocked).toBe(true);
    expect(result.valid_fact_kinds).toContain('working-directory');
  });

  it('rejects a precondition missing its id rather than gating on undefined', async () => {
    const result = await call('mw_enforce_gate', {
      service_node_id: serviceId,
      preconditions: [{ gates: serviceId, fact: { kind: 'linger', facetNodeId: 'x', expected: 'enabled', observed: 'enabled' } }],
    });
    expect(result.status).toBe('error');
    expect(result.rejected[0].issues.some((i: any) => i.field === 'id')).toBe(true);
  });

  it('refuses a node that claims kind service but carries no facet', async () => {
    const kindless = await call('create_relational_node', {
      name: 'kindless', type: 'knowledge', description: 'x', metadata: { kind: 'service' },
    });
    const result = await call('mw_enforce_gate', { service_node_id: kindless.node_id, preconditions: [] });
    expect(result.status).toBe('error');
    expect(result.message).toContain('no valid facet');
  });
});

describe('mw_get_direction — routing an infrastructure question', () => {
  it('routes a service to West', async () => {
    const topology = await call('list_infra_topology', { perspective: 'service' });
    const id = topology.services[0].node_id;
    const result = await call('mw_get_direction', { node_id: id });
    expect(result.direction).toBe('west');
    expect(result.routed_from.kind).toBe('service');
  });

  it('routes a tenant to South', async () => {
    const topology = await call('list_infra_topology', { perspective: 'tenant' });
    const result = await call('mw_get_direction', { node_id: topology.tenants[0].node_id });
    expect(result.direction).toBe('south');
  });

  it('answers null for a host instead of inventing a quadrant', async () => {
    const topology = await call('list_infra_topology', {});
    const result = await call('mw_get_direction', { node_id: topology.hosts[0].node_id });
    expect(result.direction).toBeNull();
    expect(result.message).toContain('ground');
  });
});

describe('reconcile_infra_state', () => {
  it('finds the service running that nobody wrote down', async () => {
    const result = await call('reconcile_infra_state', {
      observed_by: 'gaia',
      observed_at: '2026-08-05T12:00:00Z',
      now: '2026-08-05T12:01:00Z',
      host: 'gaia',
      services: [{
        nodeId: 'node:knowledge:started-by-hand', unit: 'ghost.service', scope: 'user',
        ownedBy: 'node:human:mia',
        ports: [{ port: 9081, proto: 'tcp', host: 'gaia', boundBy: 'node:knowledge:started-by-hand' }],
      }],
    });

    expect(result.status).toBe('ok');
    expect(result.summary.undeclared).toBe(1);
    expect(result.observationAgeMs).toBe(60_000);
    expect(result.teaching).toContain('nobody wrote down');
  });

  it('resolves hostnames on the observed side so the union can collide', async () => {
    const result = await call('reconcile_infra_state', {
      observed_by: 'gaia', observed_at: '2026-08-05T12:00:00Z', host: 'gaia',
      services: [{
        nodeId: 'node:knowledge:other-ghost', unit: 'other.service', scope: 'user',
        ownedBy: 'node:human:mia',
        ports: [{ port: 9081, proto: 'tcp', host: 'gaia', boundBy: 'node:knowledge:other-ghost' }],
      }],
    });
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].host.startsWith('node:land:')).toBe(true);
  });

  it('refuses an observed facet whose port was misparsed', async () => {
    const result = await call('reconcile_infra_state', {
      observed_by: 'gaia', observed_at: '2026-08-05T12:00:00Z',
      services: [{
        nodeId: 'node:knowledge:x', unit: 'x.service', scope: 'user', ownedBy: 'node:human:mia',
        ports: [{ port: 70000, host: 'gaia', boundBy: 'node:knowledge:x' }],
      }],
    });
    expect(result.status).toBe('error');
  });
});

describe('create_relational_node — the validated facet escape hatch', () => {
  it('validates a facet instead of accepting an unchecked metadata blob', async () => {
    const result = await call('create_relational_node', {
      name: 'manual.service', type: 'knowledge', description: 'hand-built',
      facet_kind: 'service',
      facet: { unit: 'manual.service', scope: 'user', ownedBy: 'node:human:ava', ports: [] },
    });
    expect(result.status).toBe('created');
    expect(result.node.metadata.kind).toBe('service');
    expect(result.node.metadata.facet.nodeId).toBe(result.node_id);
  });

  it('refuses a facet riding the wrong NodeType', async () => {
    const result = await call('create_relational_node', {
      name: 'wrong', type: 'spirit', description: 'x',
      facet_kind: 'service', facet: { unit: 'u', scope: 'user', ownedBy: 'o', ports: [] },
    });
    expect(result.status).toBe('error');
    expect(result.message).toContain('closed at six');
  });

  it('refuses a facet with no declared kind', async () => {
    const result = await call('create_relational_node', {
      name: 'x', type: 'knowledge', description: 'x', facet: { unit: 'u' },
    });
    expect(result.status).toBe('error');
    expect(result.message).toContain('travel together');
  });

  it('still creates an ordinary node with plain metadata', async () => {
    const result = await call('create_relational_node', {
      name: 'ordinary', type: 'human', description: 'a person', metadata: { note: 'kept' },
    });
    expect(result.status).toBe('created');
    expect(result.node.metadata.note).toBe('kept');
    expect(result.node.metadata.kind).toBeUndefined();
  });
});
