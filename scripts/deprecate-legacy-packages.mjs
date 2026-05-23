#!/usr/bin/env node

import { execFileSync } from 'child_process';

import { getWorkspacePackages } from './workspace-packages.mjs';

const isDryRun = process.argv.includes('--dry-run');
const legacyPackages = getWorkspacePackages().filter((workspace) => workspace.isLegacyPackage);

if (legacyPackages.length === 0) {
	console.log('No legacy package names found to deprecate.');
	process.exit(0);
}

for (const workspace of legacyPackages) {
	const spec = `${workspace.packageName}@${workspace.version}`;
	const message = `Package renamed to ${workspace.nextScopedName}. Install ${workspace.nextScopedName} instead.`;

	if (isDryRun) {
		console.log(`npm deprecate ${spec} "${message}"`);
		continue;
	}

	console.log(`Deprecating ${spec} -> ${workspace.nextScopedName}`);
	execFileSync('npm', ['deprecate', spec, message], { stdio: 'inherit' });
}
