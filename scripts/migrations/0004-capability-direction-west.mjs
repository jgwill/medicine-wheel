#!/usr/bin/env node
/**
 * 0004 — give every capability node the direction its spec names: west.
 *
 * ## What happened
 *
 * `rispecs/developer-suite/repository-mapping/capabilities.spec.md` places a
 * capability in the west: what executes and is offered, the reason a service
 * is west. `@miadi/inquiry-weave` created capability nodes without a direction
 * until 0.18.14 (jgwill/Miadi#1006). On 2026-11-12 the chronicle wheel held 36
 * nodes with `metadata.kind: "capability"`, none of them with a direction, so
 * the four-direction layout and every direction filter left them out.
 *
 * From 0.18.14, a capability node is created west, and a node without a
 * direction is given west the next time an episode holds it. This migration
 * covers the nodes no episode will hold again.
 *
 * ## Safety
 *
 * - Dry run by default; `--commit` required.
 * - Touches ONLY nodes whose `metadata.kind` is `capability` and whose
 *   `direction` is empty. A node with any direction, west or another one a
 *   person chose, is never touched, so this is idempotent and safe to re-run.
 * - Sends `{"direction": "west"}` alone: no metadata key is sent, so the
 *   metadata merge 0003 repaired is not involved.
 * - Reads back and refuses to claim success unless every capability node
 *   carries a direction afterwards.
 *
 * ## Usage
 *
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0004-capability-direction-west.mjs
 *   MW_API_URL=http://127.0.0.1:8040 node scripts/migrations/0004-capability-direction-west.mjs --commit
 *
 * Run on the authority host by the wheel's owner. Proposed in Episode 568's
 * Capability Registry review, 2026-11-12.
 */

const COMMIT = process.argv.includes('--commit');
const DIRECTION = 'west';

const apiUrl = process.env.MW_API_URL;
if (!apiUrl) {
  console.error('MW_API_URL is required — refusing to guess which wheel to write to.');
  process.exit(2);
}
const base = apiUrl.replace(/\/+$/, '');

async function readNodes() {
  const response = await fetch(`${base}/api/nodes?limit=all`);
  if (!response.ok) {
    console.error(`GET ${base}/api/nodes answered ${response.status}`);
    process.exit(2);
  }
  const body = await response.json();
  const nodes = Array.isArray(body) ? body : body.nodes;
  if (!Array.isArray(nodes)) {
    console.error(`GET ${base}/api/nodes answered no node list`);
    process.exit(2);
  }
  return nodes;
}

const isCapability = (node) => node?.metadata?.kind === 'capability';
const lacksDirection = (node) => node.direction === undefined || node.direction === null || node.direction === '';

const before = await readNodes();
const capabilities = before.filter(isCapability);
const targets = capabilities.filter(lacksDirection);
console.log(`wheel ${base}: ${before.length} nodes, ${capabilities.length} capability nodes, ${targets.length} without a direction`);
for (const node of targets) console.log(`  ${node.id}`);

if (!COMMIT) {
  console.log(`dry run: would set direction ${DIRECTION} on ${targets.length} nodes. Pass --commit to write.`);
  process.exit(0);
}

let failed = 0;
for (const node of targets) {
  const url = `${base}/api/nodes/${encodeURIComponent(node.id)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ direction: DIRECTION }),
  });
  if (!response.ok) {
    failed += 1;
    console.error(`PATCH ${node.id} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
}

const after = (await readNodes()).filter(isCapability);
const still = after.filter(lacksDirection);
const metadataLost = after.filter((node) => {
  const was = capabilities.find((c) => c.id === node.id);
  return was && Object.keys(was.metadata ?? {}).some((key) => !(key in (node.metadata ?? {})));
});
console.log(`read back: ${after.length} capability nodes, ${still.length} without a direction, ${metadataLost.length} with a metadata key missing`);
if (failed > 0 || still.length > 0 || metadataLost.length > 0) {
  console.error('not complete: see the lines above. Nothing was claimed.');
  process.exit(1);
}
console.log(`done: ${targets.length} capability nodes are ${DIRECTION}.`);
