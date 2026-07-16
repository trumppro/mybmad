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
    public readonly from: WorkItemState | FeatureState,
    public readonly to: WorkItemState | FeatureState,
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

/**
 * The feature (epic) FSM (roadmap §9): the department handoff as gate-fired
 * states. `executing` is the former `in_progress` (renamed for portal-vocabulary
 * parity — "In Implementation"). `cancelled` is terminal, reachable from every
 * non-terminal state via the privileged `feature.cancel`. Board labels (In
 * Design / In TDD / Ready for Impl / …) are a presentation map over these,
 * never new states.
 */
export const FEATURE_STATES = [
  'backlog',
  'spec',
  'design',
  'breakdown',
  'executing',
  'handoff',
  'done',
  'cancelled',
] as const;
export type FeatureState = (typeof FEATURE_STATES)[number];

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
  | 'gate.design.approve' // Phase 9 §9: tech-lead approves the feature design (design→breakdown)
  | 'gate.handoff.approve' // Phase 9 §9: PO feature acceptance (handoff→done)
  | 'feature.init'
  | 'feature.advance'
  | 'feature.cancel' // Phase 9 §9: privileged cancel — a product decision, from any non-terminal state
  | 'dispatch.release_hold'
  | 'intent.edit'
  | 'state.downgrade'
  | 'ops.force_release_claim'
  | 'governance.admin' // Phase 2: authority over gated entitlement writes (held via governance role, not grants)
  // Phase 3 identity/visibility authorities (checked structurally, not via grants):
  | 'thread.post'
  | 'thread.read'
  | 'thread.invite'
  | 'agent_job.complete';

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
  product_owner: ['task.plan', 'feature.init', 'feature.advance', 'gate.spec.approve', 'gate.handoff.approve', 'feature.cancel', 'dispatch.release_hold'],
  tech_lead: ['task.plan', 'gate.review.approve', 'gate.review.reject', 'gate.design.approve', 'state.downgrade', 'ops.force_release_claim'],
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
  /** false ⇒ mentions of agents never materialize jobs (Phase 3 router kill-switch) */
  mentionDispatch?: boolean;
  /** true ⇒ an agent's mention of another agent may materialize a job (depth-capped); default OFF (§5.4) */
  agentMentionAgent?: boolean;
}

/** Gate definitions are data (roadmap §3): quorum + actor-type requirements. */
export interface GatePolicy {
  /** distinct approvers required in the current review round (default 1) */
  minApprovals?: number;
  /** at least one approver of each listed type is required (e.g. ['user']) */
  requiredActorTypes?: ActorType[];
  /**
   * §9.4: when set on the review_approval gate, entering `in_review` materializes
   * exactly one review agent_job per review round for this reviewer actor.
   */
  autoDispatchReviewer?: string;
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

export type GateCode = 'spec_approval' | 'review_approval' | 'design_approval' | 'handoff_approval';

export type EvidenceKind =
  | 'test_run' // {command, exitCode}  — command MUST match a pinned one
  | 'git_diff' // {baseline, final, filesChanged, nonEmpty, branch}
  | 'commit' // {sha, branch, reachableOnRemote}
  | 'halt_report' // verbatim Auto Run Result
  | 'review_report' // LLM-authored; NEVER a guard, context only
  | 'doc_lint' // {schemaValid} for non-code work
  | 'intent_hash'; // {algo, hash} — the measuring side's canonical frozen-region hash (§9.3)

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
  /** Playbook persona this agent embodies (e.g. 'bmad-agent-pm'); null for humans and plain agents. */
  personaCode: string | null;
}

// ---------------------------------------------------------------------------
// Work-item kinds (Phase 4, roadmap Build phases): the worker broadens.
// Kind selects WHICH machine-evidence guards apply — never WHO may pass a
// gate (that stays grants + gate policy).
// ---------------------------------------------------------------------------

export const WORK_ITEM_KINDS = ['code', 'spec_draft', 'design_review', 'qa_report', 'doc'] as const;
export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];

/**
 * The six BMAD personas provision as default agent actors per workspace
 * (roadmap §3). Floor-state defaults (thesis): Amelia holds `developer`;
 * everyone else `contributor`; NO persona holds a gate until a permitted
 * actor grants one.
 */
