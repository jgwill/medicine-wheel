#!/usr/bin/env node
/**
 * Materialise `metadata.parent_id` as real relations.
 *
 * ## Why
 *
 * 106 nodes in the chronicle wheel record a parent in `metadata.parent_id`.
 * Exactly 5 of those parents exist as edges. The other 101 are invisible to
 * every consumer that reads relations rather than metadata: the graph, the
 * relational web endpoint, `getRelationalWeb`, and any traversal.
 *
 * Measured effect of this repair on the chronicle store (2026-09-03):
 *
 *   connected components   82 → 26
 *   isolated nodes         75 → 22
 *   chronicle root degree   3 → 82
 *
 * All 22 attention nodes are isolates for this reason alone, which is why an
 * episode page could show a parent it could not link to.
 *
 * ## Relation types are taken from precedent, never chosen
 *
 * The 5 pairs that were already materialised establish both:
 *
 *   chronicle_episode → chronicle_root   belongs_to     (2 existing)
 *   structured_plan   → chronicle_episode documented_in (3 existing)
 *   stc_chart         → chronicle_episode documented_in (2 existing)
 *
 * So episode→root is `belongs_to` and a child artefact→episode is
 * `documented_in`. `part-of` is *not* used: all 33 of its uses are
 * infrastructure containment (tenant→host, service→tenant) and none touch an
 * episode. Writing 101 `part-of` edges would have mixed the chronicle into the
 * infra vocabulary permanently and made both unreadable.
 *
 * ## Safety
 *
 * - Refuses to run without `--commit`; the default is a dry run that prints the
 *   plan and writes nothing.
 * - Snapshots `nodes.jsonl` and `edges.jsonl` before the first write. Rollback is
 *   restoring those two files.
 * - Writes through `storage-provider`'s `createEdge`, which takes the store's
 *   file lock (`jsonl.ts` read-modify-write). A raw append would bypass it and
 *   can lose a concurrent write.
 * - Skips any pair that already has an edge in either direction; it never
 *   double-edges and is safe to re-run.
 * - Skips any pair whose parent is not a node in the store, and reports it —
 *   an edge to a node that does not exist is the dangling reference that makes a
 *   renderer silently drop relations.
 *
 * ## Usage
 *
 *   MW_DATA_DIR=/srv/miadi/episodes/miadi-chronicle/.mw node scripts/materialise-containment.mjs
 *   MW_DATA_DIR=... node scripts/materialise-containment.mjs --commit
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMIT = process.argv.includes('--commit');

const dataDir = process.env.MW_DATA_DIR;
if (!dataDir) {
  console.error('MW_DATA_DIR is required — refusing to guess which wheel to write to.');
  process.exit(2);
}

const storeDir = path.join(dataDir, 'store');
const nodesPath = path.join(storeDir, 'nodes.jsonl');
const edgesPath = path.join(storeDir, 'edges.jsonl');

for (const file of [nodesPath, edgesPath]) {
  if (!fs.existsSync(file)) {
    console.error(`No store at ${file}`);
    process.exit(2);
  }
}

const readJsonl = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

const nodes = readJsonl(nodesPath);
const edges = readJsonl(edgesPath);

const nodeById = new Map(nodes.map((n) => [n.id, n]));
const kindOf = (id) => nodeById.get(id)?.metadata?.kind ?? '<unknown>';

// Either orientation counts as "already related" — the point is that a
// consumer can traverse between them, not which way the arrow was drawn.
const related = new Set();
for (const e of edges) {
  related.add(`${e.from_id}|${e.to_id}`);
  related.add(`${e.to_id}|${e.from_id}`);
}

/** Relation type by the kind of the parent, from the precedent above. */
function relationFor(parentKind) {
  if (parentKind === 'chronicle_root') return 'belongs_to';
  if (parentKind === 'chronicle_episode') return 'documented_in';
  return null;
}

