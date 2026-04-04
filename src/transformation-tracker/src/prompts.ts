/**
 * @medicine-wheel/transformation-tracker — Prompts Module
 *
 * Generates reflection prompts appropriate to ceremony phases,
 * phase transitions, and relational milestones. These prompts
 * guide the researcher toward deeper Wilson-aligned reflection.
 */

import type { CeremonyPhase } from 'medicine-wheel-ontology-core';

/**
 * Generate reflection prompts for a given ceremony phase.
 * Each phase invites different kinds of reflection.
 */
export function reflectionPrompts(phase: CeremonyPhase): string[] {
  switch (phase) {
    case 'opening':
      return [
        'What intentions do you bring to this research cycle?',
        'Who are you in relation to this research? What is your positionality?',
        'What relationships already exist that this research touches?',
        'What obligations do you carry into this work?',
        'How might this research change you?',
      ];
    case 'council':
      return [
        'What perspectives have you encountered that challenge your assumptions?',
        'Whose voice is missing from this conversation?',
        'How have your relations shifted since the opening?',
        'What reciprocity have you practiced so far?',
        'What are you learning about yourself through this process?',
      ];
    case 'integration':
      return [
        'How has your understanding been transformed by this research?',
        'What new relations have formed? How will you honor them?',
        'What have you received from the community? What have you given back?',
        'How will future generations benefit from what you have learned?',
        'What tensions remain unresolved? How do you sit with them?',
      ];
    case 'closure':
      return [
        'How are you different now than when you began?',
        'What obligations remain? How will you fulfill them?',
        'What will you carry forward into your next cycle?',
        'How will you continue to honor the relations formed here?',
        'What gratitude do you wish to express?',
      ];
  }
}

/**
 * Generate prompts appropriate for transitioning between ceremony phases.
 * Transitions are liminal moments that invite particular awareness.
 */
export function phaseTransitionPrompts(from: CeremonyPhase, to: CeremonyPhase): string[] {
  const key = `${from}->${to}`;
  switch (key) {
    case 'opening->council':
      return [
        'As you move from intention-setting to council, what has crystallized?',
        'What questions will you bring to the council circle?',
        'How has your relational posture shifted since the opening?',
      ];
    case 'council->integration':
      return [
        'What emerged from council that surprised you?',
        'What new understanding needs to be woven together?',
        'How have the diverse voices of council changed your perspective?',
      ];
    case 'integration->closure':
      return [
        'What has been integrated that you wish to carry forward?',
        'What remains to be honored before closure?',
        'What reciprocity needs to be completed before this cycle ends?',
      ];
    default:
      return [
        `Transitioning from ${from} to ${to}: What needs to be acknowledged?`,
        'What are you carrying from the previous phase?',
        'What are you leaving behind?',
      ];
  }
}

/**
 * Generate prompts for relational milestones during the research process.
 * Milestones mark significant moments in the relational journey.
 */
export function milestonePrompts(milestone: RelationalMilestone): string[] {
  switch (milestone) {
    case 'first-relation':
      return [
        'A new relation has formed. How will you honor it?',
        'What obligations does this new relation carry?',
        'How does this relation connect to your research intentions?',
      ];
    case 'reciprocity-balance':
      return [
        'Reciprocity is balanced. How does it feel to be in right relation?',
        'What enabled this balance? How can you sustain it?',
        'Who else might benefit from what you have learned about reciprocity?',
      ];
    case 'community-benefit':
      return [
        'The community has benefited from your research. What made this possible?',
        'How can you deepen this benefit over time?',
        'What feedback has the community offered?',
      ];
    case 'transformation-detected':
      return [
        'Growth has been detected in your research journey. What has changed?',
        'How has your understanding of relationships shifted?',
        'What would you tell your past self about what you have learned?',
      ];
    case 'seven-generation':
      return [
        'Your research now touches seven generations. What does this mean to you?',
        'How will those not yet born experience the effects of this work?',
        'What responsibility does this long-term impact carry?',
      ];
  }
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Relational milestones that trigger prompt generation */
export type RelationalMilestone =
  | 'first-relation'
  | 'reciprocity-balance'
  | 'community-benefit'
  | 'transformation-detected'
  | 'seven-generation';
