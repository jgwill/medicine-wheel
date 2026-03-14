/**
 * medicine-wheel-prompt-decomposition — Decomposer
 *
 * Ontology-enriched prompt decomposition engine.
 * Reuses the PDE patterns from ava-langchain-prompt-decomposition
 * but grounds them in medicine-wheel-ontology-core types.
 *
 * Design:
 * - Keyword-based directional classification (same algorithm as langchainjs)
 * - Intent extraction with hedging language detection (mcp-pde lineage)
 * - Dependency mapping with directional inference
 * - Ontological enrichment with Ojibwe names, seasons, acts, obligations
 * - Ceremony guidance based on directional balance
 */

import {
  DIRECTIONS, DIRECTION_ACTS, OJIBWE_NAMES, DIRECTION_SEASONS,
} from 'medicine-wheel-ontology-core';
import type { DirectionName, RelationalObligation, CeremonyGuidance, NarrativeBeat } from 'medicine-wheel-ontology-core';

import type {
  OntologicalDecomposition,
  OntologicalDirection,
  RelationalIntent,
  OntologicalDependency,
  ActionItem,
  PrimaryIntent,
  SecondaryIntent,
  ExtractionContext,
  AmbiguityFlag,
  ExpectedOutputs,
  DirectionalInsight,
  DecomposerOptions,
  Urgency,
  EpistemicSourceHint,
} from './types.js';

// ── Direction keywords (same as ava-langchain-prompt-decomposition) ─────────

const DIRECTION_KEYWORDS: Record<DirectionName, string[]> = {
  east: [
    'vision', 'goal', 'purpose', 'intention', 'want', 'need', 'desire',
    'dream', 'imagine', 'envision', 'aspire', 'mission', 'why', 'objective',
    'outcome', 'result', 'achieve', 'create', 'build', 'design',
  ],
  south: [
    'learn', 'research', 'investigate', 'understand', 'study', 'analyze',
    'explore', 'discover', 'examine', 'review', 'compare', 'assess',
    'dependency', 'require', 'prerequisite', 'context', 'background',
    'existing', 'current', 'pattern',
  ],
  west: [
    'test', 'verify', 'validate', 'check', 'ensure', 'confirm',
    'reflect', 'review', 'audit', 'quality', 'feedback', 'iterate',
    'ceremony', 'accountable', 'responsible', 'ethical', 'protocol',
    'appropriate', 'respectful', 'consent',
  ],
  north: [
    'implement', 'execute', 'deploy', 'run', 'build', 'code', 'script',
    'install', 'configure', 'setup', 'create', 'write', 'develop',
    'ship', 'launch', 'deliver', 'produce', 'output', 'generate',
    'commit', 'push', 'merge',
  ],
};

const ACTION_VERBS: Record<string, string[]> = {
  create: ['create', 'build', 'make', 'generate', 'write', 'develop', 'design', 'scaffold', 'implement'],
  modify: ['modify', 'update', 'change', 'edit', 'adjust', 'refactor', 'rename'],
  investigate: ['investigate', 'research', 'explore', 'understand', 'learn', 'study', 'analyze', 'examine', 'look', 'check', 'review', 'see'],
  add: ['add', 'install', 'include', 'import', 'integrate', 'connect'],
  remove: ['remove', 'delete', 'clean', 'prune', 'drop'],
  test: ['test', 'verify', 'validate', 'ensure', 'confirm', 'assert'],
  deploy: ['deploy', 'ship', 'publish', 'release', 'push', 'launch'],
  use: ['use', 'leverage', 'utilize', 'employ', 'apply', 'run', 'execute'],
  draft: ['draft', 'outline', 'plan', 'sketch', 'propose', 'document'],
};

const URGENCY_KEYWORDS: Record<Urgency, string[]> = {
  immediate: ['now', 'immediately', 'urgent', 'asap', 'right away'],
  session: ['today', 'this session', "let's", 'get to work', 'start'],
  sprint: ['this week', 'sprint', 'soon', 'next', 'upcoming'],
  ongoing: ['eventually', 'someday', 'long-term', 'future', 'ongoing'],
};

const ALL_DIRECTIONS: DirectionName[] = ['east', 'south', 'west', 'north'];

