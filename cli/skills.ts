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
    complement: 'infra-monitor',
    body: `# Skill: Infrastructure Audit

## Purpose
Analyze infrastructure facets (hosts, tenants, services) and surface relationships, conflicts, and métis.

## Input
- Target host (optional — audit all if omitted)
- Facet type filter (host / tenant / service, optional)
- Conflict scope (declared / observed / union)

## Output
- Graph: hosts → tenants → services with port bindings
- Port conflicts (distinct services colliding on same host|proto|port)
- Métis surface (invisible work, exceptions, heldBy accountability)
- Reachability status (lan / tailnet / cloudflare / ngrok)

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install infrastructure-audit\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run infrastructure-audit --host eury
mw skill run infrastructure-audit --type service --conflicts
\`\`\`
`,
  },
  {
    name: 'service-provisioning',
    title: 'Service Provisioning',
    description: 'Propose and gate service deployment through ceremony-aware preconditions',
    target: 'cli',
    complement: 'infra-monitor',
    body: `# Skill: Service Provisioning

## Purpose
Propose a new service and check preconditions (port availability, consent, linger-state alignment) via ceremony gates.

## Input
- Service name and unit (e.g., assembly-mux.service)
- Port binding claims (host, port, proto)
- Owner (tenant nodeId)
- Optional: working directory, execStop, métis exceptions

## Output
- Precondition checks: port conflicts, tenant consent, linger alignment
- Fire Keeper gate assessment (hold / proceed)
- Community review recommendation
- Deployment ceremony phase to enter
- Diff against observed state

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install service-provisioning\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run service-provisioning \
  --unit zulip.service \
  --port 3000:tcp@eury \
  --owner "node:human:ava"
\`\`\`
`,
  },
  {
    name: 'drift-reconciliation',
    title: 'Drift Reconciliation',
    description: 'Compare declared vs observed infrastructure state and propose healing steps',
    target: 'cli',
    complement: 'infra-monitor',
    body: `# Skill: Drift Reconciliation

## Purpose
Detect infrastructure drift (declared state vs systemd observed reality) and recommend ceremony-gated remediation.

## Input
- Drift scope: specific host, all hosts, or facet type
- Healing mode: audit-only / propose-fix / execute-with-gates

## Output
- Drift report: satisfied / diverged / unobserved facets per host
- Healing candidates: services to restart, ports to release, linger to reconcile
- Ceremony phase recommendation (emergency / standard)
- Accountability notes (who holds métis on each remediation)

## Usage

> **Not available yet.** \`mw skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mw skill install drift-reconciliation\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mw skill run drift-reconciliation --host gaia --propose
mw skill run drift-reconciliation --type service --audit-only
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
    name: 'infra-monitor',
    title: 'Infrastructure Monitor',
    description: 'Live monitoring and drift detection for infrastructure facets via MCP',
    target: 'srv',
    complement: 'infrastructure-audit',
    body: `# Skill: Infrastructure Monitor

## Purpose
Monitor live infrastructure state (observed via systemd) and track drift against declared facets.

## Capabilities
- Poll systemd for active units, ports, linger-state across tenants
- Maintain observed state cache (RelationalNode facets)
- Detect port collisions in declared ∪ observed bindings
- Track métis holders and accountability chains
- Stream drift events to active CLI sessions
- Gate reconciliation requests through ceremony protocol

## Integration
- **Backend:** @medicine-wheel/infra (HostFacet, TenantFacet, ServiceFacet, detectPortConflicts)
- **MCP tools (planned, none registered yet):** infrastructure-audit, service-preconditions, drift-reconciliation, métis-surface
- **Data store:** Postgres/JSONL via @medicine-wheel/storage-provider

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install infra-monitor\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

Planned invocation (does not run yet):
\`\`\`
mwsrv skill run infra-monitor --poll-interval 30s
mwsrv skill run infra-monitor --host gaia --linger-report
\`\`\`
`,
  },
  {
    name: 'precondition-guard',
    title: 'Precondition Guard',
    description: 'Evaluate infrastructure preconditions (linger, consent, port, reachability)',
    target: 'srv',
    complement: 'service-provisioning',
    body: `# Skill: Precondition Guard

## Purpose
Enforce precondition gates before service provisioning or relational state changes. (Roadmap: @medicine-wheel/infra@0.2.0)

## Precondition Types
- **Port availability** — detectPortConflicts over declared + observed
- **Tenant linger** — required for user.slice services; consent record must authorize root step
- **Consent accountability** — ConsentRecord.id must be present and active
- **Reachability** — host must be reachable via declared transport (lan, tailnet, cloudflare, ngrok)

## Output
- Unsatisfied precondition report
- Fire Keeper hold / proceed recommendation
- Next ceremony gate to enter (if held)
- Accountability chain (who can unlock the hold)

## Usage

> **Not available yet.** \`mwsrv skill run\` has no implementation.
> It prints this explanation and exits 3 — nothing is executed. Planned, not shipped.
>
> **What works today:** \`mwsrv skill install precondition-guard\` writes this
> SKILL.md into \`.mw/skills/\`. Follow the steps above yourself, or hand this
> file to an agent.

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