/** Obligation text mirroring what the existing edges of each type carry. */
const OBLIGATIONS = {
  belongs_to: ['Preserve episode.yaml as the canonical human-readable record'],
  documented_in: ['Retain source provenance'],
};

const planned = [];
const skippedExisting = [];
const skippedMissingParent = [];
const skippedUnknownShape = [];

for (const node of nodes) {
  const parentId = node.metadata?.parent_id;
  if (typeof parentId !== 'string' || !parentId) continue;

  if (related.has(`${node.id}|${parentId}`)) {
    skippedExisting.push(node.id);
    continue;
  }
  if (!nodeById.has(parentId)) {
    skippedMissingParent.push({ child: node.id, parent: parentId });
    continue;
  }

  const relationship = relationFor(kindOf(parentId));
  if (!relationship) {
    skippedUnknownShape.push({
      child: node.id,
      childKind: kindOf(node.id),
      parentKind: kindOf(parentId),
    });
    continue;
  }

  planned.push({
    from_id: node.id,
    to_id: parentId,
    relationship_type: relationship,
    strength: 1,
    ceremony_honored: false,
    obligations: OBLIGATIONS[relationship],
    created_at: new Date().toISOString(),
  });
}

const byShape = new Map();
for (const edge of planned) {
  const key = `${kindOf(edge.from_id)} → ${kindOf(edge.to_id)}  as ${edge.relationship_type}`;
  byShape.set(key, (byShape.get(key) ?? 0) + 1);
}

console.log(`store              ${storeDir}`);
console.log(`nodes              ${nodes.length}`);
console.log(`edges              ${edges.length}`);
console.log(`parent_id present  ${planned.length + skippedExisting.length + skippedMissingParent.length + skippedUnknownShape.length}`);
console.log(`already an edge    ${skippedExisting.length}`);
console.log('');
console.log('to write:');
for (const [shape, count] of byShape) console.log(`  ${String(count).padStart(3)}  ${shape}`);

if (skippedMissingParent.length > 0) {
  console.log(`\nskipped — parent not in the store (${skippedMissingParent.length}):`);
  for (const s of skippedMissingParent.slice(0, 10)) console.log(`  ${s.child} → ${s.parent}`);
}
if (skippedUnknownShape.length > 0) {
  console.log(`\nskipped — no precedent for this parent kind (${skippedUnknownShape.length}):`);
  for (const s of skippedUnknownShape.slice(0, 10)) {
    console.log(`  ${s.childKind} → ${s.parentKind}  (${s.child})`);
  }
  console.log('  Choosing a relation type for these is a naming decision, not a mechanical one.');
}

if (!COMMIT) {
  console.log('\nDry run. Nothing was written. Re-run with --commit.');
  process.exit(0);
}

if (planned.length === 0) {
  console.log('\nNothing to write.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(storeDir, `.backup-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(nodesPath, path.join(backupDir, 'nodes.jsonl'));
fs.copyFileSync(edgesPath, path.join(backupDir, 'edges.jsonl'));
console.log(`\nsnapshot           ${backupDir}`);
console.log('rollback           restore those two files over the originals');

// `JsonlProvider` writes into exactly the directory it is handed — it does not
// append `store/`. Passing `MW_DATA_DIR` here instead of the store directory
// creates a second, empty set of JSONL files one level up and reports success,
// which is what the edge-count guard below caught on the first run against a
// copy. The guard stays because the mistake is silent without it.
const { JsonlProvider } = await import('@medicine-wheel/storage-provider');
const provider = new JsonlProvider(storeDir);
await provider.connect();

let written = 0;
for (const edge of planned) {
  await provider.createEdge(edge);
  written += 1;
}

const after = readJsonl(edgesPath);
console.log(`\nwrote              ${written}`);
console.log(`edges              ${edges.length} → ${after.length}`);

if (after.length !== edges.length + written) {
  console.error(
    `\nEdge count did not move by the number written (${edges.length} + ${written} ≠ ${after.length}).`,
  );
  console.error('Another writer touched the store during the repair. Inspect before trusting it.');
  process.exit(1);
}
