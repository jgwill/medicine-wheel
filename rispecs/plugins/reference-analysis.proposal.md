# Reference Analysis for a Future Medicine Wheel Copilot Plugin

> **Status:** proposal

## 1. Purpose

This analysis grounds a future Medicine Wheel GitHub Copilot plugin in repository reality. It documents what already exists, what plugin patterns are available to imitate, and what must remain proposal-only until implemented.

## 2. Repo-grounded sources to treat as canonical

### Four Directions engineering vocabulary

`src/prompt-decomposition` is the strongest source for the plugin's engineering-direction language:

- **East = Vision** (`src/prompt-decomposition/README.md:7`, `src/prompt-decomposition/src/storage.ts:85-90`)
- **South = Analysis** (`src/prompt-decomposition/README.md:7`, `src/prompt-decomposition/src/storage.ts:85-90`)
- **West = Validation** (`src/prompt-decomposition/README.md:7`, `src/prompt-decomposition/src/storage.ts:85-90`)
- **North = Action** (`src/prompt-decomposition/README.md:7`, `src/prompt-decomposition/src/storage.ts:85-90`)

The future plugin should reuse this vocabulary exactly for engineering inquiry prompts, decomposition summaries, and wave planning outputs.

### `.pde` artifact reality

The repo already uses `.pde` in **two distinct forms**:

1. **Flat prompt-decomposition artifacts** written as `.json` and `.md` pairs at the `.pde/` root (`src/prompt-decomposition/src/storage.ts:4-10`, `.pde/487277ff-5ccd-46af-8a4e-41bced99a02c.json`, `.pde/487277ff-5ccd-46af-8a4e-41bced99a02c.md`).
2. **Wave directories** containing orchestration contracts and artifacts (`.pde/20260423-092004-copilot-storage-provider-wave/ORCHESTRATION.md`, `.pde/20260423-092004-copilot-storage-provider-wave/PROMPT.txt`, `.pde/20260423-092004-copilot-storage-provider-wave/artifacts/*`).

The plugin spec should not flatten these into one model. A future agent must understand both artifact styles.

## 3. Three phase systems that must stay distinct

A future plugin must explicitly separate these systems instead of blending them into a single “phase” abstraction.

### A. Engineering wave phases (`.pde` wave orchestration)

The existing wave contract in `.pde/20260423-092004-copilot-storage-provider-wave/ORCHESTRATION.md` uses an engineering workflow:

1. scout
2. design
3. design review
4. implementation
5. implementation review
6. revision
7. test / validation

This is best treated as a **software delivery orchestration cycle**.

### B. Ceremony protocol phases (`src/ceremony-protocol`)

`src/ceremony-protocol` defines the primary ceremony protocol lifecycle as:

- `opening`
- `council`
- `integration`
- `closure`

See `src/ceremony-protocol/README.md:73-80` and `src/ceremony-protocol/src/index.ts:39-57`.

This is best treated as the **formal ceremony framing protocol**.

### C. Fire Keeper extended phases (`src/fire-keeper`)

`src/fire-keeper` defines an extended operational lifecycle:

- `gathering`
- `kindling`
- `tending`
- `harvesting`
- `resting`

See `src/fire-keeper/README.md:11-15` and `src/fire-keeper/src/types.ts:13-26`.

This is best treated as the **active orchestration and gating lifecycle** for an inquiry under Fire Keeper stewardship.

### Implication for plugin design

The proposed plugin should expose these as three named systems:

- **wave phases**
- **ceremony protocol phases**
- **fire keeper phases**

It should never imply that `opening == gathering` or `closure == resting` as a strict equivalence. At most, the repo currently provides partial mappings and framings (`src/ceremony-protocol/src/index.ts:123-170`).

## 4. What the repo already supports well enough for an MVP

### Fire Keeper as the orchestration center

`src/fire-keeper` already provides the best MVP anchor because it has concrete behavior, not only language:

- `FireKeeper.beginCeremony()` starts an inquiry container (`src/fire-keeper/src/keeper.ts:71-88`)
- `FireKeeper.evaluateImportance()` evaluates submissions against gates and relational check-back (`src/fire-keeper/src/keeper.ts:90-185`)
- `DEFAULT_GATES` provides reusable gating defaults (`src/fire-keeper/src/gating.ts:96-133`)
- `relationalCheckBack()` provides four explicit review questions (`src/fire-keeper/src/check-back.ts:37-69`)
- permission tiers already exist: `observe`, `analyze`, `propose`, `act` (`src/fire-keeper/README.md:50-57`, `src/fire-keeper/src/types.ts:82-89`)