export interface PersonaDef {
  personaCode: string; // BMAD playbook skill
  displayName: string;
  defaultRole: keyof typeof DELIVERY_ROLES;
}

export const PERSONAS: readonly PersonaDef[] = [
  { personaCode: 'bmad-agent-analyst', displayName: 'Mary (Analyst)', defaultRole: 'contributor' },
  { personaCode: 'bmad-agent-tech-writer', displayName: 'Paige (Tech Writer)', defaultRole: 'contributor' },
  { personaCode: 'bmad-agent-pm', displayName: 'John (PM)', defaultRole: 'contributor' },
  { personaCode: 'bmad-agent-ux-designer', displayName: 'Sally (UX)', defaultRole: 'contributor' },
  { personaCode: 'bmad-agent-architect', displayName: 'Winston (Architect)', defaultRole: 'contributor' },
  { personaCode: 'bmad-agent-dev', displayName: 'Amelia (Dev)', defaultRole: 'developer' },
];

// ---------------------------------------------------------------------------
// Project (Phase 7 "Cockpit" Wave 2, D-E) — the unit of PARALLEL WORK for one
// operator: name + slug + kind + optional repo binding, holding many features
// (BMAD epics). Features created without a project attach to the lazily
// created default project, which is how every pre-Wave-2 flow keeps its
// meaning.
// ---------------------------------------------------------------------------

export type ProjectKind = 'code' | 'doc' | 'mixed';

export const DEFAULT_PROJECT_SLUG = 'default';

export interface Project {
  id: string;
  name: string;
  /** Unique addressable handle (kebab); never silently changes on rename. */
  slug: string;
  kind: ProjectKind;
  /** Local checkout the runner binds to (solo/BYO posture) — optional. */
  repoPath: string | null;
  /** Spec folder relative to repoPath, e.g. delivery/my-feature. */
  defaultSpecFolder: string | null;
  state: 'active' | 'archived';
}

export interface Feature {
  id: string;
  projectId: string;
  /** Optional human name — features stop being anonymous (Wave 2). */
  name: string | null;
  state: FeatureState;
  /** true while a done_checkpoint hold is active: no further dispatch in this feature */
  dispatchHold: boolean;
}