// ── Helper: UUID ─────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `mw-pde-${globalThis.crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `mw-pde-${hex()}${hex()}-${hex()}-${hex()}`;
}

// ── Decomposer ──────────────────────────────────────────────────────────────

export class MedicineWheelDecomposer {
  private readonly extractImplicit: boolean;
  private readonly mapDependencies: boolean;
  private readonly ceremonyThreshold: number;

  constructor(options?: DecomposerOptions) {
    this.extractImplicit = options?.extractImplicit ?? true;
    this.mapDependencies = options?.mapDependencies ?? true;
    this.ceremonyThreshold = options?.ceremonyThreshold ?? 0.3;
  }

  /**
   * Decompose a prompt into an ontology-enriched result.
   * Flows through Four Directions: EAST → SOUTH → WEST → NORTH
   */
  decompose(prompt: string): OntologicalDecomposition {
    const id = generateId();
    const timestamp = new Date().toISOString();

    // EAST: Extract intents and directional insights
    const directionalInsights = this.classifyByDirection(prompt);
    const intents = this.extractIntents(prompt);
    const context = this.extractContext(prompt);

    // SOUTH: Map dependencies
    const enrichedIntents = this.enrichWithDirections(intents.secondary);
    const dependencies = this.mapDependencies
      ? this.inferDependencies(enrichedIntents)
      : [];

    // Apply dependencies to intents
    for (const dep of dependencies) {
      const intent = enrichedIntents.find(i => i.id === dep.fromId);
      if (intent) intent.dependency = dep.toId;
    }

    // Build ontological directions
    const directions = this.buildOntologicalDirections(directionalInsights);

    // WEST: Assess balance and ceremony needs
    const { balance, leadDirection, neglectedDirections } = this.assessBalance(directionalInsights);
    const ceremonyRequired = this.checkCeremonyRequired(directions, balance);
    const ceremonyGuidance = ceremonyRequired ? this.generateCeremonyGuidance(neglectedDirections) : null;
    const wilsonAlignment = this.computeWilsonAlignment(enrichedIntents);

    // Detect ambiguities (mcp-pde lineage)
    const ambiguities = this.detectAmbiguities(prompt, intents.primary, neglectedDirections);

    // Extract expected outputs
    const outputs = this.extractExpectedOutputs(intents.primary, enrichedIntents);

    // NORTH: Build action stack
    const actionStack = this.buildActionStack(enrichedIntents, dependencies);

    // Generate narrative beats from action stack
    const narrativeBeats = this.generateNarrativeBeats(actionStack, id);

    return {
      id,
      timestamp,
      prompt,
      primary: intents.primary,
      secondary: enrichedIntents,
      context,
      outputs,
      directions,
      actionStack,
      ambiguities,
      balance,
      leadDirection,
      neglectedDirections,
      ceremonyGuidance,
      ceremonyRequired,
      wilsonAlignment,
      narrativeBeats,
    };
  }

  // ── EAST: Classification ────────────────────────────────────────────────────

  private classifyByDirection(prompt: string): Record<DirectionName, DirectionalInsight[]> {
    const segments = prompt.split(/(?<=[.!?])\s+|\n+/).filter(s => s.length > 3);
    const result: Record<DirectionName, DirectionalInsight[]> = {
      east: [], south: [], west: [], north: [],
    };

    for (const segment of segments) {
      const scores = this.scoreSegment(segment);
      const topDir = this.topDirection(scores);
      const isImplicit = scores[topDir] < 0.3;

      result[topDir].push({
        text: segment.trim(),
        confidence: Math.min(scores[topDir] * 2, 1),
        implicit: isImplicit,
      });

      // Cross-direction implicit insights
      for (const dir of ALL_DIRECTIONS) {
        if (dir !== topDir && scores[dir] > 0.2) {
          result[dir].push({
            text: segment.trim(),
            confidence: scores[dir],
            implicit: true,
          });
        }
      }
    }

    return result;
  }

  private scoreSegment(segment: string): Record<DirectionName, number> {
    const lower = segment.toLowerCase();
    const words = lower.split(/\s+/);
    const scores: Record<DirectionName, number> = { east: 0, south: 0, west: 0, north: 0 };

    for (const dir of ALL_DIRECTIONS) {
      for (const keyword of DIRECTION_KEYWORDS[dir]) {
        for (const word of words) {
          if (word.includes(keyword)) scores[dir] += 1;
        }
      }
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const dir of ALL_DIRECTIONS) scores[dir] /= total;

    return scores;
  }

