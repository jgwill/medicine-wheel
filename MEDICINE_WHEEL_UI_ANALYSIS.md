# Medicine Wheel UI Components - Complete Analysis

## Project Overview

**Location**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/`

A React component library for the Medicine Wheel Developer Suite that provides Indigenous relational ontology-based UI components.

### Key Properties
- **Name**: `medicine-wheel-ui-components`
- **Version**: 0.1.2
- **License**: MIT
- **Main Export**: `dist/index.js`
- **Type Definitions**: `dist/index.d.ts`

---

## Build Configuration

### package.json
```json
{
  "name": "medicine-wheel-ui-components",
  "version": "0.1.2",
  "description": "React UI components for the Medicine Wheel Developer Suite — direction cards, beat timelines, node inspectors",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": false,
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "medicine-wheel-ontology-core": "^0.1.3"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Component Library

### 1. DirectionCard Component

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/DirectionCard.tsx`

**Purpose**: Displays a direction with its associated metadata, color coding, and cultural context.

**Props Interface**:
```typescript
export interface DirectionCardProps {
  direction: DirectionName;  // 'east' | 'south' | 'west' | 'north'
  data?: Direction;          // Optional override data (defaults to DIRECTIONS constant)
  showOjibwe?: boolean;      // Show the Ojibwe name
  onClick?: (direction: DirectionName) => void;  // Click handler
  selected?: boolean;        // Whether this card is selected
  className?: string;        // Custom className
}
```

**Exports**:
- `DirectionCard` - React component
- `DirectionCardProps` - Type definition

**Imports**:
- `React` from 'react'
- `Direction`, `DirectionName` from 'medicine-wheel-ontology-core'
- `DIRECTION_COLORS`, `DIRECTIONS`, `OJIBWE_NAMES` from 'medicine-wheel-ontology-core'

**Features**:
- Renders direction with emoji icon (🌅 east, 🔥 south, 🌊 west, ❄️ north)
- Displays color-coded border on selection
- Shows Ojibwe name, season, life stage, medicines, and teachings
- Fully accessible (role="button", tabIndex, keyboard support)
- Styled inline with CSS-in-JS

**Styling**:
- Selected state: border-color set to direction color, background tinted
- Hover-like effects via transitions
- Rounded corners (12px)
- Responsive layout with flexbox

---

### 2. BeatTimeline Component

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/BeatTimeline.tsx`

**Purpose**: Horizontal timeline of narrative beats with direction-coded markers.

**Props Interface**:
```typescript
export interface BeatTimelineProps {
  beats: NarrativeBeat[];
  selectedId?: string;       // Selected beat ID
  onBeatClick?: (beat: NarrativeBeat) => void;  // Click handler
  height?: number;           // Timeline height in px (default: 120)
  className?: string;        // Custom className
}
```

**Exports**:
- `BeatTimeline` - React component
- `BeatTimelineProps` - Type definition

**Imports**:
- `React` from 'react'
- `NarrativeBeat`, `DirectionName` from 'medicine-wheel-ontology-core'
- `DIRECTION_COLORS` from 'medicine-wheel-ontology-core'

**Features**:
- Sorts beats by timestamp
- Displays beats along a horizontal timeline line
- Position markers proportionally across timeline
- Color-coded by direction
- Shows act number, title, and ceremony indicator (🔥)
- Selected beat has larger circle (36px) vs unselected (28px)
- Glowing shadow effect on selected beat
- "No beats yet" message when empty

**Styling**:
- Absolute positioning for beat markers
- Horizontal line (2px) at 50% height
- Circular markers with direction color
- Text labels with ellipsis overflow handling
- Smooth transitions (0.2s ease)

---

### 3. NodeInspector Component

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/NodeInspector.tsx`

**Purpose**: Detail panel for a RelationalNode showing type, direction, metadata, and connected edges.

**Props Interface**:
```typescript
export interface NodeInspectorProps {
  node: RelationalNode;
  edges?: RelationalEdge[];
  allNodes?: RelationalNode[];    // All nodes for resolving edge endpoints
  onClose?: () => void;            // Close handler
  onNavigate?: (nodeId: string) => void;  // Navigate to connected node
  className?: string;              // Custom className
}
```

**Exports**:
- `NodeInspector` - React component
- `NodeInspectorProps` - Type definition

**Imports**:
- `React` from 'react'
- `RelationalNode`, `RelationalEdge`, `DirectionName` from 'medicine-wheel-ontology-core'
- `DIRECTION_COLORS`, `NODE_TYPE_COLORS` from 'medicine-wheel-ontology-core'

**Features**:
- Header with node name, icon, and close button
- Displays node type badge (color-coded)
- Displays direction badge if available
- Metadata section showing key-value pairs
- Relations section showing connected edges:
  - Relationship type
  - Target node name (color-coded by its direction)
  - Edge strength as percentage
  - Ceremony honored indicator (🔥)
  - Clickable to navigate to connected node
- Footer with node ID and creation date

**Styling**:
- Rounded container (12px)
- Colored border matching node's direction
- Sections separated by light borders
- Badge styling for type and direction
- Hover effects on relation items
- Close button as X character

---

### 4. OcapBadge Component

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/OcapBadge.tsx`

**Purpose**: Compact indicator for OCAP® compliance status.

**Props Interface**:
```typescript
export interface OcapBadgeProps {
  ocap?: OcapFlags;          // OCAP compliance flags
  detailed?: boolean;        // Show detailed breakdown (default: false)
  className?: string;        // Custom className
}
```

**Exports**:
- `OcapBadge` - React component
- `OcapBadgeProps` - Type definition

**Imports**:
- `React` from 'react'
- `OcapFlags` from 'medicine-wheel-ontology-core'

**Features**:
- Simple mode: Shows "OCAP® ✓" or "OCAP® ✗" with green (compliant) or red (non-compliant) color
- Detailed mode: Shows individual O, C, A, P letter badges
- Missing OCAP shows "No OCAP" warning badge
- Tooltip on hover shows full flag breakdown in simple mode
- Color scheme:
  - Green (#22c55e) for compliant/true flags
  - Red (#ef4444) for non-compliant/false flags

**Styling**:
- Inline styling with padding, rounded corners
- Simple badge: 12px font, 2px 8px padding
- Detailed badges: 22x22px squares, flexbox layout with gaps

---

### 5. WilsonMeter Component

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/WilsonMeter.tsx`

**Purpose**: SVG gauge for Wilson relational alignment (0–1).

**Props Interface**:
```typescript
export interface WilsonMeterProps {
  alignment: number;         // Alignment value 0–1
  size?: number;            // Size in px (default: 48)
  showLabel?: boolean;      // Show numeric label (default: true)
  className?: string;       // Custom className
}
```

**Exports**:
- `WilsonMeter` - React component
- `WilsonMeterProps` - Type definition

**Imports**:
- `React` from 'react'

**Features**:
- SVG circular progress gauge
- Color-coded by alignment value:
  - Green (#22c55e) if alignment >= 0.7
  - Orange (#f59e0b) if alignment >= 0.4
  - Red (#ef4444) if alignment < 0.4
- Clamped value to 0–1 range
- Center text displays percentage (0–100)
- Optional label "Wilson" below gauge
- Smooth transitions (0.5s ease) when value changes
- SVG uses stroke-dasharray for circular progress animation

**Styling**:
- SVG with viewBox for scalability
- Background circle at 10% opacity
- Progress arc with color based on alignment
- Smooth stroke linecap
- Rotated -90° to start from top
- Tooltip shows full alignment percentage

---

## Main Index Export

**File**: `/workspace/repos/jgwill/medicine-wheel/src/ui-components/src/index.ts`

**Exports All Components and Types**:
```typescript
export { DirectionCard } from './DirectionCard.js';
export type { DirectionCardProps } from './DirectionCard.js';

export { BeatTimeline } from './BeatTimeline.js';
export type { BeatTimelineProps } from './BeatTimeline.js';

export { NodeInspector } from './NodeInspector.js';
export type { NodeInspectorProps } from './NodeInspector.js';

export { OcapBadge } from './OcapBadge.js';
export type { OcapBadgeProps } from './OcapBadge.js';

export { WilsonMeter } from './WilsonMeter.js';
export type { WilsonMeterProps } from './WilsonMeter.js';
```

---

## Dependency: medicine-wheel-ontology-core

**Location**: `/workspace/repos/jgwill/medicine-wheel/src/ontology-core/`
**Version**: 0.1.4
**Purpose**: Foundational ontology layer — types, RDF vocabulary, Zod schemas, and semantic query helpers

### Core Types Exported

#### Direction Types
```typescript
type DirectionName = 'east' | 'south' | 'west' | 'north';

interface Direction {
  name: DirectionName;
  ojibwe: string;           // e.g., "Waabinong"
  season: string;           // e.g., "Spring"
  color: string;           // e.g., "#FFD700"
  lifeStage: string;       // e.g., "Good Life"
  ages: string;            // e.g., "Birth - 7 years"
  medicine: string[];      // e.g., ["Tobacco (Asemaa)"]
  teachings: string[];     // e.g., ["New beginnings", "Vision", ...]
  practices: string[];     // e.g., ["Morning prayers", ...]
}
```

#### Node Types
```typescript
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
```

#### Edge/Relation Types
```typescript
interface RelationalEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;          // 0–1
  ceremony_honored: boolean;
  obligations: string[];
  created_at: string;
}

interface Relation extends RelationalEdge {
  direction?: DirectionName;
  ceremony_context?: {
    ceremony_id?: string;
    ceremony_type?: CeremonyType;
    ceremony_honored: boolean;
  };
  obligations: RelationalObligation[];
  ocap: OcapFlags;
  accountability: AccountabilityTracking;
  metadata: Record<string, unknown>;
}
```

#### Narrative Types
```typescript
interface NarrativeBeat {
  id: string;
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies: string[];      // ceremony IDs
  learnings: string[];
  timestamp: string;
  act: number;               // 1–4 corresponding to direction
  relations_honored: string[];
}
```

#### OCAP & Accountability Types
```typescript
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
  respect: number;           // Wilson's 3 R's (0–1)
  reciprocity: number;
  responsibility: number;
  wilson_alignment: number;
  relations_honored: string[];
  last_ceremony_id?: string;
  notes?: string;
}
```

### Constants Exported

#### Direction Data
```typescript
DIRECTIONS: Direction[]        // Array of 4 Direction objects
DIRECTION_COLORS: Record<DirectionName, string>
  - east: '#FFD700'
  - south: '#DC143C'
  - west: '#1a1a2e'
  - north: '#E8E8E8'

NODE_TYPE_COLORS: Record<NodeType, string>
  - human: '#e8913a'
  - land: '#4a9e5c'
  - spirit: '#9a5cc6'
  - ancestor: '#c9a23a'
  - future: '#5a9ec6'
  - knowledge: '#d4b844'

OJIBWE_NAMES: Record<DirectionName, string>
  - east: 'Waabinong'
  - south: 'Zhaawanong'
  - west: 'Epangishmok'
  - north: 'Kiiwedinong'

DIRECTION_SEASONS: Record<DirectionName, string>
DIRECTION_ACTS: Record<DirectionName, number>  // east→1, south→2, west→3, north→4
ACT_DIRECTIONS: Record<number, DirectionName>
```

#### Ceremony Types
```typescript
type CeremonyType = 'smudging' | 'talking_circle' | 'spirit_feeding' | 'opening' | 'closing';

CEREMONY_ICONS: Record<CeremonyType, string>
  - smudging: '🌿'
  - talking_circle: '🔴'
  - spirit_feeding: '🕯️'
  - opening: '🌅'
  - closing: '🌙'
```

### Semantic Query Helpers Exported

```typescript
// Node Queries
nodesByDirection(nodes, direction): RelationalNode[]
nodesByType(nodes, type): RelationalNode[]
nodeById(nodes, id): RelationalNode | undefined

// Relational Traversal
relationsForNode(relations, nodeId): Relation[]
relationsByType(relations, type): Relation[]
neighborIds(relations, nodeId): string[]
traverseRelationalWeb(nodes, relations, startNodeId, maxDepth): { visited, paths }

// Wilson Alignment
computeWilsonAlignment(accountability): number
aggregateWilsonAlignment(relations): number
cycleWilsonAlignment(cycle, relations): number
findAccountabilityGaps(relations, threshold): Relation[]

// OCAP Compliance
checkOcapCompliance(ocap): { compliant: boolean; issues: string[] }
auditOcapCompliance(relations): { overall_compliant, counts, issues }

// Narrative Queries
beatsByDirection(beats, direction): NarrativeBeat[]
beatsByAct(beats, act): NarrativeBeat[]
allDirectionsVisited(beats): boolean

// Ceremony Queries
ceremoniesByDirection(ceremonies, direction): CeremonyLog[]
ceremonyCounts(ceremonies): Record<DirectionName, number>

// Relational Completeness
relationalCompleteness(nodeId, relations): { total_relations, categories_covered, missing, ceremony_coverage }
```

### RDF Vocabulary

**Namespaces**:
- `MW_NS` = 'https://ontology.medicine-wheel.dev/mw#'
- `IDS_NS` = 'https://ontology.medicine-wheel.dev/ids#'
- `OCAP_NS` = 'https://ontology.medicine-wheel.dev/ocap#'
- `REL_NS` = 'https://ontology.medicine-wheel.dev/rel#'
- `CER_NS` = 'https://ontology.medicine-wheel.dev/cer#'
- `BEAT_NS` = 'https://ontology.medicine-wheel.dev/beat#'

**Predefined Class/Property IRIs**:
- `MW.Direction`, `MW.East`, `MW.South`, `MW.West`, `MW.North`
- `MW.RelationalNode`, `MW.RelationalEdge`, `MW.Relation`
- `MW.Human`, `MW.Land`, `MW.Spirit`, `MW.Ancestor`, `MW.Future`, `MW.Knowledge`
- `MW.direction`, `MW.strength`, `MW.wilsonAlignment`
- `CER.Ceremony`, `CER.Smudging`, etc.
- `OCAP.ownership`, `OCAP.control`, `OCAP.access`, `OCAP.possession`
- `REL.respect`, `REL.reciprocity`, `REL.responsibility`

---

## Visual Design System

### Color Palette
| Direction | Color | Usage |
|-----------|-------|-------|
| East | #FFD700 | Spring, Vision, Birth-7 |
| South | #DC143C | Summer, Growth, 7-14 |
| West | #1a1a2e | Fall, Reflection, 35-49 |
| North | #E8E8E8 | Winter, Wisdom, 49+ |

### Node Type Colors
| Type | Color |
|------|-------|
| human | #e8913a |
| land | #4a9e5c |
| spirit | #9a5cc6 |
| ancestor | #c9a23a |
| future | #5a9ec6 |
| knowledge | #d4b844 |

### Compliance Colors
| Status | Color |
|--------|-------|
| Compliant/True | #22c55e (green) |
| Non-compliant/False | #ef4444 (red) |
| Warning/Neutral | #ff8800 (orange) |

### Typography
- Headings: font-weight 600, varying sizes (16px–24px)
- Labels: 11–13px, 0.5–0.7 opacity
- Monospace-style: Used for ID displays

### Component Spacing
- Default padding: 16px
- Small padding: 12px, 8px
- Gaps: 4px–8px between items
- Border radius: 12px (containers), 4px–6px (badges)

---

## Integration Patterns

### 1. Direction Card Grid
```jsx
import { DirectionCard } from 'medicine-wheel-ui-components';

function DirectionGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {['east', 'south', 'west', 'north'].map(dir => (
        <DirectionCard key={dir} direction={dir} showOjibwe onClick={handleClick} />
      ))}
    </div>
  );
}
```

### 2. Narrative Timeline
```jsx
import { BeatTimeline } from 'medicine-wheel-ui-components';

