/**
 * In-memory reference implementation of the spine engine, written to make the
 * conformance suite in test/ pass. The production service wraps this same
 * core with Postgres persistence (Phase 1 story "11").
 *
 * Rule provenance lives in the tests and in test/CONFORMANCE.md — this file
 * only encodes what the suite pins. Where an ordering or semantic was
 * arbitrated, the comment names the pin.
 */
import {
  BLOCKED_REASONS,
  ConflictError,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  REVIEW_LOOP_LIMIT,
  StoriesValidationError,
  WORK_ITEM_STATES,
  type Actor,
  type ActorType,
  type AdvanceInput,
  type BlockedReason,
  type Claim,
  type CreateWorkItemInput,
  type DivergenceReport,
  type Evidence,
  type Feature,
  type GateCode,
  type GateDecisionInput,
  type Permission,
  type SpineEngine,
  type SpineEvent,
  type StoriesImportResult,
  type WorkItem,
  type WorkItemState,
} from './types.js';
import { parseStories } from './stories.js';

const RANK: Record<WorkItemState, number> = Object.fromEntries(
  WORK_ITEM_STATES.map((s, i) => [s, i]),
) as Record<WorkItemState, number>;

/**
 * The versioned transition table (roadmap §1.2). Claims serialize the
 * EXECUTION zone (conformance pin, see test/CONFORMANCE.md): planning
 * transitions are permission-only; ready_for_dev→in_progress onward demand a
 * presented, live fencing token. Gate-fired transitions (spec_approval,
 * review_approval) do not appear here — approveGate/rejectGate fire them.
 */
interface TransitionRule {
  from: WorkItemState;
  to: WorkItemState;
  permission: Permission;
  claimRequired: boolean;
  guards: Array<'deps_done' | 'spec_gate_if_checkpoint' | 'nonempty_diff'>;
}

const TRANSITIONS: TransitionRule[] = [
  { from: 'backlog', to: 'draft', permission: 'task.plan', claimRequired: false, guards: [] },
  {
    from: 'draft',
    to: 'ready_for_dev',
    permission: 'task.plan',
    claimRequired: false,
    guards: ['spec_gate_if_checkpoint'],
  },
  {
    from: 'ready_for_dev',
    to: 'in_progress',
    permission: 'task.advance',
    claimRequired: true,
    guards: ['deps_done'],
  },
  {
    from: 'in_progress',
    to: 'in_review',
    permission: 'task.advance',
    claimRequired: true,
    guards: ['nonempty_diff'],
  },
];

interface WorkItemRow extends WorkItem {
  dependsOn: string[];
}

interface ClaimRow extends Claim {
  ttlMs: number;
}

interface GateDecisionRow {
  workItemId: string;
  gate: GateCode;
  decision: 'approved' | 'rejected';
  actorId: string;
}

interface EvidenceRow {
  workItemId: string;
  evidence: Evidence;
  seq: number;
}

const LEGACY_STATUS: Record<string, WorkItemState> = {
  backlog: 'backlog',
  draft: 'draft',
  'ready-for-dev': 'ready_for_dev',
  ready_for_dev: 'ready_for_dev',
  'in-progress': 'in_progress',
  in_progress: 'in_progress',
  'in-review': 'in_review',
  in_review: 'in_review',
  review: 'in_review',
  done: 'done',
};

class EngineImpl implements SpineEngine {
  private now = 0;
  private seq = 0;
  private globalSeq = 0;

  private readonly actors = new Map<string, Actor>();
  private readonly grants = new Map<string, Set<string>>(); // actorId -> "permission" (scope ignored until Phase 2)
  private readonly features = new Map<string, Feature>();
  private readonly workItems = new Map<string, WorkItemRow>();
  private readonly externalKeyIndex = new Map<string, string>(); // externalKey -> workItemId (first writer wins)
  private readonly claims = new Map<string, ClaimRow>();
  private readonly claimsByItem = new Map<string, string[]>(); // workItemId -> claimIds
  private readonly fencingCounter = new Map<string, number>(); // workItemId -> last token
  private readonly gateDecisions: GateDecisionRow[] = [];
  private readonly evidenceRows: EvidenceRow[] = [];
  private readonly eventLog: SpineEvent[] = [];
  private readonly streamSeqs = new Map<string, number>();
  private readonly idempotencyCache = new Map<string, WorkItem>();

