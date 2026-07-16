/**
 * CONFORMANCE — Claim protocol: leases, fencing tokens, zombie writes.
 *
 * Written BEFORE the engine (product-roadmap.md "Build phases", Phase 0 exit
 * criterion: "conformance test suite written from the prose FSM before any
 * engine code"). The engine is implemented to make this suite pass — never
 * the other way around.
 *
 * Sources cited per test:
 *   [R§0.2]  product-roadmap.md §0.2 — "Claim | A lease on a work item held
 *            by one actor, protected by a fencing token."
 *   [R§1.2]  product-roadmap.md §1.2 — "Claims are permitted in
 *            in_progress/in_review when no live claim exists (resume
 *            semantics, matching dev-auto's entry-state routing)."
 *   [R§1.3]  product-roadmap.md §1.3 — claim protocol (one live claim, lease
 *            TTL + heartbeat, monotonic fencing token, stale token = 409 +
 *            audit event, expired lease returns item at its current state).
 *   [DA-01]  src/bmm-skills/4-implementation/bmad-dev-auto/step-01-clarify-and-route.md —
 *            entry-state routing: "`ready-for-dev` or `in-progress` →
 *            ./step-03-implement.md", "`in-review` → ./step-04-review.md"
 *            (a re-dispatch resumes at the current state; it never restarts).
 *
 * Interpretation choices (the roadmap prose does not split these; this suite
 * arbitrates, and flags them for the engine author):
 *   - [R§1.3] "Every worker mutation ... must present the token" is read
 *     literally: a claim-guarded command with NO token is a failed data guard
 *     → GuardFailedError, even when the caller happens to hold the live
 *     claim. A PRESENTED token that is not the live token for that work item
 *     (released, expired, or another item's) is a fencing conflict →
 *     ConflictError ("HTTP 409 semantics" per the error-class doc in
 *     src/index.ts).
 *   - heartbeat renews the full original ttlMs from the heartbeat instant
 *     ([R§1.3] says only "lease (TTL + heartbeat)").
 *   - backlog→draft is claim-guarded, therefore claiming a backlog item is
 *     legal (otherwise the transition could never fire).
 *   - specCheckpoint=false ⇒ draft→ready_for_dev advances directly via
 *     advanceState (contrapositive of R§1.1 "spec_checkpoint ⇒ the
 *     spec-approval gate is mandatory") — lets fixtures reach later states
 *     without importing gate semantics owned by another test cluster.
 *   - one claim may span several transitions (claimed at backlog, advanced
 *     through in_review under the same fencing token).
 */
import {
  createEngine,
  ConflictError,
  GuardFailedError,
  type Claim,
  type Permission,
  type SpineEngine,
  type WorkItemState,
} from '../src/index.js';

// Delivery-role grants a developer actor needs in this cluster (roadmap §3:
// developer = "claim, advance to review with evidence"; plus fixture setup).
const BASE_PERMISSIONS: readonly Permission[] = [
  'feature.init',
  'task.plan',
  'task.claim',
  'task.advance',
  'task.block',
];

function makeGrantedActor(
  engine: SpineEngine,
  displayName: string,
  extra: readonly Permission[] = [],
): string {
  const actor = engine.createActor({ type: 'agent', displayName });
  for (const permission of [...BASE_PERMISSIONS, ...extra]) {
    engine.grant({ actorId: actor.id, permission });
  }
  return actor.id;
}

interface Fixture {
  engine: SpineEngine;
  actorId: string;
  featureId: string;
  workItemId: string;
}

function setup(extra: readonly Permission[] = []): Fixture {
  const engine = createEngine();
  const actorId = makeGrantedActor(engine, 'dev-a', extra);
  const feature = engine.createFeature({ actorId });
  const workItem = engine.createWorkItem({
    featureId: feature.id,
    externalKey: '1-1',
    title: 'Conformance fixture story',
    specCheckpoint: false, // no spec gate → draft→ready_for_dev advances directly (R§1.1)
    actorId,
  });
  return { engine, actorId, featureId: feature.id, workItemId: workItem.id };
}

