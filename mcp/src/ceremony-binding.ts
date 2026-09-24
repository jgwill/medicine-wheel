/**
 * The typed binding a ceremony carries since 0.14.0: the episode it belongs
 * to, the circle it is held in, and since 0.15.6 the node it is held about.
 * The server's POST /api/ceremonies validates the same fields; checking here
 * refuses a bad value before any write, on the JSONL store too.
 * jgwill/medicine-wheel#144, #146.
 */

/** Episode directory names are `YYYY-MM-DD-episode-NNN-slug`, as the server checks. */
export const EPISODE_PATH = /^\d{4}-\d{2}-\d{2}-episode-\d{3,}-[a-z0-9-]+$/;

export interface CeremonyBinding {
  episode_path?: string;
  episode_number?: number;
  circle_id?: string;
  subject_id?: string;
}

/** Read `episode_path`, `circle_id` and `subject_id` from tool arguments. Throws on a malformed value. */
export function ceremonyBinding(args: { episode_path?: unknown; circle_id?: unknown; subject_id?: unknown }): CeremonyBinding {
  const binding: CeremonyBinding = {};
  if (args.episode_path !== undefined && args.episode_path !== '') {
    if (typeof args.episode_path !== 'string' || !EPISODE_PATH.test(args.episode_path)) {
      throw new Error(`Invalid episode_path: ${String(args.episode_path)} (expected YYYY-MM-DD-episode-NNN-slug)`);
    }
    binding.episode_path = args.episode_path;
    binding.episode_number = Number(args.episode_path.match(/-episode-(\d+)-/)![1]);
  }
  if (args.circle_id !== undefined && args.circle_id !== '') {
    if (typeof args.circle_id !== 'string') throw new Error('circle_id must be a circle node id');
    binding.circle_id = args.circle_id;
  }
  if (args.subject_id !== undefined && args.subject_id !== '') {
    if (typeof args.subject_id !== 'string') throw new Error('subject_id must be a node id');
    binding.subject_id = args.subject_id;
  }
  return binding;
}

export const bindingProperties = {
  episode_path: {
    type: 'string',
    description: 'Episode directory this ceremony belongs to, e.g. 2026-09-17-episode-349-slug (optional)',
  },
  circle_id: {
    type: 'string',
    description: 'Node id of the circle the ceremony is held in, e.g. circle:1789740793835:nktr8r (optional)',
  },
  subject_id: {
    type: 'string',
    description: 'Node id of what the ceremony is held about, e.g. review:<uuid> for a Miadi review (optional; the wheel refuses a node it does not hold)',
  },
} as const;
