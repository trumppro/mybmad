import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Aliases point every @oahs/* package at its live monorepo SOURCE:
 *  - one module instance each (error classes keep instanceof identity across
 *    spine-api ↔ db ↔ core — same trap as packages/db/vitest.config.ts);
 *  - Vite transforms the TS (native node type-stripping cannot digest
 *    parameter properties in @oahs/db's PgEngine);
 *  - @oahs/db resolves its synckit worker relative to its REAL source file,
 *    so tests always run the freshly built packages/db/dist/worker.mjs.
 */
const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@oahs/core': src('../../packages/core/src/index.ts'),
      '@oahs/contracts': src('../../packages/contracts/src/index.ts'),
      '@oahs/db': src('../../packages/db/src/index.ts'),
      '@oahs/runner': src('../../packages/runner/src/index.ts'),
      '@oahs/spine-api': src('../spine-api/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
