import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const root = '/vercel/share/v0-project';

const packages = [
  'src/ontology-core',
  'src/ceremony-protocol',
  'src/narrative-engine',
  'src/graph-viz',
  'src/relational-query',
  'src/prompt-decomposition',
  'src/ui-components',
  'src/data-store',
  'src/session-reader',
];

for (const pkg of packages) {
  const dir = resolve(root, pkg);
  const tsconfig = resolve(dir, 'tsconfig.json');
  if (!existsSync(tsconfig)) {
    console.log(`[v0] Skipping ${pkg} — no tsconfig.json`);
    continue;
  }
  console.log(`[v0] Building ${pkg}...`);
  try {
    execSync(`npx tsc --skipLibCheck`, { cwd: dir, stdio: 'inherit' });
    console.log(`[v0] Built ${pkg} successfully`);
  } catch (e) {
    console.log(`[v0] Warning: ${pkg} had TypeScript errors but continuing...`);
  }
}

console.log('[v0] All packages processed.');
