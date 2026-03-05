/**
 * medicine-wheel-ceremony-protocol
 *
 * Ceremony lifecycle protocol — manages ceremony state, phase transitions,
 * governance enforcement, and ceremonial review workflows.
 */

import type {
  RSISConfig,
  CeremonyPhase,
  SunName,
  GovernanceConfig,
  GovernanceProtectedPath,
  GovernanceAccess,
} from 'medicine-wheel-ontology-core';

// ── Ceremony State ──────────────────────────────────────────────────────────

export interface CeremonyState {
  currentCycle: string;
  hostSun: SunName;
  phase: CeremonyPhase;
  startDate?: string;
  endDate?: string;
}

/** Load ceremony state from an RSIS config */
export function loadCeremonyState(config: RSISConfig): CeremonyState | null {
  if (!config.ceremony) return null;
  return {
    currentCycle: config.ceremony.current_cycle || 'unknown',
    hostSun: config.ceremony.host_sun || 'NovelEmergence',
    phase: config.ceremony.phase || 'opening',
  };
}

// ── Phase Transitions ───────────────────────────────────────────────────────

const PHASE_ORDER: CeremonyPhase[] = ['opening', 'council', 'integration', 'closure'];

/** Get the next ceremony phase */
export function nextPhase(current: CeremonyPhase): CeremonyPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/** Get ceremony-phase-aware framing for tool output */
export function getPhaseFraming(phase?: CeremonyPhase): string {
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

// ── Governance Enforcement ──────────────────────────────────────────────────

/** Check if a file path falls under governance protection */
export function checkGovernance(
  filePath: string,
  config: GovernanceConfig,
): GovernanceProtectedPath | null {
  if (!config.protected_paths) return null;
  for (const rule of config.protected_paths) {
    if (rule.path.includes('*')) {
      const regex = new RegExp('^' + rule.path.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) return rule;
    } else if (filePath.startsWith(rule.path) || filePath === rule.path) {
      return rule;
    }
  }
  return null;
}

/** Check if a file path should be excluded from indexing */
export function isIndexExcluded(filePath: string, config: GovernanceConfig): boolean {
  if (!config.index_exclusions) return false;
  return config.index_exclusions.some((exclusion) => {
    if (exclusion.includes('*')) {
      const regex = new RegExp('^' + exclusion.replace(/\*/g, '.*') + '$');
      return regex.test(filePath);
    }
    return filePath.startsWith(exclusion) || filePath === exclusion;
  });
}

/** Check if changes to a file require ceremonial review */
export function checkCeremonyRequired(filePath: string, config: GovernanceConfig): boolean {
  if (!config.ceremony_required_changes) return false;
  return config.ceremony_required_changes.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(filePath);
    }
    return filePath.startsWith(pattern) || filePath === pattern;
  });
}

/** Get governance access level for a path */
export function getAccessLevel(filePath: string, config: GovernanceConfig): GovernanceAccess {
  const rule = checkGovernance(filePath, config);
  if (rule) return rule.access;
  if (checkCeremonyRequired(filePath, config)) return 'ceremony_required';
  return 'open';
}

/** Format a governance warning for tool output */
export function formatGovernanceWarning(rule: GovernanceProtectedPath): string {
  const authority = rule.authority.join(', ');
  return `⚠️ GOVERNANCE: Changes to [${rule.path}] require [${authority}] approval. Access level: ${rule.access}`;
}
