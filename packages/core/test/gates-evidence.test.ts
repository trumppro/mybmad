/**
 * CONFORMANCE — Gates & evidence.
 *
 * Written BEFORE the engine (product-roadmap.md §1.2: "every prose rule …
 * becomes a conformance test … The engine is written to make that suite pass —
 * not the other way around"). Red against the NotImplementedError stubs by design.
 *
 * Authority for this file:
 *  - product-roadmap.md §1.4 — "A gate passes when three deterministic things are
 *    simultaneously true: 1. Permission … 2. Guards … 3. Evidence — machine-collected
 *    facts exist and pass: real test exit codes from pinned commands (D7), a non-empty
 *    diff between recorded baseline and final revisions, final_revision_reachable_on_remote
 *    (pushing is part of the HALT contract under a claim …)".
 *  - product-roadmap.md §0.3 D7 — "Verification commands are pinned at the spec-approval
 *    gate into Rules-layer data. The runner executes only pinned, allowlisted commands.
 *    A command an LLM writes into a spec body during implementation is never a guard."
 *  - src/bmm-skills/4-implementation/bmad-dev-auto/step-03-implement.md — "Run the
 *    commands in {spec_file}'s `## Verification` section" — the section D7 freezes into
 *    the DB at spec approval.
 *
 * Interpretation fixed by this suite (noted, not in the prose): approveGate itself
 * performs the forward transition it gates (spec_approval: draft → ready_for_dev;
 * review_approval: in_review → done), mirroring §1.2 where reject_gate fires the
 * loopback transition itself.
 */
import {
  ConflictError,
  createEngine,
  GuardFailedError,
  PermissionDeniedError,
  type Actor,
  type Claim,
  type Feature,
  type SpineEngine,
  type WorkItem,
} from '../src/index.js';

/** Commands as they would appear in the spec's `## Verification` section (D7 pins them). */
const PINNED = ['pnpm -r test', 'pnpm -r lint'];

interface Ctx {
  engine: SpineEngine;
  po: Actor; // §3: "product_owner (spec approval, feature acceptance)"
  dev: Actor; // §3: "developer (claim, advance to review with evidence)"
  reviewer: Actor; // §3: "reviewer (review approval / rejection-loopback)"
  outsider: Actor; // §3: "contributor (drafts and messages, no state advancement)" — zero grants here
  feature: Feature;
}

function setup(): Ctx {
  const engine = createEngine();
  const po = engine.createActor({ type: 'user', displayName: 'Product Owner' });
  const dev = engine.createActor({ type: 'user', displayName: 'Developer' });
  const reviewer = engine.createActor({ type: 'user', displayName: 'Reviewer' });
  const outsider = engine.createActor({ type: 'user', displayName: 'Contributor' });
  // Non-gate grants are deliberately generous: which of task.plan/task.advance a
  // given non-gate transition needs is another cluster's conformance question.
  engine.grant({ actorId: po.id, permission: 'feature.init' });
  engine.grant({ actorId: po.id, permission: 'task.plan' });
  engine.grant({ actorId: po.id, permission: 'task.advance' });
  engine.grant({ actorId: po.id, permission: 'gate.spec.approve' });
  engine.grant({ actorId: dev.id, permission: 'task.claim' });
  engine.grant({ actorId: dev.id, permission: 'task.advance' });
  engine.grant({ actorId: dev.id, permission: 'task.block' });
  engine.grant({ actorId: reviewer.id, permission: 'gate.review.approve' });
  // Measuring is its own authority: the worker writes machine evidence, the PO
  // submits the intent hash at spec approval (§9.3), the reviewer measures the
  // merge fact at review approval (§9.6). The `outsider` deliberately gets none.
  engine.grant({ actorId: dev.id, permission: 'evidence.submit' });
  engine.grant({ actorId: po.id, permission: 'evidence.submit' });
  engine.grant({ actorId: reviewer.id, permission: 'evidence.submit' });
  const feature = engine.createFeature({ actorId: po.id });
  return { engine, po, dev, reviewer, outsider, feature };
}

/** Item is born in backlog (D9: "born in git"), PO drafts it: backlog → draft. */
function createDraftItem(ctx: Ctx, key = '1-1'): WorkItem {
  const wi = ctx.engine.createWorkItem({
    featureId: ctx.feature.id,
    externalKey: key,
    title: `Story ${key}`,
    actorId: ctx.po.id,
    specCheckpoint: true, // §1.1: "spec_checkpoint ⇒ the spec-approval gate is mandatory"
  });
  return ctx.engine.advanceState({ workItemId: wi.id, to: 'draft', actorId: ctx.po.id });
}

