/**
 * Conformance suite — atomic reviewer dispatch (roadmap §9.4).
 *
 * A REVIEW claim is a second live-claim slot on an item (kind='review'),
 * carrying its own fencing token; it coexists with the work claim and is
 * serialized by the same one-live-per-(item,kind) constraint — two concurrent
 * claim_review calls: one wins, the loser gets ConflictError and leaves no row.
 * When the review_approval gate policy names an autoDispatchReviewer, entering
 * in_review materializes EXACTLY ONE review agent_job per review round.
 */
import {
  createEngine,
  type Actor,
  type AgentJob,
  type Claim,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  po: Actor; // planning + spec approval + downgrade + governance admin
  dev: Actor; // work claim + advance
  reviewer: Actor; // gate.review.approve
  rejectOnly: Actor; // gate.review.reject only
  outsider: Actor;
  item: WorkItem;
}

function makeRig(): Rig {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'PO', governanceRole: 'admin' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  const rejectOnly = engine.createActor({ type: 'agent', displayName: 'Reviewer Agent' });
  const outsider = engine.createActor({ type: 'user', displayName: 'Outsider' });
  for (const p of ['task.plan', 'task.claim', 'task.advance', 'gate.spec.approve', 'state.downgrade'] as const) {
    engine.grant({ actorId: po.id, permission: p });
  }
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  engine.grant({ actorId: rejectOnly.id, permission: 'gate.review.reject' });
  const feature = engine.createFeature({ actorId: po.id });
  const item = engine.createWorkItem({
    featureId: feature.id,
    externalKey: 'r-1',
    title: 'Reviewable',
    actorId: po.id,
  });
  return { engine, po, dev, reviewer, rejectOnly, outsider, item };
}

/** Drive the item to in_review; returns the LIVE work claim (not released). */
function toInReview(rig: Rig): Claim {
  rig.engine.advanceState({ workItemId: rig.item.id, to: 'draft', actorId: rig.po.id });
  rig.engine.approveGate({
    workItemId: rig.item.id,
    gate: 'spec_approval',
    actorId: rig.po.id,
    pinnedVerification: ['pnpm test'],
  });
  const claim = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id });
  rig.engine.advanceState({
    workItemId: rig.item.id,
    to: 'in_progress',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'a', final: 'b', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` },
    },
  });
  rig.engine.advanceState({
    workItemId: rig.item.id,
    to: 'in_review',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
  return claim;
}

const liveReviewClaims = (rig: Rig): Claim[] =>
  rig.engine.listClaims().filter((c) => c.kind === 'review');
const reviewJobs = (rig: Rig): AgentJob[] =>
  rig.engine.listAgentJobs().filter((j) => j.reviewRound !== null && j.workItemId === rig.item.id);

describe('atomic reviewer dispatch (roadmap §9.4)', () => {
  it('two claim_review calls: one wins, the second is a ConflictError, exactly one live review claim', () => {
    const rig = makeRig();
    toInReview(rig);
    const first = rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.reviewer.id });
    expect(first.kind).toBe('review');
    expect(() => rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.reviewer.id })).toThrow(
      /already has a live review claim|conflict/i,
    );
    expect(liveReviewClaims(rig)).toHaveLength(1);
  });

  it('a review claim and the work claim coexist with distinct per-claim fencing tokens', () => {
    const rig = makeRig();
    const workClaim = toInReview(rig); // still live
    const reviewClaim = rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.reviewer.id });
    expect(reviewClaim.fencingToken).not.toBe(workClaim.fencingToken);
    // Both live; each mutation presents ITS OWN token.
    rig.engine.heartbeat({ claimId: workClaim.id, actorId: rig.dev.id, fencingToken: workClaim.fencingToken });
    rig.engine.heartbeat({ claimId: reviewClaim.id, actorId: rig.reviewer.id, fencingToken: reviewClaim.fencingToken });
    const live = rig.engine.listClaims();
    expect(live.filter((c) => c.workItemId === rig.item.id)).toHaveLength(2);
    expect(live.filter((c) => c.kind === 'work')).toHaveLength(1);
    expect(live.filter((c) => c.kind === 'review')).toHaveLength(1);
  });

  it('claiming a review does not sweep an EXPIRED work claim of the same item (cross-kind parity, §9.4)', () => {
    const rig = makeRig();
    const workClaim = toInReview(rig); // live 15-min work lease
    rig.engine.advanceClock(16 * 60 * 1000); // the work lease is now expired, still unreleased
    const review = rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.reviewer.id });
    expect(review.kind).toBe('review');
    const onItem = rig.engine.listClaims().filter((c) => c.workItemId === rig.item.id);
    // The dead work claim is STILL visible (unreleased, expired) — ops must see
    // it; the review claim never touched it. Both engines agree.
    const work = onItem.find((c) => c.kind === 'work');
    expect(work).toBeDefined();
    expect(work?.released).toBe(false);
    expect(work?.expired).toBe(true);
    expect(work?.fencingToken).toBe(workClaim.fencingToken);
  });

  it('claim_review requires gate.review.approve OR gate.review.reject', () => {
    const rig = makeRig();
    toInReview(rig);
    expect(() => rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.outsider.id })).toThrow(
      /permission|denied/i,
    );
    // The reject-only reviewer agent may claim (it holds gate.review.reject).
    const claim = rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.rejectOnly.id });
    expect(claim.kind).toBe('review');
  });

  it('claim_review applies only to in_review items', () => {
    const rig = makeRig();
    // Item is still backlog — no review to claim.
    expect(() => rig.engine.claimReview({ workItemId: rig.item.id, actorId: rig.reviewer.id })).toThrow(
      /in_review/,
    );
  });

  // -- auto-dispatch of exactly one review job per round --------------------

  it('entering in_review materializes exactly one review job for the policy reviewer', () => {
    const rig = makeRig();
    rig.engine.setGatePolicy({
      gate: 'review_approval',
      policy: { autoDispatchReviewer: rig.reviewer.id },
      byActorId: rig.po.id,
    });
    toInReview(rig);
    const jobs = reviewJobs(rig);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      agentActorId: rig.reviewer.id,
      workItemId: rig.item.id,
      reviewRound: 0,
      threadId: null,
      status: 'queued',
    });
  });

  it('a second entry into in_review in the SAME round creates no additional review job', () => {
    const rig = makeRig();
    rig.engine.setGatePolicy({
      gate: 'review_approval',
      policy: { autoDispatchReviewer: rig.reviewer.id },
      byActorId: rig.po.id,
    });
    const workClaim = toInReview(rig);
    expect(reviewJobs(rig)).toHaveLength(1);
    // Privileged downgrade back to in_progress (round unchanged), then re-advance
    // to in_review — the SAME round must not double-dispatch.
    rig.engine.advanceState({
      workItemId: rig.item.id,
      to: 'in_progress',
      actorId: rig.po.id,
      fencingToken: workClaim.fencingToken,
    });
    rig.engine.advanceState({
      workItemId: rig.item.id,
      to: 'in_review',
      actorId: rig.dev.id,
      fencingToken: workClaim.fencingToken,
    });
    expect(reviewJobs(rig)).toHaveLength(1); // still one — idempotent by (item, round)
  });

  it('with no autoDispatchReviewer policy, entering in_review materializes no review job', () => {
    const rig = makeRig();
    toInReview(rig);
    expect(reviewJobs(rig)).toHaveLength(0);
  });
});
