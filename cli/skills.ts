/**
 * Shared skill registry and management for Medicine Wheel CLIs.
 *
 * Skills are curated capabilities that can be installed into a local
 * `.mw/skills/` directory.  Each CLI (mw, mwsrv) exposes its own
 * relevant subset via `skill view` and `skill install`.
 *
 * An installed SKILL.md opens with front matter (`name`, `description`),
 * rendered from the definition by `renderSkill`, so an agent that loads
 * skills from a folder reads it as one. A body names only calls that run
 * today; `tests/skills-catalog.test.ts` checks every MCP tool a body names
 * against the tools the MCP server registers.
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
    description: 'Read a task through the Four Directions (East / South / West / North) with mw_decompose_prompt before acting on it',
    target: 'cli',
    body: `# Skill: Direction Inquiry

## Purpose
Read an engineering task through the Four Directions before acting on it: East
for vision, South for analysis, West for validation, North for action.

## What runs today

\`\`\`
mw_decompose_prompt { prompt: "Refactor the auth module" }
\`\`\`

It answers \`primary_intent\`, \`balance_score\`, \`neglected_directions\`,
\`ceremony_required\`, \`ceremony_guidance\` and an \`action_stack\` whose items
carry \`text\`, \`direction\` and \`implicit\`. An implicit item is one the prompt
implied without saying. Read the neglected directions first: they name the
questions the prompt did not ask.

A direction's medicine, season, teaching, life stage and colour:

\`\`\`
mw direction east                      # mw directions for all four
mw_get_direction { direction: "east" }
\`\`\`

Before debugging, fixing or root-cause work, ask which orientation the outcome
calls for:

\`\`\`
mw orient "<outcome>" [--restores "<prior state>"] [--evidence "<when it existed>"]
\`\`\`

## What is NOT here

\`mw_decompose_prompt\` writes no file. The \`.pde/<yymmddHHMM>--<uuid>/\` vessels
in this workspace are written by tools outside this repository (\`mcp-pde\`,
\`miaco decompose run\`).

## Usage

> \`mw skill run\` has no implementation and exits 3. A skill is a document, not
> a program. **The calls above are real.**
>
> \`mw skill install direction-inquiry\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run direction-inquiry "Refactor auth module"
\`\`\`
`,
  },
  {
    name: 'fire-keeper-check',
    title: 'Fire Keeper Check',
    description: 'Before an action, read the Fire Keeper status of its inquiry and run the four-step relational check-back',
    target: 'cli',
    complement: 'precondition-guard',
    body: `# Skill: Fire Keeper Check

## Purpose
Before an action, read whether the inquiry it serves is aligned, and run the
four-step relational check-back on the action itself.

## What runs today

\`\`\`
mw_fire_keeper_status { inquiryRef: "<inquiry or cycle>" }
mw_relational_check_back { action: "Deploy to production", inquiryRef: "<inquiry or cycle>" }
\`\`\`

\`mw_fire_keeper_status\` answers \`status\` (\`aligned\` or \`tension\`),
\`confidence\`, \`issues\`, the ceremony \`phase\` and the \`active_ceremonies\`
linked to the inquiry.

\`mw_relational_check_back\` answers \`approved\`, a \`summary\` and four \`steps\`,
each with its \`question\`, \`passed\` and \`reason\`. It needs an open ceremony
linked to the inquiry and refuses without one, so open that first:

\`\`\`
mw_ceremony_open { intention: "<what this work holds>", inquiryRef: "<inquiry or cycle>" }
\`\`\`

The paradigm checks also run from the CLI:

\`\`\`
mw validate wilson "<description>"          # Wilson paradigm check
mw validate ocap '<data_plan_json>'         # OCAP® compliance check
mw validate accountability '<plan_json>'    # accountability audit
\`\`\`

## What is NOT here

No tool here answers "accept", "hold" or "human-needed". \`approved: false\` and
\`tension\` are information for the person who decides, not a decision. A gate
on infrastructure (linger, a free port, consent to a root step) is
\`mw_enforce_gate\`: see \`precondition-guard\`.

## Usage

> \`mw skill run\` has no implementation and exits 3. The calls above are real.
>
> \`mw skill install fire-keeper-check\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run fire-keeper-check "Deploy to production"
\`\`\`
`,
  },
  {
    name: 'wave-spec-generator',
    title: 'Wave Spec Generator',
    description: 'Turn a goal into a wave bundle in a .pde vessel, decomposed with mw_decompose_prompt and written by hand',
    target: 'cli',
    body: `# Skill: Wave Spec Generator

## Purpose
Turn a goal into a wave bundle that a supervised development cycle is launched
from, kept in the \`.pde/\` vessel of its decomposition.

## What runs today

\`\`\`
mw_decompose_prompt { prompt: "Add a caching layer" }
\`\`\`

It gives the action stack by direction and the directions the goal neglects.
Nothing in this repository writes a wave bundle: it is written by hand.

## The shape of a vessel here

\`.pde/<yymmddHHMM>--<uuid>/\` holds \`input-prompt.md\`, \`meta.json\`,
\`pde-<uuid>.json\` and \`pde-<uuid>.md\`, sometimes \`revised-prompt.md\`. It is
written by \`mcp-pde\` or \`miaco decompose run\`, outside this repository.

The one wave bundle in this repository is
\`.pde/20260423-092004-copilot-storage-provider-wave/\`:

- \`ORCHESTRATION.md\`, the contract: operating sequence, constraints, context
  directories to load, deliverables, completion criteria.
- \`PROMPT.txt\`, what the executing agent is given: the working directory, the
  contract to follow, and the sequence of passes it runs.

## Steps

1. Decompose the goal, and keep the vessel the decomposition wrote.
2. Write \`ORCHESTRATION.md\` in it from the action stack, with the five sections above.
3. Write \`PROMPT.txt\` naming \`ORCHESTRATION.md\` as the contract.
4. Commit the vessel. An uncommitted \`.pde/\` folder is invisible to the next session.

## Usage

> \`mw skill run\` has no implementation and exits 3. \`mw_decompose_prompt\` is real.
>
> \`mw skill install wave-spec-generator\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mw skill run wave-spec-generator "Add caching layer"
\`\`\`
`,
  },
  {
    name: 'ceremony-guide',
    title: 'Ceremony Guide',
    description: 'Open a ceremony bound to its episode and circle, list it, and close it with its learnings, by CLI or MCP',
    target: 'cli',
    body: `# Skill: Ceremony Guide

## Purpose
Open a ceremony, bind it to the episode and the circle it belongs to, and close
it with what was learned.

## What runs today

From the CLI:

\`\`\`
mw ceremony open "<intention>"        # an opening, in the East
mw ceremony list [--direction east]
mw ceremony get <id>
mw ceremony close <id> "<summary>"
\`\`\`

Through MCP:

\`\`\`
mw_ceremony_open { intention: "<the intention>", type: "talking_circle", direction: "east",
                   episode_path: "<episode directory name>", circle_id: "<circle id>" }
list_ceremonies { episode_path: "<episode directory name>" }
get_ceremony { ceremony_id: "<id>" }
mw_ceremony_close { ceremony_id: "<id>", summary: "<what happened>", learnings: ["<one>"] }
\`\`\`

\`mw_ceremony_open\` also takes \`participants\`, \`medicines\`, \`inquiryRef\` and
\`cycleId\`. \`type\` is \`opening\` (the default), \`talking_circle\`, \`smudging\` or
\`spirit_feeding\`. A \`closing\` is written by \`mw_ceremony_close\`, linked to
the opening it closes. \`episode_path\` is the episode's directory name, never
its number. \`list_ceremonies\` filters by \`direction\`, \`type\`,
\`episode_path\`, \`circle_id\` and \`subject_id\`.

## Phases

\`ontology-core\` names four: \`opening\`, \`council\`, \`integration\`, \`closure\`.
\`ceremony-protocol\` carries a longer cycle: \`gathering\`, \`kindling\`,
\`tending\`, \`harvesting\`, \`resting\`.

## What is NOT here

These tools check no seat, write no episode note and keep no audit: they are
the door for an agent's own ceremony. A talking circle that people sit in, with
seats, spoken turns and a note in the episode, opens through Miadi
(\`POST /api/circles/<id>/ceremonies\`).

## Usage

> \`mw skill run\` has no implementation and exits 3. The calls above are real.
>
> \`mw skill install ceremony-guide\` writes this SKILL.md into \`.mw/skills/\`.

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
    description: 'Run the Medicine Wheel server in Docker with mwsrv --docker, and check that it answers',
    target: 'srv',
    body: `# Skill: Docker Setup

## Purpose
Run the Medicine Wheel server in a container, with its data kept on the host,
and check that it answers.

## What runs today

\`\`\`
mwsrv --docker [--pull] [-p 8040] [-D <dir>]
\`\`\`

It runs \`jgwill/medicine-wheel:app\` with the host's \`<dir>/.mw/store\` (default:
the working directory) mounted at \`/data/store\`, and passes
\`MW_DATA_DIR=/data/store\`, \`MW_STORAGE_PROVIDER=jsonl\` and \`PORT=8040\`. It
prints the \`docker run\` line before running it. \`--pull\` updates the image
first. Without \`--docker\`, \`mwsrv\` runs the same server from the installed
package.

The image is built and pushed from this repository by
\`./docker-build-push.sh [tag]\` (tag \`app\` by default).

## Checks

\`\`\`
docker info >/dev/null && echo "docker answers"
docker image inspect jgwill/medicine-wheel:app >/dev/null && echo "image present"
curl -s http://localhost:8040/api/health        # read it with api-health
\`\`\`

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. The commands above are real.
>
> \`mwsrv skill install docker-setup\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run docker-setup
\`\`\`
`,
  },
  {
    name: 'storage-config',
    title: 'Storage Configuration',
    description: 'Choose the storage provider (JSONL by default, Neon with a database URL) and check that the server took it',
    target: 'srv',
    body: `# Skill: Storage Configuration

## Purpose
Choose where the wheel keeps its nodes, edges, ceremonies and beats, and check
that the server took the choice.

## Providers (\`@medicine-wheel/storage-provider\`)

| \`MW_STORAGE_PROVIDER\` | stores in | needs |
|---|---|---|
| \`jsonl\` (default) | JSONL files | \`MW_DATA_DIR\`, else a \`.mw/store\` folder resolved from the working directory |
| \`neon\` | PostgreSQL (Neon) | \`DATABASE_URL\`, \`POSTGRES_URL\` or \`NEON_DATABASE_URL\` |
| \`redis\` | | named and not implemented: the factory refuses it |

## Checks

\`\`\`
curl -s "$MW_API_URL/api/health"
mw status
\`\`\`

In \`/api/health\`, \`provider\` names the provider the server chose, \`counts\`
are the whole store's nodes and ceremonies, and \`env\` says whether
\`MW_STORAGE_PROVIDER\` and \`DATABASE_URL\` are set, never their values.
\`mw status\` prints the store directory the CLI resolves.

## What is NOT here

No migration runner ships in this repository, and moving data from one provider
to another is not a command.

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. The checks above are real.
>
> \`mwsrv skill install storage-config\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run storage-config
\`\`\`
`,
  },
  {
    name: 'api-health',
    title: 'API Health Monitor',
    description: 'Read /api/health (the provider, whole-store counts, the Honcho projection and the event log) and check a wheel answers',
    target: 'srv',
    body: `# Skill: API Health Monitor

## Purpose
Say whether a wheel answers, from which store, and what it still owes.

## What runs today

\`\`\`
curl -s "$MW_API_URL/api/health"      # MW_API_URL defaults to http://localhost:8040
mw status
\`\`\`

\`/api/health\` answers:

- \`status\`, \`healthy\` or \`unhealthy\` (with the \`error\`);
- \`provider\`, the storage provider in use;
- \`counts\`, nodes and ceremonies across the whole store, never a page of it;
- \`honcho\`, the projection to Honcho (enabled when \`HONCHO_URL\` is set) and
  what is still \`pending\`;
- \`events\`, the event log: how many events, the last one, and what a
  publisher still owes;
- \`env\`, whether \`MW_STORAGE_PROVIDER\` and \`DATABASE_URL\` are set.

\`mw status\` says whether \`/api/directions\` answers within two seconds, where
the MCP server is, and which store directory the CLI resolves.

Other routes worth reading: \`/api/directions\`, \`/api/nodes\`,
\`/api/ceremonies\`, \`/api/events\`.

## What is NOT here

No response-time measurement ships here. \`curl -s -o /dev/null -w '%{time_total}\\n' <url>\`
gives one.

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. The calls above are real.
>
> \`mwsrv skill install api-health\` writes this SKILL.md into \`.mw/skills/\`.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run api-health
\`\`\`
`,
  },
  {
    name: 'session-manager',
    title: 'Session Manager',
    description: 'Read what a recorded agent session did, from its _sessiondata events, with mw_analyze_session',
    target: 'srv',
    body: `# Skill: Session Manager

## Purpose
Read what an agent session did, from the events recorded for it.

## What runs today

\`\`\`
mw_analyze_session { sessionId: "<session id>" }
\`\`\`

It reads the session's JSONL events from \`_sessiondata/\` under the working
directory, or from \`SESSION_DATA_DIR\`, and answers the \`model\`, the
\`eventCount\`, the \`analytics\` and the five tools the session used most.

\`@medicine-wheel/session-reader\` holds the rest as a library: \`listSessions\`,
\`searchSessions\`, \`getSessionSummary\`, \`getSessionEvents\`,
\`getSessionDetail\`, and \`getSessionBindings\` (a session's binding lines: one
per start, resume, rename and end).

## What is NOT here

No CLI command, route or MCP tool lists sessions, and nothing here deletes
session data. A session still running is someone's work in progress: read it,
never clear it.

## Usage

> \`mwsrv skill run\` has no implementation and exits 3. \`mw_analyze_session\` is real.
>
> \`mwsrv skill install session-manager\` writes this SKILL.md into \`.mw/skills/\`.

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
  \`NodeType\` each kind rides. The union stays closed at eight
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

/**
 * The SKILL.md a skill installs as: front matter carrying its name and
 * description, then its body. Descriptions are written as plain YAML scalars
 * (no `: `, no ` #`, no leading indicator), so the front matter needs no quoting.
 */
export function renderSkill(skill: SkillDefinition): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.body}`;
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

    const content = renderSkill(skill);
    if (fs.existsSync(skillFile)) {
      // An existing file is never overwritten. Say so honestly when the copy
      // on disk no longer matches the catalog, otherwise "already installed"
      // reads as "up to date" while the reader follows outdated instructions.
      let onDisk = '';
      try { onDisk = fs.readFileSync(skillFile, 'utf8'); } catch { /* unreadable → treat as drifted */ }
      if (onDisk === content) {
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
    fs.writeFileSync(skillFile, content, 'utf8');
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
