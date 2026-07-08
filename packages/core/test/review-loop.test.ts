/**
 * CONFORMANCE — Review loop: rejection loopback, iteration counter, non-convergence.
 *
 * Written BEFORE the engine (product-roadmap.md §1.2: "every prose rule …
 * becomes a conformance test"). Red against the NotImplementedError stubs by design.
 *
 * Authority for this file:
 *  - product-roadmap.md §1.2 — "Gate rejection produces the loopback deterministically:
 *    reject_gate fires in_review → in_progress as a system effect (actor = system,
 *    causation = the gate decision, review-loop incremented). No claim-holder
 *    participation required — this closes the reject-after-claim-expiry deadlock."
 *  - product-roadmap.md §1.1 — "review_loop_iteration (DB is the only counter;
 *    exactly 5 loopbacks allowed, the 6th blocks)".
 *  - product-roadmap.md D8 — "blocked is an overlay (blocked_reason column), not an
 *    FSM state … unblock restores position without a backward transition."
 *  - product-roadmap.md §4.2 — "review_non_convergence (6th loopback) can only be
 *    released by a review-gate holder."
 *  - src/bmm-skills/4-implementation/bmad-dev-auto/step-04-review.md — "Before each
 *    bad_spec loopback, read {spec_file} frontmatter review_loop_iteration (missing
 *    means 0), increment it by 1, and write it back. If it exceeds 5, … HALT with
 *    status blocked and blocking condition 'review repair loop exceeded 5 iterations
 *    (non-convergence)'."
 *  - src/bmm-skills/4-implementation/bmad-quick-dev/step-04-review.md — "If it
 *    exceeds 5, HALT and escalate to the human."
 *
 * Interpretations fixed by this suite (noted): the blocking 6th rejection performs
 * NO loopback, so the counter stays at REVIEW_LOOP_LIMIT (it counts performed
 * loopbacks — dev-auto's file-side write of 6 is not adopted because §1.1 makes the
 * DB the only counter and allows "exactly 5 loopbacks"); the claim survives a
 * loopback (the roadmap only removes the claim-holder from the loopback itself).
 */
import {
  createEngine,
  PermissionDeniedError,
  REVIEW_LOOP_LIMIT,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

const CLAIM_TTL_MS = 3_600_000;
const PINNED = ['pnpm -r test'];

interface Ctx {
  engine: SpineEngine;
  po: Actor; // §3: "product_owner (spec approval …)"
  dev: Actor; // §3: "developer (claim, advance to review with evidence)"
  reviewer: Actor; // §3: "reviewer (review approval / rejection-loopback)"
  feature: Feature;
}

function setup(): Ctx {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'Product Owner' });
  const dev = engine.createActor({ type: 'user', displayName: 'Developer' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  engine.grant({ actorId: po.id, permission: 'feature.init' });
  engine.grant({ actorId: po.id, permission: 'task.plan' });
  engine.grant({ actorId: po.id, permission: 'task.advance' });
  engine.grant({ actorId: po.id, permission: 'gate.spec.approve' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: dev.id, permission: 'task.block' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, po, dev, reviewer, feature };
}

function submitDiff(ctx: Ctx, workItemId: string, claim: Claim): void {
  ctx.engine.submitEvidence({
    workItemId,
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      // §1.3: "diff evidence is only accepted on the branch of the live claim"
      payload: { baseline: 'base0000', final: 'head9999', filesChanged: 2, nonEmpty: true, branch: `claim/${claim.id}` },
    },
  });
}

/** Drives one item through draft → spec approval (pins commands, D7) → claim → in_review. */
function setupItemInReview(ctx: Ctx, key = '1-1'): { wi: WorkItem; claim: Claim } {
  const wi = ctx.engine.createWorkItem({
    featureId: ctx.feature.id,
    externalKey: key,
    title: `Story ${key}`,
    actorId: ctx.po.id,
    specCheckpoint: true, // §1.1: spec_checkpoint ⇒ spec-approval gate mandatory
  });
  ctx.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: ctx.po.id });
  ctx.engine.approveGate({
    workItemId: wi.id,
    gate: 'spec_approval',
    actorId: ctx.po.id,
    pinnedVerification: PINNED,
  });
  const claim = ctx.engine.claimTask({ workItemId: wi.id, actorId: ctx.dev.id, ttlMs: CLAIM_TTL_MS });
  ctx.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: ctx.dev.id, fencingToken: claim.fencingToken });
  submitDiff(ctx, wi.id, claim);
  ctx.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: ctx.dev.id, fencingToken: claim.fencingToken });
  return { wi: ctx.engine.getWorkItem(wi.id), claim };
}

