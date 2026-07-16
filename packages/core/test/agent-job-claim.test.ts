/**
 * Conformance suite — atomic agent-job claim (roadmap §9.5).
 *
 * A router-materialized agent job is claimed under a lease before it is served:
 * queued → in_progress is a compare-and-set, so two jobs loops on ONE queue
 * post exactly one reply (the loser gets ConflictError). Only the job's own
 * agent may claim; once claimed, only the claimer completes; an EXPIRED claim
 * frees the job back to queued (lazy, on read — the reaper generalizes in 10.4).
 */
import {
  AGENT_JOB_CLAIM_TTL_MS,
  createEngine,
  type Actor,
  type AgentJob,
  type Message,
  type SpineEngine,
} from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  admin: Actor;
  po: Actor; // product_owner role → may invoke agents
  agent: Actor; // the job's agent
  agent2: Actor; // a DIFFERENT agent
}

function makeRig(): Rig {
  const engine = createEngine();
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  const agent = engine.createActor({ type: 'agent', displayName: 'Amelia' });
  const agent2 = engine.createActor({ type: 'agent', displayName: 'Bob' });
  engine.assignRole({ actorId: po.id, roleCode: 'product_owner', byActorId: admin.id });
  return { engine, admin, po, agent, agent2 };
}

/** Materialize a queued mention job for rig.agent; returns the job. */
function materializeJob(rig: Rig): AgentJob {
  const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
  const message: Message = rig.engine.postMessage({
    threadId: thread.id,
    actorId: rig.po.id,
    body: 'please help',
    mentions: [rig.agent.id],
  });
  void message;
  const jobs = rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' });
  expect(jobs).toHaveLength(1);
  return jobs[0]!;
}

describe('atomic agent-job claim (roadmap §9.5)', () => {
  it('claim moves queued → in_progress under the agent’s lease', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    const claimed = rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    expect(claimed.status).toBe('in_progress');
    expect(claimed.claimedBy).toBe(rig.agent.id);
    expect(claimed.claimExpiresAt).toBeGreaterThan(0);
    // No longer visible to a queued poll.
    expect(rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'queued' })).toHaveLength(0);
    expect(rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'in_progress' })).toHaveLength(1);
  });

  it('a second claim on a live claimed job is a ConflictError (the race loser)', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    expect(() => rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id })).toThrow(
      /already claimed|conflict/i,
    );
  });

  it('only the job’s own agent may claim it', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    expect(() => rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent2.id })).toThrow(
      /permission|denied/i,
    );
  });

  it('complete requires the job’s agent; a different agent cannot complete', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    expect(() =>
      rig.engine.completeAgentJob({ jobId: job.id, actorId: rig.agent2.id, status: 'done' }),
    ).toThrow(/permission|denied/i);
    const done = rig.engine.completeAgentJob({ jobId: job.id, actorId: rig.agent.id, status: 'done' });
    expect(done.status).toBe('done');
  });

  it('an EXPIRED claim frees the job back to queued (lazy on read), and it can be re-claimed', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    expect(rig.engine.listAgentJobs({ status: 'queued', agentActorId: rig.agent.id })).toHaveLength(0);
    // Advance past the lease — the claim lapses.
    rig.engine.advanceClock(AGENT_JOB_CLAIM_TTL_MS + 1);
    const queued = rig.engine.listAgentJobs({ status: 'queued', agentActorId: rig.agent.id });
    expect(queued).toHaveLength(1); // reads back as queued
    // A fresh claim succeeds (the lapsed lease is reclaimable).
    const reclaimed = rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    expect(reclaimed.status).toBe('in_progress');
  });

  it('a custom claim ttlMs sizes the lease so it outlasts a long run (no mid-run lapse)', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    // The runner sizes the lease to agentTimeout + margin; simulate a lease
    // comfortably longer than the default TTL.
    rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id, ttlMs: AGENT_JOB_CLAIM_TTL_MS * 3 });
    // Past the DEFAULT TTL but within the sized lease: still claimed, NOT
    // re-claimable — a second loop cannot re-open the job mid-run.
    rig.engine.advanceClock(AGENT_JOB_CLAIM_TTL_MS + 1);
    expect(rig.engine.listAgentJobs({ agentActorId: rig.agent.id, status: 'in_progress' })).toHaveLength(1);
    expect(() => rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id })).toThrow(
      /already claimed|conflict/i,
    );
  });

  it('a completed job is not claimable and not re-completable', () => {
    const rig = makeRig();
    const job = materializeJob(rig);
    rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id });
    rig.engine.completeAgentJob({ jobId: job.id, actorId: rig.agent.id, status: 'done' });
    expect(() => rig.engine.claimAgentJob({ jobId: job.id, actorId: rig.agent.id })).toThrow(
      /already claimed|conflict/i,
    );
    expect(() =>
      rig.engine.completeAgentJob({ jobId: job.id, actorId: rig.agent.id, status: 'blocked' }),
    ).toThrow(/already/i);
  });
});