  private topDirection(scores: Record<DirectionName, number>): DirectionName {
    let top: DirectionName = 'north';
    let max = -1;
    for (const dir of ALL_DIRECTIONS) {
      if (scores[dir] > max) { max = scores[dir]; top = dir; }
    }
    return top;
  }

  // ── EAST: Intent Extraction ─────────────────────────────────────────────────

  private extractIntents(prompt: string): { primary: PrimaryIntent; secondary: SecondaryIntent[] } {
    const sentences = prompt.split(/(?<=[.!?])\s+|\n+|,\s+(?=[A-Z])|;\s+/)
      .map(s => s.trim()).filter(s => s.length > 5);

    const rawIntents: Array<{ action: string; target: string; confidence: number; implicit: boolean }> = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      let bestAction = '';
      let bestCategory = '';
      let found = false;

      for (const [category, verbs] of Object.entries(ACTION_VERBS)) {
        for (const verb of verbs) {
          if (lower.includes(verb)) {
            if (!found || verb.length > bestAction.length) {
              bestAction = verb; bestCategory = category; found = true;
            }
          }
        }
      }

      if (found) {
        const verbIdx = lower.indexOf(bestAction);
        const afterVerb = sentence.substring(verbIdx + bestAction.length).trim();
        const target = afterVerb.replace(/^(the|a|an|this|that|our|your)\s+/i, '').trim();

        rawIntents.push({
          action: bestCategory,
          target: target || sentence,
          confidence: this.calculateConfidence(sentence, bestAction),
          implicit: false,
        });
      }
    }

