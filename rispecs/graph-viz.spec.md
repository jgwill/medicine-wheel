# graph-viz — RISE Specification

> Medicine Wheel graph visualization — circular layout with four-direction node positioning, ceremony-aware edges, OCAP® indicators, and RSIS visualization utilities.

**Version:** 0.4.0  
**Package:** `@medicine-wheel/graph-viz`  
**Document ID:** rispec-graph-viz-v1  
**Last Updated:** 2026-06-04  

---

## Desired Outcome

Users create **visual relational webs** rendered as Medicine Wheel circular graphs where:
- Nodes are positioned in directional quadrants (East/right → South/bottom → West/left → North/top)
- Edges reflect ceremony-honored status and relational strength
- OCAP® compliance and Wilson alignment are visually indicated
- Kinship hubs, reciprocity flows, and ceremony timelines can be visualized
- The visualization can be exported to Mermaid diagrams

---

## Creative Intent

**What this enables:** Interactive circular graph visualizations that make relational webs visible. Users see which directions have many nodes, which relations lack ceremony, and where OCAP® compliance gaps exist — all at a glance.

**Structural Tension:** Between standard force-directed graph layouts (no cultural meaning) and Medicine Wheel spatial semantics (directions carry teachings, seasons, obligations). The layout engine resolves this by placing nodes in culturally meaningful quadrants.

---

## Layout Engine

### Circular Layout

```typescript
applyWheelLayout(data: MWGraphData, config?: Partial<WheelLayoutConfig>): MWGraphData
// Mutates node x/y positions. Returns the data.

// Direction → Angle mapping (clockwise from East):
// East:  315°–45°  (right)
// South: 45°–135°  (bottom)
// West:  135°–225° (left)
// North: 225°–315° (top)
// Nodes without direction → center cluster
```

### Layout Configuration

```typescript
interface WheelLayoutConfig {
  mode: 'wheel' | 'force' | 'radial';
  centerX: number;        // default: 300
  centerY: number;        // default: 300
  radius: number;         // default: 250 (outer)
  innerRadius?: number;   // default: 60
  quadrantPadding?: number; // degrees between quadrants
  startAngle?: number;    // rotation offset
  jitter?: boolean;       // avoid overlap
  jitterAmount?: number;  // pixels
}
```

### Quadrant Geometry

```typescript
getQuadrantGeometries(config?): QuadrantGeometry[]
// Returns per-quadrant: { direction, startAngle, endAngle, centerAngle, color, label, ojibwe }
```

### SVG Path Helpers

```typescript
quadrantArcPath(cx, cy, outerRadius, innerRadius, startAngle, endAngle): string
// SVG arc path for quadrant background sectors

curvedLinkPath(x1, y1, x2, y2, curvature?): string
// SVG path for edges (straight or curved)

directionLabelPosition(cx, cy, radius, direction): { x, y, anchor }
// Positioning for direction labels outside the wheel
```

---

## Graph Data Types

```typescript
interface MWGraphNode {
  id: string;
  label: string;
  type: NodeType;
  direction?: DirectionName;
  x?: number; y?: number;    // set by layout
  size?: number;
  color?: string;
  opacity?: number;
  selected?: boolean;
  highlighted?: boolean;
  ocapCompliant?: boolean;
  wilsonAlignment?: number;
  data?: RelationalNode;
  metadata?: Record<string, unknown>;
}

interface MWGraphLink {
  source: string;
  target: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted' | 'ceremony';
  strength?: number;
  ceremonyHonored?: boolean;
  ceremonyType?: CeremonyType;
  color?: string;
  width?: number;
  curvature?: number;
  metadata?: Record<string, unknown>;
}

interface MWGraphData {
  nodes: MWGraphNode[];
  links: MWGraphLink[];
  focusedNodeId?: string;
}
```

---

## Data Converters

```typescript
nodesToGraphNodes(nodes: RelationalNode[]): MWGraphNode[]
edgesToGraphLinks(edges: RelationalEdge[]): MWGraphLink[]
relationsToGraphLinks(relations: Relation[]): MWGraphLink[]
buildGraphData(nodes, edges, relations?): MWGraphData
```

---

## React Component

> **Static renderer — unchanged.** `<MedicineWheelGraph>` remains the pure-SVG,
> dependency-free renderer. It is exported from the package root (`.`) and pulls
> no interactive libraries.

```typescript
<MedicineWheelGraph
  data={graphData}
  width={600}
  height={600}
  layout={{ mode: 'wheel', radius: 250 }}
  showDirectionLabels
  showQuadrants
  showOcapIndicators
  showWilsonHalos
  darkMode={false}
  onNodeClick={(node) => {}}
  onNodeHover={(node) => {}}
  onLinkClick={(link) => {}}
/>
```

