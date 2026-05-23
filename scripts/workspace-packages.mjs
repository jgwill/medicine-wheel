import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

export function getWorkspacePackages(rootDir = process.cwd()) {
	const rootPackagePath = join(rootDir, 'package.json');
	const rootPackage = readJson(rootPackagePath);
	const workspaces = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];

	return workspaces
		.map((workspacePath) => {
			const packagePath = join(rootDir, workspacePath, 'package.json');
			if (!existsSync(packagePath)) {
				throw new Error(`Workspace package.json not found: ${workspacePath}`);
			}

			const pkg = readJson(packagePath);
			const dirName = workspacePath.split('/').at(-1);

			return {
				dirName,
				workspacePath,
				packagePath,
				packageName: pkg.name,
				version: pkg.version,
				data: pkg,
				nextScopedName: `@medicine-wheel/${dirName}`,
				isLegacyPackage: !pkg.name.startsWith('@medicine-wheel/'),
			};
		})
		.sort((a, b) => a.workspacePath.localeCompare(b.workspacePath));
}
