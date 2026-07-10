/**
 * Conformance suite — wall-clock leases (Phase 7 Wave 2, D-G).
 *
 * Unattended operation needs leases that EXPIRE: a crashed runner's claim
 * must free itself after TTL, not wait for a human force-release. Pins:
 *  - `createEngine({ wallClock: true })` binds the lease clock to real time;
 *  - the DEFAULT stays the logical clock (`advanceClock`) — determinism of
 *    every other conformance test is untouched;
 *  - heartbeat renews the full TTL from the heartbeat moment (Phase-1 pin,
 *    now meaningful in real time).
 */
import { describe, expect, it } from 'vitest';
import { ConflictError, createEngine, type Actor, type SpineEngine, type WorkItem } from '../src/index.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function makeRig(wallClock: boolean): { engine: SpineEngine; dev: Actor; item: WorkItem } {
  const engine = createEngine(wallClock ? { wallClock: true } : undefined);
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  const feature = engine.createFeature({ actorId: planner.id });
  const item = engine.createWorkItem({
    featureId: feature.id,
    actorId: planner.id,
    externalKey: 'wc-1',
    title: 'wall clock story',
  });
  return { engine, dev, item };
}

describe('wall-clock leases (opt-in)', () => {
  it('a lease expires in REAL time: the dead claim frees itself and the item is claimable again', async () => {
    const rig = makeRig(true);
    rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 100 });
    // While the lease lives, a second claim loses by constraint.
    expect(() =>
      rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id }),
    ).toThrow(ConflictError);

    await sleep(400);
    // Past TTL with no heartbeat: claimable again, no force-release needed.
    const second = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 100 });
    expect(second.fencingToken).toBeGreaterThan(1);
  });

  it('heartbeat renews the full TTL from the heartbeat moment — a live runner never loses its lease', async () => {
    const rig = makeRig(true);
    const claim = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 400 });

    await sleep(200);
    rig.engine.heartbeat({ claimId: claim.id });

    // 300ms after the heartbeat, past the ORIGINAL expiry — still held.
    await sleep(300);
    expect(() =>
      rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id }),
    ).toThrow(ConflictError);

    // Long past the renewed TTL with no further heartbeat — expired.
    await sleep(600);
    const reclaimed = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id });
    expect(reclaimed.id).not.toBe(claim.id);
  });

  it('DEFAULT logical clock: real time never expires a lease (determinism preserved)', async () => {
    const rig = makeRig(false);
    rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 50 });
    await sleep(200);
    expect(() =>
      rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id }),
    ).toThrow(ConflictError);
  });
});
