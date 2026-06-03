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
\`\`\`
mw skill run ceremony-guide "Community data review"
\`\`\`
`,
  },

  {
    name: 'rise-spec-advisor',
    title: 'RISE Spec Advisor (Mission 3)',
    description: 'Orchestrate subagents to recommend upgrades or new RISE framework specs',
    target: 'cli',
    body: `# Skill: RISE Spec Advisor (Mission 3)

## Purpose
Orchestrate subagents (claude-opus-4.6) to analyse existing RISE specifications
and recommend upgrades, new specs, or new proposals (e.g. "plugin proposal").

## Guidance
Fetch the RISE framework reference before analysis:
\`\`\`
https://llms.jgwill.com/llms-rise-framework.txt
\`\`\`

## Input
- Path to \`rispecs/\` directory (default: project root)
- Optional: focus area or specific spec file to evaluate

## Workflow
1. **Scan** — Inventory existing \`.spec.md\` and \`.proposal.md\` files in \`rispecs/\`
2. **Fetch** — Retrieve the RISE framework guidance from the URL above
3. **Analyse** — For each spec, evaluate alignment with RISE principles:
   - Creative orientation over reactive approaches
   - Structural tension dynamics
   - Advancing vs oscillating patterns
   - SpecLang syntax compliance
4. **Recommend** — Produce one of:
   - **Upgrade** — Concrete changes to bring an existing spec closer to RISE
   - **New spec** — A new \`.spec.md\` file for an uncovered capability
   - **New proposal** — A new \`.proposal.md\` for emerging ideas (e.g. plugin proposal)

## Output
- Summary table of scanned specs with RISE alignment score
- Ranked list of recommendations (upgrade / new spec / new proposal)
- For each recommendation: rationale, structural tension analysis, and draft outline

## Usage
\`\`\`
mw skill run rise-spec-advisor
mw skill run rise-spec-advisor --focus "plugin proposal"
mw skill run rise-spec-advisor --spec rispecs/fire-keeper.spec.md
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
\`\`\`
mwsrv skill run session-manager
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
 * @returns number of newly installed skills
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
    return 0;
  }

  let installed = 0;
  for (const skill of toInstall) {
    const skillDir = path.join(dir, skill.name);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (fs.existsSync(skillFile)) {
      console.log(`  ${C.dim}⊘ ${skill.name} (already installed)${C.reset}`);
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

  return installed;
}
