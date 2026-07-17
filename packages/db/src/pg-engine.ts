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
import { and, asc, eq, gt, lte, or, sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

import {
  AGENT_GATE_APPROVE_PERMISSIONS,
  AGENT_JOB_CLAIM_TTL_MS,
  AGENT_JOB_MAX_DEPTH,
  BLOCKED_REASONS,
  ConflictError,
  DEFAULT_PLAN,
  DEFAULT_PROJECT_SLUG,
  DELIVERY_ROLES,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  PERSONAS,
  PLAN_CEILINGS,
  REVIEW_LOOP_LIMIT,
  StoriesValidationError,
  WORK_ITEM_STATES,
  parseStories,
  type Actor,
  type ActorType,
  type AdvanceInput,
  type AgentJob,
  type AgentMemory,
  type AuthzExplanation,
  type BlockedReason,
  type Claim,
  type ClaimKind,
  type CreateWorkItemInput,
  type DivergenceReport,
  type Evidence,
  type Feature,
  type FeatureAdvanceInput,
  type FeatureGateDecisionInput,
  type FeatureState,
  type GateCode,
  type GateDecisionInput,
  type GatePolicy,
  type GovernanceRole,
  type MemoryKind,
  type Mention,
  type MentionResolution,
  type Message,
  type Notification,
  type Permission,
  type PlanCode,
  type Project,
  type ProjectKind,
  type RoleAssignment,
  type SpineEvent,
  type StoriesImportResult,
  type Thread,
  type ThreadKind,
  type ThreadVisibility,
  type WorkItem,
  type WorkItemKind,
  type WorkItemState,
  type WorkspacePolicy,
} from '@oahs/core';

import {
  actors,
  agentJobs,
  agentMemories,
  claims,
  evidence as evidenceTable,
  events,
  features,
  gateDecisions,
  gatePolicies,
  grants,
  idempotencyKeys,
  mentions,
  messages,
  notifications,
  projects,
  roleAssignments,
  threads,
  workItems,
  workspaceState,
} from './schema.js';

type Db = PgliteDatabase<Record<string, unknown>>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Both the root database and a transaction expose the same query surface. */
type Queryable = Db | Tx;

type WorkItemRow = typeof workItems.$inferSelect;
type ClaimRow = typeof claims.$inferSelect;
type FeatureRow = typeof features.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type EventRow = typeof events.$inferSelect;
type ActorRow = typeof actors.$inferSelect;
type WorkspaceStateRow = typeof workspaceState.$inferSelect;
type ThreadRow = typeof threads.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type AgentJobRow = typeof agentJobs.$inferSelect;
type AgentMemoryRow = typeof agentMemories.$inferSelect;

/** The single workspace_state row key (and the workspace event-stream id). */
const WORKSPACE_ID = 'workspace';

const RANK: Record<WorkItemState, number> = Object.fromEntries(
  WORK_ITEM_STATES.map((s, i) => [s, i]),
) as Record<WorkItemState, number>;

/** Mirror of the reference transition table (engine.ts) — do not diverge. */
interface TransitionRule {
  from: WorkItemState;
  to: WorkItemState;
  permission: Permission;
  claimRequired: boolean;
  guards: Array<'deps_done' | 'spec_gate_if_checkpoint' | 'nonempty_diff' | 'intent_unchanged'>;
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
    guards: ['deps_done', 'intent_unchanged'],
  },
  {
    from: 'in_progress',
    to: 'in_review',
    permission: 'task.advance',
    claimRequired: true,
    guards: ['nonempty_diff'],
  },
];

/** Mirror of the reference feature FSM (engine.ts §9) — do not diverge. */
type FeatureGuard = 'children_done' | 'tests_pinned';

interface FeatureTransitionRule {
  from: FeatureState;
  to: FeatureState;
  permission: Permission;
  guards: FeatureGuard[];
}

const FEATURE_TRANSITIONS: FeatureTransitionRule[] = [
  { from: 'backlog', to: 'spec', permission: 'feature.advance', guards: [] },
  { from: 'spec', to: 'design', permission: 'feature.advance', guards: [] },
  { from: 'breakdown', to: 'executing', permission: 'feature.advance', guards: [] },
  { from: 'executing', to: 'handoff', permission: 'feature.advance', guards: ['children_done'] },
];

