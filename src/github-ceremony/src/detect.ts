/**
 * Ceremony detection and extraction — pure functions over parsed webhook
 * payloads. No storage, no framework, no network. Ported from Miadi's
 * github-ceremony-processor, preserving its ceremonial semantics.
 */

import type { DirectionName } from '@medicine-wheel/ontology-core';
import type {
  CeremonialPhase,
  CeremonyEventKind,
  CeremonyEventParticipant,
  GitHubIssue,
  GitHubLabel,
  GitHubPullRequest,
  GitHubWebhookEvent,
} from './types.js';
import { PHASE_TO_DIRECTION } from './types.js';

const CEREMONIAL_KEYWORDS = [
  'ceremony',
  'consensus',
  'relational',
  'community',
  'indigenous',
  'migwech',
];

/** Map a ceremonial phase to a Four-Directions value. */
export function phaseToDirection(phase: CeremonialPhase): DirectionName {
  return PHASE_TO_DIRECTION[phase];
}

/** Determine whether a GitHub event should be witnessed ceremonially. */
export function isCeremonialEvent(event: GitHubWebhookEvent): boolean {
  const { type, payload } = event;

  if (type === 'issues' || type === 'pull_request') {
    const labels: GitHubLabel[] = payload.issue?.labels || payload.pull_request?.labels || [];
    const hasCeremonialLabel = labels.some(
      (label) =>
        label.name.includes('ceremony') ||
        label.name.includes('consensus') ||
        label.name.includes('ceremonial'),
    );
    if (hasCeremonialLabel) return true;
  }

  // A push is ceremonial when any commit names a ceremony; processCommits then
  // filters commit-by-commit. (Miadi gated push behind issue/PR-only checks,
  // leaving its push path unreachable — this restores the intended behavior.)
  if (type === 'push') {
    const commits: Array<{ message?: string }> = payload.commits || [];
    return commits.some(
      (commit) =>
        typeof commit?.message === 'string' &&
        commit.message.toLowerCase().includes('ceremony'),
    );
  }

  const title: string = payload.issue?.title || payload.pull_request?.title || '';
  const body: string = payload.issue?.body || payload.pull_request?.body || '';

  return CEREMONIAL_KEYWORDS.some(
    (keyword) =>
      title.toLowerCase().includes(keyword) || body.toLowerCase().includes(keyword),
  );
}

/** Extract the ceremonial phase from labels or content, defaulting to research. */
export function extractCeremonialPhase(
  labels: GitHubLabel[],
  content?: string,
): CeremonialPhase {
  const labelNames = labels.map((l) => l.name.toLowerCase());
  const contentLower = content?.toLowerCase() ?? '';

  if (labelNames.includes('miigwechiwendam') || contentLower.includes('sacred space')) {
    return 'miigwechiwendam';
  }
  if (labelNames.includes('nindokendaan') || contentLower.includes('research')) {
    return 'nindokendaan';
  }
  if (labelNames.includes('ningwaab') || contentLower.includes('integration')) {
    return 'ningwaab';
  }
  if (labelNames.includes('nindoodam') || contentLower.includes('creative')) {
    return 'nindoodam';
  }
  if (labelNames.includes('migwech') || contentLower.includes('closing')) {
    return 'migwech';
  }

  return 'nindokendaan';
}

/** Extract participants from an issue or PR, optionally including mentions. */
export function extractParticipants(
  issue: GitHubIssue | GitHubPullRequest,
  mentions?: string[],
): CeremonyEventParticipant[] {
  const participants: CeremonyEventParticipant[] = [
    { name: issue.user.login, role: 'Creator', perspective: 'both' },
  ];

  if (mentions) {
    for (const username of mentions) {
      if (!participants.find((p) => p.name === username)) {
        participants.push({ name: username, role: 'Participant', perspective: 'both' });
      }
    }
  }

  return participants;
}

/** Extract relationship impacts from free text via markers, then heuristics. */
export function extractRelationshipImpacts(content: string): string[] {
  const impacts: string[] = [];
  const impactMarkers = ['affects:', 'impacts:', 'relates to:', 'influences:'];

  for (const marker of impactMarkers) {
    const regex = new RegExp(`${marker}\\s*([^\\n]+)`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      for (const match of matches) {
        const replaceRegex = new RegExp(`${marker}\\s*([^\\n]+)`, 'i');
        const impact = match.replace(replaceRegex, '$1').trim();
        if (impact) impacts.push(impact);
      }
    }
  }

  if (impacts.length === 0) {
    const impactLines = content
      .split('\n')
      .filter(
        (line) =>
          line.toLowerCase().includes('affect') ||
          line.toLowerCase().includes('impact') ||
          line.toLowerCase().includes('relationship'),
      );
    impacts.push(...impactLines.slice(0, 3));
  }

  return impacts.length > 0 ? impacts : ['General system impact'];
}

/**
 * Deterministic spiral key preserving Miadi's `Ceremony.<kind>.<phase>.<millis>`
 * shape without any Redis dependency (the Upstash-backed spiral lives local to
 * Miadi). The key is a stable identifier, not a storage handle.
 */
export function generateSpiralKey(
  kind: CeremonyEventKind,
  phase: CeremonialPhase,
  timestamp: Date | string,
): string {
  const millis = timestamp instanceof Date ? timestamp.getTime() : Date.parse(timestamp);
  return `Ceremony.${kind}.${phase}.${Number.isNaN(millis) ? Date.now() : millis}`;
}
