/**
 * @medicine-wheel/memory — asking the wheel's memory, whoever keeps it.
 *
 * The wheel is canonical: ceremonies, turns (beats) and diary entries are
 * recorded there. A memory provider (Honcho today) receives them and reasons
 * over them. A caller asks the wheel, never the provider: it names a scope, the
 * wheel turns the scope into the ceremonies it covers, and every provider is
 * confined to that reach. Every source in an answer is a wheel record, or is
 * marked as coming from outside the wheel.
 *
 * This package holds what does not depend on who keeps the memory: the
 * contract, the rule that turns a scope into ceremonies, a text match over the
 * wheel's own records (the provider that is always present), and the
 * orchestration a wheel server and any other caller share. It has no
 * dependencies. jgwill/medicine-wheel#149
 */

// ── the contract ────────────────────────────────────────────────────────────

/** One value or several. */
export type OneOrMany = string | string[];

/**
 * What a question may reach. Every field adds ceremonies and the reach is their
 * union, less `exclude_ceremonies`. A scope with no field reaches nothing: the
 * whole wheel is never the default.
 */
export interface MemoryScope {
  /** Ceremony ids, reached as named. */
  ceremonies?: OneOrMany;
  /** Ceremonies held about these nodes (`CeremonyLog.subject_id`): a review, a PDE. */
  subject_id?: OneOrMany;
  /** Ceremonies held in these circles. */
  circle_id?: OneOrMany;
  /** Ceremonies bound to these chronicle episodes, and diary entries kept against them. */
  episode_path?: OneOrMany;
  /** Ceremonies where this person was seated: a participant, or a member or the facilitator of its circle. */
  participant?: string;
  /** Removed from the reach last, so a PDE's own ceremony is not cited as the answer to its own questions. */
  exclude_ceremonies?: string[];
}

/** What a scope resolved to on this wheel. */
export interface Reach {
  scope: MemoryScope;
  /** Ceremony ids, with the closing records of the ceremonies reached. */
  ceremonies: string[];
  /** Episode paths the scope names: diary entries kept against an episode rather than a ceremony. */
  episodes: string[];
}

/**
 * `dialectic`: a provider reasoned over the reach. `search`: a provider found
 * the closest records without reasoning (it could not confine its reasoning, or
 * reasoning was not asked for). `matched`: the wheel's own records matched on
 * their words, with no provider. `empty`: the reach holds nothing, and nothing
 * was asked.
 */
export type MemoryMode = 'dialectic' | 'search' | 'matched' | 'empty';

/** One thing an answer rests on. */
export interface MemorySource {
  /** Who produced this source: `wheel` for the records match, or a provider's name. */
  provider: string;
  /** `beat`, `diary`, `ceremony`, or `message` for a source outside the wheel. */
  wheel_kind: string;
  /** The wheel record's id, or the provider's own id when `outside_wheel`. */
  wheel_id: string;
  /** The ceremony the record belongs to, when it belongs to one. */
  ceremony_id?: string;
  /** Who spoke or wrote it, as a wheel id when known. */
  speaker?: string;
  /** The speaker's name, resolved by the wheel. */
  speaker_name?: string;
  /** The words, shortened around what matched. Wheel person ids are replaced with names. */
  excerpt: string;
  /** When it was recorded. */
  at?: string;
  /** The provider holds it, but it carries no wheel record: it was written into the provider directly. */
  outside_wheel?: boolean;
}

export interface MemoryAnswer {
  /** The provider that answered, or `wheel` when only the records match did. */
  provider: string;
  mode: MemoryMode;
  /** A reasoned answer, in `dialectic` mode only. */
  answer?: string;
  sources: MemorySource[];
  reach: Reach;
  /** Why the answer came from a fallback, when it did. */
  note?: string;
}

/** A question as a provider receives it: the reach is already resolved. */
export interface MemoryQuestion {
  query: string;
  reach: Reach;
  /** Whose memory is asked. A provider picks its own default. */
  peer?: string;
  /** For `about`: the wheel id of the person the question is about. */
  about?: string;
  /** `minimal` | `low` | `medium` | `high` | `max`. */
  reasoning_level?: string;
  /** How many sources at most. */
  limit?: number;
}

/** A provider's part of an answer; the wheel adds the reach. */
export type ProviderAnswer = Omit<MemoryAnswer, 'reach'>;

