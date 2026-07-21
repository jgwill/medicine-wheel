/**
 * Diary export to Markdown. Pure functions over entry arrays — no storage.
 */

import type { CeremonialPhase, DiaryEntry } from './types.js';
import { PHASE_DESCRIPTIONS } from './types.js';

/** Convert a single entry to Markdown with YAML frontmatter. */
export function entryToMarkdown(entry: DiaryEntry): string {
  const phaseInfo = PHASE_DESCRIPTIONS[entry.phase];

  const frontmatter = [
    '---',
    `id: "${entry.id}"`,
    `timestamp: "${entry.timestamp}"`,
    `participant: "${entry.participant}"`,
    entry.agent ? `agent: "${entry.agent}"` : '',
    `phase: "${entry.phase}"`,
    `phaseName: "${phaseInfo.name}"`,
    `entryType: "${entry.entryType}"`,
    entry.chronicle ? `chronicle: "${entry.chronicle}"` : '',
  ].filter(Boolean);

  const { location, activity, weather, emotionalTone, tags, relatedKeys } = entry.metadata;

  if (location) {
    frontmatter.push('location:');
    frontmatter.push(`  lat: ${location.lat}`);
    frontmatter.push(`  lon: ${location.lon}`);
    if (location.name) frontmatter.push(`  name: "${location.name}"`);
  }
  if (activity) frontmatter.push(`activity: "${activity}"`);
  if (weather) frontmatter.push(`weather: "${weather}"`);
  if (emotionalTone) frontmatter.push(`emotionalTone: "${emotionalTone}"`);
  if (tags && tags.length > 0) {
    frontmatter.push('tags:');
    for (const tag of tags) frontmatter.push(`  - ${tag}`);
  }
  if (relatedKeys && relatedKeys.length > 0) {
    frontmatter.push('relatedKeys:');
    for (const key of relatedKeys) frontmatter.push(`  - ${key}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  return [
    ...frontmatter,
    `# ${phaseInfo.name} - ${entry.entryType}`,
    '',
    `*${phaseInfo.description}*`,
    '',
    entry.content,
    '',
    '---',
    '',
    `*Participant: ${entry.participant}${entry.agent ? ` | Agent: ${entry.agent}` : ''}*`,
    `*Timestamp: ${new Date(entry.timestamp).toLocaleString()}*`,
  ].join('\n');
}

/** Export multiple entries to a single Markdown document. */
export function exportToMarkdown(entries: readonly DiaryEntry[], includeHeader = true): string {
  const parts: string[] = [];

  if (includeHeader) {
    parts.push('# Ceremonial Diary Entries');
    parts.push('');
    parts.push(`Generated: ${new Date().toISOString()}`);
    parts.push(`Total Entries: ${entries.length}`);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  entries.forEach((entry, index) => {
    if (index > 0) {
      parts.push('');
      parts.push('---');
      parts.push('');
    }
    parts.push(entryToMarkdown(entry));
  });

  return parts.join('\n');
}

/** Group entries by ceremonial phase. */
export function exportByPhase(
  entries: readonly DiaryEntry[],
): Record<CeremonialPhase, DiaryEntry[]> {
  const byPhase: Record<CeremonialPhase, DiaryEntry[]> = {
    miigwechiwendam: [],
    nindokendaan: [],
    ningwaab: [],
    nindoodam: [],
    migwech: [],
  };

  for (const entry of entries) {
    byPhase[entry.phase].push(entry);
  }

  return byPhase;
}

/** Build a ceremonial journey summary organized by phase. */
export function createJourneySummary(entries: readonly DiaryEntry[]): string {
  const byPhase = exportByPhase(entries);
  const parts: string[] = [];

  parts.push('# Ceremonial Journey Summary');
  parts.push('');
  parts.push(
    `Journey Period: ${entries[0]?.timestamp ?? 'N/A'} to ${
      entries[entries.length - 1]?.timestamp ?? 'N/A'
    }`,
  );
  parts.push('');

  for (const [phase, info] of Object.entries(PHASE_DESCRIPTIONS)) {
    const phaseEntries = byPhase[phase as CeremonialPhase];

    parts.push(`## ${info.name}`);
    parts.push(`*${info.description}*`);
    parts.push('');
    parts.push(`Entries: ${phaseEntries.length}`);
    parts.push('');

    if (phaseEntries.length > 0) {
      for (const entry of phaseEntries) {
        parts.push(
          `- **${entry.entryType}** (${new Date(entry.timestamp).toLocaleDateString()}): ${entry.content.substring(
            0,
            100,
          )}...`,
        );
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}
