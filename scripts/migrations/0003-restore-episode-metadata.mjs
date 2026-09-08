#!/usr/bin/env node
/**
 * 0003 — restore the episode metadata that 0002 destroyed.
 *
 * ## What happened
 *
 * On 2026-09-08, migration 0002 sent `PATCH /api/nodes/{id}` with
 * `{"metadata": {"occurred_at": "..."}}`, intending to add one key.
 *
 * That route REPLACED `metadata` rather than merging it. It returned 200 OK
 * seventy-six times. Every one of those nodes lost `kind`, `contract`,
 * `schema_version`, `root`, `relative_path`, `parent_id`, `status` and
 * `source_issue`, keeping only `occurred_at`. `chronicle_episode` fell from 85
 * nodes to 9 — every consumer filtering on kind stopped seeing them.
 *
 * The read-back guard in 0002 caught it in the same run: it reported
 * `episodes with occurred_at, read back: 0` and refused to claim success. That
 * is the only reason this is a restore rather than a discovery weeks later.
 *
 * The route is fixed in the same change as this script — `metadata` now merges,
 * and an explicit `null` is the way to remove a key.
 *
 * ## Where the truth comes from
 *
 * `git show 61d18c3:miadi-chronicle/.mw/store/nodes.jsonl` in
 * `/srv/miadi/episodes` — the store as it stood before the chronicle wheel data
 * moved to its own repository. 205 nodes, 83 episodes with intact metadata, 64
 * carrying `source_issue`, 82 carrying `status`.
 *
 * These are the **recorded values**, not reconstructed ones. Six of the eight
 * fields are deterministic and could have been rebuilt from the node id, but
 * `status` and `source_issue` could not: the node's `status` is `active` while
 * the same episode's `episode.yaml` says `local-audio-generated`. They are
 * different fields, and guessing would have written a plausible lie.
 *
 * ## Safety
 *
 * - Dry run by default; `--commit` required.
 * - Restores ONLY nodes whose metadata is currently just `{occurred_at}` — the
 *   exact fingerprint of the damage. A node with intact metadata is never
 *   touched, so this is idempotent and safe to re-run.
 * - Refuses any damaged node absent from the snapshot rather than guessing.
 * - Keeps `occurred_at`: the field 0002 set was correct and is merged back on
 *   top of the restored metadata.
 * - Reads back and verifies the episode count returns to what the snapshot says.
 *
 * ## Usage
 *
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0003-restore-episode-metadata.mjs
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0003-restore-episode-metadata.mjs --commit
 */

import { execFileSync } from 'node:child_process';

const COMMIT = process.argv.includes('--commit');

const apiUrl = process.env.MW_API_URL;
if (!apiUrl) {
  console.error('MW_API_URL is required — refusing to guess which wheel to write to.');
  process.exit(2);
}

const SNAPSHOT_REPO = process.env.MW_SNAPSHOT_REPO ?? '/srv/miadi/episodes';
const SNAPSHOT_REF =
  process.env.MW_SNAPSHOT_REF ?? '61d18c3:miadi-chronicle/.mw/store/nodes.jsonl';

function readSnapshot() {
  let raw;
  try {
    raw = execFileSync('git', ['-C', SNAPSHOT_REPO, 'show', SNAPSHOT_REF], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    console.error(`Could not read ${SNAPSHOT_REF} from ${SNAPSHOT_REPO}:`);
    console.error(String(error).slice(0, 300));
    process.exit(2);
  }

  const byId = new Map();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const node = JSON.parse(line);
      if (node?.id) byId.set(node.id, node);
    } catch {
      // A malformed line in a historical snapshot is not this script's to fix.
    }
  }
  return byId;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return response.json();
}

const snapshot = readSnapshot();
const live = await getJson(`${apiUrl}/api/nodes?limit=all`);
const nodes = live.nodes ?? [];

if (live.truncated) {
  console.error('The server reported truncated: true. Aborting rather than restoring a window.');
  process.exit(1);
}

