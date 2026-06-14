import { describe, expect, it } from "vitest";

import {
  RelationContextSchema,
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

describe("relation context metadata", () => {
  it("validates a full context block", () => {
    const ctx = {
      authorized_by: "elder-council",
      active_context: "talking_circle:open",
      valid_when: "ceremony_state == 'open'",
      forbidden_when: "ceremony_state == 'closed'",
      authorized_kin: ["agent-mia", "agent-ava"],
    };
    expect(RelationContextSchema.safeParse(ctx).success).toBe(true);
  });

  it("treats every context field as optional (empty object is valid)", () => {
    expect(RelationContextSchema.safeParse({}).success).toBe(true);
  });

  it("attaches context to a Relation and stays back-compatible without it", () => {
    expect(
      RelationSchema.safeParse({
        ...baseRelation,
        context: { authorized_by: "elder-council", authorized_kin: ["agent-mia"] },
      }).success,
    ).toBe(true);
    // back-compat: existing relations carry no context
    expect(RelationSchema.safeParse(baseRelation).success).toBe(true);
  });

  it("rejects a context with a wrong-typed field", () => {
    expect(
      RelationContextSchema.safeParse({ authorized_kin: "not-an-array" }).success,
    ).toBe(false);
  });
});
