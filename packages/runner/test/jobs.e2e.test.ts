/**
 * E2E: the teammate JOBS runtime (Phase 5, roadmap §6) against an IN-PROCESS
 * spine-api (memory engine, real HTTP on port 0). The "agent" is a fake node
 * script that reads the CONTEXT_FILE (and asserts it carries messages AND
 * memories), then writes its reply to REPLY_FILE.
 *
 *  1. happy path   PO mentions the agent in a task thread → runJobsOnce →
 *                  reply posted with the reverse mention, job done, PO
 *                  notified, episodic memory learned — AND the audit trail of
 *                  the agent actor contains ZERO gate/state events (the §6
 *                  exit-criterion guardrail: learning never becomes authority).
 *  2. private      a job whose thread the agent cannot read completes
 *                  `blocked` with note 'no thread access' — no reply, ever.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type {
  Actor,
  AgentJob,
  AgentMemory,
  Mention,
  Message,
  Notification,
  SpineEvent,
  Thread,
} from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { runJobsOnce, jobsLoop } from '../src/index.js';

const ADMIN_TOKEN = 'jobs-e2e-admin-token';

const STORIES_YAML = `
- id: "j1"
  title: Jobs story
  description: Story the teammate analyzes after a mention
`;

/**
 * The fake teammate agent: verifies the CONTEXT_FILE rails contract (job +
 * messages + memories present; the seeded procedural memory recalled), checks
 * the placeholder expansion matches the env vars, then writes the reply.
 */
