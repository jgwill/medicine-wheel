/**
 * The wheel's memory, on the server: the one place a memory question is asked.
 *
 * A caller names a scope; `@medicine-wheel/memory` turns it into the
 * ceremonies it reaches from this store, and every provider is confined to
 * that reach. Only this server holds a provider's settings (`HONCHO_URL`,
 * `HONCHO_WORKSPACE_ID`, `HONCHO_API_KEY`), so an agent needs `MW_API_URL`
 * and nothing else. With no provider, or with one down, the wheel answers from
 * its own records. jgwill/medicine-wheel#149
 */

import {
  createMemory,
  type CeremonyRef,
  type Memory,
  type MemoryRecord,
  type MemoryScope,
  type MemoryWheel,
  type SeatRef,
} from '@medicine-wheel/memory';
import { WHEEL_PEER, createHonchoClient, honchoFromEnv, honchoMemoryProvider } from '@medicine-wheel/honcho';
import { createProvider } from '@medicine-wheel/storage-provider';
import { getAllBeats } from '@/lib/store';
import { ceremonyEpisodePath } from '@/lib/ceremony-response';

const MEMBER_OF = 'member_of';

/** The store, as the memory reads it. Read on every question: a turn spoken a second ago is in reach. */
export function wheelForMemory(): MemoryWheel {
  return {
    async ceremonies(): Promise<CeremonyRef[]> {
      const store = await createProvider();
      return (await store.getAllCeremonies(Number.MAX_SAFE_INTEGER)).map((c) => ({
        id: c.id,
        subject_id: c.subject_id ?? null,
        circle_id: c.circle_id ?? null,
        episode_path: ceremonyEpisodePath(c) ?? null,
        closes: c.closes ?? null,
        participants: c.participants ?? [],
      }));
    },

    async seats(): Promise<SeatRef[]> {
      const store = await createProvider();
      return (await store.getAllEdges(Number.MAX_SAFE_INTEGER))
        .filter((e) => e.relationship_type === MEMBER_OF)
        .map((e) => ({ person_id: e.from_id, circle_id: e.to_id }));
    },

    async records(reach): Promise<MemoryRecord[]> {
      const ceremonies = new Set(reach.ceremonies);
      const chronicles = new Set(reach.episodes.flatMap((p) => [`chronicle:${p}`, p]));
      const store = await createProvider();
      const out: MemoryRecord[] = [];

      for (const c of await store.getAllCeremonies(Number.MAX_SAFE_INTEGER)) {
        if (!ceremonies.has(c.id)) continue;
        out.push({
          wheel_kind: 'ceremony',
          wheel_id: c.id,
          ceremony_id: c.id,
          speaker: WHEEL_PEER,
          text: [
            `Ceremony: ${c.type} (${c.direction})`,
            c.participants?.length ? `Participants: ${c.participants.join(', ')}` : '',
            c.intentions?.length ? `Intentions: ${c.intentions.join('; ')}` : '',
            c.research_context && !c.research_context.trim().startsWith('{') ? `Context: ${c.research_context}` : '',
          ].filter(Boolean).join('\n'),
          at: c.timestamp,
        });
      }

      for (const b of getAllBeats()) {
        const ceremony = (b.ceremonies ?? []).find((id) => ceremonies.has(id));
        if (!ceremony) continue;
        out.push({
          wheel_kind: 'beat',
          wheel_id: b.id,
          ceremony_id: ceremony,
          ...(b.speaker ? { speaker: b.speaker } : {}),
          text: [`[${b.direction}] ${b.title}`, b.description, b.prose && b.prose !== b.description ? b.prose : '', (b.learnings ?? []).join('\n')]
            .filter(Boolean)
            .join('\n'),
          at: b.timestamp,
        });
      }

      for (const d of await store.listDiaryEntries({})) {
        const ceremony = typeof d.metadata?.ceremony_id === 'string' ? d.metadata.ceremony_id : undefined;
        const inReach = (ceremony && ceremonies.has(ceremony)) || (!ceremony && d.chronicle && chronicles.has(d.chronicle));
        if (!inReach) continue;
        out.push({
          wheel_kind: 'diary',
          wheel_id: d.id,
          ...(ceremony ? { ceremony_id: ceremony } : {}),
          speaker: d.participant,
          text: `[${d.phase} · ${d.entryType}] ${d.content}`,
          at: d.timestamp,
        });
      }
      return out;
    },

    async names(ids) {
      const store = await createProvider();
      const out: Record<string, string> = {};
      await Promise.all(
        ids.map(async (id) => {
          if (id === WHEEL_PEER) {
            out[id] = 'the wheel';
            return;
          }
          const node = await store.getNode(id).catch(() => null);
          if (node?.name) out[id] = node.name;
        }),
      );
      return out;
    },
  };
}

let current: { key: string; memory: Memory } | null = null;

/** The memory for this process, rebuilt when the provider's settings change. */
export function wheelMemory(): Memory {
  const cfg = honchoFromEnv();
  const key = cfg ? `${cfg.baseUrl}|${cfg.workspace}|${cfg.apiKey ?? ''}` : 'none';
  if (!current || current.key !== key) {
    // The dialectic reasons for seconds; a question over many ceremonies can take tens.
    const providers = cfg ? [honchoMemoryProvider(createHonchoClient({ ...cfg, timeoutMs: 90_000 }))] : [];
    current = { key, memory: createMemory({ wheel: wheelForMemory(), providers }) };
  }
  return current.memory;
}

const SCOPE_LISTS = ['ceremonies', 'subject_id', 'circle_id', 'episode_path'] as const;

/** A scope from a request body, or the reason it is not one. */
export function readScope(value: unknown): { scope: MemoryScope } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'scope must be an object: { ceremonies?, subject_id?, circle_id?, episode_path?, participant?, exclude_ceremonies? }' };
  }
  const raw = value as Record<string, unknown>;
  const scope: MemoryScope = {};
  for (const key of SCOPE_LISTS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') scope[key] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) scope[key] = v as string[];
    else return { error: `scope.${key} must be a string or a list of strings` };
  }
  if (raw.participant !== undefined && raw.participant !== null) {
    if (typeof raw.participant !== 'string') return { error: 'scope.participant must be a string' };
    scope.participant = raw.participant;
  }
  if (raw.exclude_ceremonies !== undefined && raw.exclude_ceremonies !== null) {
    if (!Array.isArray(raw.exclude_ceremonies) || !raw.exclude_ceremonies.every((x) => typeof x === 'string')) {
      return { error: 'scope.exclude_ceremonies must be a list of strings' };
    }
    scope.exclude_ceremonies = raw.exclude_ceremonies as string[];
  }
  const unknown = Object.keys(raw).filter((k) => ![...SCOPE_LISTS, 'participant', 'exclude_ceremonies'].includes(k));
  if (unknown.length) return { error: `scope does not know ${unknown.join(', ')}` };
  return { scope };
}

/** A positive whole number up to `max`, or undefined. */
export function readLimit(value: unknown, max = 50): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? Math.min(value, max) : undefined;
}
