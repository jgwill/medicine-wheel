/**
 * Facet types for @medicine-wheel/infra.
 *
 * A facet **annotates an existing `RelationalNode` by id** — it never re-declares
 * one. Each facet gives a typed home to the machine specifics (`port`, `unit`,
 * `linger`) that today leak into `metadata: Record<string, unknown>`.
 *
 * A facet inherits `direction` from the node it annotates and never re-encodes it.
 * `ontology-core`'s closed `NodeType` union stays untouched: infra entities reuse
 * the existing values via {@link FACET_NODE_TYPES}.
 *
 * Spec: /opt/eury/rispecs/foundations/02-specifications.md §S1, §S5.
 */

import type { NodeType, RelationalNode } from '@medicine-wheel/ontology-core';

/** The id of the `RelationalNode` a facet annotates. */
export type NodeId = RelationalNode['id'];

// ── Métis (S5) ──────────────────────────────────────────────────────────────

/**
 * The tacit operator knowledge a legibility grid must **hold** rather than
 * flatten. The four-directions ontology is an imposed grid; a grid that becomes
 * the only sanctioned way to describe a system erases the "you have to restart
 * it twice" and the "don't remove the BSSID lock" that kept it alive.
 *
 * Optional on every facet, on principle — infrastructure studies exists to
 * surface invisible work, not standardise it away.
 */
export interface MetisHold {
  /** 'restart twice; first start races the mount' */
  exceptions?: string[];
  /** 'BELL917 BSSID lock is load-bearing — do not remove' */
  invisibleWork?: string[];
  /** credential paths, ordering lore, the unwritten */
  notes?: string[];
  /** who carries this know-how — accountability, not anonymised */
  heldBy?: string;
}

// ── Enumerations ────────────────────────────────────────────────────────────

/**
 * Whether a tenant's user units survive logout.
 *
 * A machine fact read at runtime — a checkbox with no authority and no ability
 * to withdraw. It is deliberately **not** a consent state: the human
 * authorization to run the root step that sets it is a `ConsentRecord` in
 * `@medicine-wheel/consent-lifecycle`, and the two are never collapsed. The
 * structured `Precondition` that references both arrives in `0.2.0` (§S4).
 */
export type LingerState = 'enabled' | 'disabled' | 'unknown';

/** How a host can be reached. */
export type Reachability = 'lan' | 'tailnet' | 'cloudflare' | 'ngrok';

/** Transport of a port binding. Absent means {@link DEFAULT_PORT_PROTO}. */
export type PortProto = 'tcp' | 'udp';

/** systemd manager a unit belongs to. */
export type ServiceScope = 'user' | 'system';

/** The proto a `PortBinding` is read as when it declares none. */
export const DEFAULT_PORT_PROTO: PortProto = 'tcp';

// ── Facets (S1) ─────────────────────────────────────────────────────────────

/** A machine. Annotates a `RelationalNode` of type `'land'`. */
export interface HostFacet {
  /** → `RelationalNode.id` (type: `'land'`) */
  nodeId: NodeId;
  /** 'gaia' | 'eury' */
  hostname: string;
  fqdn?: string;
  os?: string;
  reachableVia?: Reachability[];
  metis?: MetisHold;
}

/**
 * A unix account. Annotates a `RelationalNode` of type `'human'` — an account is
 * a being, not a namespace.
 */
export interface TenantFacet {
  /** → `RelationalNode.id` (type: `'human'`) */
  nodeId: NodeId;
  /** unix user: 'gmusic' | 'ava' */
  account: string;
  uid?: number;
  home?: string;
  /** → `HostFacet.nodeId` */
  onHost: NodeId;
  /** consent *precondition*, not consent — see {@link LingerState} */
  linger: LingerState;
  metis?: MetisHold;
}

/**
 * A systemd unit. Annotates a `RelationalNode` of type `'knowledge'` — West
 * (the thing that executes) made typed.
 */
export interface ServiceFacet {
  /** → `RelationalNode.id` (type: `'knowledge'`) */
  nodeId: NodeId;
  /** 'assembly-mux.service' */
  unit: string;
  scope: ServiceScope;
  /** → `TenantFacet.nodeId` */
  ownedBy: NodeId;
  ports: PortBinding[];
  /** the docker-zulip `.env`-is-read-from-cwd finding (jgwill/gaia#74) */
  workingDirectory?: string;
  /** 'compose stop', never 'compose down' (jgwill/gaia#74) */
  execStop?: string;
  metis?: MetisHold;
}

/**
 * A service's claim on a port. South, structurally: a precondition that must
 * hold before West runs. Ports are scarce **per host**, which is why `host` is
 * part of the identity of a binding and not an annotation on it.
 */
export interface PortBinding {
  port: number;
  proto?: PortProto;
  /** → `HostFacet.nodeId` */
  host: NodeId;
  /** → `ServiceFacet.nodeId` */
  boundBy: NodeId;
}

// ── Conflicts (S3) ──────────────────────────────────────────────────────────

/** One port on one host claimed by more than one service. */
export interface PortConflict {
  /** → `HostFacet.nodeId` */
  host: NodeId;
  port: number;
  /**
   * The transport the claimants collide on.
   *
   * Addition to the §S3 shape, which names only `host`/`port`/`claimants`.
   * Without it, a host colliding on both tcp/53 and udp/53 returns two rows
   * that cannot be told apart. Always concrete — an absent
   * `PortBinding.proto` is normalised to {@link DEFAULT_PORT_PROTO}.
   */
  proto: PortProto;
  /** `ServiceFacet.nodeId[]` competing for it — distinct, sorted */
  claimants: NodeId[];
}

// ── Node-type binding ───────────────────────────────────────────────────────

/**
 * Which closed `NodeType` each facet annotates.
 *
 * Typed against `ontology-core`'s union on purpose: if that union ever changes
 * shape, `infra` fails to compile here rather than drifting silently. This is
 * the whole reason the dependency is load-bearing rather than decorative — no
 * `NodeType` is widened, the existing values are reused.
 */
export const FACET_NODE_TYPES = {
  host: 'land',
  tenant: 'human',
  service: 'knowledge',
} as const satisfies Record<string, NodeType>;

/** `'host' | 'tenant' | 'service'` */
export type FacetKind = keyof typeof FACET_NODE_TYPES;
