export * from './version.js';
/**
 * @oahs/contracts — the single source of truth for every oahs command.
 *
 * One registry entry = one HTTP endpoint (`POST /rpc/<name>`) = one MCP tool
 * (`oahs_<name>`) = one typed client method. Both adapters call the same
 * command bus with the same zod-validated input, so "MCP semantics ≡ HTTP
 * semantics" is a structural consequence, not a review discipline
 * (product-roadmap.md §0.1 invariant, D5).
 *
 * Transport is deliberately uniform RPC (no REST path parameters): parity
 * between surfaces stays machine-checkable, and the parity test in
 * apps/spine-api asserts every registry entry exists on both surfaces.
 */
import { z } from 'zod';
import {
  BLOCKED_REASONS,
  FEATURE_STATES,
  WORK_ITEM_KINDS,
  WORK_ITEM_STATES,
  type SpineEngine,
} from '@oahs/core';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const workItemId = z.string().min(1).describe('Work item id (or its stories.yaml externalKey)');
const fencingToken = z
  .number()
  .int()
  .optional()
  .describe('Fencing token of the live claim — required for execution-zone mutations');

const evidenceSchema = z
  .object({
    kind: z.enum(['test_run', 'git_diff', 'commit', 'halt_report', 'review_report', 'doc_lint', 'intent_hash', 'pr', 'push_target']),
    payload: z.record(z.string(), z.unknown()),
  })
  .describe('Raw machine-collected evidence; the core computes verdicts, the runner never does');

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface CommandDef<Input extends z.ZodType = z.ZodType> {
  /** snake_case command name; HTTP path is /rpc/<name>, MCP tool is oahs_<name> */
  name: string;
  description: string;
  input: Input;
  /** true when the command only reads state (used for docs; same rails either way) */
  readonly: boolean;
}

function def<I extends z.ZodType>(
  name: string,
  description: string,
  input: I,
  readonly = false,
): CommandDef<I> {
  return { name, description, input, readonly };
}

