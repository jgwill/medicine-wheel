# Medicine Wheel UI Components - Quick Reference

## File Locations & Line Counts

```
src/ui-components/
├── package.json (46 lines)
├── tsconfig.json (20 lines)
├── README.md (66 lines)
└── src/
    ├── index.ts (21 lines) - Barrel export
    ├── DirectionCard.tsx (75 lines)
    ├── BeatTimeline.tsx (128 lines)
    ├── NodeInspector.tsx (142 lines)
    ├── OcapBadge.tsx (77 lines)
    └── WilsonMeter.tsx (86 lines)

src/ontology-core/
├── package.json (79 lines)
└── src/
    ├── index.ts (151 lines)
    ├── types.ts (403 lines)
    ├── constants.ts (189 lines)
    ├── schemas.ts (223 lines)
    ├── vocabulary.ts (209 lines)
    └── queries.ts (308 lines)
```

## Component Props Quick View

### DirectionCard
```typescript
interface DirectionCardProps {
  direction: 'east' | 'south' | 'west' | 'north';
  data?: Direction;
  showOjibwe?: boolean;
  onClick?: (direction) => void;
  selected?: boolean;
  className?: string;
}
```

### BeatTimeline
```typescript
interface BeatTimelineProps {
  beats: NarrativeBeat[];
  selectedId?: string;
  onBeatClick?: (beat) => void;
  height?: number;  // default: 120
  className?: string;
}
```

### NodeInspector
```typescript
interface NodeInspectorProps {
  node: RelationalNode;
  edges?: RelationalEdge[];
  allNodes?: RelationalNode[];
  onClose?: () => void;
  onNavigate?: (nodeId) => void;
  className?: string;
}
```

### OcapBadge
```typescript
interface OcapBadgeProps {
  ocap?: OcapFlags;
  detailed?: boolean;  // default: false
  className?: string;
}
```

### WilsonMeter
```typescript
interface WilsonMeterProps {
  alignment: number;  // 0-1
  size?: number;      // default: 48
  showLabel?: boolean; // default: true
  className?: string;
}
```

## Essential Types from medicine-wheel-ontology-core

```typescript
// Directions
type DirectionName = 'east' | 'south' | 'west' | 'north';

// Nodes
type NodeType = 'human' | 'land' | 'spirit' | 'ancestor' | 'future' | 'knowledge';

interface RelationalNode {
  id: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Edges
interface RelationalEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;  // 0-1
  ceremony_honored: boolean;
  obligations: string[];
  created_at: string;
}

// Narrative
interface NarrativeBeat {
  id: string;
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];
  learnings: string[];
  timestamp: string;
  act: number;  // 1-4
  relations_honored: string[];
}

// Governance
interface OcapFlags {
  ownership: string;
  control: string;
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;
  steward?: string;
  consent_given?: boolean;
  consent_scope?: string;
}

interface AccountabilityTracking {
  respect: number;  // 0-1
  reciprocity: number;  // 0-1
  responsibility: number;  // 0-1
  wilson_alignment: number;  // 0-1
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

## Constants Reference

```typescript
// Direction Colors
DIRECTION_COLORS = {
  east: '#FFD700',      // Gold
  south: '#DC143C',     // Crimson
  west: '#1a1a2e',      // Dark Blue
  north: '#E8E8E8'      // Silver
}

// Node Type Colors
NODE_TYPE_COLORS = {
  human: '#e8913a',
  land: '#4a9e5c',
  spirit: '#9a5cc6',
  ancestor: '#c9a23a',
  future: '#5a9ec6',
  knowledge: '#d4b844'
}

// Ojibwe Names
OJIBWE_NAMES = {
  east: 'Waabinong',
  south: 'Zhaawanong',
  west: 'Epangishmok',
  north: 'Kiiwedinong'
}

// Direction to Act Mapping
DIRECTION_ACTS = { east: 1, south: 2, west: 3, north: 4 }
ACT_DIRECTIONS = { 1: 'east', 2: 'south', 3: 'west', 4: 'north' }

// Seasons
DIRECTION_SEASONS = {
  east: 'Spring',
  south: 'Summer',
  west: 'Fall',
  north: 'Winter'
}

// Ceremony Icons
CEREMONY_ICONS = {
  smudging: '🌿',
  talking_circle: '🔴',
  spirit_feeding: '🕯️',
  opening: '🌅',
  closing: '🌙'
}
```

## Query Helpers (Most Used)

```typescript
// Find nodes
nodesByDirection(nodes, direction): RelationalNode[]
nodesByType(nodes, type): RelationalNode[]
nodeById(nodes, id): RelationalNode | undefined

// Find relations
relationsForNode(relations, nodeId): Relation[]
relationsByType(relations, type): Relation[]
neighborIds(relations, nodeId): string[]

// Wilson Alignment
computeWilsonAlignment(accountability): number  // avg of 3 R's
aggregateWilsonAlignment(relations): number
findAccountabilityGaps(relations, threshold=0.5): Relation[]

// OCAP Compliance
checkOcapCompliance(ocap): { compliant: boolean; issues: string[] }
auditOcapCompliance(relations): { overall_compliant, counts, issues }

