# @medicine-wheel/capabilities

The platform-features and capabilities layer of the Medicine Wheel Developer Suite.

A capability is something the platform can do for someone: publish a prototype to an
episode, register a service, follow a wheel's events. It rides a `knowledge` node
carrying `metadata.kind: "capability"` (direction west, `DEVELOPER_ENTITY_BINDING` in
`ontology-core`), and this package holds its specifics keyed by node id, the way
`@medicine-wheel/infra` holds a service's.

## Install

```bash
npm install @medicine-wheel/capabilities
```

Depends on `@medicine-wheel/ontology-core`, `@medicine-wheel/infra` (for `MetisHold`) and `zod`.

## What is here

```ts
import {
  CapabilityFacetSchema,
  checkStatement,
  findSharedCapabilities,
  type CapabilityFacet,
  type Attribution,
} from '@medicine-wheel/capabilities';
```

| Export | What it does |
|---|---|
| `CapabilityFacet`, `CapabilityFacetSchema` | One capability: id `capability:<slug>`, name, statement, status, providers, attribution. |
| `Attribution`, `attributionShape` | Who wrote a row, when, from what evidence (`grounding`, at least one), and its `revision`: `pending`, `revised` or `affirmed`. A revised or affirmed row names who and when. |
| `StatementStatus` | `clear`, `unclear`, `undefinable`, `needs-resolution`. A clear or unclear row carries its statement. |
| `STATEMENT_WORD_LIMIT`, `countWords`, `checkStatement`, `StatementSchema` | The 55-word limit. A writer over it records `needs-resolution` without a statement and moves on. |
| `capabilityClaims`, `findSharedCapabilities` | Which capabilities two or more providers give: a relation to name, not a conflict. |

Schemas are strict: in rows written by models, an unknown key is far more often a
misspelling than a new field.

Zero I/O, zero persistence, zero clock.

## Used by

`@medicine-wheel/developer-repository-mapping`: a feature `realizes` a capability, a
repository `provides` one, and every mapping row carries this package's attribution.

Spec: [`rispecs/developer-suite/repository-mapping/capabilities.spec.md`](https://github.com/jgwill/medicine-wheel/blob/main/rispecs/developer-suite/repository-mapping/capabilities.spec.md).
