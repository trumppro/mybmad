/**
 * Conformance suite — basic lifecycle FSM.
 *
 * Written BEFORE the engine (ROADMAP §1.2: "Before the engine is coded, every
 * prose rule in sprint-planning / dev-auto / quick-dev becomes a conformance
 * test ... The engine is written to make that suite pass — not the other way
 * around.").
 *
 * Source keys used in comments:
 *   SPRINT  = src/bmm-skills/4-implementation/bmad-sprint-planning/SKILL.md
 *   TMPL    = src/bmm-skills/4-implementation/bmad-sprint-planning/sprint-status-template.yaml
 *   ROADMAP = product-roadmap.md
 */
import {
  createEngine,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  WORK_ITEM_STATES,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

/** ROADMAP D7: verification commands are pinned at the spec-approval gate. */
const PINNED_VERIFICATION = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  planner: Actor; // user: task.claim + task.plan (+ feature.init)
  approver: Actor; // user: gate.spec.approve
  dev: Actor; // user: task.claim + task.advance
  reviewer: Actor; // user: gate.review.approve
  feature: Feature;
}

// ROADMAP §3: delivery roles map to specific gates/permissions; grants are
// explicit. Each rig actor gets exactly the grants its role needs.
function makeRig(): Rig {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  const approver = engine.createActor({ type: 'user', displayName: 'Spec approver' });
  const dev = engine.createActor({ type: 'user', displayName: 'Developer' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.claim' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  engine.grant({ actorId: approver.id, permission: 'gate.spec.approve' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  const feature = engine.createFeature({ actorId: planner.id });
  return { engine, planner, approver, dev, reviewer, feature };
}

function newItem(rig: Rig, externalKey: string, dependsOn?: string[]): WorkItem {
  return rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey,
    title: `Story ${externalKey}`,
    specCheckpoint: true, // ROADMAP §1.1: spec_checkpoint => spec-approval gate mandatory
    actorId: rig.planner.id,
    ...(dependsOn ? { dependsOn } : {}),
  });
}

/** backlog -> draft: needs a live claim + task.plan (ROADMAP §1.1 state order, §1.2 transition table). */
function toDraft(rig: Rig, item: WorkItem): WorkItem {
  const claim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.planner.id });
  const wi = rig.engine.advanceState({
    workItemId: item.id,
    to: 'draft',
    actorId: rig.planner.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.releaseClaim({ claimId: claim.id });
  return wi;
}

/** draft -> ready_for_dev via spec_approval gate, pinning verification (ROADMAP D7). */
function toReadyForDev(rig: Rig, item: WorkItem): WorkItem {
  toDraft(rig, item);
  return rig.engine.approveGate({
    workItemId: item.id,
    gate: 'spec_approval',
    actorId: rig.approver.id,
    pinnedVerification: PINNED_VERIFICATION,
  });
}

/** ready_for_dev -> in_progress: dev claim + task.advance (SPRINT: "in-progress: Developer actively working"). */
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

/** ROADMAP §1.4: "a non-empty diff between recorded baseline and final revisions". */
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
        branch: `claim/${claim.id}`, // ROADMAP §1.3: branches are named by claim id
      },
    },
  });
}

