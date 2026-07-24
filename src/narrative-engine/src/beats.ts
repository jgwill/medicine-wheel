/**
 * Beat Authoring — how a narrative beat comes into being.
 *
 * The rest of this package reasons *about* beats (sequence, cadence, arc,
 * timeline). This module is where a beat is *made*: drafted, validated
 * against the wheel's laws, bound to its cycle, and telescoped into
 * sub-beats when a single moment turns out to hold several.
 *
 * Authoring lives here rather than in a producer package because creation
 * and validation must not be separable — a beat born outside the laws is a
 * beat the engine will later have to reject. Producers (narrative-cluster,
 * perception-layer, github-ceremony, session-reader, prompt-decomposition)
 * emit `BeatDraft`s; this module is the single door they all pass through.
 *
 * Pure functions only. Persistence is the caller's concern — pass the
 * returned beat to storage-provider, data-store, or the MW server.
 */
import type {
  NarrativeBeat,
  BeatOrigin,
  MedicineWheelCycle,
  DirectionName,
} from '@medicine-wheel/ontology-core';

// ─── Drafts ───────────────────────────────────────────────────────

/**
 * What a producer supplies. Everything the wheel can infer — act, timestamp,
 * id — is optional, so a hand-authored draft stays short and a machine-derived
 * one stays honest about its provenance.
 */
export interface BeatDraft {
  direction: DirectionName;
  title: string;
  description: string;
  prose?: string;
  ceremonies?: string[];
  learnings?: string[];
  relations_honored?: string[];
  /** Defaults to the act the direction belongs to. */
  act?: number;
  /** Defaults to now. Supply it when replaying a witnessed stream. */
  timestamp?: string;
  /** Defaults to a generated id. */
  id?: string;
  cycle_id?: string;
  parent_beat_id?: string;
  origin?: BeatOrigin;
}

export interface BeatDraftViolation {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface BeatDraftValidation {
  valid: boolean;
  violations: BeatDraftViolation[];
}

export interface CreateBeatOptions {
  /** Supplies the id when the draft omits one. Defaults to a timestamp+random id. */
  idFactory?: (draft: BeatDraft) => string;
  /** Fills `origin` when the draft omits it. */
  defaultOrigin?: BeatOrigin;
  /** Reject rather than repair a draft whose act contradicts its direction. Default false. */
  strictAct?: boolean;
}

// ─── Direction ↔ Act ──────────────────────────────────────────────

/** The sunwise order: East opens, South grows, West reflects, North integrates. */
export const ACT_FOR_DIRECTION: Record<DirectionName, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4,
};

/** The act a direction naturally belongs to. */
export function actForDirection(direction: DirectionName): number {
  return ACT_FOR_DIRECTION[direction] ?? 1;
}

// ─── Validation ───────────────────────────────────────────────────

const DIRECTIONS: DirectionName[] = ['east', 'south', 'west', 'north'];

/**
 * Check a draft before it becomes a beat.
 *
 * Errors block creation. Warnings are recorded but let the beat through —
 * a beat with no learnings is thin, not invalid, and the wheel would rather
 * hold a thin record than lose the moment.
 */
