/**
 * An episode's main circle and its main ceremony (0.26.1, jgwill/medicine-wheel#168).
 *
 * An episode is developed in conversation between its people and the
 * agent-spirits working it, and that conversation has one place: the
 * episode's main circle, a circle opened for the episode (`episode_path`)
 * with `episode_role: 'main'`. In it the main ceremony is the
 * `talking_circle` held about the episode itself: its `subject_id` is the
 * episode's node, `chronicle:<folder>`, the way a review's circle names
 * `review:<uuid>`. Other circles may gather for the episode beside it.
 *
 * These are the shapes, the names and the finders. Opening is the
 * consumer's act, because a circle is opened by a person.
 */

import type { CeremonyLog } from '@medicine-wheel/ontology-core';
import type { Circle, NewCircle } from './circles.js';

/** An episode as these functions need it: its folder name, and its number and title when known. */
export interface EpisodeRef {
  path: string;
  number?: number;
  title?: string;
}

/**
 * The node id a ceremony held about the episode names in `subject_id`:
 * `chronicle:<folder>`, the same id `episodeNodeId` (`@medicine-wheel/client`)
 * gives the episode. An id already in that form is returned as is.
 */
export function episodeSubjectId(episode_path: string): string {
  let path = episode_path.trim();
  while (path.startsWith('chronicle:')) path = path.slice('chronicle:'.length).trim();
  if (!path) throw new TypeError('episodeSubjectId needs an episode folder name');
  return `chronicle:${path}`;
}

/** "Episode 563", or the folder name when the number is unknown. The number is written as a number, never padded. */
export function episodeHead(episode: EpisodeRef): string {
  return episode.number !== undefined ? `Episode ${episode.number}` : episode.path;
}

/** The kinds of name an episode's main circle may carry. */
export type EpisodeCircleNameKey = 'plain' | 'main' | 'talking' | 'titled';
export const EPISODE_CIRCLE_NAME_KEYS: readonly EpisodeCircleNameKey[] = ['plain', 'main', 'talking', 'titled'] as const;

export interface EpisodeCircleName {
  key: EpisodeCircleNameKey;
  name: string;
}

/** The longest title a `titled` name carries before it is cut at a word. */
export const TITLED_NAME_MAX = 60;

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : text.slice(0, max)).replace(/[\s,;:.·-]+$/, '')}…`;
}

/**
 * The default name of an episode's main circle and its variations, the
 * default first, every name distinct:
 *
 * - `plain`   "Episode 563 circle"
 * - `main`    "Episode 563 main circle"
 * - `talking` "Episode 563 talking circle"
 * - `titled`  "Episode 563 · <title>", only when the episode has a title
 *
 * `first` moves one kind to the front, so a host chooses its default without
 * another release. The person is offered the list and chooses one.
 */
export function episodeCircleNames(episode: EpisodeRef, options: { first?: EpisodeCircleNameKey } = {}): EpisodeCircleName[] {
  const head = episodeHead(episode);
  const title = episode.title?.trim().replace(/\s+/g, ' ');
  const names: EpisodeCircleName[] = [
    { key: 'plain', name: `${head} circle` },
    { key: 'main', name: `${head} main circle` },
    { key: 'talking', name: `${head} talking circle` },
    ...(title ? [{ key: 'titled' as const, name: `${head} · ${shorten(title, TITLED_NAME_MAX)}` }] : []),
  ];
  const first = options.first ? names.find((n) => n.key === options.first) : undefined;
  const ordered = first ? [first, ...names.filter((n) => n !== first)] : names;
  const seen = new Set<string>();
  return ordered.filter((n) => (seen.has(n.name) ? false : (seen.add(n.name), true)));
}

/** What the main circle holds when the opener writes no intention. */
export function episodeCircleIntention(episode: EpisodeRef): string {
  return `Hold the conversation of ${episodeHead(episode)} between its people and its agent-spirits as the episode develops`;
}

/**
 * The circle to open as an episode's main circle: ongoing, in the east,
 * private (the default container), opened for the episode, `episode_role: 'main'`.
 * Absent a name, the first of `episodeCircleNames`.
 */
export function episodeMainCircle(
  episode: EpisodeRef,
  facilitator_id: string,
  options: { name?: string; intention?: string; first?: EpisodeCircleNameKey } = {},
): NewCircle {
  return {
    name: options.name?.trim() || episodeCircleNames(episode, { first: options.first })[0].name,
    intention: options.intention?.trim() || episodeCircleIntention(episode),
    facilitator_id,
    direction: 'east',
    circle_type: 'ongoing',
    episode_path: episode.path,
    episode_role: 'main',
  };
}

/** The episode's main circle: the active circle opened for it with `episode_role: 'main'`, the earliest when there are several. */
export function mainCircleOf(episode_path: string, circles: readonly Circle[]): Circle | null {
  return (
    circles
      .filter((c) => c.active && c.episode_path === episode_path && c.episode_role === 'main')
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))[0] ?? null
  );
}

type CeremonyFields = Pick<CeremonyLog, 'id' | 'type' | 'timestamp' | 'circle_id' | 'subject_id' | 'closes'>;

/**
 * The episode's main ceremony in its main circle: the earliest `talking_circle`
 * held in `circle_id` about the episode (`subject_id`) that no closing names.
 * A closed main ceremony is not answered, so the next one can open.
 */
export function mainCeremonyOf<T extends CeremonyFields>(
  records: readonly T[],
  where: { episode_path: string; circle_id: string },
): T | null {
  const subject = episodeSubjectId(where.episode_path);
  const closed = new Set(records.map((r) => r.closes).filter((id): id is string => typeof id === 'string' && id.length > 0));
  return (
    records
      .filter((r) => r.type === 'talking_circle' && r.circle_id === where.circle_id && r.subject_id === subject && !closed.has(r.id))
      .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? '') || a.id.localeCompare(b.id))[0] ?? null
  );
}
