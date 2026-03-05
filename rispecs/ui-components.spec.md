# ui-components — RISE Specification

> React UI components for the Medicine Wheel Developer Suite — direction cards, beat timelines, node inspectors, OCAP® badges, and Wilson alignment gauges.

**Version:** 0.1.0  
**Package:** `medicine-wheel-ui-components`  
**Document ID:** rispec-ui-components-v1  
**Last Updated:** 2026-02-23  

---

## Desired Outcome

Users create **Medicine Wheel user interfaces** through composable React components that:
- Display directional teachings, seasons, medicines, and practices
- Render beat timelines with ceremony indicators
- Inspect relational nodes with full metadata
- Show OCAP® compliance status at a glance
- Visualize Wilson alignment (Respect, Reciprocity, Responsibility) as a gauge

---

## Creative Intent

**What this enables:** Building UIs that make relational accountability visible. Each component encodes cultural knowledge — direction colors, Ojibwe names, ceremony types — so developers create culturally grounded interfaces without hardcoding these details.

**Structural Tension:** Between generic UI component libraries (no cultural context) and Medicine Wheel-specific interfaces (must encode directions, ceremonies, OCAP®). These components resolve this by embedding ontology-core types and constants.

---

## Components

### DirectionCard

Displays a single direction with its teachings, practices, and metadata.

```typescript
interface DirectionCardProps {
  direction: Direction;        // From ontology-core
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

<DirectionCard direction={DIRECTION_MAP.east} active />
// Renders: Name, Ojibwe name, season, color band, medicine list,
//          teachings, practices, life stage, age range
```

### BeatTimeline

Renders narrative beats along a timeline with direction-colored markers.

```typescript
interface BeatTimelineProps {
  beats: NarrativeBeat[];
  onBeatClick?: (beat: NarrativeBeat) => void;
  showCeremonyIndicators?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

<BeatTimeline beats={myBeats} showCeremonyIndicators />
// Renders: Chronological timeline with direction-colored dots,
//          ceremony indicators (🔴), act labels
```

### NodeInspector

Detail panel for inspecting a relational node's properties and connections.

```typescript
interface NodeInspectorProps {
  node: RelationalNode;
  relations?: Relation[];
  onRelationClick?: (relation: Relation) => void;
  className?: string;
}

<NodeInspector node={selectedNode} relations={nodeRelations} />
// Renders: Name, type, direction, metadata, creation date,
//          connected relations with strength and ceremony status
```

### OcapBadge

OCAP® compliance indicator badge.

```typescript
interface OcapBadgeProps {
  ocap: OcapFlags;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

<OcapBadge ocap={relation.ocap} showDetails />
// Renders: ✅ or ⚠️ icon with ownership, control, access, possession details
```

### WilsonMeter

Wilson alignment gauge showing Respect, Reciprocity, Responsibility scores.

```typescript
interface WilsonMeterProps {
  accountability: AccountabilityTracking;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  className?: string;
}

<WilsonMeter accountability={relation.accountability} showBreakdown />
// Renders: Overall alignment score with R/R/R breakdown bars
```

---

## Dependencies

- **Runtime:** `medicine-wheel-ontology-core` ^0.1.0
- **Peer:** `react` ^18.0.0 || ^19.0.0
- **Types consumed:** `Direction`, `NarrativeBeat`, `RelationalNode`, `Relation`, `OcapFlags`, `AccountabilityTracking`

---

## Advancing Patterns

- **Cultural encoding** — Direction colors, Ojibwe names, and ceremony types built into components
- **Composability** — Each component stands alone or composes into dashboards
- **Accessibility** — Components accept className for custom styling and theme integration
- **Ontology-driven** — Props use ontology-core types directly, ensuring type safety

---

## Quality Criteria

- ✅ Creative Orientation: Users create culturally grounded UIs
- ✅ Structural Dynamics: Components encode directional and ceremonial meaning
- ✅ Implementation Sufficient: Full props interfaces and usage examples documented
- ✅ Codebase Agnostic: Components work in any React application
