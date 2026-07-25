/**
 * @medicine-wheel/creative-orientation
 *
 * Which orientation does this situation call for?
 *
 * Problem-solving is not the degraded case. It is the correct case for a
 * specific situation: something worked, it stopped working, restore it.
 * Creating is the correct case for a different one: bring into being a state
 * that has never existed. They produce different structures — one oscillates
 * back to a baseline, one advances toward an outcome — and using the wrong
 * one is how rigorous work goes in circles.
 *
 * This module answers the routing question and nothing else. It does not
 * decide, it does not block. A caller that disagrees proceeds, because
 * sometimes the caller knows something the check does not.
 *
 * @packageDocumentation
 */

// ─── The discriminator ────────────────────────────────────────────

/**
 * The one question that separates the two orientations.
 *
 * A feeling of urgency is not evidence — under pressure everything feels like
 * a fire. What distinguishes them is whether there is a prior state you are
 * returning to. If you can name it and it genuinely existed, the situation is
 * a fire. If you cannot, you are creating, and difference-closing language
 * will mislead you because there is no baseline to close toward.
 */
export interface SituationClaim {
  /** What the caller wants. */
  outcome: string;
  /**
   * The prior state being restored, if any. A string means the caller claims
   * one existed; `null` means they claim none did.
   */
  restores: string | null;
  /** Optional evidence that the claimed prior state was real. */
  evidence?: string;
}

export type Orientation = 'advancing' | 'oscillating' | 'ambiguous';

export type Route = 'gap-analysis' | 'structural-tension';

export interface OrientationSignal {
  kind: 'vocabulary' | 'baseline' | 'outcome-shape';
  detail: string;
  /** Which orientation this signal points toward. */
  suggests: Orientation;
}

export interface OrientationReading {
  orientation: Orientation;
  /** Where this situation should be taken next. */
  route: Route;
  signals: OrientationSignal[];
  /**
   * Present when the reading disagrees with how the outcome was phrased.
   * Advisory — never a refusal.
   */
  advice?: string;
  /** The outcome restated in advancing form, when that is what is called for. */
  suggestedOutcome?: string;
}

// ─── Vocabulary ───────────────────────────────────────────────────

/**
 * Words that describe the removal of something unwanted rather than the
 * presence of something wanted.
 *
 * These are **evidence, not verdicts**. "Reduce latency" is a correct outcome
 * when the forest is on fire. The same phrase as a product vision is a symptom
 * worth surfacing. A blocklist would be wrong in exactly the situation where
 * this vocabulary is right.
 */
export const ELIMINATION_MARKERS = [
  'avoid', 'prevent', 'reduce', 'eliminate', 'stop', 'fix', 'catch',
  'remove', 'minimize', 'minimise', 'mitigate', 'resolve the problem',
  'get rid of', 'bridge the gap', 'close the gap', 'gap between',
] as const;

/** Words that describe a state coming into being. */
export const ADVANCING_MARKERS = [
  'bring into being', 'establish', 'create', 'arrives', 'exists',
  'becomes', 'holds', 'carries', 'is able to', 'can now',
] as const;

const WORD_BOUNDARY = /[^a-z]+/;

function mentions(haystack: string, needle: string): boolean {
  const text = haystack.toLowerCase();
  if (needle.includes(' ')) return text.includes(needle);
  return text.split(WORD_BOUNDARY).includes(needle);
}

// ─── Reading a situation ──────────────────────────────────────────

/**
 * Read a situation and say which orientation it calls for.
 *
 * The baseline claim decides the route; vocabulary only ever contributes
 * signals. A caller who names a real prior state gets routed to gap analysis
 * even if they phrased the outcome beautifully — and a caller who names none
 * gets routed to structural tension even if every word they used was
 * elimination-shaped.
 */
export function readOrientation(claim: SituationClaim): OrientationReading {
  const signals: OrientationSignal[] = [];

  const eliminationHits = ELIMINATION_MARKERS.filter(m => mentions(claim.outcome, m));
  for (const hit of eliminationHits) {
    signals.push({
      kind: 'vocabulary',
      detail: `"${hit}" in outcome position describes removing something, not a state that exists`,
      suggests: 'oscillating',
    });
  }

  const advancingHits = ADVANCING_MARKERS.filter(m => mentions(claim.outcome, m));
  for (const hit of advancingHits) {
    signals.push({
      kind: 'vocabulary',
      detail: `"${hit}" names a state coming into being`,
      suggests: 'advancing',
    });
  }

  const hasBaseline = typeof claim.restores === 'string' && claim.restores.trim().length > 0;

  signals.push(
    hasBaseline
      ? {
          kind: 'baseline',
          detail: `a prior state is claimed: ${claim.restores}${claim.evidence ? ` (evidence: ${claim.evidence})` : ' — no evidence given'}`,
          suggests: 'oscillating',
        }
      : {
          kind: 'baseline',
          detail: 'no prior state is being restored — there is no baseline to close toward',
          suggests: 'advancing',
        },
  );

  const orientation: Orientation = hasBaseline ? 'oscillating' : 'advancing';
  const route: Route = hasBaseline ? 'gap-analysis' : 'structural-tension';

  const reading: OrientationReading = { orientation, route, signals };

  // The two disagreements worth surfacing.
  if (!hasBaseline && eliminationHits.length > 0) {
    reading.advice =
      'This outcome is phrased as removing something, but nothing is being restored. ' +
      'Elimination framing here optimises against a list of known failures rather than ' +
      'toward the state you actually want. Restate it as the state that will exist.';
    reading.suggestedOutcome = reorient(claim.outcome);
  } else if (hasBaseline && !claim.evidence) {
    reading.advice =
      'A prior state is claimed but not evidenced. Under pressure every situation feels ' +
      'like a fire. Name when this state existed, or the routing rests on a feeling.';
  }

  return reading;
}

/**
 * Restate an elimination-shaped outcome as a desired state.
 *
 * Deliberately mechanical and deliberately incomplete: it produces a prompt for
 * a human or agent to finish, not a finished sentence. A confident rewrite here
 * would be a machine deciding what someone wants.
 */
export function reorient(outcome: string): string {
  const hit = ELIMINATION_MARKERS.find(m => mentions(outcome, m));
  if (!hit) return outcome;
  return `[restate without "${hit}"] What state exists once this is true? — ${outcome}`;
}

/** Convenience: the route alone, for callers that only need to dispatch. */
export function routeFor(claim: SituationClaim): Route {
  return readOrientation(claim).route;
}

/**
 * Does this reading warrant interrupting the caller?
 *
 * True only when the orientation and the phrasing disagree. Advice on a
 * situation the caller already framed correctly is noise, and noise is how
 * checks get switched off.
 */
export function worthSaying(reading: OrientationReading): boolean {
  return typeof reading.advice === 'string';
}