export interface MemoryProviderStatus {
  provider: string;
  /** Configured and reachable. */
  enabled: boolean;
  /** Can keep its reasoning inside a reach. A provider that cannot is asked for search only. */
  confined?: boolean;
  detail?: Record<string, unknown>;
  error?: string;
}

/**
 * Who keeps the memory. Receiving records stays with the wheel's projection on
 * write (the river); a provider here answers questions within a reach.
 */
export interface MemoryProvider {
  readonly name: string;
  status(): Promise<MemoryProviderStatus>;
  /** A reasoned answer within the reach, with the sources it drew on. */
  ask(question: MemoryQuestion): Promise<ProviderAnswer>;
  /** The records within the reach closest to the query, with no reasoning. */
  search(question: MemoryQuestion): Promise<ProviderAnswer>;
  /** What the provider holds about one person, within the reach. */
  about?(question: MemoryQuestion & { about: string }): Promise<ProviderAnswer>;
}

// ── scope → ceremonies ──────────────────────────────────────────────────────

/** The fields of a ceremony the reach rule reads. */
export interface CeremonyRef {
  id: string;
  subject_id?: string | null;
  circle_id?: string | null;
  /** The episode the ceremony is bound to, already read from its typed field or its legacy research_context. */
  episode_path?: string | null;
  /** Set on a closing record: the ceremony it closes. */
  closes?: string | null;
  participants?: string[];
}

/** A person's seat in a circle (member or facilitator). */
export interface SeatRef {
  person_id: string;
  circle_id: string;
}

const list = (value: OneOrMany | undefined): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value]).map((v) => String(v).trim()).filter(Boolean);

/** True when the scope names nothing, so it reaches nothing. */
export function isEmptyScope(scope: MemoryScope | undefined | null): boolean {
  if (!scope) return true;
  return (
    list(scope.ceremonies).length === 0 &&
    list(scope.subject_id).length === 0 &&
    list(scope.circle_id).length === 0 &&
    list(scope.episode_path).length === 0 &&
    !scope.participant?.trim()
  );
}

/**
 * Turn a scope into the ceremonies it reaches, from the ceremonies this wheel
 * holds. Fields combine as a union. A ceremony named in `ceremonies` that the
 * wheel does not hold is left out. The closing record of a reached ceremony is
 * reached with it, since its learnings belong to that ceremony.
 * `exclude_ceremonies` is applied last, closings included.
 */
export function resolveReach(scope: MemoryScope, ceremonies: readonly CeremonyRef[], seats: readonly SeatRef[] = []): Reach {
  const named = new Set(list(scope.ceremonies));
  const subjects = new Set(list(scope.subject_id));
  const circles = new Set(list(scope.circle_id));
  const episodes = list(scope.episode_path);
  const episodeSet = new Set(episodes);
  const person = scope.participant?.trim();
  const seated = new Set(person ? seats.filter((s) => s.person_id === person).map((s) => s.circle_id) : []);

  const reached = new Set<string>();
  for (const c of ceremonies) {
    if (
      named.has(c.id) ||
      (c.subject_id && subjects.has(c.subject_id)) ||
      (c.circle_id && circles.has(c.circle_id)) ||
      (c.episode_path && episodeSet.has(c.episode_path)) ||
      (person && ((c.participants ?? []).includes(person) || (c.circle_id && seated.has(c.circle_id))))
    ) {
      reached.add(c.id);
    }
  }
  for (const c of ceremonies) if (c.closes && reached.has(c.closes)) reached.add(c.id);
  for (const id of scope.exclude_ceremonies ?? []) reached.delete(id);
  return { scope, ceremonies: [...reached], episodes };
}

// ── the wheel's own records ─────────────────────────────────────────────────

/** A wheel record, flattened to what a text match reads. */
export interface MemoryRecord {
  wheel_kind: string;
  wheel_id: string;
  ceremony_id?: string;
  speaker?: string;
  text: string;
  at?: string;
}

const STOPWORDS = new Set(
  (
    'the and for are but not you all any can had her was one our out has him his how its may new now old see two who did get let put say she too use what when where which while with this that than then them they there their these those from have into just more most much must only other over same some such very will would your about after again also been being before both could does each even ever here just like make many might never often once shall should still through under until upon whom whose why ' +
    'les des une est pas pour que qui dans sur avec par mais comme plus tout tous elle ils elles nous vous leur leurs cette ces son ses sont été être avoir fait quoi quel quelle dont'
  ).split(/\s+/),
);