---

## Interactive Renderer (React Flow)

> **New output strategy (v0.4.0).** A second, *interactive* renderer built on
> [React Flow](https://reactflow.dev) (`@xyflow/react`). It consumes the same
> renderer-agnostic layout engine — `applyWheelLayout` seeds node x/y — and adds
> drag, pan, zoom, and a minimap while **preserving the four-direction circular
> semantics**. The static SVG renderer above is unaffected.

### Poisoning guard — `./interactive` subpath export

The interactive renderer ships behind a dedicated subpath so that static/server
consumers (`fire-keeper`, `session-reader`) never pull React Flow:

```jsonc
// package.json "exports"
".":            "./dist/index.js"             // static — no React Flow
"./interactive":"./dist/interactive/index.js" // interactive — React Flow
```

`@xyflow/react` is declared as an **optional peer dependency**
(`peerDependenciesMeta["@xyflow/react"].optional = true`) — it is never an
auto-installed runtime dependency of the package. Apps that use `./interactive`
install `@xyflow/react` themselves and import its stylesheet once at the app
level: `import '@xyflow/react/dist/style.css'`.

### `<MedicineWheelFlowGraph>`

```typescript
import { MedicineWheelFlowGraph } from '@medicine-wheel/graph-viz/interactive';

<MedicineWheelFlowGraph
  data={graphData}              // MWGraphData — re-laid-out on every change
  layout={{ radius: 250 }}      // Partial<WheelLayoutConfig> for applyWheelLayout
  height={600}
  darkMode
  showNodeLabels
  showOcapIndicators
  showWilsonHalos
  showQuadrants                 // four-direction backdrop (DirectionQuadrant)
  showDirectionLabels           // East/South/West/North + Ojibwe names
  showMiniMap
  showControls
  onNodeClick={(node) => {}}    // receives the original MWGraphNode
/>
```

**Behaviour:**
- Self-contained — wraps its own `<ReactFlowProvider>`; safe under
  `next/dynamic({ ssr: false })`.
- Seeds positions with `applyWheelLayout` (each node spread defensively so the
  caller's state is never mutated), then hands drag/pan/zoom to React Flow via
  `useNodesState` / `useEdgesState`, re-syncing through `useEffect` when `data`
  changes (so asynchronously-loaded data renders).
- **Custom node** (`MedicineWheelNode`): direction-colored circle, node-type
  icon, OCAP® badge, Wilson alignment halo, selection ring; hidden centered
  handles route edges to node centers.
- **Edges** carry style via `strokeDasharray` (`solid`/`dashed`/`dotted`/
  `ceremony`); ceremony-honored edges are gold + animated. Synthetic edge ids
  (`source->target#index`) preserve parallel edges.
- **`DirectionQuadrant`** draws the four sectors with `quadrantArcPath` inside a
  React Flow `<ViewportPortal>` (so the backdrop pans/zooms with the canvas);
  the whole backdrop is `pointer-events: none` so it never steals gestures.
- `<MiniMap>` + `<Controls>` for navigation; `<Background>` dot grid.

---

## RSIS Visualization Utilities

```typescript
toKinshipGraphLayout(hubs, relations): { nodes: KinshipGraphNode[], edges: KinshipGraphEdge[] }
toReciprocityFlowDiagram(flows): { nodes: FlowDiagramNode[], links: FlowDiagramLink[] }
toDirectionWheelData(distribution): DirectionWheelSegment[]
toCeremonyTimelineData(ceremonies): TimelineEntry[]
toMermaidDiagram(nodes, edges): string
// Generates Mermaid graph syntax for documentation embedding
```

---

## Dependencies

- **Runtime:** `@medicine-wheel/ontology-core` ^0.4.0
- **Peer:** `react` >=18.0.0, `react-dom` >=18.0.0
- **Optional peer (`./interactive` only):** `@xyflow/react` >=12.0.0

---

## Advancing Patterns

- **Culturally meaningful layout** — Direction placement carries ontological significance
- **Ceremony-aware rendering** — Honored edges visually distinct from unhonored
- **OCAP® at a glance** — Compliance indicators on every node
- **Multi-format export** — SVG, Mermaid, and data structures for any visualization library

---

## Quality Criteria

- ✅ Creative Orientation: Users create visual relational maps, not just graphs
- ✅ Structural Dynamics: Spatial position encodes directional meaning
- ✅ Implementation Sufficient: Full component props, layout config, and data types documented
- ✅ Codebase Agnostic: No file paths referenced