function featureGateSpec(gate: GateCode): {
  permission: Permission;
  expected: FeatureState;
  to: FeatureState;
  back: FeatureState;
  guard?: FeatureGuard;
} {
  switch (gate) {
    case 'design_approval':
      return { permission: 'gate.design.approve', expected: 'design', to: 'breakdown', back: 'spec', guard: 'tests_pinned' };
    case 'handoff_approval':
      return { permission: 'gate.handoff.approve', expected: 'handoff', to: 'done', back: 'executing' };
    default:
      throw new GuardFailedError(`not a feature gate: ${gate}`);
  }
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

  private readonly wallClock: boolean;

  constructor(
    private readonly db: Db,
    options?: { wallClock?: boolean },
  ) {
    this.wallClock = options?.wallClock === true;
  }

  /** The ONLY read path for lease time — never used by any other guard (D-G). */
  private currentTime(): number {
    return this.wallClock ? Date.now() + this.now : this.now;
  }

  /**
   * Post-reset setup: the per-workspace system actor (roadmap §1.2).
   *
   * Idempotent for persistent databases (story 13, `oahs serve --data`): a
   * restart over an existing PGlite data directory finds the system actor
   * already present, reuses it, and recovers the id counter from the stored
   * ids so freshly-created entities never collide with persisted ones. A
   * fresh (or truncated) database takes the original path unchanged, so the
   * conformance suite semantics are untouched.
   */
  async init(): Promise<void> {
    // Single-row plan/policy projection (Phase 2, roadmap §3). onConflictDoNothing
    // keeps this idempotent for durable restarts — an existing plan survives.
    await this.db
      .insert(workspaceState)
      .values({ id: WORKSPACE_ID, plan: DEFAULT_PLAN, planVersion: 1, policy: {}, policyVersion: 1 })
      .onConflictDoNothing();
    const existing = await this.db
      .select({ id: actors.id })
      .from(actors)
      .where(eq(actors.type, 'system'))
      .limit(1);
    const found = existing[0];
    if (found !== undefined) {
      this.systemActorId = found.id;
      this.seq = await this.recoverSeq();
      await this.backfillProjects();
      return;
    }
    this.systemActorId = this.nextId('actor-system');
    await this.db.insert(actors).values({
      id: this.systemActorId,
      type: 'system',
      displayName: 'system',
    });
  }

  /**
   * Phase 7 Wave 2 upgrade path: features created before projects existed
   * carry project_id '' — attach them to the default project so every old
   * data dir keeps working with its exact prior meaning.
   */
  private async backfillProjects(): Promise<void> {
    const orphans = await this.db
      .select({ id: features.id })
      .from(features)
      .where(eq(features.projectId, ''));
    if (orphans.length === 0) return;
    const project = await this.defaultProjectRow(this.systemActorId);
    await this.db
      .update(features)
      .set({ projectId: project.id })
      .where(eq(features.projectId, ''));
  }

  /**
   * Largest nextId() suffix stored in any text-id table — restart-safe id
   * generation for persistent data directories. Ids are `${prefix}_${base36}`.
   */
  private async recoverSeq(): Promise<number> {
    const ids: string[] = [];
    ids.push(...(await this.db.select({ id: actors.id }).from(actors)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: projects.id }).from(projects)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: features.id }).from(features)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: workItems.id }).from(workItems)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: claims.id }).from(claims)).map((r) => r.id));
    // Phase 3 (roadmap §5): threads/messages/jobs/notifications are durable too.
    ids.push(...(await this.db.select({ id: threads.id }).from(threads)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: messages.id }).from(messages)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: agentJobs.id }).from(agentJobs)).map((r) => r.id));
    ids.push(...(await this.db.select({ id: notifications.id }).from(notifications)).map((r) => r.id));
    // Phase 5 (roadmap §6): memory ids (mem_*) are durable too.
    ids.push(...(await this.db.select({ id: agentMemories.id }).from(agentMemories)).map((r) => r.id));
    let max = 0;
    for (const id of ids) {
      const sep = id.lastIndexOf('_');
      if (sep < 0) continue;
      const n = Number.parseInt(id.slice(sep + 1), 36);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
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
    const occurredAt = Date.now(); // observational only — never a guard input
    const inserted = await tx
      .insert(events)
      .values({
        streamType,
        streamId,
        streamSeq,
        type,
        actorId,
        payload,
        occurredAt,
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
      occurredAt,
      ...(extra?.causationId !== undefined ? { causationId: extra.causationId } : {}),
    };
  }

  private async mustGetItem(workItemId: string): Promise<WorkItemRow> {
    const byId = await this.db.select().from(workItems).where(eq(workItems.id, workItemId)).limit(1);
    if (byId[0]) return byId[0];
    // Imported stories are addressed by their externalKey handle; first
    // writer wins WITHIN a project (conformance pin in stories-import.test.ts,
    // scoped per project since Wave 2). `<project-slug>:<key>` is exact; a
    // bare key resolves only while unique across the workspace.
    const colon = workItemId.indexOf(':');
    if (colon > 0) {
      const project = await this.getProjectRow(workItemId.slice(0, colon));
      if (project) {
        const key = workItemId.slice(colon + 1);
        const rows = await this.db
          .select({ item: workItems })
          .from(workItems)
          .innerJoin(features, eq(workItems.featureId, features.id))
          .where(and(eq(workItems.externalKey, key), eq(features.projectId, project.id)))
          .orderBy(asc(workItems.seq))
          .limit(1);
        if (rows[0]) return rows[0].item;
      }
      throw new GuardFailedError(`unknown work item: ${workItemId}`);
    }
    const byKey = await this.db
      .select({ item: workItems, projectId: features.projectId })
      .from(workItems)
      .innerJoin(features, eq(workItems.featureId, features.id))
      .where(eq(workItems.externalKey, workItemId))
      .orderBy(asc(workItems.seq));
    const projectIds = new Set(byKey.map((row) => row.projectId));
    if (projectIds.size > 1) {
      throw new GuardFailedError(
        `ambiguous work item handle "${workItemId}" (exists in ${projectIds.size} projects) — qualify as <project-slug>:${workItemId}`,
      );
    }
    if (byKey[0]) return byKey[0].item;
    throw new GuardFailedError(`unknown work item: ${workItemId}`);
  }

  private async getFeatureRow(featureId: string, tx: Queryable = this.db): Promise<FeatureRow | null> {
    const rows = await tx.select().from(features).where(eq(features.id, featureId)).limit(1);
    return rows[0] ?? null;
  }

  private async getActorRow(actorId: string, tx: Queryable = this.db): Promise<ActorRow | null> {
    const rows = await tx.select().from(actors).where(eq(actors.id, actorId)).limit(1);
    return rows[0] ?? null;
  }

  private async workspaceRow(tx: Queryable = this.db): Promise<WorkspaceStateRow> {
    const rows = await tx.select().from(workspaceState).where(eq(workspaceState.id, WORKSPACE_ID)).limit(1);
    const row = rows[0];
    if (row) return row;
    // init() seeds the row; this default only guards a not-yet-initialized read.
    return { id: WORKSPACE_ID, plan: DEFAULT_PLAN, planVersion: 1, policy: {}, policyVersion: 1 };
  }

  /**
   * Entitlement resolution — a PURE function over plan × governance ×
   * delivery-role data (roadmap §3), mirroring the reference engine. A grant
   * may EXIST (direct or via a role) and still not RESOLVE for an agent when
   * the plan ceiling or the restrict-only workspace policy narrows it. Users
   * are never plan-filtered.
   */
  private async grantSource(actorId: string, permission: Permission): Promise<string | null> {
    const direct = await this.db
      .select({ permission: grants.permission })
      .from(grants)
      .where(and(eq(grants.actorId, actorId), eq(grants.permission, permission)))
      .limit(1);
    if (direct.length > 0) return 'direct';
    const assignments = await this.db
      .select()
      .from(roleAssignments)
      .where(and(eq(roleAssignments.actorId, actorId), eq(roleAssignments.revoked, false)))
      .orderBy(asc(roleAssignments.seq));
    for (const assignment of assignments) {
      if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
        return `role:${assignment.roleCode}`;
      }
    }
    return null;
  }

  private agentCeilingAllows(
    actor: ActorRow | null,
    permission: Permission,
    workspace: WorkspaceStateRow,
  ): { plan: boolean; policy: boolean } {
    if (!actor || actor.type !== 'agent') return { plan: true, policy: true };
    const ceiling = PLAN_CEILINGS[workspace.plan as PlanCode];
    const policy = workspace.policy as WorkspacePolicy;
    if ((AGENT_GATE_APPROVE_PERMISSIONS as readonly string[]).includes(permission)) {
      return { plan: ceiling.agentGateApprove, policy: policy.agentGateApprovals !== false };
    }
    if (permission === 'gate.review.reject') {
      return { plan: ceiling.agentGateReject, policy: true };
    }
    if (permission === 'task.claim') {
      return { plan: true, policy: policy.agentSelfDispatch !== false };
    }
    return { plan: true, policy: true };
  }

  private async hasPermission(actorId: string, permission: Permission): Promise<boolean> {
    if ((await this.grantSource(actorId, permission)) === null) return false;
    const allows = this.agentCeilingAllows(await this.getActorRow(actorId), permission, await this.workspaceRow());
    return allows.plan && allows.policy;
  }

  private async requirePermission(actorId: string, permission: Permission): Promise<void> {
    if (!(await this.hasPermission(actorId, permission))) {
      throw new PermissionDeniedError(permission, actorId);
    }
  }

  private async requireGovernanceAdmin(byActorId: string): Promise<void> {
    if (byActorId === this.systemActorId) return;
    const actor = await this.getActorRow(byActorId);
    if (actor?.governanceRole === 'admin') return;
    throw new PermissionDeniedError('governance.admin', byActorId);
  }

  /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
  private async checkGrantCeiling(actorId: string, permission: Permission): Promise<void> {
    const actor = await this.getActorRow(actorId);
    if (!actor || actor.type !== 'agent') return;
    const workspace = await this.workspaceRow();
    const ceiling = PLAN_CEILINGS[workspace.plan as PlanCode];
    if ((AGENT_GATE_APPROVE_PERMISSIONS as readonly string[]).includes(permission) && !ceiling.agentGateApprove) {
      throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
    }
    if (permission === 'gate.review.reject' && !ceiling.agentGateReject) {
      throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
    }
  }

  /** All live claims on an item — work and review (§9.4). */
  private async liveClaimsOf(workItemId: string): Promise<ClaimRow[]> {
    return this.db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.workItemId, workItemId),
          eq(claims.released, false),
          gt(claims.leaseExpiresAt, this.currentTime()),
        ),
      )
      .orderBy(asc(claims.seq));
  }

  /** The live claim of a given kind (default 'work') — one per (item, kind) by constraint. */
  private async liveClaim(workItemId: string, kind: ClaimKind = 'work'): Promise<ClaimRow | null> {
    const rows = await this.liveClaimsOf(workItemId);
    return rows.find((c) => c.kind === kind) ?? null;
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
    const live = await this.liveClaimsOf(item.id);
    if (!live.some((c) => c.fencingToken === fencingToken)) {
      await this.db.transaction(async (tx) => {
        await this.appendTx(tx, 'work_item', item.id, 'fencing.rejected', actorId, {
          presentedToken: fencingToken,
          liveToken: live[0]?.fencingToken ?? null,
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
      kind: row.kind as WorkItemKind,
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
      projectId: row.projectId,
      name: row.name,
      state: row.state as Feature['state'],
      dispatchHold: row.dispatchHold,
    };
  }

  private publicProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      kind: row.kind as ProjectKind,
      repoPath: row.repoPath,
      defaultSpecFolder: row.defaultSpecFolder,
      gitUrl: row.gitUrl ?? null,
      baseBranch: row.baseBranch ?? null,
      forgeOwner: row.forgeOwner ?? null,
      forgeRepo: row.forgeRepo ?? null,
      state: row.state as Project['state'],
    };
  }

  /** Resolve a project by id OR slug (mirrors the reference engine). */
  private async getProjectRow(handle: string, tx: Queryable = this.db): Promise<ProjectRow | null> {
    const byId = await tx.select().from(projects).where(eq(projects.id, handle)).limit(1);
    if (byId[0]) return byId[0];
    const bySlug = await tx.select().from(projects).where(eq(projects.slug, handle)).limit(1);
    return bySlug[0] ?? null;
  }

  private async mustGetProjectRow(handle: string, tx: Queryable = this.db): Promise<ProjectRow> {
    const row = await this.getProjectRow(handle, tx);
    if (!row) throw new GuardFailedError(`unknown project: ${handle}`);
    return row;
  }

  private publicClaim(row: ClaimRow): Claim {
    return {
      id: row.id,
      workItemId: row.workItemId,
      actorId: row.actorId,
      kind: (row.kind as ClaimKind | null) ?? 'work',
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
      occurredAt: Number(row.occurredAt), // pre-Phase-7 rows default to 0
      ...(row.causationId !== null ? { causationId: row.causationId } : {}),
    };
  }

  // -- setup -----------------------------------------------------------------

  async createActor(input: {
    type: Exclude<ActorType, 'system'>;
    displayName: string;
    governanceRole?: GovernanceRole;
    personaCode?: string;
  }): Promise<Actor> {
    const actor: Actor = {
      id: this.nextId('actor'),
      type: input.type,
      displayName: input.displayName,
      personaCode: input.personaCode ?? null,
    };
    await this.db.insert(actors).values({
      id: actor.id,
      type: actor.type,
      displayName: actor.displayName,
      governanceRole: input.governanceRole ?? 'member',
      personaCode: actor.personaCode,
    });
    return actor;
  }

  private publicActor(row: ActorRow): Actor {
    return {
      id: row.id,
      type: row.type as ActorType,
      displayName: row.displayName,
      personaCode: row.personaCode ?? null,
    };
  }

  /** All actors, personas and system included (transparency for pickers/audit). */
  async listActors(): Promise<Actor[]> {
    const rows = await this.db.select().from(actors).orderBy(asc(actors.id));
    return rows.map((row) => this.publicActor(row));
  }

  /**
   * Idempotently create the six BMAD persona agent actors with floor-state
   * roles (Phase 4, roadmap §3). Gated write. Idempotency is DURABLE: the
   * lookup keys on the persisted persona_code column, so a restart over an
   * existing data directory re-provisions nothing.
   */
  async provisionPersonas(input: { byActorId: string }): Promise<Actor[]> {
    await this.requireGovernanceAdmin(input.byActorId);
    const provisioned: Actor[] = [];
    for (const persona of PERSONAS) {
      const existing = await this.db
        .select()
        .from(actors)
        .where(eq(actors.personaCode, persona.personaCode))
        .orderBy(asc(actors.id))
        .limit(1);
      let actor: Actor;
      if (existing[0]) {
        actor = this.publicActor(existing[0]);
      } else {
        actor = await this.createActor({
          type: 'agent',
          displayName: persona.displayName,
          personaCode: persona.personaCode,
        });
        await this.db.transaction(async (tx) => {
          await this.appendTx(tx, 'actor', actor.id, 'actor.provisioned', input.byActorId, {
            personaCode: persona.personaCode,
          });
        });
      }
      // Floor-state role (thesis): assignRole is idempotent.
      await this.assignRole({ actorId: actor.id, roleCode: persona.defaultRole, byActorId: input.byActorId });
      provisioned.push({ ...actor });
    }
    return provisioned;
  }

  /** Audit a credential op (roadmap §8): port of the memory engine's noteTokenEvent. */
  async noteTokenEvent(input: {
    actorId: string;
    kind: 'issued' | 'reissued';
    tokenHashPrefix: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.appendTx(tx, 'actor', input.actorId, `token.${input.kind}`, this.systemActorId, {
        tokenHashPrefix: input.tokenHashPrefix,
      });
    });
  }

  async grant(input: { actorId: string; permission: Permission; scope?: string }): Promise<void> {
    // Grant-time plan ceiling precedes any effect (Phase 2 pin): a refused
    // grant inserts nothing and appends nothing.
    await this.checkGrantCeiling(input.actorId, input.permission);
    await this.db.transaction(async (tx) => {
      await tx
        .insert(grants)
        .values({ actorId: input.actorId, permission: input.permission, scope: input.scope ?? null })
        .onConflictDoNothing();
      await this.appendTx(tx, 'actor', input.actorId, 'grant.issued', this.systemActorId, {
        permission: input.permission,
      });
    });
  }

  async revoke(input: { actorId: string; permission: Permission; scope?: string }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(grants)
        .where(and(eq(grants.actorId, input.actorId), eq(grants.permission, input.permission)));
      await this.appendTx(tx, 'actor', input.actorId, 'grant.revoked', this.systemActorId, {
        permission: input.permission,
      });
    });
  }

  // -- entitlements (Phase 2, roadmap §3) ----------------------------------------

  async setGovernanceRole(input: { actorId: string; role: GovernanceRole; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    if ((await this.getActorRow(input.actorId)) === null) {
      throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    }
    await this.db.transaction(async (tx) => {
      await tx.update(actors).set({ governanceRole: input.role }).where(eq(actors.id, input.actorId));
      await this.appendTx(tx, 'actor', input.actorId, 'governance.changed', input.byActorId, { role: input.role });
    });
  }

  async getGovernanceRole(actorId: string): Promise<GovernanceRole> {
    const actor = await this.getActorRow(actorId);
    return (actor?.governanceRole as GovernanceRole | undefined) ?? 'member';
  }

  async assignRole(input: { actorId: string; roleCode: string; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    const bundle = DELIVERY_ROLES[input.roleCode];
    if (bundle === undefined) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
    if ((await this.getActorRow(input.actorId)) === null) {
      throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    }
    for (const permission of bundle) {
      await this.checkGrantCeiling(input.actorId, permission);
    }
    const active = await this.db
      .select({ seq: roleAssignments.seq })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.actorId, input.actorId),
          eq(roleAssignments.roleCode, input.roleCode),
          eq(roleAssignments.revoked, false),
        ),
      )
      .limit(1);
    if (active.length > 0) return; // idempotent
    await this.db.transaction(async (tx) => {
      await tx.insert(roleAssignments).values({
        actorId: input.actorId,
        roleCode: input.roleCode,
        grantedBy: input.byActorId,
        revoked: false,
      });
      await this.appendTx(tx, 'actor', input.actorId, 'role.assigned', input.byActorId, {
        roleCode: input.roleCode,
      });
    });
  }

  async revokeRole(input: { actorId: string; roleCode: string; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    if (DELIVERY_ROLES[input.roleCode] === undefined) {
      throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(roleAssignments)
        .set({ revoked: true })
        .where(
          and(
            eq(roleAssignments.actorId, input.actorId),
            eq(roleAssignments.roleCode, input.roleCode),
            eq(roleAssignments.revoked, false),
          ),
        );
      await this.appendTx(tx, 'actor', input.actorId, 'role.revoked', input.byActorId, {
        roleCode: input.roleCode,
      });
    });
  }

  async listRoleAssignments(actorId?: string): Promise<RoleAssignment[]> {
    const rows =
      actorId === undefined
        ? await this.db.select().from(roleAssignments).orderBy(asc(roleAssignments.seq))
        : await this.db
            .select()
            .from(roleAssignments)
            .where(eq(roleAssignments.actorId, actorId))
            .orderBy(asc(roleAssignments.seq));
    return rows.map((row) => ({
      actorId: row.actorId,
      roleCode: row.roleCode,
      grantedBy: row.grantedBy,
      revoked: row.revoked,
    }));
  }

  async setPlan(input: { plan: PlanCode; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    if (PLAN_CEILINGS[input.plan] === undefined) throw new GuardFailedError(`unknown plan: ${input.plan}`);
    const workspace = await this.workspaceRow();
    const planVersion = workspace.planVersion + 1;
    await this.db.transaction(async (tx) => {
      await tx
        .update(workspaceState)
        .set({ plan: input.plan, planVersion })
        .where(eq(workspaceState.id, WORKSPACE_ID));
      await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'plan.changed', input.byActorId, {
        plan: input.plan,
        planVersion,
      });
    });
  }

  async getPlan(): Promise<PlanCode> {
    return (await this.workspaceRow()).plan as PlanCode;
  }

  async setWorkspacePolicy(input: { policy: WorkspacePolicy; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    const workspace = await this.workspaceRow();
    const merged: WorkspacePolicy = { ...(workspace.policy as WorkspacePolicy), ...input.policy };
    const policyVersion = workspace.policyVersion + 1;
    await this.db.transaction(async (tx) => {
      await tx
        .update(workspaceState)
        .set({ policy: merged as Record<string, unknown>, policyVersion })
        .where(eq(workspaceState.id, WORKSPACE_ID));
      await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'policy.changed', input.byActorId, {
        policy: { ...merged },
        policyVersion,
      });
    });
  }

  async getWorkspacePolicy(): Promise<WorkspacePolicy> {
    return { ...((await this.workspaceRow()).policy as WorkspacePolicy) };
  }

  async setGatePolicy(input: { gate: GateCode; policy: GatePolicy; byActorId: string }): Promise<void> {
    await this.requireGovernanceAdmin(input.byActorId);
    const minApprovals = input.policy.minApprovals ?? 1;
    if (!Number.isInteger(minApprovals) || minApprovals < 1) {
      throw new GuardFailedError('minApprovals must be a positive integer');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .insert(gatePolicies)
        .values({ gate: input.gate, policy: { ...input.policy } as Record<string, unknown> })
        .onConflictDoUpdate({
          target: gatePolicies.gate,
          set: { policy: { ...input.policy } as Record<string, unknown> },
        });
      await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'gate_policy.changed', input.byActorId, {
        gate: input.gate,
        policy: { ...input.policy },
      });
    });
  }

  async getGatePolicy(gate: GateCode): Promise<GatePolicy> {
    const rows = await this.db.select().from(gatePolicies).where(eq(gatePolicies.gate, gate)).limit(1);
    return { ...((rows[0]?.policy as GatePolicy | undefined) ?? {}) };
  }

  async authzExplain(input: { actorId: string; permission: Permission }): Promise<AuthzExplanation> {
    const source = await this.grantSource(input.actorId, input.permission);
    const actor = await this.getActorRow(input.actorId);
    const workspace = await this.workspaceRow();
    const allows = this.agentCeilingAllows(actor, input.permission, workspace);
    return {
      actorId: input.actorId,
      permission: input.permission,
      allowed: source !== null && allows.plan && allows.policy,
      source,
      governanceRole: (actor?.governanceRole as GovernanceRole | undefined) ?? 'member',
      plan: workspace.plan as PlanCode,
      planAllows: allows.plan,
      policyAllows: allows.policy,
      versions: { plan: workspace.planVersion, policy: workspace.policyVersion },
    };
  }

  // -- projects (Phase 7 Wave 2, D-E) -----------------------------------------

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createProject(input: {
    actorId: string;
    name: string;
    slug?: string;
    kind?: ProjectKind;
    repoPath?: string;
    defaultSpecFolder?: string;
    gitUrl?: string;
    baseBranch?: string;
    forgeOwner?: string;
    forgeRepo?: string;
  }): Promise<Project> {
    const slug = input.slug ?? PgEngine.slugify(input.name);
    if (slug === '') throw new GuardFailedError('project slug must not be empty');
    const id = this.nextId('proj');
    return this.db.transaction(async (tx) => {
      const taken = await tx.select().from(projects).where(eq(projects.slug, slug)).limit(1);
      if (taken[0]) throw new GuardFailedError(`project slug already taken: ${slug}`);
      const row = {
        id,
        name: input.name,
        slug,
        kind: input.kind ?? 'mixed',
        repoPath: input.repoPath ?? null,
        defaultSpecFolder: input.defaultSpecFolder ?? null,
        gitUrl: input.gitUrl ?? null,
        baseBranch: input.baseBranch ?? null,
        forgeOwner: input.forgeOwner ?? null,
        forgeRepo: input.forgeRepo ?? null,
        state: 'active',
      };
      await tx.insert(projects).values(row);
      await this.appendTx(tx, 'project', id, 'project.created', input.actorId, {
        name: input.name,
        slug,
        kind: row.kind,
      });
      return this.publicProject({ ...row, seq: 0 } as ProjectRow);
    });
  }

  async getProject(input: { projectId: string }): Promise<Project> {
    return this.publicProject(await this.mustGetProjectRow(input.projectId));
  }

  async listProjects(input?: { includeArchived?: boolean }): Promise<Project[]> {
    const rows = await this.db.select().from(projects).orderBy(asc(projects.seq));
    return rows
      .filter((row) => input?.includeArchived === true || row.state === 'active')
      .map((row) => this.publicProject(row));
  }

  async updateProject(input: {
    actorId: string;
    projectId: string;
    name?: string;
    kind?: ProjectKind;
    repoPath?: string;
    defaultSpecFolder?: string;
    gitUrl?: string;
    baseBranch?: string;
    forgeOwner?: string;
    forgeRepo?: string;
  }): Promise<Project> {
    const row = await this.mustGetProjectRow(input.projectId);
    return this.db.transaction(async (tx) => {
      const patch: Partial<ProjectRow> = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
        ...(input.defaultSpecFolder !== undefined
          ? { defaultSpecFolder: input.defaultSpecFolder }
          : {}),
        ...(input.gitUrl !== undefined ? { gitUrl: input.gitUrl } : {}),
        ...(input.baseBranch !== undefined ? { baseBranch: input.baseBranch } : {}),
        ...(input.forgeOwner !== undefined ? { forgeOwner: input.forgeOwner } : {}),
        ...(input.forgeRepo !== undefined ? { forgeRepo: input.forgeRepo } : {}),
      };
      if (Object.keys(patch).length > 0) {
        await tx.update(projects).set(patch).where(eq(projects.id, row.id));
      }
      await this.appendTx(tx, 'project', row.id, 'project.updated', input.actorId, { ...patch });
      return this.publicProject({ ...row, ...patch });
    });
  }

  async archiveProject(input: { actorId: string; projectId: string }): Promise<Project> {
    const row = await this.mustGetProjectRow(input.projectId);
    return this.db.transaction(async (tx) => {
      await tx.update(projects).set({ state: 'archived' }).where(eq(projects.id, row.id));
      await this.appendTx(tx, 'project', row.id, 'project.archived', input.actorId, {});
      return this.publicProject({ ...row, state: 'archived' });
    });
  }

  /** The compatibility floor: bare createFeature attaches here (lazy). */
  private async defaultProjectRow(actorId: string): Promise<ProjectRow> {
    const existing = await this.getProjectRow(DEFAULT_PROJECT_SLUG);
    if (existing) return existing;
    const created = await this.createProject({
      actorId,
      name: 'Default project',
      slug: DEFAULT_PROJECT_SLUG,
    });
    return this.mustGetProjectRow(created.id);
  }

  async createFeature(input: {
    actorId: string;
    projectId?: string;
    name?: string;
  }): Promise<Feature> {
    const project =
      input.projectId !== undefined
        ? await this.mustGetProjectRow(input.projectId)
        : await this.defaultProjectRow(input.actorId);
    if (project.state === 'archived') {
      throw new GuardFailedError(`project is archived: ${project.slug}`);
    }
    const id = this.nextId('feat');
    const name = input.name ?? null;
    return this.db.transaction(async (tx) => {
      await tx
        .insert(features)
        .values({ id, projectId: project.id, name, state: 'backlog', dispatchHold: false });
      await this.appendTx(tx, 'feature', id, 'feature.created', input.actorId, {
        projectId: project.id,
        ...(name !== null ? { name } : {}),
      });
      return { id, projectId: project.id, name, state: 'backlog' as const, dispatchHold: false };
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
      kind: input.kind ?? 'code',
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
      kind: row.kind,
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
    return this.claimOfKind({ ...input, kind: 'work', permission: 'task.claim' });
  }

  /** §9.4: mirror of the reference engine — review claim, kind='review'. */
  async claimReview(input: { workItemId: string; actorId: string; ttlMs?: number }): Promise<Claim> {
    const item = await this.mustGetItem(input.workItemId);
    if (
      !(await this.hasPermission(input.actorId, 'gate.review.approve')) &&
      !(await this.hasPermission(input.actorId, 'gate.review.reject'))
    ) {
      throw new PermissionDeniedError('gate.review.approve', input.actorId);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review claim applies to in_review items, not ${item.state}`);
    }
    return this.claimOfKind({ ...input, kind: 'review' });
  }

  private async claimOfKind(input: {
    workItemId: string;
    actorId: string;
    ttlMs?: number;
    kind: ClaimKind;
    permission?: Permission;
  }): Promise<Claim> {
    const item = await this.mustGetItem(input.workItemId);
    if (input.permission !== undefined) await this.requirePermission(input.actorId, input.permission);
    const ttlMs = input.ttlMs ?? 15 * 60 * 1000;
    const claimId = this.nextId('claim');
    try {
      return await this.db.transaction(async (tx) => {
        // Sweep: an EXPIRED lease of THIS kind returns the slot to the pool —
        // flip its released flag so the per-(item,kind) index only guards live
        // claims. Kind-scoped so claiming one kind never touches an expired
        // claim of the other kind (parity with the reference engine, §9.4).
        await tx
          .update(claims)
          .set({ released: true })
          .where(
            and(
              eq(claims.workItemId, item.id),
              eq(claims.kind, input.kind),
              eq(claims.released, false),
              lte(claims.leaseExpiresAt, this.currentTime()),
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
        // The partial unique index (work_item_id, kind) decides the race:
        // a live claim of this kind makes this INSERT fail — loser leaves no row.
        await tx.insert(claims).values({
          id: claimId,
          workItemId: item.id,
          actorId: input.actorId,
          kind: input.kind,
          fencingToken: token,
          leaseExpiresAt: this.currentTime() + ttlMs,
          released: false,
          ttlMs,
        });
        await this.appendTx(tx, 'work_item', item.id, 'work_item.claimed', input.actorId, {
          claimId,
          fencingToken: token,
          kind: input.kind,
        });
        return {
          id: claimId,
          workItemId: item.id,
          actorId: input.actorId,
          kind: input.kind,
          fencingToken: token,
          leaseExpiresAt: this.currentTime() + ttlMs,
          released: false,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(`work item ${item.id} already has a live ${input.kind} claim`);
      }
      throw error;
    }
  }

  /**
   * Port of the memory engine's authorizeClaimMutation (roadmap §8): a claim
   * mutation is allowed for the HOLDER or a valid fencing-token bearer; anyone
   * else is rejected with a `fencing.rejected` audit event (its own tx) + 409.
   */
  private async authorizeClaimMutation(
    claim: { id: string; workItemId: string; actorId: string; fencingToken: number },
    actorId: string,
    fencingToken: number | undefined,
  ): Promise<void> {
    if (actorId === claim.actorId) return;
    if (fencingToken !== undefined && fencingToken === claim.fencingToken) return;
    await this.db.transaction(async (tx) => {
      await this.appendTx(tx, 'work_item', claim.workItemId, 'fencing.rejected', actorId, {
        presentedToken: fencingToken ?? null,
        liveToken: claim.fencingToken,
      });
    });
    throw new ConflictError(`not the holder and no valid fencing token for claim ${claim.id}`);
  }

  async heartbeat(input: { claimId: string; actorId: string; fencingToken?: number }): Promise<void> {
    const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
    if (!row || row.released || row.leaseExpiresAt <= this.currentTime()) {
      throw new ConflictError(`claim ${input.claimId} is not live`);
    }
    await this.authorizeClaimMutation(row, input.actorId, input.fencingToken);
    // Heartbeat renews the FULL original TTL from the heartbeat moment.
    await this.db
      .update(claims)
      .set({ leaseExpiresAt: this.currentTime() + row.ttlMs })
      .where(eq(claims.id, row.id));
  }

  async releaseClaim(input: { claimId: string; actorId: string; fencingToken?: number; reason?: string }): Promise<void> {
    const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
    if (!row || row.released) return;
    await this.authorizeClaimMutation(row, input.actorId, input.fencingToken);
    await this.db.transaction(async (tx) => {
      await tx.update(claims).set({ released: true }).where(eq(claims.id, row.id));
      await this.appendTx(tx, 'work_item', row.workItemId, 'claim.released', row.actorId, {
        claimId: row.id,
        reason: input.reason ?? null,
      });
    });
  }

  /**
   * Privileged ops recovery (roadmap §8) — port of the memory engine's
   * forceReleaseClaim: gated on `ops.force_release_claim`, event authored by the
   * acting actor and naming the evicted holder. Releasing the live claim frees a
   * new fencing token, so the evicted holder's token is rejected on next mutation.
   */
  async forceReleaseClaim(input: { workItemId: string; actorId: string }): Promise<{ released: string[] }> {
    const item = await this.mustGetItem(input.workItemId);
    await this.requirePermission(input.actorId, 'ops.force_release_claim');
    const released = await this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(claims)
        .where(and(eq(claims.workItemId, item.id), eq(claims.released, false)));
      const ids: string[] = [];
      for (const row of rows) {
        await tx.update(claims).set({ released: true }).where(eq(claims.id, row.id));
        await this.appendTx(tx, 'work_item', item.id, 'claim.force_released', input.actorId, {
          claimId: row.id,
          workItemId: item.id,
          holderActorId: row.actorId,
        });
        ids.push(row.id);
      }
      return ids;
    });
    if (released.length === 0) {
      throw new GuardFailedError(`no live claim on work item ${item.id}`);
    }
    return { released };
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
        // Phase 4 (roadmap §1.4): kind selects WHICH machine evidence applies.
        if (item.kind !== 'code') {
          // Doc kinds: the latest doc_lint (if any) must be schema-valid;
          // git_diff is never consulted for non-code deliverables.
          const lints = await this.db
            .select()
            .from(evidenceTable)
            .where(and(eq(evidenceTable.workItemId, item.id), eq(evidenceTable.kind, 'doc_lint')))
            .orderBy(asc(evidenceTable.seq));
          const latestLint = lints[lints.length - 1];
          if (latestLint && latestLint.payload['schemaValid'] !== true) {
            throw new GuardFailedError('the latest doc_lint evidence failed — document is not schema-valid');
          }
          return;
        }
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
      case 'intent_unchanged': {
        // §9.3: mirror of engine.ts. A pinned hash + a DIFFERENT presented one
        // = the frozen region drifted after approval. Absence is not drift.
        if (item.intentHash === null) return;
        const presented = await this.latestIntentHash(item.id);
        if (presented !== undefined && presented !== item.intentHash) {
          throw new GuardFailedError('intent_changed');
        }
        return;
      }
    }
  }

  /** The latest submitted intent_hash evidence for an item (undefined if none). */
  private async latestIntentHash(workItemId: string): Promise<string | undefined> {
    const rows = await this.db
      .select()
      .from(evidenceTable)
      .where(and(eq(evidenceTable.workItemId, workItemId), eq(evidenceTable.kind, 'intent_hash')))
      .orderBy(asc(evidenceTable.seq));
    const latest = rows[rows.length - 1];
    const hash = latest?.payload['hash'];
    return typeof hash === 'string' ? hash : undefined;
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
        // §9: the projector jumps straight to `executing` (was `in_progress`),
        // SKIPPING the gated stages — the degenerate/back-compat path.
        await tx.update(features).set({ state: 'executing' }).where(eq(features.id, feature.id));
        await this.appendTx(
          tx,
          'feature',
          feature.id,
          'feature.state_changed',
          this.systemActorId,
          { from: 'backlog', to: 'executing' },
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

    // §9.4: entering in_review auto-dispatches ONE review job per round when the
    // review_approval gate policy names a reviewer. The partial unique index
    // (work_item_id, review_round) is the idempotency — ON CONFLICT DO NOTHING
    // makes a second entry into in_review in the same round a no-op.
    if (to === 'in_review') {
      // Read the policy via `tx` — never this.db inside a this.db.transaction
      // (single-connection PGlite deadlocks).
      const policyRows = await tx
        .select({ policy: gatePolicies.policy })
        .from(gatePolicies)
        .where(eq(gatePolicies.gate, 'review_approval'))
        .limit(1);
      const reviewerId = (policyRows[0]?.policy as GatePolicy | undefined)?.autoDispatchReviewer;
      if (reviewerId !== undefined) {
        const round = item.reviewLoopIteration;
        // Mirror the memory engine EXACTLY: pre-check existence BEFORE consuming
        // a nextId, so the no-op path (same-round re-entry) advances no id
        // counter — otherwise the two engines' ids drift for identical input.
        // The partial unique index stays the real guard against a concurrent race.
        const already = await tx
          .select({ id: agentJobs.id })
          .from(agentJobs)
          .where(and(eq(agentJobs.workItemId, item.id), eq(agentJobs.reviewRound, round)))
          .limit(1);
        if (already.length === 0) {
          const jobId = this.nextId('job');
          const inserted = await tx
            .insert(agentJobs)
            .values({
              id: jobId,
              agentActorId: reviewerId,
              threadId: null,
              messageId: null,
              workItemId: item.id,
              featureId: item.featureId,
              status: 'queued',
              depth: 0,
              reviewRound: round,
              note: null,
            })
            .onConflictDoNothing()
            .returning({ id: agentJobs.id });
          if (inserted.length > 0) {
            await this.appendTx(
              tx,
              'agent_job',
              jobId,
              'agent_job.created',
              this.systemActorId,
              { agentActorId: reviewerId, workItemId: item.id, reviewRound: round },
              { causationId: String(event.globalSeq) },
            );
          }
        }
      }
    }

    // Rails → chat: narrate the transition into bound task threads (§5.2).
    // Mirror of the reference: EVERY executeTransition narrates (gate-fired,
    // loopback included); privilegedDowngrade does NOT go through here and
    // therefore does not narrate — exactly like the reference engine.
    await this.narrateWorkItemTx(tx, item.id, `state: ${from} → ${to}`);

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
      const quorumMet = await this.quorumWouldBeMet(item, 'spec_approval', input.actorId);
      // §9.3: read the submitted frozen-region hash BEFORE the tx opens
      // (single-connection PGlite). Pinned only when the gate actually fires.
      const submittedHash = quorumMet ? await this.latestIntentHash(item.id) : undefined;
      return this.db.transaction(async (tx) => {
        let pinned = item.pinnedVerification;
        if (input.pinnedVerification !== undefined) {
          pinned = [...input.pinnedVerification];
          await tx.update(workItems).set({ pinnedVerification: pinned }).where(eq(workItems.id, item.id));
        }
        let intentHash = item.intentHash;
        if (submittedHash !== undefined) {
          intentHash = submittedHash;
          await tx.update(workItems).set({ intentHash }).where(eq(workItems.id, item.id));
        }
        const pinnedItem = { ...item, pinnedVerification: pinned, intentHash };
        await this.recordApprovalTx(tx, pinnedItem, 'spec_approval', input.actorId);
        if (!quorumMet) {
          // Decision recorded; quorum pending (gate policy is data, roadmap §3).
          return this.publicItem(pinnedItem);
        }
        // The approval fires the gated forward transition (conformance pin).
        return this.executeTransitionTx(tx, pinnedItem, 'ready_for_dev', input.actorId);
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
    const quorumMet = await this.quorumWouldBeMet(item, 'review_approval', input.actorId);
    // Evidence is checked exactly when the quorum would complete, so a failed
    // approval records nothing (Phase 1 pin: denied attempts mutate nothing).
    if (quorumMet) await this.checkReviewEvidence(item);
    return this.db.transaction(async (tx) => {
      await this.recordApprovalTx(tx, item, 'review_approval', input.actorId);
      if (!quorumMet) {
        return this.publicItem(item); // quorum pending — no transition yet
      }
      return this.executeTransitionTx(tx, item, 'done', input.actorId);
    });
  }

  /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
  private async roundApprovers(item: WorkItemRow, gate: GateCode): Promise<ActorRow[]> {
    const rows = await this.db
      .select({ actorId: gateDecisions.actorId })
      .from(gateDecisions)
      .where(
        and(
          eq(gateDecisions.workItemId, item.id),
          eq(gateDecisions.gate, gate),
          eq(gateDecisions.decision, 'approved'),
          eq(gateDecisions.round, item.reviewLoopIteration),
        ),
      )
      .orderBy(asc(gateDecisions.seq));
    const ids = [...new Set(rows.map((row) => row.actorId))];
    const result: ActorRow[] = [];
    for (const id of ids) {
      const actor = await this.getActorRow(id);
      if (actor) result.push(actor);
    }
    return result;
  }

  /** Gate policy quorum (roadmap §3): min distinct approvers + required actor types, as DATA. */
  private async quorumWouldBeMet(item: WorkItemRow, gate: GateCode, nextApproverId: string): Promise<boolean> {
    const policy = await this.getGatePolicy(gate);
    const min = policy.minApprovals ?? 1;
    const required = policy.requiredActorTypes ?? [];
    const approvers = await this.roundApprovers(item, gate);
    const nextActor = await this.getActorRow(nextApproverId);
    if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
    if (approvers.length < min) return false;
    for (const type of required) {
      if (!approvers.some((a) => a.type === type)) return false;
    }
    return true;
  }

  private async recordApprovalTx(tx: Queryable, item: WorkItemRow, gate: GateCode, actorId: string): Promise<void> {
    await tx.insert(gateDecisions).values({
      workItemId: item.id,
      gate,
      decision: 'approved',
      actorId,
      round: item.reviewLoopIteration,
    });
    await this.appendTx(tx, 'work_item', item.id, 'gate.approved', actorId, {
      gate,
      round: item.reviewLoopIteration,
      ...(gate === 'spec_approval' ? { pinnedVerification: item.pinnedVerification } : {}),
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
    if (item.kind === 'code') {
      // Non-code deliverables carry no commit requirement (roadmap §1.4):
      // their completion rests on machine-checkable doc evidence plus the
      // permitted actor's decision.
      //
      // The LATEST commit decides, not any historical one (§10.3) — rows are
      // seq-ordered above. Evidence is append-only and an item can be dispatched
      // more than once, so `some()` would let a reachable commit from an EARLIER
      // run certify a later run whose push was refused. Mirrors the memory engine.
      const commits = rows.filter((row) => row.kind === 'commit');
      const latestCommit = commits[commits.length - 1];
      if (latestCommit?.payload['reachableOnRemote'] !== true) {
        throw new GuardFailedError(
          'final revision must be reachable on the remote (push is part of the HALT contract)',
        );
      }
    }
    // §9.6: gate-policy data can additionally require a MERGED PR (mirror of the
    // reference engine). checkReviewEvidence runs BEFORE the transaction, so the
    // policy read on this.db is safe.
    if ((await this.getGatePolicy('review_approval')).requireMergedPr === true) {
      const prEvidence = rows.filter((row) => row.kind === 'pr');
      const latestPr = prEvidence[prEvidence.length - 1];
      if (!latestPr || latestPr.payload['action'] !== 'merged_into_default') {
        throw new GuardFailedError(
          'review_approval requires a PR merged into the default branch (gate policy requireMergedPr)',
        );
      }
    }
  }

  async rejectGate(input: GateDecisionInput): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);
    if (input.gate !== 'review_approval') {
      throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
    }
    // Phase 2 (additive): rejection authority = gate.review.approve OR
    // gate.review.reject — the Phase 2 exit criterion's reviewer-agent holds
    // only the latter. Every Phase 1 pin on rejectGate keeps holding.
    if (
      !(await this.hasPermission(input.actorId, 'gate.review.approve')) &&
      !(await this.hasPermission(input.actorId, 'gate.review.reject'))
    ) {
      throw new PermissionDeniedError('gate.review.reject', input.actorId);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
    }
    return this.db.transaction(async (tx) => {
      await tx.insert(gateDecisions).values({
        workItemId: item.id,
        gate: 'review_approval',
        decision: 'rejected',
        actorId: input.actorId,
        round: item.reviewLoopIteration,
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

  // -- feature FSM (Phase 9, roadmap §9) — mirror of engine.ts, do not diverge ---

  private async mustGetFeatureRow(featureId: string): Promise<FeatureRow> {
    const feature = await this.getFeatureRow(featureId);
    if (!feature) throw new GuardFailedError(`unknown feature: ${featureId}`);
    return feature;
  }

  private async checkFeatureGuard(guard: FeatureGuard, feature: FeatureRow): Promise<void> {
    switch (guard) {
      case 'children_done': {
        const notDone = await this.db
          .select({ id: workItems.id })
          .from(workItems)
          .where(and(eq(workItems.featureId, feature.id), sql`${workItems.state} <> 'done'`));
        if (notDone.length > 0) {
          throw new GuardFailedError(`feature has ${String(notDone.length)} work item(s) not done`);
        }
        return;
      }
      case 'tests_pinned': {
        // "In TDD" checkpoint (D7): at least one story of the feature carries a
        // non-empty pinnedVerification (the test-first pass authored the tests).
        const rows = await this.db
          .select({ pinned: workItems.pinnedVerification })
          .from(workItems)
          .where(eq(workItems.featureId, feature.id));
        const anyPinned = rows.some((r) => (r.pinned?.length ?? 0) > 0);
        if (!anyPinned) {
          throw new GuardFailedError('In-TDD checkpoint: no pinned verification commands authored for this feature');
        }
        return;
      }
    }
  }

  /** Mutate + append feature.state_changed inside a tx. */
  private async executeFeatureTransitionTx(
    tx: Tx,
    feature: FeatureRow,
    to: FeatureState,
    actorId: string,
    causationId?: string,
  ): Promise<Feature> {
    const from = feature.state;
    await tx.update(features).set({ state: to }).where(eq(features.id, feature.id));
    await this.appendTx(
      tx,
      'feature',
      feature.id,
      'feature.state_changed',
      actorId,
      { from, to },
      causationId !== undefined ? { causationId } : undefined,
    );
    return this.publicFeature({ ...feature, state: to });
  }

  async featureAdvance(input: FeatureAdvanceInput): Promise<Feature> {
    const feature = await this.mustGetFeatureRow(input.featureId);
    const rule = FEATURE_TRANSITIONS.find((t) => t.from === feature.state && t.to === input.to);
    if (!rule) throw new InvalidTransitionError(feature.state as FeatureState, input.to);
    await this.requirePermission(input.actorId, rule.permission);
    for (const guard of rule.guards) await this.checkFeatureGuard(guard, feature);
    return this.db.transaction(async (tx) =>
      this.executeFeatureTransitionTx(tx, feature, input.to, input.actorId),
    );
  }

  /** rejections so far for this feature+gate — the current quorum round. */
  private async currentFeatureRound(featureId: string, gate: GateCode): Promise<number> {
    const rows = await this.db
      .select({ seq: gateDecisions.seq })
      .from(gateDecisions)
      .where(
        and(
          eq(gateDecisions.featureId, featureId),
          eq(gateDecisions.gate, gate),
          eq(gateDecisions.decision, 'rejected'),
        ),
      );
    return rows.length;
  }

  private async featureQuorumWouldBeMet(
    feature: FeatureRow,
    gate: GateCode,
    nextApproverId: string,
  ): Promise<boolean> {
    const round = await this.currentFeatureRound(feature.id, gate);
    const rows = await this.db
      .select({ actorId: gateDecisions.actorId })
      .from(gateDecisions)
      .where(
        and(
          eq(gateDecisions.featureId, feature.id),
          eq(gateDecisions.gate, gate),
          eq(gateDecisions.decision, 'approved'),
          eq(gateDecisions.round, round),
        ),
      );
    const ids = [...new Set(rows.map((r) => r.actorId))];
    const approvers: ActorRow[] = [];
    for (const id of ids) {
      const actor = await this.getActorRow(id);
      if (actor) approvers.push(actor);
    }
    const nextActor = await this.getActorRow(nextApproverId);
    if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
    const policy = await this.getGatePolicy(gate);
    const min = policy.minApprovals ?? 1;
    const required = policy.requiredActorTypes ?? [];
    if (approvers.length < min) return false;
    for (const type of required) {
      if (!approvers.some((a) => a.type === type)) return false;
    }
    return true;
  }

  /** round is precomputed OUTSIDE the tx — PGlite is single-connection, so no
   *  this.db read may happen while a this.db.transaction is open. */
  private async recordFeatureApprovalTx(
    tx: Queryable,
    feature: FeatureRow,
    gate: GateCode,
    actorId: string,
    round: number,
  ): Promise<void> {
    await tx.insert(gateDecisions).values({
      workItemId: null,
      featureId: feature.id,
      gate,
      decision: 'approved',
      actorId,
      round,
    });
    await this.appendTx(tx, 'feature', feature.id, 'gate.approved', actorId, {
      gate,
      round,
      featureId: feature.id,
    });
  }

  async approveFeatureGate(input: FeatureGateDecisionInput): Promise<Feature> {
    const feature = await this.mustGetFeatureRow(input.featureId);
    const { permission, expected, to, guard } = featureGateSpec(input.gate);
    await this.requirePermission(input.actorId, permission);
    if (feature.state !== expected) {
      throw new GuardFailedError(`${input.gate} applies to ${expected} features, not ${feature.state}`);
    }
    // All reads happen BEFORE opening the transaction (single-connection PGlite).
    const round = await this.currentFeatureRound(feature.id, input.gate);
    const quorumMet = await this.featureQuorumWouldBeMet(feature, input.gate, input.actorId);
    // Entry guard checked exactly when the quorum would complete (a
    // non-completing approval records nothing extra).
    if (quorumMet && guard !== undefined) await this.checkFeatureGuard(guard, feature);
    return this.db.transaction(async (tx) => {
      await this.recordFeatureApprovalTx(tx, feature, input.gate, input.actorId, round);
      if (!quorumMet) return this.publicFeature(feature); // decision recorded; quorum pending
      return this.executeFeatureTransitionTx(tx, feature, to, input.actorId);
    });
  }

  async rejectFeatureGate(input: FeatureGateDecisionInput): Promise<Feature> {
    const feature = await this.mustGetFeatureRow(input.featureId);
    const { permission, expected, back } = featureGateSpec(input.gate);
    await this.requirePermission(input.actorId, permission);
    if (feature.state !== expected) {
      throw new GuardFailedError(`${input.gate} rejection applies to ${expected} features, not ${feature.state}`);
    }
    const round = await this.currentFeatureRound(feature.id, input.gate);
    return this.db.transaction(async (tx) => {
      await tx.insert(gateDecisions).values({
        workItemId: null,
        featureId: feature.id,
        gate: input.gate,
        decision: 'rejected',
        actorId: input.actorId,
        round,
      });
      const decisionEvent = await this.appendTx(tx, 'feature', feature.id, 'gate.rejected', input.actorId, {
        gate: input.gate,
        featureId: feature.id,
      });
      return this.executeFeatureTransitionTx(
        tx,
        feature,
        back,
        this.systemActorId,
        String(decisionEvent.globalSeq),
      );
    });
  }

  async cancelFeature(input: { featureId: string; actorId: string; reason?: string }): Promise<Feature> {
    const feature = await this.mustGetFeatureRow(input.featureId);
    await this.requirePermission(input.actorId, 'feature.cancel');
    if (feature.state === 'done' || feature.state === 'cancelled') {
      throw new GuardFailedError(`cannot cancel a terminal feature (${feature.state})`);
    }
    const from = feature.state;
    return this.db.transaction(async (tx) => {
      await tx.update(features).set({ state: 'cancelled' }).where(eq(features.id, feature.id));
      await this.appendTx(tx, 'feature', feature.id, 'feature.cancelled', input.actorId, {
        from,
        to: 'cancelled',
        compensating: true,
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
      });
      return this.publicFeature({ ...feature, state: 'cancelled' });
    });
  }

  // -- intent hash (Phase 9.3, roadmap §1.1/§9) ---------------------------------

  async rebaselineIntent(input: { workItemId: string; hash: string; actorId: string }): Promise<WorkItem> {
    const item = await this.mustGetItem(input.workItemId);
    await this.requirePermission(input.actorId, 'intent.edit');
    const from = item.intentHash;
    return this.db.transaction(async (tx) => {
      await tx.update(workItems).set({ intentHash: input.hash }).where(eq(workItems.id, item.id));
      await this.appendTx(tx, 'work_item', item.id, 'intent.rebaselined', input.actorId, {
        from: from ?? null,
        to: input.hash,
      });
      return this.publicItem({ ...item, intentHash: input.hash });
    });
  }

  // -- collaboration (Phase 3, roadmap §5) ---------------------------------------

  private async mustGetThread(threadId: string, tx: Queryable = this.db): Promise<ThreadRow> {
    const rows = await tx.select().from(threads).where(eq(threads.id, threadId)).limit(1);
    const row = rows[0];
    if (!row) throw new GuardFailedError(`unknown thread: ${threadId}`);
    return row;
  }

  private isParticipant(thread: ThreadRow, actorId: string): boolean {
    return thread.createdBy === actorId || thread.participants.includes(actorId);
  }

  private publicThread(row: Omit<ThreadRow, 'seq'>): Thread {
    return {
      id: row.id,
      featureId: row.featureId,
      workItemId: row.workItemId,
      kind: row.kind as ThreadKind,
      visibility: row.visibility as ThreadVisibility,
      createdBy: row.createdBy,
      participants: [...row.participants],
    };
  }

  private publicMessage(row: MessageRow): Message {
    return {
      id: row.id,
      threadId: row.threadId,
      seq: row.seq,
      authorId: row.authorId,
      kind: row.kind as Message['kind'],
      body: row.body,
      replyTo: row.replyTo,
    };
  }

  private publicJob(row: Omit<AgentJobRow, 'seq'>): AgentJob {
    // §9.5: an in_progress job past its lease reads back as `queued` (lazy free).
    const rawStatus = row.status as AgentJob['status'];
    const status: AgentJob['status'] =
      rawStatus === 'in_progress' &&
      row.claimExpiresAt !== null &&
      row.claimExpiresAt <= this.currentTime()
        ? 'queued'
        : rawStatus;
    return {
      id: row.id,
      agentActorId: row.agentActorId,
      threadId: row.threadId,
      messageId: row.messageId,
      workItemId: row.workItemId,
      featureId: row.featureId,
      status,
      depth: row.depth,
      reviewRound: row.reviewRound ?? null,
      claimedBy: row.claimedBy ?? null,
      claimExpiresAt: row.claimExpiresAt ?? null,
      stateVersion: row.stateVersion ?? 0,
      note: row.note,
    };
  }

  async createThread(input: {
    actorId: string;
    kind: ThreadKind;
    featureId?: string;
    workItemId?: string;
    visibility?: ThreadVisibility;
  }): Promise<Thread> {
    if (input.featureId !== undefined && (await this.getFeatureRow(input.featureId)) === null) {
      throw new GuardFailedError(`unknown feature: ${input.featureId}`);
    }
    let workItemId: string | null = null;
    if (input.workItemId !== undefined) {
      workItemId = (await this.mustGetItem(input.workItemId)).id;
    }
    const thread = {
      id: this.nextId('th'),
      featureId: input.featureId ?? null,
      workItemId,
      kind: input.kind,
      visibility: input.visibility ?? (input.kind === 'private' ? 'private' : 'open'),
      createdBy: input.actorId,
      participants: [input.actorId],
    };
    return this.db.transaction(async (tx) => {
      await tx.insert(threads).values(thread);
      await this.appendTx(tx, 'thread', thread.id, 'thread.created', input.actorId, {
        kind: thread.kind,
        featureId: thread.featureId,
        workItemId: thread.workItemId,
        visibility: thread.visibility,
      });
      return this.publicThread(thread);
    });
  }

  async addThreadParticipant(input: { threadId: string; actorId: string; byActorId: string }): Promise<Thread> {
    const thread = await this.mustGetThread(input.threadId);
    if (!this.isParticipant(thread, input.byActorId)) {
      throw new PermissionDeniedError('thread.invite', input.byActorId);
    }
    if ((await this.getActorRow(input.actorId)) === null) {
      throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    }
    if (thread.participants.includes(input.actorId)) return this.publicThread(thread);
    const participants = [...thread.participants, input.actorId];
    return this.db.transaction(async (tx) => {
      await tx.update(threads).set({ participants }).where(eq(threads.id, thread.id));
      await this.appendTx(tx, 'thread', thread.id, 'thread.participant_added', input.byActorId, {
        actorId: input.actorId,
      });
      return this.publicThread({ ...thread, participants });
    });
  }

  /** Internal append that never runs the router — used for chat, narration alike. */
  private async appendMessageTx(
    tx: Queryable,
    thread: ThreadRow | Omit<ThreadRow, 'seq'>,
    authorId: string,
    kind: Message['kind'],
    body: string,
    replyTo: string | null,
  ): Promise<Message> {
    // Per-thread, 1-based, gap-free — UNIQUE(thread_id, seq) enforces it, the
    // same-transaction max() computes it (mirrors the reference count+1).
    const [row] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${messages.seq}), 0)` })
      .from(messages)
      .where(eq(messages.threadId, thread.id));
    const seq = Number(row?.maxSeq ?? 0) + 1;
    const message: Message = {
      id: this.nextId('msg'),
      threadId: thread.id,
      seq,
      authorId,
      kind,
      body,
      replyTo,
    };
    await tx.insert(messages).values(message);
    await this.appendTx(tx, 'thread', thread.id, 'message.posted', authorId, {
      messageId: message.id,
      kind,
    });
    return { ...message };
  }

  /**
   * §5.2: the server NEVER parses body text — `mentions` is structured actor
   * ids. §5.4: the router is pure code, default-deny, policy-gated,
   * depth-capped; a job is reply-only context, never a claim.
   */
  async postMessage(input: {
    threadId: string;
    actorId: string;
    body: string;
    replyTo?: string;
    mentions?: string[];
  }): Promise<Message> {
    const thread = await this.mustGetThread(input.threadId);
    if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
      throw new PermissionDeniedError('thread.post', input.actorId);
    }
    const mentionIds = [...new Set(input.mentions ?? [])];
    return this.db.transaction(async (tx) => {
      const message = await this.appendMessageTx(tx, thread, input.actorId, 'chat', input.body, input.replyTo ?? null);
      for (const mentionedId of mentionIds) {
        const mentioned = await this.getActorRow(mentionedId, tx);
        if (!mentioned) throw new GuardFailedError(`unknown mentioned actor: ${mentionedId}`);
        const resolution = await this.routeMentionTx(tx, thread, message, input.actorId, mentioned);
        await tx.insert(mentions).values({
          messageId: message.id,
          mentionedActorId: mentionedId,
          resolution,
        });
        await this.appendTx(tx, 'thread', thread.id, 'mention.recorded', input.actorId, {
          messageId: message.id,
          mentionedActorId: mentionedId,
          resolution,
        });
      }
      return message;
    });
  }

  /** The deterministic mention router (§5.4). Returns the recorded resolution. */
  private async routeMentionTx(
    tx: Tx,
    thread: ThreadRow,
    message: Message,
    mentionerId: string,
    mentioned: ActorRow,
  ): Promise<MentionResolution> {
    if (mentioned.type !== 'agent') {
      await this.pushNotificationTx(tx, mentioned.id, 'mention', message.id);
      return 'notified';
    }
    const policy = (await this.workspaceRow(tx)).policy as WorkspacePolicy;
    // kill-switch applies to every job-materializing path
    if (policy.mentionDispatch === false) return 'denied_policy';

    const mentioner = await this.getActorRow(mentionerId, tx);
    let depth = 0;
    if (mentioner?.type === 'agent') {
      // agent-mention-agent: explicit policy + depth cap (§5.4)
      if (policy.agentMentionAgent !== true) return 'denied_policy';
      const mentionerJobs = await tx
        .select({ depth: agentJobs.depth })
        .from(agentJobs)
        .where(eq(agentJobs.agentActorId, mentionerId));
      depth = Math.max(0, ...mentionerJobs.map((j) => j.depth)) + 1;
      if (depth > AGENT_JOB_MAX_DEPTH) return 'denied_depth';
    } else {
      // default-deny: the human mentioner must hold invoke authority —
      // at least one active delivery role, or governance admin.
      const hasRole =
        (
          await tx
            .select({ seq: roleAssignments.seq })
            .from(roleAssignments)
            .where(and(eq(roleAssignments.actorId, mentionerId), eq(roleAssignments.revoked, false)))
            .limit(1)
        ).length > 0;
      const isAdmin = mentioner?.governanceRole === 'admin' || mentionerId === this.systemActorId;
      if (!hasRole && !isAdmin) return 'denied_policy';
    }

    const job = {
      id: this.nextId('job'),
      agentActorId: mentioned.id,
      threadId: thread.id,
      messageId: message.id,
      workItemId: thread.workItemId,
      featureId: thread.featureId,
      status: 'queued' as const,
      depth,
      note: null,
    };
    await tx.insert(agentJobs).values(job);
    await this.appendTx(tx, 'agent_job', job.id, 'agent_job.created', mentionerId, {
      agentActorId: mentioned.id,
      threadId: thread.id,
      messageId: message.id,
      depth,
    });
    await this.pushNotificationTx(tx, mentioned.id, 'mention', message.id);
    return 'job_created';
  }

  private async pushNotificationTx(
    tx: Queryable,
    actorId: string,
    source: Notification['source'],
    refId: string,
  ): Promise<void> {
    await tx.insert(notifications).values({
      id: this.nextId('ntf'),
      actorId,
      source,
      refId,
      read: false,
    });
  }

  async listThreads(filter?: { featureId?: string; workItemId?: string; actorId?: string }): Promise<Thread[]> {
    const rows = await this.db.select().from(threads).orderBy(asc(threads.seq));
    // Lazily resolved like the reference: an unknown workItemId only throws
    // when at least one thread is examined (mustGetItem inside the filter).
    let resolvedWorkItemId: string | undefined;
    if (filter?.workItemId !== undefined && rows.length > 0) {
      resolvedWorkItemId = (await this.mustGetItem(filter.workItemId)).id;
    }
    const result: Thread[] = [];
    for (const row of rows) {
      if (filter?.featureId !== undefined && row.featureId !== filter.featureId) continue;
      if (resolvedWorkItemId !== undefined && row.workItemId !== resolvedWorkItemId) continue;
      if (
        filter?.actorId !== undefined &&
        row.visibility === 'private' &&
        !this.isParticipant(row, filter.actorId)
      ) {
        continue;
      }
      result.push(this.publicThread(row));
    }
    return result;
  }

  async listMessages(input: { threadId: string; actorId: string; sinceSeq?: number }): Promise<Message[]> {
    const thread = await this.mustGetThread(input.threadId);
    if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
      throw new PermissionDeniedError('thread.read', input.actorId);
    }
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.threadId, thread.id))
      .orderBy(asc(messages.seq));
    return rows
      .filter((m) => input.sinceSeq === undefined || m.seq > input.sinceSeq)
      .map((m) => this.publicMessage(m));
  }

  async listMentions(messageId: string): Promise<Mention[]> {
    const rows = await this.db
      .select()
      .from(mentions)
      .where(eq(mentions.messageId, messageId))
      .orderBy(asc(mentions.seq));
    return rows.map((row) => ({
      messageId: row.messageId,
      mentionedActorId: row.mentionedActorId,
      resolution: row.resolution as MentionResolution,
    }));
  }

  async listNotifications(input: { actorId: string; unreadOnly?: boolean }): Promise<Notification[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.actorId, input.actorId))
      .orderBy(asc(notifications.seq));
    return rows
      .filter((n) => input.unreadOnly !== true || !n.read)
      .map((n) => ({ id: n.id, actorId: n.actorId, source: n.source as Notification['source'], refId: n.refId, read: n.read }));
  }

  async markNotificationRead(input: { notificationId: string; actorId: string }): Promise<void> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, input.notificationId))
      .limit(1);
    const notification = rows[0];
    if (!notification) throw new GuardFailedError(`unknown notification: ${input.notificationId}`);
    if (notification.actorId !== input.actorId) {
      throw new PermissionDeniedError('thread.read', input.actorId);
    }
    await this.db.update(notifications).set({ read: true }).where(eq(notifications.id, notification.id));
  }

  async listAgentJobs(filter?: { agentActorId?: string; status?: AgentJob['status'] }): Promise<AgentJob[]> {
    const rows = await this.db.select().from(agentJobs).orderBy(asc(agentJobs.seq));
    return rows
      .map((j) => this.publicJob(j)) // effective status (lazy free) applied here
      .filter(
        (j) =>
          (filter?.agentActorId === undefined || j.agentActorId === filter.agentActorId) &&
          (filter?.status === undefined || j.status === filter.status),
      );
  }

  async claimAgentJob(input: { jobId: string; actorId: string; ttlMs?: number }): Promise<AgentJob> {
    const rows = await this.db.select().from(agentJobs).where(eq(agentJobs.id, input.jobId)).limit(1);
    const job = rows[0];
    if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
    if (job.agentActorId !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    const claimExpiresAt = this.currentTime() + (input.ttlMs ?? AGENT_JOB_CLAIM_TTL_MS);
    return this.db.transaction(async (tx) => {
      // CAS: claim only if queued OR in_progress-with-lapsed-lease. The row-count
      // IS the race guard — two loops claim, one updates 1 row, the loser 0.
      const updated = await tx
        .update(agentJobs)
        .set({
          status: 'in_progress',
          claimedBy: input.actorId,
          claimExpiresAt,
          stateVersion: job.stateVersion + 1,
        })
        .where(
          and(
            eq(agentJobs.id, job.id),
            or(
              eq(agentJobs.status, 'queued'),
              and(eq(agentJobs.status, 'in_progress'), lte(agentJobs.claimExpiresAt, this.currentTime())),
            ),
          ),
        )
        .returning({ id: agentJobs.id });
      if (updated.length === 0) {
        throw new ConflictError(`agent job ${job.id} is already claimed (${job.status})`);
      }
      await this.appendTx(tx, 'agent_job', job.id, 'agent_job.claimed', input.actorId, { claimExpiresAt });
      return this.publicJob({
        ...job,
        status: 'in_progress',
        claimedBy: input.actorId,
        claimExpiresAt,
        stateVersion: job.stateVersion + 1,
      });
    });
  }

  async completeAgentJob(input: {
    jobId: string;
    actorId: string;
    status: 'done' | 'blocked';
    note?: string;
  }): Promise<AgentJob> {
    const rows = await this.db.select().from(agentJobs).where(eq(agentJobs.id, input.jobId)).limit(1);
    const job = rows[0];
    if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
    if (job.agentActorId !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    if (job.status === 'done' || job.status === 'blocked') {
      throw new GuardFailedError(`agent job ${job.id} is already ${job.status}`);
    }
    // §9.5: once claimed, only the CLAIMER may complete.
    if (job.claimedBy !== null && job.claimedBy !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    const note = input.note ?? null;
    return this.db.transaction(async (tx) => {
      await tx
        .update(agentJobs)
        .set({ status: input.status, note, stateVersion: job.stateVersion + 1 })
        .where(eq(agentJobs.id, job.id));
      await this.appendTx(tx, 'agent_job', job.id, 'agent_job.completed', input.actorId, {
        status: input.status,
        note,
      });
      // notify the mentioner — the reverse direction is a message + notification,
      // nothing more (§5.4). A review job (§9.4) has no triggering message.
      const trigger =
        job.messageId !== null
          ? (
              await tx
                .select({ authorId: messages.authorId })
                .from(messages)
                .where(eq(messages.id, job.messageId))
                .limit(1)
            )[0]
          : undefined;
      if (trigger) await this.pushNotificationTx(tx, trigger.authorId, 'job_completed', job.id);
      return this.publicJob({ ...job, status: input.status, note, stateVersion: job.stateVersion + 1 });
    });
  }

  // -- agent memory (Phase 5, roadmap §6) ----------------------------------------

  async appendAgentMemory(input: {
    actorId: string;
    kind: MemoryKind;
    content: string;
    sourceThreadId?: string;
    projectId?: string;
  }): Promise<AgentMemory> {
    const actor = await this.getActorRow(input.actorId);
    if (!actor) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    if (actor.type !== 'agent') {
      throw new GuardFailedError('memory belongs to agent actors (roadmap §6)');
    }
    let sourceThreadId: string | null = null;
    let sourceVisibility: AgentMemory['sourceVisibility'] = null;
    if (input.sourceThreadId !== undefined) {
      const thread = await this.mustGetThread(input.sourceThreadId);
      // Learning from a private context requires having been in it.
      if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
        throw new PermissionDeniedError('thread.read', input.actorId);
      }
      sourceThreadId = thread.id;
      sourceVisibility = thread.visibility as AgentMemory['sourceVisibility'];
    }
    // D-H: a project-scoped lesson stays in its project; null = global craft.
    const projectId =
      input.projectId !== undefined ? (await this.mustGetProjectRow(input.projectId)).id : null;
    const id = this.nextId('mem');
    return this.db.transaction(async (tx) => {
      // Per-agent seq computed IN the transaction; UNIQUE(agent_actor_id, seq)
      // makes a concurrent duplicate lose by constraint.
      const [row] = await tx
        .select({ maxSeq: sql<number>`coalesce(max(${agentMemories.seq}), 0)` })
        .from(agentMemories)
        .where(eq(agentMemories.agentActorId, input.actorId));
      const seq = Number(row?.maxSeq ?? 0) + 1;
      await tx.insert(agentMemories).values({
        id,
        agentActorId: input.actorId,
        kind: input.kind,
        content: input.content,
        sourceThreadId,
        sourceVisibility,
        projectId,
        seq,
      });
      // Content NEVER enters the shared event log — private learning must not
      // leak into the audit stream (roadmap §6 pin).
      await this.appendTx(tx, 'actor', input.actorId, 'memory.appended', input.actorId, {
        memoryId: id,
        kind: input.kind,
        sourceThreadId,
      });
      return {
        id,
        agentActorId: input.actorId,
        kind: input.kind,
        content: input.content,
        sourceThreadId,
        sourceVisibility,
        projectId,
        seq,
      };
    });
  }

  async searchAgentMemory(input: {
    actorId: string;
    contextThreadId?: string;
    kind?: MemoryKind;
    query?: string;
    projectId?: string;
  }): Promise<AgentMemory[]> {
    // Owner-scoped by construction: there is no cross-actor parameter.
    const projectId =
      input.projectId !== undefined ? (await this.mustGetProjectRow(input.projectId)).id : undefined;
    const rows = await this.db
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.agentActorId, input.actorId))
      .orderBy(asc(agentMemories.seq));
    return rows
      .filter((m) => {
        if (input.kind !== undefined && m.kind !== input.kind) return false;
        if (input.query !== undefined && !m.content.toLowerCase().includes(input.query.toLowerCase())) return false;
        // D-H: scoped recall = that project + global; a sibling never leaks in.
        if (projectId !== undefined && m.projectId !== null && m.projectId !== projectId) return false;
        // §6: nothing learned in a private thread surfaces outside its
        // source thread.
        if (m.sourceVisibility === 'private' && m.sourceThreadId !== input.contextThreadId) return false;
        return true;
      })
      .map((m) => this.publicMemory(m));
  }

  private publicMemory(row: AgentMemoryRow): AgentMemory {
    return {
      id: row.id,
      agentActorId: row.agentActorId,
      kind: row.kind as MemoryKind,
      content: row.content,
      sourceThreadId: row.sourceThreadId,
      sourceVisibility: row.sourceVisibility as AgentMemory['sourceVisibility'],
      projectId: row.projectId,
      seq: row.seq,
    };
  }

  /** Rails → chat narration (§5.2): state changes narrate into bound task threads. */
  private async narrateWorkItemTx(tx: Tx, workItemId: string, body: string): Promise<void> {
    const bound = await tx
      .select()
      .from(threads)
      .where(eq(threads.workItemId, workItemId))
      .orderBy(asc(threads.seq));
    for (const thread of bound) {
      await this.appendMessageTx(tx, thread, this.systemActorId, 'system', body, null);
    }
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

  async listFeatures(filter?: { projectId?: string }): Promise<Feature[]> {
    const projectId =
      filter?.projectId !== undefined ? (await this.mustGetProjectRow(filter.projectId)).id : undefined;
    const rows = await this.db
      .select()
      .from(features)
      .where(projectId !== undefined ? eq(features.projectId, projectId) : undefined)
      .orderBy(asc(features.seq));
    return rows.map((row) => this.publicFeature(row));
  }

  async listWorkItems(filter?: {
    state?: WorkItemState;
    featureId?: string;
    projectId?: string;
    claimable?: boolean;
  }): Promise<WorkItem[]> {
    const projectFeatureIds =
      filter?.projectId !== undefined
        ? new Set(
            (
              await this.db
                .select({ id: features.id })
                .from(features)
                .where(
                  eq(features.projectId, (await this.mustGetProjectRow(filter.projectId)).id),
                )
            ).map((row) => row.id),
          )
        : undefined;
    const rows = await this.db.select().from(workItems).orderBy(asc(workItems.seq));
    const result: WorkItem[] = [];
    for (const row of rows) {
      if (filter?.state !== undefined && row.state !== filter.state) continue;
      if (filter?.featureId !== undefined && row.featureId !== filter.featureId) continue;
      if (projectFeatureIds !== undefined && !projectFeatureIds.has(row.featureId)) continue;
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

  async listEvidence(workItemId: string): Promise<Evidence[]> {
    const item = await this.mustGetItem(workItemId);
    const rows = await this.db
      .select()
      .from(evidenceTable)
      .where(eq(evidenceTable.workItemId, item.id))
      .orderBy(asc(evidenceTable.seq));
    return rows.map((row) => ({
      kind: row.kind as Evidence['kind'],
      payload: row.payload as Record<string, unknown>,
    }));
  }

  async listClaims(input?: { includeReleased?: boolean }): Promise<Claim[]> {
    const rows =
      input?.includeReleased === true
        ? await this.db.select().from(claims).orderBy(asc(claims.seq))
        : await this.db
            .select()
            .from(claims)
            .where(eq(claims.released, false))
            .orderBy(asc(claims.seq));
    return rows.map((row) => ({
      ...this.publicClaim(row),
      expired: !row.released && row.leaseExpiresAt <= this.currentTime(),
    }));
  }

  async events(streamId?: string): Promise<SpineEvent[]> {
    const rows =
      streamId === undefined
        ? await this.db.select().from(events).orderBy(asc(events.globalSeq))
        : await this.db.select().from(events).where(eq(events.streamId, streamId)).orderBy(asc(events.globalSeq));
    return rows.map((row) => this.eventFromRow(row));
  }

  /** Per-event visibility (roadmap §8) — port of the memory engine's isEventVisibleTo. */
  async isEventVisibleTo(event: SpineEvent, actorId: string): Promise<boolean> {
    if (event.streamType !== 'thread') return true;
    const role = await this.getGovernanceRole(actorId);
    if (role === 'admin' || role === 'auditor' || actorId === this.systemActorId) return true;
    const thread = (await this.db.select().from(threads).where(eq(threads.id, event.streamId)).limit(1))[0];
    if (!thread || thread.visibility !== 'private') return true;
    return this.isParticipant(thread, actorId);
  }

  /** Bulk visibility filter (roadmap §8): fetch private threads once, filter in memory. */
  async eventsVisibleTo(actorId: string, streamId?: string): Promise<SpineEvent[]> {
    const all = await this.events(streamId);
    const role = await this.getGovernanceRole(actorId);
    if (role === 'admin' || role === 'auditor' || actorId === this.systemActorId) return all;
    const priv = await this.db.select().from(threads).where(eq(threads.visibility, 'private'));
    const hidden = new Set(priv.filter((t) => !this.isParticipant(t, actorId)).map((t) => t.id));
    return all.filter((event) => !(event.streamType === 'thread' && hidden.has(event.streamId)));
  }
}
