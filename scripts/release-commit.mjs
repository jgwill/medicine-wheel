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

const packagesDir = join(cwd, 'src');
const packageFiles = readdirSync(packagesDir, { withFileTypes: true })
	.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
	.map((d) => join('src', d.name, 'package.json'))
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
