/**
 * Conformance suite — epic-lift projector rule.
 *
 * SPRINT (SKILL.md, sprint-status file header): "Epic Status Transitions:
 *   - backlog → in-progress: Automatically when first story is created (via create-story)
 *   - in-progress → done: Manually when all stories reach 'done' status"
 * TMPL (sprint-status-template.yaml): "Mark epic as 'in-progress' when starting
 * work on its first story".
 * ROADMAP §1.2 hardens the prose: "Epic-lift is an idempotent projector rule:
 * the first child leaving `backlog` lifts the feature to `in_progress`; retries
 * no-op. Feature `done` is never automatic — the engine only *permits* it when
 * all children are done and a permitted actor commands it."
 *
 * Source keys used in comments:
 *   SPRINT  = src/bmm-skills/4-implementation/bmad-sprint-planning/SKILL.md
 *   TMPL    = src/bmm-skills/4-implementation/bmad-sprint-planning/sprint-status-template.yaml
 *   ROADMAP = product-roadmap.md
 */
import {
  createEngine,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

const PINNED_VERIFICATION = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  planner: Actor;
  approver: Actor;
  dev: Actor;
  reviewer: Actor;
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
  engine.grant({ actorId: approver.id, permission: 'gate.spec.approve' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
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

/** First hop out of backlog — the "child leaving backlog" trigger (ROADMAP §1.2). */
function leaveBacklog(rig: Rig, item: WorkItem): WorkItem {
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

function toReadyForDev(rig: Rig, item: WorkItem): WorkItem {
  leaveBacklog(rig, item);
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

/** Full golden path to done (evidence per ROADMAP §1.4, gates per D7). */
function toDone(rig: Rig, item: WorkItem): WorkItem {
  const { claim } = toInProgress(rig, item);
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
  rig.engine.advanceState({
    workItemId: item.id,
    to: 'in_review',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
  rig.engine.submitEvidence({
    workItemId: item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'test_run', payload: { command: 'pnpm test', exitCode: 0 } },
  });
  rig.engine.submitEvidence({
    workItemId: item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'final-sha', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return rig.engine.approveGate({ workItemId: item.id, gate: 'review_approval', actorId: rig.reviewer.id });
}

// ---------------------------------------------------------------------------

describe('epic lift (SPRINT epic transitions, ROADMAP §1.2)', () => {
  // SPRINT status definitions: "backlog: Epic not yet started";
  // step 2: epic entry "Default status: backlog".
  it('a new feature starts in backlog', () => {
    const rig = makeRig();
    expect(rig.feature.state).toBe('backlog');
    expect(rig.engine.getFeature(rig.feature.id).state).toBe('backlog');
  });

  // SPRINT: "Epic transitions to 'in-progress' automatically when first story is
  // created"; ROADMAP §1.2 hardens the trigger to "the first child leaving
  // `backlog`", executed under the system actor's implicit projector grant.
  it('the first story leaving backlog lifts the feature to in_progress, authored by system', () => {
    const rig = makeRig();
    const story1 = newItem(rig, '1-1');
    newItem(rig, '1-2');

    // Merely creating work-item rows is NOT the trigger — children are still in backlog.
    expect(rig.engine.getFeature(rig.feature.id).state).toBe('backlog');

    const featureEventsBefore = rig.engine.events(rig.feature.id);
    leaveBacklog(rig, story1);

    expect(rig.engine.getFeature(rig.feature.id).state).toBe('in_progress');

    // ROADMAP §1.2: "A system actor exists per workspace with versioned implicit
    // grants for exactly the projector rules (epic-lift, ...)" — the lift event
    // is authored by system, not by the actor who moved the story.
    const featureEventsAfter = rig.engine.events(rig.feature.id);
    expect(featureEventsAfter.length).toBeGreaterThan(featureEventsBefore.length);
    const appended = featureEventsAfter.slice(featureEventsBefore.length);
    const nonSystemActorIds = [rig.planner.id, rig.approver.id, rig.dev.id, rig.reviewer.id];
    for (const ev of appended) {
      expect(nonSystemActorIds).not.toContain(ev.actorId);
    }
  });

  // ROADMAP §1.2: "an idempotent projector rule ... retries no-op."
  it('is idempotent: the second story leaving backlog emits no further feature event', () => {
    const rig = makeRig();
    const story1 = newItem(rig, '1-1');
    const story2 = newItem(rig, '1-2');

    leaveBacklog(rig, story1);
    expect(rig.engine.getFeature(rig.feature.id).state).toBe('in_progress');
    const featureEventCountAfterLift = rig.engine.events(rig.feature.id).length;

    leaveBacklog(rig, story2);
    expect(rig.engine.getFeature(rig.feature.id).state).toBe('in_progress');
    expect(rig.engine.events(rig.feature.id).length).toBe(featureEventCountAfterLift);
  });

  // SPRINT: "in-progress → done: Manually when all stories reach 'done' status";
  // ROADMAP §1.2: "Feature `done` is never automatic — the engine only *permits*
  // it when all children are done and a permitted actor commands it."
  // The SpineEngine surface exposes no automatic feature completion; conformance
  // here is that the feature is still in_progress after every child is done.
  it('does NOT auto-complete the feature when all stories reach done', () => {
    const rig = makeRig();
    const story1 = newItem(rig, '1-1');
    const story2 = newItem(rig, '1-2');

    toDone(rig, story1);
    toDone(rig, story2);
    expect(rig.engine.getWorkItem(story1.id).state).toBe('done');
    expect(rig.engine.getWorkItem(story2.id).state).toBe('done');

    // All children done, yet the feature holds at in_progress until a permitted
    // actor commands the completion.
    expect(rig.engine.getFeature(rig.feature.id).state).toBe('in_progress');
  });
});