export interface WorkItem {
  id: string;
  featureId: string;
  externalKey: string; // id from stories.yaml, e.g. "3-2"
  kind: WorkItemKind; // 'code' unless created otherwise — selects evidence guards (Phase 4)
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

/** Claim kind (§9.4): a work claim serializes execution; a review claim serializes reviewer dispatch. */
export type ClaimKind = 'work' | 'review';

export interface Claim {
  id: string;
  workItemId: string;
  actorId: string;
  /** 'work' by default; 'review' for reviewer-dispatch claims (§9.4). One live claim per (item, kind). */
  kind: ClaimKind;
  fencingToken: number;
  leaseExpiresAt: number; // engine-clock ms
  released: boolean;
  /**
   * Computed by listClaims against the ENGINE clock: unreleased but past
   * TTL — the dead-runner shape ops must SEE (Wave 2). Absent elsewhere.
   */
  expired?: boolean;
}

export interface SpineEvent {
  globalSeq: number;
  streamType: 'workspace' | 'project' | 'feature' | 'work_item' | 'actor' | 'thread' | 'agent_job';
  streamId: string;
  streamSeq: number;
  type: string;
  actorId: string;
  payload: Record<string, unknown>;
  /**
   * Wall-clock ms stamped at append. OBSERVATIONAL audit metadata only —
   * no guard, transition, lease, or entitlement decision may read it; the
   * engine's logical clock stays the only time source for lease logic.
   * Rows persisted before Phase 7 Wave 1 carry 0.
   */
  occurredAt: number;
  causationId?: string;
}

// ---------------------------------------------------------------------------
// Collaboration (Phase 3, roadmap §5): the chat SURFACE. Sacred boundary
// (§5.2): a message NEVER mutates lifecycle; the only cross-direction is
// rails → chat (system narration). Mentions are STRUCTURED data — the server
// never parses message text.
// ---------------------------------------------------------------------------

export type ThreadKind = 'spec' | 'design' | 'task' | 'general' | 'private';
export type ThreadVisibility = 'open' | 'private';

export interface Thread {
  id: string;
  featureId: string | null;
  workItemId: string | null;
  kind: ThreadKind;
  visibility: ThreadVisibility;
  createdBy: string;
  participants: string[]; // enforced for private threads; informational for open ones
}

export interface Message {
  id: string;
  threadId: string;
  seq: number; // per-thread, 1-based, gap-free
  authorId: string; // a user OR an agent (thesis §5.3) — or the system actor for narration
  kind: 'chat' | 'system';
  body: string;
  replyTo: string | null;
}

/** Why a mention did or did not materialize an agent job (§5.4 router — pure code). */
export type MentionResolution =
  | 'notified' // human mentioned → notification only
  | 'job_created' // agent mentioned, router policy allows → agent_job queued
  | 'denied_policy' // default-deny: mentioner lacks invoke authority, or policy off
  | 'denied_depth'; // agent-mention-agent chain exceeded the depth cap

export interface Mention {
  messageId: string;
  mentionedActorId: string;
  resolution: MentionResolution;
}

export interface Notification {
  id: string;
  actorId: string;
  source: 'mention' | 'job_completed';
  refId: string; // messageId for mentions, jobId for completions
  read: boolean;
}

/**
 * Router-materialized work for an agent (§5.4). Reply-only context: the job
 * NEVER carries a claim or pre-authorized lifecycle authority — the agent
 * mutates state only through its own grants, or not at all.
 */
export interface AgentJob {
  id: string;
  agentActorId: string;
  /** null for a review job (§9.4): materialized from an in_review transition, not a mention. */
  threadId: string | null;
  messageId: string | null; // the triggering mention (null for a review job)
  workItemId: string | null; // context when the thread is task-bound (always set for a review job)
  featureId: string | null;
  /** §9.5: `in_progress` = claimed under a lease; an EXPIRED lease reads back as `queued`. */
  status: 'queued' | 'in_progress' | 'done' | 'blocked';
  depth: number; // 0 = human-triggered; +1 per agent-mention-agent hop
  /** review round (§9.4): non-null marks a REVIEW job; one per (workItemId, reviewRound) by constraint. */
  reviewRound: number | null;
  /** §9.5: the agent that holds the live claim on this job (null when unclaimed). */
  claimedBy: string | null;
  /** §9.5: engine-clock ms when the job claim lapses; past it the job frees to `queued` (lazy on read). */
  claimExpiresAt: number | null;
  /** §9.5: optimistic-concurrency counter for the claim CAS. */
  stateVersion: number;
  note: string | null;
}

/** §9.5: an agent-job claim lease — the reaper generalizes in Phase 10.4. */
export const AGENT_JOB_CLAIM_TTL_MS = 10 * 60 * 1000;

/** Depth cap for agent-mention-agent chains (§5.4: "depth counter"). */
export const AGENT_JOB_MAX_DEPTH = 2;

// ---------------------------------------------------------------------------
// Agent memory (Phase 5, roadmap §6): the worker DEEPENS. Memory makes the
// worker better, never more authorized — authority comes only from grants,
// and the memory API has no path to them. Enforced by architecture: owner-
// scoped reads, no cross-actor parameter, content never enters the shared
// event log.
// ---------------------------------------------------------------------------

export type MemoryKind = 'episodic' | 'procedural' | 'entity';

export interface AgentMemory {
  id: string;
  agentActorId: string;
  kind: MemoryKind;
  content: string;
  /** Thread the memory was learned in, when applicable. */
  sourceThreadId: string | null;
  /** Visibility of the source context at learn time — recall filters on it (§6). */
  sourceVisibility: ThreadVisibility | null;
  /** Project the lesson belongs to; null = GLOBAL craft, recalled everywhere (D-H). */
  projectId: string | null;
  /** Per-agent, 1-based, append order. */
  seq: number;
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
  kind?: WorkItemKind; // default 'code'
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

/** Feature FSM commands (roadmap §9): the feature analogue of AdvanceInput/GateDecisionInput. */
export interface FeatureAdvanceInput {
  featureId: string;
  to: FeatureState;
  actorId: string;
}

export interface FeatureGateDecisionInput {
  featureId: string;
  /** design_approval | handoff_approval — the two feature-level gate codes. */
  gate: GateCode;
  actorId: string;
}

export interface SpineEngine {
  /** Audit a TokenStore credential op (issued|reissued) with a hash prefix only (§8). */
  noteTokenEvent(input: { actorId: string; kind: 'issued' | 'reissued'; tokenHashPrefix: string }): void;
  // -- setup ---------------------------------------------------------------
  createActor(input: {
    type: Exclude<ActorType, 'system'>;
    displayName: string;
    /** bootstrap plumbing (like createActor itself); default 'member' */
    governanceRole?: GovernanceRole;
    personaCode?: string;
  }): Actor;
  /** All actors, personas and system included (transparency for pickers/audit). */
  listActors(): Actor[];
  /** Idempotently create the six BMAD persona agent actors with floor-state roles (gated write). */
  provisionPersonas(input: { byActorId: string }): Actor[];
  grant(input: { actorId: string; permission: Permission; scope?: string }): void;
  revoke(input: { actorId: string; permission: Permission; scope?: string }): void;
  // -- projects (Phase 7 Wave 2, D-E) -----------------------------------------
  createProject(input: {
    actorId: string;
    name: string;
    slug?: string;
    kind?: ProjectKind;
    repoPath?: string;
    defaultSpecFolder?: string;
  }): Project;
  /** Resolves by id OR slug. */
  getProject(input: { projectId: string }): Project;
  listProjects(input?: { includeArchived?: boolean }): Project[];
  updateProject(input: {
    actorId: string;
    projectId: string;
    name?: string;
    kind?: ProjectKind;
    repoPath?: string;
    defaultSpecFolder?: string;
  }): Project;
  archiveProject(input: { actorId: string; projectId: string }): Project;

