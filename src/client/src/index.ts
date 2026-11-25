/**
 * @medicine-wheel/client — the door to a wheel over HTTP.
 *
 * Until 0.14.0 no package in the suite could reach a wheel over HTTP
 * (`rispecs/client.spec.md`, measured 2026-09-08); the one working client was
 * sealed inside the MCP server and every consumer (Miadi, gmtermux,
 * forgewright) hand-rolled its own. This package is that door, extracted from
 * the MCP's `http-store.ts` and from Miadi's `lib/chronicle-wheel.ts` seed.
 *
 * Three commitments, each answering one open question of the spec:
 * 1. It sits BESIDE `storage-provider`, it does not wrap it. A consumer on the
 *    same host as the store may read the provider; a consumer on another host
 *    reads this.
 * 2. It carries the paging honesty the routes gained in 0.9–0.11: every list
 *    returns `count`, `total` (when the wheel reports it) and `truncated`, so a
 *    caller can tell a page from an answer. `limit: 'all'` asks for the whole
 *    store, always.
 * 3. It fails fast and lets the caller decide. No retry. An unreachable wheel
 *    is an error with status 502; a refusal carries the wheel's status and body.
 */

import type {
  CeremonyLog,
  CeremonyType,
  DirectionName,
  NarrativeBeat,
  NodeType,
  RelationalEdge,
  RelationalNode,
  RelationContext,
  RelationGrant,
  RelationState,
} from '@medicine-wheel/ontology-core';
import type { DiaryEntryRecord } from '@medicine-wheel/storage-provider';
import type {
  AboutInput,
  AskInput,
  ConverseInput,
  ConverseResult,
  MemoryAnswer,
  MemoryConversation,
  MemoryConversationFilters,
  MemoryConversationPatch,
  MemoryConversationSummary,
  MemoryProviderStatus,
  SearchInput,
} from '@medicine-wheel/memory';

export type { CeremonyLog, CeremonyType, DirectionName, NarrativeBeat, NodeType, RelationalEdge, RelationalNode, RelationContext, RelationGrant, RelationState, DiaryEntryRecord };

// ── errors ──────────────────────────────────────────────────────────────────

export class MedicineWheelClientError extends Error {
  constructor(
    message: string,
    /** 502 when the wheel could not be reached or refused; 503 when no URL was configured; else the wheel's own status. */
    public readonly status: number,
    public readonly url: string,
    /** The wheel's response body when it refused, truncated. */
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'MedicineWheelClientError';
  }
}

// ── paging ──────────────────────────────────────────────────────────────────

export type Limit = number | 'all';

/** The honesty contract: a caller must be able to tell a page from an answer. */
export interface Paged<T> {
  items: T[];
  /** Items in this page. */
  count: number;
  /** The whole collection, when the wheel reports it. */
  total?: number;
  /** What the filters selected before paging, when the wheel reports it. */
  matched?: number;
  /** True when `count < matched` (or `< total` unfiltered). */
  truncated: boolean;
  provider?: string;
}

// ── inputs ──────────────────────────────────────────────────────────────────

export interface ListNodesOptions {
  type?: NodeType;
  direction?: DirectionName;
  /** The wheel's `kind` metadata query (e.g. `chronicle_episode`). */
  kind?: string;
  limit?: Limit;
}

