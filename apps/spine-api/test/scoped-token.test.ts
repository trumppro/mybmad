/**
 * §10.1 — job-bound scoped tokens. The credential that RUNS a claim is confined
 * to that claim and a fixed dispatch allowlist, and dies with the lease. Two
 * levels: the TokenStore expiry mechanism (unit, controlled clock), and the bus
 * enforcement end-to-end over HTTP (wall-clock leases, so nothing expires mid-test).
 */
import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Actor, Feature, WorkItem, Claim } from '@oahs/core';
import { createMemoryEngine } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN = 'test-admin-token';

// -- TokenStore unit: scope + expiry ----------------------------------------

describe('TokenStore.issueScoped / resolve expiry (§10.1)', () => {
  it('a scoped token resolves to its {actorId, claimId, allowedCommands, expiresAt} record', () => {
    const store = new TokenStore();
    const token = store.issueScoped('actor_1', {
      claimId: 'claim_1',
      workItemId: 'wi_1',
      allowedCommands: ['heartbeat', 'advance_state'],
      expiresAt: 1_000,
    });
    const r = store.resolve(token, 500);
    expect(r).toMatchObject({
      actorId: 'actor_1',
      isAdmin: false,
      claimId: 'claim_1',
      workItemId: 'wi_1',
      allowedCommands: ['heartbeat', 'advance_state'],
      expiresAt: 1_000,
    });
  });

  it('a scoped token past its expiresAt resolves to null (401-equivalent)', () => {
    const store = new TokenStore();
    const token = store.issueScoped('actor_1', { claimId: 'c', workItemId: 'w', allowedCommands: ['heartbeat'], expiresAt: 1_000 });
    expect(store.resolve(token, 999)).not.toBeNull();
    expect(store.resolve(token, 1_000)).toBeNull(); // at expiry
    expect(store.resolve(token, 1_001)).toBeNull(); // past expiry
  });

  it('an UNSCOPED token never expires (no expiresAt)', () => {
    const store = new TokenStore();
    const token = store.issue('actor_1');
    expect(store.resolve(token, Number.MAX_SAFE_INTEGER)).not.toBeNull();
  });

  it('renewScopedForClaim extends a token to the fresh lease so a long run does not lose its credential (§10.2)', () => {
    const store = new TokenStore();
    const token = store.issueScoped('actor_1', { claimId: 'c1', workItemId: 'w1', allowedCommands: ['heartbeat'], expiresAt: 1_000 });
    // Past the original expiry the token is dead...
    expect(store.resolve(token, 1_500)).toBeNull();
    // ...but a heartbeat that renewed the lease renews the token to match.
    store.renewScopedForClaim('c1', 2_000);
    expect(store.resolve(token, 1_500)).not.toBeNull();
    expect(store.resolve(token, 2_000)).toBeNull(); // still dies at the NEW expiry
    // Renewal never SHORTENS (a stale heartbeat cannot cut a run short) and only
    // touches tokens for the named claim.
    store.renewScopedForClaim('c1', 1_200);
    expect(store.resolve(token, 1_900)).not.toBeNull();
    const other = store.issueScoped('actor_2', { claimId: 'c2', workItemId: 'w2', allowedCommands: ['heartbeat'], expiresAt: 1_000 });
    store.renewScopedForClaim('c1', 9_000);
    expect(store.resolve(other, 1_500)).toBeNull(); // c2 untouched
  });
});

// -- bus enforcement end-to-end ---------------------------------------------

type App = FastifyInstance;

async function call<T>(app: App, token: string, command: string, body: unknown = {}): Promise<T> {
  const res = await app.inject({
    method: 'POST',
    url: `/rpc/${command}`,
    payload: body as object,
    headers: { authorization: `Bearer ${token}` },
  });
  const env = res.json() as { ok: boolean; result?: T; error?: { name: string; message: string } };
  if (!env.ok) throw Object.assign(new Error(env.error!.message), { errorName: env.error!.name, status: res.statusCode });
  return env.result as T;
}

async function status(app: App, token: string, command: string, body: unknown = {}): Promise<number> {
  const res = await app.inject({
    method: 'POST',
    url: `/rpc/${command}`,
    payload: body as object,
    headers: { authorization: `Bearer ${token}` },
  });
  return res.statusCode;
}