  /** projectId (id or slug) optional — absent attaches to the default project. */
  createFeature(input: { actorId: string; projectId?: string; name?: string }): Feature;
  createWorkItem(input: CreateWorkItemInput & { actorId: string }): WorkItem;

  /** Import stories.yaml content (raw YAML string). Idempotent re-import per stories-schema update semantics. */
  importStories(input: { featureId: string; yaml: string; actorId: string }): StoriesImportResult;

  // -- claims (roadmap §1.3) -------------------------------------------------
  claimTask(input: { workItemId: string; actorId: string; ttlMs?: number }): Claim;
  /** §9.4: claim an in_review item for review (kind='review'); requires gate.review.approve OR .reject. One live review claim per item by constraint. */
  claimReview(input: { workItemId: string; actorId: string; ttlMs?: number }): Claim;
  heartbeat(input: { claimId: string; actorId: string; fencingToken?: number }): void;
  releaseClaim(input: { claimId: string; actorId: string; fencingToken?: number; reason?: string }): void;
  /** Privileged ops recovery (roadmap §8): gated on `ops.force_release_claim`. */
  forceReleaseClaim(input: { workItemId: string; actorId: string }): { released: string[] };
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

  // -- feature FSM (Phase 9, roadmap §9) --------------------------------------
  /** Move a feature along a permitted non-gated edge (backlog→spec→design, breakdown→executing, executing→handoff). */
  featureAdvance(input: FeatureAdvanceInput): Feature;
  /** Approve a feature gate: design_approval fires design→breakdown (In-TDD checkpoint); handoff_approval fires handoff→done. */
  approveFeatureGate(input: FeatureGateDecisionInput): Feature;
  /** Reject a feature gate: fires the one-step loopback as a system effect (design→spec / handoff→executing). */
  rejectFeatureGate(input: FeatureGateDecisionInput): Feature;
  /** Privileged cancel (gated on feature.cancel): terminal `cancelled` from any non-terminal state; a compensating event. */
  cancelFeature(input: { featureId: string; actorId: string; reason?: string }): Feature;

  /** Re-pin a work item's intent hash after a legitimate spec renegotiation (gated on intent.edit, §9.3). */
  rebaselineIntent(input: { workItemId: string; hash: string; actorId: string }): WorkItem;

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

