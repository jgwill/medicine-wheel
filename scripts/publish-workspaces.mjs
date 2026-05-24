#!/usr/bin/env node

import { execFileSync } from 'child_process';

import { getWorkspacePackages } from './workspace-packages.mjs';

const INDEPENDENT_PACKAGES = new Set(['@medicine-wheel/mcp']);
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