/** D7: pinning happens at the spec-approval gate — the only place it can. */
function approveSpec(ctx: Ctx, workItemId: string, pinned?: string[]): WorkItem {
  return ctx.engine.approveGate({
    workItemId,
    gate: 'spec_approval',
    actorId: ctx.po.id,
    ...(pinned !== undefined ? { pinnedVerification: pinned } : {}),
  });
}

function claimAndStart(ctx: Ctx, workItemId: string): Claim {
  const claim = ctx.engine.claimTask({ workItemId, actorId: ctx.dev.id, ttlMs: 3_600_000 });
  ctx.engine.advanceState({
    workItemId,
    to: 'in_progress',
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
  });
  return claim;
}

function submitDiff(ctx: Ctx, workItemId: string, claim: Claim, nonEmpty: boolean): void {
  ctx.engine.submitEvidence({
    workItemId,
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'git_diff',
      // §1.3: "diff evidence is only accepted on the branch of the live claim"
      // — branches are claim-named, so the fixture follows that convention.
      payload: {
        baseline: 'base0000',
        final: 'head9999',
        filesChanged: nonEmpty ? 3 : 0,
        nonEmpty,
        branch: `claim/${claim.id}`,
      },
    },
  });
}

function submitTestRun(ctx: Ctx, workItemId: string, claim: Claim, command: string, exitCode: number): void {
  ctx.engine.submitEvidence({
    workItemId,
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
    evidence: { kind: 'test_run', payload: { command, exitCode } },
  });
}

function submitCommit(ctx: Ctx, workItemId: string, claim: Claim, reachableOnRemote: boolean): void {
  ctx.engine.submitEvidence({
    workItemId,
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
    evidence: {
      kind: 'commit',
      payload: { sha: 'head9999', branch: `claim/${claim.id}`, reachableOnRemote },
    },
  });
}

/**
 * Standard fixture: item at in_review under a live claim, with the non-empty
 * diff evidence the in_progress → in_review transition demands (§1.4).
 * `pinned === undefined` models a spec WITHOUT a `## Verification` section.
 */
function setupItemInReview(ctx: Ctx, pinned?: string[], key = '1-1'): { wi: WorkItem; claim: Claim } {
  const draft = createDraftItem(ctx, key);
  approveSpec(ctx, draft.id, pinned);
  const claim = claimAndStart(ctx, draft.id);
  submitDiff(ctx, draft.id, claim, true);
  ctx.engine.advanceState({
    workItemId: draft.id,
    to: 'in_review',
    actorId: ctx.dev.id,
    fencingToken: claim.fencingToken,
  });
  return { wi: ctx.engine.getWorkItem(draft.id), claim };
}

/** Everything §1.4 lists as machine evidence, all healthy. */
function submitAllPassingEvidence(ctx: Ctx, workItemId: string, claim: Claim, pinned: string[]): void {
  for (const command of pinned) submitTestRun(ctx, workItemId, claim, command, 0);
  submitCommit(ctx, workItemId, claim, true);
}

// ---------------------------------------------------------------------------
// §1.4 condition 1 + D7 — the spec-approval gate
// ---------------------------------------------------------------------------
describe('spec_approval gate — permission and verification pinning (roadmap §1.4, D7)', () => {
  // §1.4: "Permission — the acting actor holds the grant for this gate in this scope"
  it('denies approveGate(spec_approval) to an actor without gate.spec.approve', () => {
    const ctx = setup();
    const draft = createDraftItem(ctx);

    expect(() =>
      ctx.engine.approveGate({
        workItemId: draft.id,
        gate: 'spec_approval',
        actorId: ctx.outsider.id,
        pinnedVerification: PINNED,
      }),
    ).toThrow(PermissionDeniedError);

    // Nothing moved and nothing was pinned by the denied attempt.
    const after = ctx.engine.getWorkItem(draft.id);
    expect(after.state).toBe('draft');
    expect(after.pinnedVerification).toBeNull();
  });

  // D7: "Verification commands are pinned at the spec-approval gate into Rules-layer data."
  it('pins the verification commands into the work item at spec approval', () => {
    const ctx = setup();
    const draft = createDraftItem(ctx);

    const approved = approveSpec(ctx, draft.id, PINNED);

    expect(approved.pinnedVerification).toEqual(PINNED);
    expect(ctx.engine.getWorkItem(draft.id).pinnedVerification).toEqual(PINNED);
    // Interpretation fixed by this suite: the approval fires the gated forward
    // transition (symmetry with §1.2 reject_gate firing the loopback).
    expect(approved.state).toBe('ready_for_dev');
  });
});

