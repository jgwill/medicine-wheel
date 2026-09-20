/**
 * Chronicle → dev wheel importer.
 *
 * Reads the Miadi Chronicle episode folders and writes them into a *dev*
 * Medicine Wheel through its own HTTP routes, so the Honcho river carries
 * every record the same way it will in production. Nothing is written to
 * Honcho directly: the point is to exercise the wheel's own write path.
 *
 * The mapping, stated so nothing is smuggled in:
 *
 *   episode folder            → cycle id `chronicle:<folder>`, which is the
 *                               Honcho session every record of that episode
 *                               lands in (sessionIdForBeat falls to cycle_id)
 *   ceremonies/<uuid>/notes.md → a ceremony, id and direction and participants
 *                               and medicine read from the file, never invented
 *   episode.yaml              → one beat, direction EAST (an episode is opened
 *                               and named), goal as description, references as
 *                               learnings, lineage relations as relations honored
 *   chapter-NN-*-script.md    → one beat, direction SOUTH (the work growing
 *                               through the episode), the script as prose
 *   attention.json answered   → one diary entry in William's voice, the question
 *                               and his answer, phase from the item, in the
 *                               episode's ceremony when it has exactly one
 *
 * An open attention item is NOT imported: an unanswered question is not a record
 * of anything said.
 *
 * Usage: MW_URL=http://127.0.0.1:8140 node scripts/dev/import-chronicle.mjs [--limit N] [--dry]
 */

import fs from 'node:fs';
import path from 'node:path';

const CHRONICLE = process.env.CHRONICLE_DIR || '/srv/miadi/episodes/miadi-chronicle';
const MW = (process.env.MW_URL || 'http://127.0.0.1:8140').replace(/\/+$/, '');
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity;

/** Honcho takes at most 25000 characters in a message; leave room for the header. */
const MAX_PROSE = 20000;

/** attention item phase → ceremonial-diary phase. Opening question → east. */
const PHASE = 'ningwaab'; // west: what has been worked over and answered

const counts = { ceremonies: 0, beats: 0, diary: 0, failed: 0 };
const failures = [];

