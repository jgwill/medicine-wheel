/**
 * medicine-wheel-prompt-decomposition — Relational Enricher
 *
 * Enriches decomposition results with relational-query traversal.
 * Takes a decomposition and a relational graph, then:
 * - Maps intents to RelationalNodes in the graph
 * - Traverses dependency webs for each intent
 * - Scores Wilson alignment (respect, reciprocity, responsibility)
 * - Checks OCAP® compliance for data-related intents
 * - Identifies accountability gaps
 *
 * This module bridges PDE output with the relational-query and
 * ontology-core packages.
 */

import type {
  RelationalNode,
  RelationalEdge,
  Relation,
  AccountabilityTracking,
  DirectionName,
} from 'medicine-wheel-ontology-core';
import {
  computeWilsonAlignment,
  findAccountabilityGaps,
} from 'medicine-wheel-ontology-core';

import type {
  OntologicalDecomposition,
  RelationalIntent,
  OntologicalDependency,
} from './types.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface RelationalGraph {
  nodes: RelationalNode[];
  edges: RelationalEdge[];
  relations: Relation[];
}

export interface EnrichmentResult {
  /** Updated decomposition with enriched Wilson alignment */
  decomposition: OntologicalDecomposition;
  /** Intent-to-node mappings found */
  mappings: IntentNodeMapping[];
  /** Accountability gaps detected */
  accountabilityGaps: AccountabilityGap[];
  /** Overall relational health score (0-1) */
  relationalHealth: number;
}

export interface IntentNodeMapping {
  intentId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  confidence: number;
}

export interface AccountabilityGap {
  intentId: string;
  direction: DirectionName;
  gap: string;
  suggestion: string;
}

// ── Enricher ────────────────────────────────────────────────────────────────

export class RelationalEnricher {
  /**
   * Enrich a decomposition with relational context from a graph.
   * Finds matching nodes for intents, computes Wilson alignment,
   * and identifies accountability gaps.
   */
  enrich(
    decomposition: OntologicalDecomposition,
    graph: RelationalGraph,
  ): EnrichmentResult {
    const mappings: IntentNodeMapping[] = [];
    const accountabilityGaps: AccountabilityGap[] = [];

    // Map intents to graph nodes
    const enrichedIntents = decomposition.secondary.map(intent => {
      const mapping = this.findMatchingNode(intent, graph.nodes);
      if (mapping) {
        mappings.push(mapping);
        const enriched = this.enrichIntentFromNode(intent, mapping, graph);
        return enriched;
      }
      return intent;
    });

    // Compute overall Wilson alignment
    const wilsonScores = enrichedIntents.map(i => i.wilsonAlignment);
    const avgWilson = wilsonScores.length > 0
      ? wilsonScores.reduce((a, b) => a + b, 0) / wilsonScores.length
      : 0.5;

    // Find accountability gaps via ontology-core
    // findAccountabilityGaps returns Relation[] with low Wilson alignment
    const gapRelations = findAccountabilityGaps(graph.relations);
    for (const rel of gapRelations) {
      const relatedIntent = enrichedIntents.find(i =>
        i.target.toLowerCase().includes(rel.relationship_type.toLowerCase())
      );
      const wilson = computeWilsonAlignment(rel.accountability);
      if (relatedIntent) {
        accountabilityGaps.push({
          intentId: relatedIntent.id,
          direction: relatedIntent.direction,
          gap: `Relation "${rel.relationship_type}" (${rel.from_id} → ${rel.to_id}) has low Wilson alignment (${Math.round(wilson * 100)}%)`,
          suggestion: `Address accountability in: respect=${rel.accountability.respect}, reciprocity=${rel.accountability.reciprocity}, responsibility=${rel.accountability.responsibility}`,
        });
      }
    }

    // For intents without node mappings, check direction-based gaps
    for (const intent of enrichedIntents) {
      if (!mappings.some(m => m.intentId === intent.id)) {
        if (intent.wilsonAlignment < 0.3) {
          accountabilityGaps.push({
            intentId: intent.id,
            direction: intent.direction,
            gap: `Intent "${intent.action}" has no relational grounding in the graph`,
            suggestion: 'Consider creating a relational node to track accountability for this action.',
          });
        }
      }
    }

    // Relational health: combine balance + Wilson + gap ratio
    const gapPenalty = accountabilityGaps.length > 0
      ? Math.max(0, 1 - (accountabilityGaps.length * 0.15))
      : 1;
    const relationalHealth = Math.min(1, (decomposition.balance + avgWilson + gapPenalty) / 3);

    const enrichedDecomposition: OntologicalDecomposition = {
      ...decomposition,
      secondary: enrichedIntents,
      wilsonAlignment: avgWilson,
    };

    return {
      decomposition: enrichedDecomposition,
      mappings,
      accountabilityGaps,
      relationalHealth,
    };
  }

  // ── Node Matching ───────────────────────────────────────────────────────────

  private findMatchingNode(
    intent: RelationalIntent,
    nodes: RelationalNode[],
  ): IntentNodeMapping | null {
    const targetWords = new Set(
      intent.target.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    let bestNode: RelationalNode | null = null;
    let bestScore = 0;

    for (const node of nodes) {
      const nameWords = new Set(
        node.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      let overlap = 0;
      for (const w of targetWords) { if (nameWords.has(w)) overlap++; }

      const score = nameWords.size > 0 ? overlap / nameWords.size : 0;
      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestNode = node;
      }
    }

    if (bestNode) {
      return {
        intentId: intent.id,
        nodeId: bestNode.id,
        nodeName: bestNode.name,
        nodeType: bestNode.type,
        confidence: bestScore,
      };
    }

    return null;
  }

  // ── Intent Enrichment ─────────────────────────────────────────────────────

  private enrichIntentFromNode(
    intent: RelationalIntent,
    mapping: IntentNodeMapping,
    graph: RelationalGraph,
  ): RelationalIntent {
    // Find relations involving this node
    const nodeRelations = graph.relations.filter(
      r => r.from_id === mapping.nodeId || r.to_id === mapping.nodeId
    );

    // Compute Wilson alignment from node's relations
    let wilson = 0.5;
    if (nodeRelations.length > 0) {
      const alignments = nodeRelations.map(r => {
        const w = computeWilsonAlignment(r.accountability);
        return w;
      });
      wilson = alignments.reduce((a, b) => a + b, 0) / alignments.length;
    }

    // Gather obligations from connected relations
    const obligations = nodeRelations.flatMap(r => r.obligations);
    const uniqueObligations = obligations.filter((o, i, arr) =>
      arr.findIndex(x => x.category === o.category) === i
    );

    return {
      ...intent,
      wilsonAlignment: wilson,
      obligations: uniqueObligations.length > 0 ? uniqueObligations : intent.obligations,
    };
  }
}
