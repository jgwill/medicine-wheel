---
title: "Visualization API"
description: "API reference for medicine-wheel-graph-viz and medicine-wheel-ui-components."
---

These packages render the shared ontology rather than redefining it.

## `medicine-wheel-graph-viz`

Source files: `src/graph-viz/src/MedicineWheelGraph.tsx`, `src/graph-viz/src/layout.ts`, `src/graph-viz/src/converters.ts`, `src/graph-viz/src/rsis-viz.ts`.

Import path:

```ts
import { MedicineWheelGraph, buildGraphData, applyWheelLayout } from 'medicine-wheel-graph-viz';
```

Main exports:

```ts
MedicineWheelGraph(props: MedicineWheelGraphProps): JSX.Element
applyWheelLayout(data: MWGraphData, config?: Partial<WheelLayoutConfig>): MWGraphData
getQuadrantGeometries(config?: WheelLayoutConfig): QuadrantGeometry[]
quadrantArcPath(cx: number, cy: number, outerRadius: number, innerRadius: number, startAngleDeg: number, endAngleDeg: number): string
curvedLinkPath(x1: number, y1: number, x2: number, y2: number, curvature?: number): string
directionLabelPosition(cx: number, cy: number, radius: number, direction: DirectionName): { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
nodesToGraphNodes(nodes: RelationalNode[]): MWGraphNode[]
edgesToGraphLinks(edges: RelationalEdge[]): MWGraphLink[]
relationsToGraphLinks(relations: Relation[]): MWGraphLink[]
buildGraphData(nodes: RelationalNode[], edges: RelationalEdge[] | Relation[]): MWGraphData
toKinshipGraphLayout(hubs: KinshipHubInfo[], relations: KinshipRelation[]): { nodes: KinshipGraphNode[]; edges: KinshipGraphEdge[] }
toMermaidDiagram(hubs: KinshipHubInfo[], relations: KinshipRelation[]): string
```

Selected props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `MWGraphData` | required | Nodes and links to render. |
| `width` | `number` | `600` | SVG width. |
| `height` | `number` | `600` | SVG height. |
| `showQuadrants` | `boolean` | `true` | Render directional sectors. |
| `showOcapIndicators` | `boolean` | `false` | Render OCAP dots on nodes. |
| `showWilsonHalos` | `boolean` | `false` | Render Wilson alignment rings. |

## `medicine-wheel-ui-components`

Source files: `src/ui-components/src/*.tsx`.

Import path:

```ts
import { DirectionCard, BeatTimeline, NodeInspector, OcapBadge, WilsonMeter } from 'medicine-wheel-ui-components';
```

Main components:

```ts
DirectionCard(props: DirectionCardProps): JSX.Element | null
BeatTimeline(props: BeatTimelineProps): JSX.Element
NodeInspector(props: NodeInspectorProps): JSX.Element
OcapBadge(props: OcapBadgeProps): JSX.Element
WilsonMeter(props: WilsonMeterProps): JSX.Element
```

Example:

```tsx
const graph = buildGraphData(nodes, relations);

<MedicineWheelGraph
  data={graph}
  width={720}
  height={720}
  showQuadrants={true}
  showWilsonHalos={true}
/>
```

Use `graph-viz` when you want a complete graph view. Use `ui-components` when you want small focused widgets inside another interface.

The rendering split is deliberate. `src/graph-viz/src/converters.ts` and `src/graph-viz/src/layout.ts` are headless enough to reuse without React state, while `src/graph-viz/src/MedicineWheelGraph.tsx` adds the interactive SVG layer. In `ui-components`, each widget stays tightly scoped: `DirectionCard` for direction metadata, `BeatTimeline` for narrative progress, `NodeInspector` for graph detail, `OcapBadge` for governance status, and `WilsonMeter` for accountability scoring. That separation keeps the graph package from becoming a grab bag of unrelated presentation helpers.
