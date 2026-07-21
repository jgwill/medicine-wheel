/**
 * GitHub webhook payload shapes and re-exported ceremony record types.
 *
 * The CeremonyEventRecord shape (and its phase/kind/participant vocabulary) is
 * owned by @medicine-wheel/storage-provider so both jsonl and neon persist the
 * same shape. This package owns detection and processing.
 */

import type { DirectionName } from '@medicine-wheel/ontology-core';
import type {
  CeremonialPhase,
  CeremonyEventKind,
  CeremonyEventParticipant,
  CeremonyEventRecord,
  CeremonyEventFilters,
} from '@medicine-wheel/storage-provider';

export type {
  CeremonialPhase,
  CeremonyEventKind,
  CeremonyEventParticipant,
  CeremonyEventRecord,
  CeremonyEventFilters,
};

export interface GitHubWebhookEvent {
  type: string;
  payload: any;
}

export interface GitHubLabel {
  name: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: GitHubLabel[];
  user: { login: string };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  head: { ref: string };
  base: { ref: string };
  labels?: GitHubLabel[];
  user: { login: string };
}

/**
 * Bridge each ceremonial phase onto the Four Directions, reusing ontology-core's
 * DirectionName. Kept in step with @medicine-wheel/ceremonial-diary's mapping.
 */
export const PHASE_TO_DIRECTION: Record<CeremonialPhase, DirectionName> = {
  miigwechiwendam: 'east',
  nindokendaan: 'south',
  ningwaab: 'west',
  nindoodam: 'west',
  migwech: 'north',
};
