import { describe, expect, it } from "vitest";

import {
  KINSHIP_EDGE_TYPES,
  KINSHIP_EDGE_NAMES,
  getKinshipEdgeType,
  isKinshipEdgeName,
  inverseEdge,
} from "../src/ontology-core/src/kinship";
import {
  KinshipEdgeNameSchema,
  RelationSchema,
} from "../src/ontology-core/src/schemas";

const baseRelation = {
  id: "rel-1",
  from_id: "node-a",
  to_id: "node-b",
  relationship_type: "kinship",
  strength: 0.8,
  obligations: [],
  ocap: {
    ownership: "community",
    control: "community",
    access: "community",
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
  metadata: {},
  created_at: "2026-06-14T00:00:00.000Z",
  updated_at: "2026-06-14T00:00:00.000Z",
};

describe("kinship edge vocabulary", () => {
  it("registers the four core kinship edges plus RSIS verbs, each name matching its key", () => {
    for (const core of [
      "tends-to",
      "speaks-with",
      "holds-responsibility-for",
      "co-emerges-with",
    ]) {
      expect(KINSHIP_EDGE_NAMES).toContain(core);
    }
    for (const [key, edge] of Object.entries(KINSHIP_EDGE_TYPES)) {
      expect(edge.name).toBe(key);
    }
  });

  it("returns its own name as the inverse of a symmetric edge", () => {
    expect(getKinshipEdgeType("co-emerges-with")?.inverse).toBeUndefined();
    expect(inverseEdge("co-emerges-with")).toBe("co-emerges-with");
    expect(inverseEdge("speaks-with")).toBe("speaks-with");
  });

  it("returns the declared inverse of an asymmetric edge", () => {
    expect(getKinshipEdgeType("holds-responsibility-for")?.symmetry).toBe("asymmetric");
    expect(inverseEdge("holds-responsibility-for")).toBe("in-care-of");
    expect(inverseEdge("tends-to")).toBe("tended-by");
  });

  it("recognizes governed names and rejects unknown ones", () => {
    expect(isKinshipEdgeName("speaks-with")).toBe(true);
    expect(isKinshipEdgeName("dominates")).toBe(false);
    expect(inverseEdge("dominates")).toBeUndefined();
    expect(KinshipEdgeNameSchema.safeParse("speaks-with").success).toBe(true);
    expect(KinshipEdgeNameSchema.safeParse("dominates").success).toBe(false);
  });

  it("accepts a Relation with a kinship_type and stays back-compatible without one", () => {
    expect(
      RelationSchema.safeParse({ ...baseRelation, kinship_type: "holds-responsibility-for" }).success,
    ).toBe(true);
    // back-compat: existing relations carry no kinship_type
    expect(RelationSchema.safeParse(baseRelation).success).toBe(true);
    // an unknown kinship_type is rejected by the governed enum
    expect(
      RelationSchema.safeParse({ ...baseRelation, kinship_type: "dominates" }).success,
    ).toBe(false);
  });
});
