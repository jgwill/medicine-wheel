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

## Memory conversations

`useMemoryConversations(adapter)` holds a person's conversations with the wheel's memory (jgwill/medicine-wheel#174); `ConversationList`, `ConversationThread` and `ConversationComposer` draw them. The adapter is the host's own door, so the host decides who may read and reach what. Every part carries `data-mw-part` and takes a class per part (`classNames`); the host passes how an answer is rendered (`renderAnswer`, e.g. markdown), its sources (`renderSources`), its icons (`icons`), its own actions (`renderAnswerActions`, `renderActions` beside the box, for voice), and its words (`labels`). A question asked again shows each answer with a pager. Import `@medicine-wheel/ui-components/conversation.css` for default styles drawn with the wheel's tokens.
