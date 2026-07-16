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

  it('admin token → whoami resolves an admin context backed by a REAL actor (Phase 2 bootstrap)', async () => {
    const engine = createMemoryEngine();
    const app = await buildServer({ engine, tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
    const res = await app.inject({
      method: 'POST',
      url: '/rpc/whoami',
      payload: {},
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; result: { actorId: string; isAdmin: boolean } };
    expect(body.ok).toBe(true);
    expect(body.result.isAdmin).toBe(true);
    // Phase 2 (roadmap §3): the admin token acts as the bootstrap
    // 'Workspace Admin' actor holding governance role 'admin'.
    expect(engine.getGovernanceRole(body.result.actorId)).toBe('admin');
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

describe('credential-plane audit (roadmap §8)', () => {
  async function post(
    app: FastifyInstance,
    command: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; result: Record<string, any> }> {
    const res = await app.inject({
      method: 'POST',
      url: `/rpc/${command}`,
      payload,
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    return res.json() as { ok: boolean; result: Record<string, any> };
  }

  it('create_actor appends token.issued: system-authored, hash prefix only, never the token', async () => {
    const engine = createMemoryEngine();
    const app = await buildServer({ engine, tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
    const systemId = (engine as unknown as { systemActorId: string }).systemActorId;

    const created = await post(app, 'create_actor', { type: 'user', displayName: 'Auditee' });
    const actorId = created.result.actor.id as string;
    const token = created.result.token as string;

    const issued = engine.events(actorId).filter((e) => e.type === 'token.issued');
    expect(issued).toHaveLength(1);
    expect(issued[0]!.actorId).toBe(systemId); // system-authored, not the caller
    expect(issued[0]!.payload['tokenHashPrefix'] as string).toMatch(/^[0-9a-f]{8}$/);
    // the raw token appears in NO event payload
    expect(JSON.stringify(engine.events())).not.toContain(token);
  });

  it('reissue_token appends token.reissued; list_tokens (a read) appends nothing', async () => {
    const engine = createMemoryEngine();
    const app = await buildServer({ engine, tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
    const created = await post(app, 'create_actor', { type: 'agent', displayName: 'Rotatee' });
    const actorId = created.result.actor.id as string;

    const reissued = await post(app, 'reissue_token', { actorId });
    const events = engine.events(actorId).filter((e) => e.type === 'token.reissued');
    expect(events).toHaveLength(1);
    expect(events[0]!.payload['tokenHashPrefix'] as string).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(engine.events())).not.toContain(reissued.result.token);

    const before = engine.events().length;
    await post(app, 'list_tokens', {});
    expect(engine.events().length).toBe(before);
  });
});
