import { describe, expect, it } from "vitest";

import {
  traverse,
  avoidanceProtocolGuard,
  evaluateGuards,
  ceremonyBoundaryGuard,
} from "@medicine-wheel/relational-query";
import type {
  RelationalNode,
  RelationalEdge,
  Relation,
} from "@medicine-wheel/ontology-core";

function node(id: string): RelationalNode {
  return {
    id,
    name: id,
    type: "knowledge",
    metadata: {},
    created_at: "2026-06-14T00:00:00.000Z",
    updated_at: "2026-06-14T00:00:00.000Z",
  };
}

function edge(from: string, to: string, ceremony_honored: boolean): RelationalEdge {
  return {
    id: `${from}-${to}`,
    from_id: from,
    to_id: to,
    relationship_type: "speaks-with",
    strength: 0.9,
    ceremony_honored,
    obligations: [],
    created_at: "2026-06-14T00:00:00.000Z",
  };
}

// A first-class relation on the B→C edge carrying an avoidance protocol.
const guardedRelation: Relation = {
  id: "rel-bc",
  from_id: "B",
  to_id: "C",
  relationship_type: "speaks-with",
  strength: 0.9,
  obligations: [],
  ocap: {
    ownership: "community",
    control: "community",
    access: "restricted",
    possession: "community-server",
    compliant: true,
  },
  accountability: {
    respect: 1,
    reciprocity: 1,
    responsibility: 1,
    wilson_alignment: 1,
    relations_honored: [],
  },
  context: {
    authorized_by: "elder-council",
    active_context: "open",
    authorized_kin: ["elder"],
  },
  metadata: {},
  created_at: "2026-06-14T00:00:00.000Z",
  updated_at: "2026-06-14T00:00:00.000Z",
};

const nodes = [node("A"), node("B"), node("C")];
const edges = [edge("A", "B", true), edge("B", "C", false)];

describe("protocol guards", () => {
  it("crosses every edge and escalates nothing when no guards are supplied (back-compat)", () => {
    const result = traverse("A", nodes, edges, [guardedRelation], {
      maxDepth: 5,
      direction: "outgoing",
    });
    expect(result.visitedNodes.has("C")).toBe(true);
    expect(result.escalations).toEqual([]);
  });

  it("blocks an avoidance-protected edge for an unauthorized identity and escalates", () => {
    const result = traverse("A", nodes, edges, [guardedRelation], {
      maxDepth: 5,
      direction: "outgoing",
      guards: [avoidanceProtocolGuard],
      context: { identity: "stranger", ceremonyState: "open" },
    });
    expect(result.visitedNodes.has("C")).toBe(false);
    expect(result.escalations).toHaveLength(1);
    expect(result.escalations[0]).toMatchObject({
      fromId: "B",
      toId: "C",
      guard: "avoidance-protocol",
      escalateTo: "elder-council",
    });
  });

  it("permits the crossing for an authorized identity in the matching ceremony state", () => {
    const result = traverse("A", nodes, edges, [guardedRelation], {
      maxDepth: 5,
      direction: "outgoing",
      guards: [avoidanceProtocolGuard],
      context: { identity: "elder", ceremonyState: "open" },
    });
    expect(result.visitedNodes.has("C")).toBe(true);
    expect(result.escalations).toEqual([]);
  });

  it("reproduces the legacy ceremony-boundary behavior as a built-in guard", () => {
    const result = traverse("A", nodes, edges, [], {
      maxDepth: 5,
      direction: "outgoing",
      respectCeremonyBoundaries: true,
    });
    expect(result.visitedNodes.has("C")).toBe(false);
    expect(result.escalations[0]).toMatchObject({ guard: "ceremony-boundary" });
  });

  it("evaluateGuards returns the first blocking guard's decision", () => {
    const { decision, guard } = evaluateGuards(
      [ceremonyBoundaryGuard, avoidanceProtocolGuard],
      edge("B", "C", false),
      guardedRelation,
      { identity: "elder", ceremonyState: "open" },
    );
    expect(decision.allowed).toBe(false);
    expect(guard).toBe("ceremony-boundary");
  });
});