export interface NewNode {
  id?: string;
  name: string;
  type: NodeType;
  direction?: DirectionName;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface NodePatch {
  name?: string;
  type?: NodeType;
  description?: string;
  direction?: DirectionName | null;
  metadata?: Record<string, unknown>;
}

export interface ListEdgesOptions {
  from?: string;
  to?: string;
  limit?: Limit;
}

export interface NewEdge {
  from_id: string;
  to_id: string;
  relationship_type: string;
  strength?: number;
  ceremony_honored?: boolean;
  obligations?: string[];
  /** Why the two are related, in the words of whoever weaves the relation. */
  description?: string;
  /**
   * A governed kinship-edge name. The relation is then identified by its two
   * ends and this name, beside the one relation the pair holds without any.
   * When given, `relationship_type` must say the same name.
   */
  kinship_type?: string;
  /** What authorizes and bounds the relation. */
  context?: RelationContext;
}

// ── agent kinship (rispecs/agent-kinship.spec.md) ───────────────────────────
// The shapes of `@medicine-wheel/community-identity`'s agent kinship, restated
// here because this package is built before that one and cannot import it.

/** One relation between an agent and a person, in the words of `said_by`. */
export interface KinStatement {
  person_id: string;
  words: string;
  said_by: string;
}

/**
 * Two agents speak with each other. For a relation already on the wheel, what
 * is left out stays as it is. `said_by` comes only with `words`. Every move
 * of the state names who makes it in `state_set_by`.
 */
export interface DialogueStatement {
  agent_id: string;
  words?: string;
  said_by?: string;
  state?: RelationState;
  state_set_by?: string;
  authorized_by?: string;
  valid_when?: string | null;
  forbidden_when?: string | null;
}

export interface AgentKinshipInput {
  comes_from?: KinStatement[];
  responsibility_held_by?: KinStatement[];
  /** `grants`: what the person gives the agent, chosen by that person. With none, nothing passes. */
  serves?: Array<KinStatement & { grants?: RelationGrant[] }>;
  speaks_with?: DialogueStatement[];
}

/** A person defines an agent they made: the agent's seat and its relations, written together. */
export interface DefineAgentInput extends AgentKinshipInput {
  agent: { name: string; role: string; id?: string } & Record<string, unknown>;
  comes_from: KinStatement[];
}

export interface KinRead {
  words?: string;
  said_by?: string;
  since: string;
}

export interface AgentKinshipRead {
  comes_from: Array<KinRead & { person_id: string }>;
  responsibility_held_by: Array<KinRead & { person_id: string }>;
  serves: Array<KinRead & { person_id: string; grants: RelationGrant[] }>;
  speaks_with: Array<KinRead & { agent_id: string; state: RelationState; state_set_by?: string; authorized_by?: string; valid_when?: string; forbidden_when?: string }>;
}

/** A circle's answer to the agents of its members. */
export interface AgentReadersAnswer {
  answer: 'allowed' | 'refused';
  set_by: string;
  set_at: string;
}

/** One circle a grant reaches through one person, and whether the circle lets the agent read it. */
export interface CircleViewRead {
  agent_id: string;
  circle_id: string;
  through_person_id: string;
  scope: string;
  member_role: 'member' | 'facilitator';
  sees: boolean;
  answer?: AgentReadersAnswer;
}

export interface SeatLabel {
  name: string;
  being?: 'human' | 'agent';
}

/** What the wheel reads back for one person. */
export interface KinshipReading extends AgentKinshipRead {
  person: Record<string, unknown> & { id: string; name: string; being: 'human' | 'agent' };
  /** The circles an agent sees through the persons it serves. A circle that refuses is left out. */
  sees_circles: CircleViewRead[];
  gave_rise_to: Array<KinRead & { agent_id: string }>;
  holds_responsibility_for: Array<KinRead & { agent_id: string }>;
  served_by: Array<KinRead & { agent_id: string; grants: RelationGrant[] }>;
  /** The name of every seat the relations mention by id. */
  seats: Record<string, SeatLabel>;
  circles: Record<string, { name: string }>;
  provider?: string;
}

/** What a circle's page shows: its answer, and the agents within reach of it through a member. */
export interface CircleReadersReading {
  circle: { id: string; name: string };
  agent_readers: AgentReadersAnswer | null;
  when_unset: 'allowed' | 'refused' | 'facilitator';
  readers: Array<CircleViewRead & { sits_in_circle: boolean }>;
  seats: Record<string, SeatLabel>;
  provider?: string;
}

export interface KinshipWritten {
  edges: RelationalEdge[];
  kinship: AgentKinshipRead & { agent_id: string };
}

export interface ListCeremoniesOptions {
  direction?: DirectionName;
  type?: CeremonyType;
  episode_path?: string;
  circle_id?: string;
  /** The opening id: answers "which record closes this ceremony". */
  closes?: string;
  /** The node id: answers "which ceremonies gathered around this node" (0.15.5). */
  subject_id?: string;
  limit?: Limit;
}

/** The wheel mints the id and stamps `timestamp` unless one is given. */
export type NewCeremony = Omit<CeremonyLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string };

