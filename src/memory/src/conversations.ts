/**
 * Conversations with the wheel's memory.
 *
 * A person (or an agent) asks the memory a question, reads the answer, and
 * replies to it: "say more about the second point", "revise what you just
 * wrote". Each reply is asked with the earlier turns of the conversation, so
 * the memory answers knowing what was said before. The conversation is kept by
 * the wheel, so every host that asks the memory (a ceremony room, a home page,
 * an author's desk, an agent through MCP) reads the same conversations.
 *
 * A conversation is the asker's record of what they asked and what the memory
 * answered. It is not circle speech: the wheel never projects it into the
 * memory provider, so the memory does not learn from its own answers.
 *
 * Who may reach which ceremonies, and who may read a conversation, stays with
 * the host that asks for a person: the wheel's doors trust their callers, so a
 * conversation is private only as far as the host's door keeps it. The wheel
 * keeps three rules of its own: a conversation shared nowhere is continued only
 * by the one who holds it, its doors list conversations only by holder or by
 * the ceremony they are shared in, and a shared conversation is unshared before
 * it is deleted.
 *
 * Earlier turns are placed by the wheel, before the host's prompt
 * ({@link foldEarlierTurns}). A host's template never names them.
 * jgwill/medicine-wheel#174
 */

import type { AskInput, Memory, MemoryAnswer, MemoryMode, MemorySource } from './index.js';

// ── earlier turns, as a provider receives them ──────────────────────────────

/** One earlier turn of a conversation, as it is folded into the next question. */
export interface EarlierTurn {
  /** Who asked it, by name. */
  asked_by?: string;
  question: string;
  /** The memory's reasoned answer; absent when it answered with the closest records only. */
  answer?: string | null;
}

/** An older question is shortened to this many characters when the conversation is long. */
export const EARLIER_QUESTION_CHARS = 600;
/** An older answer is shortened to this many characters when the conversation is long. The latest answer never is, unless it alone does not fit. */
export const EARLIER_ANSWER_CHARS = 1500;

