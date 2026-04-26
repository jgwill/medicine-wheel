# Medicine Wheel GitHub Copilot Plugin — RISE Specification

> **Status:** proposal

## 1. Purpose

Define a future dedicated GitHub Copilot plugin for Medicine Wheel that helps agents and users work with this repository using repo-grounded concepts rather than generic software prompts.

The MVP purpose is to provide a **Fire Keeper-centered orchestration kit** for:

- direction inquiry
- wave orchestration
- wave-spec generation
- relational gating before action

## 2. Problem statement

The repository already contains strong building blocks, but they are spread across packages and artifact conventions:

- Four Directions engineering inquiry in `src/prompt-decomposition`
- ceremony framing and governance checks in `src/ceremony-protocol`
- active gating and permission tiers in `src/fire-keeper`
- wave-oriented orchestration in `.pde/*-wave/`

A future plugin should make these usable as a coherent working kit for agents without claiming more automation than the repo currently supports.

## 3. Repo-grounded foundations

### 3.1 Four Directions vocabulary

The plugin must ground engineering vocabulary in `src/prompt-decomposition`:

- **East = Vision**
- **South = Analysis**
- **West = Validation**
- **North = Action**

References:

- `src/prompt-decomposition/README.md:5-8`
- `src/prompt-decomposition/src/storage.ts:85-90`
- `rispecs/prompt-decomposition.spec.md:53-69`

### 3.2 Existing wave artifact patterns

The plugin must understand both `.pde` artifact styles already present:

1. flat decomposition files: `.pde/<id>.json` and `.pde/<id>.md`
2. wave directories with `ORCHESTRATION.md`, `PROMPT.txt`, and `artifacts/`

References:

- `src/prompt-decomposition/src/storage.ts:4-10,21-67`
- `.pde/487277ff-5ccd-46af-8a4e-41bced99a02c.json`
- `.pde/20260423-092004-copilot-storage-provider-wave/ORCHESTRATION.md`
- `.pde/20260423-092004-copilot-storage-provider-wave/PROMPT.txt`

### 3.3 Three distinct phase systems

The plugin must preserve this distinction:

| System | Source | Phase set | Meaning |
| --- | --- | --- | --- |
| Engineering wave phases | `.pde/*-wave/ORCHESTRATION.md` | scout → design → design review → implementation → implementation review → revision → test/validation | software delivery orchestration |
| Ceremony protocol phases | `src/ceremony-protocol` | opening → council → integration → closure | formal ceremony framing |
| Fire Keeper extended phases | `src/fire-keeper` | gathering → kindling → tending → harvesting → resting | active stewardship lifecycle |

The proposal must not collapse them into one universal phase model.

## 4. Boundaries

### In scope for MVP

- Fire Keeper-style orchestration prompts and decisions
- Four Directions inquiry over engineering work
- `.pde` wave creation guidance and artifact templates
- reading current wave status and next-step guidance
- advisory ceremony framing from `src/ceremony-protocol`

### Out of scope for MVP

- automated GitHub issue creation
- automated PR creation or review routing
- ceremonial GitOps or deployment enforcement
- authoritative governance approval workflows
- any claim that the plugin is already implemented in this repo

### Deferred proposal scope

- **Phase 2:** issue drafting, backlog ceremony, richer governance-aware planning
- **Phase 3:** PR choreography, GitOps guidance, broader orchestration kit automation

## 5. Proposed plugin manifest shape

```json
{
  "name": "medicine-wheel",
  "description": "Proposal for a Medicine Wheel Copilot plugin centered on Fire Keeper orchestration, direction inquiry, and .pde wave development workflows.",
  "version": "0.1.0-proposal",
  "author": {
    "name": "Medicine Wheel project"
  },
  "repository": "https://github.com/jgwill/medicine-wheel",
  "license": "MIT",
  "keywords": [
    "medicine-wheel",
    "fire-keeper",
    "prompt-decomposition",
    "ceremony",
    "orchestration",
    "copilot"
  ],
  "agents": [
    "./agents"
  ],
  "skills": [
    "./skills/direction-inquiry",
    "./skills/wave-spec-generator",
    "./skills/fire-keeper-check",
    "./skills/wave-status"
  ]
}
```

