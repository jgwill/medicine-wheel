/**
 * @medicine-wheel/honcho — the wheel's projection into Honcho.
 *
 * The wheel is canonical: beats, ceremonies, nodes, edges, provenance. Honcho
 * (https://honcho.dev, self-hosted at miadisabelle/mia-honcho) is memory that
 * reasons: it takes messages, works over them in the background, and keeps an
 * evolving representation of every peer it observes. This package is the door
 * between the two, in three moves:
 *
 * 1. **Project** — a beat or a ceremony becomes one Honcho message in a session
 *    keyed by the ceremony (or cycle) it belongs to. Everything on the wheel is
 *    projected as is; nothing is filtered or gated here.
 * 2. **Recall** — before a speaker speaks again, ask Honcho what it has come to
 *    understand about them (representation, a fast read) or ask it a question
 *    (dialectic chat, a reasoned answer).
 * 3. **Project back** — a derived conclusion returns to the wheel as a
 *    `knowledge` node carrying `metadata.kind: "memory_projection"`, with the
 *    source ids, the status (`inferred` | `confirmed` | `rejected`) and who
 *    derived it, so the wheel stays inspectable.
 *
 * Honcho names its resources with `^[a-zA-Z0-9_-]+$`; wheel ids carry colons
 * (`node:human:…`, `ceremony:…`). {@link honchoIdFor} is the deterministic
 * bridge, and the original wheel id always travels in metadata as `wheel_id`.
 *
 * Zero dependencies beyond `fetch`, and `/v3` only.
 *
 * An earlier version of this comment said the published `@honcho-ai/sdk` speaks
 * `/v2` and a 3.x server 404s it. That was not true. Checked on 2026-09-19
 * against the deployed 3.0.11: both 2.2.0 and 2.5.0 call `/v3/workspaces/...`,
 * and a live `peer.chat` through the SDK answers. The SDK is a working option.
 *
 * What this package is for instead: the wheel's packages ship to npm, so a
 * vendor SDK here is a runtime dependency on every one of them, for a river
 * that needs get-or-create and append and nothing else. And the useful part is
 * not the transport — it is {@link projectBeat}, {@link projectCeremony},
 * {@link projectDiaryEntry}, {@link honchoIdFor} and
 * {@link memoryProjectionNode}, which are the wheel's own ontology and have no
 * equivalent in any SDK.
 */

import type { CeremonyLog, NarrativeBeat, NodeType, DirectionName } from '@medicine-wheel/ontology-core';

export type { CeremonyLog, NarrativeBeat };

// ── errors ──────────────────────────────────────────────────────────────────

export class HonchoClientError extends Error {
  constructor(
    message: string,
    /** 502 when Honcho could not be reached; 503 when no URL was configured; else Honcho's own status. */
    public readonly status: number,
    public readonly url: string,
    /** Honcho's response body when it refused, truncated. */
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'HonchoClientError';
  }
}

// ── ids ─────────────────────────────────────────────────────────────────────

/** Honcho's `RESOURCE_NAME_PATTERN` (src/schemas/api.py). */
export const HONCHO_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * A wheel id (or a plain name) as a Honcho resource id. Deterministic, so the
 * same node always lands on the same peer: `node:human:1726:abc` →
 * `node-human-1726-abc`, `Guillaume Isabelle` → `Guillaume-Isabelle`,
 * `Éloïse` → `Eloise`. Anything outside the pattern becomes `-`; runs collapse;
 * the result is never empty and never longer than Honcho's 512.
 */
export function honchoIdFor(wheelId: string): string {
  const folded = wheelId.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const swapped = folded.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  const out = swapped.slice(0, 512);
  return out.length > 0 ? out : 'unnamed';
}

// ── configuration ───────────────────────────────────────────────────────────

