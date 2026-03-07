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
};
export default nextConfig;
