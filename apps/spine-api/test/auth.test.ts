/**
 * Bearer authn on the HTTP surface: missing/wrong token → 401 envelope;
 * the bootstrap admin token resolves to an admin actor context.
 */
import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createMemoryEngine } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'test-admin-token';

async function makeApp(): Promise<FastifyInstance> {
  return buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
}

describe('spine-api authn', () => {
  it('healthz is open', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('no token → 401 envelope', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/rpc/whoami', payload: {} });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { ok: boolean; error: { name: string } };
    expect(body.ok).toBe(false);
    expect(body.error.name).toBe('Error');
  });

  it('wrong token → 401 envelope', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/rpc/whoami',
      payload: {},
      headers: { authorization: 'Bearer definitely-not-issued' },
    });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { ok: boolean }).ok).toBe(false);
  });

  it('admin token → whoami resolves an admin context', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/rpc/whoami',
      payload: {},
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, result: { actorId: 'admin', isAdmin: true } });
  });

  it('unknown command → 404 envelope (authenticated)', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/rpc/definitely_not_a_command',
      payload: {},
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { ok: boolean }).ok).toBe(false);
  });

  it('issued tokens survive a TokenStore restart when persisted', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const persistPath = join(mkdtempSync(join(tmpdir(), 'oahs-tokens-')), 'tokens.json');

    const first = new TokenStore({ persistPath });
    const token = first.issue('actor_x');
    const second = new TokenStore({ persistPath });
    expect(second.resolve(token)).toEqual({ actorId: 'actor_x', isAdmin: false });
    expect(second.resolve('unknown')).toBeNull();
  });
});
