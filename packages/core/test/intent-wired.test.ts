/**
 * Conformance suite — the intent hash wired end to end (roadmap §1.1, §9.3).
 *
 * The pure functions (extractIntentRegion / canonicalizeForHash /
 * computeIntentHash) are pinned in intent-hash.test.ts. This file pins the
 * ENGINE wiring: the measuring side submits the canonical hash as `intent_hash`
 * evidence; the engine freezes it into WorkItem.intentHash at spec approval and
 * re-verifies it at the claim edge (ready_for_dev → in_progress), refusing when
 * the presented hash drifted. A legitimate renegotiation goes through
 * rebaseline_intent, gated on intent.edit.
 */
import {
  computeIntentHash,
  createEngine,
  extractIntentRegion,
  type Actor,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

const SPEC_V1 = '# Story\n\n<intent-contract>\nBuild the login form.\n</intent-contract>\n';
const SPEC_V2 = '# Story\n\n<intent-contract>\nBuild the login form AND signup.\n</intent-contract>\n';
const H1 = computeIntentHash(extractIntentRegion(SPEC_V1)!);
const H2 = computeIntentHash(extractIntentRegion(SPEC_V2)!);

interface Rig {
  engine: SpineEngine;
  po: Actor; // task.plan, gate.spec.approve
  dev: Actor; // task.claim, task.advance
  editor: Actor; // intent.edit
  outsider: Actor;
  item: WorkItem;
}

function makeRig(): Rig {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  const editor = engine.createActor({ type: 'user', displayName: 'Editor' });
  const outsider = engine.createActor({ type: 'user', displayName: 'Outsider' });
  for (const p of ['task.plan', 'gate.spec.approve', 'task.claim', 'task.advance'] as const) {
    engine.grant({ actorId: po.id, permission: p });
  }
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: editor.id, permission: 'intent.edit' });
  const feature = engine.createFeature({ actorId: po.id });
  const item = engine.createWorkItem({
    featureId: feature.id,
    externalKey: 'i-1',
    title: 'Login',
    actorId: po.id,
  });
  return { engine, po, dev, editor, outsider, item };
}

/** Submit intent_hash evidence, then approve spec_approval — the CLI approve --spec-file flow. */
function approveWithHash(rig: Rig, hash: string): WorkItem {
  rig.engine.advanceState({ workItemId: rig.item.id, to: 'draft', actorId: rig.po.id });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.po.id,
    evidence: { kind: 'intent_hash', payload: { algo: 'v1', hash } },
  });
  return rig.engine.approveGate({
    workItemId: rig.item.id,
    gate: 'spec_approval',
    actorId: rig.po.id,
    pinnedVerification: ['pnpm test'],
  });
}

/** Claim and present a (possibly drifted) hash, then advance to in_progress. */
function dispatchWith(rig: Rig, presentedHash: string): WorkItem {
  const claim = rig.engine.claimTask({ workItemId: rig.item.id, actorId: rig.dev.id });
  rig.engine.submitEvidence({
    workItemId: rig.item.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'intent_hash', payload: { algo: 'v1', hash: presentedHash } },
  });
  return rig.engine.advanceState({
    workItemId: rig.item.id,
    to: 'in_progress',
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
  });
}

describe('intent hash wired (roadmap §9.3)', () => {
  it('spec_approval with a submitted intent_hash pins WorkItem.intentHash', () => {
    const rig = makeRig();
    const approved = approveWithHash(rig, H1);
    expect(approved.state).toBe('ready_for_dev');
    expect(approved.intentHash).toBe(H1);
    expect(rig.engine.getWorkItem(rig.item.id).intentHash).toBe(H1);
  });

  it('the claim edge passes when the presented hash matches the pinned one', () => {
    const rig = makeRig();
    approveWithHash(rig, H1);
    const wi = dispatchWith(rig, H1);
    expect(wi.state).toBe('in_progress');
  });

  it('the claim edge fails intent_changed when the presented hash drifted', () => {
    const rig = makeRig();
    approveWithHash(rig, H1);
    expect(() => dispatchWith(rig, H2)).toThrow(/intent_changed/);
    // The item did not advance.
    expect(rig.engine.getWorkItem(rig.item.id).state).toBe('ready_for_dev');
  });

  it('back-compat: an item approved WITHOUT an intent_hash advances regardless of presented hashes', () => {
    const rig = makeRig();
    rig.engine.advanceState({ workItemId: rig.item.id, to: 'draft', actorId: rig.po.id });
    rig.engine.approveGate({
      workItemId: rig.item.id,
      gate: 'spec_approval',
      actorId: rig.po.id,
      pinnedVerification: ['pnpm test'],
    });
    expect(rig.engine.getWorkItem(rig.item.id).intentHash).toBeNull();
    // Even a wildly different presented hash cannot fail a never-pinned item.
    const wi = dispatchWith(rig, H2);
    expect(wi.state).toBe('in_progress');
  });

  it('rebaseline requires intent.edit, re-pins the hash, and appends intent.rebaselined', () => {
    const rig = makeRig();
    approveWithHash(rig, H1);
    // Without the grant → denied.
    expect(() =>
      rig.engine.rebaselineIntent({ workItemId: rig.item.id, hash: H2, actorId: rig.outsider.id }),
    ).toThrow(/permission|denied/i);
    // With intent.edit → the new hash is pinned and an event is appended.
    const rebased = rig.engine.rebaselineIntent({ workItemId: rig.item.id, hash: H2, actorId: rig.editor.id });
    expect(rebased.intentHash).toBe(H2);
    const ev = rig.engine.events(rig.item.id).find((e) => e.type === 'intent.rebaselined');
    expect(ev?.payload).toMatchObject({ from: H1, to: H2 });
    // Dispatch now proceeds against the renegotiated baseline.
    const wi = dispatchWith(rig, H2);
    expect(wi.state).toBe('in_progress');
  });
});
