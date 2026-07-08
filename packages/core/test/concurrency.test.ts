/**
 * CONFORMANCE — Optimistic concurrency, event-stream integrity, idempotency.
 *
 * Written BEFORE the engine (product-roadmap.md "Build phases", Phase 0 exit
 * criterion: "conformance test suite written from the prose FSM before any
 * engine code"). The engine is implemented to make this suite pass.
 *
 * Sources cited per test:
 *   [R§1.1]  product-roadmap.md §1.1 — lifecycle-critical fields include
 *            "`state_version` (optimistic concurrency)".
 *   [R§1.2]  product-roadmap.md §1.2 — "Never-downgrade is an engine
 *            invariant. Privileged correction requires the `state.downgrade`
 *            permission and writes a compensating event."
 *   [R§1.5]  product-roadmap.md §1.5 — append-only event stream, written in
 *            the same transaction as the projection update;
 *            "`UNIQUE(stream_id, stream_seq)` doubles as the optimistic
 *            lock"; "Every event carries actor, payload, idempotency key,
 *            and causation".
 *   [IDX]    packages/core/src/index.ts — ConflictError doc: "stale fencing
 *            token or state_version conflict (HTTP 409 semantics)";
 *            InvalidTransitionError: "Transition not declared in the table".
 *
 * Interpretation choices (flagged for the engine author):
 *   - streamSeq is 1-based and gap-free per stream (memlog invariant
 *     "chronological append-only" promoted to service level, R§1.5); the
 *     first event on a work_item stream has streamSeq 1.
 *   - "exactly one event per mutation" is pinned for plain successful
 *     mutations (advanceState without effects, blockTask, unblockTask).
 *     Refused commands are NOT pinned to zero events here (stale-token
 *     refusals must in fact append an audit event, per §1.3 — covered in
 *     claims.test.ts); an idempotent REPLAY is pinned to zero new events.
 *   - the lost race may surface as InvalidTransitionError (the stale `from`
 *     no longer matches any declared transition) or ConflictError
 *     (state_version CAS, [IDX]); either proves exactly one command won.
 *   - specCheckpoint=false ⇒ draft→ready_for_dev advances directly
 *     (contrapositive of R§1.1 "spec_checkpoint ⇒ the spec-approval gate is
 *     mandatory") — keeps gate semantics out of this cluster's fixtures.
 */
import {
  createEngine,
  ConflictError,
  InvalidTransitionError,
  type AdvanceInput,
  type Claim,
  type Permission,
  type SpineEngine,
  type WorkItemState,
} from '../src/index.js';

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
    specCheckpoint: false,
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
): Claim {
  const claim = engine.claimTask({ workItemId, actorId });
  for (const state of CANONICAL_PATH) {
    engine.advanceState({ workItemId, to: state, actorId, fencingToken: claim.fencingToken });
    if (state === target) break;
  }
  return claim;
}

type ErrorClass = new (...args: never[]) => Error;

/**
 * Asserts fn throws one of the given SPECIFIC error classes. Never a bare
 * toThrow(): the stubs throw NotImplementedError and a bare matcher would
 * green-light an unimplemented engine.
 */
function expectRejectsWith(fn: () => unknown, allowed: readonly ErrorClass[]): void {
  let caught: unknown;
  let threw = false;
  try {
    fn();
  } catch (error) {
    caught = error;
    threw = true;
  }
  expect(threw).toBe(true);
  expect(allowed.some((cls) => caught instanceof cls)).toBe(true);
}

