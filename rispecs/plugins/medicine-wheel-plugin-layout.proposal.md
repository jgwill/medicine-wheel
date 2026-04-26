# Proposed Layout for a Future Medicine Wheel Copilot Plugin

> **Status:** proposal

## 1. Layout goals

The future plugin layout should mirror the proven Awesome Copilot structure while staying grounded in Medicine Wheel concepts already present in this repo.

Reference patterns:

- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/context-engineering`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/software-engineering-team`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/frontend-web-dev`
- `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins/typescript-mcp-development`

## 2. Proposed package tree

```text
medicine-wheel-plugin/
├── .github/
│   └── plugin/
│       └── plugin.json                # proposal: Copilot plugin manifest
├── README.md                          # proposal: install + included agents/skills
├── agents/
│   ├── medicine-wheel-fire-keeper.md
│   ├── medicine-wheel-wave-architect.md
│   └── medicine-wheel-direction-guide.md
└── skills/
    ├── direction-inquiry/
    │   └── SKILL.md
    ├── wave-spec-generator/
    │   └── SKILL.md
    ├── fire-keeper-check/
    │   └── SKILL.md
    └── wave-status/
        └── SKILL.md
```

## 3. Why this layout fits the repo

### `.github/plugin/plugin.json`

This matches the plugin manifests used by the reference plugins and gives a future agent one predictable entrypoint for metadata and registration.

### `agents/`

Agents should capture stable orchestration roles rather than single prompts:

- **Fire Keeper**: stewarding permission tiers, gating, and check-back
- **Wave Architect**: creating or revising `.pde` wave structures
- **Direction Guide**: turning work into East/South/West/North inquiry paths

### `skills/`

Skills should be narrow, high-value operations a user or agent can invoke repeatedly.

## 4. Proposed agent responsibilities

### `agents/medicine-wheel-fire-keeper.md`

**Purpose:** operational steward for inquiry orchestration.

Repo grounding:

- `src/fire-keeper/src/keeper.ts`
- `src/fire-keeper/src/gating.ts`
- `src/fire-keeper/src/check-back.ts`

**Primary behaviors:**

- start or inspect a ceremony context
- review a proposed action against gates
- determine hold / accept / human-needed outcome
- keep `act` tier out of autonomous MVP behavior

### `agents/medicine-wheel-wave-architect.md`

**Purpose:** create repo-grounded wave plans that fit existing `.pde` conventions.

Repo grounding:

- `.pde/20260423-092004-copilot-storage-provider-wave/ORCHESTRATION.md`
- `.pde/20260423-092004-copilot-storage-provider-wave/PROMPT.txt`
- `.pde/20260423-092004-copilot-storage-provider-wave/artifacts/*`

**Primary behaviors:**

- generate new wave scaffolds
- map a task to scout/design/review/implementation/revision/test phases
- produce artifact checklists and validation expectations

### `agents/medicine-wheel-direction-guide.md`

**Purpose:** interpret work using the Four Directions engineering vocabulary.

Repo grounding:

- `src/prompt-decomposition/README.md`
- `rispecs/prompt-decomposition.spec.md`

**Primary behaviors:**

- analyze a request by direction
- surface neglected directions
- suggest next inquiries and action stack ordering

## 5. Proposed skill responsibilities

### `skills/direction-inquiry/SKILL.md`

**Input:** engineering task, optional constraints, optional repo paths.

**Output:**

- East vision statement
- South analysis questions
- West validation checks
- North action stack
- ceremony recommendation if balance is poor

### `skills/wave-spec-generator/SKILL.md`

**Input:** goal, relevant specs, target paths, constraints.

**Output:** proposal-grade wave bundle matching current `.pde` practice:

- `ORCHESTRATION.md`
- `PROMPT.txt`
- `artifacts/` checklist or skeleton list

### `skills/fire-keeper-check/SKILL.md`

**Input:** proposed action, inquiry reference, current tier, current phase, Wilson/OCAP metadata.

**Output:**

- accept / hold / human-needed assessment
- unsatisfied gates
- check-back step results
- suggested next move

### `skills/wave-status/SKILL.md`

**Input:** existing `.pde` wave path.

**Output:**

- detected engineering wave phase status
- artifact completeness summary
- validation gaps
- proposed next phase

## 6. Proposed naming rules

Use names that distinguish the three phase systems:

- `wave-*` for engineering wave operations
- `direction-*` for Four Directions inquiry operations
- `fire-keeper-*` for gating and stewardship operations
- `ceremony-protocol-*` only when referring to the formal opening/council/integration/closure framing

## 7. Proposed boundaries

The future plugin layout should **not** include MVP agents or skills named around:

- GitHub issue filing
- PR drafting
- auto-merge or deployment
- GitOps ceremony enforcement

Those belong to later proposal phases only.

## 8. Layout conclusion

This layout keeps the initial plugin small, legible, and closely mapped to real repo primitives already present today.
