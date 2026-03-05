/**
 * Arc Validator — validates narrative completeness and relational integrity
 * across a full Medicine Wheel cycle.
 */
import type {
  NarrativeBeat,
  MedicineWheelCycle,
  DirectionName,
  CeremonyLog,
  Relation,
} from 'medicine-wheel-ontology-core';
import { aggregateWilsonAlignment, checkOcapCompliance } from 'medicine-wheel-ontology-core';
import type {
  ArcCompleteness,
  ArcViolation,
  ArcValidationResult,
} from './types.js';

const ALL_DIRECTIONS: DirectionName[] = ['east', 'south', 'west', 'north'];

/** Compute the completeness of a narrative arc */
export function computeCompleteness(
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
  relations: Relation[],
): ArcCompleteness {
  const directionsVisited = [...new Set(beats.map(b => b.direction))] as DirectionName[];
  const directionsMissing = ALL_DIRECTIONS.filter(d => !directionsVisited.includes(d));

  const beatsPerDirection: Record<DirectionName, number> = { east: 0, south: 0, west: 0, north: 0 };
  for (const beat of beats) {
    beatsPerDirection[beat.direction]++;
  }

  const ceremoniesPerDirection: Record<DirectionName, number> = { east: 0, south: 0, west: 0, north: 0 };
  for (const ceremony of ceremonies) {
    if (ceremony.direction) {
      ceremoniesPerDirection[ceremony.direction]++;
    }
  }

  // Wilson alignment across all relations
  const wilsonAlignment = aggregateWilsonAlignment(relations);

  // OCAP compliance
  const ocapCompliant = relations.every(r => !r.ocap || checkOcapCompliance(r.ocap).compliant);

  // Completeness score: weighted average
  const directionScore = directionsVisited.length / 4;
  const ceremonyScore = ALL_DIRECTIONS.filter(d => ceremoniesPerDirection[d] > 0).length / 4;
  const balanceScore = computeBalance(beatsPerDirection);
  const completenessScore = (directionScore * 0.3) + (ceremonyScore * 0.25) + (wilsonAlignment * 0.25) + (balanceScore * 0.2);

  return {
    complete: directionsMissing.length === 0 && completenessScore >= 0.7,
    directionsVisited,
    directionsMissing,
    ceremoniesPerDirection,
    beatsPerDirection,
    wilsonAlignment,
    ocapCompliant,
    completenessScore: Math.round(completenessScore * 100) / 100,
  };
}

/** Compute balance across directions (1.0 = perfectly balanced) */
function computeBalance(beatsPerDirection: Record<DirectionName, number>): number {
  const counts = Object.values(beatsPerDirection);
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return 0;

  const ideal = total / 4;
  const deviation = counts.reduce((sum, c) => sum + Math.abs(c - ideal), 0);
  const maxDeviation = total; // worst case: all beats in one direction
  return 1 - (deviation / maxDeviation);
}

/** Validate a complete narrative arc */
export function validateArc(
  beats: NarrativeBeat[],
  ceremonies: CeremonyLog[],
  relations: Relation[],
): ArcValidationResult {
  const completeness = computeCompleteness(beats, ceremonies, relations);
  const violations: ArcViolation[] = [];
  const recommendations: string[] = [];

  // Missing directions
  for (const dir of completeness.directionsMissing) {
    violations.push({
      type: 'missing_direction',
      direction: dir,
      message: `Direction '${dir}' has no beats`,
      severity: 'error',
    });
    recommendations.push(`Add at least one beat in the ${dir} direction`);
  }

  // Directions without ceremonies
  for (const dir of ALL_DIRECTIONS) {
    if (completeness.ceremoniesPerDirection[dir] === 0 && completeness.beatsPerDirection[dir] > 0) {
      violations.push({
        type: 'no_ceremony',
        direction: dir,
        message: `Direction '${dir}' has beats but no ceremony`,
        severity: 'warning',
      });
      recommendations.push(`Consider conducting a ceremony in the ${dir} direction`);
    }
  }

  // Low Wilson alignment
  if (completeness.wilsonAlignment < 0.5 && relations.length > 0) {
    violations.push({
      type: 'low_wilson',
      message: `Wilson alignment is ${(completeness.wilsonAlignment * 100).toFixed(0)}% (below 50% threshold)`,
      severity: 'warning',
    });
    recommendations.push('Strengthen relational accountability — review obligations and reciprocity');
  }

  // OCAP compliance gaps
  if (!completeness.ocapCompliant) {
    violations.push({
      type: 'ocap_gap',
      message: 'Not all relations are OCAP®-compliant',
      severity: 'error',
    });
    recommendations.push('Review data sovereignty flags on all relations — ensure ownership, control, access, and possession');
  }

  // Balance check
  const balance = computeBalance(completeness.beatsPerDirection);
  if (balance < 0.5 && beats.length >= 4) {
    const maxDir = ALL_DIRECTIONS.reduce((a, b) =>
      completeness.beatsPerDirection[a] > completeness.beatsPerDirection[b] ? a : b
    );
    const minDir = ALL_DIRECTIONS.reduce((a, b) =>
      completeness.beatsPerDirection[a] < completeness.beatsPerDirection[b] ? a : b
    );
    violations.push({
      type: 'unbalanced',
      message: `Beats are unbalanced: '${maxDir}' has ${completeness.beatsPerDirection[maxDir]}, '${minDir}' has ${completeness.beatsPerDirection[minDir]}`,
      severity: 'info',
    });
    recommendations.push(`Balance the arc — add beats in '${minDir}' direction`);
  }

  const errorCount = violations.filter(v => v.severity === 'error').length;

  return {
    valid: errorCount === 0 && completeness.complete,
    completeness,
    violations,
    recommendations,
  };
}

/** Quick check: has a cycle visited all four directions? */
export function isArcComplete(beats: NarrativeBeat[]): boolean {
  const visited = new Set(beats.map(b => b.direction));
  return ALL_DIRECTIONS.every(d => visited.has(d));
}
