# Plugin Architecture Report — Medicine Wheel

**Status:** proposal  
**Scope:** plugin layout and orchestration model for a future dedicated Medicine Wheel Copilot plugin

## Repo-grounded anchors

1. `src/prompt-decomposition` is the strongest source for engineering-direction vocabulary:
   - East = Vision
   - South = Analysis
   - West = Validation
   - North = Action
2. `src/ceremony-protocol` defines the formal ceremony lifecycle:
   - opening
   - council
   - integration
   - closure
3. `src/fire-keeper` defines the active stewardship lifecycle:
   - gathering
   - kindling
   - tending
   - harvesting
   - resting
4. `.pde/` already contains two artifact styles:
   - flat decomposition artifacts (`.pde/<id>.json`, `.pde/<id>.md`)
   - wave directories (`.pde/<timestamp>--<id>/ORCHESTRATION.md`, `PROMPT.txt`, `artifacts/`)

## Proposed plugin purpose

Create a future `medicine-wheel` Copilot plugin that helps users and agents:

1. classify engineering work through the Four Directions
2. generate and manage `.pde` wave contracts
3. apply Fire Keeper gating before action
4. read wave status and artifact completeness

## Proposed MVP boundaries

### In scope

- Fire Keeper orchestration
- direction inquiry
- wave-spec generation
- wave-status inspection
- advisory ceremony framing

### Out of scope

- issue automation
- PR automation
- ceremonial GitOps automation
- deployment enforcement
- any claim that the plugin already exists in this repo

## Proposed plugin layout

```text
medicine-wheel-plugin/
├── .github/plugin/plugin.json
├── README.md
├── agents/
│   ├── medicine-wheel-fire-keeper.md
│   ├── medicine-wheel-wave-architect.md
│   └── medicine-wheel-direction-guide.md
└── skills/
    ├── direction-inquiry/SKILL.md
    ├── wave-spec-generator/SKILL.md
    ├── fire-keeper-check/SKILL.md
    └── wave-status/SKILL.md
```

## External plugin patterns to borrow

- `plugins/context-engineering` for agent/skill separation and context-mapping patterns
- `plugins/software-engineering-team` for specialized operational agents
- `plugins/typescript-mcp-development` for long-form generator skill structure
- `plugins/frontend-web-dev` for focused skill naming and README packaging

## Architecture recommendation

The strongest MVP is:

1. **Fire Keeper**
2. **Wave Architect**
3. **Direction Guide**
4. supporting skills for direction inquiry, wave spec generation, Fire Keeper checks, and wave status

Ceremonial GitHub issue / PR / GitOps behavior should remain **Phase 2/3 proposal scope**, not MVP.
