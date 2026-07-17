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
  type Actor,
  type ActorType,
  type AdvanceInput,
  type FeatureAdvanceInput,
  type FeatureGateDecisionInput,
  type FeatureState,
  type AgentJob,
  type AuthzExplanation,
  type BlockedReason,
  type AgentMemory,
  type MemoryKind,
  type Mention,
  type Message,
  type Notification,
  type Thread,
  type ThreadKind,
  type ThreadVisibility,
  type Claim,
  type ClaimKind,
  type CreateWorkItemInput,
  type DivergenceReport,
  type Evidence,
  type Feature,
  type GateCode,
  type GateDecisionInput,
  type GatePolicy,
  type GovernanceRole,
  type Permission,
  type PlanCode,
  type Project,
  type ProjectKind,
  type RoleAssignment,
  type SpineEngine,
  type SpineEvent,
  type StoriesImportResult,
  type WorkItem,
  type WorkItemKind,
  type WorkItemState,
  type WorkspacePolicy,
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

/**
 * The feature (epic) transition table (roadmap §9). Only the NON-gated hops
 * live here — like the work-item table, the gate-fired arrows (design→breakdown
 * via design_approval, handoff→done via handoff_approval, and both loopbacks)
 * are fired directly by approveFeatureGate/rejectFeatureGate, not by advance.
 * `cancelled` (from any non-terminal state) is fired by cancelFeature.
 */
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

/**
 * The two feature GATE codes and their fixed effects. `to` is the forward
 * (approve) target; `back` is the one-step loopback on rejection; `guard`, if
 * present, is the entry guard checked when the quorum completes.
 */
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

interface WorkItemRow extends WorkItem {
  dependsOn: string[];
}

interface ClaimRow extends Claim {
  ttlMs: number;
}

interface GateDecisionRow {
  /** exactly one of workItemId / featureId is set (work-item gate vs feature gate). */
  workItemId: string | null;
  featureId: string | null;
  gate: GateCode;
  decision: 'approved' | 'rejected';
  actorId: string;
  /**
   * The round the decision belongs to. For work items = reviewLoopIteration at
   * decision time. For features = the count of prior rejections for that
   * feature+gate (a rejection resets the quorum by advancing the round).
   */
  round: number;
}

