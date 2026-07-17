/**
 * GET /version — "which binary am I talking to?"
 *
 * Unauthenticated by design, like /healthz: this is build metadata, not spine
 * state. It exists because PR 10.4 shipped cross-machine claim adoption, so an
 * operator debugging a claim can now be looking at two different binaries and had
 * no way to ask either one what it was.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import { OAHS_SCHEMA_VERSION, OAHS_VERSION } from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let baseUrl: string;

beforeAll(async () => {
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: 'version-api-admin-token',
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await app.close();
});

describe('GET /version', () => {
  it('reports the binary version and schema version without a token', async () => {
    const res = await fetch(`${baseUrl}/version`);
    expect(res.ok).toBe(true);
    expect(await res.json()).toEqual({
      version: OAHS_VERSION,
      schemaVersion: OAHS_SCHEMA_VERSION,
    });
  });

  it('leaves /healthz alone', async () => {
    // The Docker HEALTHCHECK tests this response's ok-ness and nothing else.
    // /version is separate precisely so a liveness probe cannot start failing
    // because build metadata changed shape.
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.ok).toBe(true);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('exposes no spine state — only the two build fields', async () => {
    const body = (await (await fetch(`${baseUrl}/version`)).json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['schemaVersion', 'version']);
  });
});