const cut = (text: string, max: number): string => {
  const t = text.trim();
  if (max <= 1) return '';
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

const EARLIER_HEAD = 'Earlier in this conversation (the request after the line continues it):';

/**
 * The prompt a provider asks with, preceded by the earlier turns of the
 * conversation, within `maxChars`. The latest turn is kept whole, so a reply
 * such as "revise what you just wrote" reaches the exact text; older turns are
 * shortened, and the oldest are left out first, with a line saying how many.
 * With no earlier turn, or no room for one, the prompt is returned as it is.
 */
export function foldEarlierTurns(prompt: string, earlier: readonly EarlierTurn[] | undefined, maxChars: number): string {
  const base = prompt.trim();
  const turns = (earlier ?? []).filter((t) => typeof t?.question === 'string' && t.question.trim());
  if (turns.length === 0) return base;
  const tail = `\n\n---\n\n${base}`;
  let room = maxChars - EARLIER_HEAD.length - tail.length;
  const line = (t: EarlierTurn, whole: boolean) =>
    `${t.asked_by?.trim() || 'Someone'} asked: ${whole ? t.question.trim() : cut(t.question, EARLIER_QUESTION_CHARS)}\n` +
    `The memory answered: ${t.answer?.trim() ? (whole ? t.answer.trim() : cut(t.answer, EARLIER_ANSWER_CHARS)) : '(no reasoned answer; it showed the closest records)'}`;

  const kept: string[] = [];
  const latest = line(turns[turns.length - 1], true);
  // The note about left-out turns may be needed; keep room for it.
  const noteRoom = turns.length > 1 ? 60 : 0;
  const latestFits = cut(latest, room - 2 - noteRoom);
  if (!latestFits) return base;
  kept.push(latestFits);
  room -= latestFits.length + 2;
  for (let i = turns.length - 2; i >= 0; i--) {
    const l = line(turns[i], false);
    if (l.length + 2 > room - noteRoom) break;
    kept.unshift(l);
    room -= l.length + 2;
  }
  const left = turns.length - kept.length;
  const note = left ? [`(${left} earlier ${left === 1 ? 'turn is' : 'turns are'} left out.)`] : [];
  return `${[EARLIER_HEAD, ...note, ...kept].join('\n\n')}${tail}`;
}

// ── the conversation ────────────────────────────────────────────────────────

/** One question and the memory's answer to it. */
export interface MemoryConversationTurn {
  id: string;
  at: string;
  /** Who asked, by wheel id. In a shared conversation every turn names its own asker. */
  asked_by: string;
  asked_by_name?: string;
  /** The asker's own words. */
  question: string;
  /** What the provider was asked, when the host wrapped the question in its own template. Without the earlier turns. */
  prompt?: string;
  /** Set when this turn asks an earlier turn's question again. Both answers are kept; the newest one continues the conversation. */
  retry_of?: string;
  /** How far the turn reached: the counts only, since a reach can name hundreds of ceremonies. */
  reached: { ceremonies: number; episodes: number };
  provider: string;
  mode: MemoryMode;
  answer?: string;
  note?: string;
  prompted?: boolean;
  sources: MemorySource[];
  /** The host's own facts about the turn: the reach as it names it, its prompt version, its trace. */
  metadata?: Record<string, unknown>;
}

export interface MemoryConversation {
  /** `memory-conversation:<ms>:<uuid>`. */
  id: string;
  /** Who holds it, by wheel id: a person, or an agent. */
  held_by: string;
  held_by_name?: string;
  /** Where it was opened, as a wheel reference: a ceremony id, `chronicle:<episode path>`, or null. */
  opened_from: string | null;
  /** The ceremony it is shared in, or null when only its holder reads it. */
  shared_in: string | null;
  title: string;
  turns: MemoryConversationTurn[];
  created_at: string;
  updated_at: string;
  /** The host's own facts about the conversation. */
  metadata?: Record<string, unknown>;
}

/** A conversation without its turns, for a list. */
export interface MemoryConversationSummary extends Omit<MemoryConversation, 'turns'> {
  turn_count: number;
  last_question?: string;
  last_at?: string;
}

export interface MemoryConversationFilters {
  held_by?: string;
  opened_from?: string;
  shared_in?: string;
  /** Words matched against the title and every question, case and accents ignored. */
  q?: string;
  limit?: number;
}

/** What may change once a conversation exists. */
export interface MemoryConversationPatch {
  title?: string;
  /** A ceremony id to share it in, or null to share it nowhere. */
  shared_in?: string | null;
  metadata?: Record<string, unknown>;
}

/** The most turns one conversation holds; past it, a new conversation starts. */
export const MAX_CONVERSATION_TURNS = 100;
/** The longest title. */
export const MAX_CONVERSATION_TITLE = 160;

const fold = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** A title from a first question: its first line, shortened. */
export function conversationTitle(question: string): string {
  const first = question.trim().split(/\n/)[0] ?? '';
  return cut(first, 90) || 'Conversation';
}

export function summarizeConversation(c: MemoryConversation): MemoryConversationSummary {
  const { turns, ...rest } = c;
  const last = turns[turns.length - 1];
  return { ...rest, turn_count: turns.length, ...(last ? { last_question: last.question, last_at: last.at } : {}) };
}

export function matchesConversationFilters(c: MemoryConversation, f: MemoryConversationFilters): boolean {
  if (f.held_by !== undefined && c.held_by !== f.held_by) return false;
  if (f.opened_from !== undefined && c.opened_from !== f.opened_from) return false;
  if (f.shared_in !== undefined && c.shared_in !== f.shared_in) return false;
  if (f.q?.trim()) {
    const words = fold(f.q).split(/\s+/).filter(Boolean);
    const hay = fold([c.title, ...c.turns.map((t) => t.question)].join('\n'));
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Matching conversations, the most recently continued first. */
export function filterConversations(list: readonly (MemoryConversation | null | undefined)[], f: MemoryConversationFilters = {}): MemoryConversation[] {
  const out = list
    .filter((c): c is MemoryConversation => !!c && typeof c === 'object' && Array.isArray(c.turns) && matchesConversationFilters(c, f))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return f.limit && f.limit > 0 ? out.slice(0, f.limit) : out;
}

/** The turn a retry belongs with: the first time its question was asked. */
const groupOf = (t: MemoryConversationTurn) => t.retry_of ?? t.id;

/**
 * The turns a reply is asked with: in each group of a question and its
 * retries, only the newest answer, in the order the questions were first asked.
 */
export function currentTurns(c: Pick<MemoryConversation, 'turns'>): MemoryConversationTurn[] {
  const latest = new Map<string, MemoryConversationTurn>();
  const order: string[] = [];
  for (const t of c.turns) {
    const g = groupOf(t);
    if (!latest.has(g)) order.push(g);
    latest.set(g, t);
  }
  return order.map((g) => latest.get(g)!);
}

export const earlierTurn = (t: MemoryConversationTurn): EarlierTurn => ({
  asked_by: t.asked_by_name || t.asked_by,
  question: t.question,
  answer: t.mode === 'dialectic' ? (t.answer ?? null) : null,
});

/** A turn appended, refusing a retry of anything but the latest question. */
export function appendTurn(c: MemoryConversation, turn: MemoryConversationTurn): MemoryConversation {
  if (c.turns.some((t) => t.id === turn.id)) return c;
  if (c.turns.length >= MAX_CONVERSATION_TURNS) {
    throw new ConversationError(409, `A conversation holds at most ${MAX_CONVERSATION_TURNS} turns. Start a new one.`);
  }
  if (turn.retry_of) {
    const last = c.turns[c.turns.length - 1];
    if (!last || groupOf(last) !== turn.retry_of) throw new ConversationError(409, 'Only the latest question can be asked again.');
  }
  return { ...c, turns: [...c.turns, turn], updated_at: turn.at };
}

/** A patch applied, with its values checked. */
export function patchConversation(c: MemoryConversation, patch: MemoryConversationPatch, at: string): MemoryConversation {
  const next: MemoryConversation = { ...c, updated_at: at };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new ConversationError(400, 'A title cannot be empty.');
    if (title.length > MAX_CONVERSATION_TITLE) throw new ConversationError(400, `A title holds at most ${MAX_CONVERSATION_TITLE} characters.`);
    next.title = title;
  }
  if (patch.shared_in !== undefined) {
    if (patch.shared_in !== null && (typeof patch.shared_in !== 'string' || !patch.shared_in.trim())) throw new ConversationError(400, 'shared_in is a ceremony id or null.');
    next.shared_in = patch.shared_in === null ? null : patch.shared_in.trim();
  }
  if (patch.metadata !== undefined) next.metadata = { ...(c.metadata ?? {}), ...patch.metadata };
  return next;
}

/** A refusal with the HTTP status a door answers it with. */
export class ConversationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ConversationError';
  }
}