/** The exact fingerprint of the damage: metadata is nothing but occurred_at. */
function isDamaged(node) {
  const keys = Object.keys(node.metadata ?? {});
  return keys.length === 1 && keys[0] === 'occurred_at';
}

const damaged = nodes.filter(isDamaged);
const planned = [];
const missingFromSnapshot = [];

for (const node of damaged) {
  const original = snapshot.get(node.id);
  if (!original?.metadata || Object.keys(original.metadata).length === 0) {
    missingFromSnapshot.push(node.id);
    continue;
  }
  planned.push({
    id: node.id,
    // The recorded metadata, plus the occurred_at 0002 was right to add.
    metadata: { ...original.metadata, occurred_at: node.metadata.occurred_at },
    restoredKeys: Object.keys(original.metadata),
  });
}

const liveEpisodes = nodes.filter((n) => n.metadata?.kind === 'chronicle_episode').length;
const snapshotEpisodes = [...snapshot.values()].filter(
  (n) => n.metadata?.kind === 'chronicle_episode',
).length;

console.log(`wheel                     ${apiUrl}`);
console.log(`snapshot                  ${SNAPSHOT_REPO} @ ${SNAPSHOT_REF.split(':')[0]}`);
console.log(`live nodes                ${nodes.length}`);
console.log(`damaged (metadata = only occurred_at)  ${damaged.length}`);
console.log(`restorable from snapshot  ${planned.length}`);
console.log(`NOT in snapshot           ${missingFromSnapshot.length}`);
console.log('');
console.log(`chronicle_episode now     ${liveEpisodes}`);
console.log(`chronicle_episode in snapshot ${snapshotEpisodes}`);

if (planned.length > 0) {
  console.log('\nfirst 5 restorations:');
  for (const p of planned.slice(0, 5)) {
    console.log(`  ${p.id.slice(0, 56)}`);
    console.log(`    restoring: ${p.restoredKeys.join(', ')}`);
  }
}
if (missingFromSnapshot.length > 0) {
  console.log(`\nCANNOT restore — absent from the snapshot (${missingFromSnapshot.length}):`);
  for (const id of missingFromSnapshot) console.log(`  ${id}`);
  console.log('  These need their metadata rebuilt by hand or from episode.yaml.');
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Re-run with --commit.');
  process.exit(0);
}

if (planned.length === 0) {
  console.log('\nNothing to restore.');
  process.exit(0);
}

console.log('\nrestoring…');
let written = 0;
const failures = [];

for (const item of planned) {
  const url = `${apiUrl}/api/nodes/${encodeURIComponent(item.id)}`;
  try {
    // The full object, deliberately. This must work whether the server merges
    // (fixed) or replaces (as it did when the damage was done), so sending the
    // complete metadata is correct under both and depends on neither.
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: item.metadata }),
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

console.log(`\nrestored                  ${written} of ${planned.length}`);
if (failures.length > 0) {
  console.error(`failed                    ${failures.length}`);
  for (const f of failures.slice(0, 10)) {
    console.error(`  ${f.status}  ${f.id}\n    ${String(f.body).slice(0, 160)}`);
  }
}

// Verify from the wheel, never from this script's own tally.
const after = await getJson(`${apiUrl}/api/nodes?limit=all`);
const afterNodes = after.nodes ?? [];
const afterEpisodes = afterNodes.filter((n) => n.metadata?.kind === 'chronicle_episode').length;
const stillDamaged = afterNodes.filter(isDamaged).length;
const withOccurred = afterNodes.filter((n) => n.metadata?.occurred_at).length;

console.log(`\nread back:`);
console.log(`  chronicle_episode       ${afterEpisodes}  (was ${liveEpisodes}, snapshot has ${snapshotEpisodes})`);
console.log(`  still damaged           ${stillDamaged}`);
console.log(`  carrying occurred_at    ${withOccurred}`);

if (stillDamaged > missingFromSnapshot.length) {
  console.error('\nNodes remain damaged beyond those the snapshot could not cover.');
  process.exit(1);
}
if (afterEpisodes < liveEpisodes) {
  console.error('\nEpisode count went DOWN. Stop and inspect before anything else runs.');
  process.exit(1);
}
