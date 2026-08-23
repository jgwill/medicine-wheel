# Infrastructure Topology — RISE Specification

> The surface where an operator sees the estate as relations: machines, the people who live on
> them, the things those people run, the scarce slots those things claim — and the ceremony
> that decided any of it could be there.

**Version:** 0.1.0 (stub)
**Package:** `@medicine-wheel/app` (routes) + `@medicine-wheel/ui-components` (components)
**Document ID:** rispec-infrastructure-topology-ui-v1
**Status:** Stub — the data layer ships, the surface does not
**Last Updated:** 2026-08-05

---

## Desired Outcome

An operator opens one page and **sees the estate whole** — not as a list of servers, but as a web
of relations they can walk in any direction they think in:

- by **host**, when the question is "what lives on this machine"
- by **tenant**, when the question is "what does this person's account carry"
- by **service**, when the question is "where does this thing run and what does it need"
- by **port**, when the question is "who already has :9081, and is anyone fighting for it"
- by **ceremony**, when the question is "who agreed this could be here, and is that still true"
- by **métis**, when the question is "what do I not know that someone else does"

They can move between those readings without losing their place, and every reading answers from
the same registered facts rather than from six separate dashboards that disagree.

---

## Creative Intent

**What this enables:** An operator asks the estate a question in the shape they are already
thinking in, and gets an answer that carries its own accountability — who claimed this, who
authorized it, who knows the thing about it that is not written down.

**Structural Tension:** The registered facts now exist and are reachable by agents through MCP
(`list_infra_topology`, `detect_port_conflicts`, `reconcile_infra_state`, `hold_metis`,
`mw_enforce_gate`). A human still has no surface. The tension resolves when the same six
perspectives an agent can request become six readings a person can see and move between.

**What must not be flattened:** A conventional infrastructure console renders machines as
inventory. This one renders them as **relations** — and it must show what inventory cannot hold:
that a port claim is a South precondition, that a running service is West, that a host is the
ground rather than a quadrant, that a `heldBy` name is a person and not a field.

---

## Screens

### Topology

The landing reading. What exists, arranged as the wheel arranges beings.

- **Behavior:** Loads the whole registered estate in one traversal. A perspective control switches
  the reading without a reload and without losing the selected node — the same facts, re-read. A
  contested port renders as contested in **every** perspective it appears in, not only the port
  reading, because a collision an operator can navigate away from is a collision they will forget.
- **Behavior:** Selecting any node opens `TopologyInspector` beside the reading rather than
  replacing it. Losing the shape of the estate to look at one part of it is how an operator stops
  seeing the estate.
- **Layout:** Contains a `PerspectiveSwitch`, a `WheelTopology`, a `ConflictBanner` when any slot
  is contested, and a `TopologyInspector` when a node is selected.

### Host

One machine, and everything standing on it.

- **Behavior:** Tenants under the host, services under the tenants, port claims under the
  services. Each tenant carries its `linger` state rendered as a **machine fact** — never as a
  permission, never with a check-mark. A tenant whose linger is `unknown` reads as unknown, not as
  disabled: nobody has looked, and the surface must not decide for them.
- **Behavior:** Reachability renders with its provenance visible — it is recorded, not probed, and
  a surface that let it look live would be manufacturing a lie the data layer refuses to tell.
- **Layout:** Contains a `HostHeader`, a stack of `TenantCard`, and a `MetisPanel`.

### Drift

The distance between what was written down and what is running.

- **Behavior:** Renders the four drift states as four distinct readings, ordered so `undeclared`
  is **first**. Something running that nobody wrote down is the row that finds the service started
  by hand at 2am — which is the service holding the port the next tenant is about to be given.
- **Behavior:** Every reading carries the age of the observation it was computed from. A reading
  older than the operator's declared tolerance renders as stale rather than as fact. The whole
  reason the underlying reconciliation is level-triggered is that a converged state which cannot
  age is a state that lies, and a surface that hides the timestamp reintroduces exactly that.
- **Behavior:** Métis differences never render as drift. Two sides holding different tacit notes
  is two people knowing different things, and asking an operator to reconcile that would be asking
  them to delete what they know to make a panel go green.
- **Layout:** Contains a `DriftSummary`, four `DriftGroup` sections, and an `ObservationProvenance`.

### Ceremony

