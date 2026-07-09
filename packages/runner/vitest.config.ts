import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    // E2E: real git plumbing + an in-process spine-api + spawned fake agents.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
