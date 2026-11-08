import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationComposer, ConversationList, ConversationThread, turnGroups, type MemoryConversationsState } from "../src/ui-components/src/MemoryConversation";
import type { MemoryConversation, MemoryConversationTurn } from "../src/memory/src/index";

const turn = (id: string, question: string, answer: string, extra: Partial<MemoryConversationTurn> = {}): MemoryConversationTurn => ({
  id, at: "2026-11-07T23:00:00.000Z", asked_by: "node:human:1:g", asked_by_name: "Guillaume", question,
  reached: { ceremonies: 3, episodes: 0 }, provider: "honcho", mode: "dialectic", answer, sources: [], ...extra,
});

const conversation: MemoryConversation = {
  id: "memory-conversation:1:x", held_by: "node:human:1:g", opened_from: "ceremony:1", shared_in: null, title: "The lantern",
  turns: [turn("t1", "What colour is the lantern?", "Teal."), turn("t2", "Why teal?", "First answer."), turn("t3", "Why teal?", "Second answer.", { retry_of: "t2" })],
  created_at: "2026-11-07T23:00:00.000Z", updated_at: "2026-11-07T23:00:00.000Z",
};

const state = (over: Partial<MemoryConversationsState> = {}): MemoryConversationsState => ({
  conversations: [(({ turns: _turns, ...rest }) => ({ ...rest, turn_count: 3, last_question: "Why teal?", last_at: conversation.updated_at }))(conversation)],
  listed: true, active: conversation, busy: null, pending: null, error: null,
  adapter: { list: async () => [], get: async () => null, ask: async () => { throw new Error("no"); }, rename: async () => conversation, remove: async () => {} },
  refresh: async () => {}, open: async () => {}, startNew: () => {}, ask: async () => true, askAgain: async () => true,
  rename: async () => true, share: async () => true, remove: async () => true, clearError: () => {},
  ...over,
});

describe("memory conversation parts (#174)", () => {
  it("groups a question with the times it was asked again", () => {
    expect(turnGroups(conversation.turns).map((g) => [g.id, g.turns.map((t) => t.id)])).toEqual([["t1", ["t1"]], ["t2", ["t2", "t3"]]]);
  });

  it("draws the thread: the reader's own questions as You, the newest answer of a retried question, its pager, every action an icon with a label", () => {
    const html = renderToStaticMarkup(createElement(ConversationThread, { state: state(), me: "node:human:1:g" }));
    expect(html).toContain('role="log"');
    expect(html).toContain(">You<");
    expect(html).toContain("Second answer.");
    expect(html).not.toContain("First answer.");
    expect(html).toContain("Answer 2 of 2");
    expect(html).toContain('aria-label="Ask again"');
    expect(html).toContain('aria-label="Copy the answer"');
    expect(html).toContain('data-mw-part="question"');
    // The reader's own questions carry no visible name; another person's name them.
    expect(html).not.toContain('data-mw-part="asker"');
    expect(renderToStaticMarkup(createElement(ConversationThread, { state: state(), me: "node:human:2:other" }))).toContain(">Guillaume<");
    // An error carries its glyph.
    const failed = renderToStaticMarkup(createElement(ConversationThread, { state: state({ error: "The wheel refused." }) }));
    expect(failed).toMatch(/role="alert"><svg[^>]*>.*<\/svg><span>The wheel refused\.<\/span>/);
  });

  it("shows the question being asked and a working state, and the host's slots", () => {
    const html = renderToStaticMarkup(
      createElement(ConversationThread, {
        state: state({ pending: "And then?", busy: "ask" }),
        renderAnswer: (t: MemoryConversationTurn) => createElement("em", null, `md:${t.answer}`),
        classNames: { question: "host-question" },
      }),
    );
    expect(html).toContain("And then?");
    expect(html).toContain('role="status"');
    expect(html).toContain("<em>md:Teal.</em>");
    expect(html).toContain('class="host-question"');
    expect(html).not.toContain('aria-label="Ask again"');
  });

  it("draws the list with search, new conversation, rename and delete as icon buttons", () => {
    const html = renderToStaticMarkup(createElement(ConversationList, { state: state() }));
    expect(html).toContain('aria-label="New conversation"');
    expect(html).toContain('aria-label="Rename: The lantern"');
    expect(html).toContain('aria-label="Delete: The lantern"');
    expect(html).toContain("3 turns");
    expect(html).toContain('data-active="true"');
  });

  it("offers Reply once a conversation is open, and says why when the reader may not ask", () => {
    expect(renderToStaticMarkup(createElement(ConversationComposer, { state: state() }))).toContain('aria-label="Reply"');
    expect(renderToStaticMarkup(createElement(ConversationComposer, { state: state({ active: null }) }))).toContain('aria-label="Ask"');
    const blocked = renderToStaticMarkup(createElement(ConversationComposer, { state: state(), disabledReason: "Asking the memory is a permission you do not hold yet." }));
    expect(blocked).toContain("a permission you do not hold yet");
    expect(blocked).toContain("disabled");
  });
});
