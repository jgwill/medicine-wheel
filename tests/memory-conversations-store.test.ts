import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlProvider } from "../src/storage-provider/src/index";
import type { MemoryConversation, MemoryConversationTurn } from "../src/memory/src/index";

let tempDir: string;
let store: JsonlProvider;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-memory-conversations-"));
  store = new JsonlProvider(tempDir);
  await store.connect();
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const turn = (id: string, at: string, question = "Q"): MemoryConversationTurn => ({
  id,
  at,
  asked_by: "node:human:1:g",
  question,
  reached: { ceremonies: 1, episodes: 0 },
  provider: "test",
  mode: "dialectic",
  answer: "A",
  sources: [],
});

const conversation = (id: string, at: string, extra: Partial<MemoryConversation> = {}): MemoryConversation => ({
  id,
  held_by: "node:human:1:g",
  opened_from: "ceremony:1",
  shared_in: null,
  title: "T",
  turns: [turn(`${id}:t0`, at)],
  created_at: at,
  updated_at: at,
  ...extra,
});

describe("JSONL memory conversations (#174)", () => {
  it("keeps conversations in their own file beside the store", async () => {
    await store.createMemoryConversation(conversation("memory-conversation:1:a", "2026-11-07T23:00:00.000Z"));
    expect(fs.existsSync(path.join(tempDir, "memory-conversations.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "ceremonies.jsonl"))).toBe(false);
    expect((await store.getMemoryConversation("memory-conversation:1:a"))?.title).toBe("T");
    await expect(store.createMemoryConversation(conversation("memory-conversation:1:a", "2026-11-07T23:00:00.000Z"))).rejects.toMatchObject({ status: 409 });
  });

  it("lands two replies sent at once, each read again before it is appended", async () => {
    await store.createMemoryConversation(conversation("memory-conversation:1:a", "2026-11-07T23:00:00.000Z"));
    await Promise.all([
      store.appendMemoryConversationTurn("memory-conversation:1:a", turn("t1", "2026-11-07T23:00:01.000Z", "one")),
      store.appendMemoryConversationTurn("memory-conversation:1:a", turn("t2", "2026-11-07T23:00:02.000Z", "two")),
    ]);
    const kept = await store.getMemoryConversation("memory-conversation:1:a");
    expect(kept?.turns.map((t) => t.question).sort()).toEqual(["Q", "one", "two"]);
    await expect(store.appendMemoryConversationTurn("memory-conversation:0:none", turn("t3", "x"))).rejects.toMatchObject({ status: 404 });
  });

  it("lists by holder, sharing and words, most recent first; renames, shares and deletes", async () => {
    await store.createMemoryConversation(conversation("memory-conversation:1:a", "2026-11-07T23:00:00.000Z", { title: "The forge fire" }));
    await store.createMemoryConversation(conversation("memory-conversation:2:b", "2026-11-07T23:01:00.000Z", { held_by: "node:human:2:x" }));
    await store.createMemoryConversation(conversation("memory-conversation:3:c", "2026-11-07T23:02:00.000Z"));
    expect((await store.listMemoryConversations({ held_by: "node:human:1:g" })).map((c) => c.id)).toEqual(["memory-conversation:3:c", "memory-conversation:1:a"]);
    expect((await store.listMemoryConversations({ held_by: "node:human:1:g", q: "forge" })).map((c) => c.id)).toEqual(["memory-conversation:1:a"]);
    const shared = await store.updateMemoryConversation("memory-conversation:1:a", { shared_in: "ceremony:1", title: "Fire" });
    expect(shared.shared_in).toBe("ceremony:1");
    expect((await store.listMemoryConversations({ shared_in: "ceremony:1" })).map((c) => c.title)).toEqual(["Fire"]);
    await store.deleteMemoryConversation("memory-conversation:1:a");
    expect(await store.getMemoryConversation("memory-conversation:1:a")).toBeNull();
    expect((await store.listMemoryConversations()).length).toBe(2);
  });
});
