/**
 * Conformance suite — `blocked` overlay semantics.
 *
 * ROADMAP D8: "`blocked` is an overlay (`blocked_reason` column), not an FSM
 * state. HALT's blocking-condition taxonomy becomes its enum. ... Preserves
 * never-downgrade; unblock restores position without a backward transition."
 * ROADMAP §1.1: "Overlay: blocked_reason (D8) freezes transitions without
 * changing state."
 *
 * Source keys used in comments:
 *   DEVAUTO = src/bmm-skills/4-implementation/bmad-dev-auto/SKILL.md (HALT contract)
 *   ROADMAP = product-roadmap.md
 */
import {
  createEngine,
  BLOCKED_REASONS,
  GuardFailedError,
  PermissionDeniedError,
  type Actor,
  type BlockedReason,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

const PINNED_VERIFICATION = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  planner: Actor; // task.claim + task.plan + task.block
  approver: Actor; // gate.spec.approve
  dev: Actor; // task.claim + task.advance + task.block
  reviewer: Actor; // gate.review.approve ONLY (pins §4.2: the gate grant alone releases non-convergence)
  feature: Feature;
}

function makeRig(): Rig {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  const approver = engine.createActor({ type: 'user', displayName: 'Spec approver' });
  const dev = engine.createActor({ type: 'user', displayName: 'Developer' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.claim' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  engine.grant({ actorId: planner.id, permission: 'task.block' });
  engine.grant({ actorId: approver.id, permission: 'gate.spec.approve' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: dev.id, permission: 'task.block' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  const feature = engine.createFeature({ actorId: planner.id });
  return { engine, planner, approver, dev, reviewer, feature };
}

function newItem(rig: Rig, externalKey: string): WorkItem {
  return rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey,
    title: `Story ${externalKey}`,
    specCheckpoint: true,
    actorId: rig.planner.id,
  });
}

function toDraft(rig: Rig, item: WorkItem): WorkItem {
  const claim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.planner.id });
  const wi = rig.engine.advanceState({
    workItemId: item.id,
    to: 'draft',
    actorId: rig.planner.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
  return wi;
}

function toReadyForDev(rig: Rig, item: WorkItem): WorkItem {
  toDraft(rig, item);
  return rig.engine.approveGate({
    workItemId: item.id,
    gate: 'spec_approval',
    actorId: rig.approver.id,
    pinnedVerification: PINNED_VERIFICATION,
  });
}

function toInProgress(rig: Rig, item: WorkItem): { wi: WorkItem; claim: Claim } {
  toReadyForDev(rig, item);
  const claim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.dev.id });
  const wi = rig.engine.advanceState({
    workItemId: item.id,
    to: 'in_progress',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
  return { wi, claim };
}

/** git_diff evidence so a later in_progress→in_review attempt can only fail on the overlay. */
function submitDiff(rig: Rig, item: WorkItem, claim: Claim): void {
  rig.engine.submitEvidence({
    workItemId: item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: {
        baseline: 'base-sha',
        final: 'final-sha',
        filesChanged: 2,
        nonEmpty: true,
        branch: `claim/${claim.id}`,
      },
    },
  });
}

// ---------------------------------------------------------------------------

// ROADMAP D8: "HALT's blocking-condition taxonomy becomes its enum";
// D10: "'Needs input' is `blocked` with condition `awaiting_human_input`."
describe('blocking-condition taxonomy (ROADMAP D8/D10, DEVAUTO HALT)', () => {
  it('the enum carries the HALT taxonomy conditions used by the playbooks', () => {
    // DEVAUTO: "HALT with status `blocked` and blocking condition `no subagents`"
    expect(BLOCKED_REASONS).toContain('no_subagents');
    // DEVAUTO HALT: "Ambiguous on-disk match (the halt is `ambiguous story file match` ...)"
    expect(BLOCKED_REASONS).toContain('ambiguous_story_file_match');
    // ROADMAP D10: needs-input routing condition
    expect(BLOCKED_REASONS).toContain('awaiting_human_input');
    // ROADMAP §4.2: 6th-loopback escalation condition
    expect(BLOCKED_REASONS).toContain('review_non_convergence');
  });
});

// ROADMAP D8: blocked is an overlay column, NOT a state — blocking must not
// move the item through the FSM.
describe('blockTask sets the overlay, base state untouched (ROADMAP D8, §1.1)', () => {
  // One case per taxonomy family actually raised by the playbooks:
  // awaiting_human_input (D10), no_subagents (DEVAUTO), dirty_tree (worktree failure family).
  const reasons: BlockedReason[] = ['awaiting_human_input', 'no_subagents', 'dirty_tree'];
  for (const reason of reasons) {
    it(`blockTask(${reason}) records the reason and keeps state = in_progress`, () => {
      const rig = makeRig();
      const item = newItem(rig, '1-1');
      const { claim } = toInProgress(rig, item);
      const blocked = rig.engine.blockTask({
        workItemId: item.id,
        reason,
        actorId: rig.dev.id,
        fencingToken: claim.fencingToken,
      });
      expect(BLOCKED_REASONS).toContain(reason);
      expect(blocked.blockedReason).toBe(reason);
      expect(blocked.state).toBe('in_progress'); // overlay, not a transition
      expect(rig.engine.getWorkItem(item.id).blockedReason).toBe(reason);
    });
  }
});

// ROADMAP §1.1: the overlay "freezes transitions without changing state".
describe('blocked freezes advanceState (ROADMAP §1.1, D8)', () => {
  it('in_progress → in_review throws GuardFailedError while blocked, even with evidence in place', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { claim } = toInProgress(rig, item);
    submitDiff(rig, item, claim); // evidence present: the ONLY failing guard is the overlay
    rig.engine.blockTask({
      workItemId: item.id,
      reason: 'awaiting_human_input',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    expect(() =>
      rig.engine.advanceState({
        workItemId: item.id,
        to: 'in_review',
        actorId: rig.dev.id,
        fencingToken: claim.fencingToken,
      }),
    ).toThrow(GuardFailedError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('in_progress');
  });

  it('backlog → draft throws GuardFailedError while blocked (freeze applies at every state)', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const claim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.planner.id });
    rig.engine.blockTask({
      workItemId: item.id,
      reason: 'unclear_intent',
      actorId: rig.planner.id,
      fencingToken: claim.fencingToken,
    });
    expect(() =>
      rig.engine.advanceState({
        workItemId: item.id,
        to: 'draft',
        actorId: rig.planner.id,
        fencingToken: claim.fencingToken,
      }),
    ).toThrow(GuardFailedError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('backlog');
  });
});

// ROADMAP D8: "unblock restores position without a backward transition".
describe('unblockTask restores position (ROADMAP D8)', () => {
  it('clears blocked_reason, keeps the pre-block state, and transitions resume', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { wi, claim } = toInProgress(rig, item);
    const stateBeforeBlock = wi.state;
    submitDiff(rig, item, claim);
    rig.engine.blockTask({
      workItemId: item.id,
      reason: 'awaiting_human_input',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });

    const unblocked = rig.engine.unblockTask({ workItemId: item.id, actorId: rig.dev.id });
    expect(unblocked.blockedReason).toBeNull();
    // No downgrade, no transition: exactly where it stood before the block.
    expect(unblocked.state).toBe(stateBeforeBlock);
    expect(unblocked.state).toBe('in_progress');

    // The freeze is fully lifted: the previously frozen transition now passes.
    const resumed = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_review',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    expect(resumed.state).toBe('in_review');
  });
});

// ROADMAP §4.2: "review_non_convergence (6th loopback) can only be released by
// a review-gate holder."
describe('review_non_convergence release (ROADMAP §4.2)', () => {
  it('an actor without gate.review.approve cannot unblock it — PermissionDeniedError', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { claim } = toInProgress(rig, item);
    rig.engine.blockTask({
      workItemId: item.id,
      reason: 'review_non_convergence',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    // dev holds task.block + task.advance, but NOT the review gate grant.
    expect(() => rig.engine.unblockTask({ workItemId: item.id, actorId: rig.dev.id })).toThrow(
      PermissionDeniedError,
    );
    expect(rig.engine.getWorkItem(item.id).blockedReason).toBe('review_non_convergence');
  });

  it('a gate.review.approve holder unblocks it; state is preserved', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { claim } = toInProgress(rig, item);
    rig.engine.blockTask({
      workItemId: item.id,
      reason: 'review_non_convergence',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    const unblocked = rig.engine.unblockTask({ workItemId: item.id, actorId: rig.reviewer.id });
    expect(unblocked.blockedReason).toBeNull();
    expect(unblocked.state).toBe('in_progress'); // position restored, no transition (D8)
  });
});
