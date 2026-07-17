/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    if (dev) {
      // The JSONL store lives at .mw/store/ inside the repo — every API write
      // lands there. Keep it out of the dev watcher or each write recompiles.
      // (webpack allows one RegExp OR an array of globs; Next's default is a
      // RegExp over node_modules/.git/.next, so restate those as globs.)
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/.mw/**',
        ],
      };
    }
    return config;
  },
};
export default nextConfig;
