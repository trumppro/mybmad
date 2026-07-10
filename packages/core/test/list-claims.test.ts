/**
 * Conformance suite — listClaims (Phase 7 "Cockpit", Wave 1).
 *
 * "What is being worked on RIGHT NOW?" had no query: getClaims() is
 * per-work-item, so an operator had to know every id before asking. This
 * pins the workspace-wide claims view the ops CLI and cockpit UI stand on.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, type Actor, type Feature, type SpineEngine, type WorkItem } from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  planner: Actor;
  dev: Actor;
  feature: Feature;
  a: WorkItem;
  b: WorkItem;
}

function makeRig(): Rig {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  const feature = engine.createFeature({ actorId: planner.id });
  const a = engine.createWorkItem({
    featureId: feature.id,
    actorId: planner.id,
    externalKey: 'lc-a',
    title: 'claims view a',
  });
  const b = engine.createWorkItem({
    featureId: feature.id,
    actorId: planner.id,
    externalKey: 'lc-b',
    title: 'claims view b',
  });
  return { engine, planner, dev, feature, a, b };
}

describe('listClaims — the workspace-wide claims view', () => {
  it('returns LIVE claims across all work items by default, each carrying its workItemId', () => {
    const rig = makeRig();
    const claimA = rig.engine.claimTask({ workItemId: rig.a.id, actorId: rig.dev.id });
    const claimB = rig.engine.claimTask({ workItemId: rig.b.id, actorId: rig.dev.id });

    const live = rig.engine.listClaims();
    expect(live.map((c) => c.id).sort()).toEqual([claimA.id, claimB.id].sort());
    expect(live.every((c) => !c.released)).toBe(true);
    expect(live.map((c) => c.workItemId).sort()).toEqual([rig.a.id, rig.b.id].sort());

    rig.engine.releaseClaim({ claimId: claimA.id });
    const after = rig.engine.listClaims();
    expect(after.map((c) => c.id)).toEqual([claimB.id]);
  });

  it('includeReleased: true is the history view (released claims come back)', () => {
    const rig = makeRig();
    const claimA = rig.engine.claimTask({ workItemId: rig.a.id, actorId: rig.dev.id });
    rig.engine.releaseClaim({ claimId: claimA.id });

    expect(rig.engine.listClaims()).toEqual([]);
    const all = rig.engine.listClaims({ includeReleased: true });
    expect(all.map((c) => c.id)).toEqual([claimA.id]);
    expect(all[0]!.released).toBe(true);
  });

  it('listEvidence returns a work item’s raw evidence in submission order (the detail view’s source)', () => {
    const rig = makeRig();
    rig.engine.grant({ actorId: rig.dev.id, permission: 'task.advance' });
    const claim = rig.engine.claimTask({ workItemId: rig.a.id, actorId: rig.dev.id });
    rig.engine.submitEvidence({
      workItemId: rig.a.id,
      actorId: rig.dev.id,
      evidence: { kind: 'halt_report', payload: { status: 'done', agentLogPath: '/l/x.log' } },
      fencingToken: claim.fencingToken,
    });
    rig.engine.submitEvidence({
      workItemId: rig.a.id,
      actorId: rig.dev.id,
      evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
      fencingToken: claim.fencingToken,
    });

    const evidence = rig.engine.listEvidence(rig.a.id);
    expect(evidence.map((e) => e.kind)).toEqual(['halt_report', 'test_run']);
    expect(evidence[0]!.payload['agentLogPath']).toBe('/l/x.log');
    // Handle resolution works here too, and other items see nothing.
    expect(rig.engine.listEvidence('lc-b')).toEqual([]);
  });

  it('marks EXPIRED leases: unreleased but past TTL by the ENGINE clock (both modes)', () => {
    const rig = makeRig();
    rig.engine.claimTask({ workItemId: rig.a.id, actorId: rig.dev.id, ttlMs: 100 });
    expect(rig.engine.listClaims()[0]!.expired).toBe(false);

    // The logical clock decides — the same computation a wall-clock engine
    // does against real time, so the view is correct in BOTH modes.
    rig.engine.advanceClock(200);
    const after = rig.engine.listClaims();
    expect(after).toHaveLength(1); // dead-but-unreleased is exactly what ops must SEE
    expect(after[0]!.expired).toBe(true);
  });
});
