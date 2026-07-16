/**
 * Conformance: checkpoints (spec / done) and dispatch context.
 *
 * Sources:
 *  - src/core-skills/bmad-spec/assets/stories-schema.md — spec_checkpoint: "a human
 *    reviews the story spec between planning and implementation"; done_checkpoint:
 *    "dispatch pauses after this story completes, before anything further runs".
 *  - product-roadmap.md §1.1 — "spec_checkpoint ⇒ the spec-approval gate is mandatory";
 *    "done_checkpoint ⇒ a dispatch-level hold — the story completes normally, but no
 *    further dispatch happens in the feature until a permitted actor releases the hold.
 *    (…it is not a gate on the story's own transition.)"
 *  - product-roadmap.md §1.2 — "Dispatching a done work item is refused at
 *    get_task_context. Follow-up review is a new work item, never a re-dispatch."
 *  - product-roadmap.md §2.3 — dispatch returns entry-state context; dev-auto
 *    entry-state routing (resume semantics).
 */
import {
  createEngine,
  GuardFailedError,
  PermissionDeniedError,
  type Permission,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_PERMS: Permission[] = [
  'task.plan',
  'task.claim',
  'task.advance',
  'task.block',
  'gate.spec.approve',
  'gate.review.approve',
  'feature.init',
  'feature.advance',
  'dispatch.release_hold',
];

function setup(): { engine: SpineEngine; actorId: string; featureId: string } {
  const engine = createEngine();
  const actor = engine.createActor({ type: 'user', displayName: 'Omni' });
  for (const permission of ALL_PERMS) {
    engine.grant({ actorId: actor.id, permission });
  }
  const feature = engine.createFeature({ actorId: actor.id });
  return { engine, actorId: actor.id, featureId: feature.id };
}

/** backlog → draft → ready_for_dev. Only for items WITHOUT spec_checkpoint. */
function toReadyForDev(engine: SpineEngine, actorId: string, workItemId: string): WorkItem {
  engine.advanceState({ workItemId, to: 'draft', actorId });
  return engine.advanceState({ workItemId, to: 'ready_for_dev', actorId });
}

/**
 * March a non-spec-checkpoint item all the way to done, the honest way:
 * claim (fencing token, §1.3), submit machine evidence (§1.4: non-empty diff,
 * commit reachable on remote, branch named by claim id), review approval by a
 * permitted actor (§1.4: absent pinned verification, the done gate requires a
 * human decision — it never auto-passes).
 */
function marchToDone(engine: SpineEngine, actorId: string, workItemId: string): WorkItem {
  toReadyForDev(engine, actorId, workItemId);
  const claim = engine.claimTask({ workItemId, actorId });
  engine.advanceState({ workItemId, to: 'in_progress', actorId, fencingToken: claim.fencingToken });
  engine.submitEvidence({
    workItemId,
    actorId,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: {
        baseline: 'aaaa111',
        final: 'bbbb222',
        filesChanged: 3,
        nonEmpty: true,
        branch: `claim/${claim.id}`,
      },
    },
  });
  engine.submitEvidence({
    workItemId,
    actorId,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'commit',
      payload: { sha: 'bbbb222', branch: `claim/${claim.id}`, reachableOnRemote: true },
    },
  });
  engine.advanceState({ workItemId, to: 'in_review', actorId, fencingToken: claim.fencingToken });
  // Whether approve_gate fires the in_review→done transition itself or merely
  // records the decision for advance_state is an engine-internal choice; the
  // conformance requirement is only the end state. Accept both shapes.
  let wi = engine.approveGate({ workItemId, gate: 'review_approval', actorId });
  if (wi.state !== 'done') {
    wi = engine.advanceState({ workItemId, to: 'done', actorId });
  }
  return wi;
}

// ---------------------------------------------------------------------------