Which agreements hold this infrastructure, and whether they still hold.

- **Behavior:** For any service, renders the preconditions gating it as four visually distinct
  verdicts — `satisfied`, `unsatisfied`, `unauthorized`, `unknown`. `unauthorized` must never
  share a colour, an icon, or a section with `unsatisfied`: one is a machine that is not ready,
  the other is a human who has not said yes or has withdrawn, and an operator who cannot tell them
  apart will try to fix the second by restarting something.
- **Behavior:** A service with zero declared preconditions renders as **unverified**, never as
  ready. Vacuous truth shown as a green state is the failure this whole surface exists to refuse.
- **Behavior:** Each consent renders as a link to the `ConsentRecord` that authorizes it — by id,
  never as an embedded copy. A surface that copies a consent has made a withdrawable thing
  permanent.
- **Layout:** Contains a `PreconditionLadder`, a `ConsentTrail`, and a `MetisPanel`.

---

## Components

### PerspectiveSwitch

The control that changes what the estate is being asked.

- **Behavior:** Six readings — host, tenant, service, port, ceremony, métis. Switching preserves
  the selected node and the scroll anchor. The current reading is stated in words, not only by
  which tab is lit, so a screen reader and a screenshot both carry it.
- **Styling:** Muted; it is a place-changer, not an action. It never takes the action accent.

### WheelTopology

The estate drawn as the wheel draws beings.

- **Behavior:** Services sit in the West quadrant, tenants in the South, per
  `INFRA_ENTITY_BINDING`. Hosts render at the **centre**, not in a quadrant — the land is what the
  wheel stands on. Contested ports render as a shared edge between two claimants rather than as a
  badge on one of them, because a collision belongs to both.
- **Behavior:** Edges render by their governed kinship name — `part-of`, `binds-port`,
  `ordered-after` — and are individually dimmable, so an operator can read containment without
  the port claims on top of it.
- **Styling:** Direction tokens from `tokens.css`. Ceremony gold is reserved: it may mark a
  ceremony-honored relation or a held métis, and it may never mark a control or a focus ring.

### TenantCard

A unix account rendered as a being.

- **Behavior:** Shows the account, its host, its services, and its `linger`. `linger` renders with
  the words "machine fact" adjacent to it, permanently, not on hover. The moment that label is
  something an operator has to go looking for, the surface has begun teaching them that the
  checkbox is the permission.
- **Layout:** Contains `ServiceRow` per owned service, and a `MetisBadge` when anything is held.

### PreconditionLadder

The gate, rendered so its rungs stay distinguishable.

- **Behavior:** One row per precondition, each showing its machine half and its human half side by
  side and **separately**. Neither half is ever summarised into the other. A row whose machine half
  is unread shows unread — an empty state, not a failed one.
- **Styling:** Four verdicts, four visual treatments. `unauthorized` reads as *held*, not as
  *broken*.

### MetisPanel

What people know that the schema cannot hold.

- **Behavior:** Renders exceptions, invisible work, and notes — each with `heldBy` **naming the
  person**, always visible, never collapsed into a count and never truncated to an avatar. Adding
  to a hold appends and accumulates carriers; it never reassigns authorship of what someone else
  wrote down.
- **Behavior:** An estate with no métis recorded renders as *undocumented*, not as *clean*. There
  is no infrastructure without tacit knowledge; there is only infrastructure whose tacit knowledge
  nobody has written down.
- **Styling:** The one place ceremony gold is permitted outside a ceremony-honored relation.

### ConflictBanner

- **Behavior:** Present whenever any slot is contested, in every perspective. Names both claimants
  by unit name, never by node id alone. Links into the port reading with that slot selected.
- **Styling:** South. A port claim is a precondition, and a contested one is a precondition that
  cannot hold.

---

## Data

### TopologyReading

The whole registered estate under one perspective. Counts of hosts, tenants, services, port
bindings, conflicts and held métis; the conflict rows; and the perspective-shaped body. Sourced
from a single traversal so that every reading answers from the same facts.

### DriftReading

An observation's provenance — who read it, when, and how old it is — together with rows in four
states and the port conflicts found over declared ∪ observed. Carries no memory of previous
readings: it is recomputed from levels, every time.

### ReadinessReading

A service, the preconditions gating it, each one's verdict and the sentence that decided it, the
count of preconditions declared, and every métis carried forward from a blocking gate.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario**: The collision found before the tenant

