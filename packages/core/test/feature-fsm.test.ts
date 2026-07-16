/**
 * Conformance suite — the FEATURE finite-state machine (roadmap §9, PR 9.1).
 *
 * The department handoff as gate-fired feature states:
 *   backlog → spec → design → breakdown → executing → handoff → done
 * plus `cancelled` (terminal) reachable from every non-terminal state via the
 * privileged `feature.cancel`. Two arrows are gate firings, the rest are
 * permitted `feature_advance`:
 *   - design → breakdown  fires on approve(design_approval); reject loops design → spec
 *   - handoff → done      fires on approve(handoff_approval); reject loops handoff → executing
 *
 * Board vocabulary (portal parity) is a PRESENTATION map over these states, not
 * new states: "In TDD" is the test-first checkpoint modelled as the `tests_pinned`
 * entry-guard on design → breakdown (the pinned verification commands — the tests
 * authored there — must exist, D7). `executing → handoff` carries `children_done`.
 *
 * The pre-existing epic-lift projector (backlog → executing) is the DEGENERATE
 * path: a feature that never walks the gated FSM is still lifted when its first
 * child leaves backlog, and feature gates never block task-level work.
 */
import {
  createEngine,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type SpineEvent,
  type WorkItem,
} from '../src/index.js';

const PINNED = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  po: Actor; // product owner: feature.advance, gate.handoff.approve, feature.cancel, + work-item plumbing
  tl: Actor; // tech lead: gate.design.approve
  outsider: Actor; // no grants — the denial actor
  feature: Feature;
}

function makeRig(): Rig {
  const engine = createEngine();
  // Governance admin so the rig can set gate policies; delivery permissions are
  // still granted explicitly below (admin ≠ holding gate.design.approve etc.).
  const po = engine.createActor({ type: 'user', displayName: 'Product Owner', governanceRole: 'admin' });
  const tl = engine.createActor({ type: 'user', displayName: 'Tech Lead' });
  const outsider = engine.createActor({ type: 'user', displayName: 'Outsider' });
  for (const permission of [
    'feature.init',
    'feature.advance',
    'feature.cancel',
    'gate.handoff.approve',
    'gate.spec.approve',
    'gate.review.approve',
    'task.plan',
    'task.claim',
    'task.advance',
  ] as const) {
    engine.grant({ actorId: po.id, permission });
  }
  engine.grant({ actorId: tl.id, permission: 'gate.design.approve' });
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, po, tl, outsider, feature };
}

function state(rig: Rig): string {
  return rig.engine.getFeature(rig.feature.id).state;
}