async function post(route, body) {
  if (DRY) return { dry: true };
  const res = await fetch(`${MW}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    counts.failed++;
    failures.push(`${route} ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  return JSON.parse(text);
}

/** A tiny YAML reader for the flat keys episode.yaml actually uses. */
function readEpisodeYaml(file) {
  const out = { references: [], lineage: [] };
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let key = null;
  let buffer = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    if (top) {
      // Only a block scalar closes into a string. A key whose body was list
      // items already holds an array; overwriting it with the empty buffer is
      // what turned `references` into '' and sent a string where the wheel
      // expects string[].
      if (key && buffer !== null && !Array.isArray(out[key])) out[key] = buffer.trim();
      key = top[1];
      buffer = null;
      const value = top[2];
      if (value === '' || value === '|' || value === '>-' || value === '>') { buffer = ''; continue; }
      out[key] = value.replace(/^['"]|['"]$/g, '');
      key = null;
      continue;
    }
    const item = line.match(/^\s+-\s+"?([^"]+)"?\s*$/);
    if (item && (key === 'references' || key === 'artifacts')) {
      (out[key] ||= []).push(item[1].trim());
      continue;
    }
    const rel = line.match(/^\s+relation:\s*(.+)$/);
    if (rel) { out.lineage.push(rel[1].trim()); continue; }
    if (key && buffer !== null) buffer += ' ' + line.trim();
  }
  if (key && buffer !== null && !Array.isArray(out[key])) out[key] = buffer.trim();
  return out;
}

/** `# Ceremony <uuid> — opening, east` plus the **Participants:** / **Medicine:** lines. */
function readCeremonyNotes(file, uuid, episodePath) {
  const text = fs.readFileSync(file, 'utf8');
  const head = text.match(/^#\s*Ceremony\s+\S+\s*[—-]\s*([a-z-]+),\s*([a-z]+)/im);
  const type = head?.[1] ?? 'opening';
  const direction = ['east', 'south', 'west', 'north'].includes(head?.[2]) ? head[2] : 'east';
  const people = text.match(/\*\*Participants:\*\*\s*([^\n·]+)/i)?.[1] ?? '';
  const medicine = text.match(/\*\*Medicine:\*\*\s*([^\n·]+)/i)?.[1] ?? '';
  const opened = text.match(/\*\*Opened:\*\*\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const intention = text.split(/^##\s*Intention\s*$/im)[1]?.split(/^##\s/m)[0]?.trim();
  return {
    id: uuid,
    type,
    direction,
    participants: people.split(/,|\band\b/).map((s) => s.trim()).filter(Boolean),
    medicines_used: medicine.split(/,/).map((s) => s.trim()).filter(Boolean),
    intentions: intention ? [intention.slice(0, 1000)] : [],
    episode_path: episodePath,
    source: 'chronicle-import',
    ...(opened ? { timestamp: `${opened}T12:00:00.000Z` } : {}),
  };
}

async function importEpisode(folder) {
  const dir = path.join(CHRONICLE, folder);
  const yaml = readEpisodeYaml(path.join(dir, 'episode.yaml'));
  if (!yaml.title) return;
  const cycle = `chronicle:${folder}`;
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(yaml.date || '') ? `${yaml.date}T12:00:00.000Z` : undefined;

  // 1. ceremonies — only the ones the vessel actually recorded
  const ceremonyIds = [];
  const ceremonyDir = path.join(dir, 'ceremonies');
  if (fs.existsSync(ceremonyDir)) {
    for (const uuid of fs.readdirSync(ceremonyDir)) {
      const notes = path.join(ceremonyDir, uuid, 'notes.md');
      if (!fs.existsSync(notes)) continue;
      const body = readCeremonyNotes(notes, uuid, folder);
      if (await post('/api/ceremonies', body)) { counts.ceremonies++; ceremonyIds.push(uuid); }
    }
  }

  // 2. the episode itself, opened in the east
  const episodeBeat = {
    direction: 'east',
    title: yaml.title,
    description: (yaml.goal || yaml.title).slice(0, 4000),
    ceremonies: ceremonyIds,
    cycle_id: cycle,
    learnings: (yaml.references || []).slice(0, 20),
    relations_honored: (yaml.lineage || []).slice(0, 10),
    origin: { producer: 'chronicle-import', source_ref: folder },
    ...(stamp ? { timestamp: stamp } : {}),
  };
  if (await post('/api/narrative/beats', episodeBeat)) counts.beats++;

  // 3. the chapters, the work growing through the episode
  for (const file of fs.readdirSync(dir).filter((f) => /^chapter-\d+.*script\.md$/.test(f)).sort()) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
    const body = text.replace(/^#\s+.+$/m, '').trim();
    const first = body.split(/\n\s*\n/)[0]?.replace(/\n/g, ' ').trim() ?? title;
    if (await post('/api/narrative/beats', {
      direction: 'south',
      title: title.slice(0, 200),
      description: first.slice(0, 2000),
      prose: body.slice(0, MAX_PROSE),
      ceremonies: ceremonyIds,
      cycle_id: cycle,
      learnings: [],
      relations_honored: [],
      origin: { producer: 'chronicle-import', source_ref: `${folder}/${file}` },
      ...(stamp ? { timestamp: stamp } : {}),
    })) counts.beats++;
  }

  // 4. the answered attention — William's own voice
  const attention = path.join(dir, 'attention.json');
  if (fs.existsSync(attention)) {
    let items = [];
    try { items = JSON.parse(fs.readFileSync(attention, 'utf8')).items ?? []; } catch { items = []; }
    for (const item of items) {
      if (item.state !== 'answered' || !item.answer) continue;
      const content =
        `Question: ${item.question}\n` +
        (item.unlocks ? `Unlocks: ${item.unlocks}\n` : '') +
        `\nWilliam's answer: ${item.answer}`;
      if (await post('/api/diary', {
        participant: 'William',
        phase: PHASE,
        entryType: 'reflection',
        content: content.slice(0, MAX_PROSE),
        chronicle: `chronicle:${folder}`,
        ...(ceremonyIds.length === 1 ? { ceremony_id: ceremonyIds[0] } : {}),
        metadata: { tags: ['attention', item.id], episode_path: folder, ...(item.answered_at ? { answered_at: item.answered_at } : {}) },
      })) counts.diary++;
    }
  }
}

const folders = fs
  .readdirSync(CHRONICLE)
  .filter((f) => fs.existsSync(path.join(CHRONICLE, f, 'episode.yaml')))
  .sort()
  .slice(0, LIMIT);

console.log(`${folders.length} episode folders → ${MW}${DRY ? ' (dry run)' : ''}`);
for (const [i, folder] of folders.entries()) {
  await importEpisode(folder);
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${folders.length} … ${JSON.stringify(counts)}`);
}
console.log('done:', counts);
if (failures.length) { console.log(`\nfirst failures (${failures.length}):`); for (const f of failures.slice(0, 10)) console.log('  ', f); }
