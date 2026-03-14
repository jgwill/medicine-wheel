/**
 * @medicine-wheel/consent-lifecycle — Community Module
 *
 * Community-level consent operations: collective consent,
 * consensus mechanisms, and Elder endorsement.
 * Community consent transcends individual consent — it represents
 * the collective voice of the community.
 */

import type {
  ConsentRecord,
  ConsentScope,
  ConsentStateChange,
} from './types.js';

/**
 * Create a community-level consent record.
 * Community consent represents collective agreement, not just
 * individual grantor/grantee relations.
 */
export function communityConsent(
  community: CommunityInfo,
  scope: ConsentScope,
): ConsentRecord {
  const now = new Date().toISOString();

  return {
    id: `community-consent-${Date.now()}`,
    grantor: community.name,
    grantee: community.grantee,
    scope,
    state: 'pending',
    ceremonies: [],
    history: [{
      from: 'pending' as const,
      to: 'pending' as const,
      reason: 'Community consent record created — awaiting collective decision.',
      timestamp: now,
      initiatedBy: community.initiatedBy,
    }],
    communityLevel: true,
    dependentRelations: [],
    ocapFlags: {
      ownership: community.name,
      control: community.name,
      access: 'community',
      possession: 'community-server',
      compliant: false,
    },
  };
}

/**
 * Consensus mechanism for collective decision-making.
 * Collects voices and determines whether consensus is reached.
 */
export function collectiveDecision(voices: CommunityVoice[]): ConsensusResult {
  if (voices.length === 0) {
    return {
      consensusReached: false,
      approvalCount: 0,
      objectionCount: 0,
      abstainCount: 0,
      totalVoices: 0,
      summary: 'No voices recorded. Consensus requires community participation.',
    };
  }

  const approvals = voices.filter((v) => v.position === 'approve');
  const objections = voices.filter((v) => v.position === 'object');
  const abstentions = voices.filter((v) => v.position === 'abstain');

  // Consensus requires no objections (not just majority)
  const consensusReached = objections.length === 0 && approvals.length > 0;

  return {
    consensusReached,
    approvalCount: approvals.length,
    objectionCount: objections.length,
    abstainCount: abstentions.length,
    totalVoices: voices.length,
    objections: objections.map((v) => ({
      voice: v.name,
      reason: v.reason ?? 'No reason given',
    })),
    summary: consensusReached
      ? `Consensus reached with ${approvals.length} approval(s) and ${abstentions.length} abstention(s).`
      : `Consensus not reached: ${objections.length} objection(s). All concerns must be addressed.`,
  };
}

/**
 * Record Elder approval for a consent record.
 * Elder endorsement carries special weight in Indigenous governance.
 */
export function elderApproval(
  elderId: string,
  record: ConsentRecord,
  options?: ElderApprovalOptions,
): ConsentRecord {
  const now = new Date().toISOString();

  const change: ConsentStateChange = {
    from: record.state,
    to: record.state, // Elder approval doesn't change state directly
    reason: `Elder endorsement by ${elderId}${options?.blessing ? `: ${options.blessing}` : ''}`,
    timestamp: now,
    initiatedBy: elderId,
  };

  return {
    ...record,
    history: [...record.history, change],
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Information about the community granting consent */
export interface CommunityInfo {
  name: string;
  grantee: string;
  initiatedBy: string;
}

/** A community member's voice in collective decision-making */
export interface CommunityVoice {
  name: string;
  role: string;
  position: 'approve' | 'object' | 'abstain';
  reason?: string;
}

/** Result of a collective consensus process */
export interface ConsensusResult {
  consensusReached: boolean;
  approvalCount: number;
  objectionCount: number;
  abstainCount: number;
  totalVoices: number;
  objections?: Array<{ voice: string; reason: string }>;
  summary: string;
}

/** Options for Elder approval */
export interface ElderApprovalOptions {
  blessing?: string;
  conditions?: string[];
}