/** Drive a fresh story of the feature all the way to `done` (pins verification). */
function driveStoryToDone(rig: Rig, externalKey: string): WorkItem {
  const wi = rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey,
    title: `Story ${externalKey}`,
    actorId: rig.po.id,
  });
  rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
  rig.engine.approveGate({
    workItemId: wi.id,
    gate: 'spec_approval',
    actorId: rig.po.id,
    pinnedVerification: PINNED,
  });
  const claim: Claim = rig.engine.claimTask({ workItemId: wi.id, actorId: rig.po.id });
  rig.engine.advanceState({
    workItemId: wi.id,
    to: 'in_progress',
    actorId: rig.po.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.po.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'a', final: 'b', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` },
    },
  });
  rig.engine.advanceState({
    workItemId: wi.id,
    to: 'in_review',
    actorId: rig.po.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.po.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
  });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.po.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'b', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.po.id });
}

/** Feature to `design` via the two planning advances (no children needed yet). */
function toDesign(rig: Rig): void {
  rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'spec', actorId: rig.po.id });
  rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'design', actorId: rig.po.id });
}

/** Feature to `handoff`: design → breakdown (gate, needs a done story) → executing → handoff. */
function toHandoff(rig: Rig): void {
  toDesign(rig);
  driveStoryToDone(rig, 'h-1'); // pins verification AND is done (both guards satisfied)
  rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
  rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'executing', actorId: rig.po.id });
  rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id });
}

const events = (rig: Rig): SpineEvent[] => rig.engine.events();
const featureEvents = (rig: Rig): SpineEvent[] =>
  events(rig).filter((e) => e.streamType === 'feature' && e.streamId === rig.feature.id);

// ---------------------------------------------------------------------------

describe('feature FSM — states, gates, guards (roadmap §9)', () => {
  it('a new feature starts in backlog', () => {
    const rig = makeRig();
    expect(state(rig)).toBe('backlog');
  });

  it('walks backlog→spec→design→breakdown→executing→handoff→done, every arrow an advance or a gate', () => {
    const rig = makeRig();
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'spec', actorId: rig.po.id });
    expect(state(rig)).toBe('spec');
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'design', actorId: rig.po.id });
    expect(state(rig)).toBe('design');
    driveStoryToDone(rig, '1'); // author + finish the test-first story
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
    expect(state(rig)).toBe('breakdown');
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'executing', actorId: rig.po.id });
    expect(state(rig)).toBe('executing');
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id });
    expect(state(rig)).toBe('handoff');
    const done = rig.engine.approveFeatureGate({
      featureId: rig.feature.id,
      gate: 'handoff_approval',
      actorId: rig.po.id,
    });
    expect(done.state).toBe('done');
  });

  // -- denials --------------------------------------------------------------

  it('feature_advance without feature.advance is denied', () => {
    const rig = makeRig();
    expect(() =>
      rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'spec', actorId: rig.outsider.id }),
    ).toThrow(/permission|denied/i);
    expect(state(rig)).toBe('backlog');
  });

  it('design_approval without gate.design.approve is denied (pins nothing)', () => {
    const rig = makeRig();
    toDesign(rig);
    driveStoryToDone(rig, 'd-1');
    expect(() =>
      rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.po.id }),
    ).toThrow(/permission|denied/i);
    expect(state(rig)).toBe('design');
  });

  it('handoff_approval without gate.handoff.approve is denied', () => {
    const rig = makeRig();
    toHandoff(rig);
    expect(() =>
      rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.tl.id }),
    ).toThrow(/permission|denied/i);
    expect(state(rig)).toBe('handoff');
  });

  it('feature.cancel without the grant is denied', () => {
    const rig = makeRig();
    expect(() =>
      rig.engine.cancelFeature({ featureId: rig.feature.id, actorId: rig.outsider.id }),
    ).toThrow(/permission|denied/i);
    expect(state(rig)).toBe('backlog');
  });

  // -- rejection loopbacks (system-fired, causation) ------------------------

  it('rejecting design_approval loops design → spec, system-authored with causation', () => {
    const rig = makeRig();
    toDesign(rig);
    driveStoryToDone(rig, 'r-1');
    rig.engine.rejectFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
    expect(state(rig)).toBe('spec');
    const fe = featureEvents(rig);
    const rejected = fe.find((e) => e.type === 'gate.rejected');
    const loopback = [...fe].reverse().find((e) => e.type === 'feature.state_changed');
    expect(rejected).toBeDefined();
    expect(loopback?.payload).toMatchObject({ from: 'design', to: 'spec' });
    expect(loopback?.actorId).not.toBe(rig.tl.id); // system actor authored the loopback
    expect(loopback?.actorId).not.toBe(rig.po.id);
    expect(loopback?.causationId).toBe(String(rejected?.globalSeq));
  });

  it('rejecting handoff_approval loops handoff → executing, system-authored with causation', () => {
    const rig = makeRig();
    toHandoff(rig);
    rig.engine.rejectFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.po.id });
    expect(state(rig)).toBe('executing');
    const fe = featureEvents(rig);
    const rejected = [...fe].reverse().find((e) => e.type === 'gate.rejected');
    const loopback = [...fe].reverse().find((e) => e.type === 'feature.state_changed');
    expect(loopback?.payload).toMatchObject({ from: 'handoff', to: 'executing' });
    expect(loopback?.causationId).toBe(String(rejected?.globalSeq));
  });

  // -- cancel: privileged, from every non-terminal state --------------------

  it('cancel is reachable from every non-terminal state and appends a compensating feature.cancelled', () => {
    for (const target of ['backlog', 'spec', 'design', 'breakdown', 'executing', 'handoff'] as const) {
      const rig = makeRig();
      const advance = (to: string): void =>
        void rig.engine.featureAdvance({ featureId: rig.feature.id, to: to as never, actorId: rig.po.id });
      // Walk exactly to `target` (stopping there, not overshooting).
      const past = (s: string): boolean =>
        ['spec', 'design', 'breakdown', 'executing', 'handoff'].indexOf(target) >=
        ['spec', 'design', 'breakdown', 'executing', 'handoff'].indexOf(s);
      if (past('spec')) advance('spec');
      if (past('design')) advance('design');
      if (past('breakdown')) {
        driveStoryToDone(rig, `c-${target}`);
        rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
      }
      if (past('executing')) advance('executing');
      if (past('handoff')) advance('handoff');
      expect(state(rig)).toBe(target);
      const cancelled = rig.engine.cancelFeature({ featureId: rig.feature.id, actorId: rig.po.id });
      expect(cancelled.state).toBe('cancelled');
      const ev = featureEvents(rig).find((e) => e.type === 'feature.cancelled');
      expect(ev).toBeDefined();
      expect(ev?.payload).toMatchObject({ from: target });
    }
  });

  it('done and cancelled are terminal — no advance out, and cancel refuses them', () => {
    const rig = makeRig();
    // done
    toHandoff(rig);
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.po.id });
    expect(state(rig)).toBe('done');
    expect(() =>
      rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id }),
    ).toThrow(/transition/i);
    expect(() => rig.engine.cancelFeature({ featureId: rig.feature.id, actorId: rig.po.id })).toThrow(
      /terminal|cancel/i,
    );
    // cancelled
    const rig2 = makeRig();
    rig2.engine.cancelFeature({ featureId: rig2.feature.id, actorId: rig2.po.id });
    expect(() =>
      rig2.engine.featureAdvance({ featureId: rig2.feature.id, to: 'spec', actorId: rig2.po.id }),
    ).toThrow(/transition/i);
    expect(() => rig2.engine.cancelFeature({ featureId: rig2.feature.id, actorId: rig2.po.id })).toThrow(
      /terminal|cancel/i,
    );
  });

  it('done is reachable ONLY through the handoff gate — direct advance to done is undefined', () => {
    const rig = makeRig();
    toHandoff(rig);
    expect(() =>
      rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'done', actorId: rig.po.id }),
    ).toThrow(/transition/i);
    expect(state(rig)).toBe('handoff');
  });

  it('skipping states is an invalid transition (only the projector jumps backlog→executing)', () => {
    const rig = makeRig();
    expect(() =>
      rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'executing', actorId: rig.po.id }),
    ).toThrow(/transition/i);
  });

  // -- In-TDD checkpoint (tests_pinned) -------------------------------------

  it('design_approval fails the In-TDD checkpoint when no verification is pinned', () => {
    const rig = makeRig();
    toDesign(rig); // no story authored → nothing pinned
    expect(() =>
      rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id }),
    ).toThrow(/tdd|pinned|tests/i);
    expect(state(rig)).toBe('design');
  });

  // -- children_done guard on handoff (9.2 seam, enforced here) --------------

  it('executing → handoff is refused while a child is not done, allowed once all are', () => {
    const rig = makeRig();
    toDesign(rig);
    driveStoryToDone(rig, 'done-1');
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'executing', actorId: rig.po.id });
    // Add a NOT-done child.
    const open = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: 'open-1',
      title: 'still open',
      actorId: rig.po.id,
    });
    expect(() =>
      rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id }),
    ).toThrow(/done/i);
    // Finishing it unblocks the handoff.
    rig.engine.advanceState({ workItemId: open.id, to: 'draft', actorId: rig.po.id });
    rig.engine.approveGate({
      workItemId: open.id,
      gate: 'spec_approval',
      actorId: rig.po.id,
      pinnedVerification: PINNED,
    });
    const claim = rig.engine.claimTask({ workItemId: open.id, actorId: rig.po.id });
    rig.engine.advanceState({
      workItemId: open.id,
      to: 'in_progress',
      actorId: rig.po.id,
      fencingToken: claim.fencingToken,
    });
    rig.engine.submitEvidence({
      workItemId: open.id,
      actorId: rig.po.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'git_diff', payload: { baseline: 'a', final: 'b', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` } },
    });
    rig.engine.advanceState({
      workItemId: open.id,
      to: 'in_review',
      actorId: rig.po.id,
      fencingToken: claim.fencingToken,
    });
    rig.engine.submitEvidence({
      workItemId: open.id,
      actorId: rig.po.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
    });
    rig.engine.submitEvidence({
      workItemId: open.id,
      actorId: rig.po.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'commit', payload: { sha: 'b', branch: `claim/${claim.id}`, reachableOnRemote: true } },
    });
    rig.engine.approveGate({ workItemId: open.id, gate: 'review_approval', actorId: rig.po.id });
    const handoff = rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id });
    expect(handoff.state).toBe('handoff');
  });

  // -- degenerate / back-compat ---------------------------------------------

  it('epic-lift lifts a backlog feature to executing when its first child leaves backlog', () => {
    const rig = makeRig();
    const wi = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: 'e-1',
      title: 'first child',
      actorId: rig.po.id,
    });
    expect(state(rig)).toBe('backlog');
    rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
    expect(state(rig)).toBe('executing'); // renamed from in_progress (§9)
    const lift = featureEvents(rig).find(
      (e) => e.type === 'feature.state_changed' && e.payload['to'] === 'executing',
    );
    expect(lift?.payload).toMatchObject({ from: 'backlog', to: 'executing' });
    expect(lift?.actorId).not.toBe(rig.po.id); // system-authored
  });

  it('feature gates never block task-level work that is already flowing (degenerate path)', () => {
    const rig = makeRig();
    // Feature stays on the degenerate path (never formally spec/design gated);
    // a story runs its full lifecycle regardless of the feature FSM.
    const done = driveStoryToDone(rig, 'flow-1');
    expect(done.state).toBe('done');
    expect(state(rig)).toBe('executing'); // lifted by the projector, not the gates
  });

  // -- gate policy is data ---------------------------------------------------

  it('gate policies apply to the feature gate codes (quorum of 2 on design_approval)', () => {
    const rig = makeRig();
    const tl2 = rig.engine.createActor({ type: 'user', displayName: 'Second Lead' });
    rig.engine.grant({ actorId: tl2.id, permission: 'gate.design.approve' });
    rig.engine.setGatePolicy({ gate: 'design_approval', policy: { minApprovals: 2 }, byActorId: rig.po.id });
    toDesign(rig);
    driveStoryToDone(rig, 'q-1');
    // First approval records but does not fire (quorum pending).
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: rig.tl.id });
    expect(state(rig)).toBe('design');
    // Second distinct approver completes the quorum.
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'design_approval', actorId: tl2.id });
    expect(state(rig)).toBe('breakdown');
  });

  it('a handoff rejection resets the quorum round so stale approvals do not carry over', () => {
    const rig = makeRig();
    rig.engine.setGatePolicy({ gate: 'handoff_approval', policy: { minApprovals: 2 }, byActorId: rig.po.id });
    const po2 = rig.engine.createActor({ type: 'user', displayName: 'Second PO' });
    rig.engine.grant({ actorId: po2.id, permission: 'gate.handoff.approve' });
    toHandoff(rig);
    // Round 0: one approval (quorum pending), then a rejection loops to executing.
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.po.id });
    expect(state(rig)).toBe('handoff');
    rig.engine.rejectFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.po.id });
    expect(state(rig)).toBe('executing');
    // Back to handoff (round 1): the round-0 approval must NOT count.
    rig.engine.featureAdvance({ featureId: rig.feature.id, to: 'handoff', actorId: rig.po.id });
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: rig.po.id });
    expect(state(rig)).toBe('handoff'); // still only one approval this round
    rig.engine.approveFeatureGate({ featureId: rig.feature.id, gate: 'handoff_approval', actorId: po2.id });
    expect(state(rig)).toBe('done');
  });
});