interface RoleAssignmentRow extends RoleAssignment {}

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
  /**
   * Lease clock offset. Logical mode (default): the clock IS this counter
   * (starts at 0, advanceClock adds — fully deterministic). Wall mode (D-G,
   * `wallClock: true`): currentTime() = Date.now() + offset, so leases expire
   * in real time and advanceClock still works for tests.
   */
  private now = 0;
  private readonly wallClock: boolean;
  private seq = 0;
  private globalSeq = 0;

  private readonly actors = new Map<string, Actor>();
  private readonly grants = new Map<string, Set<string>>(); // actorId -> "permission". Unscoped: the API rejects a scope rather than store one it would not honour (bus.ts rejectUnenforcedScope).
  private readonly projects = new Map<string, Project>();
  private readonly projectSlugIndex = new Map<string, string>(); // slug -> projectId
  private readonly features = new Map<string, Feature>();
  private readonly workItems = new Map<string, WorkItemRow>();
  // projectId -> (externalKey -> workItemId). First writer wins WITHIN a
  // project; across projects a bare handle is ambiguous by design (Wave 2).
  private readonly externalKeyIndex = new Map<string, Map<string, string>>();
  private readonly claims = new Map<string, ClaimRow>();
  private readonly claimsByItem = new Map<string, string[]>(); // workItemId -> claimIds
  private readonly fencingCounter = new Map<string, number>(); // workItemId -> last token
  private readonly gateDecisions: GateDecisionRow[] = [];
  private readonly evidenceRows: EvidenceRow[] = [];
  private readonly eventLog: SpineEvent[] = [];
  private readonly streamSeqs = new Map<string, number>();
  private readonly idempotencyCache = new Map<string, WorkItem>();

  // -- entitlements state (Phase 2, roadmap §3) --------------------------------
  private readonly governanceRoles = new Map<string, GovernanceRole>();
  private readonly roleAssignments: RoleAssignmentRow[] = [];
  private plan: PlanCode = DEFAULT_PLAN;
  private planVersion = 1;
  private workspacePolicy: WorkspacePolicy = {};
  private policyVersion = 1;
  private readonly gatePolicies = new Map<GateCode, GatePolicy>();

  // -- collaboration state (Phase 3, roadmap §5) --------------------------------
  private readonly threads = new Map<string, Thread>();
  private readonly messages: Message[] = [];
  private readonly mentions: Mention[] = [];
  private readonly notifications: Notification[] = [];
  private readonly agentJobs = new Map<string, AgentJob>();

  // -- agent memory state (Phase 5, roadmap §6) ----------------------------------
  private readonly agentMemories: AgentMemory[] = [];

  readonly systemActorId: string;

  constructor(options?: { wallClock?: boolean }) {
    this.wallClock = options?.wallClock === true;
    this.systemActorId = this.nextId('actor-system');
    this.actors.set(this.systemActorId, {
      id: this.systemActorId,
      type: 'system',
      displayName: 'system',
      personaCode: null,
    });
  }

  // -- infrastructure --------------------------------------------------------

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36).padStart(6, '0')}`;
  }

  /** The ONLY read path for lease time — never used by any other guard. */
  private currentTime(): number {
    return this.wallClock ? Date.now() + this.now : this.now;
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
      occurredAt: Date.now(), // observational only — never a guard input
      ...(extra?.causationId !== undefined ? { causationId: extra.causationId } : {}),
    };
    this.eventLog.push(event);
    return event;
  }

  private mustGetItem(workItemId: string): WorkItemRow {
    const byId = this.workItems.get(workItemId);
    if (byId) return byId;
    // Imported stories are addressed by their externalKey handle
    // (conformance pin in stories-import.test.ts). Since Wave 2 handles are
    // scoped per project: `<project-slug>:<key>` is always exact; a bare key
    // resolves only while it is unique across the workspace.
    const colon = workItemId.indexOf(':');
    if (colon > 0) {
      const projectHandle = workItemId.slice(0, colon);
      const key = workItemId.slice(colon + 1);
      const project = this.projects.get(projectHandle) ??
        this.projects.get(this.projectSlugIndex.get(projectHandle) ?? '');
      const mapped = project ? this.externalKeyIndex.get(project.id)?.get(key) : undefined;
      const item = mapped !== undefined ? this.workItems.get(mapped) : undefined;
      if (item) return item;
      throw new GuardFailedError(`unknown work item: ${workItemId}`);
    }
    const hits: string[] = [];
    for (const perProject of this.externalKeyIndex.values()) {
      const mapped = perProject.get(workItemId);
      if (mapped !== undefined) hits.push(mapped);
    }
    if (hits.length === 1) {
      const item = this.workItems.get(hits[0]!);
      if (item) return item;
    }
    if (hits.length > 1) {
      throw new GuardFailedError(
        `ambiguous work item handle "${workItemId}" (exists in ${hits.length} projects) — qualify as <project-slug>:${workItemId}`,
      );
    }
    throw new GuardFailedError(`unknown work item: ${workItemId}`);
  }

  /**
   * Entitlement resolution — a PURE function over plan × governance ×
   * delivery-role data (roadmap §3). A grant may EXIST (direct or via a
   * role) and still not RESOLVE for an agent when the plan ceiling or the
   * restrict-only workspace policy narrows it. Users are never plan-filtered.
   */
  private grantSource(actorId: string, permission: Permission): string | null {
    if (this.grants.get(actorId)?.has(permission)) return 'direct';
    for (const assignment of this.roleAssignments) {
      if (assignment.actorId !== actorId || assignment.revoked) continue;
      if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
        return `role:${assignment.roleCode}`;
      }
    }
    return null;
  }

  private agentCeilingAllows(actor: Actor | undefined, permission: Permission): { plan: boolean; policy: boolean } {
    if (!actor || actor.type !== 'agent') return { plan: true, policy: true };
    const ceiling = PLAN_CEILINGS[this.plan];
    if ((AGENT_GATE_APPROVE_PERMISSIONS as readonly string[]).includes(permission)) {
      return { plan: ceiling.agentGateApprove, policy: this.workspacePolicy.agentGateApprovals !== false };
    }
    if (permission === 'gate.review.reject') {
      return { plan: ceiling.agentGateReject, policy: true };
    }
    if (permission === 'task.claim') {
      return { plan: true, policy: this.workspacePolicy.agentSelfDispatch !== false };
    }
    return { plan: true, policy: true };
  }

  private hasPermission(actorId: string, permission: Permission): boolean {
    if (this.grantSource(actorId, permission) === null) return false;
    const allows = this.agentCeilingAllows(this.actors.get(actorId), permission);
    return allows.plan && allows.policy;
  }

  private requirePermission(actorId: string, permission: Permission): void {
    if (!this.hasPermission(actorId, permission)) {
      throw new PermissionDeniedError(permission, actorId);
    }
  }

  private requireGovernanceAdmin(byActorId: string): void {
    if (byActorId === this.systemActorId) return;
    if (this.governanceRoles.get(byActorId) === 'admin') return;
    throw new PermissionDeniedError('governance.admin', byActorId);
  }

  /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
  private checkGrantCeiling(actorId: string, permission: Permission): void {
    const actor = this.actors.get(actorId);
    if (!actor || actor.type !== 'agent') return;
    const ceiling = PLAN_CEILINGS[this.plan];
    if ((AGENT_GATE_APPROVE_PERMISSIONS as readonly string[]).includes(permission) && !ceiling.agentGateApprove) {
      throw new GuardFailedError(`plan ${this.plan} does not allow agents to hold ${permission}`);
    }
    if (permission === 'gate.review.reject' && !ceiling.agentGateReject) {
      throw new GuardFailedError(`plan ${this.plan} does not allow agents to hold ${permission}`);
    }
  }

  /** All live (unreleased, unexpired) claims on an item — work and review (§9.4). */
  private liveClaimsOf(workItemId: string): ClaimRow[] {
    const out: ClaimRow[] = [];
    for (const claimId of this.claimsByItem.get(workItemId) ?? []) {
      const claim = this.claims.get(claimId);
      if (claim && !claim.released && claim.leaseExpiresAt > this.currentTime()) out.push(claim);
    }
    return out;
  }

  /** The live claim of a given kind (default 'work') — one per (item, kind) by constraint. */
  private liveClaim(workItemId: string, kind: ClaimKind = 'work'): ClaimRow | null {
    return this.liveClaimsOf(workItemId).find((c) => c.kind === kind) ?? null;
  }

  /**
   * A PRESENTED token is always validated, on every command (conformance pin,
   * claims.test.ts): it must match SOME live claim on the item (work or review,
   * §9.4 — the token is the capability, not the kind); else ConflictError +
   * audit event.
   */
  private validatePresentedToken(item: WorkItemRow, fencingToken: number | undefined, actorId: string): void {
    if (fencingToken === undefined) return;
    const live = this.liveClaimsOf(item.id);
    if (!live.some((c) => c.fencingToken === fencingToken)) {
      this.append('work_item', item.id, 'fencing.rejected', actorId, {
        presentedToken: fencingToken,
        liveToken: live[0]?.fencingToken ?? null,
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

  createActor(input: {
    type: Exclude<ActorType, 'system'>;
    displayName: string;
    governanceRole?: GovernanceRole;
    personaCode?: string;
  }): Actor {
    const actor: Actor = {
      id: this.nextId('actor'),
      type: input.type,
      displayName: input.displayName,
      personaCode: input.personaCode ?? null,
    };
    this.actors.set(actor.id, actor);
    this.governanceRoles.set(actor.id, input.governanceRole ?? 'member');
    return { ...actor };
  }

  /**
   * Audit a credential operation (roadmap §8). Token issuance/reissue lives in the
   * spine-api TokenStore, which is log-blind by design; the engine owns the audit
   * log, so the bus reports the op here right after the token is minted. The event
   * is system-authored, on the actor's own stream, and carries only an 8-hex hash
   * PREFIX — never the token itself (the store keeps only sha256 hashes).
   */
  noteTokenEvent(input: { actorId: string; kind: 'issued' | 'reissued'; tokenHashPrefix: string }): void {
    this.append('actor', input.actorId, `token.${input.kind}`, this.systemActorId, {
      tokenHashPrefix: input.tokenHashPrefix,
    });
  }

  grant(input: { actorId: string; permission: Permission }): void {
    this.checkGrantCeiling(input.actorId, input.permission);
    const set = this.grants.get(input.actorId) ?? new Set<string>();
    set.add(input.permission);
    this.grants.set(input.actorId, set);
    this.append('actor', input.actorId, 'grant.issued', this.systemActorId, { permission: input.permission });
  }

  revoke(input: { actorId: string; permission: Permission }): void {
    this.grants.get(input.actorId)?.delete(input.permission);
    this.append('actor', input.actorId, 'grant.revoked', this.systemActorId, { permission: input.permission });
  }

  // -- entitlements (Phase 2, roadmap §3) ----------------------------------------

  setGovernanceRole(input: { actorId: string; role: GovernanceRole; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    this.governanceRoles.set(input.actorId, input.role);
    this.append('actor', input.actorId, 'governance.changed', input.byActorId, { role: input.role });
  }

  getGovernanceRole(actorId: string): GovernanceRole {
    return this.governanceRoles.get(actorId) ?? 'member';
  }

  assignRole(input: { actorId: string; roleCode: string; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    const bundle = DELIVERY_ROLES[input.roleCode];
    if (bundle === undefined) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
    if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    for (const permission of bundle) {
      this.checkGrantCeiling(input.actorId, permission);
    }
    const active = this.roleAssignments.some(
      (a) => a.actorId === input.actorId && a.roleCode === input.roleCode && !a.revoked,
    );
    if (active) return; // idempotent
    this.roleAssignments.push({
      actorId: input.actorId,
      roleCode: input.roleCode,
      grantedBy: input.byActorId,
      revoked: false,
    });
    this.append('actor', input.actorId, 'role.assigned', input.byActorId, { roleCode: input.roleCode });
  }

  revokeRole(input: { actorId: string; roleCode: string; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    if (DELIVERY_ROLES[input.roleCode] === undefined) {
      throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
    }
    for (const assignment of this.roleAssignments) {
      if (assignment.actorId === input.actorId && assignment.roleCode === input.roleCode && !assignment.revoked) {
        assignment.revoked = true;
      }
    }
    this.append('actor', input.actorId, 'role.revoked', input.byActorId, { roleCode: input.roleCode });
  }

  listRoleAssignments(actorId?: string): RoleAssignment[] {
    return this.roleAssignments
      .filter((a) => actorId === undefined || a.actorId === actorId)
      .map((a) => ({ ...a }));
  }

  setPlan(input: { plan: PlanCode; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    if (PLAN_CEILINGS[input.plan] === undefined) throw new GuardFailedError(`unknown plan: ${input.plan}`);
    this.plan = input.plan;
    this.planVersion += 1;
    this.append('workspace', 'workspace', 'plan.changed', input.byActorId, {
      plan: input.plan,
      planVersion: this.planVersion,
    });
  }

  getPlan(): PlanCode {
    return this.plan;
  }

  setWorkspacePolicy(input: { policy: WorkspacePolicy; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    this.workspacePolicy = { ...this.workspacePolicy, ...input.policy };
    this.policyVersion += 1;
    this.append('workspace', 'workspace', 'policy.changed', input.byActorId, {
      policy: { ...this.workspacePolicy },
      policyVersion: this.policyVersion,
    });
  }

  getWorkspacePolicy(): WorkspacePolicy {
    return { ...this.workspacePolicy };
  }

  setGatePolicy(input: { gate: GateCode; policy: GatePolicy; byActorId: string }): void {
    this.requireGovernanceAdmin(input.byActorId);
    const minApprovals = input.policy.minApprovals ?? 1;
    if (!Number.isInteger(minApprovals) || minApprovals < 1) {
      throw new GuardFailedError('minApprovals must be a positive integer');
    }
    this.gatePolicies.set(input.gate, { ...input.policy });
    this.append('workspace', 'workspace', 'gate_policy.changed', input.byActorId, {
      gate: input.gate,
      policy: { ...input.policy },
    });
  }

  getGatePolicy(gate: GateCode): GatePolicy {
    return { ...(this.gatePolicies.get(gate) ?? {}) };
  }

  listActors(): Actor[] {
    return [...this.actors.values()].map((a) => ({ ...a }));
  }

  provisionPersonas(input: { byActorId: string }): Actor[] {
    this.requireGovernanceAdmin(input.byActorId);
    const provisioned: Actor[] = [];
    for (const persona of PERSONAS) {
      let actor = [...this.actors.values()].find((a) => a.personaCode === persona.personaCode);
      if (!actor) {
        actor = this.createActor({
          type: 'agent',
          displayName: persona.displayName,
          personaCode: persona.personaCode,
        });
        this.append('actor', actor.id, 'actor.provisioned', input.byActorId, {
          personaCode: persona.personaCode,
        });
      }
      // Floor-state role (thesis): assignRole is idempotent.
      this.assignRole({ actorId: actor.id, roleCode: persona.defaultRole, byActorId: input.byActorId });
      provisioned.push({ ...actor });
    }
    return provisioned;
  }

  authzExplain(input: { actorId: string; permission: Permission }): AuthzExplanation {
    const source = this.grantSource(input.actorId, input.permission);
    const allows = this.agentCeilingAllows(this.actors.get(input.actorId), input.permission);
    return {
      actorId: input.actorId,
      permission: input.permission,
      allowed: source !== null && allows.plan && allows.policy,
      source,
      governanceRole: this.getGovernanceRole(input.actorId),
      plan: this.plan,
      planAllows: allows.plan,
      policyAllows: allows.policy,
      versions: { plan: this.planVersion, policy: this.policyVersion },
    };
  }

  // -- projects (Phase 7 Wave 2, D-E) -----------------------------------------

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private mustGetProject(projectId: string): Project {
    const byId = this.projects.get(projectId);
    if (byId) return byId;
    const bySlug = this.projectSlugIndex.get(projectId);
    if (bySlug !== undefined) {
      const project = this.projects.get(bySlug);
      if (project) return project;
    }
    throw new GuardFailedError(`unknown project: ${projectId}`);
  }

  createProject(input: {
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
  }): Project {
    const slug = input.slug ?? EngineImpl.slugify(input.name);
    if (slug === '') throw new GuardFailedError('project slug must not be empty');
    if (this.projectSlugIndex.has(slug)) {
      throw new GuardFailedError(`project slug already taken: ${slug}`);
    }
    const project: Project = {
      id: this.nextId('proj'),
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
    this.projects.set(project.id, project);
    this.projectSlugIndex.set(project.slug, project.id);
    this.append('project', project.id, 'project.created', input.actorId, {
      name: project.name,
      slug: project.slug,
      kind: project.kind,
    });
    return { ...project };
  }

  getProject(input: { projectId: string }): Project {
    return { ...this.mustGetProject(input.projectId) };
  }

  listProjects(input?: { includeArchived?: boolean }): Project[] {
    return [...this.projects.values()]
      .filter((p) => input?.includeArchived === true || p.state === 'active')
      .map((p) => ({ ...p }));
  }

  updateProject(input: {
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
  }): Project {
    const project = this.mustGetProject(input.projectId);
    // The slug never silently moves on rename — it is the addressable handle.
    if (input.name !== undefined) project.name = input.name;
    if (input.kind !== undefined) project.kind = input.kind;
    if (input.repoPath !== undefined) project.repoPath = input.repoPath;
    if (input.defaultSpecFolder !== undefined) project.defaultSpecFolder = input.defaultSpecFolder;
    if (input.gitUrl !== undefined) project.gitUrl = input.gitUrl;
    if (input.baseBranch !== undefined) project.baseBranch = input.baseBranch;
    if (input.forgeOwner !== undefined) project.forgeOwner = input.forgeOwner;
    if (input.forgeRepo !== undefined) project.forgeRepo = input.forgeRepo;
    this.append('project', project.id, 'project.updated', input.actorId, {
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
    });
    return { ...project };
  }

  archiveProject(input: { actorId: string; projectId: string }): Project {
    const project = this.mustGetProject(input.projectId);
    project.state = 'archived';
    this.append('project', project.id, 'project.archived', input.actorId, {});
    return { ...project };
  }

  /** The compatibility floor: bare createFeature attaches here (lazy). */
  private defaultProject(actorId: string): Project {
    const existing = this.projectSlugIndex.get(DEFAULT_PROJECT_SLUG);
    if (existing !== undefined) {
      const project = this.projects.get(existing);
      if (project) return project;
    }
    return this.mustGetProject(
      this.createProject({ actorId, name: 'Default project', slug: DEFAULT_PROJECT_SLUG }).id,
    );
  }

  createFeature(input: { actorId: string; projectId?: string; name?: string }): Feature {
    const project =
      input.projectId !== undefined
        ? this.mustGetProject(input.projectId)
        : this.defaultProject(input.actorId);
    if (project.state === 'archived') {
      throw new GuardFailedError(`project is archived: ${project.slug}`);
    }
    const feature: Feature = {
      id: this.nextId('feat'),
      projectId: project.id,
      name: input.name ?? null,
      state: 'backlog',
      dispatchHold: false,
    };
    this.features.set(feature.id, feature);
    this.append('feature', feature.id, 'feature.created', input.actorId, {
      projectId: project.id,
      ...(feature.name !== null ? { name: feature.name } : {}),
    });
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
    };
    this.workItems.set(item.id, item);
    const projectId = this.features.get(item.featureId)?.projectId ?? '';
    const perProject = this.externalKeyIndex.get(projectId) ?? new Map<string, string>();
    if (!perProject.has(item.externalKey)) perProject.set(item.externalKey, item.id);
    this.externalKeyIndex.set(projectId, perProject);
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
    return this.claimOfKind({ ...input, kind: 'work', permission: 'task.claim' });
  }

  /**
   * §9.4: claim an in_review item for REVIEW. Reuses the work-claim internals
   * with kind='review' — a separate live-claim slot (one review claim per item
   * by constraint), fencing per claim. Authority = gate.review.approve OR reject
   * (the reviewer agent holds only the latter). Two concurrent calls: one wins,
   * the loser gets ConflictError and leaves no row behind.
   */
  claimReview(input: { workItemId: string; actorId: string; ttlMs?: number }): Claim {
    const item = this.mustGetItem(input.workItemId);
    if (
      !this.hasPermission(input.actorId, 'gate.review.approve') &&
      !this.hasPermission(input.actorId, 'gate.review.reject')
    ) {
      throw new PermissionDeniedError('gate.review.approve', input.actorId);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review claim applies to in_review items, not ${item.state}`);
    }
    return this.claimOfKind({ ...input, kind: 'review' });
  }

  private claimOfKind(input: {
    workItemId: string;
    actorId: string;
    ttlMs?: number;
    kind: ClaimKind;
    permission?: Permission;
  }): Claim {
    const item = this.mustGetItem(input.workItemId);
    if (input.permission !== undefined) this.requirePermission(input.actorId, input.permission);
    if (this.liveClaim(item.id, input.kind) !== null) {
      // One live claim per (work item, kind) — races lose by constraint (§1.3/§9.4);
      // the loser leaves no row behind.
      throw new ConflictError(`work item ${item.id} already has a live ${input.kind} claim`);
    }
    const ttlMs = input.ttlMs ?? 15 * 60 * 1000;
    const token = (this.fencingCounter.get(item.id) ?? 0) + 1;
    this.fencingCounter.set(item.id, token);
    const claim: ClaimRow = {
      id: this.nextId('claim'),
      workItemId: item.id,
      actorId: input.actorId,
      kind: input.kind,
      fencingToken: token,
      leaseExpiresAt: this.currentTime() + ttlMs,
      released: false,
      ttlMs,
    };
    this.claims.set(claim.id, claim);
    this.claimsByItem.set(item.id, [...(this.claimsByItem.get(item.id) ?? []), claim.id]);
    this.append('work_item', item.id, 'work_item.claimed', input.actorId, {
      claimId: claim.id,
      fencingToken: token,
      kind: input.kind,
    });
    return this.copyClaim(claim);
  }

  /**
   * A claim mutation (heartbeat, voluntary release) is authorized for the claim
   * HOLDER (the authenticated actor owns the claim) OR anyone presenting the live
   * fencing token (the capability itself, e.g. a job-bound token). A stranger with
   * neither is rejected exactly as a stale token is — ConflictError plus a
   * `fencing.rejected` audit event (§1.3). This is what stops any authenticated
   * actor from renewing or releasing a claim they do not hold (roadmap §8).
   */
  private authorizeClaimMutation(claim: ClaimRow, actorId: string, fencingToken: number | undefined): void {
    if (actorId === claim.actorId) return;
    if (fencingToken !== undefined && fencingToken === claim.fencingToken) return;
    this.append('work_item', claim.workItemId, 'fencing.rejected', actorId, {
      presentedToken: fencingToken ?? null,
      liveToken: claim.fencingToken,
    });
    throw new ConflictError(`not the holder and no valid fencing token for claim ${claim.id}`);
  }

  heartbeat(input: { claimId: string; actorId: string; fencingToken?: number }): void {
    const claim = this.claims.get(input.claimId);
    if (!claim || claim.released || claim.leaseExpiresAt <= this.currentTime()) {
      throw new ConflictError(`claim ${input.claimId} is not live`);
    }
    this.authorizeClaimMutation(claim, input.actorId, input.fencingToken);
    claim.leaseExpiresAt = this.currentTime() + claim.ttlMs;
  }

  /**
   * §10.5 — see SpineEngine.reapExpiredClaims. Book-keeping only: a lapsed lease
   * is already inert to every guard, so this changes nothing about what may
   * happen next — it just puts the fact on the record and tells the holder.
   */
  reapExpiredClaims(): { reaped: string[] } {
    const now = this.currentTime();
    const reaped: string[] = [];
    const { recorded, ended } = this.claimEventIndex();
    for (const claim of this.claims.values()) {
      if (claim.leaseExpiresAt > now) continue; // still live — nothing happened
      if (recorded.has(claim.id) || ended.has(claim.id)) continue;
      this.append(
        'work_item',
        claim.workItemId,
        'claim.expired',
        this.systemActorId,
        {
          claimId: claim.id,
          kind: claim.kind,
          heldBy: claim.actorId,
          leaseExpiresAt: claim.leaseExpiresAt,
        },
        // Caused by the claim itself — i.e. the event that took it.
        ...(this.claimedEventSeq(claim.id) !== null
          ? ([{ causationId: String(this.claimedEventSeq(claim.id)) }] as const)
          : []),
      );
      // The holder is the one who needs to know: its run is no longer authorised.
      this.pushNotification(claim.actorId, 'claim_expired', claim.id);
      reaped.push(claim.id);
    }
    return { reaped };
  }

  /**
   * §10.5 — which claims are already accounted for, read from the LOG.
   *
   * `recorded`: a `claim.expired` is already on the record → reaping again would
   * duplicate it. This is the idempotency latch, and it is deliberately NOT the
   * claim's `released` flag: `released` means "somebody ended this", and other
   * code reads it WITHOUT the clock — `forceReleaseClaim` iterates unreleased
   * claims, `listClaims` filters on it and computes `expired` from it. Setting it
   * here would turn a timer into a decision: ops would lose the dead-runner view
   * the flag exists to give them, and a force-release that worked a second ago
   * would start failing. The reaper must add a fact, not change one.
   *
   * `ended`: the claim was released on purpose (or force-released), so its lease
   * running out afterwards is not an expiry — nothing died. Reading this from the
   * log rather than from `released` is also what keeps the two engines in step:
   * PgEngine's `claimOfKind` silently flips `released` on a lapsed claim when the
   * slot is re-taken, while the memory engine leaves it alone — so `released`
   * answers a different question in each. The events do not.
   */
  private claimEventIndex(): { recorded: Set<string>; ended: Set<string> } {
    const recorded = new Set<string>();
    const ended = new Set<string>();
    for (const event of this.eventLog) {
      const claimId = event.payload['claimId'];
      if (typeof claimId !== 'string') continue;
      if (event.type === 'claim.expired') recorded.add(claimId);
      else if (event.type === 'claim.released' || event.type === 'claim.force_released') {
        ended.add(claimId);
      }
    }
    return { recorded, ended };
  }

  /** globalSeq of the `work_item.claimed` that took this claim (null if unknown). */
  private claimedEventSeq(claimId: string): number | null {
    const event = this.eventLog.find(
      (e) => e.type === 'work_item.claimed' && e.payload['claimId'] === claimId,
    );
    return event?.globalSeq ?? null;
  }

  releaseClaim(input: { claimId: string; actorId: string; fencingToken?: number; reason?: string }): void {
    const claim = this.claims.get(input.claimId);
    if (!claim || claim.released) return;
    this.authorizeClaimMutation(claim, input.actorId, input.fencingToken);
    claim.released = true;
    this.append('work_item', claim.workItemId, 'claim.released', claim.actorId, {
      claimId: claim.id,
      reason: input.reason ?? null,
    });
  }

  /**
   * Privileged ops recovery (roadmap §8): clear the live claim(s) on a stuck
   * work item so it can be re-dispatched. Gated on `ops.force_release_claim` —
   * the bootstrap admin's governance role does NOT bypass the grant. Unlike
   * releaseClaim, the event is authored by the ACTING actor and names the evicted
   * holder; the evicted holder's fencing token is thereby invalidated (a stale
   * token loses its live claim → rejected on the next mutation, §1.3).
   */
  forceReleaseClaim(input: { workItemId: string; actorId: string }): { released: string[] } {
    const item = this.mustGetItem(input.workItemId);
    this.requirePermission(input.actorId, 'ops.force_release_claim');
    const released: string[] = [];
    for (const claimId of this.claimsByItem.get(item.id) ?? []) {
      const claim = this.claims.get(claimId);
      if (!claim || claim.released) continue;
      claim.released = true;
      this.append('work_item', item.id, 'claim.force_released', input.actorId, {
        claimId: claim.id,
        workItemId: item.id,
        holderActorId: claim.actorId,
      });
      released.push(claim.id);
    }
    if (released.length === 0) {
      throw new GuardFailedError(`no live claim on work item ${item.id}`);
    }
    return { released };
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
        // Phase 4 (roadmap §1.4): kind selects WHICH machine evidence applies.
        if (item.kind !== 'code') {
          // Doc kinds: the latest doc_lint (if any) must be schema-valid;
          // git_diff is never consulted for non-code deliverables.
          const lints = this.evidenceRows.filter(
            (row) => row.workItemId === item.id && row.evidence.kind === 'doc_lint',
          );
          const latestLint = lints[lints.length - 1];
          if (latestLint && latestLint.evidence.payload['schemaValid'] !== true) {
            throw new GuardFailedError('the latest doc_lint evidence failed — document is not schema-valid');
          }
          return;
        }
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
      case 'intent_unchanged': {
        // §9.3: the intent contract is frozen at spec approval. If a hash was
        // pinned AND the measuring side presents a DIFFERENT one at dispatch,
        // the frozen region drifted after approval — refuse. Absence of a
        // presented hash is not drift (items without an intent contract, and
        // the pre-§9.3 flow, keep working); a null pin means nothing to guard.
        if (item.intentHash === null) return;
        const presented = this.latestIntentHash(item);
        if (presented !== undefined && presented !== item.intentHash) {
          throw new GuardFailedError('intent_changed');
        }
        return;
      }
    }
  }

  /** The latest submitted intent_hash evidence for an item (undefined if none). */
  private latestIntentHash(item: WorkItemRow): string | undefined {
    const rows = this.evidenceRows.filter(
      (row) => row.workItemId === item.id && row.evidence.kind === 'intent_hash',
    );
    const latest = rows[rows.length - 1];
    const hash = latest?.evidence.payload['hash'];
    return typeof hash === 'string' ? hash : undefined;
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
        // §9: the projector jumps straight to `executing` (was `in_progress`),
        // SKIPPING the gated stages — the degenerate/back-compat path for
        // features that never formally walk spec→design→breakdown.
        feature.state = 'executing';
        this.append('feature', feature.id, 'feature.state_changed', this.systemActorId, {
          from: 'backlog',
          to: 'executing',
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

    // §9.4: entering in_review auto-dispatches ONE review job per round when the
    // review_approval gate policy names a reviewer.
    if (to === 'in_review') {
      this.materializeReviewJob(item, event);
    }

    // Rails → chat: narrate the transition into bound task threads (§5.2).
    this.narrateWorkItem(item, `state: ${from} → ${to}`);

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
      if (!this.quorumWouldBeMet(item, 'spec_approval', input.actorId)) {
        this.recordApproval(item, 'spec_approval', input.actorId);
        return this.copyItem(item); // decision recorded; quorum pending (gate policy is data, roadmap §3)
      }
      // §9.3: freeze the intent contract — pin the hash the measuring side
      // submitted as intent_hash evidence (if any) at the moment of approval.
      const submittedHash = this.latestIntentHash(item);
      if (submittedHash !== undefined) item.intentHash = submittedHash;
      this.recordApproval(item, 'spec_approval', input.actorId);
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
    if (!this.quorumWouldBeMet(item, 'review_approval', input.actorId)) {
      this.recordApproval(item, 'review_approval', input.actorId);
      return this.copyItem(item); // quorum pending — no transition yet
    }
    // Evidence is checked exactly when the quorum would complete, so a failed
    // approval records nothing (Phase 1 pin: denied attempts mutate nothing).
    this.checkReviewEvidence(item);
    this.recordApproval(item, 'review_approval', input.actorId);
    return this.executeTransition(item, 'done', input.actorId);
  }

  /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
  private roundApprovers(item: WorkItemRow, gate: GateCode): Actor[] {
    const ids = new Set(
      this.gateDecisions
        .filter(
          (d) =>
            d.workItemId === item.id &&
            d.gate === gate &&
            d.decision === 'approved' &&
            d.round === item.reviewLoopIteration,
        )
        .map((d) => d.actorId),
    );
    return [...ids].flatMap((id) => {
      const actor = this.actors.get(id);
      return actor ? [actor] : [];
    });
  }

  /** Gate policy quorum (roadmap §3): min distinct approvers + required actor types, as DATA. */
  private quorumWouldBeMet(item: WorkItemRow, gate: GateCode, nextApproverId: string): boolean {
    const policy = this.gatePolicies.get(gate) ?? {};
    const min = policy.minApprovals ?? 1;
    const required = policy.requiredActorTypes ?? [];
    const approvers = this.roundApprovers(item, gate);
    const nextActor = this.actors.get(nextApproverId);
    if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
    if (approvers.length < min) return false;
    for (const type of required) {
      if (!approvers.some((a) => a.type === type)) return false;
    }
    return true;
  }

  private recordApproval(item: WorkItemRow, gate: GateCode, actorId: string): void {
    this.gateDecisions.push({
      workItemId: item.id,
      featureId: null,
      gate,
      decision: 'approved',
      actorId,
      round: item.reviewLoopIteration,
    });
    this.append('work_item', item.id, 'gate.approved', actorId, {
      gate,
      round: item.reviewLoopIteration,
      ...(gate === 'spec_approval' ? { pinnedVerification: item.pinnedVerification } : {}),
    });
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
    if (item.kind === 'code') {
      // Non-code deliverables carry no commit requirement (roadmap §1.4):
      // their completion rests on machine-checkable doc evidence plus the
      // permitted actor's decision.
      //
      // The LATEST commit decides, not any historical one (§10.3). Evidence is
      // append-only and an item can be dispatched more than once, so `some()`
      // would let a reachable commit from an EARLIER run certify a later run
      // whose push was refused (config redirected, LFS, auth failure) — the
      // "final revision" would be the one nobody could push. Same shape as the
      // pinned-verification check above: the last word wins.
      const commits = rows.filter((row) => row.evidence.kind === 'commit');
      const latest = commits[commits.length - 1];
      if (latest?.evidence.payload['reachableOnRemote'] !== true) {
        throw new GuardFailedError('final revision must be reachable on the remote (push is part of the HALT contract)');
      }
    }
    // §9.6: gate-policy data can additionally require a MERGED PR — the latest
    // `pr` evidence must be a merge into the default branch. Off by default:
    // the machine-collected merge fact is measured by the runner/CLI, judged here.
    if (this.gatePolicies.get('review_approval')?.requireMergedPr === true) {
      const prEvidence = rows.filter((row) => row.evidence.kind === 'pr');
      const latestPr = prEvidence[prEvidence.length - 1];
      if (!latestPr || latestPr.evidence.payload['action'] !== 'merged_into_default') {
        throw new GuardFailedError('review_approval requires a PR merged into the default branch (gate policy requireMergedPr)');
      }
    }
  }

  rejectGate(input: GateDecisionInput): WorkItem {
    const item = this.mustGetItem(input.workItemId);
    if (input.gate !== 'review_approval') {
      throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
    }
    // Phase 2 (additive): rejection authority = gate.review.approve OR
    // gate.review.reject — the Phase 2 exit criterion's reviewer-agent holds
    // only the latter. Every Phase 1 pin on rejectGate keeps holding.
    if (
      !this.hasPermission(input.actorId, 'gate.review.approve') &&
      !this.hasPermission(input.actorId, 'gate.review.reject')
    ) {
      throw new PermissionDeniedError('gate.review.reject', input.actorId);
    }
    if (item.state !== 'in_review') {
      throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
    }
    this.gateDecisions.push({
      workItemId: item.id,
      featureId: null,
      gate: 'review_approval',
      decision: 'rejected',
      actorId: input.actorId,
      round: item.reviewLoopIteration,
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

  // -- feature FSM (Phase 9, roadmap §9) ---------------------------------------

  private mustGetFeature(featureId: string): Feature {
    const feature = this.features.get(featureId);
    if (!feature) throw new GuardFailedError(`unknown feature: ${featureId}`);
    return feature;
  }

  /** Mutate + append feature.state_changed. Shared by advance and the gate firings. */
  private executeFeatureTransition(
    feature: Feature,
    to: FeatureState,
    actorId: string,
    causationId?: string,
  ): Feature {
    const from = feature.state;
    feature.state = to;
    this.append(
      'feature',
      feature.id,
      'feature.state_changed',
      actorId,
      { from, to },
      causationId !== undefined ? { causationId } : undefined,
    );
    return this.copyFeature(feature);
  }

  private checkFeatureGuard(guard: FeatureGuard, feature: Feature): void {
    switch (guard) {
      case 'children_done': {
        const notDone = [...this.workItems.values()].filter(
          (wi) => wi.featureId === feature.id && wi.state !== 'done',
        );
        if (notDone.length > 0) {
          throw new GuardFailedError(`feature has ${String(notDone.length)} work item(s) not done`);
        }
        return;
      }
      case 'tests_pinned': {
        // "In TDD" checkpoint (D7): the test-first pass must have authored the
        // pinned verification commands — at least one story of the feature
        // carries a non-empty pinnedVerification.
        const anyPinned = [...this.workItems.values()].some(
          (wi) => wi.featureId === feature.id && (wi.pinnedVerification?.length ?? 0) > 0,
        );
        if (!anyPinned) {
          throw new GuardFailedError('In-TDD checkpoint: no pinned verification commands authored for this feature');
        }
        return;
      }
    }
  }

  featureAdvance(input: FeatureAdvanceInput): Feature {
    const feature = this.mustGetFeature(input.featureId);
    const rule = FEATURE_TRANSITIONS.find((t) => t.from === feature.state && t.to === input.to);
    if (!rule) throw new InvalidTransitionError(feature.state, input.to);
    this.requirePermission(input.actorId, rule.permission);
    for (const guard of rule.guards) this.checkFeatureGuard(guard, feature);
    return this.executeFeatureTransition(feature, input.to, input.actorId);
  }

  /** rejections so far for this feature+gate — the current quorum round. */
  private currentFeatureRound(featureId: string, gate: GateCode): number {
    return this.gateDecisions.filter(
      (d) => d.featureId === featureId && d.gate === gate && d.decision === 'rejected',
    ).length;
  }

  private featureRoundApprovers(feature: Feature, gate: GateCode): Actor[] {
    const round = this.currentFeatureRound(feature.id, gate);
    const ids = new Set(
      this.gateDecisions
        .filter(
          (d) =>
            d.featureId === feature.id &&
            d.gate === gate &&
            d.decision === 'approved' &&
            d.round === round,
        )
        .map((d) => d.actorId),
    );
    return [...ids].flatMap((id) => {
      const actor = this.actors.get(id);
      return actor ? [actor] : [];
    });
  }

  private featureQuorumWouldBeMet(feature: Feature, gate: GateCode, nextApproverId: string): boolean {
    const policy = this.gatePolicies.get(gate) ?? {};
    const min = policy.minApprovals ?? 1;
    const required = policy.requiredActorTypes ?? [];
    const approvers = this.featureRoundApprovers(feature, gate);
    const nextActor = this.actors.get(nextApproverId);
    if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
    if (approvers.length < min) return false;
    for (const type of required) {
      if (!approvers.some((a) => a.type === type)) return false;
    }
    return true;
  }

  private recordFeatureApproval(feature: Feature, gate: GateCode, actorId: string): void {
    const round = this.currentFeatureRound(feature.id, gate);
    this.gateDecisions.push({
      workItemId: null,
      featureId: feature.id,
      gate,
      decision: 'approved',
      actorId,
      round,
    });
    this.append('feature', feature.id, 'gate.approved', actorId, { gate, round, featureId: feature.id });
  }

  approveFeatureGate(input: FeatureGateDecisionInput): Feature {
    const feature = this.mustGetFeature(input.featureId);
    const { permission, expected, to, guard } = featureGateSpec(input.gate);
    this.requirePermission(input.actorId, permission);
    if (feature.state !== expected) {
      throw new GuardFailedError(`${input.gate} applies to ${expected} features, not ${feature.state}`);
    }
    if (!this.featureQuorumWouldBeMet(feature, input.gate, input.actorId)) {
      this.recordFeatureApproval(feature, input.gate, input.actorId);
      return this.copyFeature(feature); // decision recorded; quorum pending (gate policy is data, §3)
    }
    // Entry guard (e.g. In-TDD tests_pinned) checked exactly when the quorum
    // would complete, so a non-completing approval records nothing extra.
    if (guard !== undefined) this.checkFeatureGuard(guard, feature);
    this.recordFeatureApproval(feature, input.gate, input.actorId);
    return this.executeFeatureTransition(feature, to, input.actorId);
  }

  rejectFeatureGate(input: FeatureGateDecisionInput): Feature {
    const feature = this.mustGetFeature(input.featureId);
    const { permission, expected, back } = featureGateSpec(input.gate);
    // Authority to reject = the same grant that approves the gate.
    this.requirePermission(input.actorId, permission);
    if (feature.state !== expected) {
      throw new GuardFailedError(`${input.gate} rejection applies to ${expected} features, not ${feature.state}`);
    }
    this.gateDecisions.push({
      workItemId: null,
      featureId: feature.id,
      gate: input.gate,
      decision: 'rejected',
      actorId: input.actorId,
      round: this.currentFeatureRound(feature.id, input.gate),
    });
    const decisionEvent = this.append('feature', feature.id, 'gate.rejected', input.actorId, {
      gate: input.gate,
      featureId: feature.id,
    });
    // The loopback is a system effect — one step back, causation = the decision.
    return this.executeFeatureTransition(feature, back, this.systemActorId, String(decisionEvent.globalSeq));
  }

  cancelFeature(input: { featureId: string; actorId: string; reason?: string }): Feature {
    const feature = this.mustGetFeature(input.featureId);
    this.requirePermission(input.actorId, 'feature.cancel');
    if (feature.state === 'done' || feature.state === 'cancelled') {
      throw new GuardFailedError(`cannot cancel a terminal feature (${feature.state})`);
    }
    const from = feature.state;
    feature.state = 'cancelled';
    // Compensating event (state.downgrade mold): the record of a product decision.
    this.append('feature', feature.id, 'feature.cancelled', input.actorId, {
      from,
      to: 'cancelled',
      compensating: true,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    });
    return this.copyFeature(feature);
  }

  // -- intent hash (Phase 9.3, roadmap §1.1/§9) ---------------------------------

  rebaselineIntent(input: { workItemId: string; hash: string; actorId: string }): WorkItem {
    const item = this.mustGetItem(input.workItemId);
    // A legitimate spec renegotiation — gated on intent.edit (the permission
    // has existed since Phase 1 and is finally checked here).
    this.requirePermission(input.actorId, 'intent.edit');
    const from = item.intentHash;
    item.intentHash = input.hash;
    this.append('work_item', item.id, 'intent.rebaselined', input.actorId, {
      from: from ?? null,
      to: input.hash,
    });
    return this.copyItem(item);
  }

  // -- collaboration (Phase 3, roadmap §5) ---------------------------------------

  private mustGetThread(threadId: string): Thread {
    const thread = this.threads.get(threadId);
    if (!thread) throw new GuardFailedError(`unknown thread: ${threadId}`);
    return thread;
  }

  private isParticipant(thread: Thread, actorId: string): boolean {
    return thread.createdBy === actorId || thread.participants.includes(actorId);
  }

  createThread(input: {
    actorId: string;
    kind: ThreadKind;
    featureId?: string;
    workItemId?: string;
    visibility?: ThreadVisibility;
  }): Thread {
    if (input.featureId !== undefined && !this.features.has(input.featureId)) {
      throw new GuardFailedError(`unknown feature: ${input.featureId}`);
    }
    let workItemId: string | null = null;
    if (input.workItemId !== undefined) {
      workItemId = this.mustGetItem(input.workItemId).id;
    }
    const thread: Thread = {
      id: this.nextId('th'),
      featureId: input.featureId ?? null,
      workItemId,
      kind: input.kind,
      visibility: input.visibility ?? (input.kind === 'private' ? 'private' : 'open'),
      createdBy: input.actorId,
      participants: [input.actorId],
    };
    this.threads.set(thread.id, thread);
    this.append('thread', thread.id, 'thread.created', input.actorId, {
      kind: thread.kind,
      featureId: thread.featureId,
      workItemId: thread.workItemId,
      visibility: thread.visibility,
    });
    return { ...thread, participants: [...thread.participants] };
  }

  addThreadParticipant(input: { threadId: string; actorId: string; byActorId: string }): Thread {
    const thread = this.mustGetThread(input.threadId);
    if (!this.isParticipant(thread, input.byActorId)) {
      throw new PermissionDeniedError('thread.invite', input.byActorId);
    }
    if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    if (!thread.participants.includes(input.actorId)) {
      thread.participants.push(input.actorId);
      this.append('thread', thread.id, 'thread.participant_added', input.byActorId, {
        actorId: input.actorId,
      });
    }
    return { ...thread, participants: [...thread.participants] };
  }

  /** Internal append that never runs the router — used for chat, narration alike. */
  private appendMessage(
    thread: Thread,
    authorId: string,
    kind: Message['kind'],
    body: string,
    replyTo: string | null,
  ): Message {
    const seq = this.messages.filter((m) => m.threadId === thread.id).length + 1;
    const message: Message = {
      id: this.nextId('msg'),
      threadId: thread.id,
      seq,
      authorId,
      kind,
      body,
      replyTo,
    };
    this.messages.push(message);
    this.append('thread', thread.id, 'message.posted', authorId, { messageId: message.id, kind });
    return { ...message };
  }

  /**
   * §5.2: the server NEVER parses body text — `mentions` is structured actor
   * ids. §5.4: the router is pure code, default-deny, policy-gated,
   * depth-capped; a job is reply-only context, never a claim.
   */
  postMessage(input: {
    threadId: string;
    actorId: string;
    body: string;
    replyTo?: string;
    mentions?: string[];
  }): Message {
    const thread = this.mustGetThread(input.threadId);
    if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
      throw new PermissionDeniedError('thread.post', input.actorId);
    }
    const message = this.appendMessage(thread, input.actorId, 'chat', input.body, input.replyTo ?? null);

    for (const mentionedId of [...new Set(input.mentions ?? [])]) {
      const mentioned = this.actors.get(mentionedId);
      if (!mentioned) throw new GuardFailedError(`unknown mentioned actor: ${mentionedId}`);
      const resolution = this.routeMention(thread, message, input.actorId, mentioned);
      this.mentions.push({ messageId: message.id, mentionedActorId: mentionedId, resolution });
      this.append('thread', thread.id, 'mention.recorded', input.actorId, {
        messageId: message.id,
        mentionedActorId: mentionedId,
        resolution,
      });
    }
    return message;
  }

  /** The deterministic mention router (§5.4). Returns the recorded resolution. */
  private routeMention(
    thread: Thread,
    message: Message,
    mentionerId: string,
    mentioned: Actor,
  ): Mention['resolution'] {
    if (mentioned.type !== 'agent') {
      this.pushNotification(mentioned.id, 'mention', message.id);
      return 'notified';
    }
    // kill-switch applies to every job-materializing path
    if (this.workspacePolicy.mentionDispatch === false) return 'denied_policy';

    const mentioner = this.actors.get(mentionerId);
    let depth = 0;
    if (mentioner?.type === 'agent') {
      // agent-mention-agent: explicit policy + depth cap (§5.4)
      if (this.workspacePolicy.agentMentionAgent !== true) return 'denied_policy';
      const mentionerJobs = [...this.agentJobs.values()].filter((j) => j.agentActorId === mentionerId);
      depth = Math.max(0, ...mentionerJobs.map((j) => j.depth)) + 1;
      if (depth > AGENT_JOB_MAX_DEPTH) return 'denied_depth';
    } else {
      // default-deny: the human mentioner must hold invoke authority —
      // at least one active delivery role, or governance admin.
      const hasRole = this.roleAssignments.some((a) => a.actorId === mentionerId && !a.revoked);
      const isAdmin = this.governanceRoles.get(mentionerId) === 'admin' || mentionerId === this.systemActorId;
      if (!hasRole && !isAdmin) return 'denied_policy';
    }

    const job: AgentJob = {
      id: this.nextId('job'),
      agentActorId: mentioned.id,
      threadId: thread.id,
      messageId: message.id,
      workItemId: thread.workItemId,
      featureId: thread.featureId,
      status: 'queued',
      depth,
      reviewRound: null,
      claimedBy: null,
      claimExpiresAt: null,
      stateVersion: 0,
      note: null,
    };
    this.agentJobs.set(job.id, job);
    this.append('agent_job', job.id, 'agent_job.created', mentionerId, {
      agentActorId: mentioned.id,
      threadId: thread.id,
      messageId: message.id,
      depth,
    });
    this.pushNotification(mentioned.id, 'mention', message.id);
    return 'job_created';
  }

  private pushNotification(actorId: string, source: Notification['source'], refId: string): void {
    this.notifications.push({ id: this.nextId('ntf'), actorId, source, refId, read: false });
  }

  /**
   * §9.4: materialize exactly ONE review job per review round when the
   * review_approval gate policy names an autoDispatchReviewer. A review job has
   * no thread/message (it is not a mention) and carries reviewRound; the memory
   * check here is the analog of the (workItemId, reviewRound) partial unique
   * index — a second entry into in_review in the SAME round creates nothing.
   */
  private materializeReviewJob(item: WorkItemRow, causeEvent: SpineEvent): void {
    const reviewerId = this.gatePolicies.get('review_approval')?.autoDispatchReviewer;
    if (reviewerId === undefined) return;
    const round = item.reviewLoopIteration;
    const exists = [...this.agentJobs.values()].some(
      (j) => j.workItemId === item.id && j.reviewRound === round,
    );
    if (exists) return;
    const job: AgentJob = {
      id: this.nextId('job'),
      agentActorId: reviewerId,
      threadId: null,
      messageId: null,
      workItemId: item.id,
      featureId: item.featureId,
      status: 'queued',
      depth: 0,
      reviewRound: round,
      claimedBy: null,
      claimExpiresAt: null,
      stateVersion: 0,
      note: null,
    };
    this.agentJobs.set(job.id, job);
    this.append(
      'agent_job',
      job.id,
      'agent_job.created',
      this.systemActorId,
      { agentActorId: reviewerId, workItemId: item.id, reviewRound: round },
      { causationId: String(causeEvent.globalSeq) },
    );
  }

  listThreads(filter?: { featureId?: string; workItemId?: string; actorId?: string }): Thread[] {
    return [...this.threads.values()]
      .filter((t) => {
        if (filter?.featureId !== undefined && t.featureId !== filter.featureId) return false;
        if (filter?.workItemId !== undefined) {
          const resolved = this.mustGetItem(filter.workItemId).id;
          if (t.workItemId !== resolved) return false;
        }
        if (filter?.actorId !== undefined && t.visibility === 'private' && !this.isParticipant(t, filter.actorId)) {
          return false;
        }
        return true;
      })
      .map((t) => ({ ...t, participants: [...t.participants] }));
  }

  listMessages(input: { threadId: string; actorId: string; sinceSeq?: number }): Message[] {
    const thread = this.mustGetThread(input.threadId);
    if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
      throw new PermissionDeniedError('thread.read', input.actorId);
    }
    return this.messages
      .filter((m) => m.threadId === thread.id && (input.sinceSeq === undefined || m.seq > input.sinceSeq))
      .map((m) => ({ ...m }));
  }

  listMentions(messageId: string): Mention[] {
    return this.mentions.filter((m) => m.messageId === messageId).map((m) => ({ ...m }));
  }

  listNotifications(input: { actorId: string; unreadOnly?: boolean }): Notification[] {
    return this.notifications
      .filter((n) => n.actorId === input.actorId && (input.unreadOnly !== true || !n.read))
      .map((n) => ({ ...n }));
  }

  markNotificationRead(input: { notificationId: string; actorId: string }): void {
    const notification = this.notifications.find((n) => n.id === input.notificationId);
    if (!notification) throw new GuardFailedError(`unknown notification: ${input.notificationId}`);
    if (notification.actorId !== input.actorId) {
      throw new PermissionDeniedError('thread.read', input.actorId);
    }
    notification.read = true;
  }

  /** §9.5: an in_progress job past its lease reads back as `queued` (lazy free). */
  private effectiveJobStatus(job: AgentJob): AgentJob['status'] {
    if (
      job.status === 'in_progress' &&
      job.claimExpiresAt !== null &&
      job.claimExpiresAt <= this.currentTime()
    ) {
      return 'queued';
    }
    return job.status;
  }

  listAgentJobs(filter?: { agentActorId?: string; status?: AgentJob['status'] }): AgentJob[] {
    return [...this.agentJobs.values()]
      .map((j) => ({ ...j, status: this.effectiveJobStatus(j) }))
      .filter(
        (j) =>
          (filter?.agentActorId === undefined || j.agentActorId === filter.agentActorId) &&
          (filter?.status === undefined || j.status === filter.status),
      );
  }

  claimAgentJob(input: { jobId: string; actorId: string; ttlMs?: number }): AgentJob {
    const job = this.agentJobs.get(input.jobId);
    if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
    // A job is materialized FOR one agent; only that agent may serve it.
    if (job.agentActorId !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    // Claimable = queued, or an in_progress job whose lease lapsed (lazy free).
    // The status guard IS the CAS: two loops race, one wins, the loser 409s.
    if (this.effectiveJobStatus(job) !== 'queued') {
      throw new ConflictError(`agent job ${job.id} is already claimed (${job.status})`);
    }
    job.status = 'in_progress';
    job.claimedBy = input.actorId;
    job.claimExpiresAt = this.currentTime() + (input.ttlMs ?? AGENT_JOB_CLAIM_TTL_MS);
    job.stateVersion += 1;
    this.append('agent_job', job.id, 'agent_job.claimed', input.actorId, {
      claimExpiresAt: job.claimExpiresAt,
    });
    return { ...job };
  }

  completeAgentJob(input: { jobId: string; actorId: string; status: 'done' | 'blocked'; note?: string }): AgentJob {
    const job = this.agentJobs.get(input.jobId);
    if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
    if (job.agentActorId !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    if (job.status === 'done' || job.status === 'blocked') {
      throw new GuardFailedError(`agent job ${job.id} is already ${job.status}`);
    }
    // §9.5: once claimed, only the CLAIMER may complete (holds here since the
    // claimer is always the job's own agent).
    if (job.claimedBy !== null && job.claimedBy !== input.actorId) {
      throw new PermissionDeniedError('agent_job.complete', input.actorId);
    }
    job.status = input.status;
    job.note = input.note ?? null;
    job.stateVersion += 1;
    this.append('agent_job', job.id, 'agent_job.completed', input.actorId, {
      status: input.status,
      note: job.note,
    });
    // notify the mentioner — the reverse direction is a message + notification, nothing more (§5.4)
    const trigger = this.messages.find((m) => m.id === job.messageId);
    if (trigger) this.pushNotification(trigger.authorId, 'job_completed', job.id);
    return { ...job };
  }

  // -- agent memory (Phase 5, roadmap §6) ----------------------------------------

  appendAgentMemory(input: {
    actorId: string;
    kind: MemoryKind;
    content: string;
    sourceThreadId?: string;
    projectId?: string;
  }): AgentMemory {
    const actor = this.actors.get(input.actorId);
    if (!actor) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
    if (actor.type !== 'agent') {
      throw new GuardFailedError('memory belongs to agent actors (roadmap §6)');
    }
    let sourceThreadId: string | null = null;
    let sourceVisibility: AgentMemory['sourceVisibility'] = null;
    if (input.sourceThreadId !== undefined) {
      const thread = this.mustGetThread(input.sourceThreadId);
      // Learning from a private context requires having been in it.
      if (thread.visibility === 'private' && !this.isParticipant(thread, input.actorId)) {
        throw new PermissionDeniedError('thread.read', input.actorId);
      }
      sourceThreadId = thread.id;
      sourceVisibility = thread.visibility;
    }
    // D-H: a project-scoped lesson stays in its project; null = global craft.
    const projectId =
      input.projectId !== undefined ? this.mustGetProject(input.projectId).id : null;
    const seq = this.agentMemories.filter((m) => m.agentActorId === input.actorId).length + 1;
    const memory: AgentMemory = {
      id: this.nextId('mem'),
      agentActorId: input.actorId,
      kind: input.kind,
      content: input.content,
      sourceThreadId,
      sourceVisibility,
      projectId,
      seq,
    };
    this.agentMemories.push(memory);
    // Content NEVER enters the shared event log — private learning must not
    // leak into the audit stream (roadmap §6 pin).
    this.append('actor', input.actorId, 'memory.appended', input.actorId, {
      memoryId: memory.id,
      kind: memory.kind,
      sourceThreadId,
    });
    return { ...memory };
  }

  searchAgentMemory(input: {
    actorId: string;
    contextThreadId?: string;
    kind?: MemoryKind;
    query?: string;
    projectId?: string;
  }): AgentMemory[] {
    // Owner-scoped by construction: there is no cross-actor parameter.
    const projectId =
      input.projectId !== undefined ? this.mustGetProject(input.projectId).id : undefined;
    return this.agentMemories
      .filter((m) => {
        if (m.agentActorId !== input.actorId) return false;
        if (input.kind !== undefined && m.kind !== input.kind) return false;
        if (input.query !== undefined && !m.content.toLowerCase().includes(input.query.toLowerCase())) return false;
        // D-H: scoped recall = that project + global; a sibling never leaks in.
        if (projectId !== undefined && m.projectId !== null && m.projectId !== projectId) return false;
        // §6: nothing learned in a private thread surfaces outside its
        // source thread.
        if (m.sourceVisibility === 'private' && m.sourceThreadId !== input.contextThreadId) return false;
        return true;
      })
      .map((m) => ({ ...m }));
  }

  /** Rails → chat narration (§5.2): state changes narrate into bound task threads. */
  private narrateWorkItem(item: WorkItemRow, body: string): void {
    for (const thread of this.threads.values()) {
      if (thread.workItemId === item.id) {
        this.appendMessage(thread, this.systemActorId, 'system', body, null);
      }
    }
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

  listFeatures(filter?: { projectId?: string }): Feature[] {
    const projectId =
      filter?.projectId !== undefined ? this.mustGetProject(filter.projectId).id : undefined;
    return [...this.features.values()]
      .filter((feature) => projectId === undefined || feature.projectId === projectId)
      .map((feature) => this.copyFeature(feature));
  }

  listWorkItems(filter?: {
    state?: WorkItemState;
    featureId?: string;
    projectId?: string;
    claimable?: boolean;
  }): WorkItem[] {
    const projectId =
      filter?.projectId !== undefined ? this.mustGetProject(filter.projectId).id : undefined;
    return [...this.workItems.values()]
      .filter((item) => {
        if (filter?.state !== undefined && item.state !== filter.state) return false;
        if (filter?.featureId !== undefined && item.featureId !== filter.featureId) return false;
        if (projectId !== undefined && this.features.get(item.featureId)?.projectId !== projectId)
          return false;
        if (filter?.claimable === true && this.liveClaim(item.id) !== null) return false;
        return true;
      })
      .map((item) => this.copyItem(item));
  }

  getClaims(workItemId: string): Claim[] {
    const item = this.mustGetItem(workItemId);
    return (this.claimsByItem.get(item.id) ?? []).flatMap((claimId) => {
      const claim = this.claims.get(claimId);
      return claim ? [this.copyClaim(claim)] : [];
    });
  }

  listEvidence(workItemId: string): Evidence[] {
    const item = this.mustGetItem(workItemId);
    return this.evidenceRows
      .filter((row) => row.workItemId === item.id)
      .map((row) => ({ kind: row.evidence.kind, payload: { ...row.evidence.payload } }));
  }

  listClaims(input?: { includeReleased?: boolean }): Claim[] {
    return [...this.claims.values()]
      .filter((claim) => input?.includeReleased === true || !claim.released)
      .map((claim) => ({
        ...this.copyClaim(claim),
        expired: !claim.released && claim.leaseExpiresAt <= this.currentTime(),
      }));
  }

  events(streamId?: string): SpineEvent[] {
    const source = streamId === undefined ? this.eventLog : this.eventLog.filter((e) => e.streamId === streamId);
    return source.map((event) => ({ ...event, payload: { ...event.payload } }));
  }

  /**
   * Events an actor is allowed to see (roadmap §8): the full log minus events on
   * `private` thread streams the actor does not participate in. Even metadata-only
   * `message.posted` events leak the existence and author of a private thread, so
   * they are masked. Auditors, governance admins, and the system actor see all —
   * an auditor's whole job is to read the complete trail. Ids stay the global seq,
   * so a filtered view has gaps; Last-Event-ID resume still works over them.
   */
  isEventVisibleTo(event: SpineEvent, actorId: string): boolean {
    if (event.streamType !== 'thread') return true;
    const role = this.getGovernanceRole(actorId);
    if (role === 'admin' || role === 'auditor' || actorId === this.systemActorId) return true;
    const thread = this.threads.get(event.streamId);
    if (!thread || thread.visibility !== 'private') return true;
    return this.isParticipant(thread, actorId);
  }

  eventsVisibleTo(actorId: string, streamId?: string): SpineEvent[] {
    return this.events(streamId).filter((event) => this.isEventVisibleTo(event, actorId));
  }
}

export function createEngine(options?: { wallClock?: boolean }): SpineEngine {
  return new EngineImpl(options);
}