describe('§1.5 optimistic concurrency & event stream', () => {
  describe('optimistic concurrency — [R§1.1] "state_version (optimistic concurrency)"', () => {
    it('a successful advanceState increases stateVersion monotonically', () => {
      const fx = setup();
      const claim = fx.engine.claimTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      const v0 = fx.engine.getWorkItem(fx.workItemId).stateVersion;
      const afterDraft = fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(afterDraft.state).toBe('draft');
      expect(afterDraft.stateVersion).toBeGreaterThan(v0);
      const afterReady = fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'ready_for_dev',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(afterReady.stateVersion).toBeGreaterThan(afterDraft.stateVersion);
      // the projection read agrees with the command's returned version
      expect(fx.engine.getWorkItem(fx.workItemId).stateVersion).toBe(afterReady.stateVersion);
    });

    // Two commands both observed state=in_review. Racer 1 (privileged
    // loopback in_review→in_progress, [R§1.2] state.downgrade + compensating
    // event) commits first and wins. Racer 2 (in_review→done) executes
    // against a state that no longer exists — it MUST lose:
    // InvalidTransitionError (stale `from` matches no declared transition,
    // [IDX]) or ConflictError (state_version CAS, [R§1.1]/[IDX]).
    it('two commands racing from the same observed state: exactly one wins, the loser mutates nothing', () => {
      const fx = setup(['state.downgrade']);
      const claim = driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_review');
      const observed = fx.engine.getWorkItem(fx.workItemId); // both racers read here
      expect(observed.state).toBe('in_review');

      const winner = fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'in_progress',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(winner.state).toBe('in_progress');
      expect(winner.stateVersion).toBeGreaterThan(observed.stateVersion);

      expectRejectsWith(
        () =>
          fx.engine.advanceState({
            workItemId: fx.workItemId,
            to: 'done',
            actorId: fx.actorId,
            fencingToken: claim.fencingToken,
          }),
        [InvalidTransitionError, ConflictError],
      );

      // exactly one command took effect — never both
      const final = fx.engine.getWorkItem(fx.workItemId);
      expect(final.state).toBe('in_progress');
      expect(final.stateVersion).toBe(winner.stateVersion);
    });
  });

  describe('event stream — [R§1.5] append-only, same-transaction, UNIQUE(stream_id, stream_seq)', () => {
    // [R§1.5] "Append-only `event` stream written in the same transaction as
    // the projection update" — one mutation, one event, atomically.
    it('every successful mutation appends exactly one event to the work_item stream', () => {
      const fx = setup();
      const claim = fx.engine.claimTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      // snapshot AFTER claim: whether claim/creation emit onto this stream is
      // pinned by contiguity below, not by this count
      const base = fx.engine.events(fx.workItemId).length;

      fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(fx.engine.events(fx.workItemId).length).toBe(base + 1);

      fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'ready_for_dev',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(fx.engine.events(fx.workItemId).length).toBe(base + 2);

      fx.engine.blockTask({
        workItemId: fx.workItemId,
        reason: 'awaiting_human_input',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
      });
      expect(fx.engine.events(fx.workItemId).length).toBe(base + 3);

      fx.engine.unblockTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      expect(fx.engine.events(fx.workItemId).length).toBe(base + 4);
    });

    // [R§1.5] "UNIQUE(stream_id, stream_seq)" + chronological append-only
    // (memlog invariant #1 promoted to service level): seq 1,2,3,... no gaps.
    it('streamSeq on a work_item stream is contiguous 1..N with no gaps', () => {
      const fx = setup();
      driveTo(fx.engine, fx.actorId, fx.workItemId, 'in_review');
      const events = fx.engine.events(fx.workItemId);
      expect(events.length).toBeGreaterThanOrEqual(4); // at least the four transitions
      expect(events.map((event) => event.streamSeq)).toEqual(events.map((_, i) => i + 1));
      for (const event of events) {
        expect(event.streamId).toBe(fx.workItemId);
        expect(event.streamType).toBe('work_item');
      }
    });

    // Sequencing is PER STREAM ([R§1.5] UNIQUE is on (stream_id, stream_seq),
    // not global) — interleaving two items must not punch holes in either.
    it('interleaved mutations on two work items keep independent gap-free sequences', () => {
      const fx = setup();
      const second = fx.engine.createWorkItem({
        featureId: fx.featureId,
        externalKey: '1-2',
        title: 'Second conformance fixture story',
        specCheckpoint: false,
        actorId: fx.actorId,
      });
      const claimA = fx.engine.claimTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      const claimB = fx.engine.claimTask({ workItemId: second.id, actorId: fx.actorId });

      fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claimA.fencingToken,
      });
      fx.engine.advanceState({
        workItemId: second.id,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claimB.fencingToken,
      });
      fx.engine.advanceState({
        workItemId: fx.workItemId,
        to: 'ready_for_dev',
        actorId: fx.actorId,
        fencingToken: claimA.fencingToken,
      });

      for (const streamId of [fx.workItemId, second.id]) {
        const events = fx.engine.events(streamId);
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events.map((event) => event.streamSeq)).toEqual(events.map((_, i) => i + 1));
        expect(events.every((event) => event.streamId === streamId)).toBe(true);
      }
    });
  });

  describe('idempotency — [R§1.5] "Every event carries actor, payload, idempotency key, and causation"', () => {
    // A retried command with the SAME idempotency key is the same command:
    // same outcome, zero new events, no double state_version bump.
    it('replaying advanceState with the same idempotency key returns the same result and appends nothing', () => {
      const fx = setup();
      const claim = fx.engine.claimTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      const input: AdvanceInput = {
        workItemId: fx.workItemId,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
        idempotencyKey: 'advance-to-draft-1',
      };
      const first = fx.engine.advanceState(input);
      expect(first.state).toBe('draft');
      const streamLength = fx.engine.events(fx.workItemId).length;
      const globalLength = fx.engine.events().length;

      const second = fx.engine.advanceState(input); // exact replay — must NOT throw
      expect(second.state).toBe('draft');
      expect(second.stateVersion).toBe(first.stateVersion);
      expect(second.reviewLoopIteration).toBe(first.reviewLoopIteration);
      expect(fx.engine.events(fx.workItemId).length).toBe(streamLength);
      expect(fx.engine.events().length).toBe(globalLength);
    });

    // Deduplication is BY KEY, not by command content: the same transition
    // under a NEW key is a new command against an already-moved state and
    // must lose like any stale command (draft→draft is not in the table).
    it('the same transition with a different idempotency key is not deduplicated — it loses', () => {
      const fx = setup();
      const claim = fx.engine.claimTask({ workItemId: fx.workItemId, actorId: fx.actorId });
      const input: AdvanceInput = {
        workItemId: fx.workItemId,
        to: 'draft',
        actorId: fx.actorId,
        fencingToken: claim.fencingToken,
        idempotencyKey: 'advance-to-draft-1',
      };
      const first = fx.engine.advanceState(input);
      expect(first.state).toBe('draft');

      expectRejectsWith(
        () => fx.engine.advanceState({ ...input, idempotencyKey: 'advance-to-draft-2' }),
        [InvalidTransitionError, ConflictError],
      );
      // the losing retry mutated nothing
      const final = fx.engine.getWorkItem(fx.workItemId);
      expect(final.state).toBe('draft');
      expect(final.stateVersion).toBe(first.stateVersion);
    });
  });
});
