import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['mcp/tests/**/*.test.ts'],
    testTimeout: 15000,
  },
});
