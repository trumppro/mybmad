/**
 * GET /ui — the static chat UI (D3). Three files out of public/ (built by
 * scripts/build-ui.mjs), served with plain readFileSync — no @fastify/static
 * dependency for three files, and NO new server logic: the UI talks to the
 * same /rpc/* + /events/stream surfaces as every other client, authenticated
 * by the bearer token the user pastes in. The static routes themselves are
 * unauthenticated on purpose (login happens in-app).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export function registerUiRoutes(app: FastifyInstance): void {
  const serve = (routePath: string, fileName: string, ext: string): void => {
    app.get(routePath, (_request, reply) => {
      try {
        // Read per request: three small files, and a rebuilt bundle is picked
        // up without a server restart.
        const content = readFileSync(join(publicDir, fileName));
        void reply.type(CONTENT_TYPES[ext] ?? 'application/octet-stream').send(content);
      } catch {
        void reply.code(404).send({
          ok: false,
          error: { name: 'Error', message: `ui asset not built: ${fileName} (run pnpm build:ui)` },
        });
      }
    });
  };

  serve('/ui', 'index.html', '.html');
  serve('/ui/app.js', 'app.js', '.js');
  serve('/ui/app.css', 'app.css', '.css');
}
