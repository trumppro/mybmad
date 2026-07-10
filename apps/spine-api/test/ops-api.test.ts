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