export const COMMANDS = [
  // -- setup / admin ---------------------------------------------------------
  def(
    'create_actor',
    'Create a user or agent actor. Returns the actor and its API token (admin only).',
    z.object({
      type: z.enum(['user', 'agent']),
      displayName: z.string().min(1),
      governanceRole: z
        .enum(['admin', 'member', 'auditor'])
        .optional()
        .describe('Bootstrap plumbing (roadmap §3): initial governance role — admin context only'),
    }),
  ),
  def(
    'grant_permission',
    'Grant a permission to an actor (admin only). Grants are explicit and audited — authority never comes from actor type, tenure, or memory (thesis §3).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      // NOT enforced yet: sending a scope is REJECTED, not stored — grants apply globally,
      // so a scoped grant would be a silent lie. See bus.ts rejectUnenforcedScope.
      scope: z.string().optional(),
    }),
  ),
  def(
    'revoke_permission',
    'Revoke a permission from an actor (admin only).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      // NOT enforced (see grant_permission): a scope here is rejected, not applied.
      scope: z.string().optional(),
    }),
  ),
  // -- projects (Phase 7 Wave 2, D-E): the unit of parallel work ----------------
  def(
    'project_create',
    'Create a project — name + unique slug + kind, optionally bound to a repo (repoPath + defaultSpecFolder for the runner) and a §9.6 repo registry (gitUrl SSH + baseBranch + forge owner/repo for PR integration).',
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1).optional().describe('Addressable handle; derived from name when omitted'),
      kind: z.enum(['code', 'doc', 'mixed']).optional().describe("Default 'mixed'"),
      repoPath: z.string().optional(),
      defaultSpecFolder: z.string().optional(),
      gitUrl: z.string().optional().describe('Remote git URL (SSH), e.g. git@github.com:org/repo.git'),
      baseBranch: z.string().optional().describe('PR/merge target + dispatcher clone source (default main)'),
      forgeOwner: z.string().optional().describe('Forge owner (GitHub org/user)'),
      forgeRepo: z.string().optional().describe('Forge repo name'),
    }),
  ),
  def(
    'project_get',
    'One project by id OR slug.',
    z.object({ projectId: z.string().min(1) }),
    true,
  ),
  def(
    'project_list',
    'The portfolio question in one call: every project with its rollup — items by state, blocked count, live claims, gates awaiting a decision.',
    z.object({ includeArchived: z.boolean().optional() }),
    true,
  ),
  def(
    'project_update',
    'Update project name/kind/repo binding + the §9.6 repo registry (gitUrl/baseBranch/forge). The slug never moves.',
    z.object({
      projectId: z.string().min(1),
      name: z.string().min(1).optional(),
      kind: z.enum(['code', 'doc', 'mixed']).optional(),
      repoPath: z.string().optional(),
      defaultSpecFolder: z.string().optional(),
      gitUrl: z.string().optional(),
      baseBranch: z.string().optional(),
      forgeOwner: z.string().optional(),
      forgeRepo: z.string().optional(),
    }),
  ),
  def(
    'project_archive',
    'Archive a project: hidden from the default list, refuses new features; history stays readable.',
    z.object({ projectId: z.string().min(1) }),
  ),
  def(
    'create_feature',
    'Create a feature (maps a BMAD epic) inside a project — omitted projectId attaches to the default project.',
    z.object({
      projectId: z.string().min(1).optional().describe('Project id or slug'),
      name: z.string().min(1).optional(),
    }),
  ),
  def(
    'create_work_item',
    'Create a single work item. kind selects WHICH machine-evidence guards apply (Phase 4) — never WHO may pass a gate.',
    z.object({
      featureId: z.string().min(1),
      externalKey: z.string().min(1),
      title: z.string().min(1),
      kind: z.enum(WORK_ITEM_KINDS).optional().describe("Work-item kind; default 'code'"),
      specCheckpoint: z.boolean().optional(),
      doneCheckpoint: z.boolean().optional(),
      invokeDevWith: z.string().optional(),
      dependsOn: z.array(z.string().min(1)).optional().describe('externalKeys this item depends on'),
    }),
  ),
  def(
    'list_actors',
    'List ALL actors — humans, agents, personas, and the system actor (transparency for pickers/audit).',
    z.object({}),
    true,
  ),
  def(
    'provision_personas',
    'Idempotently provision the six BMAD personas as agent actors with floor-state roles (gated by engine governance; zero gate authority).',
    z.object({}),
  ),
  def(
    'import_stories',
    'Import a stories.yaml file into a feature (idempotent re-import; validity rules from stories-schema.md).',
    z.object({
      featureId: z.string().min(1),
      yaml: z.string().min(1),
    }),
  ),

  // -- claims ----------------------------------------------------------------
  def(
    'claim_task',
    'Claim a work item under a lease. Returns the claim with its fencing token.',
    z.object({
      workItemId,
      ttlMs: z.number().int().positive().optional(),
    }),
  ),
  def(
    'claim_review',
    'Claim an in_review item for review (§9.4, kind=review). Requires gate.review.approve OR .reject. One live review claim per item — two concurrent calls: one wins, the loser gets a 409.',
    z.object({
      workItemId,
      ttlMs: z.number().int().positive().optional(),
    }),
  ),
  def(
    'heartbeat',
    'Renew the lease of a live claim (the holder, or a caller presenting the live fencing token).',
    z.object({ claimId: z.string().min(1), fencingToken: z.number().int().optional() }),
  ),
  def(
    'release_claim',
    'Release a claim (normal completion or voluntary handoff; the holder, or a valid fencing token).',
    z.object({
      claimId: z.string().min(1),
      fencingToken: z.number().int().optional(),
      reason: z.string().optional(),
    }),
  ),
  def(
    'mint_claim_token',
    'Mint a JOB-BOUND token for a claim you hold (§10.1): scoped to this claim, a fixed dispatch-mutation allowlist, and the lease expiry. The container/runner uses it for all dispatch mutations — it can never escalate beyond the claim or mint another token.',
    z.object({ claimId: z.string().min(1) }),
  ),

  // -- lifecycle ---------------------------------------------------------------
  def(
    'advance_state',
    'Advance a work item through the FSM. Deterministic: permission + guards + evidence decide, never interpretation.',
    z.object({
      workItemId,
      to: z.enum(WORK_ITEM_STATES),
      fencingToken,
      idempotencyKey: z.string().optional(),
    }),
  ),
  def(
    'block_task',
    'Set the blocked overlay with a blocking condition from the HALT taxonomy.',
    z.object({
      workItemId,
      reason: z.enum(BLOCKED_REASONS),
      fencingToken,
    }),
  ),
  def('unblock_task', 'Clear the blocked overlay (review_non_convergence needs the review gate grant).', z.object({ workItemId })),
  def(
    'submit_evidence',
    'Submit raw machine-collected evidence (exit codes, diff stats, shas). The core computes verdicts.',
    z.object({ workItemId, evidence: evidenceSchema, fencingToken }),
  ),
  def(
    'approve_gate',
    'Approve a gate as a permitted actor. spec_approval pins the verification commands (D7) and fires draft→ready_for_dev; review_approval checks pinned evidence and fires in_review→done.',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
      pinnedVerification: z.array(z.string()).optional(),
    }),
  ),
  def(
    'reject_gate',
    'Reject a gate as a permitted actor. Review rejection fires the loopback as a system effect (or blocks with review_non_convergence on the 6th).',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
    }),
  ),
  def(
    'release_dispatch_hold',
    'Release a done_checkpoint dispatch hold on a feature (permitted actors only).',
    z.object({ featureId: z.string().min(1) }),
  ),

  // -- feature FSM (Phase 9, roadmap §9) ----------------------------------------
  def(
    'feature_advance',
    'Advance a feature along a permitted non-gated edge (backlog→spec→design, breakdown→executing, executing→handoff). Gate-fired arrows use approve_feature_gate.',
    z.object({
      featureId: z.string().min(1),
      to: z.enum(FEATURE_STATES),
    }),
  ),
  def(
    'approve_feature_gate',
    'Approve a feature gate: design_approval fires design→breakdown (In-TDD checkpoint: verification must be pinned); handoff_approval fires handoff→done. Quorum is gate-policy data (§3).',
    z.object({
      featureId: z.string().min(1),
      gate: z.enum(['design_approval', 'handoff_approval']),
    }),
  ),
  def(
    'reject_feature_gate',
    'Reject a feature gate: fires the one-step loopback as a system effect (design_approval→spec, handoff_approval→executing) and resets the quorum round.',
    z.object({
      featureId: z.string().min(1),
      gate: z.enum(['design_approval', 'handoff_approval']),
    }),
  ),
  def(
    'cancel_feature',
    'Cancel a feature (privileged, feature.cancel): terminal `cancelled` from any non-terminal state — a compensating event recording a product decision.',
    z.object({
      featureId: z.string().min(1),
      reason: z.string().optional(),
    }),
  ),
  def(
    'rebaseline_intent',
    'Re-pin a work item’s intent hash after a legitimate spec renegotiation (gated on intent.edit, §9.3). The measuring side computes the canonical hash of the frozen region; the core stores it and appends intent.rebaselined.',
    z.object({
      workItemId,
      hash: z.string().min(1).describe('Canonical intent hash, e.g. v1:<sha256>'),
    }),
  ),

  // -- entitlements (Phase 2, roadmap §3) ---------------------------------------
  // Authority for this group is decided by the ENGINE from the caller's
  // governance role ("entitlement = plan × governance role × delivery role,
  // resolved by a pure function over versioned config/data") — the bus never
  // pre-checks admin here.
  def(
    'assign_role',
    'Assign a delivery role (permission bundle, roadmap §3) to an actor. Gated write: requires governance-admin authority; audited.',
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1).describe('Delivery role code, e.g. reviewer | developer | product_owner'),
    }),
  ),
  def(
    'revoke_role',
    'Revoke a delivery role assignment from an actor. Gated write: requires governance-admin authority; audited.',
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1),
    }),
  ),
  def(
    'list_role_assignments',
    'List delivery-role assignments (all, or one actor’s), including revoked rows for audit.',
    z.object({ actorId: z.string().min(1).optional() }),
    true,
  ),
  def(
    'set_governance_role',
    'Set an actor’s governance role (admin | member | auditor). Gated write: requires governance-admin authority.',
    z.object({
      actorId: z.string().min(1),
      role: z.enum(['admin', 'member', 'auditor']),
    }),
  ),
  def(
    'set_plan',
    'Set the workspace plan. Plan is a CEILING, never a grant (roadmap §3): it bounds what agents may hold/exercise; users are never plan-filtered.',
    z.object({ plan: z.enum(['free', 'team', 'enterprise']) }),
  ),
  def(
    'set_workspace_policy',
    'Set restrict-only workspace policy keys (roadmap §3): a policy can narrow what the plan allows, never widen it.',
    z.object({
      policy: z.object({
        agentGateApprovals: z
          .boolean()
          .optional()
          .describe('false ⇒ agents cannot exercise gate-approval permissions even if granted'),
        agentSelfDispatch: z
          .boolean()
          .optional()
          .describe('false ⇒ agents cannot claim tasks on their own (mention-dispatch only)'),
      }),
    }),
  ),
  def(
    'set_gate_policy',
    'Set a gate definition as DATA (roadmap §3): min_approvals quorum and required_actor_types — human-only is a default, not a hardcode.',
    z.object({
      gate: z.enum(['spec_approval', 'review_approval', 'design_approval', 'handoff_approval']),
      policy: z.object({
        minApprovals: z.number().int().positive().optional().describe('distinct approvers required per review round'),
        requiredActorTypes: z
          .array(z.enum(['user', 'agent', 'system']))
          .optional()
          .describe('at least one approver of each listed type is required'),
        autoDispatchReviewer: z
          .string()
          .optional()
          .describe('§9.4: reviewer actor id — entering in_review materializes one review job per round for this actor'),
        requireMergedPr: z
          .boolean()
          .optional()
          .describe('§9.6: on review_approval, the done gate also requires the latest pr evidence to be a merge into the default branch'),
      }),
    }),
  ),
  def(
    'authz_explain',
    'Replayable authz decision trace (roadmap §3): source grant/role, plan ceiling, policy, and the policy version tuple an auditor can replay.',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
    }),
    true,
  ),

  // -- collaboration (Phase 3, roadmap §5) ---------------------------------------
  // The chat SURFACE over the same rails. Sacred boundary (§5.2): a message
  // NEVER mutates lifecycle; mentions are STRUCTURED actor ids — no server
  // code path ever parses message body text. Actor identity for every command
  // here comes from ctx (the authenticated token), never from the input.
  def(
    'create_thread',
    'Create a conversation thread, optionally bound to a feature/work item. kind=private defaults visibility to private.',
    z.object({
      kind: z.enum(['spec', 'design', 'task', 'general', 'private']),
      featureId: z.string().min(1).optional(),
      workItemId: workItemId.optional(),
      visibility: z.enum(['open', 'private']).optional(),
    }),
  ),
  def(
    'add_thread_participant',
    'Invite an actor into a thread (private threads: only existing participants may invite).',
    z.object({
      threadId: z.string().min(1),
      actorId: z.string().min(1),
    }),
  ),
  def(
    'post_message',
    'Post a chat message. `mentions` is structured actor ids (§5.2 — body text is never parsed); mentioning an agent runs the deterministic default-deny router (§5.4).',
    z.object({
      threadId: z.string().min(1),
      body: z.string().min(1),
      replyTo: z.string().min(1).optional(),
      mentions: z.array(z.string().min(1)).optional(),
    }),
  ),
  def(
    'list_threads',
    'List threads, optionally filtered by feature / work item. Private threads are visible only to their participants (ctx actor).',
    z.object({
      featureId: z.string().min(1).optional(),
      workItemId: workItemId.optional(),
    }),
    true,
  ),
  def(
    'list_messages',
    'List messages of a thread (optionally after a seq). Private threads require participation — the reader is ALWAYS the ctx actor.',
    z.object({
      threadId: z.string().min(1),
      sinceSeq: z.number().int().nonnegative().optional(),
    }),
    true,
  ),
  def(
    'list_mentions',
    'List the recorded mentions of a message with their router resolutions (notified | job_created | denied_policy | denied_depth).',
    z.object({ messageId: z.string().min(1) }),
    true,
  ),
  def(
    'list_notifications',
    'List the ctx actor’s OWN notifications (mentions + job completions).',
    z.object({ unreadOnly: z.boolean().optional() }),
    true,
  ),
  def(
    'mark_notification_read',
    'Mark one of the ctx actor’s own notifications as read.',
    z.object({ notificationId: z.string().min(1) }),
  ),
  def(
    'list_agent_jobs',
    'List router-materialized agent jobs (reply-only context — a job never carries lifecycle authority, §5.4). An expired job claim reads back as queued (§9.5).',
    z.object({
      agentActorId: z.string().min(1).optional(),
      status: z.enum(['queued', 'in_progress', 'done', 'blocked']).optional(),
    }),
    true,
  ),
  def(
    'claim_agent_job',
    'Claim a queued (or lease-expired) agent job — CAS to in_progress under the agent’s lease (§9.5). Two jobs loops racing: one wins, the loser gets a 409. Only the job’s own agent may claim. ttlMs should outlast the whole run so the lease never lapses mid-run.',
    z.object({ jobId: z.string().min(1), ttlMs: z.number().int().positive().optional() }),
  ),
  def(
    'complete_agent_job',
    'Complete an agent job (only the job’s agent — and, once claimed, the claimer — may). Completion notifies the mentioner — nothing else moves.',
    z.object({
      jobId: z.string().min(1),
      status: z.enum(['done', 'blocked']),
      note: z.string().optional(),
    }),
  ),

  // -- agent memory (Phase 5, roadmap §6) -----------------------------------------
  // Owner-scoped BY CONSTRUCTION: neither command takes an actor parameter —
  // the memory owner is ALWAYS the authenticated ctx actor. Learning never
  // becomes authority: these commands touch the memory store only, never a
  // grant, gate, or transition.
  def(
    'append_agent_memory',
    'Append a memory for the ctx agent actor (agents only). Learning from a private thread requires participation; memory events never carry content (§6).',
    z.object({
      kind: z.enum(['episodic', 'procedural', 'entity']),
      content: z.string().min(1),
      sourceThreadId: z
        .string()
        .min(1)
        .optional()
        .describe('Thread the memory was learned in — its visibility gates recall (§6)'),
      projectId: z
        .string()
        .min(1)
        .optional()
        .describe('Project (id or slug) the lesson belongs to; omitted = GLOBAL craft (D-H)'),
    }),
  ),
  def(
    'search_agent_memory',
    'Recall the ctx actor’s OWN memories. Private-sourced memories surface only when contextThreadId is their source thread (§6).',
    z.object({
      contextThreadId: z
        .string()
        .min(1)
        .optional()
        .describe('Thread the recall happens in — gates private-sourced memories'),
      kind: z.enum(['episodic', 'procedural', 'entity']).optional(),
      query: z.string().min(1).optional().describe('Case-insensitive substring filter'),
      projectId: z
        .string()
        .min(1)
        .optional()
        .describe('Scope recall to this project + global craft; omitted = everything (Phase 5)'),
    }),
    true,
  ),

  // -- reconciliation (roadmap §1.6, D6: detect-only) -----------------------------
  def(
    'reconcile',
    'Detect-only divergence report between file frontmatter statuses and DB states (never mutates; live-claimed items are excluded).',
    z.object({
      files: z.array(
        z.object({
          workItemId,
          frontmatterStatus: z.string().min(1),
        }),
      ),
    }),
    true,
  ),

  // -- ops (so nobody ever needs to touch the DB by hand) -----------------------
  def(
    'force_release_claim',
    'Ops: force-release the live claim of a work item (stuck runner, lost machine).',
    z.object({ workItemId }),
  ),

  // -- queries -----------------------------------------------------------------
  def('get_work_item', 'Fetch one work item by id or externalKey.', z.object({ workItemId }), true),
  def('get_feature', 'Fetch one feature.', z.object({ featureId: z.string().min(1) }), true),
  def(
    'feature_list',
    'List features (the board source, §9), optionally scoped to a project (id or slug).',
    z.object({
      projectId: z.string().optional().describe('Project id or slug — omitted lists every feature'),
    }),
    true,
  ),
  def(
    'get_task_context',
    'Dispatch context for a runner: entry state routing per dev-auto. Refuses done items and held features.',
    z.object({ workItemId }),
    true,
  ),
  def(
    'list_work_items',
    'List work items, optionally filtered by state / feature / project / claimability.',
    z.object({
      state: z.enum(WORK_ITEM_STATES).optional(),
      featureId: z.string().optional(),
      projectId: z.string().optional().describe('Project id or slug — spans every feature of the project'),
      claimable: z.boolean().optional().describe('true = no live claim on the item'),
    }),
    true,
  ),
  def(
    'inbox',
    'Gate-holder inbox: items awaiting a gate decision (draft+spec_checkpoint awaiting spec approval; in_review awaiting review decision).',
    z.object({}),
    true,
  ),
  def(
    'query_events',
    'Audit query: the append-only event log, optionally scoped to one stream.',
    z.object({ streamId: z.string().optional() }),
    true,
  ),
  def('get_claims', 'All claims (live and released) of a work item.', z.object({ workItemId }), true),
  def(
    'list_claims',
    'Workspace-wide claims view — live only by default; includeReleased for history.',
    z.object({ includeReleased: z.boolean().optional() }),
    true,
  ),
  def(
    'list_evidence',
    'A work item’s raw evidence in submission order (halt_report, test_run, git_diff, commit, doc_lint …).',
    z.object({ workItemId }),
    true,
  ),
  def('whoami', 'Resolve the authenticated actor.', z.object({}), true),
  // -- runner liveness (Wave 3): operational state, zero lifecycle authority ----
  def(
    'runner_announce',
    'Announce a worker process (identity from the token). Returns runnerId for heartbeats. Operational only — no event, no authority.',
    z.object({
      mode: z.enum(['coding', 'jobs']),
      projectId: z.string().min(1).optional().describe('Project the runner is bound to (id or slug)'),
      repoPath: z.string().optional(),
      host: z.string().optional(),
      pid: z.number().int().optional(),
    }),
  ),
  def(
    'runner_heartbeat',
    'Renew a runner’s liveness. Unknown runnerId (server restarted) is a GuardFailedError — re-register.',
    z.object({ runnerId: z.string().min(1) }),
  ),
  def(
    'list_runners',
    'Every registered runner with lastSeenAt — "which workers are alive, on what" for the cockpit.',
    z.object({}),
    true,
  ),
  def(
    'list_tokens',
    'ADMIN: issued-token inventory (actor id + count) — hashes stay server-side, secrets are never returned.',
    z.object({}),
    true,
  ),
  def(
    'reissue_token',
    'ADMIN: revoke an actor’s issued tokens and return one fresh token (lost-credential recovery).',
    z.object({ actorId: z.string() }),
  ),
] as const;