describe('spec_checkpoint — mandatory spec-approval gate (stories-schema.md; roadmap §1.1)', () => {
  // stories-schema.md: "a human reviews the story spec between planning and
  // implementation" → the gate sits on draft → ready_for_dev.
  it('refuses draft→ready_for_dev while no spec_approval decision exists', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'g1',
      title: 'Spec-gated story',
      specCheckpoint: true,
      actorId,
    });
    engine.advanceState({ workItemId: wi.id, to: 'draft', actorId });

    expect(() =>
      engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId }),
    ).toThrow(GuardFailedError);
    // Refused command mutates nothing.
    expect(engine.getWorkItem(wi.id).state).toBe('draft');
  });

  // roadmap §1.1: "spec_checkpoint ⇒ the spec-approval gate is mandatory" — and
  // once a permitted actor approves, the checkpoint guard is satisfied.
  it('reaches ready_for_dev after approveGate(spec_approval) by a permitted actor', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'g2',
      title: 'Spec-gated story',
      specCheckpoint: true,
      actorId,
    });
    engine.advanceState({ workItemId: wi.id, to: 'draft', actorId });

    // Accept either engine shape: approveGate fires the transition itself, or
    // records the decision so a subsequent advance_state passes the guard.
    let updated = engine.approveGate({ workItemId: wi.id, gate: 'spec_approval', actorId });
    if (updated.state === 'draft') {
      updated = engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId });
    }
    expect(updated.state).toBe('ready_for_dev');
  });

  // stories-schema.md: spec_checkpoint defaults to false — no gate is imposed then.
  it('does not require any gate decision when spec_checkpoint is false', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'g3',
      title: 'Ungated story',
      actorId,
    });

    const advanced = toReadyForDev(engine, actorId, wi.id);
    expect(advanced.state).toBe('ready_for_dev');
  });
});

describe('done_checkpoint — dispatch-level hold, not a transition gate (stories-schema.md; roadmap §1.1)', () => {
  // roadmap §1.1: "the story completes normally" — the checkpoint never blocks
  // the story's own transition to done.
  it('lets the checkpointed story itself complete to done normally', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'h1',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });

    const done = marchToDone(engine, actorId, wi.id);

    expect(done.state).toBe('done');
    expect(done.blockedReason).toBeNull();
  });

  // stories-schema.md: "dispatch pauses after this story completes" → the hold
  // materializes on the feature exactly at completion.
  it('raises feature.dispatchHold when the checkpointed story completes', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'h2',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });
    expect(engine.getFeature(featureId).dispatchHold).toBe(false);

    marchToDone(engine, actorId, wi.id);

    expect(engine.getFeature(featureId).dispatchHold).toBe(true);
  });

  // stories-schema.md: "before anything further runs" — sibling stories in the
  // feature cannot be dispatched while the hold is active.
  it('refuses getTaskContext for a sibling story while the hold is active', () => {
    const { engine, actorId, featureId } = setup();
    const holdStory = engine.createWorkItem({
      featureId,
      externalKey: 'h3',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });
    const sibling = engine.createWorkItem({
      featureId,
      externalKey: 'h4',
      title: 'Next story in the feature',
      actorId,
    });
    toReadyForDev(engine, actorId, sibling.id);
    marchToDone(engine, actorId, holdStory.id);

    expect(() => engine.getTaskContext({ workItemId: sibling.id })).toThrow(GuardFailedError);
  });

  // roadmap §1.1: "no further dispatch happens IN THE FEATURE" — the hold is
  // scoped; other features keep dispatching.
  it('does not block dispatch in a different feature', () => {
    const { engine, actorId, featureId } = setup();
    const holdStory = engine.createWorkItem({
      featureId,
      externalKey: 'h5',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });
    const otherFeature = engine.createFeature({ actorId });
    const foreign = engine.createWorkItem({
      featureId: otherFeature.id,
      externalKey: 'f1',
      title: 'Story in another feature',
      actorId,
    });
    toReadyForDev(engine, actorId, foreign.id);
    marchToDone(engine, actorId, holdStory.id);

    const ctx = engine.getTaskContext({ workItemId: foreign.id });
    expect(ctx.workItem.id).toBe(foreign.id);
    expect(ctx.entryState).toBe('ready_for_dev');
  });

  // roadmap §1.1: "until a PERMITTED actor releases the hold" — release is a
  // granted permission (dispatch.release_hold), not an interpretation.
  it('refuses releaseDispatchHold from an actor without dispatch.release_hold', () => {
    const { engine, actorId, featureId } = setup();
    const holdStory = engine.createWorkItem({
      featureId,
      externalKey: 'h6',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });
    marchToDone(engine, actorId, holdStory.id);
    const ungranted = engine.createActor({ type: 'user', displayName: 'No grants' });

    expect(() =>
      engine.releaseDispatchHold({ featureId, actorId: ungranted.id }),
    ).toThrow(PermissionDeniedError);
    expect(engine.getFeature(featureId).dispatchHold).toBe(true);
  });

  // stories-schema.md pause + roadmap §1.1 release: after a permitted release,
  // dispatch in the feature resumes.
  it('resumes sibling dispatch after a permitted releaseDispatchHold', () => {
    const { engine, actorId, featureId } = setup();
    const holdStory = engine.createWorkItem({
      featureId,
      externalKey: 'h7',
      title: 'Hold-raising story',
      doneCheckpoint: true,
      actorId,
    });
    const sibling = engine.createWorkItem({
      featureId,
      externalKey: 'h8',
      title: 'Next story in the feature',
      actorId,
    });
    toReadyForDev(engine, actorId, sibling.id);
    marchToDone(engine, actorId, holdStory.id);

    const released = engine.releaseDispatchHold({ featureId, actorId });
    expect(released.dispatchHold).toBe(false);

    const ctx = engine.getTaskContext({ workItemId: sibling.id });
    expect(ctx.workItem.id).toBe(sibling.id);
    expect(ctx.entryState).toBe('ready_for_dev');
  });
});

