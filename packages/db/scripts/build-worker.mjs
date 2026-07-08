// Bundles the synckit worker to plain ESM. @oahs/core is TypeScript with no
// build step, so it gets compiled INTO the bundle; runtime packages stay
// external and resolve from packages/db/node_modules.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await build({
  entryPoints: [join(root, 'src/worker.ts')],
  outfile: join(root, 'dist/worker.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['@electric-sql/pglite', 'drizzle-orm', 'synckit', 'postgres'],
  sourcemap: 'inline',
  // @oahs/core pulls in `yaml` (CJS dist) which calls require() dynamically;
  // esbuild's ESM output has no `require` — without this shim the worker
  // module throws AT LOAD and the parent thread blocks forever in
  // Atomics.wait. The banner provides a real createRequire-backed require.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
});
console.log('worker bundled -> dist/worker.mjs');
