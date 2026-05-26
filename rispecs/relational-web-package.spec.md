# Relational Web Package Extraction

## Intent

Extract the "Relational Web" UI from `app/relations/page.tsx` into a reusable package at `src/relational-web/` to enable its use in other Medicine Wheel applications.

## Current State

The Relational Web page is a monolithic Next.js page combining:
- Graph rendering (SVG with node positioning)
- Node add form UI
- Relational Health stats panel
- Node detail inspector sidebar

## Target State

Create `@medicine-wheel/relational-web` package with modular components:

| Component | Purpose |
|-----------|---------|
| `RelationalWebGraph` | SVG graph with draggable nodes, edge rendering |
| `AddNodeForm` | Form for creating new RelationalNode |
| `RelationalHealthPanel` | Stats display (node count, edge count, health metrics) |
| `NodeDetailSidebar` | Inspector panel for selected node |

## Dependencies

- `@medicine-wheel/ontology-core` — types (RelationalNode, RelationalEdge)
- `@medicine-wheel/ui-components` — shared UI primitives
- React

## Package Structure

```
src/relational-web/
├── package.json
├── src/
│   ├── index.ts
│   ├── RelationalWebGraph.tsx
│   ├── AddNodeForm.tsx
│   ├── RelationalHealthPanel.tsx
│   ├── NodeDetailSidebar.tsx
│   └── hooks/
│       └── useRelationalData.ts
└── tsconfig.json
```

## API Surface

```typescript
// Consumer usage
import { 
  RelationalWebGraph, 
  AddNodeForm, 
  RelationalHealthPanel,
  useRelationalData 
} from '@medicine-wheel/relational-web';
```

## Notes

- Keep data fetching abstracted via hooks (consumers provide their own API endpoints)
- Graph should accept nodes/edges as props, not fetch internally
- Forms should emit events (onNodeAdd, onEdgeAdd) rather than call APIs directly
