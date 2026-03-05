# medicine-wheel-graph-viz

Medicine Wheel graph visualization — circular layout with four-direction node positioning, ceremony-aware edges, and OCAP® indicators.

## Features

- **Circular medicine wheel layout** — nodes positioned by direction (East/South/West/North)
- **Direction quadrant backgrounds** with Ojibwe names
- **Ceremony-aware edges** — gold dashed lines for honored relations
- **OCAP® indicators** — red/green dots showing compliance status
- **Wilson alignment halos** — color-coded rings showing relational accountability
- **Hover highlighting** — dims unconnected nodes, highlights neighbors
- **Pure SVG React** — no D3 runtime dependency, SSR-compatible
- **Dark mode** by default

## Installation

```bash
npm install medicine-wheel-graph-viz medicine-wheel-ontology-core
```

## Usage

```tsx
import { MedicineWheelGraph, buildGraphData } from 'medicine-wheel-graph-viz';

// From ontology-core data
const graphData = buildGraphData(relationalNodes, relationalEdges);

<MedicineWheelGraph
  data={graphData}
  width={600}
  height={600}
  showDirectionLabels
  showQuadrants
  showNodeLabels
  darkMode
  onNodeClick={(node) => console.log('Clicked:', node.label)}
/>
```

### Manual data

```tsx
const data = {
  nodes: [
    { id: 'n1', label: 'Ceremony', type: 'spirit', direction: 'east' },
    { id: 'n2', label: 'Elder', type: 'human', direction: 'north' },
  ],
  links: [
    { source: 'n1', target: 'n2', label: 'guides', ceremonyHonored: true },
  ],
};

<MedicineWheelGraph data={data} />
```

## API

### `<MedicineWheelGraph>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `MWGraphData` | required | Nodes and links |
| `width` | `number` | 600 | SVG width |
| `height` | `number` | 600 | SVG height |
| `layout` | `Partial<WheelLayoutConfig>` | auto | Layout configuration |
| `showDirectionLabels` | `boolean` | true | Show direction labels |
| `showQuadrants` | `boolean` | true | Show quadrant backgrounds |
| `showNodeLabels` | `boolean` | true | Show node labels |
| `showLinkLabels` | `boolean` | false | Show link labels |
| `showOcapIndicators` | `boolean` | false | Show OCAP® compliance dots |
| `showWilsonHalos` | `boolean` | false | Show Wilson alignment halos |
| `darkMode` | `boolean` | true | Dark background |
| `onNodeClick` | `(node) => void` | - | Node click handler |
| `onNodeHover` | `(node\|null) => void` | - | Node hover handler |
| `onLinkClick` | `(link) => void` | - | Link click handler |

### Layout Engine (headless)

```ts
import { applyWheelLayout, getQuadrantGeometries } from 'medicine-wheel-graph-viz';

const positioned = applyWheelLayout(data, { radius: 300, centerX: 400, centerY: 400 });
```

### Data Converters

```ts
import { buildGraphData, nodesToGraphNodes, edgesToGraphLinks } from 'medicine-wheel-graph-viz';
```

## License

MIT — IAIP Collaborative, Shawinigan, QC
