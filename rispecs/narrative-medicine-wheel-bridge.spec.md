# Narrative–Medicine Wheel Bridge — RISE Specification

> Bridge pattern connecting narrative computing platforms (like Miadi) with the Medicine Wheel package ecosystem, enabling ceremony-aware content management, Four Directions–structured agent sessions, and relational narrative intelligence.

**Version**: 0.1.0
**Status**: Active
**Packages**: medicine-wheel-ontology-core, medicine-wheel-ceremony-protocol, medicine-wheel-narrative-engine
**Lineage**: Integration pattern between jgwill/Miadi and jgwill/medicine-wheel

---

## 🌅 EAST — Vision

A bridge architecture enabling:
1. **Narrative platforms** to leverage Medicine Wheel ontology for content categorization and ceremony structuring
2. **Terminal agents** (miadi-code) to structure sessions around Four Directions ceremony protocol
3. **Web UIs** to render relational data using Medicine Wheel visual components
4. **Shared rispecs** to capture integration patterns reusable across projects

### Target Integrations

| Consumer | Medicine Wheel Package | Integration Type |
|----------|----------------------|------------------|
| Miadi Web UI | ui-components, ontology-core | Visual theming, type imports |
| Miadi Web UI | narrative-engine | Beat display, arc visualization |
| miadi-code | ceremony-protocol | Session structuring, phase transitions |
| miadi-code | ontology-core | Direction types, Wilson alignment |
| miadi-code | narrative-engine | Beat planning, story flow |

## 🔥 SOUTH — Analysis

### Package Integration Patterns

#### Pattern 1: Type-Level Integration (ontology-core)
```typescript
import { Direction, RelationalNode, WilsonAlignment } from 'medicine-wheel-ontology-core';

// Use Direction enum for content categorization
interface Article {
  direction: Direction;  // 'east' | 'south' | 'west' | 'north'
  // ...
}
```

#### Pattern 2: Ceremony Session Structuring (ceremony-protocol)
```typescript
import { CeremonyPhase } from 'medicine-wheel-ceremony-protocol';

// Structure agent sessions as ceremonies:
// opening → council → integration → closure
interface AgentSession {
  phase: CeremonyPhase;
  direction: Direction;
  // ...
}
```

#### Pattern 3: Narrative Beat Management (narrative-engine)
```typescript
import { NarrativeBeat, ArcValidator } from 'medicine-wheel-narrative-engine';

// Story beats mapped to ceremony phases
interface StorySession {
  beats: NarrativeBeat[];
  currentArc: string;
  // ...
}
```

#### Pattern 4: Visual Component Reference (ui-components)
```typescript
// Import or reference DirectionCard theming for consistent visual language
import { DirectionCard } from 'medicine-wheel-ui-components';
// Or replicate the color/icon mapping for app-specific components
```

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│          Miadi Platform                  │
│  ┌──────────┐  ┌────────────────┐      │
│  │ Web UI   │  │  miadi-code    │      │
│  │ (Next.js)│  │  (Terminal)    │      │
│  └────┬─────┘  └────────┬──────┘      │
│       │                  │              │
│  ─────┴──────────────────┴────────      │
│     Narrative–Medicine Wheel Bridge     │
│  ─────┬──────────────────┬────────      │
└───────┼──────────────────┼──────────────┘
        │                  │
┌───────▼──────────────────▼──────────────┐
│     Medicine Wheel Package Ecosystem     │
│  ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │ontology  │ │ceremony   │ │narr.   │ │
│  │  core    │ │ protocol  │ │engine  │ │
│  └──────────┘ └───────────┘ └────────┘ │
│  ┌──────────┐ ┌───────────┐            │
│  │ui-comps  │ │graph-viz  │            │
│  └──────────┘ └───────────┘            │
└─────────────────────────────────────────┘
```

## 🌊 WEST — Validation

- All Direction values must use canonical lowercase: `east`, `south`, `west`, `north`
- Medicine Wheel packages are installed via npm: `npm install medicine-wheel-ontology-core`
- Wilson alignment scoring should be computed when relational nodes cross ceremony boundaries
- OCAP® flags must be respected when bridging Indigenous knowledge data

## ❄️ NORTH — Action

### For Web UI Integration
1. Install: `npm install medicine-wheel-ontology-core medicine-wheel-ui-components`
2. Import Direction types for content categorization
3. Reference DirectionCard theming for visual consistency
4. Use narrative-engine for beat display when showing story content

### For Terminal Agent Integration
1. Install: `npm install medicine-wheel-ontology-core medicine-wheel-ceremony-protocol medicine-wheel-narrative-engine`
2. Structure agent sessions around ceremony phases (opening → council → integration → closure)
3. Map agent operations to Four Directions (East=understand, South=analyze, West=validate, North=execute)
4. Use Wilson alignment to score how well agent output respects relational principles

### For New medicine-wheel-miadi Packages
When integration patterns mature, extract reusable modules as `medicine-wheel-miadi-<component>`:
- `medicine-wheel-miadi-articles` — Article publishing pipeline with MW theming
- `medicine-wheel-miadi-sessions` — Ceremony-structured agent sessions
- `medicine-wheel-miadi-narrative` — Narrative beat integration for Miadi's story engine

---

## 🔮 Future: Narrative Context Protocol (NCP) Integration

The Narrative Context Protocol (NCP) at `/a/src/STPB/lib/ncp/` implements Dramatica-based narrative structure tracking that aligns naturally with Medicine Wheel's Four Directions. NCP provides three core capabilities that represent future integration opportunities:

### Throughline Analysis (`throughline-analyzer.ts`)

NCP tracks four Dramatica throughlines (Objective Story, Main Character, Influence Character, Relationship Story) — each mapping to a perspective ("we" collective, "I" personal, "you" alternative, "we" relational). These parallel the Four Directions' cognitive lenses and could enrich Medicine Wheel's directional classification with narrative perspective awareness.

### Coherence Validation (`coherence-validator.ts`)

Validates internal narrative consistency — throughline consistency, domain alignment, and structural completeness. This could complement Medicine Wheel's `validateArc` and `validateCadence` by adding Dramatica-informed coherence checks to ceremony-structured narratives.

### Arc Completeness & Dynamics (`dynamics.ts`)

Tracks opposing narrative forces (Knowledge vs Ignorance, Trust vs Test, Change vs Inertia) and assesses act-level analysis, climax convergence, and arc completeness gaps. These dynamics could map to Wilson's three R's tensions and enrich structural tension charts with narrative force analysis.

### Integration Pattern

A future `medicine-wheel-ncp-bridge` or extension to this bridge spec could:
- Map NCP throughlines to Four Directions perspectives
- Use NCP coherence validation alongside ceremony arc validation
- Surface Dramatica dynamics as structural tensions in Medicine Wheel charts
- Enable Two-Eyed Seeing: Western narrative precision (Dramatica) alongside Indigenous relational ontology (Medicine Wheel)

---

## Related Specifications

- `article-publishing-pipeline.spec.md` — Detailed article system spec
- `ceremony-protocol.spec.md` — Ceremony phase management
- `narrative-engine.spec.md` — Beat sequencing and arc validation
- `ui-components.spec.md` — Visual component library
- `/a/src/Miadi/rispecs/miadi-code/SPEC.md` — miadi-code agent specification
- `/a/src/STPB/lib/ncp/README.md` — Narrative Context Protocol (Phase 2)
