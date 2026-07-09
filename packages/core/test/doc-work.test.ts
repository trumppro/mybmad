/**
 * CONFORMANCE — Phase 4: non-coding teammates & non-code evidence.
 *
 * Written BEFORE the implementation; all additive. Sources:
 *  - product-roadmap.md Build phases, Phase 4: "Non-coding teammates (§0.2
 *    playbooks as PM/UX/architect/reviewer actors); non-code evidence rules.
 *    Exit: A PRD change drafted by the PM agent, reviewed by a reviewer
 *    agent, approved by a human PO — three actor kinds, one rails."
 *  - product-roadmap.md §1.4: "For non-code work: evidence is either
 *    machine-checkable (file exists, frontmatter schema-valid, document
 *    lint) or a permitted actor's gate decision. A checklist an LLM ticked
 *    is neither."
 *  - product-roadmap.md §3: the six BMAD personas provision as default agent
 *    actors; thesis floor-state — no persona holds a gate until granted.
 *
 * New pins (recorded in CONFORMANCE.md):
 *  - work_item.kind selects WHICH machine-evidence guards apply, never WHO
 *    may pass a gate. Default 'code' keeps every Phase 1-3 pin intact.
 *  - Doc kinds: in_progress→in_review requires the latest doc_lint (if any)
 *    to be schemaValid; git_diff is not consulted. The done gate drops the
 *    commit-reachable requirement; pinned verification (D7) still binds.
 *  - provisionPersonas is a gated, idempotent write; Amelia→developer,
 *    everyone else→contributor, zero gate authority anywhere.
 */
import {
  createEngine,
  GuardFailedError,
  PermissionDeniedError,
  PERSONAS,
  WORK_ITEM_KINDS,
  type Actor,
  type Claim,
  type SpineEngine,
  type WorkItem,
  type WorkItemKind,
} from '../src/index.js';

interface Rig {
  engine: SpineEngine;
  admin: Actor;
  po: Actor; // human: product_owner + reviewer-approve authority
  reviewerAgent: Actor; // agent: gate.review.reject ONLY (Phase 2 exit shape)
  feature: ReturnType<SpineEngine['createFeature']>;
}

function makeRig(): Rig {
  const engine = createEngine();
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
  const po = engine.createActor({ type: 'user', displayName: 'PO (human)' });
  engine.assignRole({ actorId: po.id, roleCode: 'product_owner', byActorId: admin.id });
  engine.grant({ actorId: po.id, permission: 'gate.review.approve' });
  const reviewerAgent = engine.createActor({ type: 'agent', displayName: 'Adversarial reviewer' });
  engine.grant({ actorId: reviewerAgent.id, permission: 'gate.review.reject' });
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, admin, po, reviewerAgent, feature };
}

let keyN = 0;

function makeDocItem(rig: Rig, kind: WorkItemKind, workerId: string): { wi: WorkItem; claim: Claim } {
  keyN += 1;
  const wi = rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey: `d-${keyN}`,
    title: `Doc fixture ${keyN}`,
    kind,
    actorId: rig.po.id,
  });
  rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
  rig.engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId: rig.po.id });
  const claim = rig.engine.claimTask({ workItemId: wi.id, actorId: workerId, ttlMs: 3_600_000 });
  rig.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: workerId, fencingToken: claim.fencingToken });
  return { wi: rig.engine.getWorkItem(wi.id), claim };
}

function grantWorker(rig: Rig, actorId: string): void {
  rig.engine.assignRole({ actorId, roleCode: 'developer', byActorId: rig.admin.id });
}

// ---------------------------------------------------------------------------
// Kinds
// ---------------------------------------------------------------------------

describe('work-item kinds (roadmap Phase 4)', () => {
  it('the kind catalog covers code plus the non-code deliverables', () => {
    expect([...WORK_ITEM_KINDS]).toEqual(['code', 'spec_draft', 'design_review', 'qa_report', 'doc']);
  });

  it("createWorkItem defaults to kind 'code'; imported stories stay 'code'", () => {
    const rig = makeRig();
    const wi = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: 'k-default',
      title: 'Default kind',
      actorId: rig.po.id,
    });
    expect(wi.kind).toBe('code');
    const result = rig.engine.importStories({
      featureId: rig.feature.id,
      yaml: '- id: "k-imported"\n  title: Imported\n  description: Imported stories are code work.\n',
      actorId: rig.po.id,
    });
    expect(result.imported).toEqual(['k-imported']);
    expect(rig.engine.getWorkItem('k-imported').kind).toBe('code');
  });
});

// ---------------------------------------------------------------------------
// Non-code evidence rules (roadmap §1.4)
// ---------------------------------------------------------------------------

