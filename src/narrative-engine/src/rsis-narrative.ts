/**
 * medicine-wheel-narrative-engine — RSIS Narrative Generators
 *
 * Produces ceremony-phase-aware provenance stories, reciprocity
 * narratives, and directional observations for RSIS tool outputs.
 */

import type {
  CeremonyPhase,
  CeremonyLineageEntry,
  DirectionName,
  DirectionDistribution,
  SunName,
} from 'medicine-wheel-ontology-core';
import { SUN_DESCRIPTIONS } from 'medicine-wheel-ontology-core';

/**
 * Generate a human-readable provenance narrative for a code artifact
 */
export function generateProvenanceNarrative(
  symbolName: string,
  lineage: CeremonyLineageEntry[],
  inquiries: Array<{ name: string }>,
  stewards: Array<{ name: string }>,
): string {
  let narrative = `"${symbolName}" `;
  if (lineage.length > 0) {
    const first = lineage[0];
    narrative += `was born in the ${first.sun || 'Unknown'} Sun during cycle ${first.cycle || 'unknown'}`;
    if (lineage.length > 1) {
      const last = lineage[lineage.length - 1];
      narrative += `, most recently touched under ${last.sun || 'Unknown'} during cycle ${last.cycle || 'unknown'}`;
    }
    narrative += '.';
  } else {
    narrative += 'has no recorded ceremonial lineage yet.';
  }
  if (inquiries.length > 0) {
    narrative += ` It serves ${inquiries.length} ${inquiries.length === 1 ? 'inquiry' : 'inquiries'}: ${inquiries.map(i => i.name).join(', ')}.`;
  }
  if (stewards.length > 0) {
    narrative += ` Stewarded by: ${stewards.map(s => s.name).join(', ')}.`;
  }
  return narrative;
}

/**
 * Generate a reciprocity observation — always invitational, never evaluative
 */
export function generateReciprocityObservation(
  stewardCount: number,
  flowCount: number,
): string {
  const parts: string[] = [];
  if (flowCount === 0 && stewardCount === 0) {
    return 'No reciprocity data has been populated yet. Consider running rsis-gitnexus analyze with RSIS mode enabled.';
  }
  if (stewardCount > 0) {
    parts.push(`${stewardCount} steward(s) identified. This area invites reflection on how stewardship is distributed.`);
  }
  if (flowCount > 0) {
    parts.push(`${flowCount} reciprocity flow(s) identified. This area invites reflection on how contributions move.`);
  }
  return parts.join(' ');
}

const DIRECTION_EMOJI: Record<DirectionName, string> = {
  east: '🌸', south: '🧠', west: '⚡', north: '🕸️',
};

/**
 * Generate a natural language observation about directional balance
 */
export function generateDirectionObservation(
  distribution: DirectionDistribution,
  total: number,
): string {
  if (total === 0) return 'No recent changes to analyze.';

  const entries = Object.entries(distribution) as [DirectionName, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];

  return `Recent work is concentrated in ${dominant} ${DIRECTION_EMOJI[dominant]} (${distribution[dominant]}%). ` +
    `The ecosystem may benefit from a ${weakest} ${DIRECTION_EMOJI[weakest]} ceremony.`;
}

/**
 * Get ceremony-phase-aware framing for tool output
 */
export function getCeremonyPhaseFraming(phase?: CeremonyPhase): string {
  switch (phase) {
    case 'opening':
      return 'Opening Phase — What wants to emerge? Focus on intention and vision.';
    case 'council':
      return 'Council Phase — Cross-Sun perspectives on code relationships.';
    case 'integration':
      return 'Integration Phase — Weaving insights into synthesis artifacts.';
    case 'closure':
      return 'Closure Phase — Reciprocity summaries and seeding observations.';
    default:
      return '';
  }
}

/**
 * Describe a Thematic Sun
 */
export function describeSun(sun: SunName): string {
  return SUN_DESCRIPTIONS[sun] || sun;
}
