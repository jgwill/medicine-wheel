/**
 * §S6 — level-triggered reconciliation.
 *
 * jgwill/gaia#74 was not caused by a missing fact. It was caused by a fact that
 * HAD been true. So the pins here are about the shape of the answer, not about
 * whether a comparison works: that `undeclared` is reachable at all, that métis
 * never counts as drift, that the same inputs give the same bytes twice.
 */

import { describe, expect, it } from "vitest";

import { DRIFT_STATES, reconcile } from "../src/infra/src/reconcile";
import type { ObservedState } from "../src/infra/src/reconcile";
import { ObservedStateSchema } from "../src/infra/src/schemas";
import type { ServiceFacet } from "../src/infra/src/types";

const EURY = "node:land:eury";
const AVA = "node:human:ava";

function svc(id: string, unit: string, overrides: Partial<ServiceFacet> = {}): ServiceFacet {
  return {
    nodeId: id,
    unit,
    scope: "user",
    ownedBy: AVA,
    ports: [{ port: 9081, proto: "tcp", host: EURY, boundBy: id }],
    ...overrides,
  };
}

function observed(services: ServiceFacet[]): ObservedState {
  return { observedBy: EURY, observedAt: "2026-08-05T12:00:00Z", services };
}

describe("reconcile — the four drift states", () => {
  it("converges when both sides agree", () => {
    const s = svc("node:knowledge:a", "a.service");
    const result = reconcile([s], observed([s]));
    expect(result.summary).toEqual({ converged: 1, drifted: 0, unrealized: 0, undeclared: 0 });
    expect(result.converged).toBe(true);
  });

  it("reports 'unrealized' for something declared and not running", () => {
    const result = reconcile([svc("node:knowledge:a", "a.service")], observed([]));
    expect(result.rows[0].state).toBe("unrealized");
    expect(result.converged).toBe(false);
  });

  it("reports 'undeclared' for something running that nobody wrote down", () => {
    // The row worth reading first: this is the service holding the port the next
    // tenant is about to be given.
    const result = reconcile([], observed([svc("node:knowledge:ghost", "ghost.service")]));
    expect(result.rows[0].state).toBe("undeclared");
    expect(result.rows[0].unit).toBe("ghost.service");
  });

  it("names the differing fields when both sides exist and disagree", () => {
    const declared = svc("node:knowledge:a", "a.service", { execStop: "docker compose stop" });
    const live = svc("node:knowledge:a", "a.service", { execStop: "docker compose down" });
    const result = reconcile([declared], observed([live]));

    expect(result.rows[0].state).toBe("drifted");
    const diff = result.rows[0].differences?.find(d => d.field === "execStop");
    expect(diff).toEqual({ field: "execStop", declared: "docker compose stop", observed: "docker compose down" });
  });

  it("treats a differing port set as drift", () => {
    const declared = svc("node:knowledge:a", "a.service");
    const live = svc("node:knowledge:a", "a.service", {
      ports: [{ port: 9999, proto: "tcp", host: EURY, boundBy: "node:knowledge:a" }],
    });
    expect(reconcile([declared], observed([live])).rows[0].differences?.some(d => d.field === "ports")).toBe(true);
  });

  it("does not treat port ORDER as drift", () => {
    const id = "node:knowledge:a";
    const declared = svc(id, "a.service", {
      ports: [
        { port: 80, proto: "tcp", host: EURY, boundBy: id },
        { port: 443, proto: "tcp", host: EURY, boundBy: id },
      ],
    });
    const live = svc(id, "a.service", {
      ports: [
        { port: 443, proto: "tcp", host: EURY, boundBy: id },
        { port: 80, proto: "tcp", host: EURY, boundBy: id },
      ],
    });
    expect(reconcile([declared], observed([live])).rows[0].state).toBe("converged");
  });

  it("reads an absent proto as tcp on both sides rather than as drift", () => {
    const id = "node:knowledge:a";
    const declared = svc(id, "a.service", { ports: [{ port: 80, host: EURY, boundBy: id }] });
    const live = svc(id, "a.service", { ports: [{ port: 80, proto: "tcp", host: EURY, boundBy: id }] });
    expect(reconcile([declared], observed([live])).rows[0].state).toBe("converged");
  });
});

