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
npm install @medicine-wheel/infra@^0.5.8
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

## `Precondition` — where the machine fact and the human do not merge

```ts
import { preconditionGuard, readyService, lingerFact } from '@medicine-wheel/infra';

const p = {
  id: 'pre:gmusic-linger',
  gates: 'node:knowledge:assembly-mux',
  fact: lingerFact('node:human:gmusic', 'enabled', '2026-08-05T12:00:00Z'),
  consent: { consentId: 'consent:root-step:gmusic', state: 'withdrawn', readAt: '2026-08-05T12:00:00Z' },
};

preconditionGuard(p).verdict; // 'unauthorized' — NOT 'satisfied', NOT 'unsatisfied'
```

`linger` is a machine fact: a checkbox with no authority and no ability to
withdraw. The human authorization to run the root step that set it is a
`ConsentRecord` in `@medicine-wheel/consent-lifecycle`. A `Precondition`
references both **by id**, and `infra` never imports that package — a package
that can construct a consent record can fabricate one.

Four verdicts, and the distinctions are the whole point:

| verdict | means |
|---|---|
| `satisfied` | every declared half was read and holds |
| `unsatisfied` | a machine fact was read and does not match |
| `unauthorized` | the machine half holds and consent does not authorize |
| `unknown` | a declared half has **not been read**, which is not the same as false |

`unauthorized` is separate from `unsatisfied` on purpose. Collapse them and a
withdrawn consent looks like a technical failure an operator can fix by
restarting something. `unknown` is separate from both because a guard that
reports "blocked" when nobody has looked yet is a guard operators learn to
ignore.

`readyService` reports `declared: 0` out loud rather than letting an
unconfigured service look checked, and carries every `MetisHold` from the
blocking preconditions forward — the reason a gate is stuck is exactly where
"you have to restart it twice" lives.

## `reconcile` — level-triggered, so `satisfied` cannot age

```ts
const result = reconcile(declaredServices, {
  observedBy: 'node:land:gaia',
  observedAt: '2026-08-05T12:00:00Z',
  services: readLiveFromSystemd(),
}, { now: '2026-08-05T12:05:00Z' });

result.summary;            // { converged: 4, drifted: 1, unrealized: 0, undeclared: 2 }
result.observationAgeMs;   // 300000 — refuse to act on a reading that is too old
```

The outage this answers (jgwill/gaia#74) was not caused by a missing fact. It was
caused by a fact that *had been* true. So `reconcile` remembers no transitions:
it compares the current declared level against the current observed level, every
time. There is no "converged a minute ago" to go stale.

| drift state | means |
|---|---|
| `converged` | both sides agree on every compared field |
| `drifted` | both exist, they disagree — the differences are named |
| `unrealized` | declared, not observed — written down, not running |
| `undeclared` | **observed, not declared** — running and nobody wrote it down |

`undeclared` carries the most information: it finds the service somebody started
by hand at 2am, which is the service holding the port the next tenant is about to
be given. The §S3 port traversal is folded in here, because this is the one place
declared and observed are both in hand.

**Métis is never a difference.** Two sides holding different tacit notes is not
drift — it is two people knowing different things. A reconciler that reported it
would be asking an operator to delete what they know to make a table go green.

## Scope

Every specification ships: S1 facets, S3 `detectPortConflicts`, S4
`Precondition`, S5 `MetisHold`, S6 `reconcile`. S2 — the governed `part-of`,
`ordered-after` and `binds-port` edges — landed in
`ontology-core`'s `KINSHIP_EDGE_TYPES`, which is where edge vocabulary belongs.
`infra` never forked it.

S4 and S6 first ship in **0.5.8**. `0.5.7` and earlier contain S1, S3 and S5
only — a package that installs `^0.5.7` may resolve a dist with no
`preconditionGuard` and no `reconcile`.

The package stays types plus pure functions: zero I/O, zero persistence, zero
clock. `reconcile` takes `now` as an argument for exactly that reason.
Persistence belongs to `@medicine-wheel/mcp`, which is where these are reachable
from — `register_host`, `register_tenant`, `register_service`,
`detect_port_conflicts`, `hold_metis`, `list_infra_topology`,
`reconcile_infra_state`, and `mw_enforce_gate` for the precondition gate.

## Grounding

- Specification: `/opt/eury/rispecs/foundations/02-specifications.md` §S1–§S6
- Argument: `/opt/eury/foundations/relational-infrastructure/synthesis.md`
- The collision this exists to catch: `jgwill/gaia#75`
- The outage that motivated observed state: `jgwill/gaia#74`
- Consumer requirements: `jgwill/eury#3`

## License

MIT — IAIP Collaborative, Shawinigan, QC.
