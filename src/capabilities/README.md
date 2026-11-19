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
| `CapabilityAchieves`, `CapabilityAchievesSchema` | What a capability achieves for someone, at most 55 words, with who said it and when. The statement says what it is; this says what it is for. |
| `CapabilityStage`, `CAPABILITY_STAGES`, `CapabilityStageReading`, `CapabilityStageReadingSchema` | Where a capability stands: `specified`, `prototype`, `implementation`, `released`, `retired`, with who said so, when, and from what (at least one piece of evidence). |
| `STAGES_WITHOUT_CODE` | `specified` and `retired`: the stages at which no code is expected to provide the capability, so a reader keeps the row. |
| `SpecificationRefSchema`, `RISE_ADDRESS` | Where its specifications are: `rise://<owner>/<repo>/<path>[@<commit>]` or an `https://` URL. |
| `IssueRefSchema`, `ISSUE_REF` | The issues that track it: `owner/repo#n`, never a bare `#n`. |
| `CapabilityHosting`, `CapabilityHostingSchema`, `HOSTING_URL` | Where it runs (`urls`, http or https), who deploys it (`deployedBy`), where its code is written when not in the repository that holds it (`authoredIn`), how a change reaches it (`change`, at most 55 words), with who said so, when, and from what. |
| `EpisodeRefSchema`, `EPISODE_REF` | The chronicle episodes that hold it: `miadi-chronicle://<n>`. |

`achieves`, `stage`, `specifications` and `issues` (0.27.15), `hosting` and `episodes` (0.27.16,
jgwill/medicine-wheel#177) are optional on `CapabilityFacet`, so every row written before stays valid.

Schemas are strict: in rows written by models, an unknown key is far more often a
misspelling than a new field.

Zero I/O, zero persistence, zero clock.

## Used by

`@medicine-wheel/developer-repository-mapping`: a feature `realizes` a capability, a
repository `provides` one, and every mapping row carries this package's attribution.

Spec: [`rispecs/developer-suite/repository-mapping/capabilities.spec.md`](https://github.com/jgwill/medicine-wheel/blob/main/rispecs/developer-suite/repository-mapping/capabilities.spec.md).