function rejectReview(ctx: Ctx, workItemId: string): WorkItem {
  return ctx.engine.rejectGate({ workItemId, gate: 'review_approval', actorId: ctx.reviewer.id });
}

/** After a loopback: dev reworks under the same live claim and re-enters review. */
function reworkToReview(ctx: Ctx, workItemId: string, claim: Claim): WorkItem {
  submitDiff(ctx, workItemId, claim);
  return ctx.engine.advanceState({
    workItemId,
    to: 'in_review',
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
  });
}

/** Runs the full allowed budget: REVIEW_LOOP_LIMIT reject→rework cycles, ending back at in_review. */
function exhaustLoopBudget(ctx: Ctx): { wi: WorkItem; claim: Claim } {
  const { wi, claim } = setupItemInReview(ctx);
  for (let i = 1; i <= REVIEW_LOOP_LIMIT; i++) {
    rejectReview(ctx, wi.id);
    reworkToReview(ctx, wi.id, claim);
  }
  return { wi: ctx.engine.getWorkItem(wi.id), claim };
}

// ---------------------------------------------------------------------------
// §1.2 — the loopback is a system effect
// ---------------------------------------------------------------------------
describe('gate rejection fires the loopback as a system effect (roadmap §1.2)', () => {
  // §1.2: "No claim-holder participation required — this closes the
  // reject-after-claim-expiry deadlock." The claim's lease is expired here, so
  // nobody could present a live fencing token — the loopback must still happen.
  it('rejectGate returns the item to in_progress even after the claim lease expired', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx);
    ctx.engine.advanceClock(CLAIM_TTL_MS + 1); // zombie claim; item stays in_review (§1.3 "never downgraded")

    const after = rejectReview(ctx, wi.id);

    expect(after.state).toBe('in_progress');
    expect(after.reviewLoopIteration).toBe(1); // §1.2: "review-loop incremented"
    expect(after.blockedReason).toBeNull();
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_progress');
  });

  // §1.2: "actor = system, causation = the gate decision" and "A system actor exists
  // per workspace … no event in the log is ever authority-orphaned." (§1.5: every
  // event carries actor and causation.)
  it('records the loopback with system authorship and causation from the gate decision', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx);
    const knownActorIds = [ctx.po.id, ctx.dev.id, ctx.reviewer.id];
    const seqBefore = ctx.engine.events().length;

    rejectReview(ctx, wi.id);

    const newEvents = ctx.engine.events().slice(seqBefore);
    // At minimum: the reviewer's gate decision plus the system-effected transition.
    expect(newEvents.length).toBeGreaterThanOrEqual(2);
    // The decision itself is authored by the reviewer …
    expect(newEvents.some((e) => e.actorId === ctx.reviewer.id)).toBe(true);
    // … the loopback is authored by the workspace system actor (an actor none of
    // the fixtures created — the API exposes no direct system-actor lookup).
    const systemEffected = newEvents.filter((e) => !knownActorIds.includes(e.actorId));
    expect(systemEffected.length).toBeGreaterThanOrEqual(1);
    // §1.2: "causation = the gate decision" — the effect is traceable to its cause.
    expect(systemEffected.some((e) => e.causationId !== undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §1.1 + dev-auto/quick-dev step-04 — exactly 5 loopbacks, the 6th blocks
// ---------------------------------------------------------------------------
describe(`review loop limit — exactly ${REVIEW_LOOP_LIMIT} loopbacks (roadmap §1.1, dev-auto & quick-dev step-04)`, () => {
  // §1.1: "exactly 5 loopbacks allowed" — dev-auto step-04: increment per loopback,
  // halt only when it *exceeds* 5. So loopbacks 1..5 must all go through.
  it('allows all five loopbacks, incrementing the DB-owned counter by exactly one each time', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx);

    for (let i = 1; i <= REVIEW_LOOP_LIMIT; i++) {
      const rejected = rejectReview(ctx, wi.id);
      expect(rejected.state).toBe('in_progress');
      expect(rejected.reviewLoopIteration).toBe(i);
      expect(rejected.blockedReason).toBeNull(); // within budget: loopback, never a block

      const resubmitted = reworkToReview(ctx, wi.id, claim);
      expect(resubmitted.state).toBe('in_review');
      // Advancing is not a loopback — only the rejection effect moves the counter.
      expect(resubmitted.reviewLoopIteration).toBe(i);
    }

    const after = ctx.engine.getWorkItem(wi.id);
    expect(after.state).toBe('in_review');
    expect(after.reviewLoopIteration).toBe(REVIEW_LOOP_LIMIT);
    expect(after.blockedReason).toBeNull();
  });

  // §1.1: "the 6th blocks" — dev-auto step-04: "If it exceeds 5, … HALT with status
  // blocked and blocking condition 'review repair loop exceeded 5 iterations
  // (non-convergence)'". D8 maps that HALT taxonomy onto the blocked_reason enum.
  it('the sixth rejection blocks with review_non_convergence instead of producing a sixth loopback', () => {
    const ctx = setup();
    const { wi } = exhaustLoopBudget(ctx);

    const blocked = rejectReview(ctx, wi.id);

    expect(blocked.blockedReason).toBe('review_non_convergence');
    // D8: blocked is an overlay that "freezes transitions without changing state" —
    // no sixth loopback happened, the item did NOT move back to in_progress.
    expect(blocked.state).toBe('in_review');
    // The counter records performed loopbacks; the blocked rejection performed none.
    expect(blocked.reviewLoopIteration).toBe(REVIEW_LOOP_LIMIT);
  });

  // §4.2: "review_non_convergence (6th loopback) can only be released by a
  // review-gate holder." §1.1: the DB is the ONLY counter — no API resets it,
  // and unblocking is not a counter mutation.
  it('only a review-gate holder can release review_non_convergence, and unblocking leaves the counter untouched', () => {
    const ctx = setup();
    const { wi } = exhaustLoopBudget(ctx);
    rejectReview(ctx, wi.id); // sixth rejection ⇒ blocked: review_non_convergence

    // The developer holds task.block but NOT gate.review.approve ⇒ cannot release.
    expect(() => ctx.engine.unblockTask({ workItemId: wi.id, actorId: ctx.dev.id })).toThrow(
      PermissionDeniedError,
    );
    expect(ctx.engine.getWorkItem(wi.id).blockedReason).toBe('review_non_convergence');

    // The review-gate holder releases it.
    const released = ctx.engine.unblockTask({ workItemId: wi.id, actorId: ctx.reviewer.id });
    expect(released.blockedReason).toBeNull();
    // D8: "unblock restores position without a backward transition".
    expect(released.state).toBe('in_review');
    // §1.1: DB is the only counter — releasing the overlay did not touch it.
    expect(released.reviewLoopIteration).toBe(REVIEW_LOOP_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// §3 — rejection-loopback belongs to the reviewer role's grant
// ---------------------------------------------------------------------------
describe('rejection requires the review gate grant (roadmap §3)', () => {
  // §3 delivery roles: "reviewer (review approval / rejection-loopback)" — reject is
  // the same gate authority as approve. A developer grant does not include it.
  it('denies rejectGate to an actor without gate.review.approve', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx);

    expect(() =>
      ctx.engine.rejectGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.dev.id }),
    ).toThrow(PermissionDeniedError);

    // The denied attempt caused no loopback and no counter movement.
    const after = ctx.engine.getWorkItem(wi.id);
    expect(after.state).toBe('in_review');
    expect(after.reviewLoopIteration).toBe(0);
    expect(after.blockedReason).toBeNull();
  });
});
