/**
 * PgEngine — async Postgres port of the in-memory reference engine
 * (@oahs/core src/engine.ts). Semantics are a FAITHFUL mirror, method by
 * method: same check ordering, same error classes, same event types, same
 * conformance pins (see packages/core/test/CONFORMANCE.md). Where the
 * reference used in-process data structures, this engine uses the Drizzle
 * schema in schema.ts and lets constraints do the racing (roadmap §1.3
 * "races lose by constraint, not by application logic").
 *
 * Technical notes:
 *  - The engine clock is the JS field `now` (advanceClock adds to it); lease
 *    comparisons always use this.now, never SQL now().
 *  - Every command's writes happen in ONE db.transaction (event append +
 *    projection update together — roadmap §1.5). The single deliberate
 *    exception: the fencing.rejected AUDIT event commits in its own
 *    transaction, because the command it belongs to fails with ConflictError
 *    and must leave the projection untouched while the refusal is recorded
 *    (§1.3 "a stale token gets 409 and an audit event").
 *  - All returned values are structured-clone-able plain objects (number
 *    timestamps, no Date, no undefined array holes) so they cross the
 *    synckit worker boundary intact.
 */
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

import {
  BLOCKED_REASONS,
  ConflictError,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  REVIEW_LOOP_LIMIT,
  StoriesValidationError,
  WORK_ITEM_STATES,
  parseStories,
  type Actor,
  type ActorType,
  type AdvanceInput,
  type BlockedReason,
  type Claim,
  type CreateWorkItemInput,
  type DivergenceReport,
  type Evidence,
  type Feature,
  type GateDecisionInput,
  type Permission,
  type SpineEvent,
  type StoriesImportResult,
  type WorkItem,
  type WorkItemState,
} from '@oahs/core';

import {
  actors,
  claims,
  evidence as evidenceTable,
  events,
  features,
  gateDecisions,
  grants,
  idempotencyKeys,
  workItems,
} from './schema.js';

type Db = PgliteDatabase<Record<string, unknown>>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Both the root database and a transaction expose the same query surface. */
type Queryable = Db | Tx;

type WorkItemRow = typeof workItems.$inferSelect;
type ClaimRow = typeof claims.$inferSelect;
type FeatureRow = typeof features.$inferSelect;
type EventRow = typeof events.$inferSelect;

const RANK: Record<WorkItemState, number> = Object.fromEntries(
  WORK_ITEM_STATES.map((s, i) => [s, i]),
) as Record<WorkItemState, number>;

/** Mirror of the reference transition table (engine.ts) — do not diverge. */
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

/** Postgres unique-violation detector (walks drizzle's wrapped causes). */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const err = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (err.code === '23505') return true;
    if (typeof err.message === 'string' && /duplicate key value violates unique/i.test(err.message)) {
      return true;
    }
    current = err.cause;
  }
  return false;
}

export class PgEngine {
  /** Engine clock in ms — the ONLY time source for lease logic. */
  private now = 0;
  private seq = 0;
  private systemActorId = '';

  constructor(private readonly db: Db) {}