export interface ListBeatsOptions {
  direction?: DirectionName;
  /** Only beats that name this ceremony in `ceremonies[]`. Filtered client-side: the beats door has no query. */
  ceremony?: string;
  limit?: Limit;
}

export type NewBeat = Omit<NarrativeBeat, 'id' | 'timestamp' | 'act' | 'ceremonies' | 'learnings' | 'relations_honored'> & {
  id?: string;
  timestamp?: string;
  act?: number;
  ceremonies?: string[];
  learnings?: string[];
  relations_honored?: string[];
};

export interface ListDiaryOptions {
  participant?: string;
  phase?: DiaryEntryRecord['phase'];
  entryType?: DiaryEntryRecord['entryType'];
  chronicle?: string;
  ceremony_id?: string;
  tags?: string[];
  limit?: Limit;
}

export type NewDiaryEntry = Omit<DiaryEntryRecord, 'id' | 'timestamp' | 'metadata'> & {
  id?: string;
  timestamp?: string;
  metadata?: DiaryEntryRecord['metadata'];
  ceremony_id?: string;
};

// ── episodes ────────────────────────────────────────────────────────────────

/** What the wheel holds for one chronicle episode. */
export interface EpisodeOnTheWheel {
  /** The episode folder name, e.g. `2026-09-17-episode-349-…`. */
  episode_path: string;
  /** `chronicle:<episode_path>`: the id the chronicle registers the episode under. */
  node_id: string;
  /** The episode's node, or null when the episode was never registered on this wheel. */
  node: RelationalNode | null;
  /** Every ceremony record bound to the episode by `episode_path`, closings included. */
  ceremonies: CeremonyLog[];
  /** True when the wheel held more ceremonies than the limit let through. */
  truncated: boolean;
}

/** One circle a set of ceremonies was held in. */
export interface CircleHeld {
  circle_id: string;
  /** Ceremonies held in the circle; a closing is not counted as one. */
  ceremonies: number;
  /** Of those, the ones no closing names yet. */
  open: number;
  /** The latest record's timestamp in this circle, opening or closing. */
  last: string;
}

// ── client ──────────────────────────────────────────────────────────────────

export interface ClientOptions {
  baseUrl: string;
  /** Defaults to the global fetch. Inject one in tests. */
  fetch?: typeof fetch;
  /** Per-request timeout. Default 10 000 ms. */
  timeoutMs?: number;
  /** Extra headers on every request (an Authorization header, for a wheel that asks for one). */
  headers?: Record<string, string>;
}

