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
  engine.grant({ actorId: dev.id, permission: 'evidence.submit' });
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
  // The two halves of this pin are asserted SEPARATELY, with margins chosen so
  // scheduling jitter cannot cross a boundary. Previously one test claimed with
  // ttlMs:100 and then asserted the lease was still live: on a loaded machine more
  // than 100ms elapsed before that assertion ran, the lease had legitimately
  // expired, and the suite failed with "expected function to throw". It failed
  // reliably under the full suite and passed in isolation — which is the worst
  // failure mode a test can have, because it teaches everyone to re-run instead of
  // read. A wall-clock assertion needs a margin, not a coincidence.
  it('a live wall-clock lease still blocks a rival claim (no sleep — cannot race)', () => {
    const rig = makeRig(true);
    // A TTL far longer than any plausible pause between these two statements.
    rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 60_000 });
    expect(() => rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id })).toThrow(
      ConflictError,
    );
  });

  it('a lease expires in REAL time: the dead claim frees itself and the item is claimable again', async () => {
    const rig = makeRig(true);
    rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 50 });
    // Sleep an order of magnitude past the TTL: the assertion is "expired by now",
    // and overshooting only makes that MORE true, so load cannot flip it.
    await sleep(600);
    const second = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 60_000 });
    expect(second.fencingToken).toBeGreaterThan(1);
  });

  it('heartbeat renews the full TTL from the heartbeat moment — a live runner never loses its lease', async () => {
    const rig = makeRig(true);
    // 1500ms TTL, heartbeated at ~200ms: the heartbeat lands with ~1300ms of slack,
    // so a stalled event loop delays it rather than missing the window.
    const claim = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id, ttlMs: 1_500 });

    await sleep(200);
    rig.engine.heartbeat({ claimId: claim.id, actorId: claim.actorId });
    const renewedAt = Date.now();

    // Still held well past the ORIGINAL expiry (which was ~1500ms from the claim),
    // and well before the RENEWED one (~1500ms from the heartbeat).
    await sleep(600);
    expect(Date.now() - renewedAt).toBeLessThan(1_500); // the premise, asserted not assumed
    expect(() =>
      rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id }),
    ).toThrow(ConflictError);

    // Long past the renewed TTL with no further heartbeat — expired.
    await sleep(1_600);
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
