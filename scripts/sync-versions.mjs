#!/usr/bin/env node

/**
 * Syncs internal workspace dependency versions to match the current workspace
 * versions. Enforces lockstep versioning across the published packages and does
 * not assume a specific npm naming scheme, so legacy and scoped names both work.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { getWorkspacePackages } from './workspace-packages.mjs';

const workspacePackages = getWorkspacePackages();
const packages = {};
const versionMap = {};

for (const workspace of workspacePackages) {
	packages[workspace.dirName] = { path: workspace.packagePath, data: workspace.data };
	versionMap[workspace.packageName] = workspace.version;
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

const workspaceNames = new Set(workspacePackages.map((workspace) => workspace.packageName));

let totalUpdates = 0;
for (const [, pkg] of Object.entries(packages)) {
	let updated = false;
	for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
		if (!pkg.data[section]) continue;
		for (const [depName, currentVersion] of Object.entries(pkg.data[section])) {
			if (!workspaceNames.has(depName)) continue;
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