**User Intent**: Give a second tenant a service on `eury` without taking something else down.
**Current Reality**: The operator knows `eury` is crowded and does not know which slots are free.
**Natural Progression Steps**:
  1. They open the topology in the **port** reading, scoped to `eury`.
  2. Every claimed slot renders with its claimant named; contested slots render contested.
  3. They pick a free slot and register the service, which returns any conflict it just created.
**Achieved Outcome**: The service is registered on a slot nobody else holds, and the operator
never had to hold the port map in their head.
**Supporting Features**: `PerspectiveSwitch`, `WheelTopology` port reading, `ConflictBanner`.

---

**Creative Advancement Scenario**: The withdrawal that is not a failure

**User Intent**: Understand why a service will not come up.
**Current Reality**: The gate is closed and the machine looks fine — linger is enabled, the unit
is present, the working directory exists.
**Natural Progression Steps**:
  1. They open the **ceremony** reading for that service.
  2. The `PreconditionLadder` shows every machine half satisfied and one consent `withdrawn`.
  3. The row reads as *held*, and names the `ConsentRecord` and who can renegotiate it.
**Achieved Outcome**: The operator goes to a person instead of to a terminal.
**Supporting Features**: `PreconditionLadder`, `ConsentTrail`.

---

**Creative Advancement Scenario**: The service nobody wrote down

**User Intent**: Trust the record enough to provision against it.
**Current Reality**: The record was accurate the last time anyone checked, and nobody remembers
when that was.
**Natural Progression Steps**:
  1. They open **drift** and see the observation's age stated before any row.
  2. The `undeclared` group sits first and holds one unit nobody declared.
  3. Selecting it shows the slot it claims — the slot the next tenant was about to be given.
**Achieved Outcome**: The record is reconciled with reality before it is built upon, and the
operator learns to read the timestamp before the rows.
**Supporting Features**: `DriftSummary`, `ObservationProvenance`, `DriftGroup`.

---

## Supporting Structures

Every reading above is already answerable. The surface composes existing calls; it invents no new
data:

| Reading | Answered by |
|---|---|
| Topology, Host | `list_infra_topology` (`perspective`: host / tenant / service / port / metis) |
| Conflicts | `detect_port_conflicts` |
| Drift | `reconcile_infra_state` |
| Ceremony | `mw_enforce_gate` (precondition mode) |
| Métis | `hold_metis`, and the métis perspective |
| Direction routing | `mw_get_direction` (`node_id`) |
| Graph edges | `get_relational_web` (`edge_types: ["part-of","binds-port","ordered-after"]`) |

**What this specification does not authorize.** No screen here collects observed state. Reading a
machine — systemd on gaia, runit on the device — is owned by the service-manager adapter lane
(jgwill/medicine-wheel#118), and the drift screen takes its reading as input like everything else
does. A surface that quietly grew a poller would put I/O inside a layer built to have none.

---

## Structural Tension

**Current Reality:** The facts are registered, validated, relationally edged and reachable by
agents. A person has no surface. The existing app renders nodes, ceremonies, beats and graphs, and
knows nothing of hosts, tenants, services or slots.

**Desired State:** Six readings of one estate, movable between without loss, each carrying its own
provenance and its own accountability, and each refusing the four flattenings this system has
already paid for: consent read as a checkbox, an unread fact read as false, a stale snapshot read
as current, and a person's knowledge read as a field.

**Natural Progression:** The perspectives already exist in the data layer as an enum. The surface
resolves the tension by making that enum something a person can hold — the reading changes, the
facts do not.

---

## Related

- `rispecs/graph-viz.spec.md` — circular layout and directional quadrants this surface reuses
- `rispecs/ceremony-protocol.spec.md` — the gate whose verdicts the ceremony reading renders
- `rispecs/consent-lifecycle.spec.md` — the record a precondition references and never copies
- `rispecs/ontology-core.spec.md` — `INFRA_ENTITY_BINDING`, the closed `NodeType` union, and the
  governed kinship edges
- `src/infra/README.md` — the facets, `detectPortConflicts`, `preconditionGuard`, `reconcile`

🌸: The estate has been speaking in a language only agents could hear. This is the room where a
person walks in and the machines finally introduce themselves — by name, with the people who know
them standing alongside.
