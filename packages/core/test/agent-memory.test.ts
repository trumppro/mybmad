/**
 * CONFORMANCE — Phase 5: agent memory & the learning-never-authority guardrail.
 *
 * Written BEFORE the implementation; all additive. Sources:
 *  - product-roadmap.md §6 — "Memory is server-side, scoped hard to the
 *    workspace … Recall filters by the visibility of the source context —
 *    nothing learned in a private thread surfaces in an open one. Learning
 *    never becomes authority or a mutation path — enforced by architecture,
 *    not prompts."
 *  - product-thesis.md — "Its learning makes the worker better, not more
 *    authorized. Authority comes only from an explicit grant — never from
 *    tenure, fluency, or accumulated memory."
 *
 * New pins (recorded in CONFORMANCE.md):
 *  - Memory is owned per agent actor; recall is caller-scoped by
 *    construction (no cross-actor parameter exists).
 *  - Only AGENT actors may hold memory.
 *  - Learning from a private thread requires having been a participant, and
 *    such memories surface only when recalled inside their source thread.
 *  - Memory events never carry content — private learning never leaks into
 *    the shared audit log.
 *  - No amount of memory changes any authz outcome.
 */
import {
  createEngine,
  GuardFailedError,
  PermissionDeniedError,
  type Actor,
  type SpineEngine,
  type Thread,
} from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  admin: Actor;
  po: Actor;
  agent: Actor;
  otherAgent: Actor;
}

function makeRig(): Rig {
  const engine = createEngine();
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  engine.assignRole({ actorId: po.id, roleCode: 'product_owner', byActorId: admin.id });
  const agent = engine.createActor({ type: 'agent', displayName: 'Teammate' });
  const otherAgent = engine.createActor({ type: 'agent', displayName: 'Other teammate' });
  return { engine, admin, po, agent, otherAgent };
}

function privateThreadWithAgent(rig: Rig): Thread {
  const thread = rig.engine.createThread({ actorId: rig.po.id, kind: 'private', visibility: 'private' });
  rig.engine.addThreadParticipant({ threadId: thread.id, actorId: rig.agent.id, byActorId: rig.po.id });
  return thread;
}

describe('ownership and scoping (roadmap §6)', () => {
  it('memory is per-agent: another actor’s recall never sees it — by construction', () => {
    const rig = makeRig();
    rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'entity', content: 'the PO prefers small PRs' });
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id })).toHaveLength(1);
    expect(rig.engine.searchAgentMemory({ actorId: rig.otherAgent.id })).toEqual([]);
  });

  it('only agent actors hold memory', () => {
    const rig = makeRig();
    expect(() =>
      rig.engine.appendAgentMemory({ actorId: rig.po.id, kind: 'episodic', content: 'humans have their own notebooks' }),
    ).toThrow(GuardFailedError);
  });

  it('seq is per-agent, 1-based, in append order; kind and query filter recall', () => {
    const rig = makeRig();
    rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'episodic', content: 'ran story c-1' });
    rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'procedural', content: 'pin verification before push' });
    rig.engine.appendAgentMemory({ actorId: rig.otherAgent.id, kind: 'episodic', content: 'unrelated' });
    const all = rig.engine.searchAgentMemory({ actorId: rig.agent.id });
    expect(all.map((m) => m.seq)).toEqual([1, 2]);
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id, kind: 'procedural' })).toHaveLength(1);
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id, query: 'verification' })).toHaveLength(1);
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id, query: 'nonexistent' })).toEqual([]);
  });
});

describe('source-visibility recall filter (roadmap §6)', () => {
  it('learning from a private thread requires participation', () => {
    const rig = makeRig();
    const priv = rig.engine.createThread({ actorId: rig.po.id, kind: 'private', visibility: 'private' });
    expect(() =>
      rig.engine.appendAgentMemory({
        actorId: rig.agent.id,
        kind: 'episodic',
        content: 'overheard something',
        sourceThreadId: priv.id,
      }),
    ).toThrow(PermissionDeniedError);
  });

  it('nothing learned in a private thread surfaces in an open context', () => {
    const rig = makeRig();
    const priv = privateThreadWithAgent(rig);
    const open = rig.engine.createThread({ actorId: rig.po.id, kind: 'general' });
    rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'entity',
      content: 'the secret launch date is May 5',
      sourceThreadId: priv.id,
    });
    rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'entity', content: 'public fact' });

    // no context, or an open-thread context: the private-sourced memory is invisible
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id }).map((m) => m.content)).toEqual(['public fact']);
    expect(
      rig.engine.searchAgentMemory({ actorId: rig.agent.id, contextThreadId: open.id }).map((m) => m.content),
    ).toEqual(['public fact']);

    // inside its source thread, it surfaces
    const inSource = rig.engine.searchAgentMemory({ actorId: rig.agent.id, contextThreadId: priv.id });
    expect(inSource.map((m) => m.content).sort()).toEqual(['public fact', 'the secret launch date is May 5'].sort());
  });

  it('open-sourced memories carry their source and surface everywhere', () => {
    const rig = makeRig();
    const open = rig.engine.createThread({ actorId: rig.po.id, kind: 'design' });
    const memory = rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'episodic',
      content: 'design decision: SSE over WebSocket',
      sourceThreadId: open.id,
    });
    expect(memory.sourceVisibility).toBe('open');
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id })).toHaveLength(1);
  });
});

describe('learning never becomes authority (thesis; roadmap §6)', () => {
  it('a memory-rich agent is not one grant richer', () => {
    const rig = makeRig();
    for (let i = 0; i < 50; i++) {
      rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'procedural', content: `lesson ${i}` });
    }
    for (const permission of ['gate.review.approve', 'gate.review.reject', 'task.claim', 'task.advance'] as const) {
      expect(rig.engine.authzExplain({ actorId: rig.agent.id, permission }).allowed).toBe(false);
    }
    // and the deterministic check agrees with the trace
    const feature = rig.engine.createFeature({ actorId: rig.po.id });
    const wi = rig.engine.createWorkItem({
      featureId: feature.id,
      externalKey: 'mem-1',
      title: 'Memory grants nothing',
      actorId: rig.po.id,
    });
    expect(() => rig.engine.claimTask({ workItemId: wi.id, actorId: rig.agent.id })).toThrow(PermissionDeniedError);
  });

  it('memory events never carry content — private learning stays out of the shared audit log', () => {
    const rig = makeRig();
    const priv = privateThreadWithAgent(rig);
    const before = rig.engine.events().length;
    rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'entity',
      content: 'SECRET-CONTENT-MARKER',
      sourceThreadId: priv.id,
    });
    const appended = rig.engine.events().slice(before);
    expect(appended.length).toBeGreaterThanOrEqual(1);
    for (const event of appended) {
      expect(JSON.stringify(event.payload)).not.toContain('SECRET-CONTENT-MARKER');
    }
  });
});