/** in_progress -> in_review with git_diff evidence (SPRINT: "review: Ready for code review"). */
function toInReview(rig: Rig, item: WorkItem): { wi: WorkItem; claim: Claim } {
  const { claim } = toInProgress(rig, item);
  submitDiff(rig, item, claim);
  const wi = rig.engine.advanceState({
    workItemId: item.id,
    to: 'in_review',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
  return { wi, claim };
}

/** in_review -> done via review_approval gate + pinned test_run + remote-reachable commit (ROADMAP §1.4, D7). */
function toDone(rig: Rig, item: WorkItem): WorkItem {
  const { claim } = toInReview(rig, item);
  rig.engine.submitEvidence({
    workItemId: item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    // ROADMAP §1.4: "real test exit codes from pinned commands (D7)"
    evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
  });
  rig.engine.submitEvidence({
    workItemId: item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    // ROADMAP §1.4: "final_revision_reachable_on_remote"
    evidence: { kind: 'commit', payload: { sha: 'final-sha', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return rig.engine.approveGate({ workItemId: item.id, gate: 'review_approval', actorId: rig.reviewer.id });
}

// ---------------------------------------------------------------------------

// SPRINT "Story Status Flow": backlog -> ready-for-dev -> in-progress -> review -> done;
// ROADMAP §1.1 unifies with quick-dev by inserting `draft` and renaming review ≡ in_review,
// and declares the list rank-ordered.
describe('state vocabulary (SPRINT status flow + ROADMAP §1.1)', () => {
  it('states are exactly the unified rank-ordered sequence', () => {
    expect([...WORK_ITEM_STATES]).toEqual(['backlog', 'draft', 'ready_for_dev', 'in_progress', 'in_review', 'done']);
  });
});

describe('golden path (SPRINT status flow, ROADMAP §1.1/§1.2/§1.4)', () => {
  // SPRINT step 2: story entries "Default status: backlog"; "backlog: Story only exists in epic file".
  it('a newly created work item starts in backlog', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    expect(item.state).toBe('backlog');
    expect(item.blockedReason).toBeNull();
  });

  // Full walk. Each hop cites its law inline.
  it('walks backlog→draft→ready_for_dev→in_progress→in_review→done with grants, claims and evidence', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');

    // backlog -> draft: claim + task.plan (ROADMAP §1.2: each entry declares required permission + guards).
    const planClaim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.planner.id });
    const drafted = rig.engine.advanceState({
      workItemId: item.id,
      to: 'draft',
      actorId: rig.planner.id,
      fencingToken: planClaim.fencingToken,
    });
    expect(drafted.state).toBe('draft');
    rig.engine.releaseClaim({ claimId: planClaim.id });

    // draft -> ready_for_dev: spec_approval gate by a gate.spec.approve holder,
    // pinning verification commands as Rules-layer data (ROADMAP D7;
    // SPRINT: "ready-for-dev: Story file created").
    const ready = rig.engine.approveGate({
      workItemId: item.id,
      gate: 'spec_approval',
      actorId: rig.approver.id,
      pinnedVerification: PINNED_VERIFICATION,
    });
    expect(ready.state).toBe('ready_for_dev');
    expect(ready.pinnedVerification).toEqual(PINNED_VERIFICATION);

    // ready_for_dev -> in_progress: dev claim + task.advance
    // (SPRINT: "in-progress: Developer actively working on implementation").
    const devClaim = rig.engine.claimTask({ workItemId: item.id, actorId: rig.dev.id });
    const started = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_progress',
      actorId: rig.dev.id,
      fencingToken: devClaim.fencingToken,
    });
    expect(started.state).toBe('in_progress');

    // in_progress -> in_review: requires git_diff evidence with baseline + nonEmpty
    // (ROADMAP §1.4: "a non-empty diff between recorded baseline and final revisions";
    // SPRINT: "Dev moves story to 'review'").
    submitDiff(rig, item, devClaim);
    const inReview = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_review',
      actorId: rig.dev.id,
      fencingToken: devClaim.fencingToken,
    });
    expect(inReview.state).toBe('in_review');

    // in_review -> done: review_approval gate + test_run on the PINNED command with
    // pass exit code + commit reachable on remote (ROADMAP §1.4; SPRINT guideline 4:
    // "Stories should pass through review before done").
    rig.engine.submitEvidence({
      workItemId: item.id,
      actorId: rig.dev.id,
      fencingToken: devClaim.fencingToken,
      evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
    });
    rig.engine.submitEvidence({
      workItemId: item.id,
      actorId: rig.dev.id,
      fencingToken: devClaim.fencingToken,
      evidence: { kind: 'commit', payload: { sha: 'final-sha', branch: `claim/${devClaim.id}`, reachableOnRemote: true } },
    });
    const done = rig.engine.approveGate({
      workItemId: item.id,
      gate: 'review_approval',
      actorId: rig.reviewer.id,
    });
    expect(done.state).toBe('done');
    expect(rig.engine.getWorkItem(item.id).state).toBe('done');
  });
});

