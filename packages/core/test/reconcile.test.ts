/**
 * Conformance: reconciliation DB ↔ git (detect-and-report only).
 *
 * Sources:
 *  - product-roadmap.md D6 — "Reconciliation DB↔git is detect-and-report only. …
 *    Adopting detected drift is an explicit, authenticated command." Reconcile
 *    itself NEVER mutates state.
 *  - product-roadmap.md §1.6 — "The reconciler compares spec frontmatter at HEAD
 *    against DB state — excluding any file under a live claim (playbooks
 *    legitimately write frontmatter mid-run). Divergence produces a notification
 *    and a thread comment, never a state change."
 *  - product-roadmap.md D8 — "blocked is an overlay (blocked_reason column), not
 *    an FSM state" → a file saying `status: blocked` and a DB row with
 *    blocked_reason set are the same truth, not divergence.
 *  - product-roadmap.md §1.1 — "(`review` ≡ `in-review` from the two legacy
 *    vocabularies.)" → legacy frontmatter vocab normalizes before comparison.
 */
import {
  createEngine,
  type Claim,
  type Permission,
  type SpineEngine,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERMS: Permission[] = [
  'task.plan',
  'task.claim',
  'task.advance',
  'task.block',
  'gate.review.approve',
  'feature.init',
];

function setup(): { engine: SpineEngine; actorId: string; featureId: string } {
  const engine = createEngine();
  const actor = engine.createActor({ type: 'user', displayName: 'Reconciler' });
  for (const permission of PERMS) {
    engine.grant({ actorId: actor.id, permission });
  }
  const feature = engine.createFeature({ actorId: actor.id });
  return { engine, actorId: actor.id, featureId: feature.id };
}

/** Create a story and march it to in_progress under a live claim (§1.3). */
function toInProgressClaimed(
  engine: SpineEngine,
  actorId: string,
  featureId: string,
  externalKey: string,
): { workItemId: string; claim: Claim } {
  const wi = engine.createWorkItem({ featureId, externalKey, title: `Story ${externalKey}`, actorId });
  engine.advanceState({ workItemId: wi.id, to: 'draft', actorId });
  engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId });
  const claim = engine.claimTask({ workItemId: wi.id, actorId });
  engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId, fencingToken: claim.fencingToken });
  return { workItemId: wi.id, claim };
}

/**
 * in_progress with NO live claim — released leases return the item to the pool
 * at its current state (§1.3, never downgraded), which is exactly the window
 * the reconciler looks at.
 */
function toInProgressUnclaimed(
  engine: SpineEngine,
  actorId: string,
  featureId: string,
  externalKey: string,
): string {
  const { workItemId, claim } = toInProgressClaimed(engine, actorId, featureId, externalKey);
  engine.releaseClaim({ claimId: claim.id, reason: 'run finished' });
  return workItemId;
}

/** in_review with NO live claim (evidence submitted under the claim, §1.4). */
function toInReviewUnclaimed(
  engine: SpineEngine,
  actorId: string,
  featureId: string,
  externalKey: string,
): string {
  const { workItemId, claim } = toInProgressClaimed(engine, actorId, featureId, externalKey);
  engine.submitEvidence({
    workItemId,
    actorId,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'aaaa111', final: 'bbbb222', filesChanged: 2, nonEmpty: true, branch: `claim/${claim.id}` },
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
  engine.releaseClaim({ claimId: claim.id, reason: 'run finished' });
  return workItemId;
}

// ---------------------------------------------------------------------------

describe('reconcile — detect and report only (roadmap D6, §1.6)', () => {
  // §1.6: frontmatter ahead of the DB is a reported divergence; the file claims
  // done while the DB says in_progress.
  it('reports file_ahead when frontmatter says done but the DB says in_progress', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInProgressUnclaimed(engine, actorId, featureId, 'r1');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'done' }],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.workItemId).toBe(workItemId);
    expect(reports[0]?.fileState).toBe('done');
    expect(reports[0]?.dbState).toBe('in_progress');
    // File is further along the §1.1 rank order than the DB.
    expect(reports[0]?.kind).toBe('file_ahead');
  });

  // D6: "detect-and-report only … Adopting detected drift is an explicit,
  // authenticated command" — reconcile NEVER mutates the work item.
  it('never mutates the work item, whatever the frontmatter claims', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInProgressUnclaimed(engine, actorId, featureId, 'r2');
    const before = engine.getWorkItem(workItemId);

    engine.reconcile({ files: [{ workItemId, frontmatterStatus: 'done' }] });

    const after = engine.getWorkItem(workItemId);
    expect(after.state).toBe('in_progress');
    expect(after.stateVersion).toBe(before.stateVersion);
    expect(after.blockedReason).toBeNull();
  });
});

