#!/usr/bin/env node

/**
 * Bumps the version for all lockstep workspace packages.
 *
 * TRACKED packages keep their own MAJOR and follow the suite's minor.patch.
 * @medicine-wheel/mcp is on a 4.x line, so a suite at 0.5.6 means mcp 4.5.6. It used to
 * be excluded outright, which meant a release could ship every package EXCEPT the one
 * carrying the fix — that happened on 2026-08-02: the suite went to 0.5.6 while mcp sat
 * at 4.5.5 holding the search_nodes repair, and nobody noticed until the registry was
 * checked by hand. Tracking it here removes the chance to forget.
 *
 * Usage:  node scripts/bump-versions.mjs patch|minor|major
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

import { getWorkspacePackages } from './workspace-packages.mjs';

/**
 * Packages that keep their own MAJOR but follow the suite's minor and patch.
 * Key is the package name; value is the workspace path.
 */
const TRACKED_PACKAGES = new Map([['@medicine-wheel/mcp', 'mcp']]);

// Packages that opt out of versioning entirely. Empty on purpose — anything here can be
// forgotten at release time, which is exactly the failure this file now guards.
const INDEPENDENT_PACKAGES = new Set();

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
	console.error('Usage: node scripts/bump-versions.mjs patch|minor|major');
	process.exit(1);
}

const all = getWorkspacePackages();
const workspaces = all.filter(
	(w) => !INDEPENDENT_PACKAGES.has(w.packageName) && !TRACKED_PACKAGES.has(w.packageName),
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

// Tracked packages: keep their MAJOR, take the suite's minor.patch.
//
// Read the suite version from a package that was definitely just bumped — NOT from the
// root manifest. The root is not bumped by the `npm version --workspace` call above; it
// moves later, so reading it here yields the PREVIOUS version and the tracked package
// silently lands one patch behind. That bug shipped once (mcp stayed at 4.5.6 while the
// suite went to 0.5.7) and was caught only because the value was printed.
const suite = JSON.parse(
	readFileSync(path.join(workspaces[0].workspacePath, 'package.json'), 'utf8'),
).version;
const [, suiteMinor, suitePatch] = suite.split('.');

for (const [packageName, workspacePath] of TRACKED_PACKAGES) {
	const manifestPath = path.join(workspacePath, 'package.json');
	let current;
	try {
		current = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
	} catch {
		console.warn(`⚠️  ${packageName}: no manifest at ${manifestPath} — skipped`);
		continue;
	}
	const major = current.split('.')[0];
	const target = `${major}.${suiteMinor}.${suitePatch}`;
	if (target === current) {
		console.log(`\n${packageName} already at ${target}`);
		continue;
	}
	console.log(`\nTracking ${packageName}: ${current} → ${target} (suite ${suite})`);
	execSync(`npm version ${target} --workspace ${workspacePath} --no-git-tag-version`, {
		stdio: 'inherit',
	});
}
