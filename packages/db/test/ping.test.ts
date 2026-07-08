import { createEngine } from '@oahs/core';

describe('synckit harness round-trip', () => {
  it('creates a PG-backed engine and inserts through PGlite synchronously', () => {
    const engine = createEngine();
    const actor = engine.createActor({ type: 'user', displayName: 'Ping' });
    expect(actor.id).toMatch(/^actor_/);
    expect(actor.displayName).toBe('Ping');
  });
});