function TimelineView({ beats, selectedBeatId, onBeatSelect }) {
  return (
    <BeatTimeline 
      beats={beats} 
      selectedId={selectedBeatId}
      onBeatClick={onBeatSelect}
      height={120}
    />
  );
}
```

### 3. Node Detail Panel
```jsx
import { NodeInspector } from 'medicine-wheel-ui-components';

function NodeDetailView({ node, edges, allNodes, onNavigate, onClose }) {
  return (
    <NodeInspector 
      node={node}
      edges={edges}
      allNodes={allNodes}
      onNavigate={onNavigate}
      onClose={onClose}
    />
  );
}
```

### 4. Governance Badges
```jsx
import { OcapBadge } from 'medicine-wheel-ui-components';

function GovernanceDisplay({ relation }) {
  return (
    <div>
      <OcapBadge ocap={relation.ocap} detailed={false} />
      <OcapBadge ocap={relation.ocap} detailed={true} />
    </div>
  );
}
```

### 5. Accountability Gauge
```jsx
import { WilsonMeter } from 'medicine-wheel-ui-components';

function AccountabilityTracker({ relation }) {
  const alignment = relation.accountability.wilson_alignment;
  return <WilsonMeter alignment={alignment} size={64} showLabel={true} />;
}
```

---

## File Structure Summary

```
/workspace/repos/jgwill/medicine-wheel/src/ui-components/
├── package.json                    # NPM package metadata
├── package-lock.json               # Dependency lock file
├── tsconfig.json                   # TypeScript configuration
├── README.md                        # Component documentation
├── dist/                           # Compiled output (generated)
├── node_modules/                   # Dependencies (generated)
└── src/
    ├── index.ts                    # Main export barrel file
    ├── DirectionCard.tsx           # Direction display component
    ├── BeatTimeline.tsx            # Narrative timeline component
    ├── NodeInspector.tsx           # Node detail panel component
    ├── OcapBadge.tsx               # OCAP compliance indicator
    └── WilsonMeter.tsx             # Accountability gauge component