describe('getTaskContext — dispatch routing (roadmap §1.2, §2.3)', () => {
  // roadmap §1.2: "Dispatching a done work item is refused at get_task_context.
  // Follow-up review is a new work item, never a re-dispatch."
  it('refuses a work item in state done', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'd1',
      title: 'Completed story',
      actorId,
    });
    marchToDone(engine, actorId, wi.id);

    expect(() => engine.getTaskContext({ workItemId: wi.id })).toThrow(GuardFailedError);
  });

  // roadmap §2.3: the dispatch payload carries the work item + entry state the
  // runner routes on (dev-auto entry-state routing).
  it('returns entry-state context mirroring the DB state for a ready item', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'd2',
      title: 'Dispatchable story',
      actorId,
    });
    toReadyForDev(engine, actorId, wi.id);

    const ctx = engine.getTaskContext({ workItemId: wi.id });

    expect(ctx.workItem.id).toBe(wi.id);
    expect(ctx.workItem.state).toBe('ready_for_dev');
    expect(ctx.entryState).toBe('ready_for_dev');
  });

  // roadmap §1.2: "Claims are permitted in in_progress/in_review when no live
  // claim exists (resume semantics, matching dev-auto's entry-state routing)" —
  // a released mid-flight item re-dispatches at its current state, never downgraded.
  it('returns entryState in_progress for an item abandoned mid-flight (resume semantics)', () => {
    const { engine, actorId, featureId } = setup();
    const wi = engine.createWorkItem({
      featureId,
      externalKey: 'd3',
      title: 'Abandoned story',
      actorId,
    });
    toReadyForDev(engine, actorId, wi.id);
    const claim = engine.claimTask({ workItemId: wi.id, actorId });
    engine.advanceState({
      workItemId: wi.id,
      to: 'in_progress',
      actorId,
      fencingToken: claim.fencingToken,
    });
    engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId, reason: 'worker went away' });

    const ctx = engine.getTaskContext({ workItemId: wi.id });

    expect(ctx.entryState).toBe('in_progress');
    expect(ctx.workItem.state).toBe('in_progress');
  });
});
