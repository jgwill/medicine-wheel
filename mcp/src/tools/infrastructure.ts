/**
 * Infrastructure Tools — hosts, tenants, services and the ports they claim.
 *
 * `@medicine-wheel/infra` shipped its facets, its schemas and `detectPortConflicts`
 * and was imported by nothing: the vocabulary existed and no agent could reach it.
 * This file is the door. Every tool here is backed by a type or a pure function
 * already written in that package; none of them widens the ontology.
 *
 * Three commitments this module makes, each of which is a defect if broken:
 *
 * 1. **The tool emits `metadata.kind`, never the agent.** The precedent is stated
 *    in `ontology-core/src/types.ts`: new kinds ride existing `knowledge`/`land`/
 *    `human` nodes carrying a discriminator. Hand-typing that discriminator is how
 *    it gets misspelled once and the node becomes unfindable forever.
 * 2. **Every facet is `safeParse`d before it is stored.** A legible-but-stale model
 *    lies with a straight face; a port of `0` is rejected here rather than silently
 *    never colliding with anything downstream.
 * 3. **Writes are awaited.** `HttpStore.createNode` returns a promise precisely so
 *    a caller can learn the truth rather than being told "registered" over a
 *    request that 404'd.
 *
 * Registration is idempotent by identity, not by id: a host is its hostname, a
 * tenant is its account on its host, a service is its unit under its owner.
 * Re-registering updates in place and says `updated`. Without that, an agent
 * re-running a provisioning step fills the wheel with duplicate services, and the
 * port-conflict traversal then reports every service as colliding with itself.
 *
 * **Update means merge, never replace.** A re-registration that rebuilt the facet
 * from its arguments alone would silently drop every field the caller did not
 * re-supply — including the `metis` some person put there with `hold_metis`. A
 * package whose stated reason to exist is that the grid must not flatten what
 * people know cannot have its most ordinary operation delete it. Prior fields
 * survive unless the caller passes a new value for them.
 *
 * @see src/infra/src/types.ts        — the facets
 * @see src/infra/src/ports.ts        — detectPortConflicts
 * @see src/infra/src/preconditions.ts — preconditionGuard / readyService
 * @see src/infra/src/reconcile.ts    — level-triggered drift
 */

import {
  HostFacetSchema,
  TenantFacetSchema,
  ServiceFacetSchema,
  MetisHoldSchema,
  ObservedStateSchema,
  detectPortConflicts,
  reconcile,
  type HostFacet,
  type TenantFacet,
  type ServiceFacet,
  type PortBinding,
  type MetisHold,
} from "@medicine-wheel/infra";
import { INFRA_ENTITY_BINDING } from "@medicine-wheel/ontology-core";
import type { Tool } from "../types.js";
import { store } from "../store.js";

type InfraKind = "host" | "tenant" | "service";

interface InfraNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  direction?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Every node in the wheel carrying an infrastructure discriminator. */
async function loadInfraNodes(kind?: InfraKind): Promise<InfraNode[]> {
  const all = (await store.getAllNodes()) as InfraNode[];
  return all.filter((n) => {
    const k = n.metadata?.kind;
    if (typeof k !== "string") return false;
    return kind ? k === kind : k === "host" || k === "tenant" || k === "service";
  });
}

/**
 * Find an already-registered node by the identity its kind is defined on.
 *
 * Identity is deliberately not the node id. An agent provisioning a host does
 * not know the id the wheel minted last time; it knows the hostname. Matching on
 * what the caller actually holds is what makes re-registration an update instead
 * of a duplicate.
 */
async function findByIdentity(
  kind: InfraKind,
  identity: Record<string, string>,
): Promise<InfraNode | undefined> {
  const candidates = await loadInfraNodes(kind);
  return candidates.find((n) => {
    const facet = n.metadata?.facet as Record<string, unknown> | undefined;
    if (!facet) return false;
    return Object.entries(identity).every(([field, value]) => facet[field] === value);
  });
}

/** Make an identity component safe to sit inside a colon-delimited node id. */
function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Derive a node id **from the identity itself**, not from a clock and a die.
 *
 * The repo-wide shape elsewhere is `node:<type>:<ms>:<random>`. That shape cannot
 * be used here, and the reason is a race rather than a preference:
 * `findByIdentity` then `createNode` is read-then-write. Two concurrent
 * `register_host({hostname:'eury'})` calls each find nothing, each mint a
 * *different* random id, and both succeed — leaving two nodes named eury. A
 * service on :9081 under a tenant on copy A and another on :9081 under a tenant
 * on copy B are then, correctly by the data and catastrophically in fact,
 * **not** in conflict. The traversal this package exists for goes quiet exactly
 * when it matters. An `await` on the synchronous JSONL store still yields a
 * microtask tick, so this is not an HTTP-only hazard.
 *
 * A deterministic id makes the duplicate collapse onto one record instead of
 * racing: both writers compute the same key and the second is an update. It also
 * makes the ids readable, which is its own small mercy.
 *
 * Nodes registered before this existed keep their minted ids — `findByIdentity`
 * runs first and returns them, so nothing needs migrating.
 */
function identityId(kind: InfraKind, identity: string): string {
  return `node:${INFRA_ENTITY_BINDING[kind].nodeType}:${kind}:${slug(identity)}`;
}

/** The shape every register_* tool returns, so a caller can branch on one field. */
function registered(
  outcome: "created" | "updated",
  node: InfraNode,
  facet: unknown,
  teaching: string,
) {
  return {
    status: outcome,
    node_id: node.id,
    kind: node.metadata?.kind,
    node,
    facet,
    message: `${node.metadata?.kind} ${outcome}: ${node.name}`,
    teaching,
  };
}