/** Set up a claimed item and return the runner's static token + a minted scoped token. */
async function setup(app: App): Promise<{ runnerToken: string; scoped: string; claim: Claim; workItemId: string }> {
  const dev = await call<{ actor: Actor; token: string }>(app, ADMIN, 'create_actor', {
    type: 'agent',
    displayName: 'Runner',
  });
  for (const permission of ['task.plan', 'task.claim', 'task.advance']) {
    await call(app, ADMIN, 'grant_permission', { actorId: dev.actor.id, permission });
  }
  const feature = await call<Feature>(app, ADMIN, 'create_feature', {});
  const item = await call<WorkItem>(app, ADMIN, 'create_work_item', {
    featureId: feature.id,
    externalKey: 't-1',
    title: 'Scoped token target',
  });
  // Static token drives to ready_for_dev then claims (§10.1: static token = poll/claim only).
  await call(app, dev.token, 'advance_state', { workItemId: item.id, to: 'draft' });
  await call(app, dev.token, 'advance_state', { workItemId: item.id, to: 'ready_for_dev' });
  const claim = await call<Claim>(app, dev.token, 'claim_task', { workItemId: item.id });
  const minted = await call<{ token: string; expiresAt: number }>(app, dev.token, 'mint_claim_token', {
    claimId: claim.id,
  });
  return { runnerToken: dev.token, scoped: minted.token, claim, workItemId: item.id };
}

describe('scoped-token bus enforcement (§10.1)', () => {
  const makeApp = (): Promise<App> =>
    buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore: new TokenStore(), adminToken: ADMIN });

  it('only the LIVE claim holder may mint a job-bound token', async () => {
    const app = await makeApp();
    const { claim } = await setup(app);
    // A different actor (the admin) cannot mint for someone else's claim.
    expect(await status(app, ADMIN, 'mint_claim_token', { claimId: claim.id })).toBe(403);
  });

  it('a scoped token may call its allowlist for its OWN claim, and its heartbeat renews its own token (§10.2)', async () => {
    const app = await makeApp();
    const store = new TokenStore();
    const app2 = await buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore: store, adminToken: ADMIN });
    const { scoped, claim } = await setup(app2);
    // heartbeat is in the allowlist and names this claim → allowed; it also
    // renews THIS scoped token to the fresh lease (§10.2), never shortening it.
    await call(app2, scoped, 'heartbeat', { claimId: claim.id, fencingToken: claim.fencingToken });
    // After the heartbeat the token's expiry EQUALS the claim's live lease — the
    // token tracks the heartbeated claim. (A frozen/unwired token would keep its
    // mint-time expiry, which lags the renewed lease, so `toBe` catches a
    // removed renewal call where `>=` would not.)
    const after = store.resolve(scoped)!.expiresAt!;
    const live = (await call<Claim[]>(app2, ADMIN, 'list_claims', {})).find((c) => c.id === claim.id)!;
    expect(after).toBe(live.leaseExpiresAt);
    // (the plain-app variant still exercises the allowlist path)
    const s2 = await setup(app);
    await call(app, s2.scoped, 'heartbeat', { claimId: s2.claim.id, fencingToken: s2.claim.fencingToken });
  });

  it('a scoped token calling a command OUTSIDE its allowlist → 403 (scope)', async () => {
    const app = await makeApp();
    const { scoped } = await setup(app);
    // list_work_items is not a dispatch mutation → denied for a scoped token.
    expect(await status(app, scoped, 'list_work_items', {})).toBe(403);
    // mint_claim_token is NOT self-callable (no minting chains).
    expect(await status(app, scoped, 'mint_claim_token', { claimId: 'anything' })).toBe(403);
  });

  it('a scoped token calling an allowed command for a DIFFERENT claim → 403 (scope:claim)', async () => {
    const app = await makeApp();
    const { scoped } = await setup(app);
    expect(await status(app, scoped, 'heartbeat', { claimId: 'some-other-claim' })).toBe(403);
  });

  it('a scoped token cannot submit_evidence / block_task to a DIFFERENT work item (scope:work_item)', async () => {
    const app = await makeApp();
    const { scoped, workItemId } = await setup(app);
    // A second, unrelated work item the scoped token must NOT be able to touch.
    const feature = await call<Feature>(app, ADMIN, 'create_feature', {});
    const victim = await call<WorkItem>(app, ADMIN, 'create_work_item', {
      featureId: feature.id,
      externalKey: 'victim-1',
      title: 'Someone else’s item',
    });
    // Cross-item evidence write (no fencing token) — the closed bypass — is 403.
    expect(
      await status(app, scoped, 'submit_evidence', {
        workItemId: victim.id,
        evidence: { kind: 'git_diff', payload: { baseline: 'a', final: 'b', filesChanged: 0, nonEmpty: false, branch: 'x' } },
      }),
    ).toBe(403);
    // Cross-item block is 403 too.
    expect(await status(app, scoped, 'block_task', { workItemId: victim.id, reason: 'other' })).toBe(403);
    // ...but submit_evidence to its OWN item is allowed.
    await call(app, scoped, 'submit_evidence', {
      workItemId,
      evidence: { kind: 'git_diff', payload: { baseline: 'a', final: 'b', filesChanged: 1, nonEmpty: true, branch: 'claim/x' } },
    });
  });

  it('the static runner token still works for poll (list_work_items) and claim', async () => {
    const app = await makeApp();
    const { runnerToken } = await setup(app);
    const items = await call<WorkItem[]>(app, runnerToken, 'list_work_items', {});
    expect(Array.isArray(items)).toBe(true);
  });
});
