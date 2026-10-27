/**
 * @medicine-wheel/transformation-tracker — Validity Module
 *
 * THE core function: wilsonValidityCheck.
 * Assesses the package's validity check, built on the lesson Wilson
 * reiterates: "If research doesn't change you as a person, then you haven't
 * done it right" (2008, p. 135). A co-researcher shared it; Wilson cannot
 * find which. The check and its five dimensions are ours; the function keeps
 * its name.
 *
 * This is the primary output of the transformation-tracker package —
 * a holistic assessment of whether the research has been valid
 * in Wilson's Indigenous relational terms.
 */

import type { TransformationLog, WilsonValidity } from './types.js';
import { detectGrowth } from './researcher.js';
import { reciprocityBalance, communityVoice } from './community.js';
import { strengthDelta } from './relational-shift.js';
import { sevenGenScore } from './seven-generations.js';
import { balanceCheck } from './reciprocity-ledger.js';

/**
 * Perform a comprehensive Wilson validity check.
 *
 * Evaluates five dimensions:
 * 1. Researcher transformation — has the researcher been changed?
 * 2. Community benefit — has the community benefited?
 * 3. Relational strengthening — have relations been strengthened?
 * 4. Reciprocity balance — is giving and receiving balanced?
 * 5. Seven-generation consideration — are future generations honored?
 *
 * Returns a WilsonValidity assessment with boolean flags, a composite
 * score, and what it found, each stated as a fact about the log today. When a
 * dimension is not met, `next_tool` names turn_to_creative_orientation: the
 * findings are current reality, and the desired outcome is named on its own
 * terms rather than derived from them.
 */
export function wilsonValidityCheck(log: TransformationLog): WilsonValidity {
  const recommendations: string[] = [];

  // 1. Researcher transformation
  const growth = detectGrowth(log);
  const researcherTransformed = growth.detected;
  if (!researcherTransformed) {
    recommendations.push(
      'No researcher transformation is detected in this log.',
    );
  }

  // 2. Community benefit
  const voice = communityVoice(log);
  const communityBenefited = voice.totalImpacts > 0 && voice.measurableImpacts > 0;
  if (!communityBenefited) {
    if (voice.totalImpacts === 0) {
      recommendations.push(
        'No community impacts are recorded in this log. Research must benefit the community to be valid.',
      );
    } else {
      recommendations.push(
        'The community impacts recorded carry no measurable outcome. What counts as a measure is the community\'s to define.',
      );
    }
  }

  // 3. Relations strengthened
  const delta = strengthDelta(log);
  const relationsStrengthened = delta.strengthened > delta.weakened && delta.totalShifts > 0;
  if (!relationsStrengthened) {
    if (delta.totalShifts === 0) {
      recommendations.push(
        'No relational shifts are tracked in this log.',
      );
    } else {
      recommendations.push(
        'More relations weakened than strengthened in this log.',
      );
    }
  }

  // 4. Reciprocity balance
  const balance = balanceCheck(log);
  const recBalance = reciprocityBalance(log);
  const reciprocityBalanced = balance.overallBalanced;
  if (!reciprocityBalanced) {
    recommendations.push(recBalance.summary);
  }

  // 5. Seven generations
  const sevenGen = sevenGenScore(log);
  const sevenGenerationsConsidered = sevenGen.score >= 0.4;
  if (!sevenGenerationsConsidered) {
    recommendations.push(
      'The seven-generation score is below 0.4: this log records little about how the research affects future generations.',
    );
  }

  // Composite scoring
  const dimensions = [
    researcherTransformed,
    communityBenefited,
    relationsStrengthened,
    reciprocityBalanced,
    sevenGenerationsConsidered,
  ];
  const trueCount = dimensions.filter(Boolean).length;
  const score = trueCount / dimensions.length;

  // Wilson says ALL dimensions must be present for full validity
  const overallValid = trueCount === dimensions.length;

  if (overallValid) {
    recommendations.push(
      'All Wilson validity dimensions met. Continue deepening relational engagement.',
    );
  }

  return {
    researcherTransformed,
    communityBenefited,
    relationsStrengthened,
    reciprocityBalanced,
    sevenGenerationsConsidered,
    overallValid,
    score,
    recommendations,
    ...(overallValid ? {} : { next_tool: 'turn_to_creative_orientation' as const }),
  };
}
