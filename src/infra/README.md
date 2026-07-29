# @medicine-wheel/infra

Typed infrastructure facets for the Medicine Wheel Developer Suite.

A host, a tenant, and a service are already beings the suite can reason about —
`land`, `human`, `knowledge` in the closed `NodeType` union. What has had no home
is their machine specifics: the port, the unit name, whether linger is on. Those
leak into `metadata: Record<string, unknown>`, where nothing can check them.

This package gives them a typed home **keyed by node id**, so a systemd unit
reads as a being with the same grammar as a ceremony — and so `ontology-core`
does not have to change to make that true.

## Install

```bash
npm install @medicine-wheel/infra
```

Depends only on `@medicine-wheel/ontology-core` and `zod`.

## What is here

```ts
import {
  detectPortConflicts,
  type HostFacet,
  type TenantFacet,
  type ServiceFacet,
  type PortBinding,
  type MetisHold,
} from '@medicine-wheel/infra';
```

A **facet annotates an existing `RelationalNode` by id** — it never re-declares
one, and it inherits `direction` from the node rather than re-encoding it.

| Facet | Annotates a node of type | Direction it serves |
|---|---|---|
| `HostFacet` | `land` | — the machine itself |
| `TenantFacet` | `human` | South — an account is a being, and `linger` is a precondition |
| `ServiceFacet` | `knowledge` | West — the thing that executes |
| `PortBinding` | *(carried by `ServiceFacet`)* | South — a claim that must hold before West runs |

Every facet carries an optional `MetisHold`.

## `detectPortConflicts`

```ts
const conflicts = detectPortConflicts([...declared, ...observed]);
// [{ host: 'node:land:eury', port: 443, proto: 'tcp',
//    claimants: ['node:knowledge:ava:...', 'node:knowledge:gmusic:...'] }, ...]
```

Declared bindings are authored by eury; observed ones are read live from systemd
by gaia. Neither side alone can see a collision — this is the traversal over
their union, so the collision returns **before** the second tenant is
provisioned instead of at deploy time.

Three properties are load-bearing:

- **One service seen twice is not a conflict.** The input is declared ∪
  observed, so the same claim arrives from both sides. Claimants de-duplicate by
  `boundBy`; only two *distinct* services collide.
- **Ports are scarce per host, not globally.** `:4444` on `eury` and `:4444` on
  `gaia` are not in tension.
- **Output is deterministic** — sorted by host, then proto, then port, with
  claimants sorted inside each row — so two runs can be diffed.

A binding with no `proto` is read as `tcp`, so shorthand and longhand tcp claims
collide with each other while tcp and udp on the same number do not.

`PortConflict` carries a `proto` field that the specification's shape (§S3) does
not name. Without it, a host colliding on both tcp/53 and udp/53 returns two rows
that cannot be told apart.

## `MetisHold` — what the grid must not flatten

The four-directions ontology is an imposed legibility grid. Legibility is what
lets an operator reason at all; a grid that becomes the *only* sanctioned way to
describe a system erases the métis — the "restart it twice," the "that BSSID lock
is load-bearing," the credential path everyone just knows.

```ts
const zulip: ServiceFacet = {
  // ...
  execStop: 'docker compose stop',
  metis: {
    exceptions: ['compose stop, never down — down drops the volumes'],
    heldBy: 'William',
  },
};
```

`heldBy` names a person on purpose. Invisible work gets surfaced with its
carrier attached, not anonymised into the schema.

## Validation at the boundary

Every facet ships a Zod schema, because a legible-but-stale model lies with a
straight face. Parse an emitted manifest before trusting it:

```ts
import { ServiceFacetSchema } from '@medicine-wheel/infra';

const parsed = ServiceFacetSchema.safeParse(emitted);
if (!parsed.success) { /* the emitter misread systemd — do not reconcile on this */ }
```

Port numbers are integers in 1–65535. A misparsed `0` is rejected here rather
than silently never colliding with anything downstream.

## Scope of `0.1.0`

Ships S1, S3, S5 only — facets, `detectPortConflicts`, `MetisHold`, schemas.
Deliberately **not** here:

- **`0.2.0`** (S4) — `Precondition`, `preconditionGuard`, `readyService`. Where
  the machine fact `linger` and the human, withdrawable `ConsentRecord` that
  authorized the root step reference each other by id without either collapsing
  into the other.
- **`0.3.0`** (S6) — level-triggered `reconcile()` + `ObservedState` and the four
  drift states, which keep `satisfied` from becoming a stale snapshot.
- **`ontology-core@0.6.0`** (S2) — `part-of` / `ordered-after` / `binds-port` in
  the governed `KINSHIP_EDGE_TYPES` registry. Until then a dependency edge is an
  ordinary `Relation`; `infra` does not fork the vocabulary.

Each step makes the next honest. None is a backlog item for this one.

## Grounding

- Specification: `/opt/eury/rispecs/foundations/02-specifications.md` §S1, §S3, §S5
- Argument: `/opt/eury/foundations/relational-infrastructure/synthesis.md`
- The collision this exists to catch: `jgwill/gaia#75`
- The outage that motivated observed state: `jgwill/gaia#74`
- Consumer requirements: `jgwill/eury#3`

## License

MIT — IAIP Collaborative, Shawinigan, QC.