// ── the store and the orchestration ─────────────────────────────────────────

/** Where conversations are kept. `appendConversationTurn` reads the stored conversation again before it appends, so two replies at once both land. */
export interface ConversationStore {
  getMemoryConversation(id: string): Promise<MemoryConversation | null>;
  createMemoryConversation(c: MemoryConversation): Promise<MemoryConversation>;
  appendMemoryConversationTurn(id: string, turn: MemoryConversationTurn): Promise<MemoryConversation>;
  updateMemoryConversation(id: string, patch: MemoryConversationPatch): Promise<MemoryConversation>;
  listMemoryConversations(filters?: MemoryConversationFilters): Promise<MemoryConversation[]>;
  deleteMemoryConversation(id: string): Promise<void>;
}

/** A question in a conversation: a new one when `conversation` is absent, else a reply. */
export interface ConverseInput extends Omit<AskInput, 'earlier' | 'question'> {
  /** The conversation to continue. Absent: a new conversation starts with this question. */
  conversation?: string;
  /** The asker's own words. Optional only with `retry_of`, which asks that question again. */
  question?: string;
  /** Who asks, by wheel id. */
  asked_by: string;
  asked_by_name?: string;
  /** Ask the latest question again (its turn id); the earlier answer is kept. */
  retry_of?: string;
  /** On a new conversation: who holds it (default: the asker), where it was opened, where it is shared, its title. */
  held_by?: string;
  held_by_name?: string;
  opened_from?: string | null;
  shared_in?: string | null;
  title?: string;
  /** On a new conversation: the host's facts about it. */
  metadata?: Record<string, unknown>;
  /** The host's facts about this turn. */
  turn_metadata?: Record<string, unknown>;
}

export interface ConverseResult {
  conversation: MemoryConversationSummary;
  turn: MemoryConversationTurn;
  /** The memory's answer as `ask` returns it, with its reach. */
  answer: MemoryAnswer;
}

export interface Conversations {
  converse(input: ConverseInput): Promise<ConverseResult>;
  list(filters?: MemoryConversationFilters): Promise<MemoryConversationSummary[]>;
  get(id: string): Promise<MemoryConversation | null>;
  update(id: string, patch: MemoryConversationPatch): Promise<MemoryConversation>;
  delete(id: string): Promise<void>;
}

/** A random part no one can guess from a time: the wheel's doors trust their callers, so an id must not be enumerable. */
const randomPart = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
};
export const newConversationId = () => `memory-conversation:${Date.now()}:${randomPart()}`;
const newTurnId = () => `turn:${Date.now()}:${randomPart()}`;

