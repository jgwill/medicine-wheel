#!/usr/bin/env node

/**
 * Syncs internal workspace dependency versions to match the current workspace
 * versions. Enforces lockstep versioning across the published packages and does
 * not assume a specific npm naming scheme, so legacy and scoped names both work.
 *
 * Packages listed in INDEPENDENT_PACKAGES manage their own version line and are
 * excluded from the lockstep check. Their inter-package dependency references are
 * still updated to point at their current version so other packages stay
 * compatible.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { getWorkspacePackages } from './workspace-packages.mjs';

// Packages that manage their own version independently (e.g. mcp is at 4.x
// while the rest of the monorepo is at 0.x). They are excluded from the
// lockstep version check but their dependency references are still synced.
const INDEPENDENT_PACKAGES = new Set(['@medicine-wheel/mcp']);

const workspacePackages = getWorkspacePackages();
const packages = {};
const versionMap = {};

for (const workspace of workspacePackages) {
	packages[workspace.dirName] = { path: workspace.packagePath, data: workspace.data };
	versionMap[workspace.packageName] = workspace.version;
}

// Split into lockstep and independent sets for reporting.
const lockstepEntries = Object.entries(versionMap).filter(([name]) => !INDEPENDENT_PACKAGES.has(name));
const independentEntries = Object.entries(versionMap).filter(([name]) => INDEPENDENT_PACKAGES.has(name));

console.log('Lockstep versions:');
for (const [name, version] of lockstepEntries.sort()) {
	console.log(`  ${name}: ${version}`);
}
if (independentEntries.length) {
	console.log('\nIndependently versioned (excluded from lockstep check):');
	for (const [name, version] of independentEntries.sort()) {
		console.log(`  ${name}: ${version}`);
	}
}

const lockstepVersions = new Set(lockstepEntries.map(([, v]) => v));
if (lockstepVersions.size > 1) {
	console.error('\n❌ ERROR: Not all lockstep packages have the same version!');
	console.error('Expected lockstep versioning. Run one of:');
	console.error('  npm run version:patch');
	console.error('  npm run version:minor');
	console.error('  npm run version:major');
	process.exit(1);
}

console.log('\n✅ All lockstep packages at same version');

const rootPkgPath = join(process.cwd(), 'package.json');
const [lockstepVersion] = lockstepVersions;
try {
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
	packages['__root__'] = { path: rootPkgPath, data: rootPkg };

	// Keep root version aligned with workspace lockstep version
	if (rootPkg.version !== lockstepVersion) {
		console.log(`\nRoot package version: ${rootPkg.version} → ${lockstepVersion}`);
		rootPkg.version = lockstepVersion;
		// will be written below in the dependency-sync loop
	}
} catch (e) {
	console.error(`Failed to read root package.json:`, e.message);
}

const workspaceNames = new Set(workspacePackages.map((workspace) => workspace.packageName));

let totalUpdates = 0;
for (const [, pkg] of Object.entries(packages)) {
	let updated = false;
	// Only enforce lockstep version for non-independent packages.
	if (!INDEPENDENT_PACKAGES.has(pkg.data.name) && pkg.data.version !== lockstepVersion) {
		console.log(`\n${pkg.data.name}:`);
		console.log(`  version: ${pkg.data.version} → ${lockstepVersion}`);
		pkg.data.version = lockstepVersion;
		updated = true;
		totalUpdates++;
	}
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
