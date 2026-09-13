#!/usr/bin/env node
/**
 * check-declared-deps — every `@medicine-wheel/*` import must be a declared dependency
 * of the package that ships the file importing it.
 *
 * Why this exists (RELEASING.md, 2026-08-02): `@medicine-wheel/app` shipped `dist/cli/orientation.js`
 * requiring `@medicine-wheel/creative-orientation`, which was not in `dependencies`. Tests, build and
 * publish were all green; every fresh `npm i -g` died with `Cannot find module`. The workspace
 * symlink hid it in the repo. The detector written after that scanned only `dist/cli` — blind to
 * `app/`, `lib/` and `components/`, which the root package also ships and which import the suite
 * just as freely (VALIDATION.md B3, 2026-09-03).
 *
 * This script scans SOURCE, not just build output, so it works on a clean checkout and in CI
 * before any `dist/` exists — and it checks every workspace package the same way, since a package
 * that imports a sibling it never declared breaks in exactly the same way once published.
 *
 *   node scripts/check-declared-deps.mjs          # exit 1 on any undeclared import
 *   node scripts/check-declared-deps.mjs --quiet  # only print failures
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

import { getWorkspacePackages } from './workspace-packages.mjs';

const ROOT = process.cwd();
const quiet = process.argv.includes('--quiet');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.git']);
const SOURCE_EXT = /\.(ts|tsx|js|mjs|cjs|jsx)$/;
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](@medicine-wheel\/[a-z0-9-]+)/g;

function* walk(dir) {
	if (!existsSync(dir)) return;
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue;
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) yield* walk(full);
		else if (SOURCE_EXT.test(name) && !name.endsWith('.d.ts') && !TEST_FILE.test(name)) yield full;
	}
}

function importsIn(files) {
	const found = new Map(); // pkg -> first file seen
	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(IMPORT_RE)) {
			if (!found.has(m[1])) found.set(m[1], relative(ROOT, file));
		}
	}
	return found;
}

function declared(pkg) {
	return new Set([
		...Object.keys(pkg.dependencies ?? {}),
		...Object.keys(pkg.peerDependencies ?? {}),
		...Object.keys(pkg.optionalDependencies ?? {}),
	]);
}

let failures = 0;

function check(label, pkg, files, selfName) {
	const used = importsIn(files);
	const decl = declared(pkg);
	const missing = [...used].filter(([name]) => name !== selfName && !decl.has(name));
	if (missing.length === 0) {
		if (!quiet) console.log(`✅ ${label} — ${used.size} @medicine-wheel import(s), all declared`);
		return;
	}
	failures += missing.length;
	console.error(`❌ ${label} — ${missing.length} undeclared @medicine-wheel import(s):`);
	for (const [name, file] of missing) console.error(`     ${name}   (first seen in ${file})`);
}

// ── root package: everything its `files` globs ship that can contain an import ──────────────
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const rootShipped = ['app', 'components', 'hooks', 'lib', 'cli'].map((d) => join(ROOT, d));
const rootFiles = rootShipped.flatMap((d) => [...walk(d)]);
// The built CLI too, when present — it is what actually gets installed.
rootFiles.push(...walk(join(ROOT, 'dist', 'cli')));
check(`${rootPkg.name} (root)`, rootPkg, rootFiles, rootPkg.name);

// ── each workspace package: its own src/ against its own manifest ───────────────────────────
for (const ws of getWorkspacePackages(ROOT)) {
	const srcDir = join(ROOT, ws.workspacePath, 'src');
	check(ws.packageName, ws.data, [...walk(srcDir)], ws.packageName);
}

if (failures) {
	console.error(
		`\n${failures} undeclared import(s). A workspace symlink resolves these here; a fresh install ` +
			`from the registry will not. Add each to the package's "dependencies" before publishing.`,
	);
	process.exit(1);
}
if (!quiet) console.log('\nAll @medicine-wheel imports are declared where they are shipped.');