// Narrative Queries
beatsByDirection(beats, direction): NarrativeBeat[]
beatsByAct(beats, act): NarrativeBeat[]
allDirectionsVisited(beats): boolean
```

## Key Color Values

```
Compliance (OCAP):
  ✓ Compliant:     #22c55e (green)
  ✗ Non-compliant: #ef4444 (red)
  ⚠ Warning:       #ff8800 (orange)

Wilson Alignment:
  ≥0.7 (70%+):  #22c55e (green)
  ≥0.4 (40%+):  #f59e0b (orange)
  <0.4 (<40%):  #ef4444 (red)

Direction Icons:
  East:  🌅 (sunrise)
  South: 🔥 (fire)
  West:  🌊 (water)
  North: ❄️  (snow)
```

## Build & Distribution

```bash
# Build
npm run build  # Runs: tsc

# Output
dist/index.js       # Main entry point
dist/index.d.ts     # Type definitions

# NPM Distribution
npm publish  # Runs: npm run clean && npm run build
```

## Peer Dependencies

- `react`: ^18.0.0 || ^19.0.0

## Direct Dependencies

- `medicine-wheel-ontology-core`: ^0.1.3

## DevDependencies

- `@types/react`: ^19.0.0
- `react`: ^19.0.0
- `typescript`: ^5.7.0

## Styling Notes

- **All inline CSS**: No external stylesheets
- **No CSS framework**: Pure React + inline styles
- **Responsive**: Uses flexbox, percentage widths, absolute positioning
- **Accessibility**: Semantic HTML, ARIA roles, keyboard support
- **Transitions**: 0.2s–0.5s ease for smooth animations

## Component Architecture

All components are:
- **Pure React functions** (no class components)
- **Stateless** (no useState/useEffect in current implementation)
- **Styled inline** (style prop with objects)
- **Accessible** (keyboard navigation, ARIA labels)
- **Type-safe** (full TypeScript with strict mode)
- **No side effects** (pure rendering)

## Data Flow Pattern

```
Props (Immutable)
    ↓
Component Render
    ↓
Callbacks (onClick, onNavigate, onBeatClick)
    ↓
Parent State Update
    ↓
New Props → Re-render
```

## When Building Your Own

### Minimal Example

```typescript
import React from 'react';
import type { RelationalNode } from 'medicine-wheel-ontology-core';
import { DIRECTION_COLORS } from 'medicine-wheel-ontology-core';

export function MyComponent({ node }: { node: RelationalNode }) {
  const color = node.direction ? DIRECTION_COLORS[node.direction] : '#888';
  
  return (
    <div style={{ color, padding: '16px', borderRadius: '8px' }}>
      <h3>{node.name}</h3>
      <p>{node.type}</p>
    </div>
  );
}
```

### With Imports

```typescript
import {
  DirectionCard,
  BeatTimeline,
  NodeInspector,
  OcapBadge,
  WilsonMeter
} from 'medicine-wheel-ui-components';

// Use directly with your data
<DirectionCard direction="east" onClick={handleClick} />
```

## RDF Namespaces

If implementing RDF export:

```
Prefix   Namespace                                    Usage
────────────────────────────────────────────────────────────────────
mw:      https://ontology.medicine-wheel.dev/mw#     Core concepts
ids:     https://ontology.medicine-wheel.dev/ids#    Data sovereignty
ocap:    https://ontology.medicine-wheel.dev/ocap#   OCAP principles
rel:     https://ontology.medicine-wheel.dev/rel#    Relational accountability
cer:     https://ontology.medicine-wheel.dev/cer#    Ceremonies
beat:    https://ontology.medicine-wheel.dev/beat#   Narrative beats
```

## Common Integration Patterns

### Direction Grid (4x4)
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
  {['east', 'south', 'west', 'north'].map(dir => (
    <DirectionCard key={dir} direction={dir} selected={selected===dir} onClick={handleSelect} />
  ))}
</div>
```

### Node Graph with Inspector
```jsx
const [selectedNode, setSelectedNode] = useState<RelationalNode | null>(null);

return (
  <>
    <div>Graph visualization here</div>
    {selectedNode && (
      <NodeInspector 
        node={selectedNode} 
        edges={edges}
        allNodes={nodes}
        onClose={() => setSelectedNode(null)}
        onNavigate={setSelectedNode}
      />
    )}
  </>
);
```

### Timeline with Beat Selection
```jsx
const [selectedBeat, setSelectedBeat] = useState<string>();

return (
  <BeatTimeline 
    beats={beats}
    selectedId={selectedBeat}
    onBeatClick={(beat) => setSelectedBeat(beat.id)}
    height={120}
  />
);
```

## Testing Example Data

```typescript
const testNode: RelationalNode = {
  id: 'n1',
  name: 'Elder',
  type: 'human',
  direction: 'north',
  metadata: { role: 'steward' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const testBeat: NarrativeBeat = {
  id: 'b1',
  direction: 'east',
  title: 'Opening',
  description: 'Start of cycle',
  ceremonies: [],
  learnings: [],
  timestamp: '2024-01-01T09:00:00Z',
  act: 1,
  relations_honored: [],
};

const testOcap: OcapFlags = {
  ownership: 'community',
  control: 'community',
  access: 'community',
  possession: 'on-premise',
  compliant: true,
};
```

---

**Generated**: March 7, 2024
**Version**: medicine-wheel-ui-components v0.1.2
**Ontology Core**: v0.1.4
