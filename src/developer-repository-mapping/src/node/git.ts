/**
 * Read a clone's history into an `ActivityReading`. Read-only: `git log`,
 * `git tag`, `git rev-parse`, `git remote get-url`. Never fetches or pulls —
 * the reading is of the clone as it is, and says when it was taken.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseGithubRemote, repositoryNodeId } from '../ids';
import type { ActivityReading } from '../types';

const run = promisify(execFile);
const DAY_MS = 86_400_000;

async function git(clone: string, args: string[]): Promise<string | undefined> {
  try {
    // A signer's `log.showSignature` would put a signature report between the dates.
    const { stdout } = await run('git', ['-c', 'log.showSignature=false', '-C', clone, ...args], {
      maxBuffer: 256 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

export interface ReadActivityOptions {
  observedBy: string;
  /** The reading's time. Defaults to the moment of reading. */
  now?: Date;
}

export async function readActivity(clone: string, options: ReadActivityOptions): Promise<ActivityReading> {
  if ((await git(clone, ['rev-parse', '--git-dir'])) === undefined) {
    throw new Error(`not a git clone: ${clone}`);
  }
  const now = options.now ?? new Date();
  // An empty repository has no HEAD to log; that reads as zero commits. Only
  // lines that are dates count, whatever else a configured git prints.
  const dates = ((await git(clone, ['log', '--format=%cI'])) ?? '')
    .split('\n')
    .filter((line) => /^\d{4}-\d{2}-\d{2}T/.test(line) && Number.isFinite(Date.parse(line)));
  const times = dates.map((d) => Date.parse(d));
  const tags = ((await git(clone, ['tag', '--list'])) ?? '').split('\n').filter(Boolean).length;
  const branch = (await git(clone, ['rev-parse', '--abbrev-ref', 'HEAD']))?.trim();
  const head = (await git(clone, ['rev-parse', 'HEAD']))?.trim();

  const reading: ActivityReading = {
    observedBy: options.observedBy,
    observedAt: now.toISOString(),
    commits: dates.length,
    commitsLast90Days: times.filter((t) => now.getTime() - t <= 90 * DAY_MS).length,
    tags,
  };
  // A loop, not Math.max(...times): a spread of a large history overflows the stack.
  let last = 0;
  let first = 0;
  for (let i = 1; i < times.length; i++) {
    if (times[i] > times[last]) last = i;
    if (times[i] < times[first]) first = i;
  }
  if (dates.length) {
    reading.lastCommitAt = dates[last];
    reading.firstCommitAt = dates[first];
  }
  if (branch && branch !== 'HEAD') reading.branch = branch;
  if (head && /^[0-9a-f]{40}$/.test(head)) reading.head = head;
  return reading;
}

/** `repository:<owner>/<name>` from the clone's `origin` remote, when it is on GitHub. */
export async function originRepository(clone: string): Promise<string | undefined> {
  const url = (await git(clone, ['remote', 'get-url', 'origin']))?.trim();
  const repo = url ? parseGithubRemote(url) : undefined;
  return repo ? repositoryNodeId(repo.owner, repo.name) : undefined;
}