// ---------------------------------------------------------------------------
// §1.4 condition 3 + D7 — machine evidence at the review/done gate
// ---------------------------------------------------------------------------
describe('review_approval evidence guards (roadmap §1.4, D7)', () => {
  // Control: §1.4 — all three conditions true simultaneously ⇒ the gate passes.
  it('passes when pinned commands exited 0, the diff is non-empty, and the commit is on the remote', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    submitAllPassingEvidence(ctx, wi.id, claim, PINNED);

    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: ctx.reviewer.id,
    });

    expect(done.state).toBe('done');
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('done');
  });

  // D7: "A command an LLM writes into a spec body during implementation is never a guard."
  // A passing exit code from a command that is not pinned satisfies nothing.
  it('a test_run whose command is not in pinnedVerification never satisfies the gate', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    // The LLM fabricated its own "verification" mid-implementation and it "passed".
    submitTestRun(ctx, wi.id, claim, 'node -e "console.log(\'all green\')"', 0);
    submitCommit(ctx, wi.id, claim, true);
    // No pinned command ever ran ⇒ evidence condition unmet.

    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  // §1.4: "real test exit codes from pinned commands" — a pinned command that
  // exited non-zero is a fact, and the fact says fail.
  it('a pinned command with a non-zero exit code fails the gate', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, ['pnpm -r test']);
    submitTestRun(ctx, wi.id, claim, 'pnpm -r test', 1);
    submitCommit(ctx, wi.id, claim, true);

    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  // §1.4: "final_revision_reachable_on_remote (pushing is part of the HALT contract
  // under a claim; the spine re-verifies from the remote rather than trusting the
  // runner's payload)".
  it('a final commit not reachable on the remote fails the gate', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, ['pnpm -r test']);
    submitTestRun(ctx, wi.id, claim, 'pnpm -r test', 0);
    submitCommit(ctx, wi.id, claim, false); // never pushed

    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  // §10.3: evidence is APPEND-ONLY and an item can be dispatched more than once,
  // so the LATEST commit is the final revision — a reachable commit from an
  // earlier run must not certify a later run whose push never landed (config
  // redirected, LFS, auth failure). The last word wins, as for pinned runs.
  it('a stale reachable commit does not certify a later unpushed one', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, ['pnpm -r test']);
    submitTestRun(ctx, wi.id, claim, 'pnpm -r test', 0);
    submitCommit(ctx, wi.id, claim, true); // run 1 pushed fine
    submitCommit(ctx, wi.id, claim, false); // run 2's push was refused

    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  // …and the §10.3 dispatcher flow itself: the container records the revision as
  // not-yet-reachable, then the host pushes and appends the reachable one.
  it('the dispatcher’s later reachable commit satisfies the gate after the container’s deferred one', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, ['pnpm -r test']);
    submitTestRun(ctx, wi.id, claim, 'pnpm -r test', 0);
    submitCommit(ctx, wi.id, claim, false); // container: pushDeferred
    submitCommit(ctx, wi.id, claim, true); // dispatcher: pushed on the host

    ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id });
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// §1.4 — the fake-done deny (Phase 1 exit criterion: "fake-done deny")
// ---------------------------------------------------------------------------
describe('in_progress → in_review requires a non-empty diff (roadmap §1.4, Phase 1 "fake-done deny")', () => {
  // §1.4 evidence: "a non-empty diff between recorded baseline and final revisions".
  // The LLM reports done, the machine-collected diff is empty ⇒ deny.
  it('rejects the advance when git_diff evidence has nonEmpty=false', () => {
    const ctx = setup();
    const draft = createDraftItem(ctx);
    approveSpec(ctx, draft.id, PINNED);
    const claim = claimAndStart(ctx, draft.id);
    submitDiff(ctx, draft.id, claim, false); // zero files changed

    expect(() =>
      ctx.engine.advanceState({
        workItemId: draft.id,
        to: 'in_review',
        actorId: ctx.dev.id,
        fencingToken: claim.fencingToken,
      }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(draft.id).state).toBe('in_progress');
  });
});

// ---------------------------------------------------------------------------
// §1.4 last paragraph — "Absent a Verification section, the done gate requires
// a human decision — it never auto-passes."
// ---------------------------------------------------------------------------
describe('absent Verification section — the done gate never auto-passes (roadmap §1.4)', () => {
  // Modeling note: with pinnedVerification empty there is no pinned command that
  // could fail — "no command failed" must NOT complete the item. Completion comes
  // only from a gate decision by a permitted actor. So: full evidence, no
  // approveGate ⇒ the item stays exactly where it is.
  it('evidence alone never completes the item — without a gate decision it stays in_review', () => {
    const ctx = setup();
    // Spec had no `## Verification` section ⇒ nothing was pinned at spec approval.
    const { wi, claim } = setupItemInReview(ctx, undefined);
    expect(ctx.engine.getWorkItem(wi.id).pinnedVerification ?? []).toEqual([]);

    // The runner submits everything it has, including a HALT report claiming done
    // (dev-auto SKILL.md HALT: terminal `status` written to the spec).
    submitCommit(ctx, wi.id, claim, true);
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.dev.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'halt_report', payload: { status: 'done', blockingCondition: null } },
    });

    // No approveGate happened ⇒ no auto-pass. Still in review.
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  // §1.4: "the done gate requires a human decision" — the gate decision by an
  // actor holding the grant IS that decision; nothing about empty pins blocks it.
  it('the gate decision by a permitted actor is the human decision — approveGate passes with nothing pinned', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, undefined);
    submitCommit(ctx, wi.id, claim, true);

    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: ctx.reviewer.id,
    });

    expect(done.state).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// §1.4 — "An LLM-written review report is evidence for a human or permitted