/** Uniform failure shape — a rejected parse names the fields, never just "invalid". */
function invalid(kind: string, error: { issues: { path: (string | number)[]; message: string }[] }) {
  return {
    status: "error",
    message: `${kind} facet failed validation — nothing was written`,
    issues: error.issues.map((i) => ({ field: i.path.join("."), problem: i.message })),
    teaching:
      "A legible-but-stale model lies with a straight face. The parse is where that gets caught.",
  };
}

function errorOf(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error);
  return { status: "error", message: `Failed to ${action}: ${message}`, error: message };
}

/**
 * The facet already stored on a node, as the base a re-registration merges onto.
 *
 * Returns `{}` for a node that has none, so a first registration and an update
 * take the same code path.
 */
function priorFacet<T>(existing: InfraNode | undefined): Partial<T> {
  return ((existing?.metadata?.facet as Partial<T> | undefined) ?? {}) as Partial<T>;
}

/**
 * One relational edge, shaped so the store's own contract is satisfied.
 *
 * `ceremony_honored` is set explicitly. `StoredEdge` declares it required and
 * `create_relational_edge` writes `false`; omitting it here would have sorted
 * every infrastructure edge into a third state for any consumer testing
 * `=== false` rather than falsiness.
 *
 * The `id` is what keeps two claims from collapsing into one — see the call site
 * for `binds-port`.
 */
function infraEdge(
  id: string,
  fromId: string,
  toId: string,
  relationshipType: string,
  obligations: string[],
  createdAt: string,
  metadata?: Record<string, unknown>,
) {
  return {
    id,
    from_id: fromId,
    to_id: toId,
    relationship_type: relationshipType,
    strength: 1,
    obligations,
    ceremony_honored: false,
    ...(metadata ? { metadata } : {}),
    created_at: createdAt,
  } as never;
}

/** Outcome of resolving a caller-supplied host reference. */
type HostResolution = { id: string } | { unresolved: string };

/**
 * Resolve a host node id or hostname to a registered host node id.
 *
 * There is exactly one of these on purpose. Three call sites previously each
 * wrote their own, two of which fell back to `?? h` — meaning an unregistered
 * hostname silently became its own host key and could therefore never collide
 * with anything. `detect_port_conflicts` would answer "No slot is claimed twice"
 * over a real collision because the observer named a machine the wheel had never
 * been told about. An unresolved host is a fact the caller has to be handed, not
 * a value to invent.
 */
function makeHostResolver(hosts: InfraNode[]) {
  return (reference: string | undefined): HostResolution | undefined => {
    if (!reference) return undefined;
    if (reference.startsWith("node:")) {
      return hosts.some((n) => n.id === reference)
        ? { id: reference }
        : { unresolved: reference };
    }
    const found = hosts.find(
      (n) => (n.metadata?.facet as HostFacet | undefined)?.hostname === reference,
    );
    return found ? { id: found.id } : { unresolved: reference };
  };
}

