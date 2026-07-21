/**
 * Ceremony-event processing.
 *
 * `build*` functions are pure: they turn a parsed payload into a
 * CeremonyEventRecord. `process*` functions additionally persist through a
 * StorageProvider. Consensus workflows (`pull_request_review`) and the Upstash
 * spiral remain local to Miadi and are intentionally not ported here.
 */

import type { StorageProvider } from '@medicine-wheel/storage-provider';
import type {
  CeremonialPhase,
  CeremonyEventKind,
  CeremonyEventRecord,
  GitHubIssue,
  GitHubPullRequest,
  GitHubWebhookEvent,
} from './types.js';
import {
  extractCeremonialPhase,
  extractParticipants,
  extractRelationshipImpacts,
  generateSpiralKey,
  isCeremonialEvent,
  phaseToDirection,
} from './detect.js';

interface BuildRecordArgs {
  id: string;
  kind: CeremonyEventKind;
  phase: CeremonialPhase;
  participants: CeremonyEventRecord['participants'];
  relationshipImpacts: string[];
  timestamp: Date;
  repository?: string;
  reference?: string | number;
  metadata?: Record<string, unknown>;
}

function buildRecord(args: BuildRecordArgs): CeremonyEventRecord {
  return {
    id: args.id,
    source: 'github',
    kind: args.kind,
    phase: args.phase,
    direction: phaseToDirection(args.phase),
    participants: args.participants,
    relationshipImpacts: args.relationshipImpacts,
    spiralKey: generateSpiralKey(args.kind, args.phase, args.timestamp),
    timestamp: args.timestamp.toISOString(),
    ...(args.repository !== undefined ? { repository: args.repository } : {}),
    ...(args.reference !== undefined ? { reference: args.reference } : {}),
    ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
  };
}

/** Build a ceremony record from an opened issue (pure). */
export function buildIssueCeremony(payload: any, repository?: string): CeremonyEventRecord {
  const issue = payload.issue as GitHubIssue;
  const phase = extractCeremonialPhase(issue.labels, issue.body);
  return buildRecord({
    id: `issue-${issue.number}`,
    kind: 'issue',
    phase,
    participants: extractParticipants(issue),
    relationshipImpacts: extractRelationshipImpacts(issue.body || ''),
    timestamp: new Date(),
    repository,
    reference: issue.number,
  });
}

/** Build a ceremony record from an opened pull request (pure). */
export function buildPRCeremony(payload: any, repository?: string): CeremonyEventRecord {
  const pr = payload.pull_request as GitHubPullRequest;
  const phase = extractCeremonialPhase(pr.labels || [], `${pr.title}\n${pr.body}`);
  return buildRecord({
    id: `pr-${pr.number}`,
    kind: 'pr',
    phase,
    participants: extractParticipants(pr),
    relationshipImpacts: extractRelationshipImpacts(pr.body || ''),
    timestamp: new Date(),
    repository,
    reference: pr.number,
  });
}

/** Build a ceremony record from a merged pull request (pure, closing phase). */
export function buildMergeCeremony(payload: any, repository?: string): CeremonyEventRecord {
  const pr = payload.pull_request as GitHubPullRequest;
  return buildRecord({
    id: `merge-${pr.number}`,
    kind: 'merge',
    phase: 'migwech',
    participants: extractParticipants(pr),
    relationshipImpacts: extractRelationshipImpacts(pr.body || ''),
    timestamp: new Date(),
    repository,
    reference: pr.number,
  });
}

/**
 * Build ceremony records from push commits (pure). Only commits whose message
 * mentions "ceremony" are witnessed, matching Miadi's semantics.
 */
export function buildCommitCeremonies(payload: any, repository?: string): CeremonyEventRecord[] {
  const commits = payload.commits || [];
  const records: CeremonyEventRecord[] = [];

  for (const commit of commits) {
    if (!commit.message.toLowerCase().includes('ceremony')) continue;

    const shortSha = String(commit.id).substring(0, 7);
    records.push(
      buildRecord({
        id: `commit-${shortSha}`,
        kind: 'commit',
        phase: 'nindoodam',
        participants: [
          {
            name: commit.author?.username || commit.author?.name || 'unknown',
            role: 'Author',
            perspective: 'both',
          },
        ],
        relationshipImpacts: extractRelationshipImpacts(commit.message),
        timestamp: commit.timestamp ? new Date(commit.timestamp) : new Date(),
        repository,
        reference: shortSha,
      }),
    );
  }

  return records;
}

/** Build and persist an issue-opened ceremony. */
export async function processIssueOpened(
  payload: any,
  repository: string,
  store: StorageProvider,
): Promise<CeremonyEventRecord> {
  return store.registerCeremonyEvent(buildIssueCeremony(payload, repository));
}

/** Build and persist a PR-opened ceremony. */
export async function processPROpened(
  payload: any,
  repository: string,
  store: StorageProvider,
): Promise<CeremonyEventRecord> {
  return store.registerCeremonyEvent(buildPRCeremony(payload, repository));
}

/** Build and persist a PR-merged ceremony. */
export async function processPRMerged(
  payload: any,
  repository: string,
  store: StorageProvider,
): Promise<CeremonyEventRecord> {
  return store.registerCeremonyEvent(buildMergeCeremony(payload, repository));
}

/** Build and persist ceremonies for ceremonial commits in a push. */
export async function processCommits(
  payload: any,
  repository: string,
  store: StorageProvider,
): Promise<CeremonyEventRecord[]> {
  const records = buildCommitCeremonies(payload, repository);
  const stored: CeremonyEventRecord[] = [];
  for (const record of records) {
    stored.push(await store.registerCeremonyEvent(record));
  }
  return stored;
}

/**
 * Main entry point. Returns the ceremony record(s) produced, or null when the
 * event is not ceremonial or produces no new ceremony (e.g. a review, whose
 * consensus workflow stays local to Miadi).
 */
export async function processGitHubEvent(
  event: GitHubWebhookEvent,
  repository: string,
  store: StorageProvider,
): Promise<CeremonyEventRecord | CeremonyEventRecord[] | null> {
  if (!isCeremonialEvent(event)) return null;

  const { type, payload } = event;

  switch (type) {
    case 'issues':
      if (payload.action === 'opened') {
        return processIssueOpened(payload, repository, store);
      }
      return null;

    case 'pull_request':
      if (payload.action === 'opened') {
        return processPROpened(payload, repository, store);
      }
      if (payload.action === 'closed' && payload.pull_request?.merged) {
        return processPRMerged(payload, repository, store);
      }
      return null;

    case 'push':
      return processCommits(payload, repository, store);

    default:
      // pull_request_review and other events: consensus handling remains local.
      return null;
  }
}