// actor to consider — it is never itself a guard."
// ---------------------------------------------------------------------------
describe('review_report is context for a decision, never a guard (roadmap §1.4)', () => {
  it('a glowing review_report does not advance the item — only the gate decision does', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    submitAllPassingEvidence(ctx, wi.id, claim, PINNED);

    // The LLM reviewer says ship it. That is a message to a decider, not a guard.
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.dev.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'review_report', payload: { verdict: 'looks good', findings: [] } },
    });
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');

    // The permitted actor's decision is what completes the item.
    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: ctx.reviewer.id,
    });
    expect(done.state).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// §3 — "a freshly-spun agent *with* the grant can; a veteran without it cannot."
// Authority comes from the grant, never from the actor's kind.
// ---------------------------------------------------------------------------
describe('gate authority is the grant, not the actor type (roadmap §3)', () => {
  it('an agent actor holding gate.review.approve can approve review_approval', () => {
    const ctx = setup();
    const agent = ctx.engine.createActor({ type: 'agent', displayName: 'Reviewer Agent' });
    // §3: "Grants are explicit and audited." Default posture is no agent holds a
    // gate — here a permitted human granted it explicitly.
    ctx.engine.grant({ actorId: agent.id, permission: 'gate.review.approve' });

    const { wi, claim } = setupItemInReview(ctx, PINNED);
    submitAllPassingEvidence(ctx, wi.id, claim, PINNED);

    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: agent.id,
    });
    expect(done.state).toBe('done');
  });

  it('a user actor without the grant is denied even with perfect evidence', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    submitAllPassingEvidence(ctx, wi.id, claim, PINNED);

    // Evidence is flawless — permission is still a separate, unmet condition (§1.4 cond. 1).
    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.outsider.id }),
    ).toThrow(PermissionDeniedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });
});

