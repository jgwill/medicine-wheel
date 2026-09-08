#!/usr/bin/env node
/**
 * 0002 — give episode nodes an occurrence date distinct from registration.
 *
 * ## Why
 *
 * `created_at` records when the **wheel learned** of an episode, not when the
 * episode happened. Measured on the chronicle 2026-09-05: **0 of 84** episode
 * nodes carry any occurrence date, and twelve May episodes all share one
 * September `created_at` from a single import batch. So every chronological
 * view is registration order wearing history's name — `/episodes` says so in a
 * banner rather than pretend otherwise.
 *
 * The dates are not missing. **119 of 133** `episode.yaml` files on disk carry a
 * `date:` field, starting `2026-05-04` for episode 001.
 *
 * `created_at` is NOT touched. "When this entered the wheel" is a true and
 * useful fact, and overwriting it would destroy the only record of registration
 * order. The two answer different questions.
 *
 * ## What it unblocks
 *
 * The lineage layout — x chronological, y direction band, relation arcs above
 * the spine. It cannot ship before this: run on `created_at` it would stack
 * twelve May episodes on one September pixel and look right while being wrong.
 *
 * ## Safety
 *
 * - Dry run by default. `--commit` required, and an explicit `MW_API_URL`.
 * - Writes through the HTTP API, never by touching a JSONL file. The store is
 *   shared live state on another host and is not this script's to edit.
 * - Idempotent: skips any node that already has `occurred_at`, so a second run
 *   is a no-op and a partial run resumes.
 * - Additive: removing the field restores today's ordering exactly.
 * - Reports every episode whose `episode.yaml` carries no `date:` rather than
 *   guessing one.
 *
 * ## Usage
 *
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0002-backfill-occurred-at.mjs
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0002-backfill-occurred-at.mjs --commit
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMIT = process.argv.includes('--commit');

const apiUrl = process.env.MW_API_URL;
if (!apiUrl) {
  console.error('MW_API_URL is required — refusing to guess which wheel to write to.');
  process.exit(2);
}

const chronicleRoot =
  process.env.MIADI_CHRONICLE_ROOT ?? '/srv/miadi/episodes/miadi-chronicle';
if (!fs.existsSync(chronicleRoot)) {
  console.error(`No chronicle at ${chronicleRoot}. Set MIADI_CHRONICLE_ROOT.`);
  process.exit(2);
}

/** `date: 2026-05-04` — first match wins, quoted or bare. */
function readDate(yamlPath) {
  let text;
  try {
    text = fs.readFileSync(yamlPath, 'utf8');
  } catch {
    return null;
  }
  const match = text.match(/^\s*date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

/** Episode folder name → its `date:`, for every episode.yaml on disk. */
function datesOnDisk() {
  const dates = new Map();
  for (const entry of fs.readdirSync(chronicleRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const yamlPath = path.join(chronicleRoot, entry.name, 'episode.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    const date = readDate(yamlPath);
    if (date) dates.set(entry.name, date);
    else dates.set(entry.name, null);
  }
  return dates;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return response.json();
}

const episodesUrl = `${apiUrl}/api/nodes?kind=chronicle_episode&limit=all`;
const body = await getJson(episodesUrl);
const episodes = body.nodes ?? [];

// The route reports `total` (the whole store) and, when filtering, `matched`
// (what the filter selected). Compare against `matched` — `total` is 207 nodes
// while only 85 are episodes, and comparing to it aborts a correct read. The
// guard itself is the point: a migration that silently ran over a window would
// leave the rest permanently half-done.
const expected = typeof body.matched === 'number' ? body.matched : body.total;
if (typeof expected === 'number' && episodes.length < expected) {
  console.error(
    `Read ${episodes.length} of ${expected} matching episodes — the server truncated. Aborting rather than migrating a window.`,
  );
  process.exit(1);
}
if (body.truncated) {
  console.error('The server reported truncated: true. Aborting rather than migrating a window.');
  process.exit(1);
}

const onDisk = datesOnDisk();

const planned = [];
const alreadySet = [];
const noDateOnDisk = [];
const noFolder = [];

for (const node of episodes) {
  if (node.metadata?.occurred_at) {
    alreadySet.push(node.id);
    continue;
  }

  // `chronicle:2026-05-04-episode-001-…` → the folder of the same name.
  const folder = String(node.id).replace(/^chronicle:/, '');
  if (!onDisk.has(folder)) {
    noFolder.push(node.id);
    continue;
  }

  const date = onDisk.get(folder);
  if (!date) {
    noDateOnDisk.push(node.id);
    continue;
  }

  planned.push({ id: node.id, date, created_at: node.created_at });
}

const disagree = planned.filter((p) => (p.created_at ?? '').slice(0, 10) !== p.date);

console.log(`wheel                ${apiUrl}`);
console.log(`chronicle            ${chronicleRoot}`);
console.log(`episode nodes        ${episodes.length}${body.total !== undefined ? ` of ${body.total}` : ''}`);
console.log(`already have a date  ${alreadySet.length}`);
console.log(`to write             ${planned.length}`);
console.log(`  of those, created_at disagrees with the real date: ${disagree.length}`);
console.log(`no date: on disk     ${noDateOnDisk.length}`);
console.log(`no folder matched    ${noFolder.length}`);

if (planned.length > 0) {
  console.log('\nfirst 10 (occurred_at  <-  created_at):');
  for (const p of planned.slice(0, 10)) {
    const registered = (p.created_at ?? '').slice(0, 10);
    const flag = registered !== p.date ? '  <-- differs' : '';
    console.log(`  ${p.date}  <-  ${registered}  ${p.id.slice(0, 58)}${flag}`);
  }
}
if (noDateOnDisk.length > 0) {
  console.log(`\nleft alone — episode.yaml carries no date: (${noDateOnDisk.length}):`);
  for (const id of noDateOnDisk.slice(0, 10)) console.log(`  ${id}`);
}
if (noFolder.length > 0) {
  console.log(`\nleft alone — no matching folder on disk (${noFolder.length}):`);
  for (const id of noFolder.slice(0, 10)) console.log(`  ${id}`);
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Re-run with --commit.');
  process.exit(0);
}

if (planned.length === 0) {
  console.log('\nNothing to write.');
  process.exit(0);
}

console.log('\nwriting…');
let written = 0;
const failures = [];

for (const item of planned) {
  const url = `${apiUrl}/api/nodes/${encodeURIComponent(item.id)}`;
  try {
    // Merge, never replace: PATCH carries only the one new key so nothing else
    // in metadata is disturbed.
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { occurred_at: item.date } }),
    });
    if (!response.ok) {
      failures.push({ id: item.id, status: response.status, body: await response.text() });
      continue;
    }
    written += 1;
  } catch (error) {
    failures.push({ id: item.id, status: 'threw', body: String(error) });
  }
}

console.log(`\nwrote                ${written} of ${planned.length}`);

if (failures.length > 0) {
  console.error(`\nfailed               ${failures.length}`);
  for (const f of failures.slice(0, 10)) {
    console.error(`  ${f.status}  ${f.id}\n    ${String(f.body).slice(0, 160)}`);
  }
}

// Verify from the wheel rather than from this script's own bookkeeping.
const after = await getJson(episodesUrl);
const withDate = (after.nodes ?? []).filter((n) => n.metadata?.occurred_at).length;
console.log(`episodes with occurred_at, read back: ${withDate}`);

if (withDate < alreadySet.length + written) {
  console.error('Read-back is short of what was written. Inspect before trusting it.');
  process.exit(1);
}
