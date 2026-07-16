/**
 * Conformance: ops recovery — force_release_claim (roadmap §8, PR 8.2).
 *
 * Sources:
 *  - product-roadmap.md §8 — "gated `force_release_claim` … a zero-grant actor is
 *    denied in all three harnesses (memory, PGlite, HTTP)."
 *  - product-roadmap.md §3 — permission `ops.force_release_claim`, tech_lead bundle.
 *  - §1.3 — fencing: once a claim is released, a successor's fencing token is the
 *    only live one; the evicted holder's stale token is rejected on any mutation.
 *
 * Force-release is a privileged ops action: it clears the live claim on a work
 * item so a stuck dispatch can be re-run. Unlike releaseClaim (which authors the
 * event as the holder), the force-release event is authored by the ACTING actor,
 * and the actor must hold `ops.force_release_claim` — the bootstrap admin's
 * governance role does NOT bypass the grant check.
 */
import { createEngine, ConflictError, GuardFailedError, PermissionDeniedError } from '../src/index.js';
import type { SpineEngine } from '../src/index.js';

function setup(): {
  engine: SpineEngine;
  po: string; // task.plan + task.claim, but NOT ops.force_release_claim
  ops: string; // holds ops.force_release_claim (via tech_lead role)
  holder: string; // an agent that claims the item
  workItemId: string;
} {
  const engine = createEngine({ wallClock: false });
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });

  const po = engine.createActor({ type: 'user', displayName: 'PO' }).id;
  engine.grant({ actorId: po, permission: 'task.plan' });
  engine.grant({ actorId: po, permission: 'feature.init' });

  const holder = engine.createActor({ type: 'agent', displayName: 'Holder' }).id;
  engine.grant({ actorId: holder, permission: 'task.claim' });
  engine.grant({ actorId: holder, permission: 'task.advance' });

  const ops = engine.createActor({ type: 'user', displayName: 'Ops' }).id;
  engine.assignRole({ actorId: ops, roleCode: 'tech_lead', byActorId: admin.id });

  const feature = engine.createFeature({ actorId: po });
  const item = engine.createWorkItem({ featureId: feature.id, externalKey: 'w1', title: 'Work', actorId: po });
  engine.claimTask({ workItemId: item.id, actorId: holder });
  return { engine, po, ops, holder, workItemId: item.id };
}

describe('forceReleaseClaim — gated ops recovery (roadmap §8)', () => {
  it('denies an actor without ops.force_release_claim (PermissionDeniedError)', () => {
    const { engine, po, workItemId } = setup();
    expect(() => engine.forceReleaseClaim({ workItemId, actorId: po })).toThrow(PermissionDeniedError);
    // the claim is untouched — still live
    expect(engine.getClaims(workItemId).filter((c) => !c.released)).toHaveLength(1);
  });

  it('allows a tech_lead (holds ops.force_release_claim): releases the live claim', () => {
    const { engine, ops, workItemId } = setup();
    const result = engine.forceReleaseClaim({ workItemId, actorId: ops });
    expect(result.released).toHaveLength(1);
    expect(engine.getClaims(workItemId).every((c) => c.released)).toBe(true);
  });

  it('appends a claim.force_released event authored by the acting actor, naming the evicted holder', () => {
    const { engine, ops, holder, workItemId } = setup();
    const { released } = engine.forceReleaseClaim({ workItemId, actorId: ops });
    const events = engine.events(workItemId).filter((e) => e.type === 'claim.force_released');
    expect(events).toHaveLength(1);
    expect(events[0]!.actorId).toBe(ops); // the acting ops actor, NOT the holder
    expect(events[0]!.payload).toMatchObject({
      claimId: released[0],
      workItemId,
      holderActorId: holder,
    });
  });

  it('throws GuardFailedError when there is no live claim to release', () => {
    const { engine, ops, workItemId } = setup();
    engine.forceReleaseClaim({ workItemId, actorId: ops });
    expect(() => engine.forceReleaseClaim({ workItemId, actorId: ops })).toThrow(GuardFailedError);
  });

  it('the evicted holder cannot mutate with its old fencing token (ConflictError + fencing.rejected)', () => {
    const { engine, ops, holder, workItemId } = setup();
    const staleToken = engine.getClaims(workItemId).find((c) => !c.released)!.fencingToken;
    const state = engine.getWorkItem(workItemId).state;

    engine.forceReleaseClaim({ workItemId, actorId: ops });

    // The holder presents its now-stale token on a claim-guarded mutation. A
    // same-state advance takes the preservation no-op path, which still validates
    // any presented token — with no live claim it is rejected (claims.test.ts pattern).
    const before = engine.events(workItemId).length;
    expect(() =>
      engine.advanceState({ workItemId, to: state, actorId: holder, fencingToken: staleToken }),
    ).toThrow(ConflictError);
    const rejected = engine.events(workItemId).slice(before).filter((e) => e.type === 'fencing.rejected');
    expect(rejected).toHaveLength(1);
  });
});