export function validateBeatDraft(draft: BeatDraft): BeatDraftValidation {
  const violations: BeatDraftViolation[] = [];

  if (!draft.direction || !DIRECTIONS.includes(draft.direction)) {
    violations.push({
      field: 'direction',
      message: `direction must be one of ${DIRECTIONS.join(', ')}`,
      severity: 'error',
    });
  }

  if (!draft.title || draft.title.trim().length === 0) {
    violations.push({ field: 'title', message: 'title is required', severity: 'error' });
  }

  if (!draft.description || draft.description.trim().length === 0) {
    violations.push({
      field: 'description',
      message: 'description is required — a beat with no account of what happened cannot be read back',
      severity: 'error',
    });
  }

  if (draft.act !== undefined && (!Number.isInteger(draft.act) || draft.act < 1 || draft.act > 4)) {
    violations.push({ field: 'act', message: 'act must be an integer between 1 and 4', severity: 'error' });
  }

  if (draft.timestamp !== undefined && Number.isNaN(Date.parse(draft.timestamp))) {
    violations.push({ field: 'timestamp', message: 'timestamp must be an ISO-8601 string', severity: 'error' });
  }

  if (
    draft.act !== undefined &&
    draft.direction &&
    DIRECTIONS.includes(draft.direction) &&
    draft.act !== actForDirection(draft.direction)
  ) {
    violations.push({
      field: 'act',
      message: `act ${draft.act} does not match the ${draft.direction} direction (act ${actForDirection(draft.direction)})`,
      severity: 'warning',
    });
  }

  if (!draft.learnings || draft.learnings.length === 0) {
    violations.push({
      field: 'learnings',
      message: 'no learnings recorded — the beat carries events but no knowledge forward',
      severity: 'warning',
    });
  }

  if (!draft.relations_honored || draft.relations_honored.length === 0) {
    violations.push({
      field: 'relations_honored',
      message: 'no relations honored — relational accountability is unrecorded for this beat',
      severity: 'warning',
    });
  }

  return {
    valid: !violations.some(v => v.severity === 'error'),
    violations,
  };
}

// ─── Creation ─────────────────────────────────────────────────────

