/**
 * jgwill/gaia#75, turned from a table into a test.
 *
 * The issue states in prose: *":443, :9081, :4444, :9000, :3777 are all claimed
 * by `gmusic` on this box. Every one needs a second binding."* Today that is a
 * paragraph a human reads and remembers. Here it is the fixture, and
 * `detectPortConflicts` returns the collision as rows **before** the second
 * tenant (`ava` / sanctuaireagentique.com) is provisioned.
 *
 * Spec: /opt/eury/rispecs/foundations/02-specifications.md §S1, §S3, §S5.
 */

import { describe, expect, it } from "vitest";

import { detectPortConflicts } from "../src/infra/src/ports";
import {
  HostFacetSchema,
  PortBindingSchema,
  ServiceFacetSchema,
  TenantFacetSchema,
} from "../src/infra/src/schemas";
import { FACET_NODE_TYPES } from "../src/infra/src/types";
import type {
  HostFacet,
  PortBinding,
  ServiceFacet,
  TenantFacet,
} from "../src/infra/src/types";

// ── The box, as gaia#75 found it ────────────────────────────────────────────

const EURY = "node:land:eury";
const GAIA = "node:land:gaia";
const GMUSIC = "node:human:gmusic";
const AVA = "node:human:ava";

const eury: HostFacet = {
  nodeId: EURY,
  hostname: "eury",
  reachableVia: ["tailnet", "cloudflare"],
};

const gmusic: TenantFacet = {
  nodeId: GMUSIC,
  account: "gmusic",
  home: "/home/gmusic",
  onHost: EURY,
  linger: "enabled",
};

/** gaia#75: `loginctl show-user ava` → not logged in or lingering. */
const ava: TenantFacet = {
  nodeId: AVA,
  account: "ava",
  uid: 1212,
  home: "/home/ava",
  onHost: EURY,
  linger: "disabled",
};

function service(
  unit: string,
  ownedBy: string,
  ports: number[],
  extra: Partial<ServiceFacet> = {},
): ServiceFacet {
  const nodeId = `node:knowledge:${ownedBy.split(":").pop()}:${unit}`;
  return {
    nodeId,
    unit,
    scope: "user",
    ownedBy,
    ports: ports.map((port) => ({ port, host: EURY, boundBy: nodeId })),
    ...extra,
  };
}

/** `assembly-stack.target` as installed by `21-gmusicassembly-autostart.sh`. */
const gmusicStack: ServiceFacet[] = [
  service("assembly-zulip.service", GMUSIC, [443], {
    // gaia#74: docker compose reads .env from the working directory
    workingDirectory: "/home/gmusic/salix/production/docker-zulip",
    execStop: "docker compose stop",
    metis: {
      exceptions: ["compose stop, never down — down drops the volumes"],
      heldBy: "William",
    },
  }),
  service("assembly-mux.service", GMUSIC, [9081]),
  service("assembly-cloudflared.service", GMUSIC, []),
  service("assembly-voice.service", GMUSIC, [4444]),
  service("assembly-dashboard.service", GMUSIC, [9000]),
  service("voice-bridge.service", GMUSIC, [3777]),
];

/** The same installer, copied for the second sanctuary without re-allocating. */
const avaStack: ServiceFacet[] = [
  service("assembly-zulip.service", AVA, [443]),
  service("assembly-mux.service", AVA, [9081]),
  service("assembly-cloudflared.service", AVA, []),
  service("assembly-voice.service", AVA, [4444]),
  service("assembly-dashboard.service", AVA, [9000]),
  service("voice-bridge.service", AVA, [3777]),
];

const flatten = (services: ServiceFacet[]): PortBinding[] =>
  services.flatMap((s) => s.ports);

// ── The headline ────────────────────────────────────────────────────────────

describe("gaia#75 — the gmusic/ava port collision", () => {
  it("returns every claimed port as a row before ava is provisioned", () => {
    const conflicts = detectPortConflicts([
      ...flatten(gmusicStack),
      ...flatten(avaStack),
    ]);

    expect(conflicts.map((c) => c.port)).toEqual([443, 3777, 4444, 9000, 9081]);
    expect(conflicts).toHaveLength(5);

    for (const conflict of conflicts) {
      expect(conflict.host).toBe(EURY);
      expect(conflict.proto).toBe("tcp");
      expect(conflict.claimants).toHaveLength(2);
      expect(conflict.claimants.some((c) => c.includes("gmusic"))).toBe(true);
      expect(conflict.claimants.some((c) => c.includes("ava"))).toBe(true);
    }
  });

  it("finds nothing wrong with gmusic's stack alone — the tension arrives with the second tenant", () => {
    expect(detectPortConflicts(flatten(gmusicStack))).toEqual([]);
  });

  it("leaves the portless services out of it", () => {
    const conflicts = detectPortConflicts([
      ...flatten(gmusicStack),
      ...flatten(avaStack),
    ]);
    const claimants = conflicts.flatMap((c) => c.claimants);
    expect(claimants.some((c) => c.includes("cloudflared"))).toBe(false);
  });
});

