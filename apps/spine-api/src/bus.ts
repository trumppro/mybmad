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
  type BlockedReason,
  type Evidence,
  type GateCode,
  type GovernanceRole,
  type Permission,
  type PlanCode,
  type SpineEngine,
  type WorkItemState,
} from '@oahs/core';
import { COMMAND_MAP, type ActorContext, type CommandBus, type CommandName } from '@oahs/contracts';

import type { TokenStore } from './auth.js';

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
interface ListWorkItemsIn { state?: WorkItemState | undefined; featureId?: string | undefined; claimable?: boolean | undefined }
interface QueryEventsIn { streamId?: string | undefined }

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

export function createCommandBus(engine: SpineEngine, tokens: TokenStore): CommandBus {
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
      case 'create_feature': {
        return engine.createFeature({ actorId: ctx.actorId });
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

      // -- ops ---------------------------------------------------------------------
      case 'force_release_claim': {
        const p = parsed as WorkItemIn;
        const unreleased = engine.getClaims(p.workItemId).filter((claim) => !claim.released);
        if (unreleased.length === 0) {
          throw new GuardFailedError(`no live claim on work item ${p.workItemId}`);
        }
        for (const claim of unreleased) {
          engine.releaseClaim({ claimId: claim.id, reason: 'ops force release' });
        }
        return { released: unreleased.map((claim) => claim.id) };
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
          ...(p.claimable !== undefined ? { claimable: p.claimable } : {}),
        });
      }
      case 'inbox': {
        const awaitingSpec = engine
          .listWorkItems({ state: 'draft' })
          .filter((item) => item.specCheckpoint);
        const awaitingReview = engine.listWorkItems({ state: 'in_review' });
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
      case 'whoami': {
        return { actorId: ctx.actorId, isAdmin: ctx.isAdmin };
      }
    }

    // Unreachable while the switch covers the registry; keeps the compiler honest.
    throw new GuardFailedError(`command not wired to the bus: ${command}`);
  }

  return { execute, engine };
}