const FAKE_AGENT = `
import { readFileSync, writeFileSync } from 'node:fs';

const [contextArg, replyArg, jobIdArg, threadIdArg] = process.argv.slice(2);
if (contextArg !== process.env.OAHS_CONTEXT_FILE) process.exit(21);
if (replyArg !== process.env.OAHS_REPLY_FILE) process.exit(22);

const ctx = JSON.parse(readFileSync(contextArg, 'utf8'));
if (typeof ctx.job !== 'object' || ctx.job === null) process.exit(23);
if (!Array.isArray(ctx.messages)) process.exit(24);
if (!Array.isArray(ctx.memories)) process.exit(25);
if (ctx.job.id !== jobIdArg || ctx.job.threadId !== threadIdArg) process.exit(26);
if (ctx.messages.length === 0) process.exit(27);
// the recall rail delivered the seeded procedural memory
if (!ctx.memories.some((m) => m.kind === 'procedural' && m.content.includes('doclint'))) process.exit(28);

writeFileSync(replyArg, 'Da phan tich xong story j1 - moi acceptance criteria deu ro rang.\\n');
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let agent: OahsClient;
let poActor: Actor;
let agentActor: Actor;
let taskThread: Thread;
let tmpRoot: string;
let agentScript: string;

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

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const createdAgent = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Teammate (jobs mode)',
  });
  poActor = createdPo.actor;
  agentActor = createdAgent.actor;
  po = makeClient({ baseUrl, token: createdPo.token });
  agent = makeClient({ baseUrl, token: createdAgent.token });

  // The PO holds invoke authority (§5.4 who_may_invoke). The AGENT holds
  // NOTHING — no role, no grant: jobs mode needs zero lifecycle authority.
  await admin.call('assign_role', { actorId: poActor.id, roleCode: 'product_owner' });

  const feature = await po.call<{ id: string }>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  taskThread = await po.call<Thread>('create_thread', {
    kind: 'task',
    featureId: feature.id,
    workItemId: 'j1',
  });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-jobs-e2e-'));
  agentScript = join(tmpRoot, 'fake-teammate.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

const AGENT_CMD = () =>
  `node ${agentScript} {CONTEXT_FILE} {REPLY_FILE} {JOB_ID} {THREAD_ID}`;

describe('teammate jobs runtime e2e (Phase 5, roadmap §6)', () => {
  it('test 1 — mention → runJobsOnce → reply + reverse mention + job done + episodic memory + ZERO gates', async () => {
    // Seed one procedural memory so the run PROVES the recall rail.
    await agent.call('append_agent_memory', {
      kind: 'procedural',
      content: 'always run doclint before replying',
    });

    const trigger = await po.call<Message>('post_message', {
      threadId: taskThread.id,
      body: 'please analyze this story',
      mentions: [agentActor.id],
    });
    const queued = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'queued',
    });
    expect(queued).toHaveLength(1);
    const job = queued[0]!;
    expect(job.messageId).toBe(trigger.id);

    const result = await runJobsOnce({
      client: agent,
      agentActorId: agentActor.id,
      agentCmd: AGENT_CMD(),
      agentTimeoutMs: 30_000,
    });
    expect(result).toEqual({ handled: true, jobId: job.id, outcome: 'done' });

    // The reply is in the thread, authored by the agent.
    const messages = await po.call<Message[]>('list_messages', { threadId: taskThread.id });
    const reply = messages.find((m) => m.authorId === agentActor.id);
    expect(reply).toBeDefined();
    expect(reply!.body).toContain('Da phan tich');

    // Reverse mention: STRUCTURED, back to the trigger's author, notified-only.
    const mentions = await po.call<Mention[]>('list_mentions', { messageId: reply!.id });
    expect(mentions).toEqual([
      { messageId: reply!.id, mentionedActorId: poActor.id, resolution: 'notified' },
    ]);

    // Job done; the PO holds BOTH notifications (completion + mention).
    const done = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'done',
    });
    expect(done.map((j) => j.id)).toContain(job.id);
    const poNotifications = await po.call<Notification[]>('list_notifications', {});
    expect(poNotifications.some((n) => n.source === 'job_completed' && n.refId === job.id)).toBe(true);
    expect(poNotifications.some((n) => n.source === 'mention' && n.refId === reply!.id)).toBe(true);

    // Episodic learning is recallable by the OWNER (open-sourced → surfaces anywhere).
    const memories = await agent.call<AgentMemory[]>('search_agent_memory', { kind: 'episodic' });
    expect(
      memories.some(
        (m) =>
          m.content.startsWith(`job ${job.id} in thread ${taskThread.id}:`) &&
          m.sourceThreadId === taskThread.id,
      ),
    ).toBe(true);

    // GUARDRAIL AUDIT (§6 exit criterion): the agent actor's whole event trail
    // contains ZERO gate decisions and ZERO state transitions — a jobs-mode
    // teammate replies and learns, it never moves lifecycle.
    const events = await admin.call<SpineEvent[]>('query_events');
    const agentEvents = events.filter((e) => e.actorId === agentActor.id);
    expect(agentEvents.length).toBeGreaterThan(0); // it DID act (messages, job, memory)
    expect(
      agentEvents.filter(
        (e) =>
          e.type === 'gate.approved' ||
          e.type === 'gate.rejected' ||
          e.type.includes('state_changed') ||
          e.type.includes('claim'),
      ),
    ).toEqual([]);
    // ...and its memory events carry NO content (private learning never leaks).
    for (const e of agentEvents.filter((ev) => ev.type === 'memory.appended')) {
      expect(JSON.stringify(e.payload)).not.toContain('Da phan tich');
    }

    // Queue drained: the next cycle handles nothing.
    expect(await runJobsOnce({ client: agent, agentActorId: agentActor.id, agentCmd: AGENT_CMD() }))
      .toEqual({ handled: false });
  });

  it('test 2 — a job from a private thread the agent cannot read completes blocked: "no thread access"', async () => {
    const priv = await po.call<Thread>('create_thread', { kind: 'private', visibility: 'private' });
    await po.call<Message>('post_message', {
      threadId: priv.id,
      body: 'secret question for the teammate',
      mentions: [agentActor.id], // job is materialized; participation is NOT
    });
    const queued = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'queued',
    });
    expect(queued).toHaveLength(1);
    const job = queued[0]!;

    const result = await runJobsOnce({
      client: agent,
      agentActorId: agentActor.id,
      agentCmd: AGENT_CMD(),
      agentTimeoutMs: 30_000,
    });
    expect(result).toEqual({
      handled: true,
      jobId: job.id,
      outcome: 'blocked',
      details: 'no thread access',
    });

    const blocked = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'blocked',
    });
    expect(blocked.find((j) => j.id === job.id)?.note).toBe('no thread access');

    // No reply leaked into the private thread — the PO's message stands alone.
    const messages = await po.call<Message[]>('list_messages', { threadId: priv.id });
    expect(messages.filter((m) => m.authorId === agentActor.id)).toEqual([]);
  });

  it('jobsLoop(once) with an empty queue returns after a single cycle', async () => {
    await jobsLoop({
      client: agent,
      agentActorId: agentActor.id,
      agentCmd: AGENT_CMD(),
      once: true,
    });
    const queued = await agent.call<AgentJob[]>('list_agent_jobs', {
      agentActorId: agentActor.id,
      status: 'queued',
    });
    expect(queued).toEqual([]);
  });
});
