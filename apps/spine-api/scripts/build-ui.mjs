/**
 * Bundle the static chat UI (ui-src/) into public/ with esbuild.
 *
 * Zero-framework by design (D3): ui-src/app.ts is plain DOM code, bundled to
 * one IIFE file; index.html and app.css are copied verbatim. The server never
 * gains new logic from this step — public/ is served as three static files.
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'ui-src');
const outDir = join(root, 'public');

mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(srcDir, 'app.ts')],
  outfile: join(outDir, 'app.js'),
  bundle: true,
  format: 'iife',
  target: 'es2022',
  sourcemap: false,
  minify: false,
});

copyFileSync(join(srcDir, 'index.html'), join(outDir, 'index.html'));
copyFileSync(join(srcDir, 'app.css'), join(outDir, 'app.css'));

console.log('ui built -> public/ (app.js, app.css, index.html)');