This is why the MVP should center on Fire Keeper rather than GitHub automation.

### Direction inquiry and decomposition

`src/prompt-decomposition` already supports:

- Four Directions classification
- directional balance scoring
- ceremony recommendation
- ordered action stack generation
- `.pde` persistence for decompositions

See `src/prompt-decomposition/README.md:5-8`, `rispecs/prompt-decomposition.spec.md:53-59`, and `src/prompt-decomposition/src/storage.ts:21-67`.

That makes **direction inquiry** and **wave-spec generation** realistic MVP plugin responsibilities.

### Ceremony framing and governance awareness

`src/ceremony-protocol` already contributes:

- ceremony-phase framing
- governance checks by path
- ceremony-required path detection

See `src/ceremony-protocol/README.md:7-13` and `rispecs/ceremony-protocol.spec.md:70-118`.

For MVP, this should stay advisory and framing-oriented rather than a complete automation system.

## 5. What should remain proposal status

The repo does **not** yet justify calling the following finished architecture:

- dedicated GitHub Copilot plugin package in this repository
- stable plugin agents/skills shipped to Copilot users
- ceremonial GitOps workflow automation
- issue drafting / issue routing automation
- PR drafting / PR review choreography automation
- complete cross-repo orchestration kit

Those can be proposed, but not described as already implemented.

## 6. Recommended MVP scope

The strongest repo-grounded MVP is:

1. **Fire Keeper inquiry orchestration**
2. **Direction inquiry over an engineering request**
3. **Wave-spec generation into `.pde` wave structure**
4. **Wave status / wave artifact reading**

This aligns directly with implemented repo capabilities and avoids overselling future GitHub workflow automation.

## 7. Recommended deferred scope

### Phase 2 proposals

- ceremony-aware issue drafting
- ceremonial backlog triage
- repo governance warnings in planning flows
- richer wave artifact templates and review prompts

### Phase 3 proposals

- PR planning and review bundles
- ceremonial GitOps / deployment guidance
- automated issue/PR linkage across waves
- multi-repo orchestration kit generation

## 8. External plugin patterns worth following

The best reference patterns live in `/workspace/repos/miadisabelle/mia-awesome-copilot/plugins`.

### Packaging pattern

Each plugin uses `.github/plugin/plugin.json` with top-level metadata and arrays for `agents` and optional `skills`:

- `plugins/context-engineering/.github/plugin/plugin.json`
- `plugins/software-engineering-team/.github/plugin/plugin.json`
- `plugins/frontend-web-dev/.github/plugin/plugin.json`
- `plugins/typescript-mcp-development/.github/plugin/plugin.json`

### Documentation pattern

Each plugin has a concise `README.md` that explains installation plus included agents/skills.

### Agent pattern

Agents are markdown files with frontmatter (`name`, `description`, `model`, `tools`) and instruction bodies, for example:

- `plugins/context-engineering/agents/context-architect.md`
- `plugins/software-engineering-team/agents/se-gitops-ci-specialist.md`

### Skill pattern

Skills live under `skills/<skill-name>/SKILL.md` with frontmatter and a task-oriented template, for example:

- `plugins/context-engineering/skills/context-map/SKILL.md`
- `plugins/typescript-mcp-development/skills/typescript-mcp-server-generator/SKILL.md`

## 9. Design guidance distilled from the references

A future Medicine Wheel plugin should likely follow this packaging pattern:

- one plugin package
- a small set of named agents
- a small set of high-value skills
- Markdown-first implementation instructions
- explicit proposal labeling until the plugin exists

## 10. Bottom line

A repo-grounded plugin proposal should describe a future plugin as:

- **direction-aware** via `src/prompt-decomposition`
- **ceremony-aware** via `src/ceremony-protocol`
- **actively gated** via `src/fire-keeper`
- **wave-oriented** via `.pde` wave directories

It should **not** present ceremonial GitOps or GitHub issue/PR automation as MVP reality.