    // Extract implicit intents (mcp-pde lineage)
    if (this.extractImplicit) {
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        if (rawIntents.some(i => i.target === sentence)) continue;

        if (/i assume|which i assume|assuming/.test(lower) ||
            /i expect|expecting|you will need/.test(lower)) {
          rawIntents.push({ action: 'investigate', target: sentence, confidence: 0.5, implicit: true });
        } else if (/\bsomehow\b/.test(lower)) {
          rawIntents.push({ action: 'investigate', target: sentence, confidence: 0.4, implicit: true });
        } else if (/\bprobably\b|\bshould\b(?!\s+not)/.test(lower)) {
          rawIntents.push({ action: 'investigate', target: sentence, confidence: 0.45, implicit: true });
        } else if (/\bwhich\b/.test(lower)) {
          rawIntents.push({ action: 'investigate', target: sentence, confidence: 0.6, implicit: true });
        } else if (/^if\b|\bif\b|\bwhen\b/.test(lower)) {
          rawIntents.push({ action: 'test', target: sentence, confidence: 0.5, implicit: true });
        }
      }
    }

    // Primary = highest confidence
    const sorted = [...rawIntents].sort((a, b) => b.confidence - a.confidence);
    const primary: PrimaryIntent = sorted.length > 0
      ? { action: sorted[0].action, target: sorted[0].target.substring(0, 200), urgency: this.detectUrgency(prompt), confidence: sorted[0].confidence }
      : { action: 'investigate', target: prompt.substring(0, 100), urgency: this.detectUrgency(prompt), confidence: 0.5 };

    const secondary: SecondaryIntent[] = rawIntents.map(raw => ({
      id: generateId(),
      action: raw.action,
      target: raw.target.substring(0, 300),
      implicit: raw.implicit,
      dependency: null,
      confidence: raw.confidence,
    }));

    return { primary, secondary };
  }

  private calculateConfidence(sentence: string, verb: string): number {
    const lower = sentence.toLowerCase();
    let confidence = 0.7;
    if (lower.startsWith(verb)) confidence += 0.15;
    if (/\/[a-z]/.test(lower) || /@[a-z]/.test(lower)) confidence += 0.1;
    if (/maybe|perhaps|could|might|possibly/.test(lower)) confidence -= 0.2;
    return Math.min(1, Math.max(0.1, confidence));
  }

  private detectUrgency(prompt: string): Urgency {
    const lower = prompt.toLowerCase();
    for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return urgency as Urgency;
      }
    }
    return 'session';
  }

  private extractContext(prompt: string): ExtractionContext {
    const filesNeeded: string[] = [];
    const toolsRequired: string[] = [];
    const assumptions: string[] = [];

    const pathMatches = prompt.match(/(?:\/[\w.-]+)+\/?/g);
    if (pathMatches) filesNeeded.push(...new Set(pathMatches));

    const atRefs = prompt.match(/@[\w./-]+/g);
    if (atRefs) filesNeeded.push(...atRefs.map(r => r.substring(1)));

    // Extract assumptions from hedging language
    const sentences = prompt.split(/(?<=[.!?])\s+|\n+/).filter(s => s.length > 5);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (/i assume|i expect|i know that|assuming that/.test(lower)) {
        assumptions.push(sentence.trim());
      } else if (/\bprobably\b|\bsomehow\b|\bshould\b/.test(lower) && lower.length < 200) {
        assumptions.push(sentence.trim());
      }
    }

    return { filesNeeded, toolsRequired, assumptions };
  }

  // ── SOUTH: Enrichment & Dependency Mapping ──────────────────────────────────

  private enrichWithDirections(intents: SecondaryIntent[]): RelationalIntent[] {
    return intents.map(intent => {
      const direction = this.inferDirection(intent.action);
      return {
        ...intent,
        direction,
        obligations: this.inferObligations(direction),
        wilsonAlignment: 0.5, // default, enriched later
      };
    });
  }

  private inferDirection(action: string): DirectionName {
    if (['investigate', 'research', 'explore', 'study', 'analyze'].includes(action)) return 'south';
    if (['test', 'verify', 'validate', 'review', 'check'].includes(action)) return 'west';
    if (['create', 'build', 'implement', 'add', 'deploy', 'install', 'modify', 'use', 'run'].includes(action)) return 'north';
    if (['draft', 'plan', 'design'].includes(action)) return 'east';
    return 'north';
  }

  private inferObligations(direction: DirectionName): RelationalObligation[] {
    switch (direction) {
      case 'east':
        return [{ category: 'spirit', obligations: ['Clarify vision and intention'] }];
      case 'south':
        return [{ category: 'human', obligations: ['Research with reciprocity'] }];
      case 'west':
        return [{ category: 'human', obligations: ['Reflect and validate with care'] }];
      case 'north':
        return [{ category: 'future', obligations: ['Execute with responsibility to future generations'] }];
    }
  }

  private inferDependencies(intents: RelationalIntent[]): OntologicalDependency[] {
    const deps: OntologicalDependency[] = [];

    const southIntents = intents.filter(i => i.direction === 'south');
    const northIntents = intents.filter(i => i.direction === 'north');
    const westIntents = intents.filter(i => i.direction === 'west');

    // south (research) → north (action)
    for (const south of southIntents) {
      for (const north of northIntents) {
        if (this.topicsRelated(south.target, north.target)) {
          deps.push({
            fromId: north.id, toId: south.id,
            type: 'depends_on', direction: south.direction, confidence: 0.7,
          });
        }
      }
    }

    // north (action) → west (validation)
    for (const north of northIntents) {
      for (const west of westIntents) {
        if (this.topicsRelated(north.target, west.target)) {
          deps.push({
            fromId: west.id, toId: north.id,
            type: 'validates', direction: north.direction, confidence: 0.7,
          });
        }
      }
    }

    return deps;
  }

  private topicsRelated(a: string, b: string): boolean {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    let overlap = 0;
    for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
    return overlap >= 1;
  }

  // ── Ontological Direction Building ──────────────────────────────────────────

  private buildOntologicalDirections(
    insights: Record<DirectionName, DirectionalInsight[]>
  ): Record<DirectionName, OntologicalDirection> {
    const result = {} as Record<DirectionName, OntologicalDirection>;

    for (const dir of ALL_DIRECTIONS) {
      result[dir] = {
        name: dir,
        ojibwe: OJIBWE_NAMES[dir],
        season: DIRECTION_SEASONS[dir],
        act: DIRECTION_ACTS[dir],
        insights: insights[dir],
        obligations: this.inferObligations(dir),
        ceremonyRecommended: insights[dir].length === 0,
      };
    }

    return result;
  }

  // ── WEST: Balance & Ceremony ────────────────────────────────────────────────

  private assessBalance(insights: Record<DirectionName, DirectionalInsight[]>): {
    balance: number; leadDirection: DirectionName; neglectedDirections: DirectionName[];
  } {
    const counts = ALL_DIRECTIONS.map(d => insights[d].length);
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const proportions = counts.map(c => c / total);
    const deviation = proportions.reduce((sum, p) => sum + Math.abs(p - 0.25), 0) / 4;
    const balance = Math.max(0, Math.min(1, 1 - deviation * 4));

    const maxCount = Math.max(...counts);
    const leadDirection = ALL_DIRECTIONS[counts.indexOf(maxCount)] || 'north';
    const neglectedDirections = ALL_DIRECTIONS.filter(d => insights[d].length / total < 0.1);

    return { balance, leadDirection, neglectedDirections };
  }

  private checkCeremonyRequired(
    directions: Record<DirectionName, OntologicalDirection>,
    balance: number
  ): boolean {
    const eastPresence = directions.east.insights.length;
    const westPresence = directions.west.insights.length;
    const total = ALL_DIRECTIONS.reduce((sum, d) => sum + directions[d].insights.length, 0) || 1;
    const ceremonialPresence = (eastPresence + westPresence) / total;
    return ceremonialPresence < this.ceremonyThreshold;
  }

  private generateCeremonyGuidance(neglectedDirections: DirectionName[]): CeremonyGuidance {
    const directionGuide = neglectedDirections.map(d =>
      `${OJIBWE_NAMES[d]} (${d}): address the ${d === 'east' ? 'vision' : d === 'south' ? 'analysis' : d === 'west' ? 'reflection' : 'action'} dimension`
    ).join('; ');

    return {
      opening_practice: 'Acknowledge the Four Directions before proceeding.',
      intention: `Attend to neglected directions: ${directionGuide || 'all directions need balance'}.`,
      protocol: 'Pause for relational check-in. Consider who this work serves and what obligations it carries.',
      medicines_used: [],
    };
  }

  private computeWilsonAlignment(intents: RelationalIntent[]): number {
    if (intents.length === 0) return 0.5;
    return intents.reduce((sum, i) => sum + i.wilsonAlignment, 0) / intents.length;
  }

  // ── Ambiguity Detection (mcp-pde lineage) ─────────────────────────────────

  private detectAmbiguities(
    prompt: string,
    primary: PrimaryIntent,
    neglectedDirections: DirectionName[]
  ): AmbiguityFlag[] {
    const ambiguities: AmbiguityFlag[] = [];

    if (primary.confidence < 0.5) {
      ambiguities.push({
        text: `Primary intent has low confidence (${Math.round(primary.confidence * 100)}%)`,
        suggestion: 'Clarify the main goal with a more specific action verb and target.',
      });
    }

    for (const dir of neglectedDirections) {
      const desc = dir === 'east' ? 'vision clarity' : dir === 'south' ? 'research context' : dir === 'west' ? 'validation criteria' : 'actionable steps';
      ambiguities.push({
        text: `Direction ${OJIBWE_NAMES[dir]} (${dir}) is neglected`,
        suggestion: `The prompt lacks ${desc}. Consider addressing what is missing from this perspective.`,
      });
    }

    const lower = prompt.toLowerCase();
    if (/\bsomehow\b/.test(lower)) {
      ambiguities.push({
        text: '"somehow" — method left unspecified',
        suggestion: 'Specify the approach or method to use.',
      });
    }
    if (/\bprobably\b|\bmaybe\b|\bperhaps\b/.test(lower)) {
      ambiguities.push({
        text: 'Hedging language detected ("probably", "maybe", "perhaps")',
        suggestion: 'Confirm or deny the hedged assumptions before proceeding.',
      });
    }

    return ambiguities;
  }

  // ── Expected Outputs ──────────────────────────────────────────────────────

  private extractExpectedOutputs(primary: PrimaryIntent, intents: RelationalIntent[]): ExpectedOutputs {
    const artifacts: string[] = [];
    const updates: string[] = [];
    const communications: string[] = [];

    for (const intent of intents) {
      if (['create', 'add'].includes(intent.action)) artifacts.push(intent.target);
      else if (['modify', 'use'].includes(intent.action)) updates.push(intent.target);
      else if (['deploy', 'draft'].includes(intent.action)) communications.push(intent.target);
    }

    if (['create', 'add'].includes(primary.action)) artifacts.push(primary.target);
    else if (['modify'].includes(primary.action)) updates.push(primary.target);

    return { artifacts, updates, communications };
  }

  // ── NORTH: Action Stack ───────────────────────────────────────────────────

  private buildActionStack(
    intents: RelationalIntent[],
    dependencies: OntologicalDependency[]
  ): ActionItem[] {
    // Topological sort by direction flow (east=0, south=1, west=2, north=3)
    const dirOrder: Record<DirectionName, number> = { east: 0, south: 1, west: 2, north: 3 };

    const sorted = [...intents].sort((a, b) => {
      const dirDiff = dirOrder[a.direction] - dirOrder[b.direction];
      if (dirDiff !== 0) return dirDiff;
      return b.confidence - a.confidence;
    });

    return sorted.map(intent => ({
      id: intent.id,
      text: `${intent.action} ${intent.target}`,
      direction: intent.direction,
      dependency: intent.dependency,
      completed: false,
      confidence: intent.confidence,
      implicit: intent.implicit,
    }));
  }

  // ── Narrative Beats ───────────────────────────────────────────────────────

  private generateNarrativeBeats(actionStack: ActionItem[], decompositionId: string): NarrativeBeat[] {
    return actionStack.map((action, i) => ({
      id: `${decompositionId}-beat-${i}`,
      direction: action.direction,
      title: action.text,
      description: `${action.implicit ? 'Implicit: ' : ''}${action.text}`,
      ceremonies: [],
      learnings: [],
      timestamp: new Date().toISOString(),
      act: DIRECTION_ACTS[action.direction],
      relations_honored: [],
    }));
  }
}

