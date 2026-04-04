/**
 * @medicine-wheel/transformation-tracker — Reciprocity Ledger Module
 *
 * Manages the reciprocity ledger: tracking giving and receiving
 * across the research process. Wilson's relational accountability
 * demands balanced reciprocity — what you take, you must give back.
 */

import type { ObligationCategory } from 'medicine-wheel-ontology-core';
import type { TransformationLog, ReciprocityEntry } from './types.js';

/**
 * Log a giving entry to the reciprocity ledger.
 * Records something the researcher has given back to the community,
 * land, spirit, or future generations.
 */
export function logGiving(
  log: TransformationLog,
  entry: Omit<ReciprocityEntry, 'type'>,
): TransformationLog {
  const givingEntry: ReciprocityEntry = { ...entry, type: 'giving' };
  return {
    ...log,
    reciprocityLedger: [...log.reciprocityLedger, givingEntry],
  };
}

/**
 * Log a receiving entry to the reciprocity ledger.
 * Records something the researcher has received from the community,
 * land, spirit, or ancestors.
 */
export function logReceiving(
  log: TransformationLog,
  entry: Omit<ReciprocityEntry, 'type'>,
): TransformationLog {
  const receivingEntry: ReciprocityEntry = { ...entry, type: 'receiving' };
  return {
    ...log,
    reciprocityLedger: [...log.reciprocityLedger, receivingEntry],
  };
}

/**
 * Check whether reciprocity is balanced.
 * Balance is assessed per-category and overall.
 */
export function balanceCheck(log: TransformationLog): BalanceCheckResult {
  const categories: ObligationCategory[] = ['human', 'land', 'spirit', 'future'];
  const categoryBalances: CategoryBalance[] = [];

  for (const category of categories) {
    const giving = log.reciprocityLedger.filter(
      (e) => e.type === 'giving' && e.category === category,
    ).length;
    const receiving = log.reciprocityLedger.filter(
      (e) => e.type === 'receiving' && e.category === category,
    ).length;
    const balanced = giving > 0 && receiving > 0 && giving / receiving >= 0.5 && giving / receiving <= 2.0;
    categoryBalances.push({ category, giving, receiving, balanced });
  }

  const totalGiving = log.reciprocityLedger.filter((e) => e.type === 'giving').length;
  const totalReceiving = log.reciprocityLedger.filter((e) => e.type === 'receiving').length;
  const overallBalanced =
    totalGiving > 0 &&
    totalReceiving > 0 &&
    totalGiving / totalReceiving >= 0.5 &&
    totalGiving / totalReceiving <= 2.0;

  return {
    overallBalanced,
    totalGiving,
    totalReceiving,
    categoryBalances,
    summary: overallBalanced
      ? 'Reciprocity is balanced overall.'
      : totalGiving === 0 && totalReceiving === 0
        ? 'No reciprocity entries. Begin tracking what you give and receive.'
        : totalGiving < totalReceiving
          ? 'Reciprocity imbalance: receiving more than giving. Consider what you can return.'
          : 'Reciprocity imbalance: giving more than receiving. Be open to receiving.',
  };
}

/**
 * Identify reciprocity debts — areas where receiving outpaces giving.
 * These represent relational obligations that need to be honored.
 */
export function reciprocityDebt(log: TransformationLog): ReciprocityDebtResult {
  const categories: ObligationCategory[] = ['human', 'land', 'spirit', 'future'];
  const debts: Debt[] = [];

  for (const category of categories) {
    const giving = log.reciprocityLedger.filter(
      (e) => e.type === 'giving' && e.category === category,
    );
    const receiving = log.reciprocityLedger.filter(
      (e) => e.type === 'receiving' && e.category === category,
    );

    if (receiving.length > giving.length) {
      debts.push({
        category,
        deficit: receiving.length - giving.length,
        receivedFrom: [...new Set(receiving.map((e) => e.relatedTo))],
        suggestion: `You have received ${receiving.length} time(s) from ${category} relations but given back only ${giving.length} time(s). Consider ways to reciprocate.`,
      });
    }
  }

  return {
    hasDebts: debts.length > 0,
    debts,
    summary: debts.length === 0
      ? 'No reciprocity debts detected.'
      : `Reciprocity debts in ${debts.length} category/categories: ${debts.map((d) => d.category).join(', ')}.`,
  };
}

// ── Supporting Types ────────────────────────────────────────────────────────

/** Per-category balance assessment */
export interface CategoryBalance {
  category: ObligationCategory;
  giving: number;
  receiving: number;
  balanced: boolean;
}

/** Overall balance check result */
export interface BalanceCheckResult {
  overallBalanced: boolean;
  totalGiving: number;
  totalReceiving: number;
  categoryBalances: CategoryBalance[];
  summary: string;
}

/** A single reciprocity debt */
export interface Debt {
  category: ObligationCategory;
  deficit: number;
  receivedFrom: string[];
  suggestion: string;
}

/** Reciprocity debt analysis result */
export interface ReciprocityDebtResult {
  hasDebts: boolean;
  debts: Debt[];
  summary: string;
}