```

---

## How to Re-implement

### Step 1: Core Data Structures
Install or implement the ontology types from `medicine-wheel-ontology-core`:
- `DirectionName`, `Direction`, `RelationalNode`, `RelationalEdge`
- `NarrativeBeat`, `OcapFlags`, `AccountabilityTracking`
- Constants: `DIRECTION_COLORS`, `NODE_TYPE_COLORS`, `DIRECTIONS`, etc.

### Step 2: Direction Card
- Render a card container with direction color border on selection
- Display emoji icon, direction name (optional Ojibwe name), medicines, season, life stage
- Handle click events with accessibility (role="button", tabIndex, keyboard)
- Use CSS-in-JS for styling

### Step 3: Beat Timeline
- Create horizontal timeline with absolute-positioned beat markers
- Sort beats by timestamp, calculate proportional positions
- Color markers by beat.direction
- Show act number, title, and ceremony indicator
- Handle selection state with visual feedback (size, shadow)

### Step 4: Node Inspector
- Build a bordered detail panel
- Header: node icon + name + type/direction badges + close button
- Metadata section: key-value pairs from node.metadata
- Relations section: for each connected edge, show relationship type → target node name
- Footer: node ID and creation date
- Make relations clickable to navigate

### Step 5: OCAP Badge
- Simple mode: single badge showing "OCAP® ✓/✗" with color based on compliant flag
- Detailed mode: four inline badges (O, C, A, P) showing individual flag states
- Use green for true/compliant, red for false/non-compliant

### Step 6: Wilson Meter
- SVG circular progress gauge using stroke-dasharray
- Calculate color based on alignment value: green (≥0.7), orange (≥0.4), red (<0.4)
- Center text shows percentage (0–100)
- Optional label below gauge
- Smooth transitions when value changes

### Step 7: TypeScript & Build
- Use TypeScript 5.7+ with strict mode
- Configure TSConfig with JSX: "react-jsx"
- Compile to ES2022 with Node16 modules
- Output to dist/ with declaration maps

---

## Key Implementation Notes

1. **All styling is inline** (CSS-in-JS) — no external CSS files
2. **Accessibility built-in**: Keyboard support, ARIA roles, semantic HTML
3. **Direction icons are emoji**: 🌅 🔥 🌊 ❄️
4. **No external UI library**: Uses React and CSS only
5. **Responsive**: Uses flexbox and percentage-based positioning
6. **Peer dependency on React 18+/19+**: No UI framework lock-in
7. **Single dependency**: Only `medicine-wheel-ontology-core` for types and constants
8. **All components are pure React** with no hooks beyond useState/useEffect patterns (none used in provided code)
9. **Direction/Act mapping**: East=Act1, South=Act2, West=Act3, North=Act4

---

## Testing Data Example

```typescript
const exampleNode: RelationalNode = {
  id: 'node-1',
  name: 'Community Elder',
  type: 'human',
  direction: 'north',
  metadata: { role: 'steward', experience_years: 20 },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-03-07T00:00:00Z',
};

const exampleEdge: RelationalEdge = {
  id: 'edge-1',
  from_id: 'node-1',
  to_id: 'node-2',
  relationship_type: 'mentors',
  strength: 0.85,
  ceremony_honored: true,
  obligations: ['support-development'],
  created_at: '2024-01-15T00:00:00Z',
};

const exampleBeat: NarrativeBeat = {
  id: 'beat-1',
  direction: 'east',
  title: 'Vision Quest',
  description: 'Setting intentions for research cycle',
  ceremonies: ['opening-ceremony'],
  learnings: ['clarity-of-purpose'],
  timestamp: '2024-02-01T09:00:00Z',
  act: 1,
  relations_honored: ['edge-1'],
};
```

