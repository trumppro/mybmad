/**
 * CONFORMANCE — Phase 3 collaboration (roadmap §5, Build phases Phase 3).
 *
 * Written BEFORE the implementation; all additive. Sources:
 *  - product-roadmap.md §5.2 — "Chat never mutates lifecycle. No server code
 *    path parses message text into a transition — 'approve' in a message
 *    body is a word, not a command. … The reverse direction is open: every
 *    rails state-change posts a narrated system_event message."
 *  - product-roadmap.md §5.3 — schema; "message.author is a user or an
 *    agent, one column, one table."
 *  - product-roadmap.md §5.4 — mention router: "deterministic trigger,
 *    routed by pure code with default-deny policy"; "any lifecycle mutation
 *    the mention causes is authorized against the actor who caused it";
 *    claims never pre-issued; "Agents never subscribe to the raw event bus …
 *    They receive only jobs the router materialized under policy.
 *    Agent-mention-agent chains require explicit policy, carry a depth
 *    counter."
 *  - product-thesis.md §5: gates pass through rails, never conversation.
 *
 * New pins (recorded in CONFORMANCE.md):
 *  - Mentions are STRUCTURED input (actor ids); "@name" in body text alone
 *    creates nothing.
 *  - who_may_invoke (default-deny): a mention materializes an agent job only
 *    when the MENTIONER holds at least one active delivery-role assignment
 *    or is a governance admin; workspace policy mentionDispatch=false is a
 *    kill-switch.
 *  - An agent job is reply-only context: no claim, no lifecycle authority.
 *  - System narration: state changes on a work item append a kind='system'
 *    message (author = system actor) to task threads bound to that item.
 *  - Private threads: only participants may post or read.
 */
import {
  AGENT_JOB_MAX_DEPTH,
  createEngine,
  GuardFailedError,
  PermissionDeniedError,
  type Actor,
  type Claim,
  type SpineEngine,
  type Thread,
  type WorkItem,
} from '../src/index.js';

const PINNED = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  admin: Actor;
  po: Actor; // delivery-role holder (product_owner) — may invoke agents
  dev: Actor; // human developer (role holder)
  reviewer: Actor;
  agent: Actor; // dev agent (developer role)
  outsider: Actor; // NO roles — may chat, may not invoke agents
  feature: ReturnType<SpineEngine['createFeature']>;
}

function makeRig(): Rig {
  const engine = createEngine();
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  const agent = engine.createActor({ type: 'agent', displayName: 'Amelia (dev agent)' });
  const outsider = engine.createActor({ type: 'user', displayName: 'Outsider' });
  engine.assignRole({ actorId: po.id, roleCode: 'product_owner', byActorId: admin.id });
  engine.assignRole({ actorId: dev.id, roleCode: 'developer', byActorId: admin.id });
  engine.assignRole({ actorId: reviewer.id, roleCode: 'reviewer', byActorId: admin.id });
  engine.assignRole({ actorId: agent.id, roleCode: 'developer', byActorId: admin.id });
  engine.grant({ actorId: po.id, permission: 'task.claim' }); // planning claims in fixtures
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, admin, po, dev, reviewer, agent, outsider, feature };
}

let keyN = 0;

function makeItem(rig: Rig): WorkItem {
  keyN += 1;
  return rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey: `c-${keyN}`,
    title: `Collab fixture ${keyN}`,
    actorId: rig.po.id,
  });
}

