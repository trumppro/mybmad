/**
 * Phase 3 CLI: the collaboration command functions (thread/post/messages/
 * notifications/jobs) and the ADVISOR BOTS drive a real in-process spine-api
 * through the typed contracts client — same pattern as cli-e2e.test.ts.
 *
 * The advisor bots are the "agentify without touching the spine" proof:
 * deterministic read + post under a token with NO grants, NO roles — and the
 * audit trail shows the advisor actor touched nothing but messages.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type SpineEvent } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import {
  actorCreateCommand,
  adviseNextTaskCommand,
  adviseReconcileCommand,
  jobCompleteCommand,
  jobsCommand,
  messagesCommand,
  notificationsCommand,
  postCommand,
  roleAssignCommand,
  runToOutput,
  threadCreateCommand,
  threadListCommand,
} from '../src/commands/index.js';

const ADMIN_TOKEN = 'collab-cli-admin-token';

const STORIES_YAML = `
- id: "t1"
  title: First ready story
  description: Claimable ready_for_dev fixture
- id: "t2"
  title: Second ready story
  description: Claimable ready_for_dev fixture two
- id: "t3"
  title: Backlog story
  description: Stays in backlog for reconcile drift
`;

function extract(text: string, key: string): string {
  const match = new RegExp(`^${key}: (.+)$`, 'm').exec(text);
  if (!match || match[1] === undefined) throw new Error(`no "${key}:" line in:\n${text}`);
  return match[1];
}

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let agent: OahsClient;
let advisor: OahsClient;
let poId: string;
let agentId: string;
let advisorId: string;
let featureId: string;
let threadId: string;
let jobId: string;

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

  const poOut = await actorCreateCommand(admin, { type: 'user', name: 'PO' });
  const agentOut = await actorCreateCommand(admin, { type: 'agent', name: 'Amelia' });
  const advisorOut = await actorCreateCommand(admin, { type: 'user', name: 'Advisor Bot Runner' });
  poId = extract(poOut, 'actorId');
  agentId = extract(agentOut, 'actorId');
  advisorId = extract(advisorOut, 'actorId');
  po = makeClient({ baseUrl, token: extract(poOut, 'token') });
  agent = makeClient({ baseUrl, token: extract(agentOut, 'token') });
  advisor = makeClient({ baseUrl, token: extract(advisorOut, 'token') });

  // PO may invoke agents (delivery role); the ADVISOR gets nothing at all.
  await roleAssignCommand(admin, { actorId: poId, roleCode: 'product_owner' });
  await roleAssignCommand(admin, { actorId: agentId, roleCode: 'developer' });

  featureId = (await po.call<{ id: string }>('create_feature')).id;
  await po.call('import_stories', { featureId, yaml: STORIES_YAML });
  for (const key of ['t1', 't2']) {
    await po.call('advance_state', { workItemId: key, to: 'draft' });
    await po.call('advance_state', { workItemId: key, to: 'ready_for_dev' });
  }
});

afterAll(async () => {
  await app.close();
});

describe('collaboration CLI against a live spine-api', () => {
  it('thread create binds kind/feature/work item; thread list shows it', async () => {
    const out = await threadCreateCommand(po, {
      kind: 'task',
      featureId,
      workItemId: 't1',
    });
    threadId = extract(out, 'threadId');
    expect(extract(out, 'kind')).toBe('task');
    expect(extract(out, 'visibility')).toBe('open');

    const list = await threadListCommand(po, { featureId });
    expect(list).toContain(threadId);
    expect(list).toContain('task');
  });

  it('an invalid --kind is rejected locally', async () => {
    const out = await runToOutput(() => threadCreateCommand(po, { kind: 'watercooler' }));
    expect(out.exitCode).toBe(1);
    expect(out.text).toContain('invalid --kind "watercooler"');
  });

  it('post --mention (structured ids) reports the router resolution job_created', async () => {
    const out = await postCommand(po, {
      threadId,
      body: 'please pick this up',
      mentions: [agentId],
    });
    expect(out).toContain(`mention ${agentId}: job_created`);
  });

  it('jobs --status queued shows the materialized reply-only job', async () => {
    const out = await jobsCommand(agent, { agentActorId: agentId, status: 'queued' });
    expect(out).toContain(agentId);
    expect(out).toContain('queued');
    const line = out.split('\n').find((l) => l.includes('queued'));
    jobId = line!.split(/ {2,}/)[0]!;
    expect(jobId).toMatch(/^job_/);
  });

  it('job done completes as the agent and notifies the mentioner', async () => {
    const out = await jobCompleteCommand(agent, { jobId, status: 'done', note: 'replied in thread' });
    expect(out).toContain(`job ${jobId}: done`);
    expect(out).toContain('note: replied in thread');

    const poNotifications = await notificationsCommand(po, { unreadOnly: true });
    expect(poNotifications).toContain('job_completed');
    expect(poNotifications).toContain(jobId);
    // ctx-scoped: the agent's own list shows its mention, not the PO's completion
    const agentNotifications = await notificationsCommand(agent, {});
    expect(agentNotifications).toContain('mention');
    expect(agentNotifications).not.toContain('job_completed');
  });

  it('messages renders raw authorIds and includes both posts', async () => {
    const out = await messagesCommand(po, { threadId });
    expect(out).toContain(poId);
    expect(out).toContain('please pick this up');
    const since = await messagesCommand(po, { threadId, sinceSeq: 1 });
    expect(since).not.toContain('please pick this up');
  });
});

describe('advisor bots — read + post only, zero grants, zero gates', () => {
  it('advise next-task posts the deterministic claim order into the thread', async () => {
    const out = await adviseNextTaskCommand(advisor, { threadId });
    expect(out).toContain('advisor(next-task): suggested claim order');
    expect(out).toMatch(/1\. t1 — First ready story/);
    expect(out).toMatch(/2\. t2 — Second ready story/);
    expect(out).not.toContain('t3'); // backlog items are not claimable ready_for_dev

    const messages = await messagesCommand(po, { threadId });
    expect(messages).toContain('advisor(next-task)');
    expect(messages).toContain(advisorId);
  });

  it('advise reconcile posts the detect-only divergence report', async () => {
    const out = await adviseReconcileCommand(advisor, {
      threadId,
      files: ['t3=done', 't1=ready-for-dev'],
    });
    expect(out).toContain('advisor(reconcile): 1 divergence(s) detected');
    expect(out).toMatch(/file=done db=backlog → file_ahead/);

    // detect-only: t3 did not move
    const t3 = await po.call<{ state: string }>('get_work_item', { workItemId: 't3' });
    expect(t3.state).toBe('backlog');
  });

  it('a malformed --file pair is rejected locally', async () => {
    const out = await runToOutput(() =>
      adviseReconcileCommand(advisor, { threadId, files: ['t3'] }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.text).toContain('invalid --file "t3"');
  });

  it('the audit proves it: the advisor actor produced ONLY message.posted events — no gates, no transitions', async () => {
    const events = await admin.call<SpineEvent[]>('query_events');
    const byAdvisor = events.filter((e) => e.actorId === advisorId);
    expect(byAdvisor.length).toBeGreaterThanOrEqual(2); // both advice posts
    expect(new Set(byAdvisor.map((e) => e.type))).toEqual(new Set(['message.posted']));
  });
});