// ---------------------------------------------------------------------------
// §1.4 condition 3, WRITE SIDE — who may author the facts the engine judges.
//
// The conditions above pin what evidence must SAY. This cluster pins who may
// SAY it, which the suite had never asserted: before it, `submitEvidence`
// required no permission, no claim and no fencing token, so any actor holding
// any token could append `test_run{exitCode:0}` + `commit{reachableOnRemote:true}`
// to any item and the done gate's evidence condition would pass on facts nobody
// measured. That contradicts the thesis directly ("Evidence is MEASURED; authored
// evidence never passes a guard") and it defeats §1.4 condition 3 without ever
// touching condition 1 — the reviewer still holds the grant, they just approve a
// forgery. It is also strictly worse than the documented trust floor, which
// assumes an honest OPERATOR: this needed only a token.
//
// Two rules, and the split matters:
//  - `evidence.submit` is required always. Measuring is an authority, like any other.
//  - When the item has a LIVE claim, the submitter must present that claim's
//    fencing token. Measurements about work in flight may come only from the
//    worker executing it — the same capability rule §1.3 already applies to
//    state transitions, extended to the facts those transitions are judged on.
//
// The second rule is deliberately conditioned on a live claim rather than made
// absolute, because two legitimate submissions happen with no claim in
// existence: the `intent_hash` the CLI submits at spec approval (§9.3, before
// any claim), and the `pr` merge fact measured at review approval (§9.6 — the
// runner advances to in_review and THEN releases, so the reviewer who runs
// `oahs approve --check-merge` never holds a claim). An absolute fencing rule
// would break both and push callers back outside the rails.
// ---------------------------------------------------------------------------
describe('submit_evidence — who may author machine evidence (roadmap §1.4 cond. 3; thesis "evidence is measured")', () => {
  it('denies submitEvidence to an actor holding no evidence.submit grant', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx, PINNED);

    // The whole fake-done attack in one call: a zero-grant actor asserting the verdict.
    expect(() =>
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: ctx.outsider.id,
        evidence: { kind: 'test_run', payload: { command: PINNED[0], exitCode: 0 } },
      }),
    ).toThrow(PermissionDeniedError);
    expect(ctx.engine.listEvidence(wi.id).some((e) => e.kind === 'test_run')).toBe(false);
  });

  it('denies it to the six provisioned personas, which hold contributor (zero permissions)', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx, PINNED);
    // provision_personas creates agent actors whose floor-state role is
    // `contributor`, and DELIVERY_ROLES.contributor is literally [] — so the
    // persona floor state is permission-identical to a bare actor, which is why
    // this fixture needs no role assignment to model it. Before this rule, each
    // of the six could forge any item's verdict.
    const persona = ctx.engine.createActor({ type: 'agent', displayName: 'Amelia' });

    expect(() =>
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: persona.id,
        evidence: { kind: 'commit', payload: { sha: 'forged00', reachableOnRemote: true } },
      }),
    ).toThrow(PermissionDeniedError);
  });

  it('refuses evidence on a live-claimed item when no fencing token is presented', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx, PINNED); // claim is still live at in_review

    // The dev HOLDS the grant and HOLDS the claim — but a measurement submitted
    // without the capability is indistinguishable from one submitted by anyone
    // who learned the workItemId.
    expect(() =>
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: ctx.dev.id,
        evidence: { kind: 'test_run', payload: { command: PINNED[0], exitCode: 0 } },
      }),
    ).toThrow(ConflictError);
  });

  it('refuses evidence on a live-claimed item from a permitted actor who does not hold the claim', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx, PINNED);
    const other = ctx.engine.createActor({ type: 'agent', displayName: 'Another worker' });
    ctx.engine.grant({ actorId: other.id, permission: 'evidence.submit' });

    // Holding the authority is not holding the work. No fencing token it can
    // present belongs to this item's live claim.
    expect(() =>
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: other.id,
        evidence: { kind: 'test_run', payload: { command: PINNED[0], exitCode: 0 } },
      }),
    ).toThrow(ConflictError);
  });

  it('accepts evidence with no fencing token when the item has NO live claim (§9.3 intent_hash at spec approval)', () => {
    const ctx = setup();
    const draft = createDraftItem(ctx); // draft: nothing has been claimed yet

    // This is the CLI's `oahs approve --spec-file` path. It must keep working:
    // the measuring side computes the hash where the file is, before any claim exists.
    ctx.engine.submitEvidence({
      workItemId: draft.id,
      actorId: ctx.po.id,
      evidence: { kind: 'intent_hash', payload: { algo: 'v1', hash: 'abc123' } },
    });
    expect(ctx.engine.listEvidence(draft.id).map((e) => e.kind)).toContain('intent_hash');
  });

  it('accepts evidence with no fencing token once the claim is released (§9.6 pr merge at review approval)', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    ctx.engine.releaseClaim({ claimId: claim.id, actorId: ctx.dev.id, reason: 'run finished' });

    // The reviewer measures the merge fact and never held the claim — the exact
    // shape of `oahs approve --check-merge`.
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.reviewer.id,
      evidence: { kind: 'pr', payload: { action: 'merged_into_default', number: 7 } },
    });
    expect(ctx.engine.listEvidence(wi.id).map((e) => e.kind)).toContain('pr');
  });

  it('exempts context evidence from fencing — a reviewer reports while the worker holds the claim', () => {
    const ctx = setup();
    const { wi } = setupItemInReview(ctx, PINNED); // the DEV's claim is still live

    // `review_report` is documented "NEVER a guard, context only" and
    // checkReviewEvidence says "review_report is never consulted". Phase 4's exit
    // criterion has the reviewer agent post one at exactly this moment. Fencing it
    // would demand the WORKER's token from the REVIEWER to say something the engine
    // does not read — so the fencing rule covers verdict-bearing kinds only.
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.reviewer.id,
      evidence: { kind: 'review_report', payload: { verdict: 'needs a rollout section' } },
    });
    expect(ctx.engine.listEvidence(wi.id).map((e) => e.kind)).toContain('review_report');

    // …but the authority is still required: context is not a free-for-all.
    expect(() =>
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: ctx.outsider.id,
        evidence: { kind: 'review_report', payload: { verdict: 'looks fine to me' } },
      }),
    ).toThrow(PermissionDeniedError);
  });

  it('refuses a done gate whose passing test_run measured a DIFFERENT revision (0.2d)', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);

    // Every pinned command passed — but against an older revision than the commit
    // now being certified. Normalizing the worktree to HEAD (runner §6.7) makes the
    // honest runner measure the right tree; it cannot make the CORE verify that it
    // did. Without this comparison the engine certifies "the final revision" while
    // never comparing a revision, so a green run on commit A certifies commit B.
    for (const command of PINNED) {
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: ctx.dev.id,
        fencingToken: claim.fencingToken,
        evidence: { kind: 'test_run', payload: { command, exitCode: 0, revision: 'aaaaaaa' } },
      });
    }
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.dev.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'commit', payload: { sha: 'bbbbbbb', reachableOnRemote: true } },
    });

    expect(() =>
      ctx.engine.approveGate({ workItemId: wi.id, gate: 'review_approval', actorId: ctx.reviewer.id }),
    ).toThrow(GuardFailedError);
    expect(ctx.engine.getWorkItem(wi.id).state).toBe('in_review');
  });

  it('accepts a done gate when the passing test_run and the commit name the same revision', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    for (const command of PINNED) {
      ctx.engine.submitEvidence({
        workItemId: wi.id,
        actorId: ctx.dev.id,
        fencingToken: claim.fencingToken,
        evidence: { kind: 'test_run', payload: { command, exitCode: 0, revision: 'cafe123' } },
      });
    }
    ctx.engine.submitEvidence({
      workItemId: wi.id,
      actorId: ctx.dev.id,
      fencingToken: claim.fencingToken,
      evidence: { kind: 'commit', payload: { sha: 'cafe123', reachableOnRemote: true } },
    });
    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: ctx.reviewer.id,
    });
    expect(done.state).toBe('done');
  });

  it('back-compat: a test_run carrying NO revision is judged as before (pre-0.2d evidence)', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    // Evidence is append-only and data dirs outlive binaries, so an item verified by
    // a pre-0.2d runner must still be approvable — the comparison applies only when
    // the measuring side actually stated which revision it measured.
    submitAllPassingEvidence(ctx, wi.id, claim, PINNED);
    const done = ctx.engine.approveGate({
      workItemId: wi.id,
      gate: 'review_approval',
      actorId: ctx.reviewer.id,
    });
    expect(done.state).toBe('done');
  });

  it('records the submitter and the verdict-relevant payload in the append-only log', () => {
    const ctx = setup();
    const { wi, claim } = setupItemInReview(ctx, PINNED);
    submitTestRun(ctx, wi.id, claim, PINNED[0]!, 0);

    // `oahs events <id>` is sold as "who did what, on what evidence — a query,
    // not an interview" (OAHS.md). An event carrying only {kind} cannot answer
    // the second half: it does not say WHICH command or WHAT exit code won the
    // latest-wins comparison, so the log is not self-sufficient for an audit.
    const event = ctx.engine
      .events(wi.id)
      .filter((e) => e.type === 'evidence.submitted')
      .at(-1);
    expect(event?.actorId).toBe(ctx.dev.id);
    expect(event?.payload).toMatchObject({ kind: 'test_run', command: PINNED[0], exitCode: 0 });
  });
});
