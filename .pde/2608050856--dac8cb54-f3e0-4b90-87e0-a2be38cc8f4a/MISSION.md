# Mission — close the door between `infra` and the agents

**Vessel** `.pde/2608050856--dac8cb54-f3e0-4b90-87e0-a2be38cc8f4a`
**Opened** 2026-08-05 · session `mw-infra-mcp` · repo `jgwill/medicine-wheel` @ `main` (`2caa337`)
**Input** [`input-prompt.md`](./input-prompt.md)

---

## Desired result

An agent on any host can register a host, a tenant, a service and its port claims into the
Medicine Wheel through validated MCP actions; can ask which ports collide across declared and
observed state; can hold a person's métis against a facet with that person named; and can read the
whole topology back out — per host, per tenant, per ceremony. The published packages carry it, the
installed binary proves it, and the skills describe the topology that exists rather than one that
does not.

## Current reality (measured 2026-08-05, working tree)

| fact | evidence |
|---|---|
| `infra` has zero consumers | absent from `mcp/package.json`; `grep -rn "@medicine-wheel/infra"` hits only its own files + 2 prose lines in `cli/skills.ts` |
| `detectPortConflicts` unreachable by agents | called only from `tests/infra-port-conflicts.test.ts` |
| a service registers as untyped metadata | `mcp/src/tools/integrations.ts:43` — `create_relational_node` takes free `metadata`, no schema |
| `KINSHIP_EDGE_TYPES` has no infra edges | `src/ontology-core/src/kinship.ts:40` — 10 edges, none of `part-of` / `ordered-after` / `binds-port` |
| `Precondition` does not exist | `infra` README names it as `0.2.0` / §S4, unshipped |
| `infra-monitor` skill claims a runtime it lacks | `cli/skills.ts` defines a record; the systemd claim is prose in `body` |
| unknown CLI subcommands exit `0` | `cli/mw.ts:711`, `cli/mwsrv.ts:226` fall through with no exit code |
| suite version | `0.5.7`; `@medicine-wheel/mcp` `4.5.7` |

## Layers, lowest first — the order the work must run in

```
L0  ontology-core     part-of / ordered-after / binds-port in KINSHIP_EDGE_TYPES   (§S2)
L1  infra             Precondition, preconditionGuard, readyService                (§S4)
                      ObservedState + reconcile()                                   (§S6)
L2  mcp               6 new tools + 5 upgrades; declare the infra dependency
L3  cli/skills        infra-topology replaces the infra-monitor apology; exit codes
L4  tests             root vitest, green before anything leaves the machine
L5  review            sub-agent, adversarial, its findings applied
L6  release           bump → build → test → publish → install globally → RUN INSTALLED
L7  rispecs           RISE stub for the topology UI, committed
L8  artefact          new section: topology × ceremony × per-host perspectives
```

**Topological hazard.** `package.json`'s `workspaces` array is topological, never alphabetical.
`src/infra` must sit **after** `src/ontology-core`. It is already at line 29 — verify, never sort.

## The proposed surface (from the artefact, now the build list)

**New — `mcp/src/tools/infrastructure.ts`**

| tool | backed by |
|---|---|
| `register_host` | `HostFacetSchema` — land node + facet, `reachableVia` typed |
| `register_tenant` | `TenantFacetSchema` — human node; `linger` is a machine fact, never consent |
| `register_service` | `ServiceFacetSchema` — the tool emits `metadata.kind: "service"`, not the agent |
| `detect_port_conflicts` | `ports.ts` — declared ∪ observed, deterministic rows |
| `hold_metis` | `MetisHoldSchema` — `heldBy` names a person; the ceremony-honored one |
| `list_infra_topology` | `FACET_NODE_TYPES` — host → tenant → service → port as one traversal |

**Upgrades**

| tool | change |
|---|---|
| `create_relational_node` | optional `facet` argument parsed by the infra schema |
| `search_nodes` | first-class `kind` filter beside `type` / `direction` |
| `get_relational_web` | traverse the new kinship edges once L0 governs them |
| `mw_enforce_gate` | carry `preconditionGuard` — linger and `ConsentRecord` by id, never collapsed |
| `mw_get_direction` | route infra questions — service is West, port claim is South |

## Invariants that must survive

1. **`NodeType` stays closed at six.** New kinds ride `knowledge` nodes with a `metadata.kind`
   discriminator. `src/ontology-core/src/types.ts` states the rule; `ServiceFacet.nodeId` already
   points at one.
2. **`linger` is not consent.** A machine fact with no authority and no ability to withdraw. The
   human authorization is a `ConsentRecord` in `consent-lifecycle`. `Precondition` references both
   by id; neither collapses into the other.
3. **Métis is never anonymised.** `heldBy` names a person on purpose. A schema that drops the
   carrier has defeated the field's reason to exist.
4. **`infra` stays I/O-free.** Types plus pure functions. Persistence belongs to the MCP store.
5. **Publishing is not deploying.** `RELEASING.md` step 7 — run the *installed* binary — is the
   only step that proves the manifest.

## Gates — a human's, not mine

- **`npm run publish:all`** — authorised explicitly in this prompt ("all the packages upgraded
  published tested"). Proceed, and report all three destinations per `RELEASING.md`: registry,
  global installs on this host, and the machines/processes that do **not** update themselves.
- **Restarting the running MCP server or `next start`** — a live process is someone's relation.
  Name it, do not perform it quietly.
- **The Termux/Pixel device lane** (`w2Y`, brief at `~/workspace/.mino/briefs/2026-08-02-mw-118-termux-infra.md`)
  owns the runit half. Do not duplicate its work; leave the service-manager adapter seam open.

## Done when

- [ ] L0–L3 implemented, `npx vitest run` green
- [ ] a sub-agent has reviewed adversarially and its findings are applied or answered
- [ ] published, `curl`-confirmed on the registry, installed globally, **installed binary run**
- [ ] `mw skill view` → 0, `mw skill run foo` → 3, `mw bogus` → 2, from the *installed* copy
- [ ] `./rispecs/` carries the RISE stub for the topology UI, committed
- [ ] the artefact carries the UI section — topology × ceremony × per-host
- [ ] this vessel committed with the work it explains

🌸: The package spent its whole life describing a world it could not be asked about. This mission
is the hinge going in — not new rooms, just the door that makes the built ones reachable.