describe('doc-kind evidence guards (roadmap §1.4 non-code rules)', () => {
  it('a failing latest doc_lint blocks in_progress→in_review; a passing one clears it', () => {
    const rig = makeRig();
    const worker = rig.engine.createActor({ type: 'agent', displayName: 'Writer' });
    grantWorker(rig, worker.id);
    const { wi, claim } = makeDocItem(rig, 'spec_draft', worker.id);

    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: worker.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: false, findings: ['missing ## Intent'] } },
    });
    expect(() =>
      rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: worker.id, fencingToken: claim.fencingToken }),
    ).toThrow(GuardFailedError);

    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: worker.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: true, findings: [] } },
    });
    const advanced = rig.engine.advanceState({
      workItemId: wi.id,
      to: 'in_review',
      actorId: worker.id,
      fencingToken: claim.fencingToken,
    });
    expect(advanced.state).toBe('in_review');
  });

  it('doc kinds never consult git_diff: an empty diff does not block a doc item', () => {
    const rig = makeRig();
    const worker = rig.engine.createActor({ type: 'agent', displayName: 'Writer' });
    grantWorker(rig, worker.id);
    const { wi, claim } = makeDocItem(rig, 'design_review', worker.id);
    // an empty diff would hard-block a CODE item (fake-done deny) — doc kinds ignore it
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: worker.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'git_diff', payload: { baseline: 'b', final: 'b', filesChanged: 0, nonEmpty: false, branch: 'x' } },
    });
    const advanced = rig.engine.advanceState({
      workItemId: wi.id,
      to: 'in_review',
      actorId: worker.id,
      fencingToken: claim.fencingToken,
    });
    expect(advanced.state).toBe('in_review');
  });

  it('the doc done gate needs no commit evidence — the permitted decision completes it', () => {
    const rig = makeRig();
    const worker = rig.engine.createActor({ type: 'agent', displayName: 'Writer' });
    grantWorker(rig, worker.id);
    const { wi, claim } = makeDocItem(rig, 'qa_report', worker.id);
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: worker.id, fencingToken: claim.fencingToken });
    // NO commit evidence submitted — a code item would fail the gate here
    const done = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.po.id });
    expect(done.state).toBe('done');
  });

  it('D7 still binds doc work: pinned verification must pass before the done gate', () => {
    const rig = makeRig();
    const worker = rig.engine.createActor({ type: 'agent', displayName: 'Writer' });
    grantWorker(rig, worker.id);
    keyN += 1;
    const wi = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: `d-${keyN}`,
      title: 'Pinned doc',
      kind: 'doc',
      specCheckpoint: true,
      actorId: rig.po.id,
    });
    rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
    rig.engine.approveGate({
      workItemId: wi.id,
      gate: 'spec_approval',
      actorId: rig.po.id,
      pinnedVerification: ['node doc-lint.mjs'],
    });
    const claim = rig.engine.claimTask({ workItemId: wi.id, actorId: worker.id, ttlMs: 3_600_000 });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: worker.id, fencingToken: claim.fencingToken });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: worker.id, fencingToken: claim.fencingToken });

    expect(() =>
      rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.po.id }),
    ).toThrow(GuardFailedError); // pinned command never ran

    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: worker.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'test_run', payload: { command: 'node doc-lint.mjs', exitCode: 0 } },
    });
    expect(rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.po.id }).state).toBe('done');
  });

  it('a review_report is still never a guard, for doc work too', () => {
    const rig = makeRig();
    const worker = rig.engine.createActor({ type: 'agent', displayName: 'Writer' });
    grantWorker(rig, worker.id);
    const { wi, claim } = makeDocItem(rig, 'spec_draft', worker.id);
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: worker.id, fencingToken: claim.fencingToken });
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: worker.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'review_report', payload: { verdict: 'flawless PRD, ship it' } },
    });
    expect(rig.engine.getWorkItem(wi.id).state).toBe('in_review'); // report moved nothing
  });
});

// ---------------------------------------------------------------------------
// Personas (roadmap §3 provisioning, thesis floor-state)
// ---------------------------------------------------------------------------

