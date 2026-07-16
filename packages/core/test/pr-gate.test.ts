/**
 * Conformance suite — the done gate can require a merged PR (roadmap §9.6).
 *
 * `pr` is machine-collected evidence (the runner opens the PR; the runner/CLI
 * measure its merge state); the core JUDGES. Gate-policy DATA decides whether
 * the done gate additionally requires the latest `pr` evidence to be a merge
 * into the default branch — never a hardcode. Off → behavior is exactly the
 * pre-9.6 evidence check.
 */
import { createEngine, type Actor, type Claim, type SpineEngine, type WorkItem } from '../src/index.js';

const PINNED = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  po: Actor; // planning + spec approval + governance admin (set_gate_policy)
  dev: Actor;
  reviewer: Actor;
  item: WorkItem;
}

function makeRig(): Rig {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'PO', governanceRole: 'admin' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  for (const p of ['task.plan', 'task.claim', 'task.advance', 'gate.spec.approve'] as const) {
    engine.grant({ actorId: po.id, permission: p });
  }
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  const feature = engine.createFeature({ actorId: po.id });
  const item = engine.createWorkItem({ featureId: feature.id, externalKey: 'p-1', title: 'PR gate', actorId: po.id });
  return { engine, po, dev, reviewer, item };
}

/** Drive to in_review with the full done-gate evidence EXCEPT the pr evidence. */
function toReviewableWithEvidence(rig: Rig): Claim {
  rig.engine.advanceState({ workItemId: rig.item.id, to: 'draft', actorId: rig.po.id });
  rig.engine.approveGate({ workItemId: rig.item.id, gate: 'spec_approval', actorId: rig.po.id, pinnedVerification: PINNED });
  const claim = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id });
  rig.engine.advanceState({ workItemId: rig.item.id, to: 'in_progress', actorId: rig.dev.id, fencingToken: claim.fencingToken });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'git_diff', payload: { baseline: 'a', final: 'b', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` } },
  });
  rig.engine.advanceState({ workItemId: rig.item.id, to: 'in_review', actorId: rig.dev.id, fencingToken: claim.fencingToken });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
  });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'b', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return claim;
}

function submitPr(rig: Rig, claim: Claim, action: 'opened' | 'merged_into_default'): void {
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'pr', payload: { action, number: 7, ...(action === 'merged_into_default' ? { mergedSha: 'msha' } : { url: 'http://pr/7' }) } },
  });
}

describe('done gate requireMergedPr (roadmap §9.6)', () => {
  it('with the policy OFF, review_approval completes without any pr evidence (pre-9.6 behavior)', () => {
    const rig = makeRig();
    toReviewableWithEvidence(rig);
    const done = rig.engine.approveGate({ workItemId: rig.item.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(done.state).toBe('done');
  });

  it('with requireMergedPr ON, review_approval fails until the latest pr evidence is a merge', () => {
    const rig = makeRig();
    rig.engine.setGatePolicy({ gate: 'review_approval', policy: { requireMergedPr: true }, byActorId: rig.po.id });
    const claim = toReviewableWithEvidence(rig);

    // No pr evidence yet → the done gate refuses.
    expect(() =>
      rig.engine.approveGate({ workItemId: rig.item.id, gate: 'review_approval', actorId: rig.reviewer.id }),
    ).toThrow(/requireMergedPr|merged into the default/i);
    expect(rig.engine.getWorkItem(rig.item.id).state).toBe('in_review');

    // An OPENED pr is not a merge → still refused.
    submitPr(rig, claim, 'opened');
    expect(() =>
      rig.engine.approveGate({ workItemId: rig.item.id, gate: 'review_approval', actorId: rig.reviewer.id }),
    ).toThrow(/requireMergedPr|merged into the default/i);

    // A merge into the default branch → the gate completes.
    submitPr(rig, claim, 'merged_into_default');
    const done = rig.engine.approveGate({ workItemId: rig.item.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(done.state).toBe('done');
  });
});