export type CommandName = (typeof COMMANDS)[number]['name'];

export const COMMAND_MAP: ReadonlyMap<string, CommandDef> = new Map(
  COMMANDS.map((c) => [c.name, c as CommandDef]),
);

/** MCP tool name for a command (uniform prefix, D11 vocabulary). */
export function mcpToolName(command: string): string {
  return `oahs_${command}`;
}

/** JSON Schema for a command input (zod v4 native emitter) — used verbatim as the MCP tool inputSchema. */
export function inputJsonSchema(command: string): Record<string, unknown> {
  const defn = COMMAND_MAP.get(command);
  if (!defn) throw new Error(`unknown command: ${command}`);
  return z.toJSONSchema(defn.input) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Wire envelope
// ---------------------------------------------------------------------------

/**
 * Every rejection crosses the wire as a machine-readable envelope carrying
 * the core error class name — clients rethrow the proper class, so error
 * semantics survive the transport (409 for conflicts, 403 for permission,
 * 422 for guards/transitions/validation).
 */
export interface ErrorEnvelope {
  ok: false;
  error: {
    name:
      | 'PermissionDeniedError'
      | 'GuardFailedError'
      | 'ConflictError'
      | 'InvalidTransitionError'
      | 'StoriesValidationError'
      | 'Error';
    message: string;
  };
}

export interface OkEnvelope<T = unknown> {
  ok: true;
  result: T;
}

export type Envelope<T = unknown> = OkEnvelope<T> | ErrorEnvelope;

export const HTTP_STATUS: Record<ErrorEnvelope['error']['name'], number> = {
  PermissionDeniedError: 403,
  ConflictError: 409,
  GuardFailedError: 422,
  InvalidTransitionError: 422,
  StoriesValidationError: 422,
  Error: 500,
};

// ---------------------------------------------------------------------------
// Command bus contract (implemented in apps/spine-api, consumed by adapters)
// ---------------------------------------------------------------------------

export interface ActorContext {
  actorId: string;
  isAdmin: boolean;
  /**
   * §10.1 job-bound scope, present only for a scoped (claim-bound) token. The
   * bus enforces `command ∈ allowedCommands` and, for claim-bearing commands,
   * `claimId` match — so a container's token can act only on its own claim.
   */
  scope?: {
    claimId: string;
    workItemId: string;
    allowedCommands: readonly string[];
  };
}

/**
 * The one place commands execute. HTTP and MCP are thin parsers in front of
 * this; nothing else writes state (§0.1 "no writes outside the command bus").
 */
export interface CommandBus {
  execute(command: string, input: unknown, ctx: ActorContext): Promise<unknown>;
  readonly engine: SpineEngine;
}

// ---------------------------------------------------------------------------
// Typed client (used by the oahs CLI, the runner, and tests)
// ---------------------------------------------------------------------------

export interface ClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class OahsRemoteError extends Error {
  constructor(
    public readonly errorName: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = errorName;
  }
}

export interface OahsClient {
  call<T = unknown>(command: CommandName, input?: unknown): Promise<T>;
}

export function makeClient(options: ClientOptions): OahsClient {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    async call<T>(command: CommandName, input: unknown = {}): Promise<T> {
      const response = await doFetch(`${options.baseUrl}/rpc/${command}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.token}`,
        },
        body: JSON.stringify(input),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.result;
      throw new OahsRemoteError(envelope.error.name, envelope.error.message, response.status);
    },
  };
}
