/**
 * CONFORMANCE — Phase 2 entitlements (roadmap §3, Build phases Phase 2).
 *
 * Written BEFORE the Phase 2 implementation, same discipline as the Phase 1
 * suite: these tests are the specification. Everything here is ADDITIVE —
 * no Phase 1 pin changes. Sources:
 *  - product-roadmap.md §3 — "Entitlement = plan × governance role × delivery
 *    role, resolved by a pure function over versioned config/data";
 *    "Plan is a ceiling"; "Gate definitions are data: min_approvals,
 *    required_actor_types — human-only is a default, not a hardcode";
 *    "restrict-only keys — security-sensitive settings can only narrow";
 *    "Every authz decision records its policy version tuple; authz.explain
 *    replays it for an auditor."
 *  - product-roadmap.md Build phases, Phase 2 exit criterion: "A
 *    reviewer-agent granted rejection-loopback but not done-approval: system
 *    allows the first, denies the second."
 *  - product-thesis.md §3: authority comes only from an explicit grant —
 *    never from tenure, fluency, or memory; the check is identical for human
 *    and agent actors.
 *
 * Arbitration notes (new pins, recorded in CONFORMANCE.md):
 *  - `gate.review.reject` is a NEW permission; rejectGate accepts EITHER
 *    gate.review.approve OR gate.review.reject (additive — every Phase 1 pin
 *    on rejectGate keeps holding).
 *  - Plan ceilings bind AGENT actors only, at grant time AND resolve time
 *    (a later plan downgrade disables an already-issued agent gate grant).
 *    User actors are never plan-filtered.
 *  - Restrict-only: effective agent-gate-approval = plan ceiling AND policy.
 *    A permissive policy can never widen a restrictive plan.
 *  - Gate quorum counts DISTINCT approvers per review round; a rejection
 *    loopback starts a new round (stale approvals never carry over).
 *  - createActor takes an optional governanceRole (bootstrap plumbing, like
 *    createActor itself); setGovernanceRole/assignRole/setPlan/setPolicy/
 *    setGatePolicy require governance-admin authority.
 */