  readonly systemActorId: string;

  constructor() {
    this.systemActorId = this.nextId('actor-system');
    this.actors.set(this.systemActorId, {
      id: this.systemActorId,
      type: 'system',
      displayName: 'system',
    });
  }

  // -- infrastructure --------------------------------------------------------

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36).padStart(6, '0')}`;
  }

  private append(
    streamType: SpineEvent['streamType'],
    streamId: string,
    type: string,
    actorId: string,
    payload: Record<string, unknown>,
    extra?: { causationId?: string; idempotencyKey?: string },
  ): SpineEvent {
    this.globalSeq += 1;
    const streamSeq = (this.streamSeqs.get(streamId) ?? 0) + 1;
    this.streamSeqs.set(streamId, streamSeq);
    const event: SpineEvent = {
      globalSeq: this.globalSeq,
      streamType,
      streamId,
      streamSeq,
      type,
      actorId,
      payload,
      ...(extra?.causationId !== undefined ? { causationId: extra.causationId } : {}),
    };
    this.eventLog.push(event);
    return event;
  }

  private mustGetItem(workItemId: string): WorkItemRow {
    const byId = this.workItems.get(workItemId);
    if (byId) return byId;
    // Imported stories are addressed by their externalKey handle
    // (conformance pin in stories-import.test.ts).
    const mapped = this.externalKeyIndex.get(workItemId);
    if (mapped !== undefined) {
      const item = this.workItems.get(mapped);
      if (item) return item;
    }
    throw new GuardFailedError(`unknown work item: ${workItemId}`);
  }

  private hasPermission(actorId: string, permission: Permission): boolean {
    return this.grants.get(actorId)?.has(permission) ?? false;
  }

  private requirePermission(actorId: string, permission: Permission): void {
    if (!this.hasPermission(actorId, permission)) {
      throw new PermissionDeniedError(permission, actorId);
    }
  }

  private liveClaim(workItemId: string): ClaimRow | null {
    for (const claimId of this.claimsByItem.get(workItemId) ?? []) {
      const claim = this.claims.get(claimId);
      if (claim && !claim.released && claim.leaseExpiresAt > this.now) return claim;
    }
    return null;
  }

  /**
   * A PRESENTED token is always validated, on every command (conformance pin,
   * claims.test.ts): stale/foreign/no-live-claim → ConflictError + audit event.
   */
  private validatePresentedToken(item: WorkItemRow, fencingToken: number | undefined, actorId: string): void {
    if (fencingToken === undefined) return;
    const live = this.liveClaim(item.id);
    if (live === null || live.fencingToken !== fencingToken) {
      this.append('work_item', item.id, 'fencing.rejected', actorId, {
        presentedToken: fencingToken,
        liveToken: live?.fencingToken ?? null,
      });
      throw new ConflictError(`stale or foreign fencing token for work item ${item.id}`);
    }
  }

  private copyItem(item: WorkItemRow): WorkItem {
    const { dependsOn: _dependsOn, ...pub } = item;
    return { ...pub, pinnedVerification: item.pinnedVerification ? [...item.pinnedVerification] : null };
  }

  private copyFeature(feature: Feature): Feature {
    return { ...feature };
  }

  private copyClaim(claim: ClaimRow): Claim {
    const { ttlMs: _ttl, ...pub } = claim;
    return { ...pub };
  }

  // -- setup -----------------------------------------------------------------

  createActor(input: { type: Exclude<ActorType, 'system'>; displayName: string }): Actor {
    const actor: Actor = { id: this.nextId('actor'), type: input.type, displayName: input.displayName };
    this.actors.set(actor.id, actor);
    return { ...actor };
  }

  grant(input: { actorId: string; permission: Permission; scope?: string }): void {
    const set = this.grants.get(input.actorId) ?? new Set<string>();
    set.add(input.permission);
    this.grants.set(input.actorId, set);
  }

  revoke(input: { actorId: string; permission: Permission; scope?: string }): void {
    this.grants.get(input.actorId)?.delete(input.permission);
  }

  createFeature(input: { actorId: string }): Feature {
    const feature: Feature = { id: this.nextId('feat'), state: 'backlog', dispatchHold: false };
    this.features.set(feature.id, feature);
    this.append('feature', feature.id, 'feature.created', input.actorId, {});
    return this.copyFeature(feature);
  }

  createWorkItem(input: CreateWorkItemInput & { actorId: string }): WorkItem {
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const item: WorkItemRow = {
      id: this.nextId('wi'),
      featureId: input.featureId,
      externalKey: input.externalKey,
      title: input.title,
      state: 'backlog',
      blockedReason: null,
      reviewLoopIteration: 0,
      intentHash: null,
      pinnedVerification: null,
      specCheckpoint: input.specCheckpoint ?? false,
      doneCheckpoint: input.doneCheckpoint ?? false,
      invokeDevWith: input.invokeDevWith ?? '',
      specPath: `stories/${input.externalKey}-${slug}.md`,
      stateVersion: 0,
      dependsOn: input.dependsOn ? [...input.dependsOn] : [],
    };
    this.workItems.set(item.id, item);
    if (!this.externalKeyIndex.has(item.externalKey)) {
      this.externalKeyIndex.set(item.externalKey, item.id);
    }
    this.append('work_item', item.id, 'work_item.created', input.actorId, {
      externalKey: item.externalKey,
      featureId: item.featureId,
    });
    return this.copyItem(item);
  }

  importStories(input: { featureId: string; yaml: string; actorId: string }): StoriesImportResult {
    const entries = parseStories(input.yaml);
    if (!this.features.has(input.featureId)) {
      throw new StoriesValidationError(`unknown feature: ${input.featureId}`);
    }
    const imported: string[] = [];
    const updated: string[] = [];
    const warnings: string[] = [];

    for (const entry of entries) {
      const existing = [...this.workItems.values()].find(
        (wi) => wi.featureId === input.featureId && wi.externalKey === entry.id,
      );
      if (existing) {
        // Re-import refreshes descriptive fields; lifecycle state is never
        // touched (stories.yaml carries no status — D9, validity rule 3).
        existing.title = entry.title;
        existing.specCheckpoint = entry.specCheckpoint;
        existing.doneCheckpoint = entry.doneCheckpoint;
        existing.invokeDevWith = entry.invokeDevWith;
        this.append('work_item', existing.id, 'work_item.reimported', input.actorId, { externalKey: entry.id });
        updated.push(entry.id);
      } else {
        this.createWorkItem({
          featureId: input.featureId,
          externalKey: entry.id,
          title: entry.title,
          specCheckpoint: entry.specCheckpoint,
          doneCheckpoint: entry.doneCheckpoint,
          invokeDevWith: entry.invokeDevWith,
          actorId: input.actorId,
        });
        imported.push(entry.id);
      }
    }
    return { imported, updated, warnings };
  }

  // -- claims (roadmap §1.3) ---------------------------------------------------

  claimTask(input: { workItemId: string; actorId: string; ttlMs?: number }): Claim {
    const item = this.mustGetItem(input.workItemId);
    this.requirePermission(input.actorId, 'task.claim');
    if (this.liveClaim(item.id) !== null) {
      // One live claim per work item — races lose by constraint (§1.3);
      // the loser leaves no row behind.
      throw new ConflictError(`work item ${item.id} already has a live claim`);
    }
    const ttlMs = input.ttlMs ?? 15 * 60 * 1000;
    const token = (this.fencingCounter.get(item.id) ?? 0) + 1;
    this.fencingCounter.set(item.id, token);
    const claim: ClaimRow = {
      id: this.nextId('claim'),
      workItemId: item.id,
      actorId: input.actorId,
      fencingToken: token,
      leaseExpiresAt: this.now + ttlMs,
      released: false,
      ttlMs,
    };
    this.claims.set(claim.id, claim);
    this.claimsByItem.set(item.id, [...(this.claimsByItem.get(item.id) ?? []), claim.id]);
    this.append('work_item', item.id, 'work_item.claimed', input.actorId, { claimId: claim.id, fencingToken: token });
    return this.copyClaim(claim);
  }

  heartbeat(input: { claimId: string }): void {
    const claim = this.claims.get(input.claimId);
    if (!claim || claim.released || claim.leaseExpiresAt <= this.now) {
      throw new ConflictError(`claim ${input.claimId} is not live`);
    }
    claim.leaseExpiresAt = this.now + claim.ttlMs;
  }

  releaseClaim(input: { claimId: string; reason?: string }): void {
    const claim = this.claims.get(input.claimId);
    if (!claim || claim.released) return;
    claim.released = true;
    this.append('work_item', claim.workItemId, 'claim.released', claim.actorId, {
      claimId: claim.id,
      reason: input.reason ?? null,
    });
  }

  advanceClock(ms: number): void {
    this.now += ms;
  }

  // -- lifecycle (roadmap §1.2) --------------------------------------------------

  advanceState(input: AdvanceInput): WorkItem {
    const item = this.mustGetItem(input.workItemId);

    // Keyed replay: the same command returns the same result, appends nothing.
    if (input.idempotencyKey !== undefined) {
      const cached = this.idempotencyCache.get(input.idempotencyKey);
      if (cached) return { ...cached };
    }

    // Preservation no-op (sprint-planning idempotency rule): an UNKEYED
    // re-request of the current state succeeds without an event. A NEW keyed
    // command is a genuinely new command and falls through to the strict
    // table check (concurrency.test.ts pin).
    if (input.idempotencyKey === undefined && input.to === item.state) {
      this.validatePresentedToken(item, input.fencingToken, input.actorId);
      return this.copyItem(item);
    }

    // Transition-table lookup precedes claim/token/permission checks
    // (fsm-transitions pin: undeclared downgrades are InvalidTransitionError
    // even with no token presented).
    const rule = TRANSITIONS.find((t) => t.from === item.state && t.to === input.to);
    if (!rule) {
      if (RANK[input.to] < RANK[item.state] && this.hasPermission(input.actorId, 'state.downgrade')) {
        return this.privilegedDowngrade(item, input);
      }
      throw new InvalidTransitionError(item.state, input.to);
    }

    this.validatePresentedToken(item, input.fencingToken, input.actorId);

    // Blocked overlay freezes transitions at every state (D8, §1.1).
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }

    this.requirePermission(input.actorId, rule.permission);

    if (rule.claimRequired) {
      // Execution-zone transitions demand a PRESENTED live token — holding
      // the claim without presenting it is not enough (claims.test.ts pin).
      if (input.fencingToken === undefined) {
        throw new GuardFailedError('claim fencing token required for this transition');
      }
      // (already validated above)
    }

    for (const guard of rule.guards) {
      this.checkGuard(guard, item);
    }

    return this.executeTransition(item, input.to, input.actorId, input.idempotencyKey);
  }

  private checkGuard(guard: TransitionRule['guards'][number], item: WorkItemRow): void {
    switch (guard) {
      case 'deps_done': {
        for (const depKey of item.dependsOn) {
          const dep = [...this.workItems.values()].find(
            (wi) => wi.featureId === item.featureId && wi.externalKey === depKey,
          );
          if (dep && dep.state !== 'done') {
            throw new GuardFailedError(`dependency ${depKey} is not done`);
          }
        }
        return;
      }
      case 'spec_gate_if_checkpoint': {
        if (!item.specCheckpoint) return;
        const approved = this.gateDecisions.some(
          (d) => d.workItemId === item.id && d.gate === 'spec_approval' && d.decision === 'approved',
        );
        if (!approved) {
          throw new GuardFailedError('spec_checkpoint requires an approved spec_approval gate decision');
        }
        return;
      }
      case 'nonempty_diff': {
        // Arbitrated (CONFORMANCE.md "Evidence"): the LATEST submitted
        // git_diff, if any, must be non-empty — an empty diff is the
        // fake-done deny. Absence is not checked at this transition (the
        // runner contract submits the diff before requesting review, and the
        // done gate independently demands remote-reachable commit evidence).
        const diffs = this.evidenceRows.filter(
          (row) => row.workItemId === item.id && row.evidence.kind === 'git_diff',
        );
        const latest = diffs[diffs.length - 1];
        if (latest && latest.evidence.payload['nonEmpty'] !== true) {
          throw new GuardFailedError('the latest git_diff evidence is empty — nothing to review');
        }
        return;
      }
    }
  }

  private privilegedDowngrade(item: WorkItemRow, input: AdvanceInput): WorkItem {
    this.validatePresentedToken(item, input.fencingToken, input.actorId);
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }
    const from = item.state;
    item.state = input.to;
    item.stateVersion += 1;
    this.append(
      'work_item',
      item.id,
      'work_item.state_downgraded',
      input.actorId,
      { from, to: input.to, compensating: true },
      input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : undefined,
    );
    const result = this.copyItem(item);
    if (input.idempotencyKey !== undefined) this.idempotencyCache.set(input.idempotencyKey, { ...result });
    return result;
  }

  /** Shared by advanceState and the gate-fired transitions. */
  private executeTransition(
    item: WorkItemRow,
    to: WorkItemState,
    actorId: string,
    idempotencyKey?: string,
    causationId?: string,
  ): WorkItem {
    const from = item.state;
    item.state = to;
    item.stateVersion += 1;
    const event = this.append(
      'work_item',
      item.id,
      'work_item.state_changed',
      actorId,
      { from, to },
      {
        ...(causationId !== undefined ? { causationId } : {}),
        ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
      },
    );

    // Epic-lift projector (roadmap §1.2): first child LEAVING backlog lifts
    // the feature; idempotent by check; authored by the system actor.
    if (from === 'backlog' && to !== 'backlog') {
      const feature = this.features.get(item.featureId);
      if (feature && feature.state === 'backlog') {
        feature.state = 'in_progress';
        this.append('feature', feature.id, 'feature.state_changed', this.systemActorId, {
          from: 'backlog',
          to: 'in_progress',
        }, { causationId: String(event.globalSeq) });
      }
    }

    // done_checkpoint (roadmap §1.1): the story completes normally; the hold
    // materializes on the feature exactly at completion.
    if (to === 'done' && item.doneCheckpoint) {
      const feature = this.features.get(item.featureId);
      if (feature && !feature.dispatchHold) {
        feature.dispatchHold = true;
        this.append('feature', feature.id, 'feature.dispatch_hold_raised', this.systemActorId, {
          workItemId: item.id,
        }, { causationId: String(event.globalSeq) });
      }
    }

    const result = this.copyItem(item);
    if (idempotencyKey !== undefined) this.idempotencyCache.set(idempotencyKey, { ...result });
    return result;
  }

  blockTask(input: {
    workItemId: string;
    reason: BlockedReason;
    actorId: string;
    fencingToken?: number;
  }): WorkItem {
    const item = this.mustGetItem(input.workItemId);
    if (!(BLOCKED_REASONS as readonly string[]).includes(input.reason)) {
      throw new GuardFailedError(`unknown blocking condition: ${input.reason}`);
    }
    this.validatePresentedToken(item, input.fencingToken, input.actorId);
    this.requirePermission(input.actorId, 'task.block');
    item.blockedReason = input.reason;
    item.stateVersion += 1;
    this.append('work_item', item.id, 'work_item.blocked', input.actorId, { reason: input.reason });
    return this.copyItem(item);
  }

  unblockTask(input: { workItemId: string; actorId: string }): WorkItem {
    const item = this.mustGetItem(input.workItemId);
    // §4.2: review_non_convergence can only be released by a review-gate
    // holder; ordinary blocks release under task.block.
    if (item.blockedReason === 'review_non_convergence') {
      this.requirePermission(input.actorId, 'gate.review.approve');
    } else {
      this.requirePermission(input.actorId, 'task.block');
    }
    item.blockedReason = null;
    item.stateVersion += 1;
    this.append('work_item', item.id, 'work_item.unblocked', input.actorId, {});
    return this.copyItem(item);
  }

  // -- gates & evidence (roadmap §1.4) ------------------------------------------

  submitEvidence(input: {
    workItemId: string;
    evidence: Evidence;
    actorId: string;
    fencingToken?: number;
  }): void {
    const item = this.mustGetItem(input.workItemId);
    this.validatePresentedToken(item, input.fencingToken, input.actorId);
    this.evidenceRows.push({ workItemId: item.id, evidence: input.evidence, seq: this.evidenceRows.length + 1 });
    this.append('work_item', item.id, 'evidence.submitted', input.actorId, {
      kind: input.evidence.kind,
    });
  }

  approveGate(input: GateDecisionInput): WorkItem {
    const item = this.mustGetItem(input.workItemId);

    if (input.gate === 'spec_approval') {
      // Permission precedes any effect: a denied attempt pins nothing.
      this.requirePermission(input.actorId, 'gate.spec.approve');
      if (item.blockedReason !== null) {
        throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
      }
      if (item.state !== 'draft') {
        throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
      }
      if (input.pinnedVerification !== undefined) {
        item.pinnedVerification = [...input.pinnedVerification];
      }
      this.gateDecisions.push({
        workItemId: item.id,
        gate: 'spec_approval',
        decision: 'approved',
        actorId: input.actorId,
      });
      this.append('work_item', item.id, 'gate.approved', input.actorId, {
        gate: 'spec_approval',
        pinnedVerification: item.pinnedVerification,
      });
      // The approval fires the gated forward transition (conformance pin).
      return this.executeTransition(item, 'ready_for_dev', input.actorId);
    }

    // review_approval
    this.requirePermission(input.actorId, 'gate.review.approve');
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
    }
    this.checkReviewEvidence(item);
    this.gateDecisions.push({
      workItemId: item.id,
      gate: 'review_approval',
      decision: 'approved',
      actorId: input.actorId,
    });
    this.append('work_item', item.id, 'gate.approved', input.actorId, { gate: 'review_approval' });
    return this.executeTransition(item, 'done', input.actorId);
  }

  /**
   * Evidence condition of the done gate (§1.4, D7): every PINNED command's
   * latest test_run exited 0 (an unpinned command satisfies nothing), and the
   * final commit is reachable on the remote. review_report is never consulted.
   * With nothing pinned, the gate decision by the permitted actor IS the human
   * decision — evidence alone never completes the item either way.
   */
  private checkReviewEvidence(item: WorkItemRow): void {
    const rows = this.evidenceRows.filter((row) => row.workItemId === item.id);
    for (const command of item.pinnedVerification ?? []) {
      const runs = rows.filter(
        (row) => row.evidence.kind === 'test_run' && row.evidence.payload['command'] === command,
      );
      const latest = runs[runs.length - 1];
      if (!latest || latest.evidence.payload['exitCode'] !== 0) {
        throw new GuardFailedError(`pinned verification did not pass: ${command}`);
      }
    }
    const commitOk = rows.some(
      (row) => row.evidence.kind === 'commit' && row.evidence.payload['reachableOnRemote'] === true,
    );
    if (!commitOk) {
      throw new GuardFailedError('final revision must be reachable on the remote (push is part of the HALT contract)');
    }
  }

  rejectGate(input: GateDecisionInput): WorkItem {
    const item = this.mustGetItem(input.workItemId);
    if (input.gate !== 'review_approval') {
      throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
    }
    this.requirePermission(input.actorId, 'gate.review.approve');
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
    }
    this.gateDecisions.push({
      workItemId: item.id,
      gate: 'review_approval',
      decision: 'rejected',
      actorId: input.actorId,
    });
    const decisionEvent = this.append('work_item', item.id, 'gate.rejected', input.actorId, {
      gate: 'review_approval',
    });

    if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
      // The 6th rejection performs no loopback: overlay review_non_convergence,
      // state frozen at in_review, counter untouched (CONFORMANCE.md pin).
      item.blockedReason = 'review_non_convergence';
      item.stateVersion += 1;
      this.append(
        'work_item',
        item.id,
        'work_item.blocked',
        this.systemActorId,
        { reason: 'review_non_convergence' },
        { causationId: String(decisionEvent.globalSeq) },
      );
      return this.copyItem(item);
    }

    // §1.2: the loopback is a system effect — no claim-holder participation.
    item.reviewLoopIteration += 1;
    return this.executeTransition(item, 'in_progress', this.systemActorId, undefined, String(decisionEvent.globalSeq));
  }

  // -- dispatch (roadmap §2.3) -----------------------------------------------

  getTaskContext(input: { workItemId: string }): { workItem: WorkItem; entryState: WorkItemState } {
    const item = this.mustGetItem(input.workItemId);
    if (item.state === 'done') {
      throw new GuardFailedError('done items are never re-dispatched; follow-up review is a new work item');
    }
    const feature = this.features.get(item.featureId);
    if (feature?.dispatchHold) {
      throw new GuardFailedError('feature is under a done_checkpoint dispatch hold');
    }
    return { workItem: this.copyItem(item), entryState: item.state };
  }

  releaseDispatchHold(input: { featureId: string; actorId: string }): Feature {
    this.requirePermission(input.actorId, 'dispatch.release_hold');
    const feature = this.features.get(input.featureId);
    if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
    feature.dispatchHold = false;
    this.append('feature', feature.id, 'feature.dispatch_hold_released', input.actorId, {});
    return this.copyFeature(feature);
  }

  // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------

  reconcile(input: { files: Array<{ workItemId: string; frontmatterStatus: string }> }): DivergenceReport[] {
    const reports: DivergenceReport[] = [];
    for (const file of input.files) {
      const item = this.mustGetItem(file.workItemId);
      // Files under a live claim are excluded — playbooks legitimately write
      // frontmatter mid-run (§1.6).
      if (this.liveClaim(item.id) !== null) continue;

      const raw = file.frontmatterStatus.trim();
      if (raw === 'blocked') {
        // D8: overlay in the DB and `status: blocked` in the file are the
        // same truth. Blocked-in-file with NO overlay is real drift.
        if (item.blockedReason !== null) continue;
        reports.push({
          workItemId: item.id,
          fileState: raw,
          dbState: item.state,
          kind: 'conflict',
        });
        continue;
      }

      const normalized = LEGACY_STATUS[raw];
      if (normalized === undefined) {
        reports.push({ workItemId: item.id, fileState: raw, dbState: item.state, kind: 'conflict' });
        continue;
      }
      if (normalized === item.state) continue;
      reports.push({
        workItemId: item.id,
        fileState: raw,
        dbState: item.state,
        kind: RANK[normalized] > RANK[item.state] ? 'file_ahead' : 'db_ahead',
      });
    }
    return reports;
  }

  // -- queries ---------------------------------------------------------------

  getWorkItem(id: string): WorkItem {
    return this.copyItem(this.mustGetItem(id));
  }

  getFeature(id: string): Feature {
    const feature = this.features.get(id);
    if (!feature) throw new GuardFailedError(`unknown feature: ${id}`);
    return this.copyFeature(feature);
  }

  getClaims(workItemId: string): Claim[] {
    const item = this.mustGetItem(workItemId);
    return (this.claimsByItem.get(item.id) ?? []).flatMap((claimId) => {
      const claim = this.claims.get(claimId);
      return claim ? [this.copyClaim(claim)] : [];
    });
  }

  events(streamId?: string): SpineEvent[] {
    const source = streamId === undefined ? this.eventLog : this.eventLog.filter((e) => e.streamId === streamId);
    return source.map((event) => ({ ...event, payload: { ...event.payload } }));
  }
}

export function createEngine(): SpineEngine {
  return new EngineImpl();
}
