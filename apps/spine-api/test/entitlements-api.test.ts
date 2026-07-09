/**
 * Phase 2 entitlements over the rails (roadmap §3 + Build phases, Phase 2):
 * the SAME exit criterion the core suite pins, exercised end-to-end through
 * HTTP /rpc — a reviewer-agent granted rejection-loopback but not
 * done-approval: the system allows the first, denies the second (403).
 * Plus: delivery-role assignment unlocks approval, gate quorum as data
 * (minApprovals=2), the replayable authz_explain trace, and gated writes
 * denied for non-admin actors by the ENGINE (never the bus).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type SpineEngine } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import type { Actor, AuthzExplanation, Claim, Feature, RoleAssignment, WorkItem } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'entitlements-admin-token';

let engine: SpineEngine;
let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let rejectorAgent: OahsClient; // agent holding ONLY gate.review.reject
let roleUser: OahsClient; // user who will receive the reviewer delivery role
let secondReviewer: OahsClient; // user with a direct gate.review.approve grant
let poActor: Actor;
let rejectorActor: Actor;
let roleUserActor: Actor;
let secondReviewerActor: Actor;
let feature: Feature;

async function createActor(
  type: 'user' | 'agent',
  displayName: string,
): Promise<{ actor: Actor; client: OahsClient }> {
  const created = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type,
    displayName,
  });
  return { actor: created.actor, client: makeClient({ baseUrl, token: created.token }) };
}

/** Drive a fresh story (no spec checkpoint) to in_review with approvable evidence, over HTTP only. */
async function itemInReview(key: string): Promise<{ item: WorkItem; claim: Claim }> {
  await po.call('import_stories', {
    featureId: feature.id,
    yaml: `- id: "${key}"\n  title: Entitlements fixture ${key}\n  description: rails fixture\n`,
  });
  await po.call('advance_state', { workItemId: key, to: 'draft' });
  await po.call('advance_state', { workItemId: key, to: 'ready_for_dev' });
  const claim = await dev.call<Claim>('claim_task', { workItemId: key });
  await dev.call('advance_state', { workItemId: key, to: 'in_progress', fencingToken: claim.fencingToken });
  await dev.call('submit_evidence', {
    workItemId: key,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'b0', final: 'f9', filesChanged: 1, nonEmpty: true, branch: `claim-${claim.id}` },
    },
  });
  const item = await dev.call<WorkItem>('advance_state', {
    workItemId: key,
    to: 'in_review',
    fencingToken: claim.fencingToken,
  });
  await dev.call('submit_evidence', {
    workItemId: key,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'f9', branch: `claim-${claim.id}`, reachableOnRemote: true } },
  });
  return { item, claim };
}