describe("reconcile — what it refuses to flatten", () => {
  it("never counts métis as a difference", () => {
    // Two sides holding different tacit notes is two people knowing different
    // things, not a discrepancy to resolve.
    const declared = svc("node:knowledge:a", "a.service", { metis: { heldBy: "William", notes: ["ask before restarting"] } });
    const live = svc("node:knowledge:a", "a.service", { metis: { heldBy: "gaia-agent" } });
    const result = reconcile([declared], observed([live]));

    expect(result.rows[0].state).toBe("converged");
    expect(result.rows[0].differences).toBeUndefined();
  });

  it("keeps BOTH sides' métis when both hold some", () => {
    // The erasure this pins: keeping only the declared side deletes the
    // observing agent's note, and merging the two concatenates two people into
    // one heldBy and loses attribution. Both are the same loss in different
    // shapes, so the row carries an array and merges nothing.
    const declared = svc("node:knowledge:a", "a.service", {
      metis: { heldBy: "William", notes: ["ask before restarting"] },
    });
    const live = svc("node:knowledge:a", "a.service", {
      metis: { heldBy: "gaia-agent", invisibleWork: ["BSSID lock is load-bearing"] },
    });

    const metis = reconcile([declared], observed([live])).rows[0].metis;
    expect(metis).toHaveLength(2);
    expect(metis?.map(m => m.heldBy)).toEqual(["William", "gaia-agent"]);
    expect(metis?.[1].invisibleWork).toEqual(["BSSID lock is load-bearing"]);
  });

  it("carries métis through onto the row", () => {
    const declared = svc("node:knowledge:a", "a.service", { metis: { heldBy: "William" } });
    expect(reconcile([declared], observed([])).rows[0].metis?.[0].heldBy).toBe("William");
  });

  it("surfaces métis from the observed side when only that side holds it", () => {
    const live = svc("node:knowledge:ghost", "ghost.service", { metis: { notes: ["started by hand"] } });
    expect(reconcile([], observed([live])).rows[0].metis?.[0].notes).toEqual(["started by hand"]);
  });

  it("leaves métis undefined rather than empty when neither side holds any", () => {
    expect(reconcile([svc("node:knowledge:a", "a.service")], observed([])).rows[0].metis).toBeUndefined();
  });
});

describe("reconcile — determinism, staleness, conflicts", () => {
  it("returns byte-identical results for the same input twice", () => {
    const a = svc("node:knowledge:b", "b.service");
    const b = svc("node:knowledge:a", "a.service");
    const first = reconcile([a, b], observed([b]));
    const second = reconcile([a, b], observed([b]));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("sorts rows by node id so two runs can be diffed", () => {
    const result = reconcile(
      [svc("node:knowledge:z", "z.service"), svc("node:knowledge:a", "a.service")],
      observed([]),
    );
    expect(result.rows.map(r => r.nodeId)).toEqual(["node:knowledge:a", "node:knowledge:z"]);
  });

  it("reports the age of the observation so a caller can refuse a stale one", () => {
    const result = reconcile([], observed([]), { now: "2026-08-05T12:05:00Z" });
    expect(result.observationAgeMs).toBe(300_000);
  });

  it("surfaces clock skew as a negative age rather than clamping it", () => {
    const result = reconcile([], observed([]), { now: "2026-08-05T11:55:00Z" });
    expect(result.observationAgeMs).toBe(-300_000);
  });

  it("omits the age entirely when no `now` is given — no hidden clock", () => {
    expect(reconcile([], observed([])).observationAgeMs).toBeUndefined();
  });

  it("folds port conflicts over declared ∪ observed into the same answer", () => {
    // A declared service and an undeclared one both claiming :9081 on eury.
    const declared = svc("node:knowledge:a", "a.service");
    const ghost = svc("node:knowledge:ghost", "ghost.service");
    const result = reconcile([declared], observed([declared, ghost]));

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].port).toBe(9081);
    expect(result.conflicts[0].claimants).toEqual(["node:knowledge:a", "node:knowledge:ghost"]);
    expect(result.converged).toBe(false);
  });

  it("does not call one service claiming its own port twice a conflict", () => {
    const s = svc("node:knowledge:a", "a.service");
    expect(reconcile([s], observed([s])).conflicts).toHaveLength(0);
  });

  it("keeps every drift state present in the summary, including the zeroes", () => {
    const summary = reconcile([], observed([])).summary;
    for (const state of DRIFT_STATES) expect(summary[state]).toBe(0);
  });
});

describe("ObservedStateSchema", () => {
  it("refuses a reading with no reader or no time — an observation without both is a rumour", () => {
    expect(ObservedStateSchema.safeParse({ observedAt: "2026-08-05T12:00:00Z", services: [] }).success).toBe(false);
    expect(ObservedStateSchema.safeParse({ observedBy: EURY, services: [] }).success).toBe(false);
  });

  it("rejects a misparsed port before it can silently never collide", () => {
    const parsed = ObservedStateSchema.safeParse({
      observedBy: EURY,
      observedAt: "2026-08-05T12:00:00Z",
      services: [{ ...svc("node:knowledge:a", "a.service"), ports: [{ port: 0, host: EURY, boundBy: "x" }] }],
    });
    expect(parsed.success).toBe(false);
  });
});
