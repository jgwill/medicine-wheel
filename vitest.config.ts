import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // `@/` is `tsconfig.json`'s path alias, which Next.js resolves at build
      // time and Vitest does not. Without it, a route that imports shared app
      // code type-checks, builds, serves — and fails only under test, with
      // "Cannot find package '@/lib/...'". The route is fine; the test harness
      // was resolving modules by different rules than the thing it tests.
      //
      // Added 2026-09-03 when `app/api/nodes/route.ts` first imported from
      // `lib/`. The alternative — relative imports in routes — makes the test
      // harness dictate the shape of application code, which is backwards.
      // Resolved from the project root, which is where Vitest loads this config
      // and what `test.root` defaults to. `import.meta.url` would be the more
      // obvious spelling and makes Vite warn that the file uses ESM syntax while
      // being loaded as CommonJS.
      '@': resolve(process.cwd()),
    },
  },
  test: {
    include: ['mcp/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 15000,
    // The MCP store writes over HTTP whenever MW_API_URL is set (mcp/src/store.ts).
    // A shell that exports it for daily work turned `npx vitest run` into writes
    // on the live chronicle wheel: six test ceremonies on 2026-09-24 (#146).
    // Tests use the local JSONL store, whatever the shell says.
    env: { MW_API_URL: '' },
  },
});
