#!/usr/bin/env node

/**
 * Syncs ALL medicine-wheel-* package dependency versions to match their current
 * versions. Enforces lockstep versioning across the monorepo.
 *
 * Mirror of the ava-pi pattern (scripts/sync-versions.js), adapted for the
 * `medicine-wheel-` prefix used by this workspace.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const PREFIX = 'medicine-wheel-';
const packagesDir = join(process.cwd(), 'src');
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
	.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
	.map((d) => d.name)
	.filter((name) => existsSync(join(packagesDir, name, 'package.json')));

const packages = {};
const versionMap = {};

for (const dir of packageDirs) {
	const pkgPath = join(packagesDir, dir, 'package.json');
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
		packages[dir] = { path: pkgPath, data: pkg };
		versionMap[pkg.name] = pkg.version;
	} catch (e) {
		console.error(`Failed to read ${pkgPath}:`, e.message);
	}
}

console.log('Current versions:');
for (const [name, version] of Object.entries(versionMap).sort()) {
	console.log(`  ${name}: ${version}`);
}

const versions = new Set(Object.values(versionMap));
if (versions.size > 1) {
	console.error('\n❌ ERROR: Not all packages have the same version!');
	console.error('Expected lockstep versioning. Run one of:');
	console.error('  npm run version:patch');
	console.error('  npm run version:minor');
	console.error('  npm run version:major');
	process.exit(1);
}

console.log('\n✅ All packages at same version (lockstep)');

const rootPkgPath = join(process.cwd(), 'package.json');
try {
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
	packages['__root__'] = { path: rootPkgPath, data: rootPkg };
} catch (e) {
	console.error(`Failed to read root package.json:`, e.message);
}

let totalUpdates = 0;
for (const [, pkg] of Object.entries(packages)) {
	let updated = false;
	for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
		if (!pkg.data[section]) continue;
		for (const [depName, currentVersion] of Object.entries(pkg.data[section])) {
			if (!depName.startsWith(PREFIX)) continue;
			if (!versionMap[depName]) continue;
			const newVersion = `^${versionMap[depName]}`;
			if (currentVersion !== newVersion) {
				console.log(`\n${pkg.data.name}:`);
				console.log(`  ${depName}: ${currentVersion} → ${newVersion} (${section})`);
				pkg.data[section][depName] = newVersion;
				updated = true;
				totalUpdates++;
			}
		}
	}
	if (updated) {
		writeFileSync(pkg.path, JSON.stringify(pkg.data, null, 2) + '\n');
	}
}

if (totalUpdates === 0) {
	console.log('\nAll inter-package dependencies already in sync.');
} else {
	console.log(`\n✅ Updated ${totalUpdates} dependency version(s)`);
}
