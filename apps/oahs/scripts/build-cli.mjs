// Bundles the oahs CLI to a runnable ESM binary (same strategy as
// packages/db/scripts/build-worker.mjs): all @oahs/* TypeScript is compiled
// INTO the bundle (aliased to the live monorepo sources, so the binary never
// depends on a stale node_modules snapshot and every @oahs class exists
// exactly once); plain-JS runtime packages stay external and resolve from
// apps/oahs/node_modules.
//
// Two artifacts:
//   bin/oahs.mjs    — the CLI (shebang via banner, chmod +x)
//   dist/worker.mjs — the @oahs/db synckit worker. @oahs/db resolves it as
//                     join(dirname(import.meta.url), '..', 'dist', 'worker.mjs');
//                     bundled into bin/oahs.mjs that is apps/oahs/dist/, so the
//                     durable engine works from the binary too.
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chmodSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url))); // apps/oahs
const mono = dirname(dirname(root)); // repo root

const alias = {
  '@oahs/core': join(mono, 'packages/core/src/index.ts'),
  '@oahs/contracts': join(mono, 'packages/contracts/src/index.ts'),
  '@oahs/db': join(mono, 'packages/db/src/index.ts'),
  '@oahs/runner': join(mono, 'packages/runner/src/index.ts'),
  '@oahs/spine-api': join(mono, 'apps/spine-api/src/index.ts'),
};

// Plain-JS runtime deps (external => resolved from apps/oahs/node_modules).
const external = [
  'commander',
  'fastify',
  'zod',
  'yaml',
  'synckit',
  'drizzle-orm',
  '@electric-sql/pglite',
  '@modelcontextprotocol/sdk',
  'postgres',
];

// `yaml` ships a CJS dist that calls require() dynamically; esbuild's ESM
// output has no `require`, so provide a createRequire-backed one (same shim
// as the db worker bundle).
const requireShim =
  "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);";

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  alias,
  external,
  sourcemap: 'inline',
};

const binPath = join(root, 'bin/oahs.mjs');

await build({
  ...shared,
  entryPoints: [join(root, 'src/cli.ts')],
  outfile: binPath,
  banner: { js: `#!/usr/bin/env node\n${requireShim}` },
});
chmodSync(binPath, 0o755);

await build({
  ...shared,
  entryPoints: [join(mono, 'packages/db/src/worker.ts')],
  outfile: join(root, 'dist/worker.mjs'),
  banner: { js: requireShim },
});

// The web UI (apps/spine-api/public, built by its build-ui.mjs) is resolved
// by src/ui.ts as <bundle dir>/../public — for bin/oahs.mjs that is
// apps/oahs/public. Build it (if the script exists) and copy it alongside.
const spineApi = join(mono, 'apps/spine-api');
const buildUiScript = join(spineApi, 'scripts/build-ui.mjs');
if (existsSync(buildUiScript)) {
  execFileSync('node', [buildUiScript], { stdio: 'inherit' });
  const uiSrc = join(spineApi, 'public');
  const uiDest = join(root, 'public');
  mkdirSync(uiDest, { recursive: true });
  cpSync(uiSrc, uiDest, { recursive: true });
}

console.log('cli bundled -> bin/oahs.mjs (+ dist/worker.mjs + public/ ui)');
