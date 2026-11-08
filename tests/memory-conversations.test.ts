import { describe, expect, it } from "vitest";
import {
  ConversationError,
  MAX_CONVERSATION_TURNS,
  conversationRecords,
  createConversations,
  createMemory,
  currentTurns,
  filterConversations,
  foldEarlierTurns,
  patchConversation,
  type ConversationStore,
  type MemoryConversation,
  type MemoryProvider,
  type MemoryQuestion,
  type MemoryWheel,
} from "../src/memory/src/index";

// ── the fold ────────────────────────────────────────────────────────────────

describe("foldEarlierTurns (#174)", () => {
  const turns = [
    { asked_by: "Guillaume", question: "What did we commit to?", answer: "Mia committed to the chat history." },
    { asked_by: "Guillaume", question: "Who else?", answer: null },
  ];

  it("returns the prompt as it is when there is no earlier turn", () => {
    expect(foldEarlierTurns("  Ask this.  ", [], 10000)).toBe("Ask this.");
    expect(foldEarlierTurns("Ask this.", undefined, 10000)).toBe("Ask this.");
  });

  it("puts the earlier turns before the prompt, oldest first, with the answers", () => {
    const out = foldEarlierTurns("Revise what you just wrote.", turns, 10000);
    expect(out.startsWith("Earlier in this conversation")).toBe(true);
    expect(out.indexOf("Guillaume asked: What did we commit to?")).toBeLessThan(out.indexOf("Guillaume asked: Who else?"));
    expect(out).toContain("The memory answered: Mia committed to the chat history.");
    expect(out).toContain("(no reasoned answer; it showed the closest records)");
    expect(out.endsWith("---\n\nRevise what you just wrote.")).toBe(true);
  });

  it("keeps the latest answer whole and shortens or leaves out older ones within the limit", () => {
    const long = Array.from({ length: 12 }, (_, i) => ({ asked_by: "G", question: `Q${i + 1} ${"q".repeat(800)}`, answer: `A${i + 1} ${"a".repeat(3000)}` }));
    const out = foldEarlierTurns("Revise it.", long, 9800);
    expect(out.length).toBeLessThanOrEqual(9800);
    // The latest answer arrives whole: all 3000 characters and its label.
    expect(out).toContain(`A12 ${"a".repeat(3000)}`);
    expect(out).not.toContain("Q1 ");
    expect(out).toMatch(/\((\d+) earlier turns are left out\.\)/);
    expect(out.endsWith("Revise it.")).toBe(true);
  });

  it("cuts the latest answer only when it alone exceeds the limit", () => {
    const out = foldEarlierTurns("Again.", [{ question: "Q", answer: "x".repeat(20000) }], 5000);
    expect(out.length).toBeLessThanOrEqual(5000);
    expect(out).toContain("…");
    expect(out.endsWith("Again.")).toBe(true);
  });
});

// ── ask with earlier turns ──────────────────────────────────────────────────

const wheel: MemoryWheel = {
  async ceremonies() {
    return [{ id: "c1", circle_id: "circle:a", participants: [] }];
  },
  async seats() {
    return [];
  },
  async records() {
    return [
      { wheel_kind: "beat", wheel_id: "b1", ceremony_id: "c1", text: "We committed to the chat history with the memory." },
      { wheel_kind: "beat", wheel_id: "b2", ceremony_id: "c1", text: "Lunch is at noon." },
    ];
  },
  async names() {
    return {};
  },
};

function recordingProvider(answer = "An answer.") {
  const asked: MemoryQuestion[] = [];
  const provider: MemoryProvider = {
    name: "test",
    async status() {
      return { provider: "test", enabled: true, confined: true };
    },
    async ask(q) {
      asked.push(q);
      return { provider: "test", mode: "dialectic", answer, sources: [] };
    },
    async search() {
      return { provider: "test", mode: "search", sources: [] };
    },
  };
  return { provider, asked };
}

describe("ask with earlier turns (#174)", () => {
  it("hands the provider the earlier turns and the person's own words beside the prompt", async () => {
    const { provider, asked } = recordingProvider();
    const memory = createMemory({ wheel, providers: [provider] });
    await memory.ask({ question: "Say more", prompt: "TEMPLATE: Say more", scope: { ceremonies: "c1" }, earlier: [{ question: "What did we commit to?", answer: "The chat history." }] });
    expect(asked[0].query).toBe("TEMPLATE: Say more");
    // The provider searches with the same words the records match uses: the first question with the reply.
    expect(asked[0].question).toBe("What did we commit to?\nSay more");
    expect(asked[0].earlier).toEqual([{ question: "What did we commit to?", answer: "The chat history." }]);
  });

  it("matches the wheel's records on the conversation's first question as well as the reply", async () => {
    const memory = createMemory({ wheel, providers: [] });
    const bare = await memory.ask({ question: "Say more about that", scope: { ceremonies: "c1" } });
    expect(bare.sources).toEqual([]);
    const replied = await memory.ask({ question: "Say more about that", scope: { ceremonies: "c1" }, earlier: [{ question: "What did we commit to with the chat history?" }] });
    expect(replied.sources.map((s) => s.wheel_id)).toEqual(["b1"]);
  });
});