/** Conversations kept in `store`, asked through `memory`. */
export function createConversations(opts: { memory: Memory; store: ConversationStore; now?: () => string; newId?: () => string }): Conversations {
  const { memory, store } = opts;
  const now = opts.now ?? (() => new Date().toISOString());
  const newId = opts.newId ?? newConversationId;

  return {
    async converse(input) {
      if (!input.asked_by?.trim()) throw new ConversationError(400, 'asked_by is required: who asks, by wheel id.');
      const existing = input.conversation ? await store.getMemoryConversation(input.conversation) : null;
      if (input.conversation && !existing) throw new ConversationError(404, `No conversation ${input.conversation}`);
      if (existing && existing.shared_in === null && existing.held_by !== input.asked_by) {
        throw new ConversationError(403, 'A conversation shared nowhere is continued only by the one who holds it.');
      }
      if (input.retry_of && !existing) throw new ConversationError(400, 'retry_of names a turn of an existing conversation.');

      let question = input.question?.trim() ?? '';
      let prompt = input.prompt?.trim() || undefined;
      let earlier: EarlierTurn[] = [];
      if (existing) {
        if (existing.turns.length >= MAX_CONVERSATION_TURNS) {
          throw new ConversationError(409, `A conversation holds at most ${MAX_CONVERSATION_TURNS} turns. Start a new one.`);
        }
        const current = currentTurns(existing);
        if (input.retry_of) {
          const last = existing.turns[existing.turns.length - 1];
          if (!last || groupOf(last) !== input.retry_of) throw new ConversationError(409, 'Only the latest question can be asked again.');
          const original = existing.turns.find((t) => t.id === input.retry_of)!;
          if (!question) question = original.question;
          if (!prompt && !input.question) prompt = last.prompt;
          earlier = current.slice(0, -1).map(earlierTurn);
        } else {
          earlier = current.map(earlierTurn);
        }
      }
      if (!question) throw new ConversationError(400, 'Ask a question.');

      const answer = await memory.ask({
        question,
        ...(prompt ? { prompt } : {}),
        scope: input.scope,
        ...(input.peer ? { peer: input.peer } : {}),
        ...(input.reasoning_level ? { reasoning_level: input.reasoning_level } : {}),
        ...(input.limit ? { limit: input.limit } : {}),
        ...(earlier.length ? { earlier } : {}),
      });

      const at = now();
      const turn: MemoryConversationTurn = {
        id: newTurnId(),
        at,
        asked_by: input.asked_by,
        ...(input.asked_by_name ? { asked_by_name: input.asked_by_name } : {}),
        question,
        ...(prompt ? { prompt } : {}),
        ...(input.retry_of ? { retry_of: input.retry_of } : {}),
        reached: { ceremonies: answer.reach.ceremonies.length, episodes: answer.reach.episodes.length },
        provider: answer.provider,
        mode: answer.mode,
        ...(answer.answer !== undefined ? { answer: answer.answer } : {}),
        ...(answer.note ? { note: answer.note } : {}),
        ...(answer.prompted ? { prompted: true } : {}),
        sources: answer.sources,
        ...(input.turn_metadata ? { metadata: input.turn_metadata } : {}),
      };

      const kept = existing
        ? await store.appendMemoryConversationTurn(existing.id, turn)
        : await store.createMemoryConversation({
            id: newId(),
            held_by: input.held_by ?? input.asked_by,
            ...((input.held_by_name ?? (input.held_by ? undefined : input.asked_by_name)) ? { held_by_name: input.held_by_name ?? input.asked_by_name } : {}),
            opened_from: input.opened_from ?? null,
            shared_in: input.shared_in ?? null,
            title: input.title?.trim() ? cut(input.title, MAX_CONVERSATION_TITLE) : conversationTitle(question),
            turns: [turn],
            created_at: at,
            updated_at: at,
            ...(input.metadata ? { metadata: input.metadata } : {}),
          });
      return { conversation: summarizeConversation(kept), turn, answer };
    },

    async list(filters = {}) {
      return (await store.listMemoryConversations(filters)).map(summarizeConversation);
    },

    get: (id) => store.getMemoryConversation(id),

    async update(id, patch) {
      if (!(await store.getMemoryConversation(id))) throw new ConversationError(404, `No conversation ${id}`);
      return store.updateMemoryConversation(id, patch);
    },

    async delete(id) {
      const c = await store.getMemoryConversation(id);
      if (!c) throw new ConversationError(404, `No conversation ${id}`);
      // Shared, it holds other people's turns: it is unshared first, as its own act.
      if (c.shared_in) throw new ConversationError(409, `This conversation is shared in ${c.shared_in}. Unshare it before deleting it.`);
      await store.deleteMemoryConversation(id);
    },
  };
}

/** Store helpers for a provider that keeps conversations as whole records (a JSONL file, a JSON column). */
export const conversationRecords = {
  /** The stored list with `turn` appended to conversation `id`. */
  append(list: MemoryConversation[], id: string, turn: MemoryConversationTurn): { list: MemoryConversation[]; kept: MemoryConversation } {
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) throw new ConversationError(404, `No conversation ${id}`);
    const kept = appendTurn(list[i], turn);
    const next = [...list];
    next[i] = kept;
    return { list: next, kept };
  },
  /** The stored list with conversation `id` patched. */
  patch(list: MemoryConversation[], id: string, patch: MemoryConversationPatch, at: string): { list: MemoryConversation[]; kept: MemoryConversation } {
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) throw new ConversationError(404, `No conversation ${id}`);
    const kept = patchConversation(list[i], patch, at);
    const next = [...list];
    next[i] = kept;
    return { list: next, kept };
  },
};
