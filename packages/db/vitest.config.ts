import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Story 11 acceptance: the UNMODIFIED @oahs/core conformance suite runs
 * against the Postgres engine. The include path points straight at the core
 * test files; setup-pg.ts swaps the engine factory before they load.
 */
export default defineConfig({
  resolve: {
    alias: {
      // ONE module instance for @oahs/core, always. Node ≥22.18 strips types
      // natively, so without the alias vitest externalizes '@oahs/core'
      // (main: src/index.ts) to a NATIVE ESM instance while the core tests
      // import '../src/index.js' through Vite — two instances, meaning
      // setEngineFactory() in setup-pg.ts never reaches the suite and error
      // classes fail instanceof across the boundary.
      '@oahs/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['../core/test/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup-pg.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
