# @medicine-wheel/graph-viz

Medicine Wheel graph visualization — circular layout with four-direction node positioning, ceremony-aware edges, and OCAP® indicators.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

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
npm install @medicine-wheel/graph-viz @medicine-wheel/ontology-core
```

## Usage

```tsx
import { MedicineWheelGraph, buildGraphData } from '@medicine-wheel/graph-viz';

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
import { applyWheelLayout, getQuadrantGeometries } from '@medicine-wheel/graph-viz';

const positioned = applyWheelLayout(data, { radius: 300, centerX: 400, centerY: 400 });
```

### Data Converters

```ts
import { buildGraphData, nodesToGraphNodes, edgesToGraphLinks } from '@medicine-wheel/graph-viz';
```

### `<LineageWeb>`: episodes and their relations

Episodes sit on a spine in chronicle order, each in its direction's band. Continuation arcs bow
above and relation arcs bow below, rising with the square root of their length and staying inside
the canvas. Hover or select an episode to light its arcs. A tap selects and a second tap calls
`onOpen`. The wheel's Episodes tab and the Miadi chronicle both draw it (jgwill/medicine-wheel#162).

```tsx
import { LineageWeb } from '@medicine-wheel/graph-viz';

<LineageWeb
  episodes={[{ id: 'ep044', label: 'E044', title: 'Teaching…', direction: 'east', date: '2026-06-10', thread: 'portal' }]}
  edges={[{ from: 'ep044', to: 'ep001', kind: 'continuation', words: 'grounds the ceremony of seeing' }]}
  matches={query ? new Set(found) : null}   // keeps what a search found and, as rings, its relatives
  onOpen={(id) => router.push(`/episodes/${id}`)}
/>
```

| Prop | Default | |
|------|---------|---|
| `episodes`, `edges` | | Episodes oldest first; edges `continuation` or `relation`, with optional `words` |
| `selected` / `onSelect` | held by the web | Controlled selection |
| `onOpen` | | Called on a second tap of the selected episode |
| `matches`, `matchMode` | `null`, `'kin'` | `kin` keeps the matches and their relatives; `fade` dims the rest |
| `view` / `defaultView` / `onViewChange` | whole chronicle, depth 1, both kinds, threads on | `scope: 'all' \| 'around'`, `depth: 1 \| 2`, `kinds`, `threads` |
| `controls` | `true` | The options bar: whole chronicle or around the selected episode, depth, kinds, threads |
| `colors`, `threadColors`, `bandLabels` | `--mw-*` tokens | |
| `layout` | `DEFAULT_LINEAGE_WEB_LAYOUT` | Margins, band gap, head and foot room for arcs, minimum step and width |
| `startAt` | `'start'` | `'end'` opens scrolled to the newest episodes |

The geometry is exported without React: `visibleLineage`, `lineageNeighbourhood`,
`layoutLineageWeb`, `lineageArcPath`, `threadChains`.

## License

MIT — IAIP Collaborative, Shawinigan, QC

