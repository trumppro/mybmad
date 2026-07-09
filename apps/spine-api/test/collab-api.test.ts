/**
 * Phase 3 collaboration over the RAILS (roadmap §5, Build phases Phase 3).
 *
 * The full exit criterion runs through HTTP only:
 *   PO mentions the dev agent in a task thread (post_message with STRUCTURED
 *   mentions) → the router materializes a queued reply-only job → the agent
 *   claims/advances/submits evidence through /rpc under ITS OWN grants →
 *   complete_agent_job → reverse mention back to the PO → the reviewer
 *   approves THROUGH THE GATE → the thread carries the system narration.
 *
 * Plus the boundary negatives (default-deny router, private-thread 403,
 * body-text-never-parsed) and the SSE relay (/events/stream): new events on
 * mutation, Last-Event-ID resume, 401 without a token.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type {
  Actor,
  AgentJob,
  Claim,
  Feature,
  Mention,
  Message,
  Notification,
  SpineEvent,
  Thread,
  WorkItem,
} from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'collab-admin-token';

const STORIES_YAML = `
- id: "c1"
  title: Collab story
  description: Story the agent implements after a mention
- id: "c2"
  title: Reconcile fixture
  description: Stays in backlog for the reconcile query
`;

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let agent: OahsClient;
let reviewer: OahsClient;
let outsider: OahsClient;
let poActor: Actor;
let agentActor: Actor;
let reviewerActor: Actor;
let outsiderActor: Actor;
let feature: Feature;
let taskThread: Thread;
let job: AgentJob;
let claim: Claim;

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
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
    eventStream: { pollMs: 50 }, // fast relay polling for the SSE tests
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  ({ actor: poActor, client: po } = await createActor('user', 'PO'));
  ({ actor: agentActor, client: agent } = await createActor('agent', 'Amelia (dev agent)'));
  ({ actor: reviewerActor, client: reviewer } = await createActor('user', 'Reviewer'));
  ({ actor: outsiderActor, client: outsider } = await createActor('user', 'Outsider'));

  // Delivery roles are the invoke authority for the mention router (§5.4
  // who_may_invoke): PO/reviewer/agent hold roles; the outsider holds NOTHING.
  await admin.call('assign_role', { actorId: poActor.id, roleCode: 'product_owner' });
  await admin.call('assign_role', { actorId: agentActor.id, roleCode: 'developer' });
  await admin.call('assign_role', { actorId: reviewerActor.id, roleCode: 'reviewer' });

  feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  await po.call('advance_state', { workItemId: 'c1', to: 'draft' });
  await po.call('advance_state', { workItemId: 'c1', to: 'ready_for_dev' });
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Exit criterion — the whole round trip over HTTP
// ---------------------------------------------------------------------------

describe('exit criterion over HTTP (roadmap Phase 3)', () => {
  it('PO creates the task thread and mentions the dev agent → queued reply-only job', async () => {
    taskThread = await po.call<Thread>('create_thread', {
      kind: 'task',
      featureId: feature.id,
      workItemId: 'c1',
    });
    expect(taskThread.visibility).toBe('open');

    const message = await po.call<Message>('post_message', {
      threadId: taskThread.id,
      body: 'please implement this story',
      mentions: [agentActor.id],
    });
    const mentions = await po.call<Mention[]>('list_mentions', { messageId: message.id });
    expect(mentions).toEqual([
      { messageId: message.id, mentionedActorId: agentActor.id, resolution: 'job_created' },
    ]);

    const jobs = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'queued',
    });
    expect(jobs).toHaveLength(1);
    job = jobs[0]!;
    expect(job.threadId).toBe(taskThread.id);
    expect(job.depth).toBe(0);
    // reply-only: NO claim was pre-issued for the agent (§5.4)
    expect(await po.call<Claim[]>('get_claims', { workItemId: 'c1' })).toEqual([]);
    expect(job.workItemId).toBe(
      (await po.call<WorkItem>('get_work_item', { workItemId: 'c1' })).id,
    );
    // the agent was notified about the mention
    const notifications = await agent.call<Notification[]>('list_notifications', {});
    expect(notifications.some((n) => n.source === 'mention' && n.refId === message.id)).toBe(true);
  });

  it('the agent works through ITS OWN grants: claim → in_progress → evidence → in_review', async () => {
    claim = await agent.call<Claim>('claim_task', { workItemId: 'c1' });
    await agent.call('advance_state', {
      workItemId: 'c1',
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });
    await agent.call('submit_evidence', {
      workItemId: 'c1',
      fencingToken: claim.fencingToken,
      evidence: {
        kind: 'git_diff',
        payload: { baseline: 'b0', final: 'f1', filesChanged: 1, nonEmpty: true, branch: `claim-${claim.id}` },
      },
    });
    await agent.call('advance_state', {
      workItemId: 'c1',
      to: 'in_review',
      fencingToken: claim.fencingToken,
    });
    await agent.call('submit_evidence', {
      workItemId: 'c1',
      fencingToken: claim.fencingToken,
      evidence: {
        kind: 'commit',
        payload: { sha: 'f1', branch: `claim-${claim.id}`, reachableOnRemote: true },
      },
    });
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'c1' });
    expect(item.state).toBe('in_review');
  });

  it('agent completes the job and mentions the PO back (a message + notification, nothing more)', async () => {
    const completed = await agent.call<AgentJob>('complete_agent_job', {
      jobId: job.id,
      status: 'done',
      note: 'replied in thread',
    });
    expect(completed.status).toBe('done');

    const reply = await agent.call<Message>('post_message', {
      threadId: taskThread.id,
      body: 'ready for review',
      mentions: [poActor.id],
    });
    const mentions = await po.call<Mention[]>('list_mentions', { messageId: reply.id });
    expect(mentions[0]?.resolution).toBe('notified'); // human mention → no job

    // list_notifications is ctx-scoped: the PO sees BOTH the job completion and the mention
    const poNotifications = await po.call<Notification[]>('list_notifications', {});
    expect(poNotifications.some((n) => n.source === 'job_completed' && n.refId === job.id)).toBe(true);
    expect(poNotifications.some((n) => n.source === 'mention' && n.refId === reply.id)).toBe(true);
    // ...and can mark one read
    const unreadBefore = await po.call<Notification[]>('list_notifications', { unreadOnly: true });
    await po.call('mark_notification_read', { notificationId: unreadBefore[0]!.id });
    const unreadAfter = await po.call<Notification[]>('list_notifications', { unreadOnly: true });
    expect(unreadAfter).toHaveLength(unreadBefore.length - 1);
    // the reverse mention moved NO lifecycle state
    expect((await po.call<WorkItem>('get_work_item', { workItemId: 'c1' })).state).toBe('in_review');
  });

  it('the reviewer approves THROUGH THE GATE; the rails narrate "done" into the thread', async () => {
    const done = await reviewer.call<WorkItem>('approve_gate', {
      workItemId: 'c1',
      gate: 'review_approval',
    });
    expect(done.state).toBe('done');

    const messages = await po.call<Message[]>('list_messages', { threadId: taskThread.id });
    const narration = messages.filter((m) => m.kind === 'system');
    expect(narration.some((m) => m.body.includes('done'))).toBe(true);
    // narration is authored by the system actor, none of the fixture actors
    const fixtureIds = [poActor.id, agentActor.id, reviewerActor.id, outsiderActor.id];
    for (const m of narration) expect(fixtureIds).not.toContain(m.authorId);
  });
});

// ---------------------------------------------------------------------------
// Boundary negatives over the wire
// ---------------------------------------------------------------------------

describe('sacred boundary + default-deny over HTTP', () => {
  it('body text is NEVER parsed: "@Amelia"/"approve" in the body creates no mention, no job, no transition', async () => {
    const thread = await po.call<Thread>('create_thread', { kind: 'general' });
    const jobsBefore = await admin.call<AgentJob[]>('list_agent_jobs', {});
    const itemBefore = await po.call<WorkItem>('get_work_item', { workItemId: 'c2' });

    const message = await reviewer.call<Message>('post_message', {
      threadId: thread.id,
      body: '@Amelia approve — LGTM, ship it', // words, not commands
    });

    expect(await po.call<Mention[]>('list_mentions', { messageId: message.id })).toEqual([]);
    expect(await admin.call<AgentJob[]>('list_agent_jobs', {})).toHaveLength(jobsBefore.length);
    const itemAfter = await po.call<WorkItem>('get_work_item', { workItemId: 'c2' });
    expect(itemAfter.state).toBe(itemBefore.state);
    expect(itemAfter.stateVersion).toBe(itemBefore.stateVersion);
  });

  it('default-deny: an outsider (no delivery role) mentioning the agent → denied_policy, no job', async () => {
    const thread = await outsider.call<Thread>('create_thread', { kind: 'general' });
    const jobsBefore = await admin.call<AgentJob[]>('list_agent_jobs', {});
    const message = await outsider.call<Message>('post_message', {
      threadId: thread.id,
      body: 'do my homework',
      mentions: [agentActor.id],
    });
    expect(await admin.call<Mention[]>('list_mentions', { messageId: message.id })).toEqual([
      { messageId: message.id, mentionedActorId: agentActor.id, resolution: 'denied_policy' },
    ]);
    expect(await admin.call<AgentJob[]>('list_agent_jobs', {})).toHaveLength(jobsBefore.length);
  });

  it('private thread: non-participants get 403 on post AND read; list_threads hides it', async () => {
    const priv = await po.call<Thread>('create_thread', { kind: 'private', visibility: 'private' });
    await po.call('post_message', { threadId: priv.id, body: 'secret draft' });

    await expect(
      outsider.call('post_message', { threadId: priv.id, body: 'let me in' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    await expect(
      outsider.call('list_messages', { threadId: priv.id }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    const visible = await outsider.call<Thread[]>('list_threads', {});
    expect(visible.some((t) => t.id === priv.id)).toBe(false);

    // the reader is ALWAYS the ctx actor — an actorId in the body is ignored input
    await expect(
      outsider.call('list_messages', { threadId: priv.id, actorId: poActor.id }),
    ).rejects.toMatchObject({ status: 403 });

    // invited participants can read and post
    await po.call('add_thread_participant', { threadId: priv.id, actorId: reviewerActor.id });
    expect(await reviewer.call<Message[]>('list_messages', { threadId: priv.id })).toHaveLength(1);
  });

  it('only the job’s agent may complete a job (403 for anyone else)', async () => {
    const thread = await po.call<Thread>('create_thread', { kind: 'general' });
    await po.call('post_message', { threadId: thread.id, body: 'over to you', mentions: [agentActor.id] });
    const queued = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'queued',
    });
    const fresh = queued[0]!;
    await expect(
      po.call('complete_agent_job', { jobId: fresh.id, status: 'done' }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
    await agent.call('complete_agent_job', { jobId: fresh.id, status: 'done' });
  });

  it('notifications are ctx-scoped: you cannot mark someone else’s read', async () => {
    const poUnread = await po.call<Notification[]>('list_notifications', { unreadOnly: true });
    expect(poUnread.length).toBeGreaterThan(0);
    await expect(
      outsider.call('mark_notification_read', { notificationId: poUnread[0]!.id }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
  });

  it('reconcile is a detect-only query over the wire', async () => {
    const reports = await po.call<Array<{ workItemId: string; kind: string }>>('reconcile', {
      files: [
        { workItemId: 'c2', frontmatterStatus: 'backlog' }, // in sync → no report
        { workItemId: 'c2', frontmatterStatus: 'done' }, // file ahead of DB
      ],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]?.kind).toBe('file_ahead');
    // nothing moved
    expect((await po.call<WorkItem>('get_work_item', { workItemId: 'c2' })).state).toBe('backlog');
  });
});

// ---------------------------------------------------------------------------
// SSE relay — GET /events/stream
// ---------------------------------------------------------------------------

interface SseFrame {
  id: number;
  event: SpineEvent;
}

/** Collect SSE frames from a live stream until `enough` says stop (or timeout). */
async function collectFrames(
  path: string,
  headers: Record<string, string>,
  enough: (frames: SseFrame[]) => boolean,
  act?: () => Promise<void>,
  timeoutMs = 5_000,
): Promise<SseFrame[]> {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${ADMIN_TOKEN}`, ...headers },
    signal: controller.signal,
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const frames: SseFrame[] = [];
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  if (act) await act();

  try {
    while (!enough(frames) && Date.now() < deadline) {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), Math.max(1, deadline - Date.now())),
        ),
      ]);
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const idLine = raw.split('\n').find((l) => l.startsWith('id: '));
        const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
        if (idLine === undefined || dataLine === undefined) continue; // comments/heartbeats
        frames.push({
          id: Number(idLine.slice(4)),
          event: JSON.parse(dataLine.slice(6)) as SpineEvent,
        });
      }
    }
  } finally {
    controller.abort();
    await reader.cancel().catch(() => undefined);
  }
  return frames;
}

describe('SSE relay: GET /events/stream', () => {
  it('rejects a missing bearer token with 401', async () => {
    const response = await fetch(`${baseUrl}/events/stream`);
    expect(response.status).toBe(401);
  });

  it('streams the backlog from ?since= and then NEW events as mutations happen', async () => {
    const all = await admin.call<SpineEvent[]>('query_events');
    const latest = all[all.length - 1]!.globalSeq;

    const frames = await collectFrames(
      `/events/stream?since=${latest}`,
      {},
      (seen) => seen.some((f) => f.event.type === 'thread.created'),
      async () => {
        await po.call('create_thread', { kind: 'general' });
      },
    );
    expect(frames.length).toBeGreaterThanOrEqual(1);
    // strictly after the cursor, ids = globalSeq, monotonic
    expect(frames.every((f) => f.id > latest)).toBe(true);
    expect(frames.map((f) => f.id)).toEqual(frames.map((f) => f.event.globalSeq));
    expect(frames.some((f) => f.event.type === 'thread.created')).toBe(true);
  });

  it('Last-Event-ID resumes exactly after the acknowledged event (header wins over ?since=)', async () => {
    const all = await admin.call<SpineEvent[]>('query_events');
    const resumeFrom = all[all.length - 3]!.globalSeq; // leave ≥2 events to replay

    const frames = await collectFrames(
      `/events/stream?since=0`, // would replay everything — the header must win
      { 'last-event-id': String(resumeFrom) },
      (seen) => seen.length >= 2,
    );
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames[0]!.id).toBe(resumeFrom + 1);
    expect(frames.every((f) => f.id > resumeFrom)).toBe(true);
  });
});