// SPRINT step 3 "Preservation rule": "Never downgrade status (e.g., don't change
// 'done' to 'ready-for-dev')". ROADMAP §1.2: "Never-downgrade is an engine
// invariant." An undeclared backward hop is an InvalidTransitionError.
describe('never-downgrade (SPRINT step 3, ROADMAP §1.2)', () => {
  it('done → in_progress is rejected', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    toDone(rig, item);
    expect(() =>
      rig.engine.advanceState({ workItemId: item.id, to: 'in_progress', actorId: rig.dev.id }),
    ).toThrow(InvalidTransitionError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('done');
  });

  it('in_review → ready_for_dev is rejected', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    toInReview(rig, item);
    expect(() =>
      rig.engine.advanceState({ workItemId: item.id, to: 'ready_for_dev', actorId: rig.dev.id }),
    ).toThrow(InvalidTransitionError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('in_review');
  });

  it('ready_for_dev → backlog is rejected', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    toReadyForDev(rig, item);
    expect(() =>
      rig.engine.advanceState({ workItemId: item.id, to: 'backlog', actorId: rig.dev.id }),
    ).toThrow(InvalidTransitionError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('ready_for_dev');
  });
});

// ROADMAP §1.2: "Privileged correction requires the `state.downgrade` permission
// and writes a compensating event — history is never edited."
describe('privileged downgrade (ROADMAP §1.2 state.downgrade)', () => {
  it('an actor holding state.downgrade may move a work item backward', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    toReadyForDev(rig, item);
    const ops = rig.engine.createActor({ type: 'user', displayName: 'Ops corrector' });
    rig.engine.grant({ actorId: ops.id, permission: 'state.downgrade' });
    const corrected = rig.engine.advanceState({ workItemId: item.id, to: 'backlog', actorId: ops.id });
    expect(corrected.state).toBe('backlog');
    expect(rig.engine.getWorkItem(item.id).state).toBe('backlog');
  });

  it('the downgrade appends a compensating event and never edits history', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    toReadyForDev(rig, item);
    const ops = rig.engine.createActor({ type: 'user', displayName: 'Ops corrector' });
    rig.engine.grant({ actorId: ops.id, permission: 'state.downgrade' });

    const before = rig.engine.events(item.id);
    rig.engine.advanceState({ workItemId: item.id, to: 'backlog', actorId: ops.id });
    const after = rig.engine.events(item.id);

    // Compensating event appended (ROADMAP §1.2)...
    expect(after.length).toBeGreaterThan(before.length);
    // ...attributed to the privileged actor (ROADMAP §1.5: every event carries actor)...
    const appended = after.slice(before.length);
    expect(appended.some((ev) => ev.actorId === ops.id)).toBe(true);
    // ...and prior history is byte-for-byte untouched (ROADMAP §1.5: append-only stream).
    expect(after.slice(0, before.length)).toEqual(before);
  });
});

