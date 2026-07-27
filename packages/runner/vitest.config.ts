import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // 0.3 turned the spine's request logger on by default. These suites build dozens
    // of in-process servers; without this, every assertion is buried in JSON lines.
    env: { OAHS_LOG: 'silent' },
    include: ['test/**/*.test.ts'],
    // E2E: real git plumbing + an in-process spine-api + spawned fake agents.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
