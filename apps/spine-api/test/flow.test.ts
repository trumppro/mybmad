/**
 * Full lifecycle over plain HTTP (server.listen on port 0 + the typed
 * makeClient from contracts): admin bootstraps actors/grants, then a story
 * runs backlog → draft → (spec gate, pinning) → ready_for_dev → in_progress
 * → in_review → (evidence) → done. Negative paths assert the wire taxonomy:
 * 403 PermissionDeniedError, 409 stale fencing token, 422 empty diff.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import type { Actor, Claim, Feature, StoriesImportResult, WorkItem } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'flow-admin-token';

const STORIES_YAML = `
- id: "s1"
  title: Spec-gated story
  description: First story through the rails
  spec_checkpoint: true
- id: "s2"
  title: Plain story
  description: Second story for the negative paths
`;

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let reviewer: OahsClient;
let devActor: Actor;
let feature: Feature;
let claimS1: Claim;

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
});

afterAll(async () => {
  await app.close();
});

describe('spine-api end-to-end flow (HTTP only)', () => {
  it('admin creates PO/dev/reviewer actors and their grants', async () => {
    const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
      type: 'user',
      displayName: 'Product Owner',
    });
    const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
      type: 'agent',
      displayName: 'Dev Agent',
    });
    const createdReviewer = await admin.call<{ actor: Actor; token: string }>('create_actor', {
      type: 'user',
      displayName: 'Reviewer',
    });
    devActor = createdDev.actor;
    expect(createdPo.actor.type).toBe('user');
    expect(createdDev.actor.type).toBe('agent');
    expect(createdPo.token).toMatch(/^[0-9a-f]{64}$/);

    // Permission codes exactly as in packages/core/src/types.ts
    for (const grant of [
      { actorId: createdPo.actor.id, permission: 'task.plan' },
      { actorId: createdPo.actor.id, permission: 'gate.spec.approve' },
      { actorId: createdDev.actor.id, permission: 'task.claim' },
      { actorId: createdDev.actor.id, permission: 'task.advance' },
      { actorId: createdReviewer.actor.id, permission: 'gate.review.approve' },
    ]) {
      expect(await admin.call('grant_permission', grant)).toEqual({ granted: true });
    }

    po = makeClient({ baseUrl, token: createdPo.token });
    dev = makeClient({ baseUrl, token: createdDev.token });
    reviewer = makeClient({ baseUrl, token: createdReviewer.token });

    expect(await dev.call('whoami')).toEqual({ actorId: devActor.id, isAdmin: false });
  });

  it('grant_permission by a non-admin actor → 403 PermissionDeniedError', async () => {
    await expect(
      po.call('grant_permission', { actorId: devActor.id, permission: 'gate.review.approve' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
  });

  it('PO creates the feature and imports two stories from stories.yaml', async () => {
    feature = await po.call<Feature>('create_feature');
    expect(feature.state).toBe('backlog');
    const result = await po.call<StoriesImportResult>('import_stories', {
      featureId: feature.id,
      yaml: STORIES_YAML,
    });
    expect(result.imported).toEqual(['s1', 's2']);
    expect(result.updated).toEqual([]);
  });

  it('dev claims s1 and receives a fencing token', async () => {
    claimS1 = await dev.call<Claim>('claim_task', { workItemId: 's1' });
    expect(claimS1.fencingToken).toBe(1);
    expect(claimS1.released).toBe(false);
  });

  it('PO advances s1 to draft; spec checkpoint blocks a plain advance', async () => {
    const item = await po.call<WorkItem>('advance_state', { workItemId: 's1', to: 'draft' });
    expect(item.state).toBe('draft');
    // draft → ready_for_dev without an approved spec gate → 422 guard
    await expect(
      po.call('advance_state', { workItemId: 's1', to: 'ready_for_dev' }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });
    // the item now sits in the gate-holder inbox awaiting spec approval
    const inbox = await po.call<{ awaitingSpec: WorkItem[]; awaitingReview: WorkItem[] }>('inbox');
    expect(inbox.awaitingSpec.map((wi) => wi.externalKey)).toContain('s1');
    expect(inbox.awaitingReview).toEqual([]);
  });

  it('spec approval by an actor without the grant → 403 PermissionDeniedError', async () => {
    await expect(
      dev.call('approve_gate', { workItemId: 's1', gate: 'spec_approval' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
  });

  it('PO approves the spec gate, pinning verification commands (D7)', async () => {
    const item = await po.call<WorkItem>('approve_gate', {
      workItemId: 's1',
      gate: 'spec_approval',
      pinnedVerification: ['pnpm test'],
    });
    expect(item.state).toBe('ready_for_dev');
    expect(item.pinnedVerification).toEqual(['pnpm test']);
  });

  it('dev advances to in_progress under the live fencing token', async () => {
    // token required for execution-zone transitions
    await expect(
      dev.call('advance_state', { workItemId: 's1', to: 'in_progress' }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });
    // a presented stale/foreign token → 409 conflict
    await expect(
      dev.call('advance_state', {
        workItemId: 's1',
        to: 'in_progress',
        fencingToken: claimS1.fencingToken + 41,
      }),
    ).rejects.toMatchObject({ name: 'ConflictError', status: 409 });
    const item = await dev.call<WorkItem>('advance_state', {
      workItemId: 's1',
      to: 'in_progress',
      fencingToken: claimS1.fencingToken,
    });
    expect(item.state).toBe('in_progress');
  });

  it('dev submits a non-empty diff and moves to in_review', async () => {
    await dev.call('submit_evidence', {
      workItemId: 's1',
      fencingToken: claimS1.fencingToken,
      evidence: {
        kind: 'git_diff',
        payload: { baseline: 'abc', final: 'def', filesChanged: 3, nonEmpty: true, branch: `claim-${claimS1.id}` },
      },
    });
    const item = await dev.call<WorkItem>('advance_state', {
      workItemId: 's1',
      to: 'in_review',
      fencingToken: claimS1.fencingToken,
    });
    expect(item.state).toBe('in_review');
    const inbox = await reviewer.call<{ awaitingReview: WorkItem[] }>('inbox');
    expect(inbox.awaitingReview.map((wi) => wi.externalKey)).toEqual(['s1']);
  });

  it('review approval before pinned evidence exists → 422 guard', async () => {
    await expect(
      reviewer.call('approve_gate', { workItemId: 's1', gate: 'review_approval' }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });
  });

  it('test_run + remote-reachable commit evidence, then review approval → done', async () => {
    await dev.call('submit_evidence', {
      workItemId: 's1',
      fencingToken: claimS1.fencingToken,
      evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
    });
    await dev.call('submit_evidence', {
      workItemId: 's1',
      fencingToken: claimS1.fencingToken,
      evidence: { kind: 'commit', payload: { sha: 'def', branch: `claim-${claimS1.id}`, reachableOnRemote: true } },
    });
    const item = await reviewer.call<WorkItem>('approve_gate', {
      workItemId: 's1',
      gate: 'review_approval',
    });
    expect(item.state).toBe('done');
    const fetched = await po.call<WorkItem>('get_work_item', { workItemId: 's1' });
    expect(fetched.state).toBe('done');
    // epic-lift happened when s1 first left backlog
    const lifted = await po.call<Feature>('get_feature', { featureId: feature.id });
    expect(lifted.state).toBe('in_progress');
  });

  it('s2: an empty diff denies the advance to review (fake-done deny, 422)', async () => {
    await po.call('advance_state', { workItemId: 's2', to: 'draft' });
    await po.call('advance_state', { workItemId: 's2', to: 'ready_for_dev' });
    const claim = await dev.call<Claim>('claim_task', { workItemId: 's2' });
    await dev.call('advance_state', {
      workItemId: 's2',
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });
    await dev.call('submit_evidence', {
      workItemId: 's2',
      fencingToken: claim.fencingToken,
      evidence: { kind: 'git_diff', payload: { baseline: 'abc', final: 'abc', filesChanged: 0, nonEmpty: false } },
    });
    await expect(
      dev.call('advance_state', { workItemId: 's2', to: 'in_review', fencingToken: claim.fencingToken }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });
  });

  it('s2: force_release_claim invalidates the old token → 409 on reuse', async () => {
    const staleToken = (await po.call<Claim[]>('get_claims', { workItemId: 's2' })).find(
      (c) => !c.released,
    )!.fencingToken;
    const released = await admin.call<{ released: string[] }>('force_release_claim', {
      workItemId: 's2',
    });
    expect(released.released).toHaveLength(1);
    // zombie worker presents the fenced-out token → 409 + audit event
    await expect(
      dev.call('submit_evidence', {
        workItemId: 's2',
        fencingToken: staleToken,
        evidence: { kind: 'git_diff', payload: { nonEmpty: true } },
      }),
    ).rejects.toMatchObject({ name: 'ConflictError', status: 409 });
    // no live claim left → force release is now a failed guard
    await expect(admin.call('force_release_claim', { workItemId: 's2' })).rejects.toMatchObject({
      name: 'GuardFailedError',
      status: 422,
    });
  });

  it('the audit answer is a query: events show gates, evidence, and transitions', async () => {
    const events = await admin.call<Array<{ type: string }>>('query_events');
    const types = events.map((e) => e.type);
    expect(types).toContain('work_item.claimed');
    expect(types).toContain('gate.approved');
    expect(types).toContain('evidence.submitted');
    expect(types).toContain('fencing.rejected');
  });
});
