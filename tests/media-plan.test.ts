import { describe, expect, it } from "vitest";

import {
  MEDIA_PLAN_KIND,
  MEDIA_PLAN_NODE_PREFIX,
  MEDIA_PLAN_STATES,
  MediaPlanMetadataSchema,
  isMediaPlanMetadata,
  mediaPlanCardId,
  mediaPlanNodeId,
} from "../src/ontology-core/src/media-plan";
import { getKinshipEdgeType, inverseEdge, isKinshipEdgeName } from "../src/ontology-core/src/kinship";
import { KinshipEdgeNameSchema } from "../src/ontology-core/src/schemas";
import type { ProductionEntityKind, ProductionRelation } from "../src/ontology-core/src/types";

const CARD = "26192ae5-88f2-4443-b870-8c0df3cc4e41";

// The metadata of a node the notebook door wrote on the chronicle wheel, 2026-11-05.
const onTheWheel = {
  kind: "media-plan",
  address: `miadi-media-plan:${CARD}`,
  artifact_id: CARD,
  notebook_id: "78507190-4018-41c6-9fe0-47ed17df5300",
  parent_id: "notebook:78507190-4018-41c6-9fe0-47ed17df5300",
  episode_path: "2026-07-19-episode-251-deepdiver",
  path: "captures/notebook-78507190-4018-41c6-9fe0-47ed17df5300/outline-01-26192ae5.md",
  version: 1,
  made_with: "miadi-capability:miadisabelle/deepdiver/cli/deepdiver",
  family: "Slide Deck",
  item_count: 6,
  plan_sha256: "abc",
  saved_at: "2026-11-05T18:06:21",
  state: "rendered",
  proceeded_at: "2026-11-05T17:36:01",
  feedback_sent: true,
  feedback_path: "outline-01-26192ae5.feedback.md",
  rendered_as: { artifact_id: CARD, title: "Deep Diver Media Pipeline" },
};

describe("a media plan's identity", () => {
  it("is one node per card", () => {
    expect(mediaPlanNodeId(CARD)).toBe(`media-plan:${CARD}`);
    expect(mediaPlanNodeId(`media-plan:${CARD}`)).toBe(`media-plan:${CARD}`);
    expect(mediaPlanCardId(`media-plan:${CARD}`)).toBe(CARD);
  });

  it("is not any other node, and not a plan perspective", () => {
    expect(mediaPlanCardId("notebook:78507190")).toBeUndefined();
    expect(mediaPlanCardId("plan-perspective:4a740ef7")).toBeUndefined();
    expect(MEDIA_PLAN_NODE_PREFIX).toBe("media-plan:");
  });

  it("rides knowledge as a production entity", () => {
    const kind: ProductionEntityKind = MEDIA_PLAN_KIND;
    expect(kind).toBe("media-plan");
  });
});

describe("a media plan's metadata", () => {
  it("reads what the door writes, and keeps a producer's own keys", () => {
    const parsed = MediaPlanMetadataSchema.parse({ ...onTheWheel, a_key_of_its_own: 1 });
    expect(parsed.rendered_as?.title).toBe("Deep Diver Media Pipeline");
    expect((parsed as Record<string, unknown>).a_key_of_its_own).toBe(1);
  });

  it("refuses another kind, a version that is not a position, and an unknown state", () => {
    expect(isMediaPlanMetadata(onTheWheel)).toBe(true);
    expect(isMediaPlanMetadata({ ...onTheWheel, kind: "miadi_notebook" })).toBe(false);
    expect(isMediaPlanMetadata({ ...onTheWheel, version: 0 })).toBe(false);
    expect(isMediaPlanMetadata({ ...onTheWheel, state: "forgotten" })).toBe(false);
  });

  it("needs what a reader needs to find the plan and its file", () => {
    for (const key of ["artifact_id", "parent_id", "episode_path", "path", "state"]) {
      const { [key as keyof typeof onTheWheel]: _gone, ...rest } = onTheWheel;
      expect(isMediaPlanMetadata(rest)).toBe(false);
    }
  });

  it("can say a plan was let go without a render", () => {
    expect(MEDIA_PLAN_STATES).toContain("released");
    expect(isMediaPlanMetadata({ ...onTheWheel, state: "released", rendered_as: undefined })).toBe(true);
  });
});

describe("a media plan's edges are governed", () => {
  it("names both in the vocabulary, with their inverse readings", () => {
    expect(isKinshipEdgeName("holds-plan")).toBe(true);
    expect(isKinshipEdgeName("seeded-from")).toBe(true);
    expect(inverseEdge("holds-plan")).toBe("plan-held-by");
    expect(inverseEdge("seeded-from")).toBe("seed-of");
    expect(getKinshipEdgeType("seeded-from")?.symmetry).toBe("asymmetric");
    expect(KinshipEdgeNameSchema.safeParse("holds-plan").success).toBe(true);
  });

  it("is a production relation", () => {
    const held: Pick<ProductionRelation, "relationship_type"> = { relationship_type: "holds-plan" };
    const seeded: Pick<ProductionRelation, "relationship_type"> = { relationship_type: "seeded-from" };
    expect([held.relationship_type, seeded.relationship_type]).toEqual(["holds-plan", "seeded-from"]);
  });
});