export interface HonchoConfig {
  /** `HONCHO_URL` — e.g. `http://localhost:8133` or `https://honcho.<tailnet>.ts.net`. */
  baseUrl: string;
  /** `HONCHO_WORKSPACE_ID` — default `medicine-wheel`. */
  workspace: string;
  /** `HONCHO_API_KEY` — sent as a bearer when set. A self-hosted Honcho with auth off needs none. */
  apiKey?: string;
}

export const DEFAULT_WORKSPACE = 'medicine-wheel';

/** Reads `HONCHO_URL`, `HONCHO_WORKSPACE_ID`, `HONCHO_API_KEY`. `null` when no URL is set. */
export function honchoFromEnv(env: Record<string, string | undefined> = process.env): HonchoConfig | null {
  const baseUrl = env.HONCHO_URL?.trim();
  if (!baseUrl) return null;
  return {
    baseUrl,
    workspace: env.HONCHO_WORKSPACE_ID?.trim() || DEFAULT_WORKSPACE,
    apiKey: env.HONCHO_API_KEY?.trim() || undefined,
  };
}

// ── Honcho shapes (the subset the wheel touches) ────────────────────────────

export interface HonchoMessage {
  content: string;
  peer_id: string;
  metadata?: Record<string, unknown>;
  /** ISO timestamp; Honcho stamps now when absent. */
  created_at?: string;
}

export interface SessionPeerConfig {
  /** Whether Honcho builds a representation of this peer from this session. Session-scoped. */
  observe_me?: boolean;
  /** Whether this peer builds its own perspective of the others. */
  observe_others?: boolean;
}