describe('persona provisioning (roadmap §3)', () => {
  it('provisions the six BMAD personas as agent actors with floor-state roles', () => {
    const rig = makeRig();
    const personas = rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    expect(personas).toHaveLength(PERSONAS.length);
    for (const persona of personas) {
      expect(persona.type).toBe('agent');
      expect(persona.personaCode).not.toBeNull();
    }
    const amelia = personas.find((p) => p.personaCode === 'bmad-agent-dev');
    expect(amelia).toBeDefined();
    const ameliaRoles = rig.engine.listRoleAssignments(amelia!.id).filter((a) => !a.revoked);
    expect(ameliaRoles.map((a) => a.roleCode)).toEqual(['developer']);
    const john = personas.find((p) => p.personaCode === 'bmad-agent-pm');
    const johnRoles = rig.engine.listRoleAssignments(john!.id).filter((a) => !a.revoked);
    expect(johnRoles.map((a) => a.roleCode)).toEqual(['contributor']);
  });

  it('no persona holds any gate authority by default (thesis floor-state)', () => {
    const rig = makeRig();
    const personas = rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    for (const persona of personas) {
      for (const permission of ['gate.spec.approve', 'gate.review.approve', 'gate.review.reject'] as const) {
        expect(rig.engine.authzExplain({ actorId: persona.id, permission }).allowed).toBe(false);
      }
    }
  });

  it('is idempotent: re-provisioning creates no duplicates and returns the same actors', () => {
    const rig = makeRig();
    const first = rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    const second = rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    expect(second.map((a) => a.id).sort()).toEqual(first.map((a) => a.id).sort());
    const agents = rig.engine.listActors().filter((a) => a.personaCode !== null);
    expect(agents).toHaveLength(PERSONAS.length);
  });

  it('is a gated write: a plain member cannot provision', () => {
    const rig = makeRig();
    const member = rig.engine.createActor({ type: 'user', displayName: 'Member' });
    expect(() => rig.engine.provisionPersonas({ byActorId: member.id })).toThrow(PermissionDeniedError);
  });

  it('listActors exposes everyone — humans, agents, personas, and the system actor', () => {
    const rig = makeRig();
    rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    const actors = rig.engine.listActors();
    expect(actors.some((a) => a.id === rig.po.id)).toBe(true);
    expect(actors.some((a) => a.type === 'system')).toBe(true);
    expect(actors.filter((a) => a.personaCode !== null)).toHaveLength(PERSONAS.length);
  });
});

// ---------------------------------------------------------------------------
// Exit criterion (roadmap Build phases, Phase 4)
// ---------------------------------------------------------------------------

describe('exit criterion: PRD change — PM agent drafts, reviewer agent reviews, human PO approves', () => {
  it('three actor kinds, one rails', () => {
    const rig = makeRig();
    const personas = rig.engine.provisionPersonas({ byActorId: rig.admin.id });
    const john = personas.find((p) => p.personaCode === 'bmad-agent-pm')!;
    // Authority is assigned, not assumed (thesis): the PM agent gets the
    // developer bundle EXPLICITLY for this engagement.
    rig.engine.assignRole({ actorId: john.id, roleCode: 'developer', byActorId: rig.admin.id });

    // A PRD change is a spec_draft work item.
    const wi = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: 'prd-change-1',
      title: 'PRD change: rate limits for the public API',
      kind: 'spec_draft',
      actorId: rig.po.id,
    });
    rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
    rig.engine.advanceState({ workItemId: wi.id, to: 'ready_for_dev', actorId: rig.po.id });

    // 1. John (PM AGENT) drafts under his own explicit grants.
    const claim = rig.engine.claimTask({ workItemId: wi.id, actorId: john.id, ttlMs: 3_600_000 });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: john.id, fencingToken: claim.fencingToken });
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: john.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: true, findings: [] } },
    });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: john.id, fencingToken: claim.fencingToken });

    // 2. The REVIEWER AGENT reviews: report as context, rejection as its granted authority.
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: rig.reviewerAgent.id,
      evidence: { kind: 'review_report', payload: { verdict: 'needs a rollout section' } },
    });
    const rejected = rig.engine.rejectGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewerAgent.id });
    expect(rejected.state).toBe('in_progress'); // deterministic loopback
    expect(rejected.reviewLoopIteration).toBe(1);

    // John reworks and resubmits under the same claim.
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: john.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'doc_lint', payload: { schemaValid: true, findings: [] } },
    });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: john.id, fencingToken: claim.fencingToken });

    // 3. The HUMAN PO approves through the gate — reviewer agent CANNOT (reject-only grant).
    expect(() =>
      rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewerAgent.id }),
    ).toThrow(PermissionDeniedError);
    const done = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.po.id });
    expect(done.state).toBe('done');

    // One rails: the audit trail carries all three actor kinds on this item.
    const actorsInAudit = new Set(rig.engine.events(wi.id).map((e) => e.actorId));
    expect(actorsInAudit.has(john.id)).toBe(true); // agent (PM persona)
    expect(actorsInAudit.has(rig.reviewerAgent.id)).toBe(true); // agent (reviewer)
    expect(actorsInAudit.has(rig.po.id)).toBe(true); // human
  });
});