// ── Epistemic Source Detection ─────────────────────────────────────────────

const EPISTEMIC_KEYWORDS: Record<EpistemicSourceHint, string[]> = {
  land: [
    'place', 'territory', 'walking', 'embodied', 'land', 'ground',
    'earth', 'river', 'mountain', 'forest', 'body', 'physical',
    'sensation', 'touch', 'landscape', 'soil', 'roots', 'habitat',
  ],
  dream: [
    'vision', 'dream', 'intuition', 'liminal', 'imagine', 'spirit',
    'ceremony', 'prayer', 'meditation', 'ancestor', 'sleep', 'unconscious',
    'symbol', 'omen', 'feeling', 'sense', 'inner', 'calling',
  ],
  code: [
    'implement', 'function', 'algorithm', 'code', 'program', 'compile',
    'syntax', 'module', 'class', 'method', 'variable', 'data',
    'structure', 'logic', 'compute', 'binary', 'interface', 'api',
  ],
  vision: [
    'intention', 'aspiration', 'future', 'goal', 'purpose', 'mission',
    'plan', 'strategy', 'direction', 'horizon', 'possibility', 'potential',
    'transform', 'become', 'evolve', 'next', 'forward', 'beyond',
  ],
  unknown: [],
};

/**
 * Heuristic classification of epistemic source from language patterns.
 *
 * Scans text for keywords associated with each of Wilson's four
 * epistemic sources and returns the best match. Returns 'unknown'
 * when no clear signal is present.
 *
 * - **land**: mentions of place, territory, walking, embodied experience
 * - **dream**: mentions of vision, dream, intuition, liminal space
 * - **code**: mentions of implementation, function, algorithm, structure
 * - **vision**: mentions of intention, aspiration, future, purpose
 */
export function detectEpistemicSource(text: string): EpistemicSourceHint {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const scores: Record<string, number> = {
    land: 0,
    dream: 0,
    code: 0,
    vision: 0,
  };

  for (const word of words) {
    for (const [source, keywords] of Object.entries(EPISTEMIC_KEYWORDS)) {
      if (source === 'unknown') continue;
      for (const keyword of keywords) {
        if (word.includes(keyword)) {
          scores[source]++;
        }
      }
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return 'unknown';

  let bestSource: EpistemicSourceHint = 'unknown';
  let bestScore = 0;
  for (const [source, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestSource = source as EpistemicSourceHint;
    }
  }

  // Require at least 20% signal strength to avoid noisy classification
  if (bestScore / total < 0.2) return 'unknown';

  return bestSource;
}