  /** Post-reset setup: the per-workspace system actor (roadmap §1.2). */
  async init(): Promise<void> {
    this.systemActorId = this.nextId('actor-system');
    await this.db.insert(actors).values({
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

  private async appendTx(
    tx: Queryable,
    streamType: SpineEvent['streamType'],
    streamId: string,
    type: string,
    actorId: string,
    payload: Record<string, unknown>,
    extra?: { causationId?: string; idempotencyKey?: string },
  ): Promise<SpineEvent> {
    // stream_seq is 1-based and gap-free per stream (§1.5); computed in the
    // same transaction as the projection update, so UNIQUE(stream_id,
    // stream_seq) doubles as the optimistic lock.
    const [row] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${events.streamSeq}), 0)` })
      .from(events)
      .where(eq(events.streamId, streamId));
    const streamSeq = Number(row?.maxSeq ?? 0) + 1;
    const inserted = await tx
      .insert(events)
      .values({
        streamType,
        streamId,
        streamSeq,
        type,
        actorId,
        payload,
        causationId: extra?.causationId ?? null,
        idempotencyKey: extra?.idempotencyKey ?? null,
      })
      .returning({ globalSeq: events.globalSeq });
    const globalSeq = inserted[0]?.globalSeq;
    if (globalSeq === undefined) throw new Error('event insert returned no global_seq');
    return {
      globalSeq,
      streamType,
      streamId,
      streamSeq,
      type,
      actorId,
      payload,
      ...(extra?.causationId !== undefined ? { causationId: extra.causationId } : {}),
    };
  }

  private async mustGetItem(workItemId: string): Promise<WorkItemRow> {
    const byId = await this.db.select().from(workItems).where(eq(workItems.id, workItemId)).limit(1);
    if (byId[0]) return byId[0];
    // Imported stories are addressed by their externalKey handle; first
    // writer wins — the earliest-created row resolves (conformance pin in
    // stories-import.test.ts, mirrored from the reference externalKeyIndex).
    const byKey = await this.db
      .select()
      .from(workItems)
      .where(eq(workItems.externalKey, workItemId))
      .orderBy(asc(workItems.seq))
      .limit(1);
    if (byKey[0]) return byKey[0];
    throw new GuardFailedError(`unknown work item: ${workItemId}`);
  }

  private async getFeatureRow(featureId: string, tx: Queryable = this.db): Promise<FeatureRow | null> {
    const rows = await tx.select().from(features).where(eq(features.id, featureId)).limit(1);
    return rows[0] ?? null;
  }

  private async hasPermission(actorId: string, permission: Permission): Promise<boolean> {
    const rows = await this.db
      .select({ permission: grants.permission })
      .from(grants)
      .where(and(eq(grants.actorId, actorId), eq(grants.permission, permission)))
      .limit(1);
    return rows.length > 0;
  }

  private async requirePermission(actorId: string, permission: Permission): Promise<void> {
    if (!(await this.hasPermission(actorId, permission))) {
      throw new PermissionDeniedError(permission, actorId);
    }
  }

  private async liveClaim(workItemId: string): Promise<ClaimRow | null> {
    const rows = await this.db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.workItemId, workItemId),
          eq(claims.released, false),
          gt(claims.leaseExpiresAt, this.now),
        ),
      )
      .orderBy(asc(claims.seq))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * A PRESENTED token is always validated, on every command (conformance
   * pin, claims.test.ts): stale/foreign/no-live-claim → ConflictError + audit
   * event. The audit event commits in its OWN transaction — the failing
   * command's transaction (if any) must not swallow it.
   */
  private async validatePresentedToken(
    item: WorkItemRow,
    fencingToken: number | undefined,
    actorId: string,
  ): Promise<void> {
    if (fencingToken === undefined) return;
    const live = await this.liveClaim(item.id);
    if (live === null || live.fencingToken !== fencingToken) {
      await this.db.transaction(async (tx) => {
        await this.appendTx(tx, 'work_item', item.id, 'fencing.rejected', actorId, {
          presentedToken: fencingToken,
          liveToken: live?.fencingToken ?? null,
        });
      });
      throw new ConflictError(`stale or foreign fencing token for work item ${item.id}`);
    }
  }

  private publicItem(row: WorkItemRow): WorkItem {
    return {
      id: row.id,
      featureId: row.featureId,
      externalKey: row.externalKey,
      title: row.title,
      state: row.state as WorkItemState,
      blockedReason: (row.blockedReason as BlockedReason | null) ?? null,
      reviewLoopIteration: row.reviewLoopIteration,
      intentHash: row.intentHash,
      pinnedVerification: row.pinnedVerification ? [...row.pinnedVerification] : null,
      specCheckpoint: row.specCheckpoint,
      doneCheckpoint: row.doneCheckpoint,
      invokeDevWith: row.invokeDevWith,
      specPath: row.specPath,
      stateVersion: row.stateVersion,
    };
  }

  private publicFeature(row: FeatureRow): Feature {
    return {
      id: row.id,
      state: row.state as Feature['state'],
      dispatchHold: row.dispatchHold,
    };
  }

  private publicClaim(row: ClaimRow): Claim {
    return {
      id: row.id,
      workItemId: row.workItemId,
      actorId: row.actorId,
      fencingToken: row.fencingToken,
      leaseExpiresAt: row.leaseExpiresAt,
      released: row.released,
    };
  }

  private eventFromRow(row: EventRow): SpineEvent {
    return {
      globalSeq: row.globalSeq,
      streamType: row.streamType as SpineEvent['streamType'],
      streamId: row.streamId,
      streamSeq: row.streamSeq,
      type: row.type,
      actorId: row.actorId,
      payload: row.payload,
      ...(row.causationId !== null ? { causationId: row.causationId } : {}),
    };
  }

  // -- setup -----------------------------------------------------------------

  async createActor(input: { type: Exclude<ActorType, 'system'>; displayName: string }): Promise<Actor> {
    const actor: Actor = { id: this.nextId('actor'), type: input.type, displayName: input.displayName };
    await this.db.insert(actors).values({ id: actor.id, type: actor.type, displayName: actor.displayName });
    return actor;
  }

  async grant(input: { actorId: string; permission: Permission; scope?: string }): Promise<void> {
    await this.db
      .insert(grants)
      .values({ actorId: input.actorId, permission: input.permission, scope: input.scope ?? null })
      .onConflictDoNothing();
  }

  async revoke(input: { actorId: string; permission: Permission; scope?: string }): Promise<void> {
    await this.db
      .delete(grants)
      .where(and(eq(grants.actorId, input.actorId), eq(grants.permission, input.permission)));
  }

  async createFeature(input: { actorId: string }): Promise<Feature> {
    const id = this.nextId('feat');
    return this.db.transaction(async (tx) => {
      await tx.insert(features).values({ id, state: 'backlog', dispatchHold: false });
      await this.appendTx(tx, 'feature', id, 'feature.created', input.actorId, {});
      return { id, state: 'backlog' as const, dispatchHold: false };
    });
  }

  private async createWorkItemTx(tx: Queryable, input: CreateWorkItemInput & { actorId: string }): Promise<WorkItem> {
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const row: WorkItemRow = {
      id: this.nextId('wi'),
      seq: 0, // assigned by the serial; placeholder for the local copy only
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
      lastFencingToken: 0,
    };
    await tx.insert(workItems).values({
      id: row.id,
      featureId: row.featureId,
      externalKey: row.externalKey,
      title: row.title,
      state: row.state,
      blockedReason: row.blockedReason,
      reviewLoopIteration: row.reviewLoopIteration,
      intentHash: row.intentHash,
      pinnedVerification: row.pinnedVerification,
      specCheckpoint: row.specCheckpoint,
      doneCheckpoint: row.doneCheckpoint,
      invokeDevWith: row.invokeDevWith,
      specPath: row.specPath,
      stateVersion: row.stateVersion,
      dependsOn: row.dependsOn,
      lastFencingToken: row.lastFencingToken,
    });
    await this.appendTx(tx, 'work_item', row.id, 'work_item.created', input.actorId, {
      externalKey: row.externalKey,
      featureId: row.featureId,
    });
    return this.publicItem(row);
  }

  async createWorkItem(input: CreateWorkItemInput & { actorId: string }): Promise<WorkItem> {
    return this.db.transaction(async (tx) => this.createWorkItemTx(tx, input));
  }

  async importStories(input: { featureId: string; yaml: string; actorId: string }): Promise<StoriesImportResult> {
    const entries = parseStories(input.yaml);
    const feature = await this.getFeatureRow(input.featureId);
    if (!feature) {
      throw new StoriesValidationError(`unknown feature: ${input.featureId}`);
    }
    return this.db.transaction(async (tx) => {
      const imported: string[] = [];
      const updated: string[] = [];
      const warnings: string[] = [];
      for (const entry of entries) {
        const existing = (
          await tx
            .select()
            .from(workItems)
            .where(and(eq(workItems.featureId, input.featureId), eq(workItems.externalKey, entry.id)))
            .orderBy(asc(workItems.seq))
            .limit(1)
        )[0];
        if (existing) {
          // Re-import refreshes descriptive fields; lifecycle state is never
          // touched (stories.yaml carries no status — D9, validity rule 3).
          await tx
            .update(workItems)
            .set({
              title: entry.title,
              specCheckpoint: entry.specCheckpoint,
              doneCheckpoint: entry.doneCheckpoint,
              invokeDevWith: entry.invokeDevWith,
            })
            .where(eq(workItems.id, existing.id));
          await this.appendTx(tx, 'work_item', existing.id, 'work_item.reimported', input.actorId, {
            externalKey: entry.id,
          });
          updated.push(entry.id);
        } else {
          await this.createWorkItemTx(tx, {
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
    });
  }

  // -- claims (roadmap §1.3) ---------------------------------------------------

  async claimTask(input: { workItemId: string; actorId: string; ttlMs?: number }): Promise<Claim> {
    const item = await this.mustGetItem(input.workItemId);
    await this.requirePermission(input.actorId, 'task.claim');
    const ttlMs = input.ttlMs ?? 15 * 60 * 1000;
    const claimId = this.nextId('claim');
    try {
      return await this.db.transaction(async (tx) => {
        // Sweep: an EXPIRED lease returns the item to the pool — flip its
        // released flag so the partial unique index only guards live claims.
        await tx
          .update(claims)
          .set({ released: true })
          .where(
            and(
              eq(claims.workItemId, item.id),
              eq(claims.released, false),
              lte(claims.leaseExpiresAt, this.now),
            ),
          );
        // Monotonic fencing token per work item, consumed only on success
        // (the transaction rolls the counter back when the insert loses).
        const counterRow = (
          await tx
            .select({ lastFencingToken: workItems.lastFencingToken })
            .from(workItems)
            .where(eq(workItems.id, item.id))
            .limit(1)
        )[0];
        const token = (counterRow?.lastFencingToken ?? 0) + 1;
        await tx.update(workItems).set({ lastFencingToken: token }).where(eq(workItems.id, item.id));
        // The partial unique index claims_one_live_per_item decides the race:
        // a live claim makes this INSERT fail — the loser leaves no row.
        await tx.insert(claims).values({
          id: claimId,
          workItemId: item.id,
          actorId: input.actorId,
          fencingToken: token,
          leaseExpiresAt: this.now + ttlMs,
          released: false,
          ttlMs,
        });
        await this.appendTx(tx, 'work_item', item.id, 'work_item.claimed', input.actorId, {
          claimId,
          fencingToken: token,
        });
        return {
          id: claimId,
          workItemId: item.id,
          actorId: input.actorId,
          fencingToken: token,
          leaseExpiresAt: this.now + ttlMs,
          released: false,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(`work item ${item.id} already has a live claim`);
      }
      throw error;
    }
  }

  async heartbeat(input: { claimId: string }): Promise<void> {
    const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
    if (!row || row.released || row.leaseExpiresAt <= this.now) {
      throw new ConflictError(`claim ${input.claimId} is not live`);
    }
    // Heartbeat renews the FULL original TTL from the heartbeat moment.
    await this.db
      .update(claims)
      .set({ leaseExpiresAt: this.now + row.ttlMs })
      .where(eq(claims.id, row.id));
  }

  async releaseClaim(input: { claimId: string; reason?: string }): Promise<void> {
    const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
    if (!row || row.released) return;
    await this.db.transaction(async (tx) => {
      await tx.update(claims).set({ released: true }).where(eq(claims.id, row.id));
      await this.appendTx(tx, 'work_item', row.workItemId, 'claim.released', row.actorId, {
        claimId: row.id,
        reason: input.reason ?? null,
      });
    });
  }

  advanceClock(ms: number): void {
    this.now += ms;
  }

  // -- lifecycle (roadmap §1.2) --------------------------------------------------

  async advanceState(input: AdvanceInput): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);

    // Keyed replay: the same command returns the same result, appends nothing.
    if (input.idempotencyKey !== undefined) {
      const cached = (
        await this.db
          .select()
          .from(idempotencyKeys)
          .where(eq(idempotencyKeys.key, input.idempotencyKey))
          .limit(1)
      )[0];
      if (cached) return { ...(cached.result as unknown as WorkItem) };
    }

    // Preservation no-op (sprint-planning idempotency rule): an UNKEYED
    // re-request of the current state succeeds without an event.
    if (input.idempotencyKey === undefined && input.to === item.state) {
      await this.validatePresentedToken(item, input.fencingToken, input.actorId);
      return this.publicItem(item);
    }

    // Transition-table lookup precedes claim/token/permission checks
    // (fsm-transitions pin).
    const rule = TRANSITIONS.find((t) => t.from === item.state && t.to === input.to);
    if (!rule) {
      if (
        RANK[input.to] < RANK[item.state as WorkItemState] &&
        (await this.hasPermission(input.actorId, 'state.downgrade'))
      ) {
        return this.privilegedDowngrade(item, input);
      }
      throw new InvalidTransitionError(item.state as WorkItemState, input.to);
    }

    await this.validatePresentedToken(item, input.fencingToken, input.actorId);

    // Blocked overlay freezes transitions at every state (D8, §1.1).
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }

    await this.requirePermission(input.actorId, rule.permission);

    if (rule.claimRequired && input.fencingToken === undefined) {
      // Execution-zone transitions demand a PRESENTED live token.
      throw new GuardFailedError('claim fencing token required for this transition');
    }

    for (const guard of rule.guards) {
      await this.checkGuard(guard, item);
    }

    return this.db.transaction(async (tx) =>
      this.executeTransitionTx(tx, item, input.to, input.actorId, input.idempotencyKey),
    );
  }

  private async checkGuard(guard: TransitionRule['guards'][number], item: WorkItemRow): Promise<void> {
    switch (guard) {
      case 'deps_done': {
        for (const depKey of item.dependsOn) {
          const dep = (
            await this.db
              .select()
              .from(workItems)
              .where(and(eq(workItems.featureId, item.featureId), eq(workItems.externalKey, depKey)))
              .orderBy(asc(workItems.seq))
              .limit(1)
          )[0];
          if (dep && dep.state !== 'done') {
            throw new GuardFailedError(`dependency ${depKey} is not done`);
          }
        }
        return;
      }
      case 'spec_gate_if_checkpoint': {
        if (!item.specCheckpoint) return;
        const approved = (
          await this.db
            .select({ seq: gateDecisions.seq })
            .from(gateDecisions)
            .where(
              and(
                eq(gateDecisions.workItemId, item.id),
                eq(gateDecisions.gate, 'spec_approval'),
                eq(gateDecisions.decision, 'approved'),
              ),
            )
            .limit(1)
        )[0];
        if (!approved) {
          throw new GuardFailedError('spec_checkpoint requires an approved spec_approval gate decision');
        }
        return;
      }
      case 'nonempty_diff': {
        // The LATEST submitted git_diff, if any, must be non-empty — the
        // fake-done deny. Absence is not checked here (CONFORMANCE.md pin).
        const rows = await this.db
          .select()
          .from(evidenceTable)
          .where(and(eq(evidenceTable.workItemId, item.id), eq(evidenceTable.kind, 'git_diff')))
          .orderBy(asc(evidenceTable.seq));
        const latest = rows[rows.length - 1];
        if (latest && latest.payload['nonEmpty'] !== true) {
          throw new GuardFailedError('the latest git_diff evidence is empty — nothing to review');
        }
        return;
      }
    }
  }

  private async privilegedDowngrade(item: WorkItemRow, input: AdvanceInput): Promise<WorkItem> {
    await this.validatePresentedToken(item, input.fencingToken, input.actorId);
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }
    const from = item.state;
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(workItems)
        .set({ state: input.to, stateVersion: item.stateVersion + 1 })
        .where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion)))
        .returning({ id: workItems.id });
      if (updated.length === 0) {
        throw new ConflictError(`state_version conflict on work item ${item.id}`);
      }
      await this.appendTx(
        tx,
        'work_item',
        item.id,
        'work_item.state_downgraded',
        input.actorId,
        { from, to: input.to, compensating: true },
        input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : undefined,
      );
      const result = this.publicItem({ ...item, state: input.to, stateVersion: item.stateVersion + 1 });
      if (input.idempotencyKey !== undefined) {
        await tx
          .insert(idempotencyKeys)
          .values({ key: input.idempotencyKey, result: result as unknown as Record<string, unknown> })
          .onConflictDoNothing();
      }
      return result;
    });
  }

  /** Shared by advanceState and the gate-fired transitions. ONE transaction per command. */
  private async executeTransitionTx(
    tx: Tx,
    item: WorkItemRow,
    to: WorkItemState,
    actorId: string,
    idempotencyKey?: string,
    causationId?: string,
  ): Promise<WorkItem> {
    const from = item.state as WorkItemState;
    // CAS: optimistic concurrency by state_version (roadmap §1.1).
    const updated = await tx
      .update(workItems)
      .set({ state: to, stateVersion: item.stateVersion + 1 })
      .where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion)))
      .returning({ id: workItems.id });
    if (updated.length === 0) {
      throw new ConflictError(`state_version conflict on work item ${item.id}`);
    }
    const event = await this.appendTx(
      tx,
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
      const feature = await this.getFeatureRow(item.featureId, tx);
      if (feature && feature.state === 'backlog') {
        await tx.update(features).set({ state: 'in_progress' }).where(eq(features.id, feature.id));
        await this.appendTx(
          tx,
          'feature',
          feature.id,
          'feature.state_changed',
          this.systemActorId,
          { from: 'backlog', to: 'in_progress' },
          { causationId: String(event.globalSeq) },
        );
      }
    }

    // done_checkpoint (roadmap §1.1): the story completes normally; the hold
    // materializes on the feature exactly at completion.
    if (to === 'done' && item.doneCheckpoint) {
      const feature = await this.getFeatureRow(item.featureId, tx);
      if (feature && !feature.dispatchHold) {
        await tx.update(features).set({ dispatchHold: true }).where(eq(features.id, feature.id));
        await this.appendTx(
          tx,
          'feature',
          feature.id,
          'feature.dispatch_hold_raised',
          this.systemActorId,
          { workItemId: item.id },
          { causationId: String(event.globalSeq) },
        );
      }
    }

    const result = this.publicItem({ ...item, state: to, stateVersion: item.stateVersion + 1 });
    if (idempotencyKey !== undefined) {
      await tx
        .insert(idempotencyKeys)
        .values({ key: idempotencyKey, result: result as unknown as Record<string, unknown> })
        .onConflictDoNothing();
    }
    return result;
  }

  async blockTask(input: {
    workItemId: string;
    reason: BlockedReason;
    actorId: string;
    fencingToken?: number;
  }): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);
    if (!(BLOCKED_REASONS as readonly string[]).includes(input.reason)) {
      throw new GuardFailedError(`unknown blocking condition: ${input.reason}`);
    }
    await this.validatePresentedToken(item, input.fencingToken, input.actorId);
    await this.requirePermission(input.actorId, 'task.block');
    return this.db.transaction(async (tx) => {
      await tx
        .update(workItems)
        .set({ blockedReason: input.reason, stateVersion: item.stateVersion + 1 })
        .where(eq(workItems.id, item.id));
      await this.appendTx(tx, 'work_item', item.id, 'work_item.blocked', input.actorId, {
        reason: input.reason,
      });
      return this.publicItem({ ...item, blockedReason: input.reason, stateVersion: item.stateVersion + 1 });
    });
  }

  async unblockTask(input: { workItemId: string; actorId: string }): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);
    // §4.2: review_non_convergence can only be released by a review-gate
    // holder; ordinary blocks release under task.block.
    if (item.blockedReason === 'review_non_convergence') {
      await this.requirePermission(input.actorId, 'gate.review.approve');
    } else {
      await this.requirePermission(input.actorId, 'task.block');
    }
    return this.db.transaction(async (tx) => {
      await tx
        .update(workItems)
        .set({ blockedReason: null, stateVersion: item.stateVersion + 1 })
        .where(eq(workItems.id, item.id));
      await this.appendTx(tx, 'work_item', item.id, 'work_item.unblocked', input.actorId, {});
      return this.publicItem({ ...item, blockedReason: null, stateVersion: item.stateVersion + 1 });
    });
  }

  // -- gates & evidence (roadmap §1.4) ------------------------------------------

  async submitEvidence(input: {
    workItemId: string;
    evidence: Evidence;
    actorId: string;
    fencingToken?: number;
  }): Promise<void> {
    const item = await this.mustGetItem(input.workItemId);
    await this.validatePresentedToken(item, input.fencingToken, input.actorId);
    await this.db.transaction(async (tx) => {
      await tx.insert(evidenceTable).values({
        workItemId: item.id,
        kind: input.evidence.kind,
        payload: input.evidence.payload,
      });
      await this.appendTx(tx, 'work_item', item.id, 'evidence.submitted', input.actorId, {
        kind: input.evidence.kind,
      });
    });
  }

  async approveGate(input: GateDecisionInput): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);

    if (input.gate === 'spec_approval') {
      // Permission precedes any effect: a denied attempt pins nothing.
      await this.requirePermission(input.actorId, 'gate.spec.approve');
      if (item.blockedReason !== null) {
        throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
      }
      if (item.state !== 'draft') {
        throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
      }
      return this.db.transaction(async (tx) => {
        let pinned = item.pinnedVerification;
        if (input.pinnedVerification !== undefined) {
          pinned = [...input.pinnedVerification];
          await tx.update(workItems).set({ pinnedVerification: pinned }).where(eq(workItems.id, item.id));
        }
        await tx.insert(gateDecisions).values({
          workItemId: item.id,
          gate: 'spec_approval',
          decision: 'approved',
          actorId: input.actorId,
        });
        await this.appendTx(tx, 'work_item', item.id, 'gate.approved', input.actorId, {
          gate: 'spec_approval',
          pinnedVerification: pinned ?? null,
        });
        // The approval fires the gated forward transition (conformance pin).
        return this.executeTransitionTx(tx, { ...item, pinnedVerification: pinned }, 'ready_for_dev', input.actorId);
      });
    }

    // review_approval
    await this.requirePermission(input.actorId, 'gate.review.approve');
    if (item.blockedReason !== null) {
      throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
    }
    await this.checkReviewEvidence(item);
    return this.db.transaction(async (tx) => {
      await tx.insert(gateDecisions).values({
        workItemId: item.id,
        gate: 'review_approval',
        decision: 'approved',
        actorId: input.actorId,
      });
      await this.appendTx(tx, 'work_item', item.id, 'gate.approved', input.actorId, {
        gate: 'review_approval',
      });
      return this.executeTransitionTx(tx, item, 'done', input.actorId);
    });
  }

  /**
   * Evidence condition of the done gate (§1.4, D7): every PINNED command's
   * latest test_run exited 0, and the final commit is reachable on the
   * remote. review_report is never consulted.
   */
  private async checkReviewEvidence(item: WorkItemRow): Promise<void> {
    const rows = await this.db
      .select()
      .from(evidenceTable)
      .where(eq(evidenceTable.workItemId, item.id))
      .orderBy(asc(evidenceTable.seq));
    for (const command of item.pinnedVerification ?? []) {
      const runs = rows.filter((row) => row.kind === 'test_run' && row.payload['command'] === command);
      const latest = runs[runs.length - 1];
      if (!latest || latest.payload['exitCode'] !== 0) {
        throw new GuardFailedError(`pinned verification did not pass: ${command}`);
      }
    }
    const commitOk = rows.some((row) => row.kind === 'commit' && row.payload['reachableOnRemote'] === true);
    if (!commitOk) {
      throw new GuardFailedError(
        'final revision must be reachable on the remote (push is part of the HALT contract)',
      );
    }
  }

  async rejectGate(input: GateDecisionInput): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);
    if (input.gate !== 'review_approval') {
      throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
    }
    await this.requirePermission(input.actorId, 'gate.review.approve');
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
    }
    return this.db.transaction(async (tx) => {
      await tx.insert(gateDecisions).values({
        workItemId: item.id,
        gate: 'review_approval',
        decision: 'rejected',
        actorId: input.actorId,
      });
      const decisionEvent = await this.appendTx(tx, 'work_item', item.id, 'gate.rejected', input.actorId, {
        gate: 'review_approval',
      });

      if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
        // The 6th rejection performs no loopback: overlay review_non_convergence,
        // state frozen at in_review, counter untouched (CONFORMANCE.md pin).
        await tx
          .update(workItems)
          .set({ blockedReason: 'review_non_convergence', stateVersion: item.stateVersion + 1 })
          .where(eq(workItems.id, item.id));
        await this.appendTx(
          tx,
          'work_item',
          item.id,
          'work_item.blocked',
          this.systemActorId,
          { reason: 'review_non_convergence' },
          { causationId: String(decisionEvent.globalSeq) },
        );
        return this.publicItem({
          ...item,
          blockedReason: 'review_non_convergence',
          stateVersion: item.stateVersion + 1,
        });
      }

      // §1.2: the loopback is a system effect — no claim-holder participation.
      await tx
        .update(workItems)
        .set({ reviewLoopIteration: item.reviewLoopIteration + 1 })
        .where(eq(workItems.id, item.id));
      const bumped = { ...item, reviewLoopIteration: item.reviewLoopIteration + 1 };
      return this.executeTransitionTx(
        tx,
        bumped,
        'in_progress',
        this.systemActorId,
        undefined,
        String(decisionEvent.globalSeq),
      );
    });
  }

  // -- dispatch (roadmap §2.3) -----------------------------------------------

  async getTaskContext(input: { workItemId: string }): Promise<{ workItem: WorkItem; entryState: WorkItemState }> {
    const item = await this.mustGetItem(input.workItemId);
    if (item.state === 'done') {
      throw new GuardFailedError('done items are never re-dispatched; follow-up review is a new work item');
    }
    const feature = await this.getFeatureRow(item.featureId);
    if (feature?.dispatchHold) {
      throw new GuardFailedError('feature is under a done_checkpoint dispatch hold');
    }
    return { workItem: this.publicItem(item), entryState: item.state as WorkItemState };
  }

  async releaseDispatchHold(input: { featureId: string; actorId: string }): Promise<Feature> {
    await this.requirePermission(input.actorId, 'dispatch.release_hold');
    const feature = await this.getFeatureRow(input.featureId);
    if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
    return this.db.transaction(async (tx) => {
      await tx.update(features).set({ dispatchHold: false }).where(eq(features.id, feature.id));
      await this.appendTx(tx, 'feature', feature.id, 'feature.dispatch_hold_released', input.actorId, {});
      return this.publicFeature({ ...feature, dispatchHold: false });
    });
  }

  // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------

  async reconcile(input: {
    files: Array<{ workItemId: string; frontmatterStatus: string }>;
  }): Promise<DivergenceReport[]> {
    const reports: DivergenceReport[] = [];
    for (const file of input.files) {
      const item = await this.mustGetItem(file.workItemId);
      // Files under a live claim are excluded — playbooks legitimately write
      // frontmatter mid-run (§1.6).
      if ((await this.liveClaim(item.id)) !== null) continue;

      const raw = file.frontmatterStatus.trim();
      const dbState = item.state as WorkItemState;
      if (raw === 'blocked') {
        // D8: overlay in the DB and `status: blocked` in the file are the
        // same truth. Blocked-in-file with NO overlay is real drift.
        if (item.blockedReason !== null) continue;
        reports.push({ workItemId: item.id, fileState: raw, dbState, kind: 'conflict' });
        continue;
      }

      const normalized = LEGACY_STATUS[raw];
      if (normalized === undefined) {
        reports.push({ workItemId: item.id, fileState: raw, dbState, kind: 'conflict' });
        continue;
      }
      if (normalized === dbState) continue;
      reports.push({
        workItemId: item.id,
        fileState: raw,
        dbState,
        kind: RANK[normalized] > RANK[dbState] ? 'file_ahead' : 'db_ahead',
      });
    }
    return reports;
  }

  // -- queries ---------------------------------------------------------------

  async getWorkItem(id: string): Promise<WorkItem> {
    return this.publicItem(await this.mustGetItem(id));
  }

  async getFeature(id: string): Promise<Feature> {
    const feature = await this.getFeatureRow(id);
    if (!feature) throw new GuardFailedError(`unknown feature: ${id}`);
    return this.publicFeature(feature);
  }

  async listWorkItems(filter?: {
    state?: WorkItemState;
    featureId?: string;
    claimable?: boolean;
  }): Promise<WorkItem[]> {
    const rows = await this.db.select().from(workItems).orderBy(asc(workItems.seq));
    const result: WorkItem[] = [];
    for (const row of rows) {
      if (filter?.state !== undefined && row.state !== filter.state) continue;
      if (filter?.featureId !== undefined && row.featureId !== filter.featureId) continue;
      if (filter?.claimable === true && (await this.liveClaim(row.id)) !== null) continue;
      result.push(this.publicItem(row));
    }
    return result;
  }

  async getClaims(workItemId: string): Promise<Claim[]> {
    const item = await this.mustGetItem(workItemId);
    const rows = await this.db
      .select()
      .from(claims)
      .where(eq(claims.workItemId, item.id))
      .orderBy(asc(claims.seq));
    return rows.map((row) => this.publicClaim(row));
  }

  async events(streamId?: string): Promise<SpineEvent[]> {
    const rows =
      streamId === undefined
        ? await this.db.select().from(events).orderBy(asc(events.globalSeq))
        : await this.db.select().from(events).where(eq(events.streamId, streamId)).orderBy(asc(events.globalSeq));
    return rows.map((row) => this.eventFromRow(row));
  }
}
