import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: [
    'medicine-wheel-ontology-core',
    'medicine-wheel-ceremony-protocol',
    'medicine-wheel-narrative-engine',
    'medicine-wheel-graph-viz',
    'medicine-wheel-relational-query',
    'medicine-wheel-prompt-decomposition',
    'medicine-wheel-ui-components',
    'medicine-wheel-data-store',
    'medicine-wheel-session-reader',
  ],
  webpack(config) {
    // Resolve package names directly to TypeScript source files
    config.resolve.alias = {
      ...config.resolve.alias,
      'medicine-wheel-ontology-core': path.resolve(__dirname, 'src/ontology-core/src/index.ts'),
      'medicine-wheel-ceremony-protocol': path.resolve(__dirname, 'src/ceremony-protocol/src/index.ts'),
      'medicine-wheel-narrative-engine': path.resolve(__dirname, 'src/narrative-engine/src/index.ts'),
      'medicine-wheel-graph-viz': path.resolve(__dirname, 'src/graph-viz/src/index.ts'),
      'medicine-wheel-relational-query': path.resolve(__dirname, 'src/relational-query/src/index.ts'),
      'medicine-wheel-prompt-decomposition': path.resolve(__dirname, 'src/prompt-decomposition/src/index.ts'),
      'medicine-wheel-ui-components': path.resolve(__dirname, 'src/ui-components/src/index.ts'),
      'medicine-wheel-data-store': path.resolve(__dirname, 'src/data-store/src/index.ts'),
      'medicine-wheel-session-reader': path.resolve(__dirname, 'src/session-reader/src/index.ts'),
    };
    // Resolve .js extensions to .ts for ESM-style imports within packages
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};
export default nextConfig;
