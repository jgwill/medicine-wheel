/**
 * @medicine-wheel/ceremony-protocol — Relational Production Protocol
 *
 * A ceremony-style protocol for entering and closing creative production
 * sessions (Research is Ceremony — Renaud thread). Production stages map onto
 * the existing CeremonyPhase machinery, so a production session is a first-class
 * ceremony rather than an ad-hoc run. Closure is gated: ceremony cannot be
 * skipped.
 */
import type { CeremonyPhase } from '@medicine-wheel/ontology-core';

export type ProductionStage = 'pre-production' | 'on-set' | 'post-production' | 'closure';

export interface ProductionProtocolStep {
  prompt: string;
  honors: string;
}

export interface ProductionProtocolStage {
  stage: ProductionStage;
  ceremonyPhase: CeremonyPhase;
  steps: ProductionProtocolStep[];
}

export const PRODUCTION_STAGE_ORDER: ProductionStage[] = [
  'pre-production',
  'on-set',
  'post-production',
  'closure',
];

/** Production stages reuse the existing four ceremony phases. */
export const STAGE_TO_PHASE: Record<ProductionStage, CeremonyPhase> = {
  'pre-production': 'opening',
  'on-set': 'council',
  'post-production': 'integration',
  closure: 'closure',
};

/** The four-stage Relational Production Protocol drafted in episode 066. */
export const RELATIONAL_PRODUCTION_PROTOCOL: ProductionProtocolStage[] = [
  {
    stage: 'pre-production',
    ceremonyPhase: 'opening',
    steps: [
      { prompt: 'What relationship are we honoring through this work?', honors: 'relational accountability' },
      { prompt: 'What knowledge seeks to emerge through this session?', honors: 'epistemic humility' },
      {
        prompt: 'Brief agents on the storyteller signature to preserve and what cannot be extracted.',
        honors: 'creative signature',
      },
      {
        prompt: 'Seed 3–5 core themes / visual metaphors / sonic environments.',
        honors: 'narrative intent',
      },
    ],
  },
  {
    stage: 'on-set',
    ceremonyPhase: 'council',
    steps: [
      {
        prompt: 'Log director intent, ambient context, and relational moments as witnessed events.',
        honors: 'witnessing not extraction',
      },
      {
        prompt: 'Pause: are we maintaining relationship with our intent? What is emerging unbidden?',
        honors: 'presence',
      },
    ],
  },
  {
    stage: 'post-production',
    ceremonyPhase: 'integration',
    steps: [
      { prompt: 'Run rushes through narrative clustering; identify the story spine.', honors: 'narrative cognition' },
      {
        prompt: 'Validate outputs against the storyteller gate; return voiceless output for revision.',
        honors: 'quality as ceremony',
      },
    ],
  },
  {
    stage: 'closure',
    ceremonyPhase: 'closure',
    steps: [
      { prompt: 'What knowledge emerged through this relationship?', honors: 'reciprocity' },
      { prompt: 'What contextual signatures should persist into future sessions?', honors: 'memory' },
      {
        prompt: 'Acknowledge all relationships that made this work possible; release with gratitude.',
        honors: 'gratitude',
      },
    ],
  },
];

export interface ProductionSession {
  id: string;
  intention: string;
  participants: string[];
  stage: ProductionStage;
  openedAt: string;
  closedAt?: string;
  /** Stages that have been entered and honored, in order. */
  stagesHonored: ProductionStage[];
  reflections: string[];
}

/** Open a production session at the pre-production stage. */
export function openProductionSession(
  intention: string,
  participants: string[] = [],
): ProductionSession {
  return {
    id: `production-session:${Date.now()}`,
    intention,
    participants,
    stage: 'pre-production',
    openedAt: new Date().toISOString(),
    stagesHonored: ['pre-production'],
    reflections: [],
  };
}

/** Advance to the next stage, recording it as honored. No-op at closure. */
export function advanceProductionStage(session: ProductionSession): ProductionSession {
  const idx = PRODUCTION_STAGE_ORDER.indexOf(session.stage);
  if (idx < 0 || idx >= PRODUCTION_STAGE_ORDER.length - 1) return session;
  const next = PRODUCTION_STAGE_ORDER[idx + 1];
  const stagesHonored = session.stagesHonored.includes(next)
    ? session.stagesHonored
    : [...session.stagesHonored, next];
  return { ...session, stage: next, stagesHonored };
}

/**
 * Close a production session. Refuses to close unless every stage was honored —
 * ceremony cannot be skipped.
 */
export function closeProductionSession(
  session: ProductionSession,
  reflections: string[] = [],
): ProductionSession {
  const missing = PRODUCTION_STAGE_ORDER.filter((s) => !session.stagesHonored.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `Cannot close production session: ceremony cannot be skipped. ` +
        `Stages not yet honored: ${missing.join(', ')}. Advance through each stage first.`,
    );
  }
  return {
    ...session,
    stage: 'closure',
    closedAt: new Date().toISOString(),
    reflections: [...session.reflections, ...reflections],
  };
}
