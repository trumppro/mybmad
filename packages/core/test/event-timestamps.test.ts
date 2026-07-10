/**
 * Conformance suite — event timestamps (Phase 7 "Cockpit", Wave 1).
 *
 * The audit log answered "who did what, in what order" (globalSeq/streamSeq)
 * but never "WHEN" — operating N parallel projects needs a readable timeline.
 *
 * `occurredAt` is wall-clock ms stamped at append time. It is OBSERVATIONAL
 * audit metadata only: no guard, transition, lease, or entitlement decision
 * may ever read it (the engine's logical clock stays the ONLY time source
 * for lease logic — roadmap §1.5). Asserted with wall-time bounds rather
 * than clock injection so the identical suite runs against the memory
 * engine and the worker-thread PGlite facade.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, type Actor, type SpineEngine } from '../src/index.js';

function makeRig(): { engine: SpineEngine; planner: Actor } {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  return { engine, planner };
}

describe('event timestamps — occurredAt on every appended event', () => {
  it('stamps wall-clock ms on every event, within the bounds of the action', () => {
    const before = Date.now();
    const rig = makeRig();
    const feature = rig.engine.createFeature({ actorId: rig.planner.id });
    rig.engine.createWorkItem({
      featureId: feature.id,
      actorId: rig.planner.id,
      externalKey: 'ts-1',
      title: 'timestamped story',
    });
    const after = Date.now();

    const events = rig.engine.events();
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(typeof event.occurredAt).toBe('number');
      expect(event.occurredAt).toBeGreaterThanOrEqual(before);
      expect(event.occurredAt).toBeLessThanOrEqual(after);
    }
  });

  it('occurredAt is monotonically non-decreasing in globalSeq order', () => {
    const rig = makeRig();
    const feature = rig.engine.createFeature({ actorId: rig.planner.id });
    for (const key of ['ts-a', 'ts-b', 'ts-c']) {
      rig.engine.createWorkItem({
        featureId: feature.id,
        actorId: rig.planner.id,
        externalKey: key,
        title: `story ${key}`,
      });
    }
    const events = [...rig.engine.events()].sort((a, b) => a.globalSeq - b.globalSeq);
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.occurredAt).toBeGreaterThanOrEqual(events[i - 1]!.occurredAt);
    }
  });
});
