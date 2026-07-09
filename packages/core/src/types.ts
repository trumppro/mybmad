/**
 * @oahs/core — types, errors, and vocabulary of the deterministic spine.
 *
 * The conformance suite in test/ was written FIRST, from the prose rules in
 * the BMAD source (bmad-sprint-planning, bmad-dev-auto, bmad-quick-dev,
 * stories-schema.md) as arbitrated in product-roadmap.md §1. The engine is
 * implemented to make that suite pass — never the other way around.
 *
 * Invariants enforced here forever (product-roadmap.md §0.1):
 *  - No LLM SDK import. Ever. (CI lint)
 *  - Every mutation goes through a command; commands emit events; projections
 *    are consequences of events.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`Not implemented: ${what}`);
    this.name = 'NotImplementedError';
  }
}

/** Command rejected: actor lacks the required grant. */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly permission: Permission,
    public readonly actorId: string,
  ) {
    super(`permission denied: ${permission} for actor ${actorId}`);
    this.name = 'PermissionDeniedError';
  }
}

/** Command rejected: FSM guard failed (includes the machine-readable guard code). */
export class GuardFailedError extends Error {
  constructor(public readonly guard: string) {
    super(`guard failed: ${guard}`);
    this.name = 'GuardFailedError';
  }
}

/** Command rejected: stale fencing token or state_version conflict (HTTP 409 semantics). */
export class ConflictError extends Error {
  constructor(public readonly reason: string) {
    super(`conflict: ${reason}`);
    this.name = 'ConflictError';
  }
}