This shape follows the reference plugin manifests at:

- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/context-engineering/.github/plugin/plugin.json`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/software-engineering-team/.github/plugin/plugin.json`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/frontend-web-dev/.github/plugin/plugin.json`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/typescript-mcp-development/.github/plugin/plugin.json`

## 6. Proposed agents

### 6.1 `medicine-wheel-fire-keeper`

**Purpose:** steward inquiry work through gates, check-back, and permission tiers.

**Grounding references:**

- `src/fire-keeper/README.md`
- `src/fire-keeper/src/keeper.ts`
- `src/fire-keeper/src/gating.ts`
- `src/fire-keeper/src/check-back.ts`

**Inputs:**

- inquiry reference
- current fire keeper phase
- proposed action summary
- requested permission tier
- Wilson alignment / OCAP status if available
- current direction context

**Outputs:**

- decision: `accept` | `hold` | `human-needed`
- unsatisfied gates
- check-back reasoning
- next recommended move

**MVP rule:** this agent advises and orchestrates; it does not claim to replace human approval for `act`-tier work.

### 6.2 `medicine-wheel-wave-architect`

**Purpose:** translate an engineering objective into a `.pde` wave contract.

**Grounding references:**

- `.pde/20260423-092004-copilot-storage-provider-wave/ORCHESTRATION.md`
- `.pde/20260423-092004-copilot-storage-provider-wave/PROMPT.txt`
- `.pde/20260423-092004-copilot-storage-provider-wave/artifacts/*`

**Inputs:**

- objective
- relevant specs and package paths
- constraints
- validation requirements

**Outputs:**

- proposed wave name
- engineering wave phase plan
- artifact list
- validation checklist
- draft `ORCHESTRATION.md` / `PROMPT.txt` content

### 6.3 `medicine-wheel-direction-guide`

**Purpose:** interpret engineering work using East/South/West/North.

**Grounding references:**

- `src/prompt-decomposition/README.md`
- `src/prompt-decomposition/src/decomposer.ts`
- `src/prompt-decomposition/src/storage.ts`

**Inputs:**

- task or prompt text
- optional repo paths
- optional assumptions/constraints

**Outputs:**

- direction-by-direction framing
- neglected directions
- ceremony recommendation
- ordered action stack

## 7. Proposed skills

### 7.1 `direction-inquiry`

**Purpose:** turn a work request into Four Directions engineering inquiry.

**Inputs:**

- task description
- optional repo context paths
- optional existing `.pde` decomposition id

**Outputs:**

- East vision statement
- South analysis list
- West validation list
- North action stack
- directional balance summary

**Repo grounding:** `src/prompt-decomposition/README.md`, `rispecs/prompt-decomposition.spec.md`.

### 7.2 `wave-spec-generator`

**Purpose:** produce a proposal-grade wave bundle matching current `.pde` wave patterns.

**Inputs:**

- goal statement
- reference specs
- relevant source paths
- constraints and completion criteria

**Outputs:**

- `ORCHESTRATION.md` draft
- `PROMPT.txt` draft
- artifact checklist for scout/design/review/implementation/revision/validation

**Repo grounding:** `.pde/20260423-092004-copilot-storage-provider-wave/*`.

### 7.3 `fire-keeper-check`

**Purpose:** evaluate whether a proposed next action is ready to proceed.

**Inputs:**

- action description
- inquiry reference
- current phase
- current tier
- Wilson alignment / OCAP / stop-work context if known

**Outputs:**

- gate status summary
- check-back result
- human escalation recommendation if needed
- suggested deepening direction

**Repo grounding:** `src/fire-keeper/src/gating.ts`, `src/fire-keeper/src/check-back.ts`, `src/fire-keeper/src/keeper.ts`.

