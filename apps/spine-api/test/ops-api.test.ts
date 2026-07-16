/**
 * Ops surface (Phase 7 Wave 1): the solo operator's recovery paths.
 *
 *  - list_claims: "what is being worked on right now" without knowing ids.
 *  - list_tokens (ADMIN): issued-token inventory — actor ids and counts only,
 *    NEVER a secret (the store holds sha256 hashes by design).
 *  - reissue_token (ADMIN): a lost credential no longer means a dead actor —
 *    old tokens are revoked, one fresh token comes back exactly once.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Claim, Feature } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'ops-api-admin-token';

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let baseUrl: string;
let admin: OahsClient;
let dev: OahsClient;
let devActor: Actor;
let devToken: string;
let feature: Feature;

beforeAll(async () => {
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Ops Dev',
  });
  devActor = createdDev.actor;
  devToken = createdDev.token;
  for (const permission of ['task.claim', 'task.plan', 'feature.init']) {
    await admin.call('grant_permission', { actorId: devActor.id, permission });
  }
  dev = makeClient({ baseUrl, token: devToken });

  feature = await dev.call<Feature>('create_feature');
  for (const key of ['ops-1', 'ops-2']) {
    await dev.call('create_work_item', {
      featureId: feature.id,
      externalKey: key,
      title: `ops item ${key}`,
    });
  }
});

afterAll(async () => {
  await app.close();
});

describe('list_claims — workspace-wide claims view over HTTP', () => {
  it('shows live claims across items; includeReleased brings history back', async () => {
    const claim1 = await dev.call<Claim>('claim_task', { workItemId: 'ops-1' });
    const claim2 = await dev.call<Claim>('claim_task', { workItemId: 'ops-2' });

    const live = await dev.call<Claim[]>('list_claims');
    expect(live.map((c) => c.id).sort()).toEqual([claim1.id, claim2.id].sort());

    await dev.call('release_claim', { claimId: claim1.id });
    const after = await dev.call<Claim[]>('list_claims');
    expect(after.map((c) => c.id)).toEqual([claim2.id]);

    const all = await dev.call<Claim[]>('list_claims', { includeReleased: true });
    expect(all.map((c) => c.id).sort()).toEqual([claim1.id, claim2.id].sort());
  });
});

describe('runner registry — who is polling, for which project (Wave 3)', () => {
  it('register → list shows the runner under its TOKEN actor; heartbeat bumps lastSeenAt', async () => {
    const registered = await dev.call<{ runnerId: string; lastSeenAt: number }>(
      'runner_announce',
      { mode: 'coding', projectId: 'default', repoPath: '/work/repo' },
    );
    expect(registered.runnerId).toMatch(/^rn_/);

    const listed = await admin.call<
      Array<{ runnerId: string; actorId: string; mode: string; repoPath?: string; lastSeenAt: number }>
    >('list_runners');
    const mine = listed.find((r) => r.runnerId === registered.runnerId);
    // Identity comes from the TOKEN, never the body.
    expect(mine).toMatchObject({ actorId: devActor.id, mode: 'coding', repoPath: '/work/repo' });

    const before = mine!.lastSeenAt;
    await new Promise((r) => setTimeout(r, 15));
    await dev.call('runner_heartbeat', { runnerId: registered.runnerId });
    const after = await admin.call<Array<{ runnerId: string; lastSeenAt: number }>>('list_runners');
    expect(after.find((r) => r.runnerId === registered.runnerId)!.lastSeenAt).toBeGreaterThan(
      before,
    );
  });

  it('heartbeat for an unknown runner is a clear error (restart lost the registry — re-register)', async () => {
    await expect(dev.call('runner_heartbeat', { runnerId: 'rn_ghost' })).rejects.toMatchObject({
      name: 'GuardFailedError',
    });
  });

  it('a caller without task.claim cannot register or heartbeat a runner (roadmap §8)', async () => {
    // The governance-admin bootstrap token holds no delivery grants — admin
    // status does not confer task.claim, so it cannot feed the fleet panel.
    await expect(admin.call('runner_announce', { mode: 'coding' })).rejects.toMatchObject({
      name: 'PermissionDeniedError',
      status: 403,
    });
    await expect(admin.call('runner_heartbeat', { runnerId: 'rn_whatever' })).rejects.toMatchObject({
      name: 'PermissionDeniedError',
      status: 403,
    });
  });
});

describe('token inventory + reissue — admin-only recovery rails', () => {
  it('list_tokens is admin-only and never returns a secret', async () => {
    await expect(dev.call('list_tokens')).rejects.toMatchObject({
      name: 'PermissionDeniedError',
    });

    const inventory = await admin.call<Array<{ actorId: string; tokens: number }>>('list_tokens');
    const devRow = inventory.find((row) => row.actorId === devActor.id);
    expect(devRow).toMatchObject({ actorId: devActor.id, tokens: 1 });
    // No secret material anywhere in the payload.
    expect(JSON.stringify(inventory)).not.toContain(devToken);
  });

  it('reissue_token revokes the old token and returns a fresh working one', async () => {
    await expect(dev.call('reissue_token', { actorId: devActor.id })).rejects.toMatchObject({
      name: 'PermissionDeniedError',
    });

    const reissued = await admin.call<{ actorId: string; token: string }>('reissue_token', {
      actorId: devActor.id,
    });
    expect(reissued.actorId).toBe(devActor.id);
    expect(reissued.token).not.toBe(devToken);

    // Old token is dead; the fresh one resolves to the same actor.
    await expect(dev.call('whoami')).rejects.toMatchObject({ status: 401 });
    const fresh = makeClient({ baseUrl, token: reissued.token });
    expect(await fresh.call('whoami')).toEqual({ actorId: devActor.id, isAdmin: false });
  });
});
