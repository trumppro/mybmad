/**
 * Phase 4 EXIT CRITERION over the rails (roadmap Build phases, Phase 4):
 * "A PRD change drafted by the PM agent, reviewed by a reviewer agent,
 * approved by a human PO — three actor kinds, one rails" — exercised
 * end-to-end through HTTP /rpc only.
 *
 *  - admin provisions the six BMAD personas (provision_personas, engine-gated)
 *  - John (PM persona) gets the developer bundle EXPLICITLY (assign_role)
 *  - the PO creates a spec_draft work item (create_work_item, kind selects
 *    evidence guards — doc_lint in, git_diff/commit out)
 *  - John claims, drafts, submits doc_lint, advances to in_review
 *  - the reviewer agent (reject-only grant) files a review_report and rejects
 *    → deterministic loopback; approving is 403 PermissionDeniedError
 *  - John reworks; the human PO approves → done
 *  - list_actors exposes the 6 personas + the system actor to every surface
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, PERSONAS, type SpineEngine } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import type { Actor, Claim, Feature, SpineEvent, WorkItem } from '@oahs/core';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'doc-work-admin-token';

let engine: SpineEngine;
let tokenStore: TokenStore;
let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient; // HUMAN: product_owner + gate.review.approve
let john: OahsClient; // AGENT persona: bmad-agent-pm, developer bundle assigned
let reviewerAgent: OahsClient; // AGENT: gate.review.reject ONLY
let poActor: Actor;
let johnActor: Actor;
let reviewerActor: Actor;
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

beforeAll(async () => {
  engine = createMemoryEngine();
  tokenStore = new TokenStore();
  app = await buildServer({ engine, tokenStore, adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const poCreated = await createActor('user', 'PO (human)');
  poActor = poCreated.actor;
  po = poCreated.client;
  await admin.call('assign_role', { actorId: poActor.id, roleCode: 'product_owner' });
  await admin.call('grant_permission', { actorId: poActor.id, permission: 'gate.review.approve' });

  const reviewerCreated = await createActor('agent', 'Adversarial reviewer');
  reviewerActor = reviewerCreated.actor;
  reviewerAgent = reviewerCreated.client;
  await admin.call('grant_permission', { actorId: reviewerActor.id, permission: 'gate.review.reject' });

  feature = await po.call<Feature>('create_feature');
});

afterAll(async () => {
  await app.close();
});

describe('exit criterion over HTTP: PM agent drafts, reviewer agent reviews, human PO approves', () => {
  it('provisions the personas idempotently; a plain member is denied (403)', async () => {
    const first = await admin.call<Actor[]>('provision_personas');
    expect(first).toHaveLength(PERSONAS.length);
    const second = await admin.call<Actor[]>('provision_personas');
    expect(second.map((a) => a.id).sort()).toEqual(first.map((a) => a.id).sort());

    // Gated by the ENGINE's governance check, not the bus: a member is 403.
    await expect(po.call('provision_personas')).rejects.toMatchObject({
      name: 'PermissionDeniedError',
      status: 403,
    });

    const johnPersona = first.find((a) => a.personaCode === 'bmad-agent-pm');
    expect(johnPersona).toBeDefined();
    johnActor = johnPersona as Actor;
    // Personas are engine actors; the test issues John an API token the same
    // way create_actor would (the store is in-process here).
    john = makeClient({ baseUrl, token: tokenStore.issue(johnActor.id) });
    // Authority is assigned, not assumed: the developer bundle, explicitly.
    await admin.call('assign_role', { actorId: johnActor.id, roleCode: 'developer' });
  });

  it('list_actors exposes the six personas, the humans, and the system actor', async () => {
    const actors = await po.call<Actor[]>('list_actors');
    expect(actors.filter((a) => a.personaCode !== null)).toHaveLength(PERSONAS.length);
    expect(actors.some((a) => a.id === poActor.id)).toBe(true);
    expect(actors.some((a) => a.type === 'system')).toBe(true);
  });

  it('runs the full PRD-change loop: draft → doc_lint → review reject → rework → PO approves → done', async () => {
    // The PO creates the PRD change as a spec_draft work item over /rpc.
    const wi = await po.call<WorkItem>('create_work_item', {
      featureId: feature.id,
      externalKey: 'prd-change-1',
      title: 'PRD change: rate limits for the public API',
      kind: 'spec_draft',
    });
    expect(wi.kind).toBe('spec_draft');
    await po.call('advance_state', { workItemId: wi.id, to: 'draft' });
    await po.call('advance_state', { workItemId: wi.id, to: 'ready_for_dev' });

    // 1. John (PM AGENT persona) claims and drafts under his own grants.
    const claim = await john.call<Claim>('claim_task', { workItemId: wi.id, ttlMs: 3_600_000 });
    await john.call('advance_state', {
      workItemId: wi.id,
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });

    // A failing lint blocks the transition (422) — the core judges, not the runner.
    await john.call('submit_evidence', {
      workItemId: wi.id,
      fencingToken: claim.fencingToken,
      evidence: {
        kind: 'doc_lint',
        payload: { schemaValid: false, findings: ['missing ## Rollout'] },
      },
    });
    await expect(
      john.call('advance_state', { workItemId: wi.id, to: 'in_review', fencingToken: claim.fencingToken }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });

    await john.call('submit_evidence', {
      workItemId: wi.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: true, findings: [] } },
    });
    await john.call('advance_state', {
      workItemId: wi.id,
      to: 'in_review',
      fencingToken: claim.fencingToken,
    });

    // 2. The REVIEWER AGENT: report as context, rejection as granted authority.
    await reviewerAgent.call('submit_evidence', {
      workItemId: wi.id,
      evidence: { kind: 'review_report', payload: { verdict: 'needs a rollout section' } },
    });
    const rejected = await reviewerAgent.call<WorkItem>('reject_gate', {
      workItemId: wi.id,
      gate: 'review_approval',
    });
    expect(rejected.state).toBe('in_progress'); // deterministic loopback
    expect(rejected.reviewLoopIteration).toBe(1);

    // John reworks and resubmits under the same claim.
    await john.call('submit_evidence', {
      workItemId: wi.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: true, findings: [] } },
    });
    await john.call('advance_state', {
      workItemId: wi.id,
      to: 'in_review',
      fencingToken: claim.fencingToken,
    });

    // 3. The reviewer agent CANNOT approve (reject-only grant) → 403; state untouched.
    await expect(
      reviewerAgent.call('approve_gate', { workItemId: wi.id, gate: 'review_approval' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    expect((await po.call<WorkItem>('get_work_item', { workItemId: wi.id })).state).toBe('in_review');

    // The HUMAN PO approves — no commit evidence anywhere (doc kind drops it).
    const done = await po.call<WorkItem>('approve_gate', { workItemId: wi.id, gate: 'review_approval' });
    expect(done.state).toBe('done');

    // One rails: the audit trail carries all three actor kinds on this item.
    const events = await po.call<SpineEvent[]>('query_events', { streamId: wi.id });
    const actorsInAudit = new Set(events.map((event) => event.actorId));
    expect(actorsInAudit.has(johnActor.id)).toBe(true); // agent (PM persona)
    expect(actorsInAudit.has(reviewerActor.id)).toBe(true); // agent (reviewer)
    expect(actorsInAudit.has(poActor.id)).toBe(true); // human
  });
});