export interface MedicineWheelClient {
  readonly baseUrl: string;
  health(): Promise<{ ok: boolean; status: number }>;
  nodes: {
    list(opts?: ListNodesOptions): Promise<Paged<RelationalNode>>;
    get(id: string): Promise<RelationalNode | null>;
    create(input: NewNode): Promise<RelationalNode>;
    patch(id: string, patch: NodePatch): Promise<RelationalNode>;
    /** Deletes a node. The wheel refuses (409) while relations still hold it; 404 is treated as already gone. */
    remove(id: string): Promise<void>;
  };
  edges: {
    list(opts?: ListEdgesOptions): Promise<Paged<RelationalEdge>>;
    create(input: NewEdge): Promise<RelationalEdge>;
    /** `kinship_type` reaches a relation that names one; left out, the relation the pair holds without any. */
    remove(from_id: string, to_id: string, kinship_type?: string): Promise<void>;
  };
  /**
   * A person and the agents they gave rise to (rispecs/agent-kinship.spec.md):
   * whom an agent comes from, who holds responsibility for it, whom it serves
   * and what that person gives it, and which agents it speaks with. The wheel
   * checks the statement against its records; who may make it stays with the caller.
   */
  kinship: {
    /** A person defines an agent they made. The seat and its relations are written together, or not at all. */
    defineAgent(input: DefineAgentInput): Promise<KinshipWritten & { node: RelationalNode }>;
    /** Relates an agent that already has a node, or says one of its relations again. */
    relate(agent_id: string, input: AgentKinshipInput): Promise<KinshipWritten>;
    /** What the wheel reads back for one person. Null when the wheel holds no such node. */
    of(person_id: string): Promise<KinshipReading | null>;
    /** The agents that read a circle through one of its members. Null when the wheel holds no such node. */
    readersOf(circle_id: string): Promise<CircleReadersReading | null>;
  };
  ceremonies: {
    list(opts?: ListCeremoniesOptions): Promise<Paged<CeremonyLog>>;
    get(id: string): Promise<CeremonyLog | null>;
    create(input: NewCeremony): Promise<CeremonyLog>;
    /** Removes a ceremony nobody entered. The wheel refuses (409) while a closing, a turn or a diary entry holds it; 404 is treated as already gone. */
    remove(id: string): Promise<void>;
  };
  beats: {
    list(opts?: ListBeatsOptions): Promise<Paged<NarrativeBeat>>;
    get(id: string): Promise<NarrativeBeat | null>;
    create(input: NewBeat): Promise<NarrativeBeat & { warnings?: string[] }>;
    /** Add witnesses (a set) and, when given, name the speaker. */
    witness(id: string, patch: { witnesses?: string[]; speaker?: string }): Promise<NarrativeBeat>;
  };
  diary: {
    list(opts?: ListDiaryOptions): Promise<Paged<DiaryEntryRecord>>;
    get(id: string): Promise<DiaryEntryRecord | null>;
    create(input: NewDiaryEntry): Promise<DiaryEntryRecord>;
    remove(id: string): Promise<void>;
  };
  /**
   * The wheel's memory (0.16.0, jgwill/medicine-wheel#149). The wheel confines
   * every answer to the ceremonies the scope reaches; who may name which scope
   * stays with the caller.
   */
  memory: {
    status(): Promise<{ providers: MemoryProviderStatus[]; river?: Record<string, unknown> }>;
    ask(input: AskInput): Promise<MemoryAnswer>;
    search(input: SearchInput): Promise<MemoryAnswer>;
    about(input: AboutInput): Promise<MemoryAnswer>;
    /**
     * Conversations with the memory (jgwill/medicine-wheel#174): a reply is
     * asked with the earlier turns, and every host reads the same ones. The
     * wheel refuses a reply from anyone but the holder to a conversation shared
     * nowhere; who may read one stays with the caller.
     */
    conversations: {
      /** Start one (no `conversation`), reply to one, or ask its latest question again (`retry_of`). */
      converse(input: ConverseInput): Promise<ConverseResult>;
      list(filters?: MemoryConversationFilters): Promise<MemoryConversationSummary[]>;
      /** Null when the wheel holds no such conversation. */
      get(id: string): Promise<MemoryConversation | null>;
      update(id: string, patch: MemoryConversationPatch): Promise<MemoryConversation>;
      delete(id: string): Promise<void>;
    };
  };
  episodes: {
    /**
     * The episode's registered node and the ceremonies bound to it, read in
     * parallel. Accepts the folder name or the `chronicle:` node id. A missing
     * node is `node: null`, not an error: an episode can hold ceremonies
     * before it is registered. `limit` defaults to `'all'`.
     */
    get(episodePath: string, opts?: { limit?: Limit }): Promise<EpisodeOnTheWheel>;
  };
}