// Canonical forward path, R§1.1: backlog → draft → ready_for_dev → in_progress → in_review.
const CANONICAL_PATH: readonly WorkItemState[] = [
  'draft',
  'ready_for_dev',
  'in_progress',
  'in_review',
];

/** Claims the (backlog) item and advances it to `target`, keeping the claim live. */
function driveTo(
  engine: SpineEngine,
  actorId: string,
  workItemId: string,
  target: WorkItemState,
  ttlMs?: number,
): Claim {
  const claim =
    ttlMs === undefined
      ? engine.claimTask({ workItemId, actorId })
      : engine.claimTask({ workItemId, actorId, ttlMs });
  for (const state of CANONICAL_PATH) {
    engine.advanceState({ workItemId, to: state, actorId, fencingToken: claim.fencingToken });
    if (state === target) break;
  }
  return claim;
}

interface ZombieFixture extends Fixture {
  /** claim whose lease has expired — its holder is the zombie */
  staleClaim: Claim;
  successorActorId: string;
  successorClaim: Claim;
}

/**
 * The defining BYO failure mode (R§1.3): actor A claims and works, its
 * machine sleeps past the lease, actor B legitimately re-claims. A is now a
 * zombie holding a stale fencing token.
 */
function setupZombie(): ZombieFixture {
  const fx = setup();
  const staleClaim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_progress', 1_000);
  fx.engine.advanceClock(2_000); // lease (ttl 1000) is now expired
  const successorActorId = makeGrantedActor(fx.engine, 'dev-b');
  const successorClaim = fx.engine.claimTask({
    workItemId: fx.workItemId,
    actorId: successorActorId,
  });
  return { ...fx, staleClaim, successorActorId, successorClaim };
}