// ── The properties that make declared ∪ observed safe ───────────────────────

describe("detectPortConflicts", () => {
  it("does not mistake one service seen twice for two services", () => {
    // eury DECLARES assembly-mux on :9081; gaia OBSERVES it there. One claim.
    const declared: PortBinding = {
      port: 9081,
      host: EURY,
      boundBy: "node:knowledge:gmusic:assembly-mux.service",
    };
    const observed: PortBinding = { ...declared, proto: "tcp" };

    expect(detectPortConflicts([declared, observed])).toEqual([]);
  });

  it("treats ports as scarce per host, not globally", () => {
    expect(
      detectPortConflicts([
        { port: 4444, host: EURY, boundBy: "svc:a" },
        { port: 4444, host: GAIA, boundBy: "svc:b" },
      ]),
    ).toEqual([]);
  });

  it("does not collide tcp with udp on the same number", () => {
    expect(
      detectPortConflicts([
        { port: 53, proto: "tcp", host: EURY, boundBy: "svc:a" },
        { port: 53, proto: "udp", host: EURY, boundBy: "svc:b" },
      ]),
    ).toEqual([]);
  });

  it("reads an absent proto as tcp, so shorthand and longhand still collide", () => {
    const conflicts = detectPortConflicts([
      { port: 443, host: EURY, boundBy: "svc:a" },
      { port: 443, proto: "tcp", host: EURY, boundBy: "svc:b" },
    ]);

    expect(conflicts).toEqual([
      { host: EURY, port: 443, proto: "tcp", claimants: ["svc:a", "svc:b"] },
    ]);
  });

  it("reports all claimants when more than two compete", () => {
    const conflicts = detectPortConflicts([
      { port: 9000, host: EURY, boundBy: "svc:c" },
      { port: 9000, host: EURY, boundBy: "svc:a" },
      { port: 9000, host: EURY, boundBy: "svc:b" },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].claimants).toEqual(["svc:a", "svc:b", "svc:c"]);
  });

  it("returns nothing for no bindings", () => {
    expect(detectPortConflicts([])).toEqual([]);
  });
});

// ── The boundary between emitter and consumer ───────────────────────────────

describe("schemas — validating an emitted manifest before trusting it", () => {
  it("accepts the facets gaia would emit", () => {
    expect(HostFacetSchema.safeParse(eury).success).toBe(true);
    expect(TenantFacetSchema.safeParse(gmusic).success).toBe(true);
    expect(TenantFacetSchema.safeParse(ava).success).toBe(true);
    for (const svc of gmusicStack) {
      expect(ServiceFacetSchema.safeParse(svc).success).toBe(true);
    }
  });

  it("rejects a misparsed port, which would otherwise never collide with anything", () => {
    for (const port of [0, 65536, 8080.5]) {
      const parsed = PortBindingSchema.safeParse({
        port,
        host: EURY,
        boundBy: "svc:a",
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("rejects a tenant with no linger state — the precondition is not optional", () => {
    const { linger: _linger, ...withoutLinger } = gmusic;
    expect(TenantFacetSchema.safeParse(withoutLinger).success).toBe(false);
  });

  it("holds the métis it was given rather than flattening it", () => {
    const zulip = gmusicStack[0];
    expect(zulip.metis?.exceptions).toContain(
      "compose stop, never down — down drops the volumes",
    );
    expect(zulip.metis?.heldBy).toBe("William");
    expect(ServiceFacetSchema.safeParse(zulip).success).toBe(true);
  });
});

// ── The promise that no published package changed ───────────────────────────

describe("node-type binding", () => {
  it("reuses ontology-core's closed NodeType values instead of widening them", () => {
    expect(FACET_NODE_TYPES).toEqual({
      host: "land",
      tenant: "human",
      service: "knowledge",
    });
  });
});
