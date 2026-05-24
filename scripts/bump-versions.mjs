#!/usr/bin/env node

/**
 * Bumps the version for all lockstep workspace packages, excluding packages
 * that manage their own version line (see INDEPENDENT_PACKAGES).
 *
 * Usage:  node scripts/bump-versions.mjs patch|minor|major
 */

import { execSync } from 'child_process';

import { getWorkspacePackages } from './workspace-packages.mjs';

// Must match the set in sync-versions.mjs.
const INDEPENDENT_PACKAGES = new Set(['@medicine-wheel/mcp']);

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
	console.error('Usage: node scripts/bump-versions.mjs patch|minor|major');
	process.exit(1);
}

const workspaces = getWorkspacePackages().filter(
	(w) => !INDEPENDENT_PACKAGES.has(w.packageName),
);

if (workspaces.length === 0) {
	console.error('No lockstep workspaces found.');
	process.exit(1);
}

const wsFlags = workspaces.map((w) => `--workspace ${w.workspacePath}`).join(' ');
const cmd = `npm version ${bump} ${wsFlags} --no-git-tag-version`;

console.log(`Bumping ${bump} for ${workspaces.length} lockstep workspace(s)...`);
console.log(`$ ${cmd}\n`);

execSync(cmd, { stdio: 'inherit' });
