/**
 * Conformance suite — agent memory scoped per project (Phase 7 Wave 2, D-H).
 *
 * On a shared server, project A's lessons must not color replies in project
 * B — but craft (how to review, how to verify) is the operator's to share.
 * Pins:
 *  - a memory may carry a projectId (null = GLOBAL craft);
 *  - recall scoped to a project returns that project's memories + global,
 *    never a sibling project's;
 *  - unscoped recall keeps its exact Phase-5 meaning (all owner memories);
 *  - owner-scoping and the private-source filter (§6) compose unchanged.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, type Actor, type Project, type SpineEngine } from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  po: Actor;
  agent: Actor;
  alpha: Project;
  beta: Project;
}

function makeRig(): Rig {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  const agent = engine.createActor({ type: 'agent', displayName: 'Teammate' });
  engine.grant({ actorId: po.id, permission: 'feature.init' });
  const alpha = engine.createProject({ actorId: po.id, name: 'Alpha' });
  const beta = engine.createProject({ actorId: po.id, name: 'Beta' });
  return { engine, po, agent, alpha, beta };
}

describe('memory — per-project scope with a global (operator-wide) tier', () => {
  it('scoped recall = that project + global; a sibling project never leaks in', () => {
    const rig = makeRig();
    const a = rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'episodic',
      content: 'alpha uses feature flags for rollout',
      projectId: rig.alpha.id,
    });
    const b = rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'episodic',
      content: 'beta is a docs-only repo',
      projectId: 'beta', // slug resolves here too
    });
    const g = rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'procedural',
      content: 'always run the pinned verification before requesting review',
    });
    expect(a.projectId).toBe(rig.alpha.id);
    expect(b.projectId).toBe(rig.beta.id);
    expect(g.projectId).toBeNull();

    const inAlpha = rig.engine.searchAgentMemory({ actorId: rig.agent.id, projectId: rig.alpha.id });
    expect(inAlpha.map((m) => m.id).sort()).toEqual([a.id, g.id].sort());

    const inBeta = rig.engine.searchAgentMemory({ actorId: rig.agent.id, projectId: 'beta' });
    expect(inBeta.map((m) => m.id).sort()).toEqual([b.id, g.id].sort());
  });

  it('UNSCOPED recall keeps its Phase-5 meaning: every owner memory, project or not', () => {
    const rig = makeRig();
    rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'episodic',
      content: 'alpha memory',
      projectId: rig.alpha.id,
    });
    rig.engine.appendAgentMemory({ actorId: rig.agent.id, kind: 'procedural', content: 'craft' });
    expect(rig.engine.searchAgentMemory({ actorId: rig.agent.id })).toHaveLength(2);
  });

  it('owner-scoping and the private-source filter compose unchanged with projectId', () => {
    const rig = makeRig();
    const other = rig.engine.createActor({ type: 'agent', displayName: 'Other agent' });
    const priv = rig.engine.createThread({
      actorId: rig.po.id,
      kind: 'private',
      visibility: 'private',
    });
    rig.engine.addThreadParticipant({
      threadId: priv.id,
      actorId: rig.agent.id,
      byActorId: rig.po.id,
    });
    const secret = rig.engine.appendAgentMemory({
      actorId: rig.agent.id,
      kind: 'episodic',
      content: 'private alpha context',
      sourceThreadId: priv.id,
      projectId: rig.alpha.id,
    });

    // Another agent sees nothing of it (owner scope).
    expect(
      rig.engine.searchAgentMemory({ actorId: other.id, projectId: rig.alpha.id }),
    ).toEqual([]);
    // The owner, in the right project but OUTSIDE the source thread: hidden.
    expect(
      rig.engine
        .searchAgentMemory({ actorId: rig.agent.id, projectId: rig.alpha.id })
        .map((m) => m.id),
    ).not.toContain(secret.id);
    // Inside the source thread: visible.
    expect(
      rig.engine
        .searchAgentMemory({
          actorId: rig.agent.id,
          projectId: rig.alpha.id,
          contextThreadId: priv.id,
        })
        .map((m) => m.id),
    ).toContain(secret.id);
  });
});