function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function limitParam(limit: Limit | undefined): string | undefined {
  if (limit === undefined) return undefined;
  return limit === 'all' ? 'all' : String(limit);
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pageFrom<T>(body: unknown, key: string): Paged<T> {
  if (Array.isArray(body)) {
    return { items: body as T[], count: body.length, truncated: false };
  }
  const record = (body ?? {}) as Record<string, unknown>;
  const items = Array.isArray(record[key]) ? (record[key] as T[]) : [];
  const total = num(record.total);
  const matched = num(record.matched);
  const truncated =
    typeof record.truncated === 'boolean'
      ? record.truncated
      : matched !== undefined
        ? items.length < matched
        : total !== undefined
          ? items.length < total
          : false;
  return {
    items,
    count: items.length,
    ...(total !== undefined ? { total } : {}),
    ...(matched !== undefined ? { matched } : {}),
    truncated,
    ...(typeof record.provider === 'string' ? { provider: record.provider } : {}),
  };
}

/** Build a client for one wheel. Throws (503) when the URL is empty. */
export function createMedicineWheelClient(options: ClientOptions | string): MedicineWheelClient {
  const opts: ClientOptions = typeof options === 'string' ? { baseUrl: options } : options;
  const base = trimBase(opts.baseUrl ?? '');
  if (!base) {
    throw new MedicineWheelClientError('No wheel URL configured', 503, '');
  }
  const doFetch = opts.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new MedicineWheelClientError('No fetch available in this runtime', 503, base);
  }
  const timeoutMs = opts.timeoutMs ?? 10_000;

  /** A memory question waits on a provider's reasoning: seconds, sometimes tens of them. */
  const memoryTimeoutMs = Math.max(timeoutMs, 90_000);

  async function call(path: string, init?: RequestInit, waitMs: number = timeoutMs): Promise<Response> {
    const url = `${base}${path}`;
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await doFetch(url, {
        ...init,
        headers: { ...headers, ...((init?.headers as Record<string, string>) ?? {}) },
        cache: 'no-store',
        signal: AbortSignal.timeout(waitMs),
      } as RequestInit);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new MedicineWheelClientError(`wheel unreachable: ${reason}`, 502, url);
    }
  }

  async function refused(res: Response, what: string): Promise<never> {
    let body = '';
    try {
      body = (await res.text()).slice(0, 500);
    } catch {
      /* the status is enough */
    }
    throw new MedicineWheelClientError(`wheel ${what} (${res.status})`, res.status >= 500 ? 502 : res.status, res.url, body);
  }

  async function json<T>(res: Response, what: string): Promise<T> {
    if (!res.ok) return refused(res, what);
    return (await res.json()) as T;
  }

  function query(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, v);
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  async function getOrNull<T>(path: string, key: string, what: string): Promise<T | null> {
    const res = await call(path);
    if (res.status === 404) return null;
    const body = await json<Record<string, unknown>>(res, what);
    return (body && typeof body === 'object' && key in body ? (body[key] as T) : (body as unknown as T)) ?? null;
  }

  async function listCeremonies(o: ListCeremoniesOptions = {}): Promise<Paged<CeremonyLog>> {
    const res = await call(
      `/api/ceremonies${query({ direction: o.direction, type: o.type, episode_path: o.episode_path, circle_id: o.circle_id, closes: o.closes, subject_id: o.subject_id, limit: limitParam(o.limit) })}`,
    );
    return pageFrom<CeremonyLog>(await json(res, 'refused the ceremony list'), 'ceremonies');
  }

  return {
    baseUrl: base,

    async health() {
      try {
        const res = await call('/api/health');
        return { ok: res.ok, status: res.status };
      } catch (err) {
        return { ok: false, status: err instanceof MedicineWheelClientError ? err.status : 502 };
      }
    },

    nodes: {
      async list(o = {}) {
        const res = await call(`/api/nodes${query({ type: o.type, direction: o.direction, kind: o.kind, limit: limitParam(o.limit) })}`);
        return pageFrom<RelationalNode>(await json(res, 'refused the node list'), 'nodes');
      },
      async get(id) {
        return getOrNull<RelationalNode>(`/api/nodes/${encodeURIComponent(id)}`, 'node', 'refused the node read');
      },
      async create(input) {
        const res = await call('/api/nodes', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<{ node?: RelationalNode }>(res, 'refused the node');
        if (!body?.node?.id) throw new MedicineWheelClientError('wheel returned no node', 502, res.url);
        return body.node;
      },
      async patch(id, patch) {
        const res = await call(`/api/nodes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
        const body = await json<{ node?: RelationalNode }>(res, 'refused the node patch');
        if (!body?.node?.id) throw new MedicineWheelClientError('wheel returned no node', 502, res.url);
        return body.node;
      },
      async remove(id) {
        const res = await call(`/api/nodes/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) await refused(res, 'refused the node removal');
      },
    },

    edges: {
      async list(o = {}) {
        const res = await call(`/api/edges${query({ from: o.from, to: o.to, limit: limitParam(o.limit) })}`);
        return pageFrom<RelationalEdge>(await json(res, 'refused the edge list'), 'edges');
      },
      async create(input) {
        const res = await call('/api/edges', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<{ edge?: RelationalEdge }>(res, 'refused the edge');
        if (!body?.edge) throw new MedicineWheelClientError('wheel returned no edge', 502, res.url);
        return body.edge;
      },
      async remove(from_id, to_id, kinship_type) {
        const res = await call(`/api/edges${query({ from: from_id, to: to_id, kinship_type })}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) await refused(res, 'refused the edge removal');
      },
    },

    kinship: {
      async defineAgent(input) {
        const res = await call('/api/agents', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<Partial<KinshipWritten> & { node?: RelationalNode }>(res, 'refused the agent');
        if (!body?.node?.id || !body.kinship) throw new MedicineWheelClientError('wheel returned no agent', 502, res.url);
        return { node: body.node, edges: body.edges ?? [], kinship: body.kinship };
      },
      async relate(agent_id, input) {
        const res = await call(`/api/nodes/${encodeURIComponent(agent_id)}/kinship`, { method: 'POST', body: JSON.stringify(input) });
        const body = await json<Partial<KinshipWritten>>(res, 'refused the kinship');
        if (!body?.kinship) throw new MedicineWheelClientError('wheel returned no kinship', 502, res.url);
        return { edges: body.edges ?? [], kinship: body.kinship };
      },
      async of(person_id) {
        const res = await call(`/api/nodes/${encodeURIComponent(person_id)}/kinship`);
        if (res.status === 404) return null;
        return json<KinshipReading>(res, 'refused the kinship read');
      },
      async readersOf(circle_id) {
        const res = await call(`/api/nodes/${encodeURIComponent(circle_id)}/readers`);
        if (res.status === 404) return null;
        return json<CircleReadersReading>(res, 'refused the circle readers read');
      },
    },

    ceremonies: {
      list: listCeremonies,
      async get(id) {
        return getOrNull<CeremonyLog>(`/api/ceremonies/${encodeURIComponent(id)}`, 'ceremony', 'refused the ceremony read');
      },
      async create(input) {
        const res = await call('/api/ceremonies', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<{ ceremony?: CeremonyLog }>(res, 'refused the ceremony');
        if (!body?.ceremony?.id) throw new MedicineWheelClientError('wheel returned no ceremony', 502, res.url);
        return body.ceremony;
      },
      async remove(id) {
        const res = await call(`/api/ceremonies/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) await refused(res, 'refused the ceremony removal');
      },
    },

    beats: {
      async list(o = {}) {
        // The beats door returns the whole collection as a bare array and takes no query.
        const res = await call('/api/narrative/beats');
        const all = pageFrom<NarrativeBeat>(await json(res, 'refused the beat list'), 'beats');
        let items = all.items;
        if (o.direction) items = items.filter((b) => b.direction === o.direction);
        if (o.ceremony) items = items.filter((b) => Array.isArray(b.ceremonies) && b.ceremonies.includes(o.ceremony as string));
        const matched = items.length;
        if (typeof o.limit === 'number' && items.length > o.limit) items = items.slice(0, o.limit);
        return { items, count: items.length, total: all.items.length, matched, truncated: items.length < matched, ...(all.provider ? { provider: all.provider } : {}) };
      },
      async get(id) {
        const res = await call(`/api/narrative/beats/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        return json<NarrativeBeat>(res, 'refused the beat read');
      },
      async create(input) {
        const res = await call('/api/narrative/beats', { method: 'POST', body: JSON.stringify(input) });
        const beat = await json<NarrativeBeat & { warnings?: string[] }>(res, 'refused the beat');
        if (!beat?.id) throw new MedicineWheelClientError('wheel returned no beat', 502, res.url);
        return beat;
      },
      async witness(id, patch) {
        const res = await call(`/api/narrative/beats/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
        const beat = await json<NarrativeBeat>(res, 'refused the witnessing');
        if (!beat?.id) throw new MedicineWheelClientError('wheel returned no beat', 502, res.url);
        return beat;
      },
    },

    diary: {
      async list(o = {}) {
        const params: Record<string, string | undefined> = {
          participant: o.participant,
          phase: o.phase,
          entryType: o.entryType,
          chronicle: o.chronicle,
          ceremony_id: o.ceremony_id,
          limit: limitParam(o.limit),
        };
        let q = query(params);
        for (const tag of o.tags ?? []) q += `${q ? '&' : '?'}tag=${encodeURIComponent(tag)}`;
        const res = await call(`/api/diary${q}`);
        return pageFrom<DiaryEntryRecord>(await json(res, 'refused the diary list'), 'entries');
      },
      async get(id) {
        return getOrNull<DiaryEntryRecord>(`/api/diary/${encodeURIComponent(id)}`, 'entry', 'refused the diary read');
      },
      async create(input) {
        const res = await call('/api/diary', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<{ entry?: DiaryEntryRecord }>(res, 'refused the diary entry');
        if (!body?.entry?.id) throw new MedicineWheelClientError('wheel returned no entry', 502, res.url);
        return body.entry;
      },
      async remove(id) {
        const res = await call(`/api/diary/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) await refused(res, 'refused the diary removal');
      },
    },

    memory: {
      async status() {
        return json(await call('/api/memory'), 'refused the memory status');
      },
      async ask(input) {
        return json(await call('/api/memory/ask', { method: 'POST', body: JSON.stringify(input) }, memoryTimeoutMs), 'refused the memory question');
      },
      async search(input) {
        return json(await call('/api/memory/search', { method: 'POST', body: JSON.stringify(input) }, memoryTimeoutMs), 'refused the memory search');
      },
      async about(input) {
        return json(await call('/api/memory/about', { method: 'POST', body: JSON.stringify(input) }, memoryTimeoutMs), 'refused the memory reading');
      },
      conversations: {
        async converse(input) {
          return json(await call('/api/memory/conversations', { method: 'POST', body: JSON.stringify(input) }, memoryTimeoutMs), 'refused the memory conversation');
        },
        async list(filters = {}) {
          const body = await json<{ conversations: MemoryConversationSummary[] }>(
            await call(`/api/memory/conversations${query({ held_by: filters.held_by, opened_from: filters.opened_from, shared_in: filters.shared_in, q: filters.q, limit: filters.limit ? String(filters.limit) : undefined })}`),
            'refused the conversation list',
          );
          return body.conversations ?? [];
        },
        async get(id) {
          const res = await call(`/api/memory/conversations/${encodeURIComponent(id)}`);
          if (res.status === 404) return null;
          return json<MemoryConversation>(res, 'refused the conversation read');
        },
        async update(id, patch) {
          return json(await call(`/api/memory/conversations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }), 'refused the conversation change');
        },
        async delete(id) {
          const res = await call(`/api/memory/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
          if (!res.ok) await refused(res, 'refused the conversation removal');
        },
      },
    },

    episodes: {
      async get(episodePath, o = {}) {
        const episode_path = episodeFolder(episodePath);
        // An empty path would drop the filter and read every ceremony on the wheel as this episode's.
        if (!episode_path) throw new MedicineWheelClientError('episodes.get needs an episode folder name', 400, base);
        const node_id = `chronicle:${episode_path}`;
        const [node, page] = await Promise.all([
          getOrNull<RelationalNode>(`/api/nodes/${encodeURIComponent(node_id)}`, 'node', 'refused the node read'),
          listCeremonies({ episode_path, limit: o.limit ?? 'all' }),
        ]);
        return { episode_path, node_id, node, ceremonies: page.items, truncated: page.truncated };
      },
    },
  };
}

// ── readers every consumer needs ────────────────────────────────────────────

/** The episode a ceremony is bound to: the typed field first (0.14.0), then the legacy JSON string in `research_context`. */
export function episodeOf(ceremony: Pick<CeremonyLog, 'episode_path' | 'episode_number' | 'source' | 'research_context'>): { episode_path: string; episode_number?: number; source?: string } | null {
  if (typeof ceremony.episode_path === 'string' && ceremony.episode_path) {
    return {
      episode_path: ceremony.episode_path,
      ...(typeof ceremony.episode_number === 'number' ? { episode_number: ceremony.episode_number } : {}),
      ...(typeof ceremony.source === 'string' ? { source: ceremony.source } : {}),
    };
  }
  if (typeof ceremony.research_context !== 'string') return null;
  try {
    const parsed = JSON.parse(ceremony.research_context) as Record<string, unknown> | null;
    const path = parsed?.episode_path ?? parsed?.episodePath;
    if (typeof path !== 'string' || !path) return null;
    return {
      episode_path: path,
      ...(typeof parsed?.episode_number === 'number' ? { episode_number: parsed.episode_number } : {}),
      ...(typeof parsed?.source === 'string' ? { source: parsed.source } : {}),
    };
  } catch {
    return null;
  }
}

/** The opening a closing closes: the typed field first (0.14.0), then the MCP's convention of naming it in `research_context`. */
export function closingOf(ceremony: Pick<CeremonyLog, 'type' | 'closes' | 'research_context'>): string | null {
  if (ceremony.type !== 'closing') return null;
  if (typeof ceremony.closes === 'string' && ceremony.closes) return ceremony.closes;
  const rc = ceremony.research_context;
  return typeof rc === 'string' && /^ceremony:\d+:[a-z0-9]+$/.test(rc.trim()) ? rc.trim() : null;
}

/** The folder name inside a reference: whitespace and any `chronicle:` prefixes removed. */
function episodeFolder(ref: string): string {
  let path = ref.trim();
  while (path.startsWith('chronicle:')) path = path.slice('chronicle:'.length).trim();
  return path;
}

/** The chronicle node id of an episode folder: `chronicle:<folder>`. An id already in that form is returned as is. Throws on an empty name. */
export function episodeNodeId(episodePath: string): string {
  const path = episodeFolder(episodePath);
  if (!path) throw new TypeError('episodeNodeId needs an episode folder name');
  return `chronicle:${path}`;
}

/**
 * The circles a list of ceremony records was held in, the most recently
 * active first. Closings fold into the ceremonies they close: a ceremony is
 * open until a closing names it. Records without a `circle_id` are skipped.
 */
export function circlesHeldIn(
  records: readonly Pick<CeremonyLog, 'id' | 'type' | 'timestamp' | 'circle_id' | 'closes' | 'research_context'>[],
): CircleHeld[] {
  const closed = new Set<string>();
  for (const r of records) {
    const opening = closingOf(r);
    if (opening) closed.add(opening);
  }
  const held = new Map<string, CircleHeld>();
  for (const r of records) {
    if (!r.circle_id) continue;
    const circle = held.get(r.circle_id) ?? { circle_id: r.circle_id, ceremonies: 0, open: 0, last: '' };
    if (r.type !== 'closing') {
      circle.ceremonies += 1;
      if (!closed.has(r.id)) circle.open += 1;
    }
    if ((r.timestamp ?? '') > circle.last) circle.last = r.timestamp;
    held.set(r.circle_id, circle);
  }
  return [...held.values()].sort((a, b) => b.last.localeCompare(a.last) || a.circle_id.localeCompare(b.circle_id));
}

/** Read the wheel URL the way every Miadi tool does: `MIADI_CHRONICLE_MW_URL` first, then `MW_API_URL`. */
export function wheelUrlFromEnv(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.MIADI_CHRONICLE_MW_URL ?? env.MW_API_URL ?? '';
  const trimmed = trimBase(raw);
  return trimmed || null;
}