  // -- collaboration (Phase 3, roadmap §5) -------------------------------------
  createThread(input: {
    actorId: string;
    kind: ThreadKind;
    featureId?: string;
    workItemId?: string;
    visibility?: ThreadVisibility;
  }): Thread;
  addThreadParticipant(input: { threadId: string; actorId: string; byActorId: string }): Thread;
  /**
   * Post a message. `mentions` is STRUCTURED (actor ids) — the server never
   * parses body text (§5.2). Mentioning an agent runs the deterministic
   * router (§5.4): default-deny, policy-gated, depth-capped.
   */
  postMessage(input: {
    threadId: string;
    actorId: string;
    body: string;
    replyTo?: string;
    mentions?: string[];
  }): Message;
  listThreads(filter?: { featureId?: string; workItemId?: string; actorId?: string }): Thread[];
  listMessages(input: { threadId: string; actorId: string; sinceSeq?: number }): Message[];
  listMentions(messageId: string): Mention[];
  listNotifications(input: { actorId: string; unreadOnly?: boolean }): Notification[];
  markNotificationRead(input: { notificationId: string; actorId: string }): void;
  listAgentJobs(filter?: { agentActorId?: string; status?: AgentJob['status'] }): AgentJob[];
  /**
   * §9.5: claim a queued (or lease-expired) job — CAS to in_progress under the
   * agent's lease. Races lose (ConflictError). The caller SHOULD size ttlMs to
   * outlast its whole run (the runner passes agentTimeout + margin) so the lease
   * never lapses mid-run and re-opens the job to a second loop.
   */
  claimAgentJob(input: { jobId: string; actorId: string; ttlMs?: number }): AgentJob;
  /** Only the job's agent (and, once claimed, the claimer) may complete it; completion notifies the mentioner. */
  completeAgentJob(input: { jobId: string; actorId: string; status: 'done' | 'blocked'; note?: string }): AgentJob;

  // -- agent memory (Phase 5, roadmap §6) ----------------------------------------
  /**
   * Agents only; learning from a private thread requires having been in it.
   * projectId (id or slug) scopes the lesson to a project; omitted = GLOBAL
   * craft (D-H).
   */
  appendAgentMemory(input: {
    actorId: string;
    kind: MemoryKind;
    content: string;
    sourceThreadId?: string;
    projectId?: string;
  }): AgentMemory;
  /**
   * Owner-scoped recall: always and only the caller's memories. Private-
   * sourced memories surface ONLY when recalled inside their source thread —
   * nothing learned in a private thread surfaces in an open context (§6).
   * projectId scopes recall to that project + global; omitted keeps the
   * Phase-5 meaning (everything the owner has).
   */
  searchAgentMemory(input: {
    actorId: string;
    contextThreadId?: string;
    kind?: MemoryKind;
    query?: string;
    projectId?: string;
  }): AgentMemory[];

  // -- queries -------------------------------------------------------------
  getWorkItem(id: string): WorkItem;
  getFeature(id: string): Feature;
  /** List features, optionally scoped to a project (id or slug) — the board's source (§9). */
  listFeatures(filter?: { projectId?: string }): Feature[];
  getClaims(workItemId: string): Claim[];
  /** Workspace-wide claims view: live only by default (the "what is being worked on" query). */
  listClaims(input?: { includeReleased?: boolean }): Claim[];
  /** A work item's raw evidence in submission order (the detail view's source). */
  listEvidence(workItemId: string): Evidence[];
  /** Additive query surface (post-conformance): list/filter work items. */
  listWorkItems(filter?: {
    state?: WorkItemState;
    featureId?: string;
    /** id or slug — spans every feature of the project. */
    projectId?: string;
    claimable?: boolean;
  }): WorkItem[];
  events(streamId?: string): SpineEvent[];
  /** Events visible to an actor: the log minus private-thread streams they can't see (§8). */
  eventsVisibleTo(actorId: string, streamId?: string): SpineEvent[];
  /** Per-event visibility check (§8) — used by the SSE relay to filter each new event. */
  isEventVisibleTo(event: SpineEvent, actorId: string): boolean;
}
