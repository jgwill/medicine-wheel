/**
 * @medicine-wheel/community-review — Storyteller Perspective Gate
 *
 * A runtime quality boundary: output that lacks the creator's storyteller
 * signature is rejected with a useful revision reason, so an agent revises
 * rather than ships voiceless output.
 *
 * Episode 066 (Jerry thread): "if there is no Miette perspective … in the
 * output, it's going to get rejected and the agent will have to revise."
 * Modeled on the existing `mw_enforce_gate` rejection pattern — accountability
 * at the interface layer, not model retraining.
 */

/** The creative signature an output must carry to be accountable to its author. */
export interface StorytellerSignature {
  /**
   * Markers that identify the creator's storyteller voice — names, glyphs, or
   * phrases (e.g. ['🌸', 'Miette', 'narrative resonance']). Matched
   * case-insensitively as substrings.
   */
  markers: string[];
  /** Minimum number of DISTINCT markers required to pass (default: 1). */
  minMarkers?: number;
  /** Optional human label for the signature, used in the revision reason. */
  label?: string;
}

export interface StorytellerGateResult {
  /** Whether the output carries enough of the storyteller signature. */
  passed: boolean;
  /** Distinct markers found in the output. */
  matchedMarkers: string[];
  /** True when no signature marker at all was found. */
  missingSignature: boolean;
  /** When rejected, a concrete instruction the agent can act on to revise. */
  revisionReason?: string;
}

/**
 * Evaluate an output against a storyteller signature.
 *
 * @param output  The produced text to evaluate.
 * @param signature  The creative signature it must carry.
 */
export function storytellerGate(
  output: string,
  signature: StorytellerSignature,
): StorytellerGateResult {
  const minMarkers = Math.max(1, signature.minMarkers ?? 1);
  const haystack = (output ?? '').toLowerCase();

  const matchedMarkers = signature.markers.filter((marker) => {
    const needle = marker.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });

  const passed = matchedMarkers.length >= minMarkers;
  const missingSignature = matchedMarkers.length === 0;

  if (passed) {
    return { passed, matchedMarkers, missingSignature };
  }

  const label = signature.label ?? 'storyteller perspective';
  const missing = signature.markers.filter((m) => !matchedMarkers.includes(m));
  const need = minMarkers - matchedMarkers.length;
  const revisionReason =
    `Rejected: output does not carry the ${label}. ` +
    `Found ${matchedMarkers.length}/${minMarkers} required signature marker(s). ` +
    `Revise to include at least ${need} more of: ${missing.join(', ')}. ` +
    `An output without the storyteller's voice is not accountable to its author — ` +
    `add the narrative resonance before this can pass.`;

  return { passed, matchedMarkers, missingSignature, revisionReason };
}

/**
 * Convenience: throw when the gate rejects, mirroring `mw_enforce_gate`
 * rejection semantics for call sites that prefer fail-fast over inspection.
 */
export function enforceStorytellerGate(
  output: string,
  signature: StorytellerSignature,
): void {
  const result = storytellerGate(output, signature);
  if (!result.passed) {
    throw new Error(result.revisionReason ?? 'Storyteller gate rejected the output.');
  }
}