// ROADMAP §1.2 lists idempotency among the prose rules translated into the
// transition table; ROADMAP §1.5: every event carries an idempotency key.
describe('idempotency (ROADMAP §1.2, §1.5)', () => {
  it('advancing to the current state is a no-op: same work item back, no new event', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { wi, claim } = toInProgress(rig, item);

    const eventCountBefore = rig.engine.events().length;
    const again = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_progress',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    expect(again.id).toBe(item.id);
    expect(again.state).toBe('in_progress');
    expect(again.stateVersion).toBe(wi.stateVersion); // no event => projection unchanged (ROADMAP §1.5)
    expect(rig.engine.events().length).toBe(eventCountBefore);
  });

  it('replaying the same idempotencyKey returns the same result and emits nothing new', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const { claim } = toInProgress(rig, item);
    submitDiff(rig, item, claim);

    const first = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_review',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
      idempotencyKey: 'advance-to-review-1',
    });
    expect(first.state).toBe('in_review');

    const eventCountAfterFirst = rig.engine.events().length;
    const replay = rig.engine.advanceState({
      workItemId: item.id,
      to: 'in_review',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
      idempotencyKey: 'advance-to-review-1',
    });
    expect(replay.state).toBe('in_review');
    expect(replay.stateVersion).toBe(first.stateVersion);
    expect(rig.engine.events().length).toBe(eventCountAfterFirst);
  });
});

// ROADMAP §3: "Grants are explicit ... a freshly-spun agent *with* the grant can;
// a veteran without it cannot." §0.2: Actor = "A user or an agent. One table,
// one permission model."
describe('grant decides, not actor type (ROADMAP §0.2, §3)', () => {
  it('backlog → draft without task.plan is PermissionDeniedError even with a live claim', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    const noPlan = rig.engine.createActor({ type: 'user', displayName: 'Claimer without plan grant' });
    rig.engine.grant({ actorId: noPlan.id, permission: 'task.claim' });
    const claim = rig.engine.claimTask({ workItemId: item.id, actorId: noPlan.id });
    expect(() =>
      rig.engine.advanceState({
        workItemId: item.id,
        to: 'draft',
        actorId: noPlan.id,
        fencingToken: claim.fencingToken,
      }),
    ).toThrow(PermissionDeniedError);
    expect(rig.engine.getWorkItem(item.id).state).toBe('backlog');
  });

  it('the same transition passes for an AGENT actor holding the grant', () => {
    const rig = makeRig();
    const item = newItem(rig, '1-1');
    // ROADMAP §3: "An agent with the developer grant may self-dispatch — claim a
    // ready task through the same deterministic check a human passes."
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'Planning agent' });
    rig.engine.grant({ actorId: agent.id, permission: 'task.claim' });
    rig.engine.grant({ actorId: agent.id, permission: 'task.plan' });
    const claim = rig.engine.claimTask({ workItemId: item.id, actorId: agent.id });
    const wi = rig.engine.advanceState({
      workItemId: item.id,
      to: 'draft',
      actorId: agent.id,
      fencingToken: claim.fencingToken,
    });
    expect(wi.state).toBe('draft');
  });
});

// ROADMAP §1.4 guards: "data conditions (dependencies done, ...)".
describe('dependency guard (ROADMAP §1.4)', () => {
  it('ready_for_dev → in_progress fails with GuardFailedError while a dependsOn item is not done', () => {
    const rig = makeRig();
    newItem(rig, '1-1'); // dependency, still backlog
    const dependent = newItem(rig, '1-2', ['1-1']);
    toReadyForDev(rig, dependent);
    const claim = rig.engine.claimTask({ workItemId: dependent.id, actorId: rig.dev.id });
    expect(() =>
      rig.engine.advanceState({
        workItemId: dependent.id,
        to: 'in_progress',
        actorId: rig.dev.id,
        fencingToken: claim.fencingToken,
      }),
    ).toThrow(GuardFailedError);
    expect(rig.engine.getWorkItem(dependent.id).state).toBe('ready_for_dev');
  });

  it('the same transition passes once the dependency is done', () => {
    const rig = makeRig();
    const dependency = newItem(rig, '1-1');
    const dependent = newItem(rig, '1-2', ['1-1']);
    toReadyForDev(rig, dependent);
    toDone(rig, dependency); // guard input satisfied: dependency reaches done
    const claim = rig.engine.claimTask({ workItemId: dependent.id, actorId: rig.dev.id });
    const wi = rig.engine.advanceState({
      workItemId: dependent.id,
      to: 'in_progress',
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
    });
    expect(wi.state).toBe('in_progress');
  });
});