// ── conversations ───────────────────────────────────────────────────────────

function memoryStore(): ConversationStore & { all: MemoryConversation[] } {
  const box = { all: [] as MemoryConversation[] };
  return {
    get all() {
      return box.all;
    },
    async getMemoryConversation(id) {
      return box.all.find((c) => c.id === id) ?? null;
    },
    async createMemoryConversation(c) {
      box.all = [...box.all, c];
      return c;
    },
    async appendMemoryConversationTurn(id, turn) {
      const { list, kept } = conversationRecords.append(box.all, id, turn);
      box.all = list;
      return kept;
    },
    async updateMemoryConversation(id, patch) {
      const { list, kept } = conversationRecords.patch(box.all, id, patch, new Date().toISOString());
      box.all = list;
      return kept;
    },
    async listMemoryConversations(filters) {
      return filterConversations(box.all, filters);
    },
    async deleteMemoryConversation(id) {
      box.all = box.all.filter((c) => c.id !== id);
    },
  };
}

let clock = 0;
const now = () => new Date(Date.UTC(2026, 10, 7, 23, 0, clock++)).toISOString();

describe("createConversations (#174)", () => {
  it("starts a conversation held by the asker, then a reply carries the earlier turns", async () => {
    const { provider, asked } = recordingProvider("First answer.");
    const store = memoryStore();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store, now });
    const first = await conversations.converse({ question: "What did we commit to?", scope: { ceremonies: "c1" }, asked_by: "node:human:1:g", asked_by_name: "Guillaume", opened_from: "c1" });
    expect(first.conversation.held_by).toBe("node:human:1:g");
    expect(first.conversation.held_by_name).toBe("Guillaume");
    expect(first.conversation.title).toBe("What did we commit to?");
    expect(first.conversation.opened_from).toBe("c1");
    expect(first.conversation.shared_in).toBeNull();
    expect(first.turn.reached).toEqual({ ceremonies: 1, episodes: 0 });
    expect(asked[0].earlier).toBeUndefined();

    const reply = await conversations.converse({ conversation: first.conversation.id, question: "Revise what you just wrote.", scope: { ceremonies: "c1" }, asked_by: "node:human:1:g", asked_by_name: "Guillaume" });
    expect(asked[1].earlier).toEqual([{ asked_by: "Guillaume", question: "What did we commit to?", answer: "First answer." }]);
    expect(reply.conversation.turn_count).toBe(2);
    expect((await conversations.get(first.conversation.id))!.turns.map((t) => t.question)).toEqual(["What did we commit to?", "Revise what you just wrote."]);
  });

  it("refuses a reply from someone else to a conversation shared nowhere, and accepts it once shared", async () => {
    const { provider } = recordingProvider();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store: memoryStore(), now });
    const { conversation } = await conversations.converse({ question: "Q?", scope: { ceremonies: "c1" }, asked_by: "a" });
    await expect(conversations.converse({ conversation: conversation.id, question: "Mine?", scope: { ceremonies: "c1" }, asked_by: "b" })).rejects.toMatchObject({ status: 403 });
    await conversations.update(conversation.id, { shared_in: "c1" });
    const r = await conversations.converse({ conversation: conversation.id, question: "Mine?", scope: { ceremonies: "c1" }, asked_by: "b", asked_by_name: "B" });
    expect(r.turn.asked_by).toBe("b");
    expect(r.conversation.held_by).toBe("a");
    await expect(conversations.delete(conversation.id)).rejects.toMatchObject({ status: 409 });
    await conversations.update(conversation.id, { shared_in: null });
    await conversations.delete(conversation.id);
  });

  it("makes ids no one can guess from a time", async () => {
    const { provider } = recordingProvider();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store: memoryStore(), now });
    const { conversation, turn } = await conversations.converse({ question: "Q?", scope: { ceremonies: "c1" }, asked_by: "a" });
    expect(conversation.id).toMatch(/^memory-conversation:\d+:[0-9a-f-]{36}$/);
    expect(turn.id).toMatch(/^turn:\d+:[0-9a-f-]{36}$/);
  });

  it("asks the latest question again, keeps both answers, and continues from the newest", async () => {
    const { provider, asked } = recordingProvider();
    const store = memoryStore();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store, now });
    const one = await conversations.converse({ question: "One?", scope: { ceremonies: "c1" }, asked_by: "a" });
    const two = await conversations.converse({ conversation: one.conversation.id, question: "Two?", scope: { ceremonies: "c1" }, asked_by: "a" });
    const again = await conversations.converse({ conversation: one.conversation.id, retry_of: two.turn.id, scope: { ceremonies: "c1" }, asked_by: "a" });
    expect(again.turn.question).toBe("Two?");
    expect(again.turn.retry_of).toBe(two.turn.id);
    // The retry is asked with the turns before the retried question only.
    expect(asked[2].earlier?.map((t) => t.question)).toEqual(["One?"]);
    const kept = (await conversations.get(one.conversation.id))!;
    expect(kept.turns).toHaveLength(3);
    expect(currentTurns(kept).map((t) => t.id)).toEqual([one.turn.id, again.turn.id]);
    // A second retry stays in the same group; a retry of an older question is refused.
    const again2 = await conversations.converse({ conversation: one.conversation.id, retry_of: two.turn.id, scope: { ceremonies: "c1" }, asked_by: "a" });
    expect(currentTurns((await conversations.get(one.conversation.id))!).map((t) => t.id)).toEqual([one.turn.id, again2.turn.id]);
    await expect(conversations.converse({ conversation: one.conversation.id, retry_of: one.turn.id, scope: { ceremonies: "c1" }, asked_by: "a" })).rejects.toMatchObject({ status: 409 });
  });

  it("lists by holder, place and words, most recent first, and renames, shares and deletes", async () => {
    const { provider } = recordingProvider();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store: memoryStore(), now });
    const a = await conversations.converse({ question: "About the forge fire", scope: { ceremonies: "c1" }, asked_by: "a", opened_from: "c1" });
    await conversations.converse({ question: "About lunch", scope: { ceremonies: "c1" }, asked_by: "a" });
    await conversations.converse({ question: "Someone else's", scope: { ceremonies: "c1" }, asked_by: "b", opened_from: "c1" });
    expect((await conversations.list({ held_by: "a" })).map((c) => c.title)).toEqual(["About lunch", "About the forge fire"]);
    expect((await conversations.list({ opened_from: "c1", held_by: "a" })).map((c) => c.title)).toEqual(["About the forge fire"]);
    expect((await conversations.list({ held_by: "a", q: "FORGE" })).map((c) => c.id)).toEqual([a.conversation.id]);
    const renamed = await conversations.update(a.conversation.id, { title: "  The fire  " });
    expect(renamed.title).toBe("The fire");
    await expect(conversations.update(a.conversation.id, { title: " " })).rejects.toBeInstanceOf(ConversationError);
    await conversations.delete(a.conversation.id);
    expect(await conversations.get(a.conversation.id)).toBeNull();
    await expect(conversations.delete(a.conversation.id)).rejects.toMatchObject({ status: 404 });
  });

  it("refuses an unknown conversation, a missing asker and a turn past the limit", async () => {
    const { provider } = recordingProvider();
    const store = memoryStore();
    const conversations = createConversations({ memory: createMemory({ wheel, providers: [provider] }), store, now });
    await expect(conversations.converse({ conversation: "memory-conversation:0:none", question: "Q", scope: { ceremonies: "c1" }, asked_by: "a" })).rejects.toMatchObject({ status: 404 });
    await expect(conversations.converse({ question: "Q", scope: { ceremonies: "c1" }, asked_by: " " })).rejects.toMatchObject({ status: 400 });
    const { conversation } = await conversations.converse({ question: "Q", scope: { ceremonies: "c1" }, asked_by: "a" });
    const full = (await store.getMemoryConversation(conversation.id))!;
    const filler = Array.from({ length: MAX_CONVERSATION_TURNS - 1 }, (_, i) => ({ ...full.turns[0], id: `turn:x:${i}` }));
    store.all[0] = { ...full, turns: [...full.turns, ...filler] };
    await expect(conversations.converse({ conversation: conversation.id, question: "One more", scope: { ceremonies: "c1" }, asked_by: "a" })).rejects.toMatchObject({ status: 409 });
  });

  it("checks a patch: shared_in is a ceremony id or null", () => {
    const c: MemoryConversation = { id: "x", held_by: "a", opened_from: null, shared_in: null, title: "T", turns: [], created_at: "t", updated_at: "t" };
    expect(patchConversation(c, { shared_in: " c1 " }, "t2").shared_in).toBe("c1");
    expect(patchConversation({ ...c, shared_in: "c1" }, { shared_in: null }, "t2").shared_in).toBeNull();
    expect(() => patchConversation(c, { shared_in: "" }, "t2")).toThrow(ConversationError);
  });
});
