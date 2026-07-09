/**
 * Phase 2 entitlements through the CLI command functions (roadmap §3),
 * against a REAL in-process spine-api — same pattern as cli-e2e.test.ts:
 * role assign → the previously denied reviewer approves to done; role list
 * and the authz trace render readably; plan set by a non-admin is denied by
 * the ENGINE (403 over the wire → exit 1); actor create --governance-role
 * mints a new gated-write authority.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type Claim, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import {
  actorCreateCommand,
  approveCommand,
  authzCommand,
  gatePolicySetCommand,
  governanceSetCommand,
  grantCommand,
  planSetCommand,
  policySetCommand,
  roleAssignCommand,
  roleListCommand,
  roleRevokeCommand,
  runToOutput,
} from '../src/commands/index.js';

const ADMIN_TOKEN = 'entitlements-cli-admin-token';

function extract(text: string, key: string): string {
  const match = new RegExp(`^${key}: (.+)$`, 'm').exec(text);
  if (!match || match[1] === undefined) throw new Error(`no "${key}:" line in:\n${text}`);
  return match[1];
}

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let reviewer: OahsClient;
let poId: string;
let reviewerId: string;
let featureId: string;

async function bootstrapActor(
  type: 'user' | 'agent',
  name: string,
): Promise<{ id: string; client: OahsClient }> {
  const out = await actorCreateCommand(admin, { type, name });
  return { id: extract(out, 'actorId'), client: makeClient({ baseUrl, token: extract(out, 'token') }) };
}

/** Drive a fresh story (no spec checkpoint) to in_review with approvable evidence. */
async function itemInReview(key: string): Promise<Claim> {
  await po.call('import_stories', {
    featureId,
    yaml: `- id: "${key}"\n  title: CLI fixture ${key}\n  description: fixture\n`,
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
      payload: { baseline: 'b0', final: 'f1', filesChanged: 1, nonEmpty: true, branch: `claim-${claim.id}` },
    },
  });
  await dev.call('advance_state', { workItemId: key, to: 'in_review', fencingToken: claim.fencingToken });
  await dev.call('submit_evidence', {
    workItemId: key,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'f1', branch: `claim-${claim.id}`, reachableOnRemote: true } },
  });
  return claim;
}

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

  const poBoot = await bootstrapActor('user', 'PO');
  poId = poBoot.id;
  po = poBoot.client;
  const devBoot = await bootstrapActor('agent', 'Dev Agent');
  dev = devBoot.client;
  const reviewerBoot = await bootstrapActor('user', 'Role Reviewer');
  reviewerId = reviewerBoot.id;
  reviewer = reviewerBoot.client;

  for (const [actorId, permission] of [
    [poId, 'task.plan'],
    [devBoot.id, 'task.claim'],
    [devBoot.id, 'task.advance'],
  ] as const) {
    await grantCommand(admin, { actorId, permission });
  }
  featureId = (await po.call<Feature>('create_feature')).id;
});

afterAll(async () => {
  await app.close();
});

describe('oahs entitlements commands against a live spine-api', () => {
  it('role assign → the previously denied reviewer approves to done', async () => {
    await itemInReview('c1');

    const denied = await runToOutput(() =>
      approveCommand(reviewer, { workItemId: 'c1', gate: 'review_approval' }),
    );
    expect(denied.exitCode).toBe(1);
    expect(denied.text).toMatch(/^PermissionDeniedError: /);

    expect(await roleAssignCommand(admin, { actorId: reviewerId, roleCode: 'reviewer' })).toBe(
      `assigned role reviewer to ${reviewerId}`,
    );

    const out = await approveCommand(reviewer, { workItemId: 'c1', gate: 'review_approval' });
    expect(out).toContain('state: done');
  });

  it('role list renders the assignment table (all and per-actor)', async () => {
    const all = await roleListCommand(admin);
    expect(all).toMatch(new RegExp(`${reviewerId} {2,}reviewer {2,}actor_\\w+ {2,}false`));
    const scoped = await roleListCommand(admin, { actorId: poId });
    expect(scoped).toBe('(empty)');
  });

  it('authz prints the replayable trace: ALLOWED via role:reviewer with version tuple', async () => {
    const out = await authzCommand(admin, { actorId: reviewerId, permission: 'gate.review.approve' });
    expect(out).toContain(`authz gate.review.approve for ${reviewerId}: ALLOWED`);
    expect(out).toContain('source: role:reviewer');
    expect(out).toContain('governanceRole: member');
    expect(out).toContain('plan: enterprise (planAllows: true)');
    expect(out).toContain('policyAllows: true');
    expect(out).toMatch(/versions: plan v\d+, policy v\d+/);
  });

  it('role revoke → authz flips to DENIED with no source', async () => {
    await roleRevokeCommand(admin, { actorId: reviewerId, roleCode: 'reviewer' });
    const out = await authzCommand(admin, { actorId: reviewerId, permission: 'gate.review.approve' });
    expect(out).toContain('DENIED');
    expect(out).toContain('source: (no grant — direct or via role)');
  });

  it('plan set by a non-admin actor → PermissionDeniedError, exit 1 (engine-gated, not bus-gated)', async () => {
    const out = await runToOutput(() => planSetCommand(po, { plan: 'free' }));
    expect(out.exitCode).toBe(1);
    expect(out.text).toMatch(/^PermissionDeniedError: /);
    // Local validation catches junk before it ever crosses the wire.
    const invalid = await runToOutput(() => planSetCommand(admin, { plan: 'platinum' }));
    expect(invalid.exitCode).toBe(1);
    expect(invalid.text).toContain('invalid plan "platinum"');
  });

  it('actor create --governance-role admin mints a gated-write authority; governance set promotes', async () => {
    const out = await actorCreateCommand(admin, {
      type: 'user',
      name: 'Second Admin',
      governanceRole: 'admin',
    });
    const secondAdmin = makeClient({ baseUrl, token: extract(out, 'token') });
    expect(await planSetCommand(secondAdmin, { plan: 'enterprise' })).toContain('plan set: enterprise');

    // governance set: promote the PO, then the PO can run gated writes too.
    await governanceSetCommand(admin, { actorId: poId, role: 'admin' });
    expect(await policySetCommand(po, { agentSelfDispatch: 'true' })).toContain('agentSelfDispatch: true');
  });

  it('gate-policy set --min-approvals 2 renders the data-driven quorum; policy set validates bools', async () => {
    const out = await gatePolicySetCommand(admin, {
      gate: 'review_approval',
      minApprovals: '2',
      requireTypes: ['user'],
    });
    expect(out).toContain('gate policy set on review_approval');
    expect(out).toContain('minApprovals: 2');
    expect(out).toContain('requiredActorTypes: user');

    const badBool = await runToOutput(() => policySetCommand(admin, { agentGateApprovals: 'yes' }));
    expect(badBool.exitCode).toBe(1);
    expect(badBool.text).toContain('invalid --agent-gate-approvals');

    // Quorum is now data: one approval no longer completes a review.
    await gatePolicySetCommand(admin, { gate: 'review_approval', minApprovals: '2' });
    await roleAssignCommand(admin, { actorId: reviewerId, roleCode: 'reviewer' });
    await itemInReview('c2');
    const first = await reviewer.call<WorkItem>('approve_gate', { workItemId: 'c2', gate: 'review_approval' });
    expect(first.state).toBe('in_review'); // 1/2 recorded, no transition
  });
});