describe('reconcile — live-claim exclusion (roadmap §1.6)', () => {
  // §1.6: "excluding any file under a live claim (playbooks legitimately write
  // frontmatter mid-run)" — dev-auto stamps frontmatter between entry and HALT,
  // so mid-run drift is not divergence.
  it('excludes files belonging to a work item under a live claim', () => {
    const { engine, actorId, featureId } = setup();
    const { workItemId } = toInProgressClaimed(engine, actorId, featureId, 'r3');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'done' }],
    });

    expect(reports).toEqual([]);
  });

  // Counterpart: the same file IS compared once the claim is gone — proving the
  // exclusion above came from the live claim, not from ignoring the file.
  it('compares the same file again once the claim is released', () => {
    const { engine, actorId, featureId } = setup();
    const { workItemId, claim } = toInProgressClaimed(engine, actorId, featureId, 'r4');
    engine.releaseClaim({ claimId: claim.id, reason: 'run finished' });

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'done' }],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.workItemId).toBe(workItemId);
  });
});

describe('reconcile — blocked is an overlay, not a state (roadmap D8)', () => {
  // D8: "blocked is an overlay (blocked_reason column), not an FSM state" — a
  // file writing `status: blocked` while the DB holds blocked_reason over an
  // in_progress base state are two representations of one truth.
  it('does not report divergence for status blocked when the DB has blockedReason set', () => {
    const { engine, actorId, featureId } = setup();
    const { workItemId, claim } = toInProgressClaimed(engine, actorId, featureId, 'r5');
    const blocked = engine.blockTask({
      workItemId,
      reason: 'awaiting_human_input',
      actorId,
      fencingToken: claim.fencingToken,
    });
    // D8 sanity: the overlay froze transitions WITHOUT changing state.
    expect(blocked.state).toBe('in_progress');
    expect(blocked.blockedReason).toBe('awaiting_human_input');
    engine.releaseClaim({ claimId: claim.id, reason: 'halted blocked' });

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'blocked' }],
    });

    expect(reports).toEqual([]);
  });

  // Counterpart: a file claiming blocked while the DB shows NO overlay is real
  // drift and must be reported (detect, §1.6 — the kind taxonomy for overlay
  // drift is the engine's choice, so only the presence is pinned).
  it('reports divergence for status blocked when the DB has no blocked overlay', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInProgressUnclaimed(engine, actorId, featureId, 'r6');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'blocked' }],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.workItemId).toBe(workItemId);
    // And still no mutation (D6).
    expect(engine.getWorkItem(workItemId).blockedReason).toBeNull();
  });
});

describe('reconcile — legacy vocabulary normalization (roadmap §1.1)', () => {
  // §1.1: "(`review` ≡ `in-review` from the two legacy vocabularies.)" — the two
  // BMAD frontmatter dialects both mean in_review; neither is divergence.
  it('treats frontmatter in-review as equal to DB in_review', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInReviewUnclaimed(engine, actorId, featureId, 'r7');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'in-review' }],
    });

    expect(reports).toEqual([]);
  });

  it('treats frontmatter review as equal to DB in_review', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInReviewUnclaimed(engine, actorId, featureId, 'r8');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'review' }],
    });

    expect(reports).toEqual([]);
  });

  // Baseline: an exactly-matching status is never divergence (§1.6 compares
  // frontmatter against DB state; equality is the quiet case).
  it('reports nothing when frontmatter matches the DB state exactly', () => {
    const { engine, actorId, featureId } = setup();
    const workItemId = toInProgressUnclaimed(engine, actorId, featureId, 'r9');

    const reports = engine.reconcile({
      files: [{ workItemId, frontmatterStatus: 'in_progress' }],
    });

    expect(reports).toEqual([]);
  });
});
