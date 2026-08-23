# @medicine-wheel/ui-components

React UI components for the Medicine Wheel Developer Suite — direction cards, beat timelines, node inspectors, OCAP® badges, and Wilson alignment gauges.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Install

```bash
npm install @medicine-wheel/ui-components
```

## Components

### DirectionCard
Displays a direction with color coding, Ojibwe name, season, and teachings.

```tsx
import { DirectionCard } from '@medicine-wheel/ui-components';

<DirectionCard direction="east" showOjibwe onClick={handleClick} />
```

### BeatTimeline
Horizontal timeline of narrative beats with direction-coded markers.

```tsx
import { BeatTimeline } from '@medicine-wheel/ui-components';

<BeatTimeline beats={beats} onBeatClick={handleSelect} selectedId="b1" />
```

### NodeInspector
Detail panel for a RelationalNode showing type, direction, metadata, and connections.

```tsx
import { NodeInspector } from '@medicine-wheel/ui-components';

<NodeInspector node={node} edges={edges} allNodes={allNodes} onNavigate={goToNode} />
```

### OcapBadge
Compact OCAP® compliance indicator.

```tsx
import { OcapBadge } from '@medicine-wheel/ui-components';

<OcapBadge ocap={relation.ocap} detailed />
```

### WilsonMeter
SVG gauge for Wilson relational alignment (0–1).

```tsx
import { WilsonMeter } from '@medicine-wheel/ui-components';

<WilsonMeter alignment={0.73} size={48} />
```

## Peer dependencies

- `react`
- `@medicine-wheel/ontology-core`

## License

MIT
