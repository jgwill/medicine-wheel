---
title: "Types"
description: "Key exported TypeScript types and interfaces across the Medicine Wheel packages."
---

This page collects the central exported TypeScript definitions that shape the suite. The source of truth remains the package source files, but the excerpts below show the structures you will work with most often.

## Ontology Core

From `src/ontology-core/src/types.ts`:

```ts
export type DirectionName = 'east' | 'south' | 'west' | 'north';

export interface RelationalNode {
  id: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OcapFlags {
  ownership: string;
  control: string;
  access: 'community' | 'researchers' | 'public' | 'restricted';
  possession: 'on-premise' | 'community-server' | 'cloud-sovereign' | 'cloud-shared';
  compliant: boolean;
  steward?: string;
  consent_given?: boolean;
  consent_scope?: string;
  consent_state?: 'active' | 'withdrawn' | 'expired' | 'pending';
  consent_last_affirmed?: string;
}

export interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength: number;
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
  created_at: string;
  updated_at: string;
}
```

Use these when you need interoperable graph, ceremony, or governance data that can move between packages unchanged.

## Importance Units

From `src/importance-unit/src/types.ts`:

```ts
export type EpistemicSource = 'land' | 'dream' | 'code' | 'vision';

export interface AccountabilityLink {
  targetId: string;
  relationType: AccountabilityLinkType;
  description?: string;
}

export interface ImportanceUnit {
  id: string;
  direction: DirectionName;
  epistemicWeight: number;
  source: EpistemicSource;
  accountabilityLinks: AccountabilityLink[];
  circleDepth: number;
  content: ImportanceUnitContent;
  ceremonyState?: CeremonyState;
  axiologicalPillar?: AxiologicalPillar;
  inquiryRef?: string;
  meta: ImportanceUnitMeta;
}
```

Use these when a task or insight needs source-aware authority, accountability, and circle history.

## Fire Keeper

From `src/fire-keeper/src/types.ts`:

```ts
export type CeremonyPhaseExtended =
  | 'gathering'
  | 'kindling'
  | 'tending'
  | 'harvesting'
  | 'resting';

export interface FireKeeperContext {
  ceremonyState: CeremonyStateExtended;
  unitId?: string;
  wilsonAlignment?: number;
  ocapCompliant?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FireKeeperConfig {
  trajectoryThreshold: number;
  permissionTiers: PermissionTier[];
  gatingConditions: GatingCondition[];
  humanDecisionPoints: DecisionPoint[];
}
```

Use these when you are embedding the orchestration runtime in an agent or service.

## Prompt Decomposition

From `src/prompt-decomposition/src/types.ts`:

```ts
export interface OntologicalDirection {
  name: DirectionName;
  ojibwe: string;
  season: string;
  act: number;
  insights: DirectionalInsight[];
  obligations: RelationalObligation[];
  ceremonyRecommended: boolean;
}

export interface RelationalIntent extends SecondaryIntent {
  direction: DirectionName;
  obligations: RelationalObligation[];
  wilsonAlignment: number;
}

export interface OntologicalDecomposition {
  id: string;
  timestamp: string;
  prompt: string;
  primary: PrimaryIntent;
  secondary: RelationalIntent[];
  context: ExtractionContext;
  outputs: ExpectedOutputs;
  directions: Record<DirectionName, OntologicalDirection>;
  actionStack: ActionItem[];
  ambiguities: AmbiguityFlag[];
  balance: number;
  leadDirection: DirectionName;
  neglectedDirections: DirectionName[];
  ceremonyGuidance: CeremonyGuidance | null;
  ceremonyRequired: boolean;
  wilsonAlignment: number;
  narrativeBeats: NarrativeBeat[];
}
```

Use these when you want to inspect or store decomposition output instead of treating it as a transient planning step.

## Relational Index And Query

From `src/relational-index/src/types.ts` and `src/relational-query/src/types.ts`:

```ts
export interface IndexEntry {
  unitId: string;
  source: EpistemicSource;
  direction: DirectionName;
  epistemicWeight: number;
  circleDepth: number;
  accountableTo: string[];
  tags: string[];
  timestamp: string;
}

export interface RelationalIndex {
  entries: Map<string, IndexEntry>;
  dimensions: Record<EpistemicSource, DimensionIndex>;
  crossMap: CrossDimensionalMap;
}

export interface TraversalOptions {
  maxDepth: number;
  direction: TraversalDirection;
  edgeFilter?: EdgeFilter;
  nodeFilter?: NodeFilter;
  respectCeremonyBoundaries?: boolean;
  ocapOnly?: boolean;
}
```

Use index types for cross-dimensional epistemic analysis. Use query types when traversing concrete node and edge sets.

## Narrative, Visualization, And Storage

From `src/narrative-engine/src/types.ts`, `src/graph-viz/src/types.ts`, and `src/storage-provider/src/interface.ts`:

```ts
export interface ArcValidationResult {
  valid: boolean;
  completeness: ArcCompleteness;
  violations: ArcViolation[];
  recommendations: string[];
}

export interface MWGraphData {
  nodes: MWGraphNode[];
  links: MWGraphLink[];
  focusedNodeId?: string;
}

export interface StorageProvider {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createNode(node: RelationalNode): Promise<void>;
  getNode(id: string): Promise<RelationalNode | null>;
  createEdge(edge: RelationalEdge): Promise<void>;
  getEdge(fromId: string, toId: string): Promise<RelationalEdge | null>;
  logCeremony(ceremony: CeremonyLog): Promise<void>;
}
```

These types define how analysis becomes presentation and how models become persisted records.

## Review, Consent, And Transformation

The workspace also exports rich governance types from:

- `src/community-review/src/types.ts`
- `src/consent-lifecycle/src/types.ts`
- `src/transformation-tracker/src/types.ts`

The most important top-level shapes are:

```ts
ReviewCircle
ConsentRecord
TransformationLog
WilsonValidity
```

Those types are covered in more detail on the [Ceremony And Review API](/docs/api-reference/ceremony-and-review) page because they are usually used as part of a longer governance flow rather than in isolation.
