#!/usr/bin/env node

/**
 * Stages root + workspace package.json files and the lockfile after a
 * successful release, then commits with "chore: release v<version>".
 * Reads the lockstep version from src/ontology-core/package.json.
 *
 * Does NOT push — user pushes manually.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const cwd = process.cwd();
const version = JSON.parse(
	readFileSync(join(cwd, 'src/ontology-core/package.json'), 'utf8'),
).version;

// Every directory that carries its own version and is published. `mcp` is NOT
// under src/, so a src-only sweep silently left it behind — twice. The v0.5.10
// residue commit (e5b2d1d) and the 4.6.0/4.6.1 split at v0.6.1 are the same
// omission, and the second one shipped: npm carried mcp@4.6.1 while the repo
// still said 4.6.0, and mw-fw-upgrade.sh reads the version from the REPO, so
// ilex installed mcp 4.6.0 beside app 0.6.1 and nothing failed loudly.
const versionedDirs = [
	...readdirSync(join(cwd, 'src'), { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
		.map((d) => join('src', d.name)),
	'mcp',
];

// Lockfiles too: `npm install` rewrites them during version:*, and a manifest
// committed without its lockfile is the residue e5b2d1d had to clean up after.
const packageFiles = versionedDirs
	.flatMap((d) => [join(d, 'package.json'), join(d, 'package-lock.json')])
	.filter((p) => existsSync(join(cwd, p)));

const filesToStage = ['package.json', 'package-lock.json', ...packageFiles];

execFileSync('git', ['add', '--', ...filesToStage], { stdio: 'inherit' });

const status = execFileSync('git', ['diff', '--cached', '--name-only'], {
	encoding: 'utf8',
}).trim();
if (!status) {
	console.log('No staged release changes — skipping commit.');
	process.exit(0);
}

execFileSync('git', ['commit', '-m', `chore: release v${version}`], {
	stdio: 'inherit',
});

console.log(`\n✅ Committed release v${version}`);
console.log('   Push with: git push');
