'use client';
/**
 * Conversations with the wheel's memory, drawn the same way in every host
 * (jgwill/medicine-wheel#174): a list of conversations, the thread of one, and
 * a box to reply in.
 *
 * Headless in what belongs to the host. State lives in
 * {@link useMemoryConversations}, which talks to the host's own door through a
 * {@link ConversationAdapter} (the host decides who may read and reach what).
 * The parts render structure, state and ARIA, carry `data-mw-part`, and take a
 * class per part; the host passes how an answer is rendered (markdown), what a
 * source looks like and links to, its icons, and its own actions (voice).
 * `conversation.css` styles the parts with the wheel's tokens for a host that
 * brings no styles of its own.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { MemoryConversation, MemoryConversationSummary, MemoryConversationTurn } from '@medicine-wheel/memory' with { 'resolution-mode': 'import' };

// ── the host's door ─────────────────────────────────────────────────────────

/** What a host's door answers when a question is asked. */
export interface ConversationAsked {
  conversation: MemoryConversationSummary;
  turn: MemoryConversationTurn;
}

/** The host's door to its conversations. Each call may throw; its message is shown. */
export interface ConversationAdapter {
  list(): Promise<MemoryConversationSummary[]>;
  get(id: string): Promise<MemoryConversation | null>;
  /** Without `conversation` a new one starts; `retry_of` asks the latest question again. */
  ask(input: { conversation?: string; question?: string; retry_of?: string }): Promise<ConversationAsked>;
  rename?(id: string, title: string): Promise<MemoryConversation>;
  share?(id: string, sharedIn: string | null): Promise<MemoryConversation>;
  remove?(id: string): Promise<void>;
}

// ── turns in groups: a question and its retries ─────────────────────────────

/** A question with every answer it got: the first asking, then each time it was asked again. */
export interface TurnGroup {
  id: string;
  turns: MemoryConversationTurn[];
}

/** The turns grouped by question, in the order the questions were first asked. */
export function turnGroups(turns: readonly MemoryConversationTurn[]): TurnGroup[] {
  const groups = new Map<string, TurnGroup>();
  for (const t of turns) {
    const id = t.retry_of ?? t.id;
    if (!groups.has(id)) groups.set(id, { id, turns: [] });
    groups.get(id)!.turns.push(t);
  }
  return [...groups.values()];
}

const summaryToConversation = (s: MemoryConversationSummary, turns: MemoryConversationTurn[]): MemoryConversation => {
  const { turn_count: _count, last_question: _q, last_at: _at, ...rest } = s;
  return { ...rest, turns };
};

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// ── state ───────────────────────────────────────────────────────────────────

export type ConversationBusy = 'list' | 'open' | 'ask' | 'change' | null;

export interface MemoryConversationsState {
  conversations: MemoryConversationSummary[];
  /** True once the list was read. */
  listed: boolean;
  active: MemoryConversation | null;
  busy: ConversationBusy;
  /** The question being asked, shown in the thread until the memory answers. */
  pending: string | null;
  error: string | null;
  adapter: ConversationAdapter;
  refresh(): Promise<void>;
  open(id: string): Promise<void>;
  /** Close the open conversation, so the next question starts a new one. */
  startNew(): void;
  ask(question: string): Promise<boolean>;
  askAgain(): Promise<boolean>;
  rename(id: string, title: string): Promise<boolean>;
  share(id: string, sharedIn: string | null): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  clearError(): void;
}

export interface UseMemoryConversationsOptions {
  /** A conversation to open first. */
  initial?: string | null;
  /** Read the list when mounted. Default true. */
  autoList?: boolean;
  /** Told whenever the open conversation changes (to keep it in the URL). */
  onActive?: (id: string | null) => void;
}

