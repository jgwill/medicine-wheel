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
} from '@medicine-wheel/ontology-core';
import type { DiaryEntryRecord } from '@medicine-wheel/storage-provider';

export type { CeremonyLog, CeremonyType, DirectionName, NarrativeBeat, NodeType, RelationalEdge, RelationalNode, DiaryEntryRecord };

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
}

export interface ListCeremoniesOptions {
  direction?: DirectionName;
  type?: CeremonyType;
  episode_path?: string;
  circle_id?: string;
  /** The opening id: answers "which record closes this ceremony". */
  closes?: string;
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
  };
  edges: {
    list(opts?: ListEdgesOptions): Promise<Paged<RelationalEdge>>;
    create(input: NewEdge): Promise<RelationalEdge>;
    remove(from_id: string, to_id: string): Promise<void>;
  };
  ceremonies: {
    list(opts?: ListCeremoniesOptions): Promise<Paged<CeremonyLog>>;
    get(id: string): Promise<CeremonyLog | null>;
    create(input: NewCeremony): Promise<CeremonyLog>;
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

  async function call(path: string, init?: RequestInit): Promise<Response> {
    const url = `${base}${path}`;
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await doFetch(url, {
        ...init,
        headers: { ...headers, ...((init?.headers as Record<string, string>) ?? {}) },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
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
      async remove(from_id, to_id) {
        const res = await call(`/api/edges${query({ from: from_id, to: to_id })}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) await refused(res, 'refused the edge removal');
      },
    },

    ceremonies: {
      async list(o = {}) {
        const res = await call(
          `/api/ceremonies${query({ direction: o.direction, type: o.type, episode_path: o.episode_path, circle_id: o.circle_id, closes: o.closes, limit: limitParam(o.limit) })}`,
        );
        return pageFrom<CeremonyLog>(await json(res, 'refused the ceremony list'), 'ceremonies');
      },
      async get(id) {
        return getOrNull<CeremonyLog>(`/api/ceremonies/${encodeURIComponent(id)}`, 'ceremony', 'refused the ceremony read');
      },
      async create(input) {
        const res = await call('/api/ceremonies', { method: 'POST', body: JSON.stringify(input) });
        const body = await json<{ ceremony?: CeremonyLog }>(res, 'refused the ceremony');
        if (!body?.ceremony?.id) throw new MedicineWheelClientError('wheel returned no ceremony', 502, res.url);
        return body.ceremony;
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
  };
}

/** Read the wheel URL the way every Miadi tool does: `MIADI_CHRONICLE_MW_URL` first, then `MW_API_URL`. */
export function wheelUrlFromEnv(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.MIADI_CHRONICLE_MW_URL ?? env.MW_API_URL ?? '';
  const trimmed = trimBase(raw);
  return trimmed || null;
}