### 7.4 `wave-status`

**Purpose:** inspect a `.pde` wave directory and report progress.

**Inputs:**

- wave directory path

**Outputs:**

- detected artifacts
- missing artifacts
- likely current engineering wave phase
- validation readiness summary

**Repo grounding:** `.pde/20260423-092004-copilot-storage-provider-wave/artifacts/*`.

## 8. User and agent workflows

### Workflow A: start a new engineering wave

1. run `direction-inquiry`
2. run `wave-spec-generator`
3. optionally invoke `medicine-wheel-wave-architect`
4. start work under Fire Keeper advisory checks

### Workflow B: evaluate whether to proceed

1. invoke `fire-keeper-check`
2. if result is `hold`, deepen in the requested direction
3. if result is `human-needed`, stop at proposal level and surface decision need

### Workflow C: inspect an active wave

1. invoke `wave-status`
2. map artifact completeness against engineering wave phases
3. optionally ask `medicine-wheel-direction-guide` for rebalance

## 9. Implementation phases

### Phase 1 — MVP plugin package

Deliver a proposal-to-prototype plugin with:

- plugin manifest
- README
- Fire Keeper agent
- Wave Architect agent
- Direction Guide agent
- direction inquiry skill
- wave spec generator skill
- fire keeper check skill
- wave status skill

### Phase 2 — planning and governance extensions

Proposal scope only:

- ceremony-aware issue drafting
- backlog triage prompts
- governance-sensitive planning helpers
- deeper ceremony protocol framing outputs

### Phase 3 — collaboration and GitHub workflow extensions

Proposal scope only:

- PR planning bundles
- PR review ceremony helpers
- GitOps/deployment advisory flows
- issue/PR/wave cross-linking

## 10. Validation expectations

A future implementation should validate against both plugin patterns and repo behavior.

### Package-level expectations

- manifest shape matches working reference plugin manifests
- README clearly lists included agents and skills
- each agent file has frontmatter and explicit instructions
- each skill has frontmatter and task/output structure

### Repo-grounding expectations

- direction labels use **Vision / Analysis / Validation / Action** exactly
- `.pde` support covers both flat decomposition artifacts and wave directories
- docs distinguish all three phase systems explicitly
- Fire Keeper checks reference gates, permission tiers, and check-back rather than inventing new governance primitives

### Functional expectations for a future prototype

- can generate a wave spec that resembles the current storage-provider wave structure
- can explain why a task is East-, South-, West-, or North-heavy
- can produce hold/human-needed outcomes consistent with Fire Keeper behavior
- does not present issue/PR/GitOps automation as implemented MVP capability

### Repo validation commands

For this repository, `npm run build` is a valid verification command for changes that should not break the monorepo build. `npm run lint` currently prompts for ESLint setup in this repo state, so it should not be treated as a stable non-interactive validation gate until configured.

## 11. External pattern references

Use these plugin patterns as the starting format references:

- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/software-engineering-team/README.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/software-engineering-team/agents/*`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/context-engineering/README.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/context-engineering/agents/context-architect.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/context-engineering/skills/context-map/SKILL.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/frontend-web-dev/README.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/typescript-mcp-development/README.md`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/typescript-mcp-development/skills/typescript-mcp-server-generator/SKILL.md`

## 12. Acceptance criteria for this proposal set

This proposal is sufficient if a future agent can use it to build an orchestration kit that:

- understands Medicine Wheel direction vocabulary
- separates wave phases from ceremony protocol phases and Fire Keeper phases
- generates repo-grounded wave specs
- applies Fire Keeper-style gating before action
- leaves GitHub issue/PR/GitOps automation in later proposal phases

## 13. Summary

The future Medicine Wheel plugin should be described as a **proposal-grade orchestration plugin**, with an MVP focused on Fire Keeper stewardship, direction inquiry, and `.pde` wave development support.
