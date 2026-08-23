/**
 * §S4 — the machine fact and the human must not stand in for each other.
 *
 * Every test here exists because collapsing the two is the failure mode. Once a
 * granted consent can be inferred from an enabled `linger` flag, withdrawing
 * consent stops meaning anything: the flag is still set, the gate still opens,
 * and the withdrawal is a note in a file nobody reads.
 *
 * So the pins are about *distinctions*, not about happy paths.
 */

import { describe, expect, it } from "vitest";

import {
  AUTHORIZING_CONSENT_STATES,
  CONSENT_REQUIRING_KINDS,
  lingerFact,
  preconditionGuard,
  readyService,
} from "../src/infra/src/preconditions";
import type { Precondition } from "../src/infra/src/preconditions";
import { PreconditionSchema } from "../src/infra/src/schemas";
import type { ServiceFacet } from "../src/infra/src/types";

const SERVICE = "node:knowledge:assembly-mux";
const TENANT = "node:human:gmusic";

const service: ServiceFacet = {
  nodeId: SERVICE,
  unit: "assembly-mux.service",
  scope: "user",
  ownedBy: TENANT,
  ports: [{ port: 9081, host: "node:land:eury", boundBy: SERVICE }],
};

function pre(overrides: Partial<Precondition> = {}): Precondition {
  return {
    id: "pre:gmusic-linger",
    gates: SERVICE,
    fact: lingerFact(TENANT, "enabled", "2026-08-05T12:00:00Z"),
    consent: { consentId: "consent:root-step:gmusic", state: "active", readAt: "2026-08-05T12:00:00Z" },
    ...overrides,
  };
}

describe("preconditionGuard — the four verdicts are four different situations", () => {
  it("satisfies when the machine fact holds and consent authorizes", () => {
    expect(preconditionGuard(pre()).verdict).toBe("satisfied");
  });

  it("returns 'unsatisfied' when a READ machine fact does not match", () => {
    const result = preconditionGuard(pre({ fact: lingerFact(TENANT, "disabled", "2026-08-05T12:00:00Z") }));
    expect(result.verdict).toBe("unsatisfied");
    expect(result.reason).toContain("disabled");
  });

  it("returns 'unknown' — NOT 'unsatisfied' — when nobody has read the fact", () => {
    // The distinction that keeps an operator reading the report: a service is
    // not blocked because nobody looked yet.
    const result = preconditionGuard(pre({ fact: lingerFact(TENANT) }));
    expect(result.verdict).toBe("unknown");
    expect(result.verdict).not.toBe("unsatisfied");
  });

  it("returns 'unauthorized' when the machine is ready and consent was withdrawn", () => {
    // The whole point. linger is still 'enabled'. The human said no.
    const result = preconditionGuard(
      pre({ consent: { consentId: "consent:root-step:gmusic", state: "withdrawn" } }),
    );
    expect(result.verdict).toBe("unauthorized");
    expect(result.verdict).not.toBe("satisfied");
    expect(result.verdict).not.toBe("unsatisfied");
  });

  it("does not authorize on any non-granted, non-active state", () => {
    for (const state of ["pending", "expired", "renewal-needed", "renegotiating", "withdrawn"]) {
      expect(preconditionGuard(pre({ consent: { consentId: "c", state } })).verdict).toBe("unauthorized");
    }
    for (const state of AUTHORIZING_CONSENT_STATES) {
      expect(preconditionGuard(pre({ consent: { consentId: "c", state } })).verdict).toBe("satisfied");
    }
  });

  it("returns 'unknown' when consent exists but was never read", () => {
    expect(preconditionGuard(pre({ consent: { consentId: "c" } })).verdict).toBe("unknown");
  });

  it("does not consult the human half when the machine half already failed", () => {
    // Nothing has been authorized yet, so there is nothing for consent to say.
    const result = preconditionGuard(
      pre({
        fact: lingerFact(TENANT, "disabled", "2026-08-05T12:00:00Z"),
        consent: { consentId: "c", state: "withdrawn" },
      }),
    );
    expect(result.verdict).toBe("unsatisfied");
  });

  it("returns 'unknown' — never 'satisfied' — for a precondition that declares nothing", () => {
    // An empty gate that reports success has stopped being a gate.
    const result = preconditionGuard({ id: "pre:empty", gates: SERVICE });
    expect(result.verdict).toBe("unknown");
  });

  it("refuses to satisfy a linger fact that names no consent at all", () => {
    // The collapse arriving through an incomplete declaration rather than a
    // wrong verdict: an enabled flag, no ConsentRecord referenced, gate open.
    // Enabling linger required a root step that required a human to say yes.
    const result = preconditionGuard({
      id: "pre:linger-only",
      gates: SERVICE,
      fact: lingerFact(TENANT, "enabled", "2026-08-05T12:00:00Z"),
    });
    expect(result.verdict).toBe("unknown");
    expect(result.verdict).not.toBe("satisfied");
    expect(result.reason).toContain("no yes was referenced");
  });

  it("still satisfies a fact kind that does not require consent", () => {
    // port-free is a property of the machine alone; nobody authorized it.
    const result = preconditionGuard({
      id: "pre:port",
      gates: SERVICE,
      fact: { kind: "port-free", facetNodeId: "node:land:eury", expected: "true", observed: "true" },
    });
    expect(result.verdict).toBe("satisfied");
  });

  it("lists exactly the kinds that cannot stand alone", () => {
    expect([...CONSENT_REQUIRING_KINDS]).toEqual(["linger"]);
  });

  it("accepts a caller-supplied set of authorizing states without forking the file", () => {
    const p = pre({ consent: { consentId: "c", state: "provisional" } });
    expect(preconditionGuard(p).verdict).toBe("unauthorized");
    expect(preconditionGuard(p, ["provisional"]).verdict).toBe("satisfied");
  });
});