import {
  createEngine,
  DELIVERY_ROLES,
  GuardFailedError,
  PermissionDeniedError,
  PLAN_CEILINGS,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

const PINNED = ['pnpm test'];

interface Rig {
  engine: SpineEngine;
  admin: Actor; // governanceRole 'admin' — the gated-write authority
  po: Actor; // task.plan + feature.init + gate.spec.approve
  dev: Actor; // task.claim + task.advance + task.block
  reviewer: Actor; // gate.review.approve (+ reject via the approve-implies rule)
  feature: Feature;
}

function makeRig(): Rig {
  const engine = createEngine();
  const admin = engine.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
  const po = engine.createActor({ type: 'user', displayName: 'PO' });
  const dev = engine.createActor({ type: 'user', displayName: 'Dev' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  for (const p of ['task.plan', 'task.claim', 'feature.init', 'gate.spec.approve'] as const) {
    engine.grant({ actorId: po.id, permission: p });
  }
  for (const p of ['task.claim', 'task.advance', 'task.block'] as const) {
    engine.grant({ actorId: dev.id, permission: p });
  }
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, admin, po, dev, reviewer, feature };
}

let keyCounter = 0;

/** Drive a fresh story to in_review with full passing evidence (Phase 1 golden path). */
function itemInReview(rig: Rig): { wi: WorkItem; claim: Claim } {
  keyCounter += 1;
  const wi = rig.engine.createWorkItem({
    featureId: rig.feature.id,
    externalKey: `e-${keyCounter}`,
    title: `Entitlements fixture ${keyCounter}`,
    specCheckpoint: true,
    actorId: rig.po.id,
  });
  rig.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: rig.po.id });
  rig.engine.approveGate({
    workItemId: wi.id,
    gate: 'spec_approval',
    actorId: rig.po.id,
    pinnedVerification: PINNED,
  });
  const claim = rig.engine.claimTask({ workItemId: wi.id, actorId: rig.dev.id, ttlMs: 3_600_000 });
  rig.engine.advanceState({ workItemId: wi.id, to: 'in_progress', actorId: rig.dev.id, fencingToken: claim.fencingToken });
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      payload: { baseline: 'b0', final: 'f9', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` },
    },
  });
  rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: rig.dev.id, fencingToken: claim.fencingToken });
  for (const command of PINNED) {
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'test_run', payload: { command, exitCode: 0 } },
    });
  }
  rig.engine.submitEvidence({
    workItemId: wi.id,
    actorId: rig.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'commit', payload: { sha: 'f9', branch: `claim/${claim.id}`, reachableOnRemote: true } },
  });
  return { wi: rig.engine.getWorkItem(wi.id), claim };
}

// ---------------------------------------------------------------------------
// Phase 2 exit criterion
// ---------------------------------------------------------------------------

describe('EXIT CRITERION — rejection-loopback grant without done-approval (roadmap Build phases, Phase 2)', () => {
  it('an agent with ONLY gate.review.reject can reject (loopback fires) but not approve', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'Reviewer agent' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.reject' });

    const { wi } = itemInReview(rig);

    // The system allows the first…
    const rejected = rig.engine.rejectGate({ workItemId: wi.id, gate: 'review_approval', actorId: agent.id });
    expect(rejected.state).toBe('in_progress'); // deterministic loopback fired
    expect(rejected.reviewLoopIteration).toBe(1);

    // …and denies the second. Same actor, same deterministic check, different grant.
    const second = itemInReview(rig);
    expect(() =>
      rig.engine.approveGate({ workItemId: second.wi.id, gate: 'review_approval', actorId: agent.id }),
    ).toThrow(PermissionDeniedError);
    expect(rig.engine.getWorkItem(second.wi.id).state).toBe('in_review');
  });

  // Additive rule: gate.review.approve still implies rejection authority —
  // every Phase 1 rejectGate pin keeps holding.
  it('gate.review.approve alone still rejects (Phase 1 compatibility)', () => {
    const rig = makeRig();
    const { wi } = itemInReview(rig);
    const rejected = rig.engine.rejectGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(rejected.state).toBe('in_progress');
  });
});

// ---------------------------------------------------------------------------
// Delivery roles (roadmap §3) — bundles, assigned and revoked as gated writes
// ---------------------------------------------------------------------------

describe('delivery roles (roadmap §3)', () => {
  it('the catalog carries the six roadmap roles with reviewer = approve + reject', () => {
    expect(Object.keys(DELIVERY_ROLES).sort()).toEqual(
      ['contributor', 'developer', 'product_owner', 'qa', 'reviewer', 'tech_lead'].sort(),
    );
    expect(DELIVERY_ROLES['reviewer']).toContain('gate.review.approve');
    expect(DELIVERY_ROLES['reviewer']).toContain('gate.review.reject');
    expect(DELIVERY_ROLES['contributor']).toEqual([]);
  });

  it('assignRole grants the bundle; revokeRole removes it (union with direct grants)', () => {
    const rig = makeRig();
    const user = rig.engine.createActor({ type: 'user', displayName: 'New reviewer' });
    const { wi } = itemInReview(rig);

    expect(() =>
      rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: user.id }),
    ).toThrow(PermissionDeniedError);

    rig.engine.assignRole({ actorId: user.id, roleCode: 'reviewer', byActorId: rig.admin.id });
    const done = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: user.id });
    expect(done.state).toBe('done');

    rig.engine.revokeRole({ actorId: user.id, roleCode: 'reviewer', byActorId: rig.admin.id });
    const second = itemInReview(rig);
    expect(() =>
      rig.engine.approveGate({ workItemId: second.wi.id, gate: 'review_approval', actorId: user.id }),
    ).toThrow(PermissionDeniedError);
  });

  it('unknown role codes are rejected', () => {
    const rig = makeRig();
    const user = rig.engine.createActor({ type: 'user', displayName: 'X' });
    expect(() =>
      rig.engine.assignRole({ actorId: user.id, roleCode: 'grand_poobah', byActorId: rig.admin.id }),
    ).toThrow(GuardFailedError);
  });

  it('role assignment and revocation are audited events', () => {
    const rig = makeRig();
    const user = rig.engine.createActor({ type: 'user', displayName: 'X' });
    const before = rig.engine.events().length;
    rig.engine.assignRole({ actorId: user.id, roleCode: 'developer', byActorId: rig.admin.id });
    rig.engine.revokeRole({ actorId: user.id, roleCode: 'developer', byActorId: rig.admin.id });
    const appended = rig.engine.events().slice(before);
    expect(appended.length).toBeGreaterThanOrEqual(2);
    expect(appended.some((e) => e.actorId === rig.admin.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Governance (gated writes)
// ---------------------------------------------------------------------------

describe('governance authority (roadmap §3 — grants are explicit and audited)', () => {
  it('a plain member cannot assign roles, set plan, policy, or gate policy', () => {
    const rig = makeRig();
    const member = rig.engine.createActor({ type: 'user', displayName: 'Member' });
    const target = rig.engine.createActor({ type: 'user', displayName: 'T' });
    expect(rig.engine.getGovernanceRole(member.id)).toBe('member');

    expect(() =>
      rig.engine.assignRole({ actorId: target.id, roleCode: 'developer', byActorId: member.id }),
    ).toThrow(PermissionDeniedError);
    expect(() => rig.engine.setPlan({ plan: 'free', byActorId: member.id })).toThrow(PermissionDeniedError);
    expect(() =>
      rig.engine.setWorkspacePolicy({ policy: { agentGateApprovals: false }, byActorId: member.id }),
    ).toThrow(PermissionDeniedError);
    expect(() =>
      rig.engine.setGatePolicy({ gate: 'review_approval', policy: { minApprovals: 2 }, byActorId: member.id }),
    ).toThrow(PermissionDeniedError);
  });

  it('an admin can promote another actor to admin; the promotee gains gated-write authority', () => {
    const rig = makeRig();
    const promotee = rig.engine.createActor({ type: 'user', displayName: 'P' });
    rig.engine.setGovernanceRole({ actorId: promotee.id, role: 'admin', byActorId: rig.admin.id });
    expect(rig.engine.getGovernanceRole(promotee.id)).toBe('admin');
    const target = rig.engine.createActor({ type: 'user', displayName: 'T' });
    rig.engine.assignRole({ actorId: target.id, roleCode: 'contributor', byActorId: promotee.id });
    expect(rig.engine.listRoleAssignments(target.id).some((a) => a.roleCode === 'contributor' && !a.revoked)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Plan ceilings (roadmap §3: "Plan is a ceiling")
// ---------------------------------------------------------------------------

describe('plan ceilings bind agents, never users (roadmap §3)', () => {
  it('the ceiling table matches the roadmap ladder', () => {
    expect(PLAN_CEILINGS.free.agentGateApprove).toBe(false);
    expect(PLAN_CEILINGS.free.agentGateReject).toBe(false);
    expect(PLAN_CEILINGS.team.agentGateApprove).toBe(false);
    expect(PLAN_CEILINGS.team.agentGateReject).toBe(true);
    expect(PLAN_CEILINGS.enterprise.agentGateApprove).toBe(true);
  });

  it('under plan free, granting an agent a gate permission is refused at grant time; users are unaffected', () => {
    const rig = makeRig();
    rig.engine.setPlan({ plan: 'free', byActorId: rig.admin.id });
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    const user = rig.engine.createActor({ type: 'user', displayName: 'U' });

    expect(() => rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' })).toThrow(GuardFailedError);
    expect(() => rig.engine.grant({ actorId: agent.id, permission: 'gate.review.reject' })).toThrow(GuardFailedError);
    expect(() =>
      rig.engine.assignRole({ actorId: agent.id, roleCode: 'reviewer', byActorId: rig.admin.id }),
    ).toThrow(GuardFailedError);

    rig.engine.grant({ actorId: user.id, permission: 'gate.review.approve' }); // no throw
    rig.engine.assignRole({ actorId: user.id, roleCode: 'reviewer', byActorId: rig.admin.id }); // no throw
  });

  it('under plan team, an agent may hold rejection but not approval', () => {
    const rig = makeRig();
    rig.engine.setPlan({ plan: 'team', byActorId: rig.admin.id });
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.reject' }); // allowed
    expect(() => rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' })).toThrow(GuardFailedError);
  });

  it('a plan downgrade disables an already-granted agent gate permission at resolve time', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' }); // enterprise default

    const first = itemInReview(rig);
    expect(rig.engine.approveGate({ workItemId: first.wi.id, gate: 'review_approval', actorId: agent.id }).state).toBe('done');

    rig.engine.setPlan({ plan: 'free', byActorId: rig.admin.id });
    const second = itemInReview(rig);
    expect(() =>
      rig.engine.approveGate({ workItemId: second.wi.id, gate: 'review_approval', actorId: agent.id }),
    ).toThrow(PermissionDeniedError);

    rig.engine.setPlan({ plan: 'enterprise', byActorId: rig.admin.id });
    expect(rig.engine.approveGate({ workItemId: second.wi.id, gate: 'review_approval', actorId: agent.id }).state).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// Restrict-only workspace policy (roadmap §3)
// ---------------------------------------------------------------------------

describe('restrict-only policy: narrows the plan, never widens it (roadmap §3)', () => {
  it('agentGateApprovals=false blocks a granted agent under an enterprise plan', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' });
    rig.engine.setWorkspacePolicy({ policy: { agentGateApprovals: false }, byActorId: rig.admin.id });

    const { wi } = itemInReview(rig);
    expect(() =>
      rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: agent.id }),
    ).toThrow(PermissionDeniedError);
    // Users are untouched by the agent policy key.
    expect(rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id }).state).toBe('done');
  });

  it('a permissive policy cannot re-enable what the plan forbids (AND semantics)', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' }); // while enterprise
    rig.engine.setPlan({ plan: 'free', byActorId: rig.admin.id });
    rig.engine.setWorkspacePolicy({ policy: { agentGateApprovals: true }, byActorId: rig.admin.id });

    const { wi } = itemInReview(rig);
    expect(() =>
      rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: agent.id }),
    ).toThrow(PermissionDeniedError);
  });
});

// ---------------------------------------------------------------------------
// Gate definitions as data (roadmap §3: min_approvals, required_actor_types)
// ---------------------------------------------------------------------------

describe('gate policy: quorum and actor-type requirements are data, not code (roadmap §3)', () => {
  it('minApprovals=2: one approver records progress without transitioning; a second distinct approver completes', () => {
    const rig = makeRig();
    const second = rig.engine.createActor({ type: 'user', displayName: 'Reviewer 2' });
    rig.engine.grant({ actorId: second.id, permission: 'gate.review.approve' });
    rig.engine.setGatePolicy({ gate: 'review_approval', policy: { minApprovals: 2 }, byActorId: rig.admin.id });

    const { wi } = itemInReview(rig);
    const afterFirst = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(afterFirst.state).toBe('in_review'); // quorum 1/2 — decision recorded, no transition

    // The SAME approver again is not a second vote.
    const afterRepeat = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(afterRepeat.state).toBe('in_review');

    const afterSecond = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: second.id });
    expect(afterSecond.state).toBe('done');
  });

  it('a rejection loopback starts a new round: stale approvals never carry over', () => {
    const rig = makeRig();
    const second = rig.engine.createActor({ type: 'user', displayName: 'Reviewer 2' });
    rig.engine.grant({ actorId: second.id, permission: 'gate.review.approve' });
    rig.engine.setGatePolicy({ gate: 'review_approval', policy: { minApprovals: 2 }, byActorId: rig.admin.id });

    const { wi, claim } = itemInReview(rig);
    rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id }); // 1/2
    rig.engine.rejectGate({ workItemId: wi.id, gate: 'review_approval', actorId: second.id }); // loopback — new round

    // rework and resubmit under the surviving claim
    rig.engine.submitEvidence({
      workItemId: wi.id,
      actorId: rig.dev.id,
      fencingToken: claim.fencingToken,
      evidence: {
        kind: 'git_diff',
        payload: { baseline: 'b0', final: 'fA', filesChanged: 1, nonEmpty: true, branch: `claim/${claim.id}` },
      },
    });
    rig.engine.advanceState({ workItemId: wi.id, to: 'in_review', actorId: rig.dev.id, fencingToken: claim.fencingToken });

    const afterNewFirst = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: second.id });
    expect(afterNewFirst.state).toBe('in_review'); // round restarted: 1/2, not 2/2
    const done = rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id });
    expect(done.state).toBe('done');
  });

  it("requiredActorTypes ['user']: agent approvals alone never complete the gate — human-only as DATA, not hardcode", () => {
    const rig = makeRig();
    const agentA = rig.engine.createActor({ type: 'agent', displayName: 'RA' });
    const agentB = rig.engine.createActor({ type: 'agent', displayName: 'RB' });
    rig.engine.grant({ actorId: agentA.id, permission: 'gate.review.approve' });
    rig.engine.grant({ actorId: agentB.id, permission: 'gate.review.approve' });
    rig.engine.setGatePolicy({
      gate: 'review_approval',
      policy: { minApprovals: 1, requiredActorTypes: ['user'] },
      byActorId: rig.admin.id,
    });

    const { wi } = itemInReview(rig);
    expect(rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: agentA.id }).state).toBe('in_review');
    expect(rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: agentB.id }).state).toBe('in_review');
    expect(rig.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: rig.reviewer.id }).state).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// authz.explain (roadmap §3 — replayable decision trace)
// ---------------------------------------------------------------------------

describe('authzExplain: the decision is a queryable trace (roadmap §3)', () => {
  it('explains an allow through a role, with version tuple', () => {
    const rig = makeRig();
    const user = rig.engine.createActor({ type: 'user', displayName: 'R' });
    rig.engine.assignRole({ actorId: user.id, roleCode: 'reviewer', byActorId: rig.admin.id });

    const explanation = rig.engine.authzExplain({ actorId: user.id, permission: 'gate.review.approve' });
    expect(explanation.allowed).toBe(true);
    expect(explanation.source).toBe('role:reviewer');
    expect(explanation.plan).toBe('enterprise');
    expect(explanation.planAllows).toBe(true);
    expect(explanation.policyAllows).toBe(true);
    expect(typeof explanation.versions.plan).toBe('number');
    expect(typeof explanation.versions.policy).toBe('number');
  });

  it('explains a direct grant as source direct, and no grant as denied with null source', () => {
    const rig = makeRig();
    expect(rig.engine.authzExplain({ actorId: rig.reviewer.id, permission: 'gate.review.approve' }).source).toBe('direct');
    const nobody = rig.engine.createActor({ type: 'user', displayName: 'N' });
    const denied = rig.engine.authzExplain({ actorId: nobody.id, permission: 'gate.review.approve' });
    expect(denied.allowed).toBe(false);
    expect(denied.source).toBeNull();
  });

  it('explains a plan-ceiling denial and bumps the version tuple on plan/policy changes', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'A' });
    rig.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' });

    const before = rig.engine.authzExplain({ actorId: agent.id, permission: 'gate.review.approve' });
    expect(before.allowed).toBe(true);

    rig.engine.setPlan({ plan: 'free', byActorId: rig.admin.id });
    rig.engine.setWorkspacePolicy({ policy: { agentGateApprovals: false }, byActorId: rig.admin.id });

    const after = rig.engine.authzExplain({ actorId: agent.id, permission: 'gate.review.approve' });
    expect(after.allowed).toBe(false);
    expect(after.planAllows).toBe(false);
    expect(after.policyAllows).toBe(false);
    expect(after.source).toBe('direct'); // the grant exists; the ceiling blocks it
    expect(after.versions.plan).toBeGreaterThan(before.versions.plan);
    expect(after.versions.policy).toBeGreaterThan(before.versions.policy);
  });

  it('plan and policy changes are audited events', () => {
    const rig = makeRig();
    const before = rig.engine.events().length;
    rig.engine.setPlan({ plan: 'team', byActorId: rig.admin.id });
    rig.engine.setWorkspacePolicy({ policy: { agentSelfDispatch: false }, byActorId: rig.admin.id });
    rig.engine.setGatePolicy({ gate: 'review_approval', policy: { minApprovals: 2 }, byActorId: rig.admin.id });
    const appended = rig.engine.events().slice(before);
    expect(appended.length).toBeGreaterThanOrEqual(3);
    expect(appended.every((e) => e.actorId === rig.admin.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Self-dispatch policy key (Phase 3 consumes it; the resolver enforces it now)
// ---------------------------------------------------------------------------

describe('agentSelfDispatch policy key (roadmap §3/§5.4 seam)', () => {
  it('false ⇒ an agent cannot claim tasks; users are unaffected', () => {
    const rig = makeRig();
    const agent = rig.engine.createActor({ type: 'agent', displayName: 'W' });
    rig.engine.grant({ actorId: agent.id, permission: 'task.claim' });
    rig.engine.setWorkspacePolicy({ policy: { agentSelfDispatch: false }, byActorId: rig.admin.id });

    const { wi } = itemInReview(rig); // any claimable item would do; use a fresh backlog one
    const fresh = rig.engine.createWorkItem({
      featureId: rig.feature.id,
      externalKey: `e-${(keyCounter += 1)}`,
      title: 'Self-dispatch fixture',
      actorId: rig.po.id,
    });
    expect(() => rig.engine.claimTask({ workItemId: fresh.id, actorId: agent.id })).toThrow(PermissionDeniedError);
    // a user with task.claim still claims
    const claim = rig.engine.claimTask({ workItemId: fresh.id, actorId: rig.po.id });
    expect(claim.released).toBe(false);
    void wi;
  });
});