/** The words of a query a match can use: lower case, three letters or more, no stopword. */
export function queryTerms(query: string): string[] {
  const words = query.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => w.length >= 3 && !STOPWORDS.has(w)))];
}

const fold = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** A window of the text around the first term it contains. */
export function excerptAround(text: string, terms: readonly string[], width = 280): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= width) return flat;
  const folded = fold(flat);
  const hits = terms.map((t) => folded.indexOf(t)).filter((i) => i >= 0);
  const at = hits.length ? Math.min(...hits) : 0;
  const start = Math.max(0, Math.min(at - Math.floor(width / 3), flat.length - width));
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + width).trim()}${start + width < flat.length ? '…' : ''}`;
}

/**
 * Match a query against records on their words. A record scores one point per
 * distinct query term it contains, and two more when it holds the whole query
 * as written. Ties go to the more recent record. Records that match no term are
 * left out.
 */
export function matchRecords(query: string, records: readonly MemoryRecord[], opts: { limit?: number } = {}): MemorySource[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const phrase = fold(query.trim());
  const scored = records
    .map((r) => {
      const text = fold(r.text);
      const score = terms.filter((t) => text.includes(t)).length + (phrase.length > 3 && text.includes(phrase) ? 2 : 0);
      return { r, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.r.at ?? '').localeCompare(a.r.at ?? ''));
  return scored.slice(0, opts.limit ?? 12).map(({ r }) => ({
    provider: 'wheel',
    wheel_kind: r.wheel_kind,
    wheel_id: r.wheel_id,
    ...(r.ceremony_id ? { ceremony_id: r.ceremony_id } : {}),
    ...(r.speaker ? { speaker: r.speaker } : {}),
    excerpt: excerptAround(r.text, terms),
    ...(r.at ? { at: r.at } : {}),
  }));
}

// ── the orchestration ───────────────────────────────────────────────────────

/** What the wheel lends the orchestration: its ceremonies, seats, records and names. */
export interface MemoryWheel {
  ceremonies(): Promise<CeremonyRef[]>;
  seats(): Promise<SeatRef[]>;
  /** The beats, diary entries and ceremony records within the reach. */
  records(reach: Reach): Promise<MemoryRecord[]>;
  /** Names for wheel ids (people, the wheel itself). Unknown ids are left out. */
  names(ids: string[]): Promise<Record<string, string>>;
}

export interface AskInput {
  question: string;
  scope: MemoryScope;
  peer?: string;
  reasoning_level?: string;
  limit?: number;
}

export interface SearchInput {
  query: string;
  scope: MemoryScope;
  limit?: number;
}

export interface AboutInput {
  /** The wheel id of the person. */
  person: string;
  scope: MemoryScope;
  question?: string;
  limit?: number;
}

/** Wheel person ids as they appear in projected text, e.g. `node:human:1789710466321:95nnhl`. */
const PERSON_ID = /node:human:[0-9]+:[a-z0-9]+/g;

export interface Memory {
  reach(scope: MemoryScope): Promise<Reach>;
  status(): Promise<{ providers: MemoryProviderStatus[] }>;
  ask(input: AskInput): Promise<MemoryAnswer>;
  search(input: SearchInput): Promise<MemoryAnswer>;
  about(input: AboutInput): Promise<MemoryAnswer>;
}

/**
 * The memory a wheel answers from. Providers are tried in order: the first that
 * answers gives the answer, and when every provider fails the wheel's own
 * records answer (`matched`). The records match always adds its sources, each
 * naming its provider, so an answer can be checked against the wheel even when
 * a provider reasoned it.
 */
export function createMemory(opts: { wheel: MemoryWheel; providers?: MemoryProvider[] }): Memory {
  const { wheel } = opts;
  const providers = opts.providers ?? [];

  async function reach(scope: MemoryScope): Promise<Reach> {
    if (isEmptyScope(scope)) return { scope: scope ?? {}, ceremonies: [], episodes: [] };
    const [ceremonies, seats] = await Promise.all([wheel.ceremonies(), scope.participant ? wheel.seats() : Promise.resolve([])]);
    return resolveReach(scope, ceremonies, seats);
  }

  const empty = (r: Reach): MemoryAnswer => ({ provider: 'wheel', mode: 'empty', sources: [], reach: r });
  const isEmpty = (r: Reach) => r.ceremonies.length === 0 && r.episodes.length === 0;

  async function named(answer: MemoryAnswer): Promise<MemoryAnswer> {
    const ids = new Set<string>();
    for (const s of answer.sources) {
      if (s.speaker) ids.add(s.speaker);
      for (const m of s.excerpt.match(PERSON_ID) ?? []) ids.add(m);
    }
    for (const m of answer.answer?.match(PERSON_ID) ?? []) ids.add(m);
    if (ids.size === 0) return answer;
    const names = await wheel.names([...ids]).catch(() => ({} as Record<string, string>));
    const swap = (text: string) => text.replace(PERSON_ID, (id) => names[id] ?? id);
    return {
      ...answer,
      ...(answer.answer !== undefined ? { answer: swap(answer.answer) } : {}),
      sources: answer.sources.map((s) => ({
        ...s,
        excerpt: swap(s.excerpt),
        ...(s.speaker && names[s.speaker] ? { speaker_name: names[s.speaker] } : {}),
      })),
    };
  }

  /** Provider sources first, then the records match, one source per wheel record. */
  function merge(first: MemorySource[], second: MemorySource[], limit: number): MemorySource[] {
    const seen = new Set<string>();
    const out: MemorySource[] = [];
    for (const s of [...first, ...second]) {
      const key = s.outside_wheel ? `${s.provider}:${s.wheel_id}` : s.wheel_id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out.slice(0, limit);
  }

  async function answer(
    r: Reach,
    matched: MemorySource[],
    limit: number,
    ask: (p: MemoryProvider) => Promise<ProviderAnswer> | null,
  ): Promise<MemoryAnswer> {
    const failures: string[] = [];
    for (const p of providers) {
      const pending = ask(p);
      if (!pending) continue;
      try {
        const got = await pending;
        return named({ ...got, sources: merge(got.sources, matched, limit), reach: r });
      } catch (error) {
        failures.push(`${p.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return named({
      provider: 'wheel',
      mode: 'matched',
      sources: matched,
      reach: r,
      ...(providers.length === 0
        ? { note: 'No memory provider is configured; the wheel matched its own records.' }
        : failures.length
          ? { note: `No provider answered (${failures.join('; ')}); the wheel matched its own records.` }
          : {}),
    });
  }

  return {
    reach,
    async status() {
      const statuses = await Promise.all(
        providers.map((p) => p.status().catch((error) => ({ provider: p.name, enabled: false, error: error instanceof Error ? error.message : String(error) }))),
      );
      return { providers: [...statuses, { provider: 'wheel', enabled: true, confined: true, detail: { mode: 'matched' } }] };
    },
    async ask(input) {
      const r = await reach(input.scope);
      if (isEmpty(r)) return empty(r);
      const limit = input.limit ?? 12;
      const matched = matchRecords(input.question, await wheel.records(r), { limit });
      return answer(r, matched, limit, (p) => p.ask({ query: input.question, reach: r, peer: input.peer, reasoning_level: input.reasoning_level, limit }));
    },
    async search(input) {
      const r = await reach(input.scope);
      if (isEmpty(r)) return empty(r);
      const limit = input.limit ?? 12;
      const matched = matchRecords(input.query, await wheel.records(r), { limit });
      return answer(r, matched, limit, (p) => p.search({ query: input.query, reach: r, limit }));
    },
    async about(input) {
      const r = await reach(input.scope);
      if (isEmpty(r)) return empty(r);
      const limit = input.limit ?? 12;
      const query = input.question ?? '';
      // From the wheel's own records, only what this person said or wrote: the closest to the
      // question when there is one, else the most recent.
      const theirs = (await wheel.records(r)).filter((rec) => rec.speaker === input.person);
      const matched = query.trim()
        ? matchRecords(query, theirs, { limit })
        : [...theirs]
            .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
            .slice(0, limit)
            .map((rec) => ({
              provider: 'wheel',
              wheel_kind: rec.wheel_kind,
              wheel_id: rec.wheel_id,
              ...(rec.ceremony_id ? { ceremony_id: rec.ceremony_id } : {}),
              speaker: rec.speaker,
              excerpt: excerptAround(rec.text, []),
              ...(rec.at ? { at: rec.at } : {}),
            }));
      return answer(r, matched, limit, (p) => (p.about ? p.about({ query, reach: r, about: input.person, limit }) : null));
    },
  };
}