/** Golden path to in_review under the DEV AGENT's own grants (no spec checkpoint). */
function agentDrivesToReview(rig: Rig, wi: WorkItem): Claim {
  rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
  rig.engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId: rig.po.id });
  const claim = rig.engine.claimTask({ workItemId: wi.id, actorId: rig.agent.id, ttlMs: 3_600_000 });
  rig.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: rig.agent.id, fencingToken: claim.fencingToken });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.agent.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'b0', final: 'f1', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` },
    },
  });
  rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: rig.agent.id, fencingToken: claim.fencingToken });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.agent.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'f1', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return claim;
}

function taskThread(rig: Rig, wi: WorkItem): Thread {
  return rig.engine.createThread({ actorId: rig.po.id, kind: 'task', featureId: rig.feature.id, workItemId: wi.id });
}

// ---------------------------------------------------------------------------
// §5.2 — the sacred boundary
// ---------------------------------------------------------------------------

describe('sacred boundary: chat never mutates lifecycle (roadmap §5.2)', () => {
  it('a message saying "approve" changes nothing — no transition, no state event', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    agentDrivesToReview(rig, wi);
    const thread = taskThread(rig, wi);
    const before = rig.engine.getWorkItem(wi.id);
    const eventsBefore = rig.engine
      .events(wi.id)
      .filter((e) => e.type === 'work_item.state_changed').length;

    rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.reviewer.id, // even a gate-holder!
      body: 'approve — LGTM, ship it',
    });

    const after = rig.engine.getWorkItem(wi.id);
    expect(after.state).toBe(before.state);
    expect(after.stateVersion).toBe(before.stateVersion);
    expect(
      rig.engine.events(wi.id).filter((e) => e.type === 'work_item.state_changed').length,
    ).toBe(eventsBefore);
  });

  it('mentions are structured input: "@Amelia" in body text alone creates no mention and no job', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const thread = taskThread(rig, wi);
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: '@Amelia please draft this', // text only — no structured mentions
    });
    expect(rig.engine.listMentions(message.id)).toEqual([]);
    expect(rig.engine.listAgentJobs({ agentActorId: rig.agent.id })).toEqual([]);
  });

  it('rails → chat narration: a state change appends a system message to the bound task thread', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const thread = taskThread(rig, wi);
    const fixtureActors = [rig.admin.id, rig.po.id, rig.dev.id, rig.reviewer.id, rig.agent.id, rig.outsider.id];

    rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });

    const messages = rig.engine.listMessages({ threadId: thread.id, actorId: rig.po.id });
    const narration = messages.filter((m) => m.kind === 'system');
    expect(narration.length).toBeGreaterThanOrEqual(1);
    const last = narration[narration.length - 1];
    expect(last?.body).toContain('draft');
    // narrated by the system actor, not by any fixture actor
    expect(fixtureActors).not.toContain(last?.authorId);
  });

  it('message seq is per-thread, 1-based and gap-free; author may be a user or an agent', () => {
    const rig = makeRig();
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    rig.engine.postMessage({ threadId: thread.id, actorId: rig.po.id, body: 'human speaking' });
    rig.engine.postMessage({ threadId: thread.id, actorId: rig.agent.id, body: 'agent speaking' });
    const messages = rig.engine.listMessages({ threadId: thread.id, actorId: rig.po.id });
    expect(messages.map((m) => m.seq)).toEqual(messages.map((_, i) => i + 1));
    expect(messages.map((m) => m.authorId)).toEqual([rig.po.id, rig.agent.id]);
  });
});

// ---------------------------------------------------------------------------
// §5.4 — the mention router (pure code, default-deny)
// ---------------------------------------------------------------------------

describe('mention router (roadmap §5.4)', () => {
  it('a role-holder mentioning an agent materializes a queued reply-only job + a notification', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const thread = taskThread(rig, wi);

    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'please pick this up',
      mentions: [rig.agent.id],
    });

    expect(rig.engine.listMentions(message.id)).toEqual([
      { messageId: message.id, mentionedActorId: rig.agent.id, resolution: 'job_created' },
    ]);
    const jobs = rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.threadId).toBe(thread.id);
    expect(jobs[0]?.workItemId).toBe(wi.id); // context only
    expect(jobs[0]?.depth).toBe(0);
    // reply-only: NO claim was created for the agent (§5.4 "claims are never pre-issued")
    expect(rig.engine.getClaims(wi.id)).toEqual([]);
    // the agent is notified
    const notifications = rig.engine.listNotifications({ actorId: rig.agent.id });
    expect(notifications.some((n) => n.source === 'mention' && n.refId === message.id)).toBe(true);
  });

  it('default-deny: a mentioner with NO delivery role gets resolution denied_policy and no job', () => {
    const rig = makeRig();
    const thread = rig.engine.createThread({ actorId: rig.outsider.id, kind: 'general' });
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.outsider.id,
      body: 'do my homework',
      mentions: [rig.agent.id],
    });
    expect(rig.engine.listMentions(message.id)).toEqual([
      { messageId: message.id, mentionedActorId: rig.agent.id, resolution: 'denied_policy' },
    ]);
    expect(rig.engine.listAgentJobs({ agentActorId: rig.agent.id })).toEqual([]);
  });

  it('mentionDispatch=false is a kill-switch even for role holders', () => {
    const rig = makeRig();
    rig.engine.setWorkspacePolicy({ policy: { mentionDispatch: false }, byActorId: rig.admin.id });
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'ping',
      mentions: [rig.agent.id],
    });
    expect(rig.engine.listMentions(message.id)[0]?.resolution).toBe('denied_policy');
    expect(rig.engine.listAgentJobs({})).toEqual([]);
  });

  it('mentioning a HUMAN notifies without creating a job', () => {
    const rig = makeRig();
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'your call',
      mentions: [rig.reviewer.id],
    });
    expect(rig.engine.listMentions(message.id)[0]?.resolution).toBe('notified');
    expect(rig.engine.listAgentJobs({})).toEqual([]);
    expect(
      rig.engine.listNotifications({ actorId: rig.reviewer.id }).some((n) => n.source === 'mention'),
    ).toBe(true);
  });

  it('agent-mention-agent requires explicit policy; default OFF', () => {
    const rig = makeRig();
    const second = rig.engine.createActor({ type: 'agent', displayName: 'Second agent' });
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    // the agent holds a delivery role (developer) — still denied without the policy
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.agent.id,
      body: 'colleague, take over',
      mentions: [second.id],
    });
    expect(rig.engine.listMentions(message.id)[0]?.resolution).toBe('denied_policy');

    rig.engine.setWorkspacePolicy({ policy: { agentMentionAgent: true }, byActorId: rig.admin.id });
    const allowed = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.agent.id,
      body: 'colleague, take over (policy on)',
      mentions: [second.id],
    });
    expect(rig.engine.listMentions(allowed.id)[0]?.resolution).toBe('job_created');
    const job = rig.engine.listAgentJobs({ agentActorId: second.id })[0];
    expect(job?.depth).toBe(1); // one agent hop
  });

  it(`agent-mention-agent chains are depth-capped at ${AGENT_JOB_MAX_DEPTH}`, () => {
    const rig = makeRig();
    rig.engine.setWorkspacePolicy({ policy: { agentMentionAgent: true }, byActorId: rig.admin.id });
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    // chain: agent0 -> agent1 -> agent2 -> agent3; each mention from an agent adds a hop
    const agents = [rig.agent];
    for (let i = 1; i <= AGENT_JOB_MAX_DEPTH + 1; i++) {
      agents.push(rig.engine.createActor({ type: 'agent', displayName: `chain-${i}` }));
    }
    let lastResolution: string | undefined;
    for (let i = 0; i < agents.length - 1; i++) {
      const from = agents[i];
      const to = agents[i + 1];
      if (!from || !to) throw new Error('fixture');
      const msg = rig.engine.postMessage({
        threadId: thread.id,
        actorId: from.id,
        body: `hop ${i}`,
        mentions: [to.id],
      });
      lastResolution = rig.engine.listMentions(msg.id)[0]?.resolution;
    }
    // hops 0→1 (depth 1) and 1→2 (depth 2) succeed; 2→3 would be depth 3 > cap → denied
    expect(lastResolution).toBe('denied_depth');
  });

  it('the mention path is independent of agentSelfDispatch (mention ≠ self-dispatch)', () => {
    const rig = makeRig();
    rig.engine.setWorkspacePolicy({ policy: { agentSelfDispatch: false }, byActorId: rig.admin.id });
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'ping',
      mentions: [rig.agent.id],
    });
    expect(rig.engine.listMentions(message.id)[0]?.resolution).toBe('job_created');
  });
});

// ---------------------------------------------------------------------------
// Agent jobs — reply-only, completed only by their agent
// ---------------------------------------------------------------------------

describe('agent jobs (roadmap §5.4)', () => {
  function jobFor(rig: Rig): { thread: Thread; jobId: string; messageId: string } {
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    const message = rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'over to you',
      mentions: [rig.agent.id],
    });
    const job = rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' })[0];
    if (!job) throw new Error('fixture: job not materialized');
    return { thread, jobId: job.id, messageId: message.id };
  }

  it('only the job’s agent may complete it', () => {
    const rig = makeRig();
    const { jobId } = jobFor(rig);
    expect(() =>
      rig.engine.completeAgentJob({ jobId, actorId: rig.dev.id, status: 'done' }),
    ).toThrow(PermissionDeniedError);
    const done = rig.engine.completeAgentJob({ jobId, actorId: rig.agent.id, status: 'done', note: 'replied in thread' });
    expect(done.status).toBe('done');
  });

  it('completion notifies the mentioner (the reverse @mention is a message, nothing more)', () => {
    const rig = makeRig();
    const { jobId } = jobFor(rig);
    rig.engine.completeAgentJob({ jobId, actorId: rig.agent.id, status: 'done' });
    expect(
      rig.engine.listNotifications({ actorId: rig.po.id }).some((n) => n.source === 'job_completed' && n.refId === jobId),
    ).toBe(true);
  });

  it('a completed job leaves lifecycle untouched — the audit shows zero gates passed by the job', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const thread = taskThread(rig, wi);
    rig.engine.postMessage({ threadId: thread.id, actorId: rig.po.id, body: 'go', mentions: [rig.agent.id] });
    const job = rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' })[0];
    if (!job) throw new Error('fixture');
    const before = rig.engine.getWorkItem(wi.id);
    rig.engine.completeAgentJob({ jobId: job.id, actorId: rig.agent.id, status: 'done' });
    const after = rig.engine.getWorkItem(wi.id);
    expect(after.state).toBe(before.state);
    expect(after.stateVersion).toBe(before.stateVersion);
  });
});

// ---------------------------------------------------------------------------
// Threads & visibility
// ---------------------------------------------------------------------------

describe('threads and private visibility (roadmap §5.1, §5.3)', () => {
  it('an open thread accepts posts from any actor; a private thread only from participants', () => {
    const rig = makeRig();
    const open = rig.engine.createThread({ actorId: rig.po.id, kind: 'design' });
    rig.engine.postMessage({ threadId: open.id, actorId: rig.outsider.id, body: 'drive-by comment' }); // ok

    const priv = rig.engine.createThread({ actorId: rig.po.id, kind: 'private', visibility: 'private' });
    expect(() =>
      rig.engine.postMessage({ threadId: priv.id, actorId: rig.outsider.id, body: 'let me in' }),
    ).toThrow(PermissionDeniedError);

    rig.engine.addThreadParticipant({ threadId: priv.id, actorId: rig.dev.id, byActorId: rig.po.id });
    const posted = rig.engine.postMessage({ threadId: priv.id, actorId: rig.dev.id, body: 'invited' });
    expect(posted.seq).toBeGreaterThanOrEqual(1);
  });

  it('reading a private thread requires participation', () => {
    const rig = makeRig();
    const priv = rig.engine.createThread({ actorId: rig.po.id, kind: 'private', visibility: 'private' });
    rig.engine.postMessage({ threadId: priv.id, actorId: rig.po.id, body: 'secret spec draft' });
    expect(() => rig.engine.listMessages({ threadId: priv.id, actorId: rig.outsider.id })).toThrow(
      PermissionDeniedError,
    );
    expect(rig.engine.listMessages({ threadId: priv.id, actorId: rig.po.id })).toHaveLength(1);
  });

  it('only participants (or the creator) may invite into a private thread', () => {
    const rig = makeRig();
    const priv = rig.engine.createThread({ actorId: rig.po.id, kind: 'private', visibility: 'private' });
    expect(() =>
      rig.engine.addThreadParticipant({ threadId: priv.id, actorId: rig.outsider.id, byActorId: rig.outsider.id }),
    ).toThrow(PermissionDeniedError);
  });

  it('threads are listable by feature and by work item', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const t1 = taskThread(rig, wi);
    rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    const byFeature = rig.engine.listThreads({ featureId: rig.feature.id });
    expect(byFeature.some((t) => t.id === t1.id)).toBe(true);
    const byItem = rig.engine.listThreads({ workItemId: wi.id });
    expect(byItem.map((t) => t.id)).toEqual([t1.id]);
  });

  it('bad references are rejected', () => {
    const rig = makeRig();
    expect(() =>
      rig.engine.createThread({ actorId: rig.po.id, kind: 'task', workItemId: 'wi_nope' }),
    ).toThrow(GuardFailedError);
    expect(() =>
      rig.engine.postMessage({ threadId: 'th_nope', actorId: rig.po.id, body: 'x' }),
    ).toThrow(GuardFailedError);
  });
});

// ---------------------------------------------------------------------------
// Exit-criterion shape (roadmap Build phases, Phase 3) — engine level
// ---------------------------------------------------------------------------

describe('exit criterion round-trip at engine level (roadmap Phase 3)', () => {
  it('PO mentions the dev agent; agent works through ITS OWN grants; human approves through the gate, not the chat', () => {
    const rig = makeRig();
    const wi = makeItem(rig);
    const thread = taskThread(rig, wi);

    // 1. PO mentions the dev agent in the task thread → job (reply-only).
    rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.po.id,
      body: 'please implement this story',
      mentions: [rig.agent.id],
    });
    const job = rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' })[0];
    expect(job?.workItemId).toBe(wi.id);

    // 2. The agent does the work through its own grants (claim → evidence → in_review).
    agentDrivesToReview(rig, wi);

    // 3. Agent completes the job and posts back, mentioning the PO (reverse mention = message + notification).
    rig.engine.completeAgentJob({ jobId: job!.id, actorId: rig.agent.id, status: 'done' });
    rig.engine.postMessage({
      threadId: thread.id,
      actorId: rig.agent.id,
      body: 'ready for review',
      mentions: [rig.po.id],
    });
    expect(rig.engine.getWorkItem(wi.id).state).toBe('in_review');

    // 4. The human approves THROUGH THE GATE — and the rails narrate into the thread.
    const done = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(done.state).toBe('done');
    const narration = rig.engine
      .listMessages({ threadId: thread.id, actorId: rig.po.id })
      .filter((m) => m.kind === 'system');
    expect(narration.some((m) => m.body.includes('done'))).toBe(true);
  });
});

describe('event egress visibility (roadmap §8)', () => {
  it("a non-participant cannot see a private thread's events; participant, auditor, and admin can", () => {
    const rig = makeRig();
    const auditor = rig.engine.createActor({
      type: 'user',
      displayName: 'Auditor',
      governanceRole: 'auditor',
    });

    const thread = rig.engine.createThread({
      actorId: rig.po.id,
      kind: 'private',
      visibility: 'private',
    });
    rig.engine.postMessage({ threadId: thread.id, actorId: rig.po.id, body: 'confidential' });

    const onThread = (actorId: string): number =>
      rig.engine.eventsVisibleTo(actorId).filter((e) => e.streamId === thread.id).length;

    // The outsider is neither a participant nor an auditor → sees nothing on the
    // private stream, not even the metadata that leaks its existence/author.
    expect(onThread(rig.outsider.id)).toBe(0);
    // Participant (creator), auditor, and governance admin all see the full trail.
    expect(onThread(rig.po.id)).toBeGreaterThan(0);
    expect(onThread(auditor.id)).toBeGreaterThan(0);
    expect(onThread(rig.admin.id)).toBeGreaterThan(0);

    // The per-event check the SSE relay uses agrees.
    const evt = rig.engine.events(thread.id)[0]!;
    expect(rig.engine.isEventVisibleTo(evt, rig.outsider.id)).toBe(false);
    expect(rig.engine.isEventVisibleTo(evt, rig.po.id)).toBe(true);
    expect(rig.engine.isEventVisibleTo(evt, auditor.id)).toBe(true);
  });

  it("an open thread's events are visible to everyone", () => {
    const rig = makeRig();
    const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    rig.engine.postMessage({ threadId: thread.id, actorId: rig.po.id, body: 'public' });
    const seen = rig.engine.eventsVisibleTo(rig.outsider.id).filter((e) => e.streamId === thread.id);
    expect(seen.length).toBeGreaterThan(0);
  });
});
