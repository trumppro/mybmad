/**
 * Phase 5 CLI (roadmap §6): `oahs stats reviews` and `oahs memory` drive a
 * real in-process spine-api through the typed contracts client — same
 * pattern as collab-cli.test.ts.
 *
 * The stats fixture is the exit-criterion measuring stick made concrete:
 * two done items of the same kind, one converged after ONE review loop, one
 * after ZERO — the table shows the improvement (avg 0.50, max 1) so runs can
 * be compared week-over-week.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type Claim, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { memoryCommand, runToOutput, statsReviewsCommand } from '../src/commands/index.js';

const ADMIN_TOKEN = 'phase5-cli-admin-token';

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let worker: OahsClient;
let reviewer: OahsClient;
let memoAgent: OahsClient; // the learning teammate whose memories we list
let otherAgent: OahsClient; // proves owner-scope through the CLI

async function createActor(type: 'user' | 'agent', displayName: string): Promise<{ id: string; client: OahsClient }> {
  const created = await admin.call<{ actor: { id: string }; token: string }>('create_actor', {
    type,
    displayName,
  });
  return { id: created.actor.id, client: makeClient({ baseUrl, token: created.token }) };
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

  const created = {
    po: await createActor('user', 'PO'),
    worker: await createActor('agent', 'Doc worker'),
    reviewer: await createActor('user', 'Reviewer'),
    memo: await createActor('agent', 'Memo (learning teammate)'),
    other: await createActor('agent', 'Other teammate'),
  };
  po = created.po.client;
  worker = created.worker.client;
  reviewer = created.reviewer.client;
  memoAgent = created.memo.client;
  otherAgent = created.other.client;

  for (const grant of [
    { actorId: created.po.id, permission: 'feature.init' },
    { actorId: created.po.id, permission: 'task.plan' },
    { actorId: created.po.id, permission: 'task.advance' },
    { actorId: created.worker.id, permission: 'task.claim' },
    { actorId: created.worker.id, permission: 'task.advance' },
    { actorId: created.reviewer.id, permission: 'gate.review.approve' },
  ]) {
    await admin.call('grant_permission', grant);
  }

  // -- stats fixture: two DOC items, both done ---------------------------------
  // s1 converges after ONE rejection loop; s2 sails through with ZERO.
  const feature = await po.call<{ id: string }>('create_feature');
  for (const key of ['s1', 's2']) {
    await po.call('create_work_item', {
      featureId: feature.id,
      externalKey: key,
      title: `Doc item ${key}`,
      kind: 'doc',
    });
    await po.call('advance_state', { workItemId: key, to: 'draft' });
    await po.call('advance_state', { workItemId: key, to: 'ready_for_dev' });
  }

  // s1: in_review → REJECTED (loopback, loop=1) → in_review again → approved.
  const claim1 = await worker.call<Claim>('claim_task', { workItemId: 's1' });
  await worker.call('advance_state', { workItemId: 's1', to: 'in_progress', fencingToken: claim1.fencingToken });
  await worker.call('advance_state', { workItemId: 's1', to: 'in_review', fencingToken: claim1.fencingToken });
  await reviewer.call('reject_gate', { workItemId: 's1', gate: 'review_approval' });
  await worker.call('advance_state', { workItemId: 's1', to: 'in_review', fencingToken: claim1.fencingToken });
  await reviewer.call('approve_gate', { workItemId: 's1', gate: 'review_approval' });
  await worker.call('release_claim', { claimId: claim1.id });

  // s2: straight through, zero loops.
  const claim2 = await worker.call<Claim>('claim_task', { workItemId: 's2' });
  await worker.call('advance_state', { workItemId: 's2', to: 'in_progress', fencingToken: claim2.fencingToken });
  await worker.call('advance_state', { workItemId: 's2', to: 'in_review', fencingToken: claim2.fencingToken });
  await reviewer.call('approve_gate', { workItemId: 's2', gate: 'review_approval' });
  await worker.call('release_claim', { claimId: claim2.id });
});

afterAll(async () => {
  await app.close();
});

describe('oahs stats reviews (roadmap §6 measuring stick)', () => {
  it('fixture sanity: both items are done; s1 looped once, s2 not at all', async () => {
    const s1 = await po.call<WorkItem>('get_work_item', { workItemId: 's1' });
    const s2 = await po.call<WorkItem>('get_work_item', { workItemId: 's2' });
    expect([s1.state, s2.state]).toEqual(['done', 'done']);
    expect(s1.reviewLoopIteration).toBe(1);
    expect(s2.reviewLoopIteration).toBe(0);
  });

  it('renders per-kind convergence (count/avg/max) and per-item loops — the improvement is visible', async () => {
    const out = await statsReviewsCommand(po);
    // kind summary: 2 done doc items, avg 0.50 loops, max 1
    expect(out).toMatch(/doc\s+2\s+0\.50\s+1/);
    // per-item rows: s1 needed one loop, s2 none — comparable week-over-week
    expect(out).toMatch(/s1\s+doc\s+done\s+1/);
    expect(out).toMatch(/s2\s+doc\s+done\s+0/);
  });
});

describe('oahs memory (owner-scoped recall through the CLI)', () => {
  it('lists ONLY the caller token’s memories; kind and query filter', async () => {
    await memoAgent.call('append_agent_memory', {
      kind: 'episodic',
      content: 'analyzed story s1 for the PO',
    });
    await memoAgent.call('append_agent_memory', {
      kind: 'procedural',
      content: 'pin verification before pushing',
    });

    const all = await memoryCommand(memoAgent);
    expect(all).toContain('analyzed story s1');
    expect(all).toContain('pin verification');

    const procedural = await memoryCommand(memoAgent, { kind: 'procedural' });
    expect(procedural).toContain('pin verification');
    expect(procedural).not.toContain('analyzed story s1');

    const queried = await memoryCommand(memoAgent, { query: 'analyzed' });
    expect(queried).toContain('analyzed story s1');
    expect(queried).not.toContain('pin verification');

    // owner-scope through the CLI: another agent's table is empty — there is
    // no flag that could ask for someone else's memory.
    expect(await memoryCommand(otherAgent)).toContain('(empty)');
  });

  it('rejects an invalid --kind locally', async () => {
    const out = await runToOutput(() => memoryCommand(memoAgent, { kind: 'vibes' }));
    expect(out.exitCode).toBe(1);
    expect(out.text).toContain('invalid --kind');
  });
});
