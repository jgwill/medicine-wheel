import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Scripts execute from /home/user; resolve relative to the script's own location
const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');

// Discover all sub-packages dynamically
const packages = readdirSync(srcDir).filter(name => {
  const pkgJson = join(srcDir, name, 'package.json');
  const tsconfig = join(srcDir, name, 'tsconfig.json');
  return existsSync(pkgJson) && existsSync(tsconfig);
});

console.log(`[v0] Found ${packages.length} packages to build: ${packages.join(', ')}`);

for (const pkg of packages) {
  const dir = join(srcDir, pkg);
  console.log(`[v0] Building src/${pkg}...`);
  try {
    execSync(`npm run build`, { cwd: dir, stdio: 'pipe' });
    console.log(`[v0] Built src/${pkg} successfully`);
  } catch (e) {
    console.log(`[v0] Warning: src/${pkg} had errors: ${e.stderr?.toString().slice(0, 300)}`);
  }
}

console.log('[v0] All packages processed.');