beforeAll(async () => {
  engine = createMemoryEngine();
  app = await buildServer({ engine, tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const poCreated = await createActor('user', 'PO');
  poActor = poCreated.actor;
  po = poCreated.client;
  const devCreated = await createActor('agent', 'Dev Agent');
  dev = devCreated.client;
  const rejectorCreated = await createActor('agent', 'Reviewer Agent');
  rejectorActor = rejectorCreated.actor;
  rejectorAgent = rejectorCreated.client;
  const roleUserCreated = await createActor('user', 'Role Reviewer');
  roleUserActor = roleUserCreated.actor;
  roleUser = roleUserCreated.client;
  const secondCreated = await createActor('user', 'Second Reviewer');
  secondReviewerActor = secondCreated.actor;
  secondReviewer = secondCreated.client;

  for (const grant of [
    { actorId: poActor.id, permission: 'task.plan' },
    { actorId: devCreated.actor.id, permission: 'task.claim' },
    { actorId: devCreated.actor.id, permission: 'task.advance' },
    { actorId: rejectorActor.id, permission: 'gate.review.reject' }, // the exit-criterion grant
    { actorId: secondReviewerActor.id, permission: 'gate.review.approve' },
  ]) {
    await admin.call('grant_permission', grant);
  }

  feature = await po.call<Feature>('create_feature');
});

afterAll(async () => {
  await app.close();
});

describe('Phase 2 EXIT CRITERION over HTTP (roadmap Build phases, Phase 2)', () => {
  it('the reviewer-agent with ONLY gate.review.reject rejects via /rpc — the deterministic loopback fires', async () => {
    await itemInReview('x1');
    const rejected = await rejectorAgent.call<WorkItem>('reject_gate', {
      workItemId: 'x1',
      gate: 'review_approval',
    });
    expect(rejected.state).toBe('in_progress');
    expect(rejected.reviewLoopIteration).toBe(1);
  });

  it('…and the SAME agent approving a second item via /rpc → 403 PermissionDeniedError, state untouched', async () => {
    await itemInReview('x2');
    await expect(
      rejectorAgent.call('approve_gate', { workItemId: 'x2', gate: 'review_approval' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    const item = await admin.call<WorkItem>('get_work_item', { workItemId: 'x2' });
    expect(item.state).toBe('in_review');
  });
});

describe('delivery roles over HTTP (roadmap §3)', () => {
  it('assign_role reviewer unlocks approval for a user with no direct grants', async () => {
    // x2 is still in_review from the exit-criterion test.
    await expect(
      roleUser.call('approve_gate', { workItemId: 'x2', gate: 'review_approval' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });

    expect(
      await admin.call('assign_role', { actorId: roleUserActor.id, roleCode: 'reviewer' }),
    ).toEqual({ assigned: true });
    const assignments = await admin.call<RoleAssignment[]>('list_role_assignments', {
      actorId: roleUserActor.id,
    });
    expect(assignments.some((a) => a.roleCode === 'reviewer' && !a.revoked)).toBe(true);

    const done = await roleUser.call<WorkItem>('approve_gate', {
      workItemId: 'x2',
      gate: 'review_approval',
    });
    expect(done.state).toBe('done');
  });
});

describe('authz_explain over HTTP (roadmap §3 — replayable decision trace)', () => {
  it('explains the role-sourced allow with the policy version tuple', async () => {
    const explanation = await admin.call<AuthzExplanation>('authz_explain', {
      actorId: roleUserActor.id,
      permission: 'gate.review.approve',
    });
    expect(explanation.allowed).toBe(true);
    expect(explanation.source).toBe('role:reviewer');
    expect(explanation.plan).toBe('enterprise');
    expect(explanation.planAllows).toBe(true);
    expect(explanation.policyAllows).toBe(true);
    expect(typeof explanation.versions.plan).toBe('number');
    expect(typeof explanation.versions.policy).toBe('number');
  });

  it('explains a no-grant denial with null source', async () => {
    const denied = await admin.call<AuthzExplanation>('authz_explain', {
      actorId: poActor.id,
      permission: 'gate.review.approve',
    });
    expect(denied.allowed).toBe(false);
    expect(denied.source).toBeNull();
  });
});

describe('gated writes are decided by the ENGINE, not the bus (roadmap §3)', () => {
  it('set_plan by a non-admin actor → 403 PermissionDeniedError', async () => {
    await expect(po.call('set_plan', { plan: 'free' })).rejects.toMatchObject({
      name: 'PermissionDeniedError',
      status: 403,
    });
    // assign_role and set_workspace_policy are equally engine-gated.
    await expect(
      po.call('assign_role', { actorId: poActor.id, roleCode: 'reviewer' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    await expect(
      po.call('set_workspace_policy', { policy: { agentGateApprovals: false } }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
  });

  it('create_actor with governanceRole admin (admin ctx) mints a new gated-write authority', async () => {
    const created = await admin.call<{ actor: Actor; token: string }>('create_actor', {
      type: 'user',
      displayName: 'Second Admin',
      governanceRole: 'admin',
    });
    const secondAdmin = makeClient({ baseUrl, token: created.token });
    expect(await secondAdmin.call('set_plan', { plan: 'enterprise' })).toEqual({
      plan: 'enterprise',
    });
  });
});

describe('gate policy as data over HTTP (roadmap §3: min_approvals)', () => {
  it('minApprovals=2: the first approval records without transitioning; a second distinct approver completes', async () => {
    expect(
      await admin.call('set_gate_policy', {
        gate: 'review_approval',
        policy: { minApprovals: 2 },
      }),
    ).toEqual({ gate: 'review_approval', policy: { minApprovals: 2 } });

    await itemInReview('q1');
    const afterFirst = await roleUser.call<WorkItem>('approve_gate', {
      workItemId: 'q1',
      gate: 'review_approval',
    });
    expect(afterFirst.state).toBe('in_review'); // quorum 1/2 — decision recorded, no transition

    const afterSecond = await secondReviewer.call<WorkItem>('approve_gate', {
      workItemId: 'q1',
      gate: 'review_approval',
    });
    expect(afterSecond.state).toBe('done');
  });
});
