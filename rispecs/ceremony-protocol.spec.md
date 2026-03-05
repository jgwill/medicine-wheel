# ceremony-protocol — RISE Specification

> Ceremony lifecycle protocol — manages ceremony state, phase transitions, governance enforcement, and ceremonial review workflows for the Medicine Wheel ecosystem.

**Version:** 0.1.1  
**Package:** `medicine-wheel-ceremony-protocol`  
**Document ID:** rispec-ceremony-protocol-v1  
**Last Updated:** 2026-02-23  

---

## Desired Outcome

Users create **ceremony-aware development workflows** where:
- Code changes in sacred or protected paths trigger governance checks
- Ceremony phases (opening → council → integration → closure) frame collaborative work
- File-level access control respects Indigenous governance protocols
- Phase transitions advance the ceremonial inquiry ecosystem naturally

---

## Creative Intent

**What this enables:** Software teams naturally move through ceremonial inquiry cycles. The protocol surfaces governance warnings when protected paths are modified, ensures ceremony is conducted at phase boundaries, and provides phase-aware framing for tool outputs.

**Structural Tension:** Between standard git-based development (unrestricted file modification) and Indigenous governance requirements (certain knowledge requires ceremonial review, elder approval, or restricted access). The ceremony-protocol resolves this by checking paths against configurable governance rules.

---

## Ceremony State

```typescript
interface CeremonyState {
  currentCycle: string;
  hostSun: SunName;
  phase: CeremonyPhase;
  startDate?: string;
  endDate?: string;
}

// Load from RSIS config
loadCeremonyState(config: RSISConfig): CeremonyState | null
```

---

## Phase Transitions

Four ceremony phases follow the Four Directions:

| Phase | Direction | Focus |
|-------|-----------|-------|
| `opening` | East | What wants to emerge? Intention and vision |
| `council` | South | Cross-Sun perspectives on code relationships |
| `integration` | West | Weaving insights into synthesis artifacts |
| `closure` | North | Reciprocity summaries and seeding observations |

```typescript
nextPhase('opening')     // → 'council'
nextPhase('council')     // → 'integration'
nextPhase('integration') // → 'closure'
nextPhase('closure')     // → null (cycle complete)

getPhaseFraming('council')
// → 'Council Phase — Cross-Sun perspectives on code relationships.'
```

---

## Governance Enforcement

### Protected Path Checking

```typescript
checkGovernance(filePath, governanceConfig)
// Returns GovernanceProtectedPath | null
// Supports glob patterns in path (e.g., 'sacred/*.md') and prefix matching

// Example governance config:
{
  protected_paths: [
    { path: 'ceremonies/', authority: ['elder', 'firekeeper'], access: 'sacred' },
    { path: 'teachings/*.md', authority: ['steward'], access: 'ceremony_required' }
  ],
  ceremony_required_changes: ['ontology/*.ts', 'sacred/*'],
  index_exclusions: ['private/', 'sacred/']
}
```

### Access Level Resolution

```typescript
getAccessLevel(filePath, config): GovernanceAccess
// Returns: 'open' | 'ceremony_required' | 'restricted' | 'sacred'
```

### Index Exclusion

```typescript
isIndexExcluded(filePath, config): boolean
// True if path should not appear in search indexes
// Supports glob patterns and prefix matching
```

### Ceremony-Required Changes

```typescript
checkCeremonyRequired(filePath, config): boolean
// True if changes to this path need ceremonial review
// Supports glob patterns (e.g., 'ontology/*.ts')
```

### Governance Warnings

```typescript
formatGovernanceWarning(rule)
// → '⚠️ GOVERNANCE: Changes to [ceremonies/] require [elder, firekeeper] approval. Access level: sacred'
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.1
- **Types consumed:** `RSISConfig`, `CeremonyPhase`, `SunName`, `GovernanceConfig`, `GovernanceProtectedPath`, `GovernanceAccess`

---

## Advancing Patterns

- **Ceremony-as-code** — Governance rules live alongside source code, evolving with the project
- **Phase framing** — Every tool output is contextualized by the current ceremony phase
- **Non-blocking guidance** — Governance checks inform, they don't prevent; respect for human agency
- **Glob-based matching** — Flexible pattern matching for ceremony-required paths

---

## Quality Criteria

- ✅ Creative Orientation: Enables ceremony-aware development, not just access control
- ✅ Structural Dynamics: Resolves tension between open development and Indigenous governance
- ✅ Implementation Sufficient: Full API surface documented with types and examples
- ✅ Codebase Agnostic: No file paths, conceptual governance model
