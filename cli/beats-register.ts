/**
 * mw beat register — an episode's authored beats into the wheel.
 *
 * This is the path that was missing. `mkepisode --register` registers the
 * episode; nothing registered the beats an episode carries, so they sat in a
 * YAML file as a design artifact and never became records.
 *
 * It goes **through** `@medicine-wheel/narrative-engine` rather than posting
 * JSON at the REST surface. That distinction is the whole point: the first
 * time these beats were registered it was by a script that POSTed directly,
 * which meant `validateBeatDraft` never ran and nothing confirmed they were
 * legal. Registering by hand around the door is the same defect the door
 * exists to prevent.
 *
 * Reads `<episode>/beats/beats.yaml`:
 *
 *   cycle_id: cycle-...          # null means unbound; the cycle is created if named
 *   cycle_question: >-           # used only when the cycle must be created
 *   beats:
 *     - id, direction, title, description, prose?, learnings[], relations_honored[], origin
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  createBeat,
  validateBeatDraft,
  actForDirection,
  type BeatDraft,
} from '@medicine-wheel/narrative-engine';

export interface RegisterOptions {
  apiUrl: string;
  /** Validate and report without writing anything. */
  dryRun?: boolean;
}

export interface RegisterOutcome {
  registered: string[];
  skipped: { id: string; reason: string }[];
  rejected: { id: string; violations: string[] }[];
  cycleId: string | null;
  cycleCreated: boolean;
}

/** Minimal YAML reader for the beats file — avoids a dependency for one shape. */
function readBeatsFile(file: string): { cycle_id: string | null; cycle_question?: string; beats: any[] } {
  // js-yaml ships with the app; require lazily so the CLI stays usable without it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const yaml = require('js-yaml');
  const parsed = yaml.load(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${file} did not parse to an object`);
  }
  const { cycle_id = null, cycle_question, beats } = parsed as any;
  if (!Array.isArray(beats)) throw new Error(`${file} has no 'beats' array`);
  return { cycle_id, cycle_question, beats };
}

export function resolveBeatsFile(episodeDir: string): string {
  const candidates = [
    path.join(episodeDir, 'beats', 'beats.yaml'),
    path.join(episodeDir, 'beats.yaml'),
  ];
  const found = candidates.find(c => fs.existsSync(c));
  if (!found) {
    throw new Error(
      `No beats file found. Looked for:\n  ${candidates.join('\n  ')}`,
    );
  }
  return found;
}

async function get(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} GET ${url}`);
  return res.json();
}

async function post(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) {
    // A 400 is the wheel refusing an illegal beat. Surface its reason rather
    // than a status code — the caller needs to know which law it broke.
    let detail = text;
    try { detail = JSON.parse(text).error ?? text; } catch { /* keep raw */ }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return JSON.parse(text);
}

export async function registerEpisodeBeats(
  episodeDir: string,
  options: RegisterOptions,
): Promise<RegisterOutcome> {
  const file = resolveBeatsFile(episodeDir);
  const doc = readBeatsFile(file);

  const outcome: RegisterOutcome = {
    registered: [], skipped: [], rejected: [],
    cycleId: doc.cycle_id, cycleCreated: false,
  };

  // Build every draft through the door first. Nothing is written until all of
  // them are legal — a half-registered arc is worse than none, because the
  // cycle then reports a story that stops mid-sentence.
  const drafts: BeatDraft[] = [];
  for (const raw of doc.beats) {
    const draft: BeatDraft = {
      id: raw.id,
      direction: raw.direction,
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim(),
      prose: raw.prose ? String(raw.prose).trim() : undefined,
      learnings: raw.learnings ?? [],
      ceremonies: raw.ceremonies ?? [],
      relations_honored: raw.relations_honored ?? [],
      cycle_id: doc.cycle_id ?? undefined,
      parent_beat_id: raw.parent_beat_id,
      origin: raw.origin ?? {
        producer: 'chronicle-episode',
        source_ref: path.basename(episodeDir),
        method: 'authored',
      },
    };

    const check = validateBeatDraft(draft);
    if (!check.valid) {
      outcome.rejected.push({
        id: raw.id ?? '(no id)',
        violations: check.violations.filter(v => v.severity === 'error').map(v => `${v.field}: ${v.message}`),
      });
      continue;
    }
    // Prove it can be authored before anything is sent.
    createBeat(draft);
    drafts.push(draft);
  }

  if (outcome.rejected.length > 0 || options.dryRun) return outcome;

  // Ensure the cycle exists before binding to it, so no beat is written naming
  // a cycle that is not there.
  if (doc.cycle_id) {
    const cycles: any[] = await get(`${options.apiUrl}/api/narrative/cycles`);
    if (!cycles.some(c => c.id === doc.cycle_id)) {
      await post(`${options.apiUrl}/api/narrative/cycles`, {
        id: doc.cycle_id,
        research_question: doc.cycle_question ?? `Episode ${path.basename(episodeDir)}`,
        current_direction: 'east',
      });
      outcome.cycleCreated = true;
    }
  }

  const existing: any[] = await get(`${options.apiUrl}/api/narrative/beats`);
  const known = new Set(existing.map(b => b.id));

  for (const draft of drafts) {
    if (draft.id && known.has(draft.id)) {
      outcome.skipped.push({ id: draft.id, reason: 'already registered' });
      continue;
    }
    const got = await post(`${options.apiUrl}/api/narrative/beats`, draft);
    if (got.id !== draft.id) {
      throw new Error(
        `The wheel returned id ${got.id} for a beat sent as ${draft.id}. ` +
          'Registration stopped — an id that does not survive the round trip cannot be looked up again.',
      );
    }
    outcome.registered.push(got.id);
  }

  return outcome;
}

/** Human-readable summary of what an arc now holds. */
export function describeArc(beats: any[]): string[] {
  const order: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 };
  const lines = beats
    .slice()
    .sort((a, b) => (a.act - b.act) || String(a.timestamp).localeCompare(String(b.timestamp)))
    .map(b => `  act ${b.act}  ${String(b.direction).padEnd(6)} ${b.title}`);
  const walked = [...new Set(beats.map(b => b.direction))].sort((a, b) => order[a] - order[b]);
  lines.push('');
  lines.push(`  directions walked: ${walked.join(' → ')}${walked.length === 4 ? '  (complete arc)' : ''}`);
  return lines;
}

export { actForDirection };
