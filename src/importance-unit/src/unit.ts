/**
 * @medicine-wheel/importance-unit — Core CRUD Operations
 *
 * Create, update, circle-back, and archive ImportanceUnits.
 * Each operation respects the relational nature of knowledge:
 * creation sets epistemic weight from source, circle-back
 * deepens rather than replaces, and archival honors completion.
 */

import type { ImportanceUnit, CreateUnitInput, UpdateUnitInput } from './types.js';
import { computeWeight } from './epistemic-weight.js';

let _counter = 0;

/**
 * Generate a unique ID for an ImportanceUnit.
 * Uses a timestamp + counter pattern for ordering.
 */
function generateId(): string {
  const ts = Date.now().toString(36);
  const seq = (++_counter).toString(36).padStart(4, '0');
  return `iu-${ts}-${seq}`;
}

/**
 * Create a new ImportanceUnit from input.
 *
 * Sets initial epistemic weight based on the source dimension
 * (dream-state starts at 0.85, land at 0.75, etc.), initializes
 * circleDepth to 1, and stamps creation metadata.
 *
 * @param input - The creation input
 * @returns A fully initialized ImportanceUnit
 */
export function createUnit(input: CreateUnitInput): ImportanceUnit {
  const now = new Date().toISOString();
  const weight = computeWeight(input.source, 1);

  return {
    id: generateId(),
    direction: input.direction,
    epistemicWeight: weight,
    source: input.source,
    accountabilityLinks: input.accountabilityLinks ?? [],
    circleDepth: 1,
    content: {
      summary: input.summary,
      rawInput: input.rawInput,
      refinements: [],
    },
    axiologicalPillar: input.axiologicalPillar,
    inquiryRef: input.inquiryRef,
    meta: {
      createdBy: input.createdBy,
      createdAt: now,
      traceId: input.traceId,
    },
  };
}

/**
 * Update an existing ImportanceUnit with new field values.
 *
 * Only provided fields are changed. Content summary is updated
 * in place — for deepening, use `circleBack()` instead.
 *
 * @param unit - The existing unit to update
 * @param input - Fields to update
 * @returns The updated ImportanceUnit
 */
export function updateUnit(unit: ImportanceUnit, input: UpdateUnitInput): ImportanceUnit {
  return {
    ...unit,
    direction: input.direction ?? unit.direction,
    content: input.summary
      ? { ...unit.content, summary: input.summary }
      : unit.content,
    axiologicalPillar: input.axiologicalPillar ?? unit.axiologicalPillar,
    inquiryRef: input.inquiryRef ?? unit.inquiryRef,
  };
}

/**
 * Circle back to an ImportanceUnit, deepening its knowledge.
 *
 * Increments circleDepth, records a refinement describing what
 * shifted, and recalculates epistemic weight with the new depth.
 * Repetition is ceremony and deepening, not redundancy.
 *
 * @param unit - The unit to circle back to
 * @param shift - What changed or deepened in this pass
 * @returns The deepened ImportanceUnit
 */
export function circleBack(unit: ImportanceUnit, shift: string): ImportanceUnit {
  const now = new Date().toISOString();
  const newDepth = unit.circleDepth + 1;
  const newWeight = computeWeight(unit.source, newDepth);

  return {
    ...unit,
    circleDepth: newDepth,
    epistemicWeight: newWeight,
    content: {
      ...unit.content,
      refinements: [
        ...unit.content.refinements,
        { circle: newDepth, shift, timestamp: now },
      ],
    },
    meta: {
      ...unit.meta,
      lastCircledAt: now,
    },
  };
}

/**
 * Archive an ImportanceUnit by marking its ceremony circle as complete.
 *
 * This does not delete the unit — it honors its completion through
 * the four directions. Should only be called when the ceremony
 * circle is truly complete.
 *
 * @param unit - The unit to archive
 * @returns The archived ImportanceUnit with circleComplete = true
 */
export function archive(unit: ImportanceUnit): ImportanceUnit {
  return {
    ...unit,
    ceremonyState: {
      quadrantsVisited: unit.ceremonyState?.quadrantsVisited ?? [],
      circleComplete: true,
      gatingConditions: unit.ceremonyState?.gatingConditions ?? [],
    },
  };
}
