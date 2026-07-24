import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  JsonlProvider,
  NodeNotFoundError,
  EdgeNotFoundError,
  NodeHasRelationsError,
  type RelationalNode,
  type RelationalEdge,
} from "../src/storage-provider/src/index";

let tempDir: string;
let provider: JsonlProvider;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-storage-crud-"));
  provider = new JsonlProvider(tempDir);
  await provider.connect();
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function node(overrides: Partial<RelationalNode> = {}): RelationalNode {
  const now = new Date().toISOString();
  return {
    id: "elder-1",
    name: "Elder Sarah",
    type: "human",
    direction: "north",
    description: "Knowledge keeper",
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function edge(overrides: Partial<RelationalEdge> = {}): RelationalEdge {
  return {
    from_id: "elder-1",
    to_id: "youth-1",
    relationship_type: "mentorship",
    strength: 0.9,
    ceremony_honored: false,
    obligations: ["teaching"],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("updateNode", () => {
  it("patches fields, keeps the rest, and bumps updated_at", async () => {
    const original = node();
    await provider.createNode(original);

    const updated = await provider.updateNode("elder-1", {
      name: "Elder Sarah Whitecloud",
      description: "Carries the northern teachings",
    });

    expect(updated.name).toBe("Elder Sarah Whitecloud");
    expect(updated.description).toBe("Carries the northern teachings");
    expect(updated.type).toBe("human");
    expect(updated.direction).toBe("north");
    expect(Date.parse(updated.updated_at)).toBeGreaterThanOrEqual(
      Date.parse(original.updated_at),
    );

    const persisted = await provider.getNode("elder-1");
    expect(persisted?.name).toBe("Elder Sarah Whitecloud");
  });

  it("releases direction when patch.direction is null", async () => {
    await provider.createNode(node());

    const updated = await provider.updateNode("elder-1", { direction: null });

    expect(updated.direction).toBeUndefined();
    const persisted = await provider.getNode("elder-1");
    expect(persisted?.direction).toBeUndefined();
  });

  it("changes type and direction to new values", async () => {
    await provider.createNode(node());

    const updated = await provider.updateNode("elder-1", {
      type: "ancestor",
      direction: "west",
    });

    expect(updated.type).toBe("ancestor");
    expect(updated.direction).toBe("west");
  });

  it("throws NodeNotFoundError for a missing node", async () => {
    await expect(provider.updateNode("ghost", { name: "x" })).rejects.toThrow(
      NodeNotFoundError,
    );
  });
});

describe("deleteNode", () => {
  it("deletes a node with no relations", async () => {
    await provider.createNode(node());

    await provider.deleteNode("elder-1");

    expect(await provider.getNode("elder-1")).toBeNull();
  });

  it("refuses to delete a node that holds relations", async () => {
    await provider.createNode(node());
    await provider.createNode(node({ id: "youth-1", name: "Youth Circle", direction: "south" }));
    await provider.createEdge(edge());

    const attempt = provider.deleteNode("elder-1");
    await expect(attempt).rejects.toThrow(NodeHasRelationsError);
    await expect(provider.deleteNode("elder-1")).rejects.toThrow(
      /holds 1 relation — release them first/,
    );

    // The node remains untouched after the refusal.
    expect(await provider.getNode("elder-1")).not.toBeNull();
  });

  it("counts inbound relations too", async () => {
    await provider.createNode(node());
    await provider.createNode(node({ id: "youth-1", name: "Youth Circle" }));
    await provider.createEdge(edge({ from_id: "youth-1", to_id: "elder-1" }));

    await expect(provider.deleteNode("elder-1")).rejects.toThrow(NodeHasRelationsError);
  });

  it("deletes once relations are released", async () => {
    await provider.createNode(node());
    await provider.createNode(node({ id: "youth-1", name: "Youth Circle" }));
    await provider.createEdge(edge());

    await provider.deleteEdge("elder-1", "youth-1");
    await provider.deleteNode("elder-1");

    expect(await provider.getNode("elder-1")).toBeNull();
  });

  it("throws NodeNotFoundError for a missing node", async () => {
    await expect(provider.deleteNode("ghost")).rejects.toThrow(NodeNotFoundError);
  });
});

describe("updateEdge", () => {
  it("patches relationship fields and persists them", async () => {
    await provider.createEdge(edge());

    const updated = await provider.updateEdge("elder-1", "youth-1", {
      relationship_type: "kinship",
      strength: 0.5,
      obligations: ["listening", "presence"],
    });

    expect(updated.relationship_type).toBe("kinship");
    expect(updated.strength).toBe(0.5);
    expect(updated.obligations).toEqual(["listening", "presence"]);
    expect(updated.ceremony_honored).toBe(false);

    const persisted = await provider.getEdge("elder-1", "youth-1");
    expect(persisted?.relationship_type).toBe("kinship");
    expect(persisted?.strength).toBe(0.5);
  });

  it("can toggle ceremony_honored", async () => {
    await provider.createEdge(edge({ ceremony_honored: true }));

    const updated = await provider.updateEdge("elder-1", "youth-1", {
      ceremony_honored: false,
    });

    expect(updated.ceremony_honored).toBe(false);
  });

  it("throws EdgeNotFoundError when the pair has no relation", async () => {
    await expect(
      provider.updateEdge("elder-1", "nobody", { strength: 1 }),
    ).rejects.toThrow(EdgeNotFoundError);
  });
});

describe("deleteEdge", () => {
  it("removes exactly the identified relation", async () => {
    await provider.createEdge(edge());
    await provider.createEdge(edge({ to_id: "land-1", relationship_type: "stewardship" }));

    await provider.deleteEdge("elder-1", "youth-1");

    expect(await provider.getEdge("elder-1", "youth-1")).toBeNull();
    expect(await provider.getEdge("elder-1", "land-1")).not.toBeNull();
  });

  it("is direction-sensitive (from→to is not to→from)", async () => {
    await provider.createEdge(edge());

    await expect(provider.deleteEdge("youth-1", "elder-1")).rejects.toThrow(
      EdgeNotFoundError,
    );
  });

  it("throws EdgeNotFoundError for a missing relation", async () => {
    await expect(provider.deleteEdge("a", "b")).rejects.toThrow(EdgeNotFoundError);
  });
});

describe("write lock recovery", () => {
  it("reclaims an aged lock file whose payload cannot be read", async () => {
    // A writer killed between creating the lock and stamping it leaves a file
    // that names no owner. Judging it permanently held makes the entity
    // unwritable forever.
    const lockPath = path.join(tempDir, "nodes.jsonl.lock");
    const tenMinutesAgo = new Date(Date.now() - 600_000);
    fs.writeFileSync(lockPath, "", "utf-8");
    fs.utimesSync(lockPath, tenMinutesAgo, tenMinutesAgo);

    await provider.createNode(node());

    expect(await provider.getNode("elder-1")).not.toBeNull();
  });
});

describe("edge identity", () => {
  it("exposes a stable composite id on read", async () => {
    await provider.createEdge(edge());

    const edges = await provider.getAllEdges();
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe("elder-1:youth-1");
  });
});