export function useMemoryConversations(adapter: ConversationAdapter, options: UseMemoryConversationsOptions = {}): MemoryConversationsState {
  const [conversations, setConversations] = useState<MemoryConversationSummary[]>([]);
  const [listed, setListed] = useState(false);
  const [active, setActive] = useState<MemoryConversation | null>(null);
  const [busy, setBusy] = useState<ConversationBusy>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const onActive = useRef(options.onActive);
  onActive.current = options.onActive;
  const activeRef = useRef<MemoryConversation | null>(null);
  activeRef.current = active;

  const show = useCallback((c: MemoryConversation | null) => {
    setActive(c);
    onActive.current?.(c?.id ?? null);
  }, []);

  const upsertSummary = useCallback((s: MemoryConversationSummary) => {
    setConversations((list) => [s, ...list.filter((c) => c.id !== s.id)]);
  }, []);

  const refresh = useCallback(async () => {
    setBusy((b) => b ?? 'list');
    try {
      setConversations(await adapterRef.current.list());
      setListed(true);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy((b) => (b === 'list' ? null : b));
    }
  }, []);

  const open = useCallback(async (id: string) => {
    setBusy('open');
    setError(null);
    try {
      const c = await adapterRef.current.get(id);
      if (!c) setError('This conversation is no longer there.');
      show(c);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }, [show]);

  const settle = useCallback((out: ConversationAsked) => {
    const current = activeRef.current;
    const next = current && current.id === out.conversation.id
      ? { ...summaryToConversation(out.conversation, current.turns), turns: [...current.turns, out.turn] }
      : summaryToConversation(out.conversation, [out.turn]);
    show(next);
    upsertSummary(out.conversation);
  }, [show, upsertSummary]);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return false;
    setBusy('ask');
    setPending(q);
    setError(null);
    try {
      settle(await adapterRef.current.ask({ ...(activeRef.current ? { conversation: activeRef.current.id } : {}), question: q }));
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setPending(null);
      setBusy(null);
    }
  }, [settle]);

  const askAgain = useCallback(async () => {
    const c = activeRef.current;
    const last = c?.turns[c.turns.length - 1];
    if (!c || !last) return false;
    setBusy('ask');
    setPending(last.question);
    setError(null);
    try {
      settle(await adapterRef.current.ask({ conversation: c.id, retry_of: last.retry_of ?? last.id }));
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setPending(null);
      setBusy(null);
    }
  }, [settle]);

  const change = useCallback(async (run: () => Promise<MemoryConversation | void>, id: string) => {
    setBusy('change');
    setError(null);
    try {
      const c = await run();
      if (c) {
        setConversations((list) => list.map((x) => (x.id === id ? { ...x, title: c.title, shared_in: c.shared_in, updated_at: c.updated_at } : x)));
        if (activeRef.current?.id === id) show({ ...activeRef.current, title: c.title, shared_in: c.shared_in, updated_at: c.updated_at });
      } else {
        setConversations((list) => list.filter((x) => x.id !== id));
        if (activeRef.current?.id === id) show(null);
      }
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(null);
    }
  }, [show]);

  const rename = useCallback((id: string, title: string) => (adapterRef.current.rename ? change(() => adapterRef.current.rename!(id, title), id) : Promise.resolve(false)), [change]);
  const share = useCallback((id: string, sharedIn: string | null) => (adapterRef.current.share ? change(() => adapterRef.current.share!(id, sharedIn), id) : Promise.resolve(false)), [change]);
  const remove = useCallback((id: string) => (adapterRef.current.remove ? change(() => adapterRef.current.remove!(id), id) : Promise.resolve(false)), [change]);

  useEffect(() => {
    if (options.autoList !== false) void refresh();
    if (options.initial) void open(options.initial);
    // Mount only: the host remounts (a new key) to point the hook at another place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    conversations,
    listed,
    active,
    busy,
    pending,
    error,
    adapter,
    refresh,
    open,
    startNew: () => {
      show(null);
      setError(null);
    },
    ask,
    askAgain,
    rename,
    share,
    remove,
    clearError: () => setError(null),
  };
}

// ── icons, labels, classes ──────────────────────────────────────────────────