describe('§1.3 claim protocol', () => {
  describe('claim basics — [R§0.2] "a lease ... protected by a fencing token"; [R§1.3] "One live claim per work item"', () => {
    // [R§1.3] "Claims carry a lease (TTL + heartbeat) and a monotonic fencing token."
    it('claimTask returns a Claim carrying a fencing token and a live lease', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId, ttlMs: 60_000 });
      expect(claim.workItemId).toBe(workItemId);
      expect(claim.actorId).toBe(actorId);
      expect(claim.released).toBe(false);
      expect(typeof claim.fencingToken).toBe('number');
      // lease expires ttlMs after claim time, so never before ttlMs on the engine clock
      expect(claim.leaseExpiresAt).toBeGreaterThanOrEqual(60_000);
    });

    // [R§1.3] "One live claim per work item, enforced by a partial unique
    // index — races lose by constraint, not by application logic."
    it('a second claim while one is live is refused with ConflictError and creates no claim row', () => {
      const { engine, actorId, workItemId } = setup();
      engine.claimTask({ workItemId, actorId });
      const rivalActorId = makeGrantedActor(engine, 'dev-b');
      expect(() => engine.claimTask({ workItemId, actorId: rivalActorId })).toThrow(
        ConflictError,
      );
      // the loser left nothing behind — constraint, not partial write
      expect(engine.getClaims(workItemId)).toHaveLength(1);
    });

    // [R§1.3] "a monotonic fencing token" — monotonic PER WORK ITEM across
    // successive claims, otherwise stale-token detection cannot work.
    it('release then re-claim succeeds and issues a strictly greater fencing token', () => {
      const { engine, actorId, workItemId } = setup();
      const first = engine.claimTask({ workItemId, actorId });
      engine.releaseClaim({ claimId: first.id, actorId: first.actorId });
      const second = engine.claimTask({ workItemId, actorId });
      expect(second.released).toBe(false);
      expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
      engine.releaseClaim({ claimId: second.id, actorId: second.actorId });
      const third = engine.claimTask({ workItemId, actorId });
      expect(third.fencingToken).toBeGreaterThan(second.fencingToken);
    });
  });

  describe('lease expiry — [R§1.3] "Expired leases return the item to the pool at its current state (never downgraded)"', () => {
    it('after the TTL passes another actor can claim; state is preserved and the new token is greater', () => {
      const fx = setup();
      const expired = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_progress', 1_000);
      fx.engine.advanceClock(1_500); // strictly past the 1000ms lease
      const successorActorId = makeGrantedActor(fx.engine, 'dev-b');
      const reclaimed = fx.engine.claimTask({
        workItemId: fx.workItemId,
        actorId: successorActorId,
      });
      expect(reclaimed.actorId).toBe(successorActorId);
      expect(reclaimed.released).toBe(false);
      // monotonicity must hold ACROSS expiry too, or fencing cannot reject the zombie
      expect(reclaimed.fencingToken).toBeGreaterThan(expired.fencingToken);
      // "at its current state (never downgraded)"
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('in_progress');
    });
  });

  describe('heartbeat — [R§1.3] "Claims carry a lease (TTL + heartbeat)"', () => {
    it('heartbeat extends the lease past the original TTL: the claim stays live and a rival claim gets ConflictError', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId, ttlMs: 1_000 });
      engine.advanceClock(900); // near expiry
      engine.heartbeat({ claimId: claim.id, actorId: claim.actorId });
      engine.advanceClock(900); // t=1800 — past the ORIGINAL expiry (1000), inside the renewed lease
      const rivalActorId = makeGrantedActor(engine, 'dev-b');
      expect(() => engine.claimTask({ workItemId, actorId: rivalActorId })).toThrow(
        ConflictError,
      );
    });
  });

  describe('zombie fencing — [R§1.3] "a stale token gets 409 and an audit event"; "Zombie workers ... cannot overwrite a successor\'s work"', () => {
    it('stale advanceState is refused with ConflictError, leaves the projection untouched, and appends an audit event', () => {
      const fx = setupZombie();
      const before = fx.engine.getWorkItem(fx.workItemId);
      const eventCountBefore = fx.engine.events().length;
      expect(() =>
        fx.engine.advanceState({
          workItemId: fx.workItemId,
          to: 'in_review',
          actorId: fx.actorId,
          fencingToken: fx.staleClaim.fencingToken,
        }),
      ).toThrow(ConflictError);
      const after = fx.engine.getWorkItem(fx.workItemId);
      expect(after.state).toBe('in_progress'); // successor's position untouched
      expect(after.stateVersion).toBe(before.stateVersion); // no hidden write
      // "an audit event" — the refusal itself is recorded in the log
      expect(fx.engine.events().length).toBeGreaterThan(eventCountBefore);
    });

    // [R§1.3] lists submit_evidence among "Every worker mutation ... must
    // present the token". Fencing is checked before evidence content is even
    // looked at — a zombie's measurements are not data.
    it('stale submitEvidence is refused with ConflictError', () => {
      const fx = setupZombie();
      expect(() =>
        fx.engine.submitEvidence({
          workItemId: fx.workItemId,
          actorId: fx.actorId,
          fencingToken: fx.staleClaim.fencingToken,
          evidence: {
            kind: 'git_diff',
            payload: { baseline: 'a1a1a1', final: 'b2b2b2', filesChanged: 3, nonEmpty: true, branch: 'zombie-branch' },
          },
        }),
      ).toThrow(ConflictError);
    });

    // [R§1.3] lists block_task among the fenced worker mutations.
    it('stale blockTask is refused with ConflictError and the blocked overlay stays unset', () => {
      const fx = setupZombie();
      expect(() =>
        fx.engine.blockTask({
          workItemId: fx.workItemId,
          reason: 'awaiting_human_input',
          actorId: fx.actorId,
          fencingToken: fx.staleClaim.fencingToken,
        }),
      ).toThrow(ConflictError);
      expect(fx.engine.getWorkItem(fx.workItemId).blockedReason).toBeNull();
    });

    it('the successor with the live token proceeds normally after the zombie was rejected', () => {
      const fx = setupZombie();
      expect(() =>
        fx.engine.advanceState({
          workItemId: fx.workItemId,
          to: 'in_review',
          actorId: fx.actorId,
          fencingToken: fx.staleClaim.fencingToken,
        }),
      ).toThrow(ConflictError);
      const advanced = fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'in_review',
        actorId: fx.successorActorId,
        fencingToken: fx.successorClaim.fencingToken,
      });
      expect(advanced.state).toBe('in_review');
    });
  });

  describe('resume semantics — [R§1.2] "Claims are permitted in in_progress/in_review when no live claim exists"; [DA-01] in-progress → step-03, in-review → step-04', () => {
    it('an in_progress item with no live claim can be claimed again (resume, not restart)', () => {
      const fx = setup();
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_progress');
      fx.engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
      const resumerActorId = makeGrantedActor(fx.engine, 'dev-b');
      const resumed = fx.engine.claimTask({
        workItemId: fx.workItemId,
        actorId: resumerActorId,
      });
      expect(resumed.released).toBe(false);
      expect(resumed.workItemId).toBe(fx.workItemId);
      // [DA-01]: "`ready-for-dev` or `in-progress` → ./step-03-implement.md" — state is the entry point, unchanged by claiming
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('in_progress');
    });

    it('an in_review item with no live claim can be claimed again', () => {
      const fx = setup();
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_review');
      fx.engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
      const resumerActorId = makeGrantedActor(fx.engine, 'dev-b');
      const resumed = fx.engine.claimTask({
        workItemId: fx.workItemId,
        actorId: resumerActorId,
      });
      expect(resumed.released).toBe(false);
      // [DA-01]: "`in-review` → ./step-04-review.md" — claiming resumes at in_review
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('in_review');
    });
  });

  describe('claim-guarded transitions — [R§1.3] "Every worker mutation ... must present the token"', () => {
    // Semantics arbitrated by this suite (see file header): missing claim /
    // missing token = failed data guard → GuardFailedError; a presented but
    // wrong token = fencing conflict → ConflictError (409).

    // ARBITRATED PIN (see CONFORMANCE.md "Claims"): claims serialize the
    // EXECUTION zone. Planning transitions (backlog→draft, draft→ready_for_dev)
    // are permission-only — 4 other clusters advance them unclaimed, and the
    // dispatch path (roadmap §2.3) always claims regardless of state. A
    // presented token is still always validated (tests below).
    it('backlog→draft succeeds without a claim — planning transitions are permission-only', () => {
      const { engine, actorId, workItemId } = setup();
      const advanced = engine.advanceState({ workItemId, to: 'draft', actorId });
      expect(advanced.state).toBe('draft');
    });

    it('ready_for_dev→in_progress without a claim → GuardFailedError', () => {
      const fx = setup();
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'ready_for_dev');
      fx.engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
      expect(() =>
        fx.engine.advanceState({ workItemId: fx.workItemId, to: 'in_progress', actorId: fx.actorId }),
      ).toThrow(GuardFailedError);
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('ready_for_dev');
    });

    it('in_progress→in_review without a claim → GuardFailedError', () => {
      const fx = setup();
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_progress');
      fx.engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
      expect(() =>
        fx.engine.advanceState({ workItemId: fx.workItemId, to: 'in_review', actorId: fx.actorId }),
      ).toThrow(GuardFailedError);
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('in_progress');
    });

    // [R§1.3] "must PRESENT the token" — holding the claim is not enough;
    // fencing only works if the caller proves which lease it believes it holds.
    it('holding the live claim but omitting the fencing token → GuardFailedError; presenting it succeeds', () => {
      const fx = setup();
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_progress');
      expect(() =>
        fx.engine.advanceState({ workItemId: fx.workItemId, to: 'in_review', actorId: fx.actorId }),
      ).toThrow(GuardFailedError);
      const advanced = fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'in_review',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(advanced.state).toBe('in_review');
    });

    // [R§1.3] "a stale token gets 409" — a released claim's token is stale.
    it("a released claim's token → ConflictError", () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId });
      engine.releaseClaim({ claimId: claim.id, actorId: claim.actorId });
      expect(() =>
        engine.advanceState({ workItemId, to: 'draft', actorId, fencingToken: claim.fencingToken }),
      ).toThrow(ConflictError);
      expect(engine.getWorkItem(workItemId).state).toBe('backlog');
    });

    // A live token for a DIFFERENT work item is still the wrong token here —
    // fencing is per work item ([R§1.3] "monotonic fencing token" per claim
    // on ONE work item; [R§0.2] "a lease on a work item").
    it("another work item's live token → ConflictError", () => {
      const fx = setup();
      const other = fx.engine.createWorkItem({
        featureId: fx.featureId,
        externalKey: '1-2',
        title: 'Other conformance fixture story',
        specCheckpoint: false,
        actorId: fx.actorId,
      });
      const otherClaim = fx.engine.claimTask({ workItemId: other.id, actorId: fx.actorId });
      expect(() =>
        fx.engine.advanceState({
          workItemId: fx.workItemId,
          to: 'draft',
          actorId: fx.actorId,
          fencingToken: otherClaim.fencingToken,
        }),
      ).toThrow(ConflictError);
      expect(fx.engine.getWorkItem(fx.workItemId).state).toBe('backlog');
    });
  });

  describe('claim mutation authorization — holder or fencing token (roadmap §8)', () => {
    it('the holder may heartbeat and release its own claim', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId });
      expect(() => engine.heartbeat({ claimId: claim.id, actorId })).not.toThrow();
      expect(() => engine.releaseClaim({ claimId: claim.id, actorId })).not.toThrow();
      expect(engine.getClaims(workItemId).every((c) => c.released)).toBe(true);
    });

    it('a non-holder with no token cannot heartbeat or release → ConflictError + fencing.rejected', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId });
      const stranger = makeGrantedActor(engine, 'stranger');
      const before = engine.events(workItemId).length;
      expect(() => engine.heartbeat({ claimId: claim.id, actorId: stranger })).toThrow(ConflictError);
      expect(() => engine.releaseClaim({ claimId: claim.id, actorId: stranger })).toThrow(ConflictError);
      const rejected = engine
        .events(workItemId)
        .slice(before)
        .filter((e) => e.type === 'fencing.rejected');
      expect(rejected.length).toBeGreaterThanOrEqual(2);
      // the claim was never touched — still live
      expect(engine.getClaims(workItemId).filter((c) => !c.released)).toHaveLength(1);
    });

    it('a non-holder presenting the live fencing token may heartbeat and release (the token is the capability)', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId });
      const bearer = makeGrantedActor(engine, 'bearer');
      expect(() =>
        engine.heartbeat({ claimId: claim.id, actorId: bearer, fencingToken: claim.fencingToken }),
      ).not.toThrow();
      expect(() =>
        engine.releaseClaim({ claimId: claim.id, actorId: bearer, fencingToken: claim.fencingToken }),
      ).not.toThrow();
    });

    it('release by the holder is idempotent (already released → no-op, no throw)', () => {
      const { engine, actorId, workItemId } = setup();
      const claim = engine.claimTask({ workItemId, actorId });
      engine.releaseClaim({ claimId: claim.id, actorId });
      expect(() => engine.releaseClaim({ claimId: claim.id, actorId })).not.toThrow();
    });
  });
});
