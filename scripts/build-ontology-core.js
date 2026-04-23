import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const ontologyCoreDir = resolve(projectRoot, 'src/ontology-core');

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
