/**
 * The command bus — the ONE place commands execute (roadmap §0.1: no writes
 * outside the command bus). HTTP (/rpc/:command) and MCP (oahs_* tools) are
 * thin parsers in front of execute(); neither carries its own logic.
 *
 * Actor identity ALWAYS comes from the authenticated context, never from the
 * request body — a lifecycle command can only act as the actor whose token
 * signed the request.
 */
import {
  GuardFailedError,
  PermissionDeniedError,
  type ActorType,
  type AgentJob,
  type BlockedReason,
  type Evidence,
  type GateCode,
  type GovernanceRole,
  type MemoryKind,
  type Permission,
  type PlanCode,
  type SpineEngine,
  type ThreadKind,
  type ThreadVisibility,
  type WorkItemKind,
  type WorkItemState,
} from '@oahs/core';
import { COMMAND_MAP, type ActorContext, type CommandBus, type CommandName } from '@oahs/contracts';

import type { TokenStore } from './auth.js';
import { RunnerRegistry } from './runners.js';

// Parsed-input shapes (mirror the zod schemas in @oahs/contracts; the zod
// parse in execute() is the runtime guarantee, these are the static view).
interface CreateActorIn { type: 'user' | 'agent'; displayName: string; governanceRole?: GovernanceRole | undefined }
interface GrantIn { actorId: string; permission: string; scope?: string | undefined }
interface RoleIn { actorId: string; roleCode: string }
interface ListRoleAssignmentsIn { actorId?: string | undefined }
interface SetGovernanceRoleIn { actorId: string; role: GovernanceRole }
interface SetPlanIn { plan: PlanCode }
interface SetWorkspacePolicyIn {
  policy: { agentGateApprovals?: boolean | undefined; agentSelfDispatch?: boolean | undefined };
}
interface SetGatePolicyIn {
  gate: GateCode;
  policy: { minApprovals?: number | undefined; requiredActorTypes?: ActorType[] | undefined };
}
interface AuthzExplainIn { actorId: string; permission: string }
interface ImportStoriesIn { featureId: string; yaml: string }
interface CreateWorkItemIn {
  featureId: string;
  externalKey: string;
  title: string;
  kind?: WorkItemKind | undefined;
  specCheckpoint?: boolean | undefined;
  doneCheckpoint?: boolean | undefined;
  invokeDevWith?: string | undefined;
  dependsOn?: string[] | undefined;
}
interface ClaimTaskIn { workItemId: string; ttlMs?: number | undefined }
interface HeartbeatIn { claimId: string }
interface ReleaseClaimIn { claimId: string; reason?: string | undefined }
interface AdvanceIn { workItemId: string; to: WorkItemState; fencingToken?: number | undefined; idempotencyKey?: string | undefined }
interface BlockIn { workItemId: string; reason: BlockedReason; fencingToken?: number | undefined }
interface WorkItemIn { workItemId: string }
interface SubmitEvidenceIn { workItemId: string; evidence: Evidence; fencingToken?: number | undefined }
interface ApproveGateIn { workItemId: string; gate: GateCode; pinnedVerification?: string[] | undefined }
interface RejectGateIn { workItemId: string; gate: GateCode }
interface FeatureIn { featureId: string }
interface ListWorkItemsIn { state?: WorkItemState | undefined; featureId?: string | undefined; projectId?: string | undefined; claimable?: boolean | undefined }
interface QueryEventsIn { streamId?: string | undefined }
interface CreateThreadIn {
  kind: ThreadKind;
  featureId?: string | undefined;
  workItemId?: string | undefined;
  visibility?: ThreadVisibility | undefined;
}
interface AddThreadParticipantIn { threadId: string; actorId: string }
interface PostMessageIn {
  threadId: string;
  body: string;
  replyTo?: string | undefined;
  mentions?: string[] | undefined;
}
interface ListThreadsIn { featureId?: string | undefined; workItemId?: string | undefined }
interface ListMessagesIn { threadId: string; sinceSeq?: number | undefined }
interface ListMentionsIn { messageId: string }
interface ListNotificationsIn { unreadOnly?: boolean | undefined }
interface MarkNotificationReadIn { notificationId: string }
interface ListAgentJobsIn { agentActorId?: string | undefined; status?: AgentJob['status'] | undefined }
interface CompleteAgentJobIn { jobId: string; status: 'done' | 'blocked'; note?: string | undefined }
interface ReconcileIn { files: Array<{ workItemId: string; frontmatterStatus: string }> }
interface AppendAgentMemoryIn { kind: MemoryKind; content: string; sourceThreadId?: string | undefined; projectId?: string | undefined }
interface SearchAgentMemoryIn {
  contextThreadId?: string | undefined;
  kind?: MemoryKind | undefined;
  query?: string | undefined;
  projectId?: string | undefined;
}