function defaultId(draft: BeatDraft): string {
  const dir = draft.direction ?? 'beat';
  return `beat:${dir}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turn a draft into a beat.
 *
 * Throws when the draft carries errors — a beat that fails the wheel's laws
 * should never reach storage, because every reader downstream trusts that
 * anything persisted was checked here.
 */
export function createBeat(draft: BeatDraft, options: CreateBeatOptions = {}): NarrativeBeat {
  const validation = validateBeatDraft(draft);

  if (!validation.valid) {
    const errors = validation.violations
      .filter(v => v.severity === 'error')
      .map(v => `${v.field}: ${v.message}`)
      .join('; ');
    throw new Error(`Invalid beat draft — ${errors}`);
  }

  const naturalAct = actForDirection(draft.direction);

  if (options.strictAct && draft.act !== undefined && draft.act !== naturalAct) {
    throw new Error(
      `Invalid beat draft — act ${draft.act} contradicts the ${draft.direction} direction (act ${naturalAct})`,
    );
  }

  const origin = draft.origin ?? options.defaultOrigin;

  const beat: NarrativeBeat = {
    id: draft.id ?? (options.idFactory ? options.idFactory(draft) : defaultId(draft)),
    direction: draft.direction,
    title: draft.title.trim(),
    description: draft.description.trim(),
    ceremonies: draft.ceremonies ?? [],
    learnings: draft.learnings ?? [],
    timestamp: draft.timestamp ?? new Date().toISOString(),
    act: draft.act ?? naturalAct,
    relations_honored: draft.relations_honored ?? [],
  };

  if (draft.prose !== undefined) beat.prose = draft.prose;
  if (draft.cycle_id !== undefined) beat.cycle_id = draft.cycle_id;
  if (draft.parent_beat_id !== undefined) beat.parent_beat_id = draft.parent_beat_id;
  if (origin !== undefined) beat.origin = origin;

  return beat;
}

/** Create several beats in one pass, preserving draft order. */
export function createBeats(drafts: BeatDraft[], options: CreateBeatOptions = {}): NarrativeBeat[] {
  return drafts.map(draft => createBeat(draft, options));
}

// ─── Telescoping ──────────────────────────────────────────────────

export interface TelescopeResult {
  /** The parent, with `sub_beats` now naming its children. */
  parent: NarrativeBeat;
  /** The children, each carrying `parent_beat_id` and the parent's cycle. */
  subBeats: NarrativeBeat[];
}

/**
 * Telescope a beat into sub-beats.
 *
 * The same move as telescoping an action step in a structural tension chart:
 * a moment that read as one turns out to hold several, and the finer grain
 * is recorded without losing the coarser one. The parent stays — it is the
 * lens through which the children are read.
 *
 * Children inherit the parent's cycle and, unless a draft says otherwise,
 * the parent's direction.
 */
export function telescopeBeat(
  parent: NarrativeBeat,
  subDrafts: BeatDraft[],
  options: CreateBeatOptions = {},
): TelescopeResult {
  if (subDrafts.length === 0) {
    throw new Error('Cannot telescope a beat into zero sub-beats — supply at least one draft');
  }

  const subBeats = subDrafts.map(draft =>
    createBeat(
      {
        ...draft,
        direction: draft.direction ?? parent.direction,
        parent_beat_id: parent.id,
        cycle_id: draft.cycle_id ?? parent.cycle_id,
      },
      options,
    ),
  );

  const parentWithChildren: NarrativeBeat = {
    ...parent,
    sub_beats: [...(parent.sub_beats ?? []), ...subBeats.map(b => b.id)],
  };

  return { parent: parentWithChildren, subBeats };
}

/** Depth of a beat below its root, walking `parent_beat_id` through the given set. */
export function beatDepth(beat: NarrativeBeat, allBeats: NarrativeBeat[]): number {
  const byId = new Map(allBeats.map(b => [b.id, b]));
  let depth = 0;
  let current = beat;
  const seen = new Set<string>([beat.id]);

  while (current.parent_beat_id) {
    const parent = byId.get(current.parent_beat_id);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    current = parent;
    depth += 1;
  }

  return depth;
}

/** The chain from a beat up to its root, root first. */
export function beatLineage(beat: NarrativeBeat, allBeats: NarrativeBeat[]): NarrativeBeat[] {
  const byId = new Map(allBeats.map(b => [b.id, b]));
  const chain: NarrativeBeat[] = [beat];
  const seen = new Set<string>([beat.id]);
  let current = beat;

  while (current.parent_beat_id) {
    const parent = byId.get(current.parent_beat_id);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

/** Beats with no parent — the top-level arc, unflattened by telescoping. */
export function rootBeats(beats: NarrativeBeat[]): NarrativeBeat[] {
  return beats.filter(b => !b.parent_beat_id);
}

/** Direct children of a beat. */
export function childBeats(parentId: string, beats: NarrativeBeat[]): NarrativeBeat[] {
  return beats.filter(b => b.parent_beat_id === parentId);
}

// ─── Cycle membership ─────────────────────────────────────────────

/**
 * Bind a beat to a cycle on both sides of the relation.
 *
 * A one-sided link is how arcs go wrong: the cycle lists beats that no
 * longer point back, or a beat claims a cycle that never counted it. Both
 * records are returned updated, and it is the caller's job to persist both.
 */
export function attachBeatToCycle(
  beat: NarrativeBeat,
  cycle: MedicineWheelCycle,
): { beat: NarrativeBeat; cycle: MedicineWheelCycle } {
  const alreadyListed = cycle.beats.includes(beat.id);

  return {
    beat: { ...beat, cycle_id: cycle.id },
    cycle: alreadyListed ? cycle : { ...cycle, beats: [...cycle.beats, beat.id] },
  };
}

/**
 * Beats belonging to a cycle.
 *
 * Membership is read from either side, because beats recorded before cycles
 * were bound carry no `cycle_id` and are only reachable through the cycle's
 * own list. Reading one side alone silently drops half the arc.
 */
export function beatsInCycle(cycle: MedicineWheelCycle, beats: NarrativeBeat[]): NarrativeBeat[] {
  const listed = new Set(cycle.beats);
  return beats.filter(b => b.cycle_id === cycle.id || listed.has(b.id));
}

/**
 * Beats that belong to no cycle at all — neither claiming one nor claimed.
 *
 * These are the wheel's orphans: real moments that no arc will ever read.
 * Surfacing them is the first step to adopting them.
 */
export function orphanBeats(beats: NarrativeBeat[], cycles: MedicineWheelCycle[]): NarrativeBeat[] {
  const claimed = new Set(cycles.flatMap(c => c.beats));
  return beats.filter(b => !b.cycle_id && !claimed.has(b.id));
}
