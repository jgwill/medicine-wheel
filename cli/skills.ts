/**
 * Shared skill registry and management for Medicine Wheel CLIs.
 *
 * Skills are curated capabilities that can be installed into a local
 * `.mw/skills/` directory.  Each CLI (mw, mwsrv) exposes its own
 * relevant subset via `skill view` and `skill install`.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────

export type SkillTarget = 'cli' | 'srv';

export interface SkillDefinition {
  /** Unique skill identifier */
  name: string;
  /** Human-readable title */
  title: string;
  /** Short description */
  description: string;
  /** Which binary this skill is for */
  target: SkillTarget;
  /** Related skill name on the complementary binary (if any) */
  complement?: string;
  /** Skill definition body (Markdown) */
  body: string;
}

// ── Built-in skill catalog ───────────────────────────────────────

const SKILLS: SkillDefinition[] = [
  // ── CLI skills (mw) ────────────────────────────────────────────
  {
    name: 'direction-inquiry',
    title: 'Direction Inquiry',
    description: 'Analyze tasks through the Four Directions (East / South / West / North)',
    target: 'cli',
    complement: 'api-health',
    body: `# Skill: Direction Inquiry

## Purpose
Analyze an engineering task using the Four Directions framework.

## Input
- Engineering task description
- Optional: constraints, repo paths

## Output
- **East** — vision statement
- **South** — analysis questions
- **West** — validation checks
- **North** — action stack
- Ceremony recommendation if balance is poor

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install direction-inquiry\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run direction-inquiry "Refactor auth module"
\`\`\`
`,
  },
  {
    name: 'fire-keeper-check',
    title: 'Fire Keeper Check',
    description: 'Run gating and stewardship checks on proposed actions',
    target: 'cli',
    complement: 'session-manager',
    body: `# Skill: Fire Keeper Check

## Purpose
Evaluate a proposed action against permission tiers and relational gates.

## Input
- Proposed action description
- Current permission tier
- Current ceremony phase
- Optional: Wilson / OCAP metadata

## Output
- accept / hold / human-needed assessment
- Unsatisfied gates
- Check-back step results
- Suggested next move

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install fire-keeper-check\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run fire-keeper-check "Deploy to production"
\`\`\`
`,
  },
  {
    name: 'wave-spec-generator',
    title: 'Wave Spec Generator',
    description: 'Generate .pde wave specifications for development cycles',
    target: 'cli',
    complement: 'storage-config',
    body: `# Skill: Wave Spec Generator

## Purpose
Create a proposal-grade wave bundle matching current .pde practice.

## Input
- Goal description
- Relevant specs
- Target paths and constraints

## Output
- ORCHESTRATION.md
- PROMPT.txt
- artifacts/ checklist

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install wave-spec-generator\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run wave-spec-generator "Add caching layer"
\`\`\`
`,
  },
  {
    name: 'ceremony-guide',
    title: 'Ceremony Guide',
    description: 'Guide through ceremony lifecycle phases with protocol awareness',
    target: 'cli',
    complement: 'docker-setup',
    body: `# Skill: Ceremony Guide

## Purpose
Provide step-by-step guidance through the ceremony lifecycle.

## Input
- Current ceremony state (or new ceremony intention)
- Phase: opening / council / integration / closure

## Output
- Current phase assessment
- Protocol requirements for next transition
- Relational checks and community review prompts
- Completion criteria

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install ceremony-guide\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run ceremony-guide "Community data review"
\`\`\`
`,
  },
  {
    name: 'infrastructure-audit',
    title: 'Infrastructure Audit',
    description: 'Audit hosts, services, and port bindings across the Medicine Wheel estate',
    target: 'cli',
    complement: 'infra-topology',
    body: `# Skill: Infrastructure Audit

## Purpose
Read the registered topology — hosts, the tenants upon them, the services those
tenants own, the ports those services claim — and surface conflicts and métis.

## What runs today

These MCP tools are registered and executable. This is not a roadmap.

\`\`\`
list_infra_topology { perspective: "host" }              # machines, nested
list_infra_topology { perspective: "port", host: "eury" }# the slot map for one machine
list_infra_topology { perspective: "metis" }             # only what people hold, with carriers
detect_port_conflicts {}                                 # declared state against itself
\`\`\`

Five perspectives, because one shape cannot answer every question:
\`host\` nests tenants and services under machines · \`tenant\` reads accounts and
their linger · \`service\` reads units, scopes and stop commands · \`port\` reads the
slot map with \`contested\` marked · \`metis\` reads only what people hold.

## What the audit reads

- **Graph** — hosts → tenants → services, walkable as \`part-of\` and \`binds-port\`
  edges. \`node_id\` is required and must be a registered node (take one from
  \`list_infra_topology\`); without a centre the call returns an error rather than
  an empty web that would read as "this host has nothing on it":

  \`\`\`
  get_relational_web { node_id: "node:land:host:eury", edge_types: ["part-of","binds-port"] }
  \`\`\`
- **Port conflicts** — distinct services colliding on the same host|proto|port.
  One service seen twice is not a conflict; ports are scarce per host, not globally
- **Métis surface** — exceptions, invisible work, and \`heldBy\` naming a person
- **Reachability** — lan / tailnet / cloudflare / ngrok, per \`HostFacet\`

## What is NOT here

Reachability is recorded, not probed. Nothing in this repo pings a host. A
\`reachableVia\` of \`tailnet\` is a claim somebody wrote down, and an audit that
presented it as a live check would be the exact class of lie \`reconcile\` exists
to catch.

## Usage

> \`mw skill run\` has no implementation and exits 3. A skill is a document, not
> a program. **The capability above is real and reachable through MCP** — this
> file tells you which calls to make.
>
> \`mw skill install infrastructure-audit\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run infrastructure-audit --host eury
\`\`\`
`,
  },
  {
    name: 'service-provisioning',
    title: 'Service Provisioning',
    description: 'Propose and gate service deployment through ceremony-aware preconditions',
    target: 'cli',
    complement: 'infra-topology',
    body: `# Skill: Service Provisioning

## Purpose
Register a service into the wheel and gate it on preconditions before it runs.

## What runs today

\`\`\`
register_host    { hostname: "eury", reachable_via: ["tailnet"] }
register_tenant  { account: "ava", on_host: "eury", linger: "enabled" }
register_service {
  unit: "zulip.service", owned_by: "ava", scope: "system",
  ports: [{ port: 3000, proto: "tcp", host: "eury" }],
  working_directory: "/opt/zulip",
  exec_stop: "docker compose stop"
}
\`\`\`

Registration is **idempotent by identity**, not by node id: a host is its
hostname, a tenant is its account on its host, a service is its unit under its
owner. Re-running a provisioning step updates in place and returns \`updated\`.
Without that, a re-run fills the wheel with duplicate services and every one of
them then appears to collide with itself.

\`register_service\` returns \`port_conflicts\` involving the new service. It still
registers on a collision — the wheel records what is true, not what is tidy — and
says plainly not to provision against it.

## The gate

\`\`\`
mw_enforce_gate {
  service_node_id: "node:knowledge:...",
  preconditions: [{
    id: "pre:ava-linger",
    gates: "node:knowledge:...",
    fact:    { kind: "linger", facetNodeId: "node:human:ava",
               expected: "enabled", observed: "enabled", observedAt: "..." },
    consent: { consentId: "consent:root-step:ava", state: "active", readAt: "..." }
  }]
}
\`\`\`

Four verdicts, and the distinctions are the point:

| verdict | means |
|---|---|
| \`satisfied\` | every declared half was read and holds |
| \`unsatisfied\` | a machine fact was read and does not match |
| \`unauthorized\` | the machine is ready and a human has not said yes, or withdrew |
| \`unknown\` | a declared half has **not been read** — not the same as false |

**\`linger\` is not consent.** It is a checkbox with no authority and no ability to
withdraw. The authorization to run the root step that set it is a
\`ConsentRecord\` in \`consent-lifecycle\`, referenced by id. An \`unauthorized\` gate
cannot be cleared by restarting anything, and a report that collapsed it into
\`unsatisfied\` would invite exactly that.

A service with **zero** declared preconditions returns \`ready: true\` with a
warning saying nothing was verified. Vacuous truth, named out loud.

## Usage

> \`mw skill run\` has no implementation and exits 3. The calls above are real.
>
> \`mw skill install service-provisioning\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run service-provisioning --unit zulip.service --port 3000:tcp@eury
\`\`\`
`,
  },
  {
    name: 'drift-reconciliation',
    title: 'Drift Reconciliation',
    description: 'Compare declared vs observed infrastructure state and propose healing steps',
    target: 'cli',
    complement: 'infra-topology',
    body: `# Skill: Drift Reconciliation

## Purpose
Compare what the wheel declares against what is actually running on a host, and
say the distance out loud.

## What runs today

\`\`\`
reconcile_infra_state {
  observed_by: "gaia",
  observed_at: "2026-08-05T12:00:00Z",
  services: [ /* ServiceFacet shapes read live from the machine */ ]
}
\`\`\`

**Level-triggered.** It compares the current declared level against the current
observed level, every time, and remembers no transitions. There is no "converged
a minute ago" state to go stale. The outage this answers (jgwill/gaia#74) was not
caused by a missing fact — it was caused by a fact that HAD been true.

\`observed_by\` and \`observed_at\` are required. An observation with no reader and
no time is a rumour, and reconciling against a rumour is the snapshot problem
wearing a different hat. \`observationAgeMs\` comes back so a caller can refuse a
reading that is too old.

## The four drift states

| state | means |
|---|---|
| \`converged\` | both sides agree on every compared field |
| \`drifted\` | both exist and disagree — the differing fields are named |
| \`unrealized\` | declared, not observed — written down, not running |
| \`undeclared\` | **observed, not declared** — running and nobody wrote it down |

\`undeclared\` carries the most information. It finds the service somebody started
by hand at 2am — which is the service holding the port the next tenant is about
to be given. Read that row first.

Port conflicts over declared ∪ observed are folded into the same answer, because
this is the one call where both sides are in hand at once.

## Métis is never drift

Two sides holding different tacit notes is not a discrepancy — it is two people
knowing different things. Métis is carried through untouched and never appears in
\`differences\`. A reconciler that reported it would be asking an operator to
delete what they know to make a table go green.

## Reading the machine

Collecting the observed side is **not** in this repo. There is no systemd or
runit adapter here; \`reconcile_infra_state\` takes the reading as an argument. The
service-manager adapter is owned by the device lane (jgwill/medicine-wheel#118),
which is the only body in this system that can test runit.

## Usage

> \`mw skill run\` has no implementation and exits 3.
>
> \`mw skill install drift-reconciliation\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run drift-reconciliation --host gaia --propose
\`\`\`
`,
  },

  // ── Server skills (mwsrv) ─────────────────────────────────────
  {
    name: 'docker-setup',
    title: 'Docker Setup',
    description: 'Configure and validate Docker environment for Medicine Wheel server',
    target: 'srv',
    complement: 'ceremony-guide',
    body: `# Skill: Docker Setup

## Purpose
Configure the Docker environment for running the Medicine Wheel server.

## Checks
- Docker daemon availability
- Image pull status (jgwill/medicine-wheel:app)
- Volume mount configuration
- Port availability

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install docker-setup\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run docker-setup
\`\`\`
`,
  },
  {
    name: 'storage-config',
    title: 'Storage Configuration',
    description: 'Configure and validate storage providers (JSONL / PostgreSQL)',
    target: 'srv',
    complement: 'wave-spec-generator',
    body: `# Skill: Storage Configuration

## Purpose
Configure the storage backend for the Medicine Wheel server.

## Supported Providers
- **jsonl** — Local file-based storage (.mw/store/)
- **postgres** — PostgreSQL via DATABASE_URL

## Checks
- Current MW_STORAGE_PROVIDER value
- Data directory existence and permissions
- PostgreSQL connectivity (if applicable)
- Migration status

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install storage-config\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run storage-config
\`\`\`
`,
  },
  {
    name: 'api-health',
    title: 'API Health Monitor',
    description: 'Monitor and diagnose API endpoint health and connectivity',
    target: 'srv',
    complement: 'direction-inquiry',
    body: `# Skill: API Health Monitor

## Purpose
Check the health and connectivity of Medicine Wheel API endpoints.

## Checks
- Server reachability (MW_API_URL)
- Core endpoint status (/api/directions, /api/ceremonies, /api/nodes)
- Response time measurements
- Storage layer connectivity

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install api-health\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run api-health
\`\`\`
`,
  },
  {
    name: 'session-manager',
    title: 'Session Manager',
    description: 'Manage and inspect active server sessions and connections',
    target: 'srv',
    complement: 'fire-keeper-check',
    body: `# Skill: Session Manager

## Purpose
Inspect and manage active sessions on the Medicine Wheel server.

## Capabilities
- List active sessions
- Inspect session state and ceremony context
- View session data directory contents
- Cleanup stale session data

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install session-manager\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run session-manager
\`\`\`
`,
  },
  {
    name: 'infra-topology',
    title: 'Infrastructure Topology',
    description: 'The registered topology — hosts, tenants, services, ports — and its drift, via MCP',
    target: 'srv',
    complement: 'infrastructure-audit',
    body: `# Skill: Infrastructure Topology

## Purpose
Hold the shape of the estate: which machines exist, who lives on them, what runs
under those accounts, which slots are claimed, and how far the record has drifted
from what is running.

> Renamed from \`infra-monitor\`. That record described polling systemd, which
> nothing in this repository does — it named a capability that did not exist and
> apologised for it. Topology is what is actually held here.

## What runs today

\`\`\`
list_infra_topology   { perspective: "host" | "tenant" | "service" | "port" | "metis" }
detect_port_conflicts { observed: [...] }    # union live readings with the record
reconcile_infra_state { observed_by, observed_at, services }
hold_metis            { node_id, held_by, exceptions: [...] }
mw_enforce_gate       { service_node_id, preconditions: [...] }
mw_get_direction      { node_id }            # service → West, tenant → South
\`\`\`

## Backed by

- \`@medicine-wheel/infra\` — \`HostFacet\`, \`TenantFacet\`, \`ServiceFacet\`,
  \`PortBinding\`, \`MetisHold\`, \`Precondition\`, \`ObservedState\`,
  \`detectPortConflicts\`, \`preconditionGuard\`, \`readyService\`, \`reconcile\`
- \`@medicine-wheel/ontology-core\` — \`part-of\`, \`ordered-after\`, \`binds-port\` in
  the governed \`KINSHIP_EDGE_TYPES\`; \`INFRA_ENTITY_BINDING\` for which closed
  \`NodeType\` each kind rides. The union stays closed at six
- Persistence: JSONL, or the server API when \`MW_API_URL\` is set

## What this skill does NOT do

**It does not poll.** There is no daemon, no interval, no event stream in this
repo. Every call above is made by an agent or a person when they want the answer.
A skill that claimed to watch would be claiming a process nobody starts.

**It does not read systemd.** \`reconcile_infra_state\` and \`detect_port_conflicts\`
take the observed side as an argument. The service-manager adapter — systemd on
gaia, runit on the Termux device — is owned by the device lane
(jgwill/medicine-wheel#118), the only body here that can test runit.

That seam is deliberate. It keeps \`@medicine-wheel/infra\` free of I/O, and it
keeps this skill from describing a machine it cannot reach.

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. A skill is a document.
> **The MCP calls above are registered and executable.**
>
> \`mwsrv skill install infra-topology\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run infra-topology --host gaia
\`\`\`
`,
  },
  {
    name: 'precondition-guard',
    title: 'Precondition Guard',
    description:
      'Evaluate infrastructure preconditions (linger, port-free, unit-present, working-directory) against the consent that authorizes them',
    target: 'srv',
    complement: 'service-provisioning',
    body: `# Skill: Precondition Guard

## Purpose
Hold a service at the door until what must be true is true — and keep the machine
half and the human half from standing in for each other.

> No longer a roadmap item. \`Precondition\`, \`preconditionGuard\` and
> \`readyService\` ship in \`@medicine-wheel/infra\`, reachable through
> \`mw_enforce_gate\`.

## What runs today

\`\`\`
mw_enforce_gate {
  service_node_id: "node:knowledge:...",
  preconditions: [{
    id: "pre:gmusic-linger",
    gates: "node:knowledge:...",
    description: "gmusic user units must survive logout",
    fact:    { kind: "linger", facetNodeId: "node:human:gmusic",
               expected: "enabled", observed: "enabled", observedAt: "..." },
    consent: { consentId: "consent:root-step:gmusic", state: "active", readAt: "..." },
    metis:   { exceptions: ["restart twice; first start races the mount"],
               heldBy: "William" }
  }]
}
\`\`\`

Preconditions gating other services are ignored, so passing a whole host's set is
safe.

## Precondition kinds

\`linger\` · \`port-free\` · \`unit-present\` · \`working-directory\`

Every one of these is something a host will answer without a person present.
**That is exactly what disqualifies them from carrying consent.**

## The four verdicts

| verdict | means |
|---|---|
| \`satisfied\` | every declared half was read and holds |
| \`unsatisfied\` | a machine fact was read and does not match |
| \`unauthorized\` | the machine half holds and consent does not authorize |
| \`unknown\` | a declared half has not been read |

\`unauthorized\` is kept separate from \`unsatisfied\` so a withdrawn consent can
never be mistaken for a technical failure an operator can clear by restarting
something. \`unknown\` is separate from both because a guard that reports "blocked"
when nobody has looked yet is a guard operators learn to ignore.

Order of decision: an unread half decides nothing · a failed machine fact does
not consult the human half, because there is nothing yet to authorize · a
non-authorizing consent wins over any machine state · a precondition declaring
neither half returns \`unknown\`, never \`satisfied\`. An empty gate that reports
success has stopped being a gate.

## Métis travels with the block

\`readyService\` carries every \`MetisHold\` from the blocking preconditions into
its answer. The reason a gate is stuck is exactly where "you have to restart it
twice" lives, and a readiness report that dropped it would have dropped the one
thing the operator needed.

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. A skill is a document,
> not a program. **The \`mw_enforce_gate\` call above is registered and executable.**
>
> \`mwsrv skill install precondition-guard\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run precondition-guard --facet-id "node:knowledge:zulip:..." --intent provision
\`\`\`
`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function getSkillsDir(): string {
  const dataDir = process.env.MW_DATA_DIR
    ?? path.join(process.cwd(), '.mw');
  return path.join(dataDir, 'skills');
}

function isInstalled(skill: SkillDefinition): boolean {
  const dir = getSkillsDir();
  return fs.existsSync(path.join(dir, skill.name, 'SKILL.md'));
}

// ── Public API ────────────────────────────────────────────────────

/** Return all skills for the given target binary. */
export function listSkills(target: SkillTarget): SkillDefinition[] {
  return SKILLS.filter((s) => s.target === target);
}

/** Return a single skill by name. */
export function getSkill(name: string): SkillDefinition | undefined {
  return SKILLS.find((s) => s.name === name);
}

/** Return the complement skill for a given skill. */
export function getComplement(skill: SkillDefinition): SkillDefinition | undefined {
  return skill.complement ? getSkill(skill.complement) : undefined;
}

/**
 * Print why `skill run` does nothing and what to reach for instead.
 *
 * A `SkillDefinition` is a name/title/description/body record — a document, not
 * a program. Nothing in this repository executes one, so `skill run` has never
 * had an implementation. Both CLIs call this and then exit non-zero rather than
 * printing an error and returning 0, which is what they used to do.
 *
 * @param binary  Which CLI is speaking ('mw' | 'mwsrv') — shapes the examples.
 * @param colors  ANSI colour map.
 */
export function explainSkillRunUnavailable(
  binary: 'mw' | 'mwsrv',
  colors: { bold: string; dim: string; green: string; south: string; reset: string },
): void {
  const C = colors;
  console.error(`${C.south}${binary} skill run is not implemented.${C.reset}`);
  console.error('');
  console.error('  Skills here are definitions, not programs: each one is a SKILL.md');
  console.error('  describing inputs, outputs and steps. There is no runtime that');
  console.error('  executes them, so nothing would have run.');
  console.error('');
  console.error(`  ${C.bold}What works today${C.reset}`);
  console.error(`    ${binary} skill view              list the skills this CLI knows`);
  console.error(`    ${binary} skill install <name>    write <name>/SKILL.md into .mw/skills/`);
  console.error('');
  console.error('  Then follow the installed SKILL.md yourself, or hand it to an agent.');
}

/**
 * Print skill catalog for the given target.
 *
 * @param target  Which binary's skills to show ('cli' | 'srv')
 * @param colors  ANSI colour map (must include bold, dim, green, reset)
 */
export function viewSkills(
  target: SkillTarget,
  colors: { bold: string; dim: string; green: string; south: string; reset: string },
): void {
  const skills = listSkills(target);
  const label = target === 'cli' ? 'mw' : 'mwsrv';
  console.log(
    `\n  ${colors.bold}🌿 ${label} skills (${skills.length} available)${colors.reset}\n`,
  );

  for (const s of skills) {
    const installed = isInstalled(s);
    const marker = installed
      ? `${colors.green}✓${colors.reset}`
      : `${colors.dim}○${colors.reset}`;
    const comp = s.complement
      ? `${colors.dim} ↔ ${s.complement}${colors.reset}`
      : '';
    console.log(`  ${marker} ${s.name.padEnd(24)} ${s.description}${comp}`);
  }
  console.log('');
}

/**
 * Install a skill (or all skills) for the given target.
 *
 * @returns number of newly installed skills, or **-1** when `name` matched no
 *          skill for this target — callers must treat -1 as a failure and exit
 *          non-zero. Returning 0 for both "nothing to do" and "you named a
 *          skill that does not exist" is what let a bad name report success.
 */
export function installSkill(
  target: SkillTarget,
  name?: string,
  colors?: { bold: string; dim: string; green: string; south: string; reset: string },
): number {
  const C = colors ?? { bold: '', dim: '', green: '', south: '', reset: '' };
  const dir = getSkillsDir();

  const toInstall = name
    ? SKILLS.filter((s) => s.name === name && s.target === target)
    : listSkills(target);

  if (name && toInstall.length === 0) {
    // Check if the skill exists for the other target
    const other = SKILLS.find((s) => s.name === name);
    if (other) {
      const otherLabel = other.target === 'cli' ? 'mw' : 'mwsrv';
      console.error(
        `${C.south}Skill "${name}" belongs to ${otherLabel}, not this CLI.${C.reset}`,
      );
    } else {
      console.error(`${C.south}Unknown skill: ${name}${C.reset}`);
    }
    return -1;
  }

  let installed = 0;
  let stale = 0;
  for (const skill of toInstall) {
    const skillDir = path.join(dir, skill.name);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (fs.existsSync(skillFile)) {
      // An existing file is never overwritten. Say so honestly when the copy
      // on disk no longer matches the catalog, otherwise "already installed"
      // reads as "up to date" while the reader follows outdated instructions.
      let onDisk = '';
      try { onDisk = fs.readFileSync(skillFile, 'utf8'); } catch { /* unreadable → treat as drifted */ }
      if (onDisk === skill.body) {
        console.log(`  ${C.dim}⊘ ${skill.name} (already installed)${C.reset}`);
      } else {
        stale++;
        console.log(
          `  ${C.dim}⊘ ${skill.name} (already installed — copy on disk differs from the catalog)${C.reset}`,
        );
        console.log(
          `    ${C.dim}to update: rm ${skillFile} && ${target === 'cli' ? 'mw' : 'mwsrv'} skill install ${skill.name}${C.reset}`,
        );
      }
      continue;
    }

    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillFile, skill.body, 'utf8');
    installed++;
    console.log(`  ${C.green}✓${C.reset} Installed ${skill.name}`);

    // Show complement relationship
    const comp = getComplement(skill);
    if (comp) {
      const compLabel = comp.target === 'cli' ? 'mw' : 'mwsrv';
      console.log(
        `    ${C.dim}↔ complement: ${comp.name} (${compLabel} skill install ${comp.name})${C.reset}`,
      );
    }
  }

  if (installed > 0) {
    console.log(`\n  ${C.bold}${installed} skill(s) installed to ${dir}${C.reset}\n`);
  } else {
    console.log(`\n  ${C.dim}All skills already installed.${C.reset}\n`);
  }
  if (stale > 0) {
    console.log(`  ${C.south}${stale} installed copy/copies differ from the catalog and were left untouched.${C.reset}\n`);
  }

  return installed;
}