export interface ConversationIcons {
  send: ReactNode;
  newConversation: ReactNode;
  search: ReactNode;
  rename: ReactNode;
  remove: ReactNode;
  copy: ReactNode;
  copied: ReactNode;
  again: ReactNode;
  previous: ReactNode;
  next: ReactNode;
  close: ReactNode;
  confirm: ReactNode;
  working: ReactNode;
  conversation: ReactNode;
  shared: ReactNode;
}

const svg = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: '0 0 auto' }}>
    <path d={d} />
  </svg>
);

/** Line icons drawn in the shape of lucide's, so a host without an icon set still has every action as an icon. */
export const defaultConversationIcons: ConversationIcons = {
  send: svg('M3.7 3.7 21 12 3.7 20.3 6 12zM6 12h7'),
  newConversation: svg('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h8M16 3h6M19 0v6'),
  search: svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3'),
  rename: svg('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'),
  remove: svg('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6'),
  copy: svg('M8 8h12v12H8zM4 16V4h12'),
  copied: svg('M20 6 9 17l-5-5'),
  again: svg('M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'),
  previous: svg('M15 18l-6-6 6-6'),
  next: svg('M9 18l6-6-6-6'),
  close: svg('M18 6 6 18M6 6l12 12'),
  confirm: svg('M20 6 9 17l-5-5'),
  working: svg('M21 12a9 9 0 1 1-6.2-8.6'),
  conversation: svg('M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z'),
  shared: svg('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'),
};

export interface ConversationLabels {
  newConversation: string;
  search: string;
  empty: string;
  noMatch: string;
  rename: string;
  saveTitle: string;
  cancel: string;
  remove: string;
  removeConfirm: string;
  /** What deleting does, said before it is done. */
  removePlan: (s: MemoryConversationSummary) => string;
  unshareFirst: string;
  turns: (n: number) => string;
  you: string;
  copy: string;
  copied: string;
  again: string;
  answerOf: (i: number, n: number) => string;
  previousAnswer: string;
  nextAnswer: string;
  working: string;
  placeholder: string;
  replyPlaceholder: string;
  send: string;
  reply: string;
  composerLabel: string;
  shared: string;
  noAnswer: string;
}

export const defaultConversationLabels: ConversationLabels = {
  newConversation: 'New conversation',
  search: 'Search your conversations',
  empty: 'No conversation yet. Your first question starts one.',
  noMatch: 'No conversation matches.',
  rename: 'Rename',
  saveTitle: 'Save the title',
  cancel: 'Cancel',
  remove: 'Delete',
  removeConfirm: 'Delete',
  removePlan: (s) => `Delete “${s.title}” and its ${s.turn_count} ${s.turn_count === 1 ? 'turn' : 'turns'}. This cannot be undone.`,
  unshareFirst: 'It is shared. Unshare it before deleting it.',
  turns: (n) => `${n} ${n === 1 ? 'turn' : 'turns'}`,
  you: 'You',
  copy: 'Copy the answer',
  copied: 'Copied',
  again: 'Ask again',
  answerOf: (i, n) => `Answer ${i} of ${n}`,
  previousAnswer: 'Previous answer',
  nextAnswer: 'Next answer',
  working: 'The memory is reading…',
  placeholder: 'Ask the memory…',
  replyPlaceholder: 'Reply to the memory…',
  send: 'Ask',
  reply: 'Reply',
  composerLabel: 'Your question to the memory',
  shared: 'Shared',
  noAnswer: 'The memory gave no reasoned answer; the closest records follow.',
};

export type ConversationPart =
  | 'list' | 'listHeader' | 'listSearch' | 'listItems' | 'listItem' | 'listOpen' | 'listTitle' | 'listFacts' | 'listActions' | 'listUnfold' | 'listEmpty'
  | 'thread' | 'group' | 'question' | 'asker' | 'answer' | 'answerBody' | 'answerFoot' | 'pager' | 'pending' | 'error'
  | 'composer' | 'composerInput' | 'composerFoot' | 'send'
  | 'iconButton' | 'button' | 'confirm' | 'input';

export type ConversationClassNames = Partial<Record<ConversationPart, string>>;