/** Compact one-line summary of zod issues (duck-typed: zod copies may differ). */
function zodMessage(error: unknown): string {
  const issues = (error as { issues?: Array<{ path?: Array<string | number>; message?: string }> })
    .issues;
  if (!Array.isArray(issues)) return String(error);
  return issues
    .map((issue) => {
      const path = issue.path && issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message ?? 'invalid'}`;
    })
    .join('; ');
}

function requireAdmin(ctx: ActorContext, command: string): void {
  if (!ctx.isAdmin) {
    throw new PermissionDeniedError(`admin:${command}` as Permission, ctx.actorId);
  }
}

export function createCommandBus(
  engine: SpineEngine,
  tokens: TokenStore,
  runners: RunnerRegistry = new RunnerRegistry(),
): CommandBus {
  async function execute(command: string, input: unknown, ctx: ActorContext): Promise<unknown> {
    const def = COMMAND_MAP.get(command);
    if (!def) throw new GuardFailedError(`unknown command: ${command}`);

    const parsedResult = def.input.safeParse(input ?? {});
    if (!parsedResult.success) {
      throw new GuardFailedError(`invalid input for ${command}: ${zodMessage(parsedResult.error)}`);
    }
    const parsed: unknown = parsedResult.data;

    switch (command as CommandName) {
      // -- setup / admin -----------------------------------------------------
      case 'create_actor': {
        // create_actor stays admin-token-gated (bootstrap plumbing), which
        // also makes it the only ctx allowed to pass governanceRole.
        requireAdmin(ctx, command);
        const p = parsed as CreateActorIn;
        const actor = engine.createActor({
          type: p.type,
          displayName: p.displayName,
          ...(p.governanceRole !== undefined ? { governanceRole: p.governanceRole } : {}),
        });
        const token = tokens.issue(actor.id);
        return { actor, token };
      }
      case 'grant_permission': {
        requireAdmin(ctx, command);
        const p = parsed as GrantIn;
        engine.grant({
          actorId: p.actorId,
          permission: p.permission as Permission,
          ...(p.scope !== undefined ? { scope: p.scope } : {}),
        });
        return { granted: true };
      }
      case 'revoke_permission': {
        requireAdmin(ctx, command);
        const p = parsed as GrantIn;
        engine.revoke({
          actorId: p.actorId,
          permission: p.permission as Permission,
          ...(p.scope !== undefined ? { scope: p.scope } : {}),
        });
        return { revoked: true };
      }
      // -- projects (Phase 7 Wave 2, D-E) ------------------------------------
      case 'project_create': {
        const p = parsed as {
          name: string;
          slug?: string | undefined;
          kind?: 'code' | 'doc' | 'mixed' | undefined;
          repoPath?: string | undefined;
          defaultSpecFolder?: string | undefined;
        };
        return engine.createProject({
          actorId: ctx.actorId,
          name: p.name,
          ...(p.slug !== undefined ? { slug: p.slug } : {}),
          ...(p.kind !== undefined ? { kind: p.kind } : {}),
          ...(p.repoPath !== undefined ? { repoPath: p.repoPath } : {}),
          ...(p.defaultSpecFolder !== undefined
            ? { defaultSpecFolder: p.defaultSpecFolder }
            : {}),
        });
      }
      case 'project_get': {
        const p = parsed as { projectId: string };
        return engine.getProject({ projectId: p.projectId });
      }
      case 'project_list': {
        const p = parsed as { includeArchived?: boolean | undefined };
        const list = engine.listProjects({
          ...(p.includeArchived !== undefined ? { includeArchived: p.includeArchived } : {}),
        });
        // The portfolio rollup, composed from existing queries — no second
        // write path, no denormalized counters to drift.
        const liveClaims = engine.listClaims();
        const claimedItems = new Map<string, number>();
        for (const claim of liveClaims) {
          claimedItems.set(claim.workItemId, (claimedItems.get(claim.workItemId) ?? 0) + 1);
        }
        return list.map((project) => {
          const items = engine.listWorkItems({ projectId: project.id });
          const byState: Record<string, number> = {};
          let blocked = 0;
          let awaitingGates = 0;
          let claims = 0;
          for (const item of items) {
            byState[item.state] = (byState[item.state] ?? 0) + 1;
            if (item.blockedReason !== null) blocked += 1;
            if ((item.state === 'draft' && item.specCheckpoint) || item.state === 'in_review') {
              awaitingGates += 1;
            }
            claims += claimedItems.get(item.id) ?? 0;
          }
          return { project, items: byState, blocked, liveClaims: claims, awaitingGates };
        });
      }
      case 'project_update': {
        const p = parsed as {
          projectId: string;
          name?: string | undefined;
          kind?: 'code' | 'doc' | 'mixed' | undefined;
          repoPath?: string | undefined;
          defaultSpecFolder?: string | undefined;
        };
        return engine.updateProject({
          actorId: ctx.actorId,
          projectId: p.projectId,
          ...(p.name !== undefined ? { name: p.name } : {}),
          ...(p.kind !== undefined ? { kind: p.kind } : {}),
          ...(p.repoPath !== undefined ? { repoPath: p.repoPath } : {}),
          ...(p.defaultSpecFolder !== undefined
            ? { defaultSpecFolder: p.defaultSpecFolder }
            : {}),
        });
      }
      case 'project_archive': {
        const p = parsed as { projectId: string };
        return engine.archiveProject({ actorId: ctx.actorId, projectId: p.projectId });
      }
      case 'create_feature': {
        const p = parsed as { projectId?: string | undefined; name?: string | undefined };
        return engine.createFeature({
          actorId: ctx.actorId,
          ...(p.projectId !== undefined ? { projectId: p.projectId } : {}),
          ...(p.name !== undefined ? { name: p.name } : {}),
        });
      }
      case 'create_work_item': {
        // Creator identity from ctx; kind defaults to 'code' in the engine.
        const p = parsed as CreateWorkItemIn;
        return engine.createWorkItem({
          featureId: p.featureId,
          externalKey: p.externalKey,
          title: p.title,
          actorId: ctx.actorId,
          ...(p.kind !== undefined ? { kind: p.kind } : {}),
          ...(p.specCheckpoint !== undefined ? { specCheckpoint: p.specCheckpoint } : {}),
          ...(p.doneCheckpoint !== undefined ? { doneCheckpoint: p.doneCheckpoint } : {}),
          ...(p.invokeDevWith !== undefined ? { invokeDevWith: p.invokeDevWith } : {}),
          ...(p.dependsOn !== undefined ? { dependsOn: p.dependsOn } : {}),
        });
      }
      case 'list_actors': {
        return engine.listActors();
      }
      case 'provision_personas': {
        // Gated by ENGINE governance (requireGovernanceAdmin on byActorId) —
        // the bus never pre-checks admin here, mirroring the §3 group.
        return engine.provisionPersonas({ byActorId: ctx.actorId });
      }

      // -- entitlements (Phase 2, roadmap §3) ----------------------------------
      // No requireAdmin here: authority is decided by the ENGINE from the
      // caller's governance role (byActorId = the authenticated actor).
      case 'assign_role': {
        const p = parsed as RoleIn;
        engine.assignRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { assigned: true };
      }
      case 'revoke_role': {
        const p = parsed as RoleIn;
        engine.revokeRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { revoked: true };
      }
      case 'list_role_assignments': {
        const p = parsed as ListRoleAssignmentsIn;
        return engine.listRoleAssignments(p.actorId);
      }
      case 'set_governance_role': {
        const p = parsed as SetGovernanceRoleIn;
        engine.setGovernanceRole({ actorId: p.actorId, role: p.role, byActorId: ctx.actorId });
        return { actorId: p.actorId, role: p.role };
      }
      case 'set_plan': {
        const p = parsed as SetPlanIn;
        engine.setPlan({ plan: p.plan, byActorId: ctx.actorId });
        return { plan: engine.getPlan() };
      }
      case 'set_workspace_policy': {
        const p = parsed as SetWorkspacePolicyIn;
        engine.setWorkspacePolicy({
          policy: {
            ...(p.policy.agentGateApprovals !== undefined
              ? { agentGateApprovals: p.policy.agentGateApprovals }
              : {}),
            ...(p.policy.agentSelfDispatch !== undefined
              ? { agentSelfDispatch: p.policy.agentSelfDispatch }
              : {}),
          },
          byActorId: ctx.actorId,
        });
        return engine.getWorkspacePolicy();
      }
      case 'set_gate_policy': {
        const p = parsed as SetGatePolicyIn;
        engine.setGatePolicy({
          gate: p.gate,
          policy: {
            ...(p.policy.minApprovals !== undefined ? { minApprovals: p.policy.minApprovals } : {}),
            ...(p.policy.requiredActorTypes !== undefined
              ? { requiredActorTypes: [...p.policy.requiredActorTypes] }
              : {}),
          },
          byActorId: ctx.actorId,
        });
        return { gate: p.gate, policy: engine.getGatePolicy(p.gate) };
      }
      case 'authz_explain': {
        const p = parsed as AuthzExplainIn;
        return engine.authzExplain({ actorId: p.actorId, permission: p.permission as Permission });
      }
      case 'import_stories': {
        const p = parsed as ImportStoriesIn;
        return engine.importStories({ featureId: p.featureId, yaml: p.yaml, actorId: ctx.actorId });
      }

      // -- claims --------------------------------------------------------------
      case 'claim_task': {
        const p = parsed as ClaimTaskIn;
        return engine.claimTask({
          workItemId: p.workItemId,
          actorId: ctx.actorId,
          ...(p.ttlMs !== undefined ? { ttlMs: p.ttlMs } : {}),
        });
      }
      case 'heartbeat': {
        const p = parsed as HeartbeatIn;
        engine.heartbeat({ claimId: p.claimId });
        return { renewed: true };
      }
      case 'release_claim': {
        const p = parsed as ReleaseClaimIn;
        engine.releaseClaim({
          claimId: p.claimId,
          ...(p.reason !== undefined ? { reason: p.reason } : {}),
        });
        return { released: true };
      }

      // -- lifecycle -------------------------------------------------------------
      case 'advance_state': {
        const p = parsed as AdvanceIn;
        return engine.advanceState({
          workItemId: p.workItemId,
          to: p.to as WorkItemState,
          actorId: ctx.actorId,
          ...(p.fencingToken !== undefined ? { fencingToken: p.fencingToken } : {}),
          ...(p.idempotencyKey !== undefined ? { idempotencyKey: p.idempotencyKey } : {}),
        });
      }
      case 'block_task': {
        const p = parsed as BlockIn;
        return engine.blockTask({
          workItemId: p.workItemId,
          reason: p.reason,
          actorId: ctx.actorId,
          ...(p.fencingToken !== undefined ? { fencingToken: p.fencingToken } : {}),
        });
      }
      case 'unblock_task': {
        const p = parsed as WorkItemIn;
        return engine.unblockTask({ workItemId: p.workItemId, actorId: ctx.actorId });
      }
      case 'submit_evidence': {
        const p = parsed as SubmitEvidenceIn;
        engine.submitEvidence({
          workItemId: p.workItemId,
          evidence: p.evidence as Evidence,
          actorId: ctx.actorId,
          ...(p.fencingToken !== undefined ? { fencingToken: p.fencingToken } : {}),
        });
        return { submitted: true };
      }
      case 'approve_gate': {
        const p = parsed as ApproveGateIn;
        return engine.approveGate({
          workItemId: p.workItemId,
          gate: p.gate,
          actorId: ctx.actorId,
          ...(p.pinnedVerification !== undefined
            ? { pinnedVerification: p.pinnedVerification }
            : {}),
        });
      }
      case 'reject_gate': {
        const p = parsed as RejectGateIn;
        return engine.rejectGate({ workItemId: p.workItemId, gate: p.gate, actorId: ctx.actorId });
      }
      case 'release_dispatch_hold': {
        const p = parsed as FeatureIn;
        return engine.releaseDispatchHold({ featureId: p.featureId, actorId: ctx.actorId });
      }

      // -- collaboration (Phase 3, roadmap §5) ----------------------------------
      // Actor identity ALWAYS from ctx: the poster, reader, notification owner
      // and job completer are the authenticated actor — never a body field.
      case 'create_thread': {
        const p = parsed as CreateThreadIn;
        return engine.createThread({
          actorId: ctx.actorId,
          kind: p.kind,
          ...(p.featureId !== undefined ? { featureId: p.featureId } : {}),
          ...(p.workItemId !== undefined ? { workItemId: p.workItemId } : {}),
          ...(p.visibility !== undefined ? { visibility: p.visibility } : {}),
        });
      }
      case 'add_thread_participant': {
        const p = parsed as AddThreadParticipantIn;
        return engine.addThreadParticipant({
          threadId: p.threadId,
          actorId: p.actorId,
          byActorId: ctx.actorId,
        });
      }
      case 'post_message': {
        const p = parsed as PostMessageIn;
        return engine.postMessage({
          threadId: p.threadId,
          actorId: ctx.actorId,
          body: p.body,
          ...(p.replyTo !== undefined ? { replyTo: p.replyTo } : {}),
          ...(p.mentions !== undefined ? { mentions: p.mentions } : {}),
        });
      }
      case 'list_threads': {
        const p = parsed as ListThreadsIn;
        return engine.listThreads({
          actorId: ctx.actorId, // private threads stay invisible to non-participants
          ...(p.featureId !== undefined ? { featureId: p.featureId } : {}),
          ...(p.workItemId !== undefined ? { workItemId: p.workItemId } : {}),
        });
      }
      case 'list_messages': {
        const p = parsed as ListMessagesIn;
        return engine.listMessages({
          threadId: p.threadId,
          actorId: ctx.actorId,
          ...(p.sinceSeq !== undefined ? { sinceSeq: p.sinceSeq } : {}),
        });
      }
      case 'list_mentions': {
        const p = parsed as ListMentionsIn;
        return engine.listMentions(p.messageId);
      }
      case 'list_notifications': {
        const p = parsed as ListNotificationsIn;
        return engine.listNotifications({
          actorId: ctx.actorId,
          ...(p.unreadOnly !== undefined ? { unreadOnly: p.unreadOnly } : {}),
        });
      }
      case 'mark_notification_read': {
        const p = parsed as MarkNotificationReadIn;
        engine.markNotificationRead({ notificationId: p.notificationId, actorId: ctx.actorId });
        return { read: true };
      }
      case 'list_agent_jobs': {
        const p = parsed as ListAgentJobsIn;
        return engine.listAgentJobs({
          ...(p.agentActorId !== undefined ? { agentActorId: p.agentActorId } : {}),
          ...(p.status !== undefined ? { status: p.status } : {}),
        });
      }
      case 'complete_agent_job': {
        const p = parsed as CompleteAgentJobIn;
        return engine.completeAgentJob({
          jobId: p.jobId,
          actorId: ctx.actorId,
          status: p.status,
          ...(p.note !== undefined ? { note: p.note } : {}),
        });
      }

      // -- agent memory (Phase 5, roadmap §6) ------------------------------------
      // The memory owner is ALWAYS the ctx actor — no cross-actor parameter
      // exists on the wire, so owner-scoping is structural, not disciplined.
      case 'append_agent_memory': {
        const p = parsed as AppendAgentMemoryIn;
        return engine.appendAgentMemory({
          actorId: ctx.actorId,
          kind: p.kind,
          content: p.content,
          ...(p.sourceThreadId !== undefined ? { sourceThreadId: p.sourceThreadId } : {}),
          ...(p.projectId !== undefined ? { projectId: p.projectId } : {}),
        });
      }
      case 'search_agent_memory': {
        const p = parsed as SearchAgentMemoryIn;
        return engine.searchAgentMemory({
          actorId: ctx.actorId,
          ...(p.contextThreadId !== undefined ? { contextThreadId: p.contextThreadId } : {}),
          ...(p.kind !== undefined ? { kind: p.kind } : {}),
          ...(p.query !== undefined ? { query: p.query } : {}),
          ...(p.projectId !== undefined ? { projectId: p.projectId } : {}),
        });
      }

      // -- reconciliation (roadmap §1.6, detect-only) ----------------------------
      case 'reconcile': {
        const p = parsed as ReconcileIn;
        return engine.reconcile({ files: p.files });
      }

      // -- ops ---------------------------------------------------------------------
      case 'force_release_claim': {
        // Gated in the engine on `ops.force_release_claim` (roadmap §8): the
        // acting actor comes from the authenticated ctx, never the body, and the
        // bootstrap admin's governance role does not bypass the grant.
        const p = parsed as WorkItemIn;
        return engine.forceReleaseClaim({ workItemId: p.workItemId, actorId: ctx.actorId });
      }

      // -- queries -------------------------------------------------------------------
      case 'get_work_item': {
        const p = parsed as WorkItemIn;
        return engine.getWorkItem(p.workItemId);
      }
      case 'get_feature': {
        const p = parsed as FeatureIn;
        return engine.getFeature(p.featureId);
      }
      case 'get_task_context': {
        const p = parsed as WorkItemIn;
        return engine.getTaskContext({ workItemId: p.workItemId });
      }
      case 'list_work_items': {
        const p = parsed as ListWorkItemsIn;
        return engine.listWorkItems({
          ...(p.state !== undefined ? { state: p.state as WorkItemState } : {}),
          ...(p.featureId !== undefined ? { featureId: p.featureId } : {}),
          ...(p.projectId !== undefined ? { projectId: p.projectId } : {}),
          ...(p.claimable !== undefined ? { claimable: p.claimable } : {}),
        });
      }
      case 'inbox': {
        // A gate holder must see WHICH project a pending decision belongs to.
        const withProject = (item: ReturnType<SpineEngine['getWorkItem']>) => {
          try {
            const feature = engine.getFeature(item.featureId);
            const project = engine.getProject({ projectId: feature.projectId });
            return { ...item, project: { id: project.id, slug: project.slug, name: project.name } };
          } catch {
            return item;
          }
        };
        const awaitingSpec = engine
          .listWorkItems({ state: 'draft' })
          .filter((item) => item.specCheckpoint)
          .map(withProject);
        const awaitingReview = engine.listWorkItems({ state: 'in_review' }).map(withProject);
        return { awaitingSpec, awaitingReview };
      }
      case 'query_events': {
        const p = parsed as QueryEventsIn;
        return engine.events(p.streamId);
      }
      case 'get_claims': {
        const p = parsed as WorkItemIn;
        return engine.getClaims(p.workItemId);
      }
      case 'list_claims': {
        const p = parsed as { includeReleased?: boolean | undefined };
        return engine.listClaims({
          ...(p.includeReleased !== undefined ? { includeReleased: p.includeReleased } : {}),
        });
      }
      case 'list_evidence': {
        const p = parsed as WorkItemIn;
        return engine.listEvidence(p.workItemId);
      }
      case 'whoami': {
        return { actorId: ctx.actorId, isAdmin: ctx.isAdmin };
      }

      // -- runner liveness (Wave 3): operational, zero lifecycle authority -------
      case 'runner_announce': {
        const p = parsed as {
          mode: 'coding' | 'jobs';
          projectId?: string | undefined;
          repoPath?: string | undefined;
          host?: string | undefined;
          pid?: number | undefined;
        };
        return runners.register(ctx.actorId, {
          mode: p.mode,
          ...(p.projectId !== undefined ? { projectId: p.projectId } : {}),
          ...(p.repoPath !== undefined ? { repoPath: p.repoPath } : {}),
          ...(p.host !== undefined ? { host: p.host } : {}),
          ...(p.pid !== undefined ? { pid: p.pid } : {}),
        });
      }
      case 'runner_heartbeat': {
        const p = parsed as { runnerId: string };
        if (!runners.heartbeat(p.runnerId)) {
          throw new GuardFailedError(
            `unknown runner ${p.runnerId} (server restarted?) — re-register`,
          );
        }
        return { ok: true };
      }
      case 'list_runners': {
        return runners.list();
      }

      // -- token recovery (ADMIN; Phase 7 Wave 1) --------------------------------
      // Tokens are spine-api configuration, not engine state: these two run
      // against the TokenStore and never touch the engine or the event log.
      case 'list_tokens': {
        requireAdmin(ctx, command);
        return tokens.list();
      }
      case 'reissue_token': {
        requireAdmin(ctx, command);
        const p = parsed as { actorId: string };
        return { actorId: p.actorId, token: tokens.reissue(p.actorId) };
      }
    }

    // Unreachable while the switch covers the registry; keeps the compiler honest.
    throw new GuardFailedError(`command not wired to the bus: ${command}`);
  }

  return { execute, engine };
}