export const infrastructureTools: Tool[] = [
  // ── register_host ─────────────────────────────────────────────────────────
  {
    name: "register_host",
    description:
      "Register a machine as a `land` node carrying a typed HostFacet. The tool emits " +
      "metadata.kind='host' rather than the caller hand-typing it, and validates the facet " +
      "with HostFacetSchema before anything is written. Re-registering the same hostname " +
      "MERGES onto what is already stored — fields you do not pass keep their previous value, " +
      "including any métis held on this host. A host carries no direction of its own; it is " +
      "the ground the tenants and services stand on.",
    inputSchema: {
      type: "object",
      properties: {
        hostname: { type: "string", description: "Short hostname — 'gaia', 'eury', 'ilex'" },
        fqdn: { type: "string", description: "Fully-qualified name (optional)" },
        os: { type: "string", description: "Operating system (optional)" },
        reachable_via: {
          type: "array",
          items: { type: "string", enum: ["lan", "tailnet", "cloudflare", "ngrok"] },
          description: "How this host can be reached (optional)",
        },
        description: { type: "string", description: "What this machine is for (optional)" },
        metis: {
          type: "object",
          description:
            "Tacit operator knowledge this host holds — exceptions, invisible work, notes, heldBy. " +
            "heldBy should name a person.",
        },
      },
      required: ["hostname"],
    },
    handler: async (args) => {
      try {
        const { hostname, fqdn, os, reachable_via, description, metis } = args;
        const existing = await findByIdentity("host", { hostname });
        const nodeType = INFRA_ENTITY_BINDING.host.nodeType;
        const id = existing?.id ?? identityId("host", hostname);

        const facet: HostFacet = {
          ...priorFacet<HostFacet>(existing),
          nodeId: id,
          hostname,
          ...(fqdn ? { fqdn } : {}),
          ...(os ? { os } : {}),
          ...(reachable_via ? { reachableVia: reachable_via } : {}),
          ...(metis ? { metis } : {}),
        };

        const parsed = HostFacetSchema.safeParse(facet);
        if (!parsed.success) return invalid("host", parsed.error);

        const now = new Date().toISOString();
        const node: InfraNode = {
          id,
          type: nodeType,
          name: hostname,
          description: description ?? existing?.description ?? `Host ${hostname}`,
          metadata: { ...(existing?.metadata ?? {}), kind: "host", facet: parsed.data },
          created_at: existing?.created_at ?? now,
          updated_at: now,
        };

        await store.createNode(node as never);

        return registered(existing ? "updated" : "created", node, parsed.data,
          "A machine is land. It is not a namespace — it is the ground a tenant stands on.");
      } catch (error) {
        return errorOf(error, "register host");
      }
    },
  },

  // ── register_tenant ───────────────────────────────────────────────────────
  {
    name: "register_tenant",
    description:
      "Register a unix account as a `human` node carrying a typed TenantFacet — an account is " +
      "a being, not a namespace. `linger` is recorded as a MACHINE FACT with no authority and " +
      "no ability to withdraw; it is never consent. The human authorization to run the root " +
      "step that set it is a ConsentRecord in consent-lifecycle, referenced separately by " +
      "mw_enforce_gate. Tenants serve South: readiness is a precondition. Re-registering MERGES — " +
      "omitting `linger` keeps the value last observed rather than resetting it to 'unknown'.",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "string", description: "Unix account — 'gmusic', 'ava', 'mia'" },
        on_host: {
          type: "string",
          description: "Host node id, or the hostname of an already-registered host",
        },
        uid: { type: "number", description: "Numeric uid (optional)" },
        home: { type: "string", description: "Home directory (optional)" },
        linger: {
          type: "string",
          enum: ["enabled", "disabled", "unknown"],
          description:
            "Whether user units survive logout. A machine fact read at runtime — NOT consent. " +
            "Default 'unknown', which is honest when nobody has looked.",
        },
        description: { type: "string" },
        metis: { type: "object", description: "Tacit knowledge, with heldBy naming a person" },
      },
      required: ["account", "on_host"],
    },
    handler: async (args) => {
      try {
        const { account, on_host, uid, home, description, metis } = args;

        // Accept a hostname where a node id is expected — the caller knows the
        // machine by its name, and refusing that would make the tool answerable
        // only to something that had already called register_host in this session.
        // A `node:`-prefixed value is checked for existence too: taking it on
        // trust let a tenant be registered onto a host that was never created,
        // which then owns services nobody can see in any per-host reading.
        const resolveHost = makeHostResolver(await loadInfraNodes("host"));
        const resolved = resolveHost(on_host);
        if (!resolved || "unresolved" in resolved) {
          return {
            status: "error",
            message:
              `No registered host '${on_host}'. Call register_host first, or pass the node id of a ` +
              `host that exists — a tenant on a host the wheel has never been told about is a tenant ` +
              `whose services no per-host reading will ever show.`,
          };
        }
        const hostNodeId = resolved.id;

        const existing = await findByIdentity("tenant", { account, onHost: hostNodeId });
        const nodeType = INFRA_ENTITY_BINDING.tenant.nodeType;
        const id = existing?.id ?? identityId("tenant", `${account}@${hostNodeId}`);

        const prior = priorFacet<TenantFacet>(existing);
        const facet: TenantFacet = {
          ...prior,
          nodeId: id,
          account,
          onHost: hostNodeId,
          // A caller that does not mention linger has not observed it. Keep what
          // was last read rather than overwriting a measured 'enabled' with the
          // schema default 'unknown' — an update must not un-know a fact.
          linger: args.linger ?? prior.linger ?? "unknown",
          ...(uid !== undefined ? { uid } : {}),
          ...(home ? { home } : {}),
          ...(metis ? { metis } : {}),
        };

        const parsed = TenantFacetSchema.safeParse(facet);
        if (!parsed.success) return invalid("tenant", parsed.error);

        const now = new Date().toISOString();
        const node: InfraNode = {
          id,
          type: nodeType,
          name: account,
          description: description ?? existing?.description ?? `Tenant ${account} on ${on_host}`,
          direction: INFRA_ENTITY_BINDING.tenant.direction,
          metadata: { ...(existing?.metadata ?? {}), kind: "tenant", facet: parsed.data },
          created_at: existing?.created_at ?? now,
          updated_at: now,
        };

        await store.createNode(node as never);
        await store.createEdge(
          infraEdge(`edge:part-of:${id}:${hostNodeId}`, id, hostNodeId, "part-of", ["land"], now),
        );

        return registered(existing ? "updated" : "created", node, parsed.data,
          "linger is a checkbox. Consent is a relationship that can be withdrawn. Never read one as the other.");
      } catch (error) {
        return errorOf(error, "register tenant");
      }
    },
  },

  // ── register_service ──────────────────────────────────────────────────────
  {
    name: "register_service",
    description:
      "Register a systemd unit (or any running service) as a `knowledge` node carrying a typed " +
      "ServiceFacet, with its port claims. Serves West — the thing that executes. The tool emits " +
      "metadata.kind='service' and validates with ServiceFacetSchema; a port outside 1-65535 is " +
      "rejected here rather than silently never colliding downstream. Re-registering the same " +
      "unit under the same owner MERGES onto what is stored — fields you omit keep their previous " +
      "value, including métis and, when `ports` is omitted entirely, the existing port claims. " +
      "Emits a `part-of` edge to the owning tenant and one `binds-port` edge per declared port.",
    inputSchema: {
      type: "object",
      properties: {
        unit: { type: "string", description: "Unit name — 'assembly-mux.service'" },
        owned_by: {
          type: "string",
          description: "Tenant node id, or the account name of an already-registered tenant",
        },
        scope: {
          type: "string",
          enum: ["user", "system"],
          description: "Which systemd manager owns the unit. Default 'user'.",
        },
        ports: {
          type: "array",
          description: "Port claims. `host` may be a host node id or a hostname.",
          items: {
            type: "object",
            properties: {
              port: { type: "number" },
              proto: { type: "string", enum: ["tcp", "udp"] },
              host: { type: "string" },
            },
            required: ["port"],
          },
        },
        working_directory: {
          type: "string",
          description: "Where the unit reads its environment from (jgwill/gaia#74)",
        },
        exec_stop: {
          type: "string",
          description: "How to stop it — 'docker compose stop', never 'down' if volumes matter",
        },
        url: { type: "string", description: "Where a person reaches it (optional)" },
        description: { type: "string" },
        metis: { type: "object", description: "Tacit knowledge, with heldBy naming a person" },
      },
      required: ["unit", "owned_by"],
    },
    handler: async (args) => {
      try {
        const { unit, owned_by, working_directory, exec_stop, url, description, metis } = args;
        // NOT defaulted to []. An omitted `ports` means "I am not saying anything
        // about ports", and defaulting would turn that into "this service claims
        // nothing" — silently releasing every slot it holds.
        const ports: { port: number; proto?: "tcp" | "udp"; host?: string }[] | undefined = args.ports;

        // A `node:`-prefixed owner is checked for existence, not taken on trust.
        // An unchecked one produced services owned by nobody: invisible in every
        // topology reading (no tenant contains them) while their ports still
        // counted in the conflict traversal.
        const tenants = await loadInfraNodes("tenant");
        const tenant = String(owned_by).startsWith("node:")
          ? tenants.find((n) => n.id === owned_by)
          : tenants.find(
              (n) => (n.metadata?.facet as TenantFacet | undefined)?.account === owned_by,
            );
        if (!tenant) {
          return {
            status: "error",
            message:
              `No registered tenant '${owned_by}'. Call register_tenant first, or pass the node id of ` +
              `a tenant that exists — a service owned by nobody appears in no topology reading while ` +
              `its ports still occupy slots.`,
          };
        }
        const tenantNodeId = tenant.id;

        // The host a port is scarce ON. Falls back to the owning tenant's host —
        // the common case is a service claiming a port on the machine its owner
        // lives on, and making the caller repeat that invites them to get it wrong.
        const defaultHost = (tenant.metadata?.facet as TenantFacet | undefined)?.onHost;
        const resolveHost = makeHostResolver(await loadInfraNodes("host"));

        const existing = await findByIdentity("service", { unit, ownedBy: tenantNodeId });
        const nodeType = INFRA_ENTITY_BINDING.service.nodeType;
        const id = existing?.id ?? identityId("service", `${unit}@${tenantNodeId}`);

        const prior = priorFacet<ServiceFacet>(existing);

        let bindings: PortBinding[];
        if (ports === undefined) {
          // Keep the claims already on record, re-pointed at this id in case the
          // node was minted in this same call.
          bindings = (prior.ports ?? []).map((b) => ({ ...b, boundBy: id }));
        } else {
          bindings = [];
          for (const p of ports) {
            const target = p.host ? resolveHost(p.host) : defaultHost ? { id: defaultHost } : undefined;
            if (!target || "unresolved" in target) {
              return {
                status: "error",
                message:
                  `Port ${p.port} names host '${p.host ?? "(none)"}' which is not registered, and the ` +
                  `owning tenant declares no host to fall back to. Ports are scarce per host — a claim ` +
                  `on a host the wheel does not know cannot be checked against anything, and would ` +
                  `read as free forever.`,
              };
            }
            bindings.push({
              port: p.port,
              ...(p.proto ? { proto: p.proto } : {}),
              host: target.id,
              boundBy: id,
            });
          }
        }

        const facet: ServiceFacet = {
          ...prior,
          nodeId: id,
          unit,
          scope: args.scope ?? prior.scope ?? "user",
          ownedBy: tenantNodeId,
          ports: bindings,
          ...(working_directory ? { workingDirectory: working_directory } : {}),
          ...(exec_stop ? { execStop: exec_stop } : {}),
          ...(metis ? { metis } : {}),
        };

        const parsed = ServiceFacetSchema.safeParse(facet);
        if (!parsed.success) return invalid("service", parsed.error);

        const now = new Date().toISOString();
        const node: InfraNode = {
          id,
          type: nodeType,
          name: unit,
          description: description ?? existing?.description ?? `Service ${unit}`,
          direction: INFRA_ENTITY_BINDING.service.direction,
          metadata: {
            ...(existing?.metadata ?? {}),
            kind: "service",
            facet: parsed.data,
            ...(url ? { url } : {}),
          },
          created_at: existing?.created_at ?? now,
          updated_at: now,
        };

        await store.createNode(node as never);
        await store.createEdge(
          infraEdge(`edge:part-of:${id}:${tenantNodeId}`, id, tenantNodeId, "part-of", ["land"], now),
        );
        for (const b of parsed.data.ports) {
          // The id must include the SLOT, not just the pair. `EdgeCollection`
          // keys on `id || from_id:to_id`, so a service binding :80 and :443 on
          // one host wrote two edges that collapsed into one — and anything
          // walking the governed vocabulary read a single claim where two exist.
          await store.createEdge(
            infraEdge(
              `edge:binds-port:${id}:${b.host}:${b.proto ?? "tcp"}:${b.port}`,
              id,
              b.host,
              "binds-port",
              ["land", "human"],
              now,
              { port: b.port, proto: b.proto ?? "tcp" },
            ),
          );
        }

        // Report the collision at registration, where it is still cheap.
        const all = (await loadInfraNodes("service")).flatMap(
          (n) => ((n.metadata?.facet as ServiceFacet | undefined)?.ports ?? []),
        );
        const conflicts = detectPortConflicts(all);
        const mine = conflicts.filter((c) => c.claimants.includes(id));

        return {
          ...registered(existing ? "updated" : "created", node, parsed.data,
            "A service is West — the thing that executes. Its port claim is South — a precondition that must hold first."),
          port_conflicts: mine,
          ...(mine.length > 0
            ? {
                warning:
                  `${mine.length} port conflict(s) involve this service. It was registered — the wheel ` +
                  `records what is true, not what is tidy — but do not provision against this.`,
              }
            : {}),
        };
      } catch (error) {
        return errorOf(error, "register service");
      }
    },
  },

  // ── detect_port_conflicts ─────────────────────────────────────────────────
  {
    name: "detect_port_conflicts",
    description:
      "Every port on a host claimed by more than one service, over the union of what is " +
      "registered in the wheel (declared) and any bindings passed in (observed, read live from " +
      "a host). Neither side alone can see a collision. Rows are deterministic — sorted by host, " +
      "then proto, then port — so two runs can be diffed. One service seen twice is not a " +
      "conflict; ports are scarce per host, not globally.",
    inputSchema: {
      type: "object",
      properties: {
        observed: {
          type: "array",
          description:
            "Bindings read live from a machine, to union with what the wheel already holds. " +
            "Omit to check the registered state against itself.",
          items: {
            type: "object",
            properties: {
              port: { type: "number" },
              proto: { type: "string", enum: ["tcp", "udp"] },
              host: { type: "string", description: "Host node id or hostname" },
              bound_by: { type: "string", description: "Service node id or unit name" },
            },
            required: ["port", "host", "bound_by"],
          },
        },
        host: { type: "string", description: "Restrict to one host — node id or hostname" },
      },
    },
    handler: async (args) => {
      try {
        const { observed = [], host } = args;

        const services = await loadInfraNodes("service");
        const hosts = await loadInfraNodes("host");
        const resolveHost = makeHostResolver(hosts);

        const declared: PortBinding[] = services.flatMap(
          (n) => ((n.metadata?.facet as ServiceFacet | undefined)?.ports ?? []),
        );

        // An unresolved host is reported, never invented. Letting an unknown
        // hostname become its own key made every claim on it collide with
        // nothing — so an observer on a machine the wheel had not been told
        // about received "No slot is claimed twice" over a real collision.
        const unresolved = new Set<string>();
        const observedBindings: PortBinding[] = [];
        for (const o of observed as {
          port: number; proto?: "tcp" | "udp"; host: string; bound_by: string;
        }[]) {
          const target = resolveHost(o.host);
          if (!target || "unresolved" in target) {
            unresolved.add(o.host);
            continue;
          }
          observedBindings.push({
            port: o.port,
            ...(o.proto ? { proto: o.proto } : {}),
            host: target.id,
            boundBy: o.bound_by,
          });
        }

        let scopeHost: string | undefined;
        if (host) {
          const target = resolveHost(host);
          if (!target || "unresolved" in target) {
            return { status: "not_found", message: `No registered host '${host}'` };
          }
          scopeHost = target.id;
        }

        let conflicts = detectPortConflicts([...declared, ...observedBindings]);
        if (scopeHost) conflicts = conflicts.filter((c) => c.host === scopeHost);

        // Name the services rather than making a human resolve node ids by hand.
        const nameOf = new Map(services.map((n) => [n.id, n.name]));
        const rows = conflicts.map((c) => ({
          ...c,
          host_name:
            hosts.find((n) => n.id === c.host)?.name ?? c.host,
          claimant_names: c.claimants.map((id) => nameOf.get(id) ?? id),
        }));

        return {
          status: "ok",
          declared_bindings: declared.length,
          observed_bindings: observedBindings.length,
          conflict_count: rows.length,
          conflicts: rows,
          ...(unresolved.size > 0
            ? {
                unresolved_hosts: [...unresolved].sort(),
                warning:
                  `${unresolved.size} observed binding host(s) are not registered and were NOT checked: ` +
                  `${[...unresolved].sort().join(", ")}. Register them with register_host — until then ` +
                  `a collision on those machines cannot be seen from here.`,
              }
            : {}),
          teaching:
            // The clean bill of health is withheld whenever something went
            // unchecked. "No slot is claimed twice" over a host nobody resolved
            // is the reassurance that costs an outage.
            unresolved.size > 0
              ? "Some claims could not be placed on a known host. This answer is incomplete, and incomplete is not clean."
              : conflicts.length === 0
                ? "No slot is claimed twice. This is the answer before provisioning, not the table read after the outage."
                : "A collision found before the second tenant is provisioned costs a conversation. Found after, it costs an outage.",
        };
      } catch (error) {
        return errorOf(error, "detect port conflicts");
      }
    },
  },

  // ── hold_metis ────────────────────────────────────────────────────────────
  {
    name: "hold_metis",
    description:
      "Attach tacit operator knowledge to a registered host, tenant or service — the 'restart it " +
      "twice', the load-bearing BSSID lock, the credential path everyone just knows. `held_by` " +
      "names a person on purpose: invisible work is surfaced WITH its carrier, never anonymised " +
      "into the schema. This is the tool whose whole reason to exist is keeping the four-directions " +
      "grid from flattening what a person knows. Appends to what is already held; never replaces it.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The registered host / tenant / service node" },
        held_by: {
          type: "string",
          description:
            "Who carries this know-how. A person's name — accountability, not anonymisation.",
        },
        exceptions: {
          type: "array",
          items: { type: "string" },
          description: "'compose stop, never down — down drops the volumes'",
        },
        invisible_work: {
          type: "array",
          items: { type: "string" },
          description: "'BELL917 BSSID lock is load-bearing — do not remove'",
        },
        notes: {
          type: "array",
          items: { type: "string" },
          description: "credential paths, ordering lore, the unwritten",
        },
      },
      required: ["node_id", "held_by"],
    },
    handler: async (args) => {
      try {
        const { node_id, held_by, exceptions = [], invisible_work = [], notes = [] } = args;

        if (exceptions.length === 0 && invisible_work.length === 0 && notes.length === 0) {
          return {
            status: "error",
            message:
              "Nothing to hold. Naming a carrier without naming what they carry records a person " +
              "and forgets their knowledge — the exact inversion this tool exists to prevent.",
          };
        }

        // An empty carrier passes every other check while anonymising the work.
        if (typeof held_by !== "string" || held_by.trim().length === 0) {
          return {
            status: "error",
            message:
              "`held_by` must name a person. An empty carrier records the knowledge and erases who " +
              "holds it, which is the anonymisation this field exists to refuse.",
          };
        }

        const node = (await store.getNode(node_id)) as InfraNode | undefined;
        if (!node) return { status: "not_found", message: `No node ${node_id}` };

        const kind = node.metadata?.kind;
        if (kind !== "host" && kind !== "tenant" && kind !== "service") {
          return {
            status: "error",
            message: `Node ${node_id} is not infrastructure (metadata.kind=${JSON.stringify(kind)}).`,
          };
        }

        const facet = { ...(node.metadata?.facet as Record<string, unknown>) };
        const prior = (facet.metis ?? {}) as MetisHold;

        // Appended, never replaced. A second operator's knowledge does not
        // overwrite the first's, and heldBy accumulates rather than reassigning
        // authorship of what someone else wrote down.
        const priorHeld = prior.heldBy ? prior.heldBy.split(", ") : [];
        const heldBy = [...new Set([...priorHeld, held_by.trim()])].join(", ");

        const merged: MetisHold = {
          ...(prior.exceptions || exceptions.length
            ? { exceptions: [...new Set([...(prior.exceptions ?? []), ...exceptions])] }
            : {}),
          ...(prior.invisibleWork || invisible_work.length
            ? { invisibleWork: [...new Set([...(prior.invisibleWork ?? []), ...invisible_work])] }
            : {}),
          ...(prior.notes || notes.length
            ? { notes: [...new Set([...(prior.notes ?? []), ...notes])] }
            : {}),
          heldBy,
        };

        const parsedMetis = MetisHoldSchema.safeParse(merged);
        if (!parsedMetis.success) return invalid("metis", parsedMetis.error);

        facet.metis = parsedMetis.data;

        const schema =
          kind === "host" ? HostFacetSchema : kind === "tenant" ? TenantFacetSchema : ServiceFacetSchema;
        const parsed = schema.safeParse(facet);
        if (!parsed.success) return invalid(kind, parsed.error);

        const updated: InfraNode = {
          ...node,
          metadata: { ...node.metadata, facet: parsed.data },
          updated_at: new Date().toISOString(),
        };
        await store.createNode(updated as never);

        return {
          status: "held",
          node_id,
          kind,
          metis: parsedMetis.data,
          held_by: heldBy,
          message: `Métis held on ${node.name}, carried by ${heldBy}`,
          teaching:
            "The four-directions ontology is an imposed legibility grid. A grid that becomes the only " +
            "sanctioned way to describe a system erases the métis. This is where it does not.",
        };
      } catch (error) {
        return errorOf(error, "hold métis");
      }
    },
  },

  // ── reconcile_infra_state ─────────────────────────────────────────────────
  {
    name: "reconcile_infra_state",
    description:
      "Compare what the wheel declares against what was observed on a host, right now. " +
      "Level-triggered: it remembers no transitions, so `converged` cannot age into a lie — the " +
      "outage this answers (jgwill/gaia#74) was caused not by a missing fact but by a fact that " +
      "HAD been true. Four drift states: converged, drifted, unrealized (declared, not running), " +
      "and undeclared (running and nobody wrote it down — the service somebody started by hand " +
      "that holds the port the next tenant is about to be given). Port conflicts over declared ∪ " +
      "observed are folded in. Métis is never counted as drift.",
    inputSchema: {
      type: "object",
      properties: {
        observed_by: {
          type: "string",
          description: "Host node id or hostname this reading was taken on. Required — an observation with no reader is a rumour.",
        },
        observed_at: {
          type: "string",
          description: "ISO 8601 timestamp of the reading. Required, for the same reason.",
        },
        services: {
          type: "array",
          description:
            "Services read live from the machine, as ServiceFacet shapes: " +
            "{ nodeId, unit, scope, ownedBy, ports:[{port,proto?,host,boundBy}], workingDirectory?, execStop? }",
          items: { type: "object" },
        },
        host: {
          type: "string",
          description: "Restrict the declared side to one host — node id or hostname (optional)",
        },
        now: {
          type: "string",
          description:
            "ISO 8601 'now', to compute how old the reading is. Defaults to the server clock; pass " +
            "it explicitly when you need the answer to be reproducible.",
        },
      },
      required: ["observed_by", "observed_at", "services"],
    },
    handler: async (args) => {
      try {
        const { observed_by, observed_at, services = [], host, now } = args;

        const hosts = await loadInfraNodes("host");
        const resolveHost = makeHostResolver(hosts);

        const observer = resolveHost(observed_by);
        if (!observer || "unresolved" in observer) {
          return {
            status: "not_found",
            message:
              `No registered host '${observed_by}'. A reading has to be attributable to a machine ` +
              `the wheel knows, or the drift it reports cannot be placed anywhere.`,
          };
        }

        let scopeHost: string | undefined;
        if (host) {
          const target = resolveHost(host);
          if (!target || "unresolved" in target) {
            return { status: "not_found", message: `No registered host '${host}'` };
          }
          scopeHost = target.id;
        }

        const unresolved = new Set<string>();
        const resolveOrRecord = (h: string): string => {
          const target = resolveHost(h);
          if (!target || "unresolved" in target) {
            unresolved.add(h);
            return h;
          }
          return target.id;
        };

        let declaredNodes = await loadInfraNodes("service");
        if (scopeHost) {
          const tenants = await loadInfraNodes("tenant");
          const onHost = new Set(
            tenants
              .filter((t) => (t.metadata?.facet as TenantFacet | undefined)?.onHost === scopeHost)
              .map((t) => t.id),
          );
          // Containment UNION port-locality. A service owned by a tenant on eury
          // may legitimately claim a slot on gaia — `register_service` allows it.
          // Scoping by containment alone made that claim invisible in gaia's own
          // slot map, which is the one place "ports are scarce per host" has to
          // hold.
          declaredNodes = declaredNodes.filter((s) => {
            const facet = s.metadata?.facet as ServiceFacet | undefined;
            return (
              onHost.has(facet?.ownedBy ?? "") ||
              (facet?.ports ?? []).some((p) => p.host === scopeHost)
            );
          });
        }
        const declared = declaredNodes
          .map((n) => n.metadata?.facet as ServiceFacet | undefined)
          .filter((f): f is ServiceFacet => f !== undefined);

        // A live reader knows units, not the ids the wheel minted. Matching on
        // nodeId alone reported every correctly-running declared service as BOTH
        // `unrealized` and `undeclared`, plus a phantom conflict against itself.
        const declaredByUnit = new Map(declared.map((f) => [`${f.unit}@${f.ownedBy}`, f]));
        const declaredById = new Set(declared.map((f) => f.nodeId));
        const rekeyed: { observed: string; matched: string; by: string }[] = [];

        const observedServices = (services as ServiceFacet[]).map((s) => {
          let nodeId = s.nodeId;
          if (!declaredById.has(nodeId)) {
            const match =
              declaredByUnit.get(`${s.unit}@${s.ownedBy}`) ??
              declared.find((f) => f.unit === s.unit);
            if (match) {
              rekeyed.push({ observed: s.nodeId, matched: match.nodeId, by: s.unit });
              nodeId = match.nodeId;
            }
          }
          return {
            ...s,
            nodeId,
            ports: (s.ports ?? []).map((p) => ({
              ...p,
              host: resolveOrRecord(p.host),
              boundBy: p.boundBy === s.nodeId ? nodeId : p.boundBy,
            })),
          };
        });

        const parsed = ObservedStateSchema.safeParse({
          observedBy: observer.id,
          observedAt: observed_at,
          services: observedServices,
        });
        if (!parsed.success) return invalid("observed state", parsed.error);

        const result = reconcile(declared, parsed.data as never, {
          now: now ?? new Date().toISOString(),
        });

        const nameOf = new Map(declaredNodes.map((n) => [n.id, n.name]));

        return {
          status: "ok",
          ...result,
          rows: result.rows.map((r) => ({ ...r, name: nameOf.get(r.nodeId) ?? r.unit })),
          declared_count: declared.length,
          observed_count: parsed.data.services.length,
          // Matching by unit is an inference, so it is reported rather than
          // performed silently. A reader who disagrees can pass real node ids.
          ...(rekeyed.length > 0 ? { matched_by_unit: rekeyed } : {}),
          ...(unresolved.size > 0
            ? {
                unresolved_hosts: [...unresolved].sort(),
                warning:
                  `Observed port claims name host(s) the wheel does not know: ` +
                  `${[...unresolved].sort().join(", ")}. Those claims were kept in the comparison but ` +
                  `cannot collide with anything registered.`,
              }
            : {}),
          teaching:
            result.summary.undeclared > 0
              ? "Something is running that nobody wrote down. That is the row worth reading first."
              : result.converged
                ? "Declared and observed agree, as of this reading — and only as of this reading."
                : "Drift is not failure. It is the distance between what was intended and what is, said out loud.",
        };
      } catch (error) {
        return errorOf(error, "reconcile infrastructure state");
      }
    },
  },

  // ── list_infra_topology ───────────────────────────────────────────────────
  {
    name: "list_infra_topology",
    description:
      "The whole registered infrastructure as one traversal — hosts, the tenants upon them, the " +
      "services those tenants own, and the ports those services claim — with port conflicts and " +
      "every held métis surfaced. This is the read side of registration: registering " +
      "infrastructure you cannot walk back out of is not registration. Scope to one host with " +
      "`host`, or ask a single question with `perspective`.",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "Restrict to one host — node id or hostname" },
        perspective: {
          type: "string",
          enum: ["host", "tenant", "service", "port", "metis"],
          description:
            "Which reading to return. 'host' (default) nests tenants and services under machines. " +
            "'port' returns the slot map. 'metis' returns only what people hold, with carriers.",
        },
      },
    },
    handler: async (args) => {
      try {
        const { host, perspective = "host" } = args;

        const hosts = await loadInfraNodes("host");
        const tenants = await loadInfraNodes("tenant");
        const services = await loadInfraNodes("service");

        const facetOf = <T>(n: InfraNode) => n.metadata?.facet as T;

        let wanted: string | undefined;
        if (host) {
          const target = makeHostResolver(hosts)(host);
          if (!target || "unresolved" in target) {
            return { status: "not_found", message: `No registered host '${host}'` };
          }
          wanted = target.id;
        }

        const visibleHosts = wanted ? hosts.filter((h) => h.id === wanted) : hosts;
        const visibleHostIds = new Set(visibleHosts.map((h) => h.id));
        const visibleTenants = tenants.filter((t) =>
          visibleHostIds.has(facetOf<TenantFacet>(t)?.onHost),
        );
        const visibleTenantIds = new Set(visibleTenants.map((t) => t.id));
        // Containment UNION port-locality: a service owned elsewhere that claims
        // a slot on this host belongs in this host's reading. Scoping by
        // containment alone hid exactly the claims that cross a tenancy
        // boundary — from the machine whose slot they occupy.
        const visibleServices = services.filter((s) => {
          const facet = facetOf<ServiceFacet>(s);
          return (
            visibleTenantIds.has(facet?.ownedBy) ||
            (wanted !== undefined && (facet?.ports ?? []).some((p) => p.host === wanted))
          );
        });

        const allBindings = visibleServices
          .flatMap((s) => facetOf<ServiceFacet>(s)?.ports ?? [])
          // In a host-scoped reading, a co-owned service's claims on OTHER hosts
          // are not this host's slots.
          .filter((b) => wanted === undefined || b.host === wanted);
        const conflicts = detectPortConflicts(allBindings);

        const metisRows = [...visibleHosts, ...visibleTenants, ...visibleServices]
          .map((n) => ({
            node_id: n.id,
            name: n.name,
            kind: n.metadata?.kind,
            metis: facetOf<{ metis?: MetisHold }>(n)?.metis,
          }))
          .filter((r) => r.metis !== undefined);

        const base = {
          status: "ok",
          perspective,
          counts: {
            hosts: visibleHosts.length,
            tenants: visibleTenants.length,
            services: visibleServices.length,
            port_bindings: allBindings.length,
            conflicts: conflicts.length,
            metis_held: metisRows.length,
          },
          conflicts,
        };

        if (perspective === "metis") {
          return {
            ...base,
            metis: metisRows,
            teaching:
              metisRows.length === 0
                ? "Nothing is held yet. An infrastructure with no métis recorded is not an infrastructure without tacit knowledge — it is one whose tacit knowledge is undocumented."
                : "Every row names its carrier. That is the point.",
          };
        }

        if (perspective === "port") {
          const rows = allBindings
            .map((b) => {
              const owner = services.find((s) => s.id === b.boundBy);
              return {
                host: b.host,
                host_name: hosts.find((h) => h.id === b.host)?.name ?? b.host,
                port: b.port,
                proto: b.proto ?? "tcp",
                bound_by: b.boundBy,
                service: owner?.name ?? b.boundBy,
                contested: conflicts.some(
                  (c) => c.host === b.host && c.port === b.port && c.proto === (b.proto ?? "tcp"),
                ),
                // Carried here too. The slot map is where "restart it twice"
                // matters most, and it was the one perspective that dropped it.
                metis: owner ? facetOf<ServiceFacet>(owner)?.metis : undefined,
              };
            })
            .sort(
              (a, b) =>
                a.host_name.localeCompare(b.host_name) ||
                a.proto.localeCompare(b.proto) ||
                a.port - b.port,
            );
          return { ...base, ports: rows, teaching: "Ports are scarce per host, not globally." };
        }

        if (perspective === "tenant") {
          return {
            ...base,
            tenants: visibleTenants.map((t) => {
              const f = facetOf<TenantFacet>(t);
              return {
                node_id: t.id,
                account: f?.account,
                on_host: f?.onHost,
                linger: f?.linger,
                linger_is_not_consent: true,
                services: visibleServices
                  .filter((s) => facetOf<ServiceFacet>(s)?.ownedBy === t.id)
                  .map((s) => ({ node_id: s.id, unit: s.name })),
                metis: f?.metis,
              };
            }),
            teaching: "An account is a being, not a namespace. South: its readiness is a precondition.",
          };
        }

        if (perspective === "service") {
          return {
            ...base,
            services: visibleServices.map((s) => {
              const f = facetOf<ServiceFacet>(s);
              return {
                node_id: s.id,
                unit: f?.unit,
                scope: f?.scope,
                owned_by: f?.ownedBy,
                ports: f?.ports,
                working_directory: f?.workingDirectory,
                exec_stop: f?.execStop,
                url: s.metadata?.url,
                metis: f?.metis,
              };
            }),
            teaching: "A service is West — the thing that executes.",
          };
        }

        return {
          ...base,
          hosts: visibleHosts.map((h) => {
            const hf = facetOf<HostFacet>(h);
            return {
              node_id: h.id,
              hostname: hf?.hostname,
              fqdn: hf?.fqdn,
              os: hf?.os,
              reachable_via: hf?.reachableVia,
              metis: hf?.metis,
              tenants: visibleTenants
                .filter((t) => facetOf<TenantFacet>(t)?.onHost === h.id)
                .map((t) => {
                  const tf = facetOf<TenantFacet>(t);
                  return {
                    node_id: t.id,
                    account: tf?.account,
                    linger: tf?.linger,
                    metis: tf?.metis,
                    services: visibleServices
                      .filter((s) => facetOf<ServiceFacet>(s)?.ownedBy === t.id)
                      .map((s) => {
                        const sf = facetOf<ServiceFacet>(s);
                        return {
                          node_id: s.id,
                          unit: sf?.unit,
                          scope: sf?.scope,
                          ports: sf?.ports?.map((p) => `${p.port}/${p.proto ?? "tcp"}`),
                          url: s.metadata?.url,
                          metis: sf?.metis,
                        };
                      }),
                  };
                }),
            };
          }),
          teaching:
            "Host, tenant, service — land, human, knowledge. The same six node types that hold a ceremony hold a machine.",
        };
      } catch (error) {
        return errorOf(error, "list infrastructure topology");
      }
    },
  },
];