interface PartsProps {
  classNames?: ConversationClassNames;
  icons?: Partial<ConversationIcons>;
  labels?: Partial<ConversationLabels>;
}

function useParts(p: PartsProps) {
  const icons = { ...defaultConversationIcons, ...p.icons };
  const labels = { ...defaultConversationLabels, ...p.labels };
  const part = (name: ConversationPart, extra?: string) => ({ 'data-mw-part': name, className: [p.classNames?.[name], extra].filter(Boolean).join(' ') || undefined });
  return { icons, labels, part };
}

const dayTime = (iso: string | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ── the list ────────────────────────────────────────────────────────────────

export interface ConversationListProps extends PartsProps {
  state: MemoryConversationsState;
  /** A conversation this place cannot continue (opened elsewhere) is a link instead. */
  hrefFor?: (s: MemoryConversationSummary) => string | null;
  /** Extra facts on a row: where it was opened, whom it is shared with. */
  renderFacts?: (s: MemoryConversationSummary) => ReactNode;
  /** Called after a conversation is opened from the list (to close a drawer). */
  onOpened?: (id: string) => void;
  /** Rows shown before "show all". Default 8. */
  initialRows?: number;
}

export function ConversationList(props: ConversationListProps) {
  const { state, hrefFor, renderFacts, onOpened, initialRows = 8 } = props;
  const { icons, labels, part } = useParts(props);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(
    () => state.conversations.filter((c) => words.every((w) => `${c.title}\n${c.last_question ?? ''}`.toLowerCase().includes(w))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.conversations, q],
  );
  const rows = all || words.length ? shown : shown.slice(0, initialRows);

  return (
    <div {...part('list')}>
      <div {...part('listHeader')}>
        <label {...part('listSearch')}>
          {icons.search}
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{labels.search}</span>
          <input {...part('input')} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} />
        </label>
        <button type="button" {...part('iconButton')} onClick={() => state.startNew()} aria-label={labels.newConversation} title={labels.newConversation}>
          {icons.newConversation}
        </button>
      </div>
      {state.listed && state.conversations.length === 0 && <p {...part('listEmpty')}>{labels.empty}</p>}
      {state.listed && state.conversations.length > 0 && shown.length === 0 && <p {...part('listEmpty')}>{labels.noMatch}</p>}
      <ul {...part('listItems')}>
        {rows.map((c) => {
          const href = hrefFor?.(c) ?? null;
          const isActive = state.active?.id === c.id;
          const facts = (
            <span {...part('listFacts')}>
              <span>{labels.turns(c.turn_count)}</span>
              <span>{dayTime(c.last_at ?? c.updated_at)}</span>
              {c.shared_in && <span title={labels.shared} aria-label={labels.shared}>{icons.shared}</span>}
              {renderFacts?.(c)}
            </span>
          );
          return (
            <li key={c.id} {...part('listItem')} data-active={isActive ? 'true' : undefined}>
              {editing?.id === c.id ? (
                <form
                  style={{ display: 'flex', flex: 1, gap: 6, alignItems: 'center' }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await state.rename(c.id, editing.title)) setEditing(null);
                  }}
                >
                  <input {...part('input')} autoFocus value={editing.title} maxLength={160} onChange={(e) => setEditing({ id: c.id, title: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} aria-label={labels.rename} />
                  <button type="submit" {...part('iconButton')} aria-label={labels.saveTitle} title={labels.saveTitle} disabled={!editing.title.trim()}>{icons.confirm}</button>
                  <button type="button" {...part('iconButton')} aria-label={labels.cancel} title={labels.cancel} onClick={() => setEditing(null)}>{icons.close}</button>
                </form>
              ) : href ? (
                <a href={href} {...part('listOpen')}>
                  {icons.conversation}
                  <span {...part('listTitle')}>{c.title}</span>
                  {facts}
                </a>
              ) : (
                <button
                  type="button"
                  {...part('listOpen')}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={async () => {
                    await state.open(c.id);
                    onOpened?.(c.id);
                  }}
                >
                  {icons.conversation}
                  <span {...part('listTitle')}>{c.title}</span>
                  {facts}
                </button>
              )}
              {editing?.id !== c.id && (
                <span {...part('listActions')}>
                  {state.adapter.rename && (
                    <button type="button" {...part('iconButton')} aria-label={`${labels.rename}: ${c.title}`} title={labels.rename} onClick={() => setEditing({ id: c.id, title: c.title })}>{icons.rename}</button>
                  )}
                  {state.adapter.remove && (
                    <button type="button" {...part('iconButton')} aria-label={`${labels.remove}: ${c.title}`} title={labels.remove} aria-expanded={removing === c.id} onClick={() => setRemoving(removing === c.id ? null : c.id)}>{icons.remove}</button>
                  )}
                </span>
              )}
              {removing === c.id && (
                <div {...part('listUnfold')} role="group" aria-label={labels.remove}>
                  <p>{c.shared_in ? labels.unshareFirst : labels.removePlan(c)}</p>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {!c.shared_in && (
                      <button type="button" {...part('confirm')} onClick={async () => { if (await state.remove(c.id)) setRemoving(null); }}>
                        {icons.remove}<span>{labels.removeConfirm}</span>
                      </button>
                    )}
                    <button type="button" {...part('iconButton')} aria-label={labels.cancel} title={labels.cancel} onClick={() => setRemoving(null)}>{icons.close}</button>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!all && !words.length && shown.length > initialRows && (
        <button type="button" {...part('button')} onClick={() => setAll(true)}>
          {icons.conversation}<span>{`${shown.length - initialRows} more`}</span>
        </button>
      )}
    </div>
  );
}

// ── the thread ──────────────────────────────────────────────────────────────

export interface ConversationThreadProps extends PartsProps {
  state: MemoryConversationsState;
  /** The reader's wheel id: their own questions read "You". */
  me?: string;
  /** How an answer is drawn: markdown, with the host's own renderer. Default: its text. */
  renderAnswer?: (turn: MemoryConversationTurn) => ReactNode;
  /** The sources under an answer, as the host shows and links them. */
  renderSources?: (turn: MemoryConversationTurn) => ReactNode;
  /** The host's own actions on an answer (hear it, translate it). */
  renderAnswerActions?: (turn: MemoryConversationTurn) => ReactNode;
  /** What a turn was asked with, how far it reached: a line under the question. */
  renderQuestionFacts?: (turn: MemoryConversationTurn) => ReactNode;
}

export function ConversationThread(props: ConversationThreadProps) {
  const { state, me, renderAnswer, renderSources, renderAnswerActions, renderQuestionFacts } = props;
  const { icons, labels, part } = useParts(props);
  const groups = useMemo(() => turnGroups(state.active?.turns ?? []), [state.active]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  const count = state.active?.turns.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [count, state.pending]);

  return (
    <div {...part('thread')} role="log" aria-live="polite" aria-busy={state.busy === 'ask' || state.busy === 'open'}>
      {groups.map((g, gi) => {
        const at = Math.min(picked[g.id] ?? g.turns.length - 1, g.turns.length - 1);
        const t = g.turns[at];
        const latest = gi === groups.length - 1;
        const asker = t.asked_by === me ? labels.you : t.asked_by_name || t.asked_by;
        return (
          <section key={g.id} {...part('group')}>
            <div {...part('question')}>
              <span {...part('asker')}>{asker}</span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{t.question}</p>
              {renderQuestionFacts?.(t)}
            </div>
            <div {...part('answer')}>
              <div {...part('answerBody')}>
                {t.mode === 'dialectic' && t.answer ? (renderAnswer ? renderAnswer(t) : <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{t.answer}</p>) : <p style={{ margin: 0 }}>{t.note || labels.noAnswer}</p>}
              </div>
              {renderSources?.(t)}
              <div {...part('answerFoot')}>
                {g.turns.length > 1 && (
                  <span {...part('pager')}>
                    <button type="button" {...part('iconButton')} aria-label={labels.previousAnswer} title={labels.previousAnswer} disabled={at === 0} onClick={() => setPicked({ ...picked, [g.id]: at - 1 })}>{icons.previous}</button>
                    <span>{labels.answerOf(at + 1, g.turns.length)}</span>
                    <button type="button" {...part('iconButton')} aria-label={labels.nextAnswer} title={labels.nextAnswer} disabled={at === g.turns.length - 1} onClick={() => setPicked({ ...picked, [g.id]: at + 1 })}>{icons.next}</button>
                  </span>
                )}
                {t.answer && (
                  <button
                    type="button"
                    {...part('iconButton')}
                    aria-label={copied === t.id ? labels.copied : labels.copy}
                    title={copied === t.id ? labels.copied : labels.copy}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(t.answer ?? '');
                        setCopied(t.id);
                        setTimeout(() => setCopied((c) => (c === t.id ? null : c)), 1600);
                      } catch {
                        /* the clipboard was refused; nothing to undo */
                      }
                    }}
                  >
                    {copied === t.id ? icons.copied : icons.copy}
                  </button>
                )}
                {renderAnswerActions?.(t)}
                {latest && !state.pending && state.adapter && (
                  <button type="button" {...part('iconButton')} aria-label={labels.again} title={labels.again} disabled={state.busy !== null} onClick={() => { setPicked({ ...picked, [g.id]: g.turns.length }); void state.askAgain(); }}>
                    {icons.again}
                  </button>
                )}
              </div>
            </div>
          </section>
        );
      })}
      {state.pending && (
        <section {...part('group')} data-pending="true">
          <div {...part('question')}>
            <span {...part('asker')}>{labels.you}</span>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{state.pending}</p>
          </div>
          <div {...part('pending')} role="status">
            <span data-mw-spin="true">{icons.working}</span>
            <span>{labels.working}</span>
          </div>
        </section>
      )}
      {state.error && (
        <p {...part('error')} role="alert">
          {state.error}
        </p>
      )}
      <div ref={end} />
    </div>
  );
}

// ── the composer ────────────────────────────────────────────────────────────

export interface ConversationComposerProps extends PartsProps {
  state: MemoryConversationsState;
  /** When the reader may not ask: why, shown in place of the send button's use. */
  disabledReason?: string | null;
  /** The host's own actions beside the box (record what is said); `append` adds text to the box. */
  renderActions?: (api: { append: (text: string) => void; busy: boolean }) => ReactNode;
  /** Shown under the box (the reach, the prompt in use). */
  footnote?: ReactNode;
  autoFocus?: boolean;
  maxLength?: number;
}

export function ConversationComposer(props: ConversationComposerProps) {
  const { state, disabledReason, renderActions, footnote, autoFocus, maxLength = 2000 } = props;
  const { icons, labels, part } = useParts(props);
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement | null>(null);
  const replying = !!state.active;
  const blocked = !!disabledReason;
  const busy = state.busy === 'ask';

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const send = async () => {
    if (blocked || busy || !text.trim()) return;
    const asked = text;
    setText('');
    if (!(await state.ask(asked))) setText(asked);
    box.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a new line; a composing input method keeps its Enter.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const append = (said: string) => setText((t) => (t.trim() ? `${t.trimEnd()} ${said.trim()}` : said.trim()));

  return (
    <form {...part('composer')} onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <textarea
        ref={box}
        {...part('composerInput')}
        rows={1}
        value={text}
        maxLength={maxLength}
        autoFocus={autoFocus}
        aria-label={labels.composerLabel}
        placeholder={replying ? labels.replyPlaceholder : labels.placeholder}
        disabled={blocked}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div {...part('composerFoot')}>
        {renderActions?.({ append, busy })}
        <span style={{ flex: 1 }}>{blocked ? disabledReason : footnote}</span>
        <button type="submit" {...part('send')} disabled={blocked || busy || !text.trim()} aria-label={replying ? labels.reply : labels.send} title={replying ? labels.reply : labels.send}>
          {busy ? <span data-mw-spin="true">{icons.working}</span> : icons.send}
          <span>{replying ? labels.reply : labels.send}</span>
        </button>
      </div>
    </form>
  );
}