export interface HonchoPeer {
  id: string;
  workspace_id?: string;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface HonchoSession {
  id: string;
  workspace_id?: string;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface HonchoStoredMessage extends HonchoMessage {
  id: string;
  session_id: string;
  workspace_id?: string;
}

export interface SessionContext {
  id: string;
  messages: HonchoStoredMessage[];
  summary?: { content: string; [k: string]: unknown } | null;
  peer_representation?: string | null;
  peer_card?: string[] | null;
}

export interface RepresentationOptions {
  /** Read what `peer` understands about this other peer, instead of Honcho's global view. */
  target?: string;
  session_id?: string;
  search_query?: string;
  max_conclusions?: number;
}

export interface ChatOptions {
  session_id?: string;
  target?: string;
  /** `minimal` | `low` | `medium` | `high` | `max` — pick the lowest that answers. */
  reasoning_level?: string;
}

// ── client ──────────────────────────────────────────────────────────────────

export interface HonchoClientOptions extends HonchoConfig {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface HonchoClient {
  readonly baseUrl: string;
  readonly workspace: string;
  health(): Promise<unknown>;
  workspaces: {
    /** Get-or-create the configured workspace. */
    ensure(metadata?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  peers: {
    /** Get-or-create. Honcho returns the existing peer untouched when the id exists. */
    ensure(id: string, metadata?: Record<string, unknown>): Promise<HonchoPeer>;
    list(opts?: { filters?: Record<string, unknown>; page?: number; size?: number }): Promise<HonchoPeer[]>;
    /** What Honcho has come to understand about a peer. A fast read. */
    representation(id: string, opts?: RepresentationOptions): Promise<string>;
    /** Ask Honcho a question about a peer. Live reasoning: seconds, not milliseconds. */
    chat(id: string, query: string, opts?: ChatOptions): Promise<string>;
  };
  sessions: {
    ensure(id: string, opts?: { peers?: Record<string, SessionPeerConfig>; metadata?: Record<string, unknown> }): Promise<HonchoSession>;
    list(opts?: { filters?: Record<string, unknown>; page?: number; size?: number }): Promise<HonchoSession[]>;
    /** Seat peers in an existing session (idempotent for already-seated peers). */
    addPeers(id: string, peers: Record<string, SessionPeerConfig>): Promise<HonchoSession>;
    /** Append messages. Honcho takes at most 100 per call; more are sent in order, in chunks. */
    addMessages(id: string, messages: HonchoMessage[]): Promise<HonchoStoredMessage[]>;
    context(id: string, opts?: { peer_target?: string; tokens?: number; summary?: boolean }): Promise<SessionContext>;
  };
  /** Semantic search across the workspace's messages. */
  search(query: string, opts?: { limit?: number; filters?: Record<string, unknown> }): Promise<HonchoStoredMessage[]>;
}

const MAX_BATCH = 100;

export function createHonchoClient(options: HonchoClientOptions): HonchoClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const workspace = options.workspace || DEFAULT_WORKSPACE;
  // Resolved per call, not captured: a fetch swapped in later (a polyfill, a
  // test stub) is honoured by a client built earlier.
  const doFetch = (...args: Parameters<typeof fetch>) => (options.fetch ?? globalThis.fetch)(...args);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const ws = `/v3/workspaces/${encodeURIComponent(workspace)}`;

  async function call<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(baseUrl + path);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (options.apiKey) headers.authorization = `Bearer ${options.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await doFetch(url.toString(), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    } catch (err) {
      throw new HonchoClientError(`honcho unreachable at ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`, 502, url.toString());
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    if (!res.ok) throw new HonchoClientError(`honcho ${res.status} on ${method} ${path}`, res.status, url.toString(), text.slice(0, 600));
    if (!text) return undefined as T;
    try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
  }

  const items = <T>(page: { items?: T[] } | T[] | undefined): T[] => Array.isArray(page) ? page : page?.items ?? [];

  return {
    baseUrl,
    workspace,
    health: () => call('GET', '/health'),
    workspaces: {
      ensure: (metadata = {}) => call('POST', '/v3/workspaces', { id: workspace, metadata }),
    },
    peers: {
      ensure: (id, metadata = {}) => call('POST', `${ws}/peers`, { id, metadata }),
      list: async (opts = {}) => items(await call<{ items?: HonchoPeer[] }>('POST', `${ws}/peers/list`, opts.filters ? { filters: opts.filters } : {}, { page: opts.page, size: opts.size })),
      representation: async (id, opts = {}) => (await call<{ representation: string }>('POST', `${ws}/peers/${encodeURIComponent(id)}/representation`, opts)).representation ?? '',
      chat: async (id, query, opts = {}) => {
        const out = await call<{ content?: string } | string>('POST', `${ws}/peers/${encodeURIComponent(id)}/chat`, { query, stream: false, ...opts });
        return typeof out === 'string' ? out : out?.content ?? '';
      },
    },
    sessions: {
      ensure: (id, opts = {}) => call('POST', `${ws}/sessions`, { id, metadata: opts.metadata ?? {}, ...(opts.peers ? { peers: opts.peers } : {}) }),
      list: async (opts = {}) => items(await call<{ items?: HonchoSession[] }>('POST', `${ws}/sessions/list`, opts.filters ? { filters: opts.filters } : {}, { page: opts.page, size: opts.size })),
      addPeers: (id, peers) => call('POST', `${ws}/sessions/${encodeURIComponent(id)}/peers`, peers),
      addMessages: async (id, messages) => {
        const stored: HonchoStoredMessage[] = [];
        for (let i = 0; i < messages.length; i += MAX_BATCH) {
          const chunk = messages.slice(i, i + MAX_BATCH);
          stored.push(...(await call<HonchoStoredMessage[]>('POST', `${ws}/sessions/${encodeURIComponent(id)}/messages`, { messages: chunk })));
        }
        return stored;
      },
      context: (id, opts = {}) => call('GET', `${ws}/sessions/${encodeURIComponent(id)}/context`, undefined, { peer_target: opts.peer_target, tokens: opts.tokens, summary: opts.summary }),
    },
    search: async (query, opts = {}) => items(await call<HonchoStoredMessage[] | { items?: HonchoStoredMessage[] }>('POST', `${ws}/search`, { query, limit: opts.limit ?? 10, ...(opts.filters ? { filters: opts.filters } : {}) })),
  };
}

// ── projection: wheel → Honcho ──────────────────────────────────────────────

/** The peer the wheel itself speaks as — ceremony logs, beats with no speaker. */
export const WHEEL_PEER = 'medicine-wheel';

/** One wheel record, ready to land in Honcho. */
export interface Projection {
  /** Honcho session id — the ceremony (or cycle) the record belongs to. */
  session_id: string;
  /** Peers to seat, with their observation config. */
  peers: Record<string, SessionPeerConfig>;
  /** Peer metadata to write on ensure (carries `wheel_id`). */
  peer_metadata: Record<string, Record<string, unknown>>;
  session_metadata: Record<string, unknown>;
  messages: HonchoMessage[];
}

const seat = (): SessionPeerConfig => ({ observe_me: true, observe_others: false });

function peerEntry(wheelRef: string): [string, Record<string, unknown>] {
  return [honchoIdFor(wheelRef), { wheel_id: wheelRef }];
}

/**
 * Which Honcho session a beat lands in: its first ceremony, else its cycle,
 * else the wheel's own standing session. A ceremony's beats and the ceremony
 * log therefore share one session, which is what lets Honcho reason over them
 * together.
 */
export function sessionIdForBeat(beat: Pick<NarrativeBeat, 'ceremonies' | 'cycle_id'>): string {
  if (beat.ceremonies?.length) return honchoIdFor(beat.ceremonies[0]);
  if (beat.cycle_id) return honchoIdFor(beat.cycle_id);
  return WHEEL_PEER;
}

export function sessionIdForCeremony(ceremony: Pick<CeremonyLog, 'id'>): string {
  return honchoIdFor(ceremony.id);
}

/**
 * A labelled line for a list field, or nothing when it is empty.
 *
 * Tolerant of a non-array on purpose: these fields reach the wheel over REST,
 * where `learnings: "one thing"` is a shape a caller can send and the store
 * will keep. Projecting it as one item beats throwing on a record the wheel
 * already holds.
 */
function list(label: string, xs: unknown): string {
  const items = Array.isArray(xs) ? xs.map(String) : typeof xs === 'string' && xs ? [xs] : [];
  return items.length ? `\n${label}: ${items.join(', ')}` : '';
}

/** A beat as one Honcho message from its speaker, witnessed by its witnesses. */
export function projectBeat(beat: NarrativeBeat): Projection {
  const speaker = beat.speaker ? peerEntry(beat.speaker) : [WHEEL_PEER, { wheel_id: WHEEL_PEER }] as [string, Record<string, unknown>];
  const peers: Projection['peers'] = { [speaker[0]]: seat() };
  const peer_metadata: Projection['peer_metadata'] = { [speaker[0]]: speaker[1] };
  for (const w of beat.witnesses ?? []) {
    const [id, meta] = peerEntry(w);
    peers[id] ??= seat();
    peer_metadata[id] ??= meta;
  }
  const content =
    `[${beat.direction}] ${beat.title}\n${beat.description}` +
    (beat.prose ? `\n\n${beat.prose}` : '') +
    list('Learnings', beat.learnings) +
    list('Relations honored', beat.relations_honored);
  return {
    session_id: sessionIdForBeat(beat),
    peers,
    peer_metadata,
    session_metadata: { wheel_kind: beat.ceremonies?.length ? 'ceremony' : beat.cycle_id ? 'cycle' : 'wheel', wheel_id: beat.ceremonies?.[0] ?? beat.cycle_id ?? WHEEL_PEER },
    messages: [{
      content,
      peer_id: speaker[0],
      created_at: beat.timestamp,
      metadata: {
        wheel_kind: 'beat',
        wheel_id: beat.id,
        direction: beat.direction,
        act: beat.act,
        ceremonies: beat.ceremonies ?? [],
        ...(beat.cycle_id ? { cycle_id: beat.cycle_id } : {}),
        ...(beat.witnesses?.length ? { witnesses: beat.witnesses } : {}),
        ...(beat.origin ? { origin: beat.origin } : {}),
      },
    }],
  };
}

/** A ceremony log as one message spoken by the wheel, with every participant seated. */
export function projectCeremony(ceremony: CeremonyLog): Projection {
  const peers: Projection['peers'] = { [WHEEL_PEER]: seat() };
  const peer_metadata: Projection['peer_metadata'] = { [WHEEL_PEER]: { wheel_id: WHEEL_PEER } };
  for (const p of ceremony.participants ?? []) {
    const [id, meta] = peerEntry(p);
    peers[id] ??= seat();
    peer_metadata[id] ??= meta;
  }
  const content =
    `Ceremony: ${ceremony.type} (${ceremony.direction})` +
    list('Participants', ceremony.participants) +
    list('Intentions', ceremony.intentions) +
    list('Medicines', ceremony.medicines_used) +
    list('Relations honored', ceremony.relations_honored) +
    (ceremony.research_context ? `\nContext: ${ceremony.research_context}` : '') +
    (ceremony.episode_path ? `\nEpisode: ${ceremony.episode_path}` : '') +
    (ceremony.circle_id ? `\nCircle: ${ceremony.circle_id}` : '') +
    (ceremony.subject_id ? `\nAbout: ${ceremony.subject_id}` : '');
  return {
    session_id: sessionIdForCeremony(ceremony),
    peers,
    peer_metadata,
    session_metadata: {
      wheel_kind: 'ceremony',
      wheel_id: ceremony.id,
      type: ceremony.type,
      direction: ceremony.direction,
      ...(ceremony.episode_path ? { episode_path: ceremony.episode_path } : {}),
      ...(ceremony.episode_number !== undefined ? { episode_number: ceremony.episode_number } : {}),
      ...(ceremony.circle_id ? { circle_id: ceremony.circle_id } : {}),
      ...(ceremony.subject_id ? { subject_id: ceremony.subject_id } : {}),
    },
    messages: [{
      content,
      peer_id: WHEEL_PEER,
      created_at: ceremony.timestamp,
      metadata: {
        wheel_kind: 'ceremony',
        wheel_id: ceremony.id,
        type: ceremony.type,
        direction: ceremony.direction,
        ...(ceremony.source ? { source: ceremony.source } : {}),
      },
    }],
  };
}

/**
 * The shape of a ceremonial diary entry this package reads — structural, so
 * `@medicine-wheel/storage-provider`'s `DiaryEntryRecord` satisfies it without
 * this package depending on the provider.
 */
export interface DiaryEntryLike {
  id: string;
  timestamp: string;
  /** The participant whose voice this entry carries. */
  participant: string;
  agent?: string;
  phase: string;
  entryType: string;
  content: string;
  metadata?: { ceremony_id?: unknown; tags?: unknown; [k: string]: unknown };
  /** `chronicle:<episode-folder>` when the entry writes into an episode. */
  chronicle?: string;
}

/** Where a diary entry lands: its ceremony, else its chronicle episode, else the wheel's standing session. */
export function sessionIdForDiaryEntry(entry: Pick<DiaryEntryLike, 'metadata' | 'chronicle'>): string {
  const ceremony = entry.metadata?.ceremony_id;
  if (typeof ceremony === 'string' && ceremony) return honchoIdFor(ceremony);
  if (entry.chronicle) return honchoIdFor(entry.chronicle);
  return WHEEL_PEER;
}

/** A diary entry as one message in the participant's voice. */
export function projectDiaryEntry(entry: DiaryEntryLike): Projection {
  const [peerId, meta] = peerEntry(entry.participant);
  const ceremony = entry.metadata?.ceremony_id;
  const wheelSession = typeof ceremony === 'string' && ceremony ? ceremony : entry.chronicle ?? WHEEL_PEER;
  const tags = Array.isArray(entry.metadata?.tags) ? (entry.metadata!.tags as unknown[]).map(String) : undefined;
  return {
    session_id: sessionIdForDiaryEntry(entry),
    peers: { [peerId]: seat() },
    peer_metadata: { [peerId]: meta },
    session_metadata: {
      wheel_kind: typeof ceremony === 'string' && ceremony ? 'ceremony' : entry.chronicle ? 'chronicle' : 'wheel',
      wheel_id: wheelSession,
    },
    messages: [{
      content: `[${entry.phase} · ${entry.entryType}] ${entry.content}` + list('Tags', tags),
      peer_id: peerId,
      created_at: entry.timestamp,
      metadata: {
        wheel_kind: 'diary',
        wheel_id: entry.id,
        phase: entry.phase,
        entry_type: entry.entryType,
        ...(entry.agent ? { agent: entry.agent } : {}),
        ...(entry.chronicle ? { chronicle: entry.chronicle } : {}),
      },
    }],
  };
}

export interface Projected {
  session_id: string;
  peers: string[];
  messages: number;
}

/** Land a projection: ensure the workspace, peers and session, then append the messages. */
export async function project(client: HonchoClient, projection: Projection): Promise<Projected> {
  await client.workspaces.ensure();
  for (const [id, metadata] of Object.entries(projection.peer_metadata)) await client.peers.ensure(id, metadata);
  await client.sessions.ensure(projection.session_id, { peers: projection.peers, metadata: projection.session_metadata });
  // A session that already existed keeps its seating; add any newcomer.
  await client.sessions.addPeers(projection.session_id, projection.peers);
  const stored = await client.sessions.addMessages(projection.session_id, projection.messages);
  return { session_id: projection.session_id, peers: Object.keys(projection.peers), messages: stored.length };
}

// ── projection back: Honcho → wheel ─────────────────────────────────────────

export type MemoryProjectionKind = 'pattern' | 'summary' | 'open_question' | 'preference';
export type MemoryProjectionStatus = 'inferred' | 'confirmed' | 'rejected';

/** A conclusion derived in Honcho, returning to the wheel with its provenance. */
export interface MemoryProjection {
  source: 'honcho';
  /** Wheel ids (beats, ceremonies) or Honcho message ids the conclusion rests on. */
  sourceEventIds: string[];
  /** The Honcho peer the conclusion is about. */
  peerId: string;
  kind: MemoryProjectionKind;
  content: string;
  status: MemoryProjectionStatus;
  generatedAt: string;
  /** The model or agent that derived it. */
  derivedBy?: string;
}

export const MEMORY_PROJECTION_KIND = 'memory_projection';

/** The `knowledge` node a memory projection becomes on the wheel. `NodeType` stays closed; the kind rides metadata. */
export interface MemoryProjectionNode {
  id: string;
  name: string;
  type: NodeType;
  direction: DirectionName;
  description: string;
  metadata: Record<string, unknown> & { kind: typeof MEMORY_PROJECTION_KIND };
  created_at: string;
  updated_at: string;
}

export function memoryProjectionNode(p: MemoryProjection, id?: string): MemoryProjectionNode {
  const now = new Date().toISOString();
  const nodeId = id ?? `node:knowledge:${MEMORY_PROJECTION_KIND}:${honchoIdFor(p.peerId)}:${Date.parse(p.generatedAt) || Date.now()}`;
  const head = p.content.split('\n')[0].slice(0, 80);
  return {
    id: nodeId,
    name: `${p.kind}: ${head}`,
    type: 'knowledge',
    // West: what has been worked over and made into understanding.
    direction: 'west',
    description: p.content,
    metadata: {
      kind: MEMORY_PROJECTION_KIND,
      source: p.source,
      source_event_ids: p.sourceEventIds,
      peer_id: p.peerId,
      projection_kind: p.kind,
      status: p.status,
      generated_at: p.generatedAt,
      ...(p.derivedBy ? { derived_by: p.derivedBy } : {}),
    },
    created_at: now,
    updated_at: now,
  };
}
