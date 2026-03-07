import { execSync } from 'child_process';
import { resolve } from 'path';

const ontologyCoreDir = resolve('/vercel/share/v0-project/src/ontology-core');

console.log('Building medicine-wheel-ontology-core...');

try {
  execSync('npx tsc', {
    cwd: ontologyCoreDir,
    stdio: 'inherit'
  });
  console.log('✓ Successfully built medicine-wheel-ontology-core');
} catch (error) {
  console.error('✗ Failed to build medicine-wheel-ontology-core');
  process.exit(1);
}
