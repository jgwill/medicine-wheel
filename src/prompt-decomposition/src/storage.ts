/**
 * medicine-wheel-prompt-decomposition — Storage
 *
 * Persists ontological decompositions to .pde/ folder.
 * Lineage: mcp-pde/src/storage.ts → ava-langchain storage.ts → this.
 *
 * Files:
 *   .pde/{id}.json      — machine-readable full result
 *   .pde/{id}.md        — git-diffable Markdown summary
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OJIBWE_NAMES, DIRECTION_ACTS } from 'medicine-wheel-ontology-core';
import type { DirectionName } from 'medicine-wheel-ontology-core';

import type { OntologicalDecomposition, StoredDecomposition, ActionItem } from './types.js';

// ── Save ────────────────────────────────────────────────────────────────────

export function saveDecomposition(
  workdir: string,
  result: OntologicalDecomposition,
): StoredDecomposition {
  const pdeDir = join(workdir, '.pde');
  if (!existsSync(pdeDir)) mkdirSync(pdeDir, { recursive: true });

  const stored: StoredDecomposition = {
    id: result.id,
    timestamp: result.timestamp,
    prompt: result.prompt,
    result,
  };

  // JSON
  const jsonPath = join(pdeDir, `${result.id}.json`);
  writeFileSync(jsonPath, JSON.stringify(stored, null, 2), 'utf-8');

  // Markdown
  const mdPath = join(pdeDir, `${result.id}.md`);
  const md = decompositionToMarkdown(result);
  writeFileSync(mdPath, md, 'utf-8');
  stored.markdownPath = mdPath;

  return stored;
}

// ── Load ────────────────────────────────────────────────────────────────────

export function loadDecomposition(
  workdir: string,
  id: string,
): StoredDecomposition | null {
  const jsonPath = join(workdir, '.pde', `${id}.json`);
  if (!existsSync(jsonPath)) return null;
  return JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

// ── List ────────────────────────────────────────────────────────────────────

export function listDecompositions(workdir: string): StoredDecomposition[] {
  const pdeDir = join(workdir, '.pde');
  if (!existsSync(pdeDir)) return [];
  return readdirSync(pdeDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(pdeDir, f), 'utf-8')) as StoredDecomposition)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ── Markdown ────────────────────────────────────────────────────────────────

export function decompositionToMarkdown(result: OntologicalDecomposition): string {
  const lines: string[] = [];
  const { primary, secondary, directions, actionStack, ambiguities, outputs } = result;

  lines.push(`# Prompt Decomposition — ${result.id}`);
  lines.push(`> ${result.timestamp}`);
  lines.push('');
  lines.push(`## Prompt`);
  lines.push(`\`\`\`\n${result.prompt.substring(0, 500)}\n\`\`\``);
  lines.push('');

  // Primary intent
  lines.push(`## Primary Intent`);
  lines.push(`- **Action:** ${primary.action}`);
  lines.push(`- **Target:** ${primary.target}`);
  lines.push(`- **Urgency:** ${primary.urgency}`);
  lines.push(`- **Confidence:** ${Math.round(primary.confidence * 100)}%`);
  lines.push('');

  // Four Directions
  lines.push(`## Four Directions Analysis`);
  lines.push(`| Direction | Ojibwe | Season | Act | Insights | Ceremony? |`);
  lines.push(`|-----------|--------|--------|-----|----------|-----------|`);
  const allDirs: DirectionName[] = ['east', 'south', 'west', 'north'];
  for (const dir of allDirs) {
    const d = directions[dir];
    lines.push(`| ${dir} | ${d.ojibwe} | ${d.season} | ${d.act} | ${d.insights.length} | ${d.ceremonyRecommended ? '✓' : '—'} |`);
  }
  lines.push('');

  // Balance
  lines.push(`## Balance`);
  lines.push(`- **Score:** ${Math.round(result.balance * 100)}%`);
  lines.push(`- **Lead Direction:** ${result.leadDirection}`);
  if (result.neglectedDirections.length > 0) {
    lines.push(`- **Neglected:** ${result.neglectedDirections.join(', ')}`);
  }
  lines.push(`- **Wilson Alignment:** ${Math.round(result.wilsonAlignment * 100)}%`);
  lines.push(`- **Ceremony Required:** ${result.ceremonyRequired ? 'Yes' : 'No'}`);
  lines.push('');

  // Ceremony guidance
  if (result.ceremonyGuidance) {
    lines.push(`## Ceremony Guidance`);
    lines.push(`- **Opening:** ${result.ceremonyGuidance.opening_practice}`);
    lines.push(`- **Intention:** ${result.ceremonyGuidance.intention}`);
    lines.push(`- **Protocol:** ${result.ceremonyGuidance.protocol}`);
    lines.push('');
  }

  // Action Stack
  if (actionStack.length > 0) {
    lines.push(`## Action Stack`);
    for (const item of actionStack) {
      const marker = item.implicit ? '◊' : '●';
      const dep = item.dependency ? ` (after: ${item.dependency})` : '';
      lines.push(`- ${marker} [${item.direction}] ${item.text}${dep} — ${Math.round(item.confidence * 100)}%`);
    }
    lines.push('');
  }

  // Ambiguities
  if (ambiguities.length > 0) {
    lines.push(`## Ambiguities`);
    for (const amb of ambiguities) {
      lines.push(`- ⚠ ${amb.text}`);
      lines.push(`  → ${amb.suggestion}`);
    }
    lines.push('');
  }

  // Expected Outputs
  if (outputs.artifacts.length > 0 || outputs.updates.length > 0 || outputs.communications.length > 0) {
    lines.push(`## Expected Outputs`);
    if (outputs.artifacts.length > 0) lines.push(`- **Artifacts:** ${outputs.artifacts.join(', ')}`);
    if (outputs.updates.length > 0) lines.push(`- **Updates:** ${outputs.updates.join(', ')}`);
    if (outputs.communications.length > 0) lines.push(`- **Communications:** ${outputs.communications.join(', ')}`);
    lines.push('');
  }

  // Narrative Beats
  if (result.narrativeBeats.length > 0) {
    lines.push(`## Narrative Beats`);
    for (const beat of result.narrativeBeats) {
      lines.push(`- Act ${beat.act} [${beat.direction}]: ${beat.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
