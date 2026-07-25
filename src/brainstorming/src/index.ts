/**
 * @medicine-wheel/brainstorming
 *
 * Idea into committed design, through approval gates a human holds.
 *
 * This is the convergence protocol as data: the phases, the order, and the
 * points where the process stops and waits for a person. It calls
 * `@medicine-wheel/creative-orientation` on every outcome statement it emits
 * — including its own questions, which is the part that matters.
 *
 * An outcome phrased as elimination inside a multiple-choice option becomes
 * the human's selected answer, and from then on it looks like a requirement
 * rather than the agent's bias. Checking at the moment of speaking is the only
 * point where that is still catchable.
 *
 * @packageDocumentation
 */
import {
  readOrientation,
  worthSaying,
  type OrientationReading,
  type SituationClaim,
} from '@medicine-wheel/creative-orientation';

export type Phase =
  | 'explore'        // read the ground before asking anything
  | 'clarify'        // one question at a time
  | 'approaches'     // two or three, with trade-offs and a recommendation
  | 'design'         // sections, each approved before the next
  | 'spec'           // written, committed, self-reviewed
  | 'review'         // the human reads the spec
  | 'plan';          // terminal — hand off to implementation

export const PHASE_ORDER: Phase[] = [
  'explore', 'clarify', 'approaches', 'design', 'spec', 'review', 'plan',
];

/** Phases that end with a suspended state holding a question for a human. */
export const GATED_PHASES: ReadonlySet<Phase> = new Set<Phase>([
  'clarify', 'approaches', 'design', 'review',
]);

export interface Gate {
  phase: Phase;
  question: string;
  /** Set when the human has answered. Absent means the process is suspended here. */
  answer?: string;
  askedAt: string;
  answeredAt?: string;
}

export interface Session {
  id: string;
  /** The desired result this brainstorm is converging on. */
  outcome: string;
  phase: Phase;
  gates: Gate[];
  /** Reading taken on the outcome when the session opened. */
  orientation: OrientationReading;
  opened: string;
}

export interface OpenOptions {
  id?: string;
  timestamp?: string;
  /** A prior state being restored, if this is a repair rather than a creating act. */
  restores?: string | null;
  evidence?: string;
}

function defaultId(): string {
  return `brainstorm:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Open a session.
 *
 * The outcome is read for orientation immediately. A session opened on an
 * elimination-shaped outcome will converge rigorously on the wrong thing, and
 * that is far more expensive to discover at the spec stage.
 */
export function openSession(outcome: string, options: OpenOptions = {}): Session {
  if (!outcome?.trim()) {
    throw new Error('A brainstorm needs an outcome — what will exist when this is done?');
  }

  const claim: SituationClaim = {
    outcome,
    restores: options.restores ?? null,
    evidence: options.evidence,
  };

  return {
    id: options.id ?? defaultId(),
    outcome,
    phase: 'explore',
    gates: [],
    orientation: readOrientation(claim),
    opened: options.timestamp ?? new Date().toISOString(),
  };
}

export interface EmitCheck {
  /** The statement as written. */
  statement: string;
  reading: OrientationReading;
  /** True when the statement should be reworded before it reaches a human. */
  reword: boolean;
  advice?: string;
}

/**
 * Check any outcome statement before it is spoken — a section heading, an
 * approach summary, and above all an option label in a question.
 *
 * `restores` is threaded through from the session so a repair session is not
 * scolded for using repair vocabulary. Elimination language is only a finding
 * when nothing is being restored.
 */
export function checkEmission(session: Session, statement: string): EmitCheck {
  const reading = readOrientation({
    outcome: statement,
    restores: session.orientation.orientation === 'oscillating' ? 'inherited from session' : null,
  });
  const reword = worthSaying(reading);
  return {
    statement,
    reading,
    reword,
    ...(reword ? { advice: reading.advice } : {}),
  };
}

/** Check a whole set of option labels at once, returning only the ones that need rewording. */
export function checkOptions(session: Session, options: string[]): EmitCheck[] {
  return options.map(o => checkEmission(session, o)).filter(c => c.reword);
}

// ─── Gates ────────────────────────────────────────────────────────

/** Suspend the session on a question. The process does not advance until answered. */
export function ask(session: Session, question: string, at?: string): Session {
  return {
    ...session,
    gates: [...session.gates, { phase: session.phase, question, askedAt: at ?? new Date().toISOString() }],
  };
}

export function answer(session: Session, question: string, response: string, at?: string): Session {
  return {
    ...session,
    gates: session.gates.map(g =>
      g.question === question && g.answer === undefined
        ? { ...g, answer: response, answeredAt: at ?? new Date().toISOString() }
        : g,
    ),
  };
}

/** The gate currently holding the session, if any. */
export function suspendedOn(session: Session): Gate | null {
  return session.gates.find(g => g.answer === undefined) ?? null;
}

/**
 * Advance to the next phase.
 *
 * Refuses while a gate is unanswered. This is the one place refusal is right:
 * the gate is a question addressed to a person, and answering it on their
 * behalf is not a shortcut, it is a substitution.
 */
export function advance(session: Session): Session {
  const open = suspendedOn(session);
  if (open) {
    throw new Error(
      `Cannot advance past ${session.phase}: suspended on an unanswered question — "${open.question}"`,
    );
  }
  const i = PHASE_ORDER.indexOf(session.phase);
  if (i === PHASE_ORDER.length - 1) return session;
  return { ...session, phase: PHASE_ORDER[i + 1] };
}

export function isComplete(session: Session): boolean {
  return session.phase === 'plan' && suspendedOn(session) === null;
}