describe("readyService", () => {
  it("is ready only when every precondition is satisfied", () => {
    expect(readyService(service, [pre()]).ready).toBe(true);
    expect(readyService(service, [pre(), pre({ id: "b", consent: { consentId: "c", state: "withdrawn" } })]).ready)
      .toBe(false);
  });

  it("ignores preconditions gating a different service rather than counting them", () => {
    const other = pre({ id: "pre:other", gates: "node:knowledge:something-else", consent: { consentId: "c", state: "withdrawn" } });
    const readiness = readyService(service, [pre(), other]);
    expect(readiness.declared).toBe(1);
    expect(readiness.ready).toBe(true);
  });

  it("names the vacuous truth when nothing is declared", () => {
    const readiness = readyService(service, []);
    expect(readiness.ready).toBe(true);
    expect(readiness.declared).toBe(0);
    expect(readiness.reason).toContain("vacuously true");
  });

  it("carries métis from the blocking preconditions forward", () => {
    // The reason a gate is stuck is exactly where "restart it twice" lives.
    const blocked = pre({
      id: "pre:mount",
      consent: { consentId: "c", state: "withdrawn" },
      metis: { exceptions: ["restart twice; first start races the mount"], heldBy: "William" },
    });
    const readiness = readyService(service, [blocked]);
    expect(readiness.ready).toBe(false);
    expect(readiness.metis).toHaveLength(1);
    expect(readiness.metis[0].heldBy).toBe("William");
  });

  it("does not carry métis from preconditions that are satisfied", () => {
    const readiness = readyService(service, [pre({ metis: { heldBy: "William" } })]);
    expect(readiness.metis).toHaveLength(0);
  });

  it("summarises the blocking shape by verdict", () => {
    const readiness = readyService(service, [
      pre({ id: "a", fact: lingerFact(TENANT) }),
      pre({ id: "b", consent: { consentId: "c", state: "withdrawn" } }),
    ]);
    expect(readiness.reason).toContain("1 unauthorized");
    expect(readiness.reason).toContain("1 unknown");
  });
});

describe("PreconditionSchema", () => {
  it("accepts a precondition with only a consent half", () => {
    expect(PreconditionSchema.safeParse({ id: "p", gates: SERVICE, consent: { consentId: "c" } }).success).toBe(true);
  });

  it("does not constrain consent state to an enum", () => {
    // infra records what the lifecycle said. An enum here would let this package
    // reject a state consent-lifecycle legitimately issued.
    expect(PreconditionSchema.safeParse({
      id: "p", gates: SERVICE, consent: { consentId: "c", state: "some-future-state" },
    }).success).toBe(true);
  });

  it("rejects a precondition with no id or no gates", () => {
    expect(PreconditionSchema.safeParse({ gates: SERVICE }).success).toBe(false);
    expect(PreconditionSchema.safeParse({ id: "p" }).success).toBe(false);
  });
});
