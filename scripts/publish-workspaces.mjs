#!/usr/bin/env node

import { execFileSync } from 'child_process';

import { getWorkspacePackages } from './workspace-packages.mjs';

// Deliberately empty. @medicine-wheel/mcp used to be excluded here because it carries its
// own MAJOR — but a different version LINE is not a reason to skip a package at release
// time, and skipping it silently is how a release ships everything except the fix. That
// happened 2026-08-02: `npm run publish:all` pushed 27 packages to 0.5.6 while mcp stayed
// at 4.5.5 holding the search_nodes repair, and the gap was only found by reading the
// registry by hand afterwards. mcp's major is preserved by bump-versions.mjs
// (TRACKED_PACKAGES); publishing it belongs here with everything else.
const INDEPENDENT_PACKAGES = new Set();
const dryRun = process.argv.includes('--dry-run');

const workspaces = getWorkspacePackages().filter(
	(workspace) => !INDEPENDENT_PACKAGES.has(workspace.packageName),
);

if (workspaces.length === 0) {
	console.log('No publishable lockstep workspaces found.');
	process.exit(0);
}

for (const workspace of workspaces) {
	const args = ['publish', '--workspace', workspace.workspacePath, '--access', 'public'];
	if (dryRun) args.push('--dry-run');

	console.log(`\n📦 Publishing ${workspace.packageName}${dryRun ? ' (dry-run)' : ''}`);
	execFileSync('npm', args, { stdio: 'inherit' });
}
