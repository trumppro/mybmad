/**
 * D3 — static chat UI serving. The UI is three files out of public/ (built by
 * scripts/build-ui.mjs): the server only does static serving here — no new
 * write surface, no auth on the shell (login happens in-app via the bearer
 * token against /rpc/*). Browser behavior itself is verified by eye, not here.
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createMemoryEngine } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let app: FastifyInstance;

beforeAll(async () => {
  // `pnpm test` builds via pretest; a bare `vitest run` still gets a bundle.
  if (!existsSync(join(root, 'public', 'app.js'))) {
    execFileSync(process.execPath, [join(root, 'scripts', 'build-ui.mjs')], { stdio: 'inherit' });
  }
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: 'ui-admin-token',
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /ui (static shell)', () => {
  it('serves the HTML shell referencing the bundle — no auth required', async () => {
    const response = await app.inject({ method: 'GET', url: '/ui' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('/ui/app.js');
    expect(response.body).toContain('/ui/app.css');
  });

  it('serves the bundled app.js (talks to /rpc/* and the SSE relay only)', async () => {
    const response = await app.inject({ method: 'GET', url: '/ui/app.js' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
    // The bundle drives the SAME rails as every client: RPC + event stream.
    expect(response.body).toContain('/rpc/');
    expect(response.body).toContain('/events/stream');
  });

  it('serves app.css', async () => {
    const response = await app.inject({ method: 'GET', url: '/ui/app.css' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/css');
    // System narration must render visibly different (§5.2 rails → chat).
    expect(response.body).toContain('.msg.system');
  });
});