/** Transition not declared in the table (includes never-downgrade rejections). */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: WorkItemState,
    public readonly to: WorkItemState,
  ) {
    super(`invalid transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/** stories.yaml failed a validity rule (stories-schema.md). */
export class StoriesValidationError extends Error {
  constructor(public readonly rule: string) {
    super(`stories.yaml invalid: ${rule}`);
    this.name = 'StoriesValidationError';
  }
}

// ---------------------------------------------------------------------------
// Vocabulary (product-roadmap.md §0.2, §1.1)
// ---------------------------------------------------------------------------

export type ActorType = 'user' | 'agent' | 'system';

export const WORK_ITEM_STATES = [
  'backlog',
  'draft',
  'ready_for_dev',
  'in_progress',
  'in_review',
  'done',
] as const;
export type WorkItemState = (typeof WORK_ITEM_STATES)[number];

/** blocked is an OVERLAY, not a state (roadmap D8). Taxonomy from dev-auto HALT. */
export const BLOCKED_REASONS = [
  'unclear_intent',
  'no_stories_yaml_found',
  'ambiguous_story_file_match',
  'review_non_convergence',
  'no_subagents',
  'dirty_tree',
  'stale_worktree',
  'awaiting_human_input',
  'other',
] as const;
export type BlockedReason = (typeof BLOCKED_REASONS)[number];

export type Permission =
  | 'task.plan'
  | 'task.claim'
  | 'task.advance'
  | 'task.block'
  | 'gate.spec.approve'
  | 'gate.review.approve'
  | 'gate.review.reject' // Phase 2: rejection-loopback WITHOUT done-approval (roadmap Phase 2 exit criterion)
  | 'feature.init'
  | 'feature.advance'
  | 'dispatch.release_hold'
  | 'intent.edit'
  | 'state.downgrade'
  | 'ops.force_release_claim'
  | 'governance.admin'; // Phase 2: authority over gated entitlement writes (held via governance role, not grants)

// ---------------------------------------------------------------------------
// Entitlements (Phase 2, roadmap §3): plan × governance role × delivery role.
// Resolution is a PURE function over this data — no interpretation anywhere.
// ---------------------------------------------------------------------------

export type GovernanceRole = 'admin' | 'member' | 'auditor';

export type PlanCode = 'free' | 'team' | 'enterprise';

/**
 * Plan is a CEILING, never a grant (roadmap §3). It bounds what may be
 * granted to AGENT actors; user actors are never plan-filtered. Enforced in
 * the resolver and at grant time — nowhere else.
 */
export interface PlanCeiling {
  /** may agents hold gate-APPROVAL permissions (spec/review approve)? */
  agentGateApprove: boolean;
  /** may agents hold the rejection-loopback permission? */
  agentGateReject: boolean;
}

export const PLAN_CEILINGS: Record<PlanCode, PlanCeiling> = {
  free: { agentGateApprove: false, agentGateReject: false },
  team: { agentGateApprove: false, agentGateReject: true },
  enterprise: { agentGateApprove: true, agentGateReject: true },
};

/** Self-host default: the ceiling is open; the org narrows (restrict-only). */
export const DEFAULT_PLAN: PlanCode = 'enterprise';

/** Gate-approval permissions bounded by PlanCeiling.agentGateApprove. */
export const AGENT_GATE_APPROVE_PERMISSIONS: readonly Permission[] = [
  'gate.spec.approve',
  'gate.review.approve',
];

/**
 * Delivery roles (roadmap §3) — permission bundles, versioned data of the
 * Rules layer. An assignment grants the bundle; revocation removes it.
 */
export const DELIVERY_ROLES: Record<string, readonly Permission[]> = {
  product_owner: ['task.plan', 'feature.init', 'feature.advance', 'gate.spec.approve', 'dispatch.release_hold'],
  tech_lead: ['task.plan', 'gate.review.approve', 'gate.review.reject', 'state.downgrade', 'ops.force_release_claim'],
  reviewer: ['gate.review.approve', 'gate.review.reject'],
  developer: ['task.claim', 'task.advance', 'task.block'],
  qa: ['task.block'],
  contributor: [],
};

/**
 * Workspace policy — RESTRICT-ONLY keys (roadmap §3): a policy can narrow
 * what the plan allows, never widen it. Undefined = no restriction.
 */
export interface WorkspacePolicy {
  /** false ⇒ agents cannot exercise gate-approval permissions even if granted */
  agentGateApprovals?: boolean;
  /** false ⇒ agents cannot claim tasks on their own (mention-dispatch only, Phase 3) */
  agentSelfDispatch?: boolean;
}

/** Gate definitions are data (roadmap §3): quorum + actor-type requirements. */
export interface GatePolicy {
  /** distinct approvers required in the current review round (default 1) */
  minApprovals?: number;
  /** at least one approver of each listed type is required (e.g. ['user']) */
  requiredActorTypes?: ActorType[];
}

export interface RoleAssignment {
  actorId: string;
  roleCode: string;
  grantedBy: string;
  revoked: boolean;
}

/** authz.explain — the decision trace an auditor can replay (roadmap §3). */
export interface AuthzExplanation {
  actorId: string;
  permission: Permission;
  allowed: boolean;
  /** 'direct' | 'role:<code>' when a grant exists; null when none does */
  source: string | null;
  governanceRole: GovernanceRole;
  plan: PlanCode;
  /** false when the plan ceiling blocks an agent's gate permission */
  planAllows: boolean;
  /** false when the restrict-only workspace policy blocks it */
  policyAllows: boolean;
  versions: { plan: number; policy: number };
}

export type GateCode = 'spec_approval' | 'review_approval';

export type EvidenceKind =
  | 'test_run' // {command, exitCode}  — command MUST match a pinned one
  | 'git_diff' // {baseline, final, filesChanged, nonEmpty, branch}
  | 'commit' // {sha, branch, reachableOnRemote}
  | 'halt_report' // verbatim Auto Run Result
  | 'review_report' // LLM-authored; NEVER a guard, context only
  | 'doc_lint'; // {schemaValid} for non-code work

export interface Evidence {
  kind: EvidenceKind;
  payload: Record<string, unknown>;
}

/** Review loop: exactly this many loopbacks allowed; the next one blocks. */
export const REVIEW_LOOP_LIMIT = 5;

export const INTENT_HASH_ALGO = 'v1';

// ---------------------------------------------------------------------------
// Entities (projection shapes returned by queries)
// ---------------------------------------------------------------------------

export interface Actor {
  id: string;
  type: ActorType;
  displayName: string;
}

export interface Feature {
  id: string;
  state: 'backlog' | 'in_progress' | 'done';
  /** true while a done_checkpoint hold is active: no further dispatch in this feature */
  dispatchHold: boolean;
}

export interface WorkItem {
  id: string;
  featureId: string;
  externalKey: string; // id from stories.yaml, e.g. "3-2"
  title: string;
  state: WorkItemState;
  blockedReason: BlockedReason | null;
  reviewLoopIteration: number;
  intentHash: string | null;
  pinnedVerification: string[] | null;
  specCheckpoint: boolean;
  doneCheckpoint: boolean;
  invokeDevWith: string;
  specPath: string;
  stateVersion: number;
}

export interface Claim {
  id: string;
  workItemId: string;
  actorId: string;
  fencingToken: number;
  leaseExpiresAt: number; // engine-clock ms
  released: boolean;
}

export interface SpineEvent {
  globalSeq: number;
  streamType: 'workspace' | 'feature' | 'work_item' | 'actor';
  streamId: string;
  streamSeq: number;
  type: string;
  actorId: string;
  payload: Record<string, unknown>;
  causationId?: string;
}

export interface DivergenceReport {
  workItemId: string;
  fileState: string;
  dbState: WorkItemState;
  kind: 'file_ahead' | 'db_ahead' | 'conflict';
}

export interface StoriesImportResult {
  imported: string[]; // externalKeys created
  updated: string[]; // externalKeys already present, refreshed
  warnings: string[]; // e.g. skipped retrospective entries
}


// The production service wraps the same core with Postgres persistence.
// ---------------------------------------------------------------------------

export interface CreateWorkItemInput {
  featureId: string;
  externalKey: string;
  title: string;
  specCheckpoint?: boolean;
  doneCheckpoint?: boolean;
  invokeDevWith?: string;
  dependsOn?: string[]; // externalKeys
}

export interface AdvanceInput {
  workItemId: string;
  to: WorkItemState;
  actorId: string;
  fencingToken?: number; // required for claim-guarded transitions
  idempotencyKey?: string;
}

export interface GateDecisionInput {
  workItemId: string;
  gate: GateCode;
  actorId: string;
  /** spec_approval only: pins verification commands as Rules-layer data (roadmap D7) */
  pinnedVerification?: string[];
}

export interface SpineEngine {
  // -- setup ---------------------------------------------------------------
  createActor(input: {
    type: Exclude<ActorType, 'system'>;
    displayName: string;
    /** bootstrap plumbing (like createActor itself); default 'member' */
    governanceRole?: GovernanceRole;
  }): Actor;
  grant(input: { actorId: string; permission: Permission; scope?: string }): void;
  revoke(input: { actorId: string; permission: Permission; scope?: string }): void;
  createFeature(input: { actorId: string }): Feature;
  createWorkItem(input: CreateWorkItemInput & { actorId: string }): WorkItem;

  /** Import stories.yaml content (raw YAML string). Idempotent re-import per stories-schema update semantics. */
  importStories(input: { featureId: string; yaml: string; actorId: string }): StoriesImportResult;

  // -- claims (roadmap §1.3) -------------------------------------------------
  claimTask(input: { workItemId: string; actorId: string; ttlMs?: number }): Claim;
  heartbeat(input: { claimId: string }): void;
  releaseClaim(input: { claimId: string; reason?: string }): void;
  /** test clock — lease expiry is time-based */
  advanceClock(ms: number): void;

  // -- lifecycle (roadmap §1.2) ----------------------------------------------
  advanceState(input: AdvanceInput): WorkItem;
  blockTask(input: { workItemId: string; reason: BlockedReason; actorId: string; fencingToken?: number }): WorkItem;
  unblockTask(input: { workItemId: string; actorId: string }): WorkItem;

  // -- gates & evidence (roadmap §1.4) ----------------------------------------
  submitEvidence(input: { workItemId: string; evidence: Evidence; actorId: string; fencingToken?: number }): void;
  approveGate(input: GateDecisionInput): WorkItem;
  /** Rejection fires the loopback as a system effect — no claim holder involvement (roadmap §1.2). */
  rejectGate(input: GateDecisionInput): WorkItem;

  // -- dispatch (roadmap §2.3) -------------------------------------------------
  /** Refuses state=done items; returns entry-state context for the runner. */
  getTaskContext(input: { workItemId: string }): {
    workItem: WorkItem;
    entryState: WorkItemState;
  };
  /** Releases a done_checkpoint dispatch hold on the feature. */
  releaseDispatchHold(input: { featureId: string; actorId: string }): Feature;

  // -- reconciliation (roadmap §1.6, detect-only) -------------------------------
  reconcile(input: { files: Array<{ workItemId: string; frontmatterStatus: string }> }): DivergenceReport[];

  // -- entitlements (Phase 2, roadmap §3) ------------------------------------
  /** Governance authority: the system actor and 'admin' governance-role holders. */
  setGovernanceRole(input: { actorId: string; role: GovernanceRole; byActorId: string }): void;
  getGovernanceRole(actorId: string): GovernanceRole;
  /** Assign/revoke a delivery role (bundle of permissions). Gated writes; audited. */
  assignRole(input: { actorId: string; roleCode: string; byActorId: string }): void;
  revokeRole(input: { actorId: string; roleCode: string; byActorId: string }): void;
  listRoleAssignments(actorId?: string): RoleAssignment[];
  setPlan(input: { plan: PlanCode; byActorId: string }): void;
  getPlan(): PlanCode;
  setWorkspacePolicy(input: { policy: WorkspacePolicy; byActorId: string }): void;
  getWorkspacePolicy(): WorkspacePolicy;
  setGatePolicy(input: { gate: GateCode; policy: GatePolicy; byActorId: string }): void;
  getGatePolicy(gate: GateCode): GatePolicy;
  /** Pure decision trace — replayable by an auditor. Never mutates. */
  authzExplain(input: { actorId: string; permission: Permission }): AuthzExplanation;

  // -- queries -------------------------------------------------------------
  getWorkItem(id: string): WorkItem;
  getFeature(id: string): Feature;
  getClaims(workItemId: string): Claim[];
  /** Additive query surface (post-conformance): list/filter work items. */
  listWorkItems(filter?: { state?: WorkItemState; featureId?: string; claimable?: boolean }): WorkItem[];
  events(streamId?: string): SpineEvent[];
}
