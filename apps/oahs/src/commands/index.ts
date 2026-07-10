/**
 * Gate-holder command implementations — pure functions over the typed
 * contracts client: (client, opts) → output text. cli.ts only wires
 * commander onto these; tests call them directly against an in-process
 * spine-api. Every mutation goes through /rpc/<command>, never around it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { OahsClient } from '@oahs/contracts';
import { lintDoc } from '@oahs/runner';
import {
  WORK_ITEM_KINDS,
  WORK_ITEM_STATES,
  type Actor,
  type AuthzExplanation,
  type Claim,
  type Feature,
  type GateCode,
  type GovernanceRole,
  type PlanCode,
  type RoleAssignment,
  type SpineEvent,
  type StoriesImportResult,
  type WorkItem,
  type WorkspacePolicy,
} from '@oahs/core';

import { saveIdentity, setDefaultIdentity, setServerUrl } from '../cli-config.js';
import { renderTable, type Cell } from '../format.js';

// Phase 3 collaboration + advisor bots (roadmap §5) live in collab.ts.
export * from './collab.js';
// Phase 5 memory + review-convergence stats (roadmap §6) live in phase5.ts.
export * from './phase5.js';
// Phase 6 model gateway (roadmap §2.5) — `oahs models` / `oahs ping`.
export * from './gateway.js';

export const GATES = ['spec_approval', 'review_approval'] as const;

function assertGate(gate: string): asserts gate is GateCode {
  if (!(GATES as readonly string[]).includes(gate)) {
    throw new Error(`invalid --gate "${gate}" (expected ${GATES.join(' | ')})`);
  }
}

const WORK_ITEM_HEADERS = ['id', 'externalKey', 'title', 'state', 'blockedReason'];

function workItemRow(item: WorkItem): Cell[] {
  return [item.id, item.externalKey, item.title, item.state, item.blockedReason];
}

// ---------------------------------------------------------------------------
// inbox
// ---------------------------------------------------------------------------

export async function inboxCommand(client: OahsClient): Promise<string> {
  const { awaitingSpec, awaitingReview } = await client.call<{
    awaitingSpec: WorkItem[];
    awaitingReview: WorkItem[];
  }>('inbox');
  return [
    'awaiting spec approval:',
    renderTable(WORK_ITEM_HEADERS, awaitingSpec.map(workItemRow)),
    '',
    'awaiting review decision:',
    renderTable(WORK_ITEM_HEADERS, awaitingReview.map(workItemRow)),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// approve / reject
// ---------------------------------------------------------------------------

export interface ApproveOptions {
  workItemId: string;
  gate: string;
  /** spec_approval only: verification commands to pin (roadmap D7). */
  pin?: string[];
}

export async function approveCommand(client: OahsClient, opts: ApproveOptions): Promise<string> {
  assertGate(opts.gate);
  const item = await client.call<WorkItem>('approve_gate', {
    workItemId: opts.workItemId,
    gate: opts.gate,
    ...(opts.pin !== undefined && opts.pin.length > 0 ? { pinnedVerification: opts.pin } : {}),
  });
  const lines = [
    `approved ${opts.gate} on ${item.externalKey} (${item.id})`,
    `state: ${item.state}`,
  ];
  if (item.pinnedVerification !== null && item.pinnedVerification.length > 0) {
    lines.push(`pinned verification: ${item.pinnedVerification.join(' && ')}`);
  }
  return lines.join('\n');
}

export interface AdvanceOptions {
  workItemId: string;
  to: string;
  fencingToken?: number;
}

/**
 * Planning-zone advances for humans (backlog→draft when the PO starts
 * drafting, draft→ready_for_dev on non-checkpoint items). Execution-zone
 * transitions belong to the runner, which holds the claim.
 */
export async function advanceCommand(client: OahsClient, opts: AdvanceOptions): Promise<string> {
  const item = await client.call<WorkItem>('advance_state', {
    workItemId: opts.workItemId,
    to: opts.to,
    ...(opts.fencingToken !== undefined ? { fencingToken: opts.fencingToken } : {}),
  });
  return `advanced ${item.externalKey} (${item.id})\nstate: ${item.state}`;
}

export interface RejectOptions {
  workItemId: string;
  gate: string;
}

export async function rejectCommand(client: OahsClient, opts: RejectOptions): Promise<string> {
  assertGate(opts.gate);
  const item = await client.call<WorkItem>('reject_gate', {
    workItemId: opts.workItemId,
    gate: opts.gate,
  });
  return [
    `rejected ${opts.gate} on ${item.externalKey} (${item.id})`,
    `state: ${item.state}`,
    `blockedReason: ${item.blockedReason ?? '-'}`,
    `reviewLoopIteration: ${item.reviewLoopIteration}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

export interface StatusOptions {
  /** Project id or slug — scope the board to one project. */
  project?: string;
}

export async function statusCommand(client: OahsClient, opts: StatusOptions = {}): Promise<string> {
  const items = await client.call<WorkItem[]>(
    'list_work_items',
    opts.project !== undefined ? { projectId: opts.project } : {},
  );
  const rank = new Map<string, number>(WORK_ITEM_STATES.map((s, i) => [s, i]));
  const sorted = [...items].sort(
    (a, b) =>
      (rank.get(a.state) ?? 0) - (rank.get(b.state) ?? 0) ||
      a.externalKey.localeCompare(b.externalKey),
  );
  const featureIds = [...new Set(items.map((item) => item.featureId))];
  const features: Feature[] = [];
  for (const featureId of featureIds) {
    features.push(await client.call<Feature>('get_feature', { featureId }));
  }
  return [
    'work items:',
    renderTable(
      ['state', 'id', 'externalKey', 'title', 'blockedReason'],
      sorted.map((item) => [item.state, item.id, item.externalKey, item.title, item.blockedReason]),
    ),
    '',
    'features:',
    renderTable(
      ['id', 'state', 'dispatchHold'],
      features.map((feature) => [feature.id, feature.state, feature.dispatchHold]),
    ),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// actor / grant
// ---------------------------------------------------------------------------

export interface ActorCreateOptions {
  type: string;
  name: string;
  /** Phase 2 (roadmap §3): initial governance role — admin context only. */
  governanceRole?: string;
}

const GOVERNANCE_ROLES = ['admin', 'member', 'auditor'] as const;

function assertGovernanceRole(role: string): asserts role is GovernanceRole {
  if (!(GOVERNANCE_ROLES as readonly string[]).includes(role)) {
    throw new Error(`invalid governance role "${role}" (expected ${GOVERNANCE_ROLES.join(' | ')})`);
  }
}

export async function actorCreateCommand(
  client: OahsClient,
  opts: ActorCreateOptions,
): Promise<string> {
  if (opts.type !== 'user' && opts.type !== 'agent') {
    throw new Error(`invalid --type "${opts.type}" (expected user | agent)`);
  }
  if (opts.governanceRole !== undefined) assertGovernanceRole(opts.governanceRole);
  const created = await client.call<{ actor: Actor; token: string }>('create_actor', {
    type: opts.type,
    displayName: opts.name,
    ...(opts.governanceRole !== undefined ? { governanceRole: opts.governanceRole } : {}),
  });
  return [
    `actorId: ${created.actor.id}`,
    `type: ${created.actor.type}`,
    `displayName: ${created.actor.displayName}`,
    `token: ${created.token}`,
  ].join('\n');
}

export interface GrantOptions {
  actorId: string;
  permission: string;
  scope?: string;
}

export async function grantCommand(client: OahsClient, opts: GrantOptions): Promise<string> {
  await client.call('grant_permission', {
    actorId: opts.actorId,
    permission: opts.permission,
    ...(opts.scope !== undefined ? { scope: opts.scope } : {}),
  });
  return `granted ${opts.permission} to ${opts.actorId}`;
}

// ---------------------------------------------------------------------------
// feature / import
// ---------------------------------------------------------------------------

export interface FeatureCreateOptions {
  /** Project id or slug — omitted attaches to the default project. */
  project?: string;
  name?: string;
}

export async function featureCreateCommand(
  client: OahsClient,
  opts: FeatureCreateOptions = {},
): Promise<string> {
  const feature = await client.call<Feature>('create_feature', {
    ...(opts.project !== undefined ? { projectId: opts.project } : {}),
    ...(opts.name !== undefined ? { name: opts.name } : {}),
  });
  return [
    `featureId: ${feature.id}`,
    `projectId: ${feature.projectId}`,
    ...(feature.name !== null ? [`name: ${feature.name}`] : []),
    `state: ${feature.state}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// init (Phase 7 Wave 4) — one command replaces the ~15-step bootstrap ritual
// ---------------------------------------------------------------------------

export interface InitOptions {
  /** Server URL — saved into the profile store. */
  url: string;
  /** First project's name. */
  name: string;
  repoPath?: string;
  specFolder?: string;
  /** stories.yaml to import into the first feature. */
  importPath?: string;
  /** Profile-store env override (OAHS_HOME) — tests isolate through this. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Bootstrap a WORKING workspace from a bare admin token: PO + dev agent with
 * the standard grant bundles, the six BMAD personas (floor-state), the first
 * project (+ feature, + optional stories import), and a profile store with
 * po/dev identities (default: po). Grants stay EXPLICIT — this only automates
 * typing them, never widens them.
 */
export async function initCommand(admin: OahsClient, opts: InitOptions): Promise<string> {
  const env = opts.env ?? process.env;

  // 1 — actors + the standard grant bundles.
  const po = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const dev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev agent',
  });
  const PO_GRANTS = [
    'task.plan',
    'task.advance',
    'gate.spec.approve',
    'gate.review.approve',
    'feature.init',
    'dispatch.release_hold',
  ];
  const DEV_GRANTS = ['task.claim', 'task.advance', 'task.block'];
  for (const permission of PO_GRANTS) {
    await admin.call('grant_permission', { actorId: po.actor.id, permission });
  }
  for (const permission of DEV_GRANTS) {
    await admin.call('grant_permission', { actorId: dev.actor.id, permission });
  }

  // 2 — the six BMAD personas (idempotent; zero gate authority by default).
  await admin.call('provision_personas');

  // 3 — the first project + feature (+ optional backlog import).
  const project = await admin.call<{ id: string; slug: string }>('project_create', {
    name: opts.name,
    ...(opts.repoPath !== undefined ? { repoPath: opts.repoPath } : {}),
    ...(opts.specFolder !== undefined ? { defaultSpecFolder: opts.specFolder } : {}),
  });
  const feature = await admin.call<Feature>('create_feature', {
    projectId: project.id,
    name: 'Sprint 1',
  });
  let imported = 0;
  if (opts.importPath !== undefined) {
    const yaml = readFileSync(resolve(opts.importPath), 'utf8');
    const result = await admin.call<StoriesImportResult>('import_stories', {
      featureId: feature.id,
      yaml,
    });
    imported = result.imported.length;
  }

  // 4 — the profile store: real tokens under memorable names, PO as default.
  saveIdentity('po', { token: po.token, actorId: po.actor.id }, env);
  saveIdentity('dev', { token: dev.token, actorId: dev.actor.id }, env);
  setDefaultIdentity('po', env);
  setServerUrl(opts.url, env);

  return [
    `project: ${opts.name} (${project.slug})`,
    `feature: ${feature.id} (Sprint 1)${imported > 0 ? ` — ${String(imported)} stories imported` : ''}`,
    `identities saved: po (default), dev — switch with --as, inspect with \`oahs identities\``,
    '',
    'next steps:',
    `  oahs status --project ${project.slug}`,
    `  oahs work --project ${project.slug} --as dev --agent-cmd '<your agent command>'`,
    `  open ${opts.url}/ui  (log in with an identity token)`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// projects (Phase 7 Wave 2, D-E) — the unit of parallel work
// ---------------------------------------------------------------------------

interface ProjectRollup {
  project: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    repoPath: string | null;
    defaultSpecFolder: string | null;
    state: string;
  };
  items: Record<string, number>;
  blocked: number;
  liveClaims: number;
  awaitingGates: number;
}

export interface ProjectCreateOptions {
  name: string;
  slug?: string;
  kind?: string;
  repoPath?: string;
  specFolder?: string;
  /** stories.yaml — creates a first feature ("Sprint 1") and imports into it. */
  importPath?: string;
}

export async function projectCreateCommand(
  client: OahsClient,
  opts: ProjectCreateOptions,
): Promise<string> {
  const project = await client.call<ProjectRollup['project']>('project_create', {
    name: opts.name,
    ...(opts.slug !== undefined ? { slug: opts.slug } : {}),
    ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
    ...(opts.repoPath !== undefined ? { repoPath: opts.repoPath } : {}),
    ...(opts.specFolder !== undefined ? { defaultSpecFolder: opts.specFolder } : {}),
  });
  const lines = [
    `projectId: ${project.id}`,
    `slug: ${project.slug}`,
    `name: ${project.name}`,
    `kind: ${project.kind}`,
    ...(project.repoPath !== null ? [`repoPath: ${project.repoPath}`] : []),
    ...(project.defaultSpecFolder !== null
      ? [`defaultSpecFolder: ${project.defaultSpecFolder}`]
      : []),
  ];
  if (opts.importPath !== undefined) {
    const feature = await client.call<Feature>('create_feature', {
      projectId: project.id,
      name: 'Sprint 1',
    });
    const yaml = readFileSync(resolve(opts.importPath), 'utf8');
    const result = await client.call<StoriesImportResult>('import_stories', {
      featureId: feature.id,
      yaml,
    });
    lines.push(`feature: ${feature.id} (Sprint 1) — ${String(result.imported.length)} stories imported`);
  }
  return lines.join('\n');
}

export async function projectLsCommand(
  client: OahsClient,
  opts: { all?: boolean } = {},
): Promise<string> {
  const rollups = await client.call<ProjectRollup[]>(
    'project_list',
    opts.all === true ? { includeArchived: true } : {},
  );
  if (rollups.length === 0) return 'no projects — `oahs project create <name>` starts one';
  const stateCounts = (items: Record<string, number>): string =>
    Object.entries(items)
      .map(([state, count]) => `${state}:${count}`)
      .join(' ') || '—';
  return renderTable(
    ['slug', 'name', 'kind', 'state', 'items', 'blocked', 'claims', 'gates'],
    rollups.map((r) => [
      r.project.slug,
      r.project.name,
      r.project.kind,
      r.project.state,
      stateCounts(r.items),
      r.blocked,
      r.liveClaims,
      r.awaitingGates,
    ]),
  );
}

export async function projectShowCommand(
  client: OahsClient,
  opts: { projectId: string },
): Promise<string> {
  const project = await client.call<ProjectRollup['project']>('project_get', {
    projectId: opts.projectId,
  });
  return [
    `projectId: ${project.id}`,
    `slug: ${project.slug}`,
    `name: ${project.name}`,
    `kind: ${project.kind}`,
    `state: ${project.state}`,
    `repoPath: ${project.repoPath ?? '(unbound)'}`,
    `defaultSpecFolder: ${project.defaultSpecFolder ?? '(unbound)'}`,
  ].join('\n');
}

export async function projectArchiveCommand(
  client: OahsClient,
  opts: { projectId: string },
): Promise<string> {
  const project = await client.call<ProjectRollup['project']>('project_archive', {
    projectId: opts.projectId,
  });
  return `project ${project.slug} archived`;
}

export interface ImportStoriesOptions {
  featureId: string;
  path: string;
}

export async function importStoriesCommand(
  client: OahsClient,
  opts: ImportStoriesOptions,
): Promise<string> {
  const yaml = readFileSync(resolve(opts.path), 'utf8');
  const result = await client.call<StoriesImportResult>('import_stories', {
    featureId: opts.featureId,
    yaml,
  });
  const list = (values: string[]): string => (values.length > 0 ? values.join(', ') : '(none)');
  return [
    `imported: ${list(result.imported)}`,
    `updated: ${list(result.updated)}`,
    `warnings: ${list(result.warnings)}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

export interface EventsOptions {
  streamId?: string;
}

export async function eventsCommand(
  client: OahsClient,
  opts: EventsOptions = {},
): Promise<string> {
  const events = await client.call<SpineEvent[]>(
    'query_events',
    opts.streamId !== undefined ? { streamId: opts.streamId } : {},
  );
  // The audit must answer WHEN and WHAT in place — a query, not an interview.
  // occurredAt 0 = row persisted before timestamps existed (Phase 7 Wave 1).
  const when = (ms: number): string =>
    ms > 0 ? new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z') : '—';
  const compact = (payload: Record<string, unknown>): string => {
    const json = JSON.stringify(payload);
    return json.length > 120 ? `${json.slice(0, 119)}…` : json;
  };
  return renderTable(
    ['seq', 'when', 'type', 'stream', 'actor', 'payload'],
    events.map((event) => [
      event.globalSeq,
      when(event.occurredAt),
      event.type,
      `${event.streamType}/${event.streamId}#${event.streamSeq}`,
      event.actorId,
      compact(event.payload),
    ]),
  );
}

// ---------------------------------------------------------------------------
// ops (Phase 7 Wave 1) — whoami / claim ls / claim release / token recovery
// ---------------------------------------------------------------------------

export async function whoamiCommand(client: OahsClient): Promise<string> {
  const me = await client.call<{ actorId: string; isAdmin: boolean }>('whoami');
  return [`actorId: ${me.actorId}`, `isAdmin: ${String(me.isAdmin)}`].join('\n');
}

export interface ClaimLsOptions {
  /** Include released claims (history view). */
  released?: boolean;
}

export async function claimLsCommand(
  client: OahsClient,
  opts: ClaimLsOptions = {},
): Promise<string> {
  const claims = await client.call<Claim[]>(
    'list_claims',
    opts.released === true ? { includeReleased: true } : {},
  );
  if (claims.length === 0) return opts.released === true ? 'no claims' : 'no live claims';
  // Humans address stories by handle, not internal id — resolve each claim's
  // work item (a handful of extra queries on a human-paced command).
  const rows = await Promise.all(
    claims.map(async (claim): Promise<Cell[]> => {
      let story = claim.workItemId;
      let state = '?';
      try {
        const item = await client.call<WorkItem>('get_work_item', { workItemId: claim.workItemId });
        story = item.externalKey;
        state = item.state;
      } catch {
        /* a claim on a vanished item still renders by id */
      }
      return [
        claim.id,
        story,
        state,
        claim.actorId,
        claim.fencingToken,
        claim.released ? 'released' : claim.expired === true ? 'EXPIRED' : 'LIVE',
      ];
    }),
  );
  return renderTable(['claim', 'story', 'state', 'actor', 'fencing', 'status'], rows);
}

export async function claimReleaseCommand(
  client: OahsClient,
  opts: { workItemId: string },
): Promise<string> {
  const result = await client.call<{ released: string[] }>('force_release_claim', {
    workItemId: opts.workItemId,
  });
  return `released: ${result.released.join(', ')}`;
}

export async function tokenListCommand(client: OahsClient): Promise<string> {
  const inventory = await client.call<Array<{ actorId: string; tokens: number }>>('list_tokens');
  if (inventory.length === 0) return 'no issued tokens';
  return renderTable(
    ['actor', 'tokens'],
    inventory.map((row) => [row.actorId, row.tokens]),
  );
}

export async function tokenReissueCommand(
  client: OahsClient,
  opts: { actorId: string },
): Promise<string> {
  const result = await client.call<{ actorId: string; token: string }>('reissue_token', {
    actorId: opts.actorId,
  });
  return [
    `actorId: ${result.actorId}`,
    `token: ${result.token}`,
    'old tokens are revoked; store this one now — it is shown exactly once',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// entitlements (Phase 2, roadmap §3) — role / plan / policy / governance / authz
// Authority for these writes is decided by the ENGINE from the caller's
// governance role; the CLI only validates shapes locally.
// ---------------------------------------------------------------------------

export interface RoleOptions {
  actorId: string;
  roleCode: string;
}

export async function roleAssignCommand(client: OahsClient, opts: RoleOptions): Promise<string> {
  await client.call('assign_role', { actorId: opts.actorId, roleCode: opts.roleCode });
  return `assigned role ${opts.roleCode} to ${opts.actorId}`;
}

export async function roleRevokeCommand(client: OahsClient, opts: RoleOptions): Promise<string> {
  await client.call('revoke_role', { actorId: opts.actorId, roleCode: opts.roleCode });
  return `revoked role ${opts.roleCode} from ${opts.actorId}`;
}

export interface RoleListOptions {
  actorId?: string;
}

export async function roleListCommand(
  client: OahsClient,
  opts: RoleListOptions = {},
): Promise<string> {
  const assignments = await client.call<RoleAssignment[]>(
    'list_role_assignments',
    opts.actorId !== undefined ? { actorId: opts.actorId } : {},
  );
  return renderTable(
    ['actorId', 'roleCode', 'grantedBy', 'revoked'],
    assignments.map((a) => [a.actorId, a.roleCode, a.grantedBy, a.revoked]),
  );
}

export interface PlanSetOptions {
  plan: string;
}

const PLANS = ['free', 'team', 'enterprise'] as const;

export async function planSetCommand(client: OahsClient, opts: PlanSetOptions): Promise<string> {
  if (!(PLANS as readonly string[]).includes(opts.plan)) {
    throw new Error(`invalid plan "${opts.plan}" (expected ${PLANS.join(' | ')})`);
  }
  const result = await client.call<{ plan: PlanCode }>('set_plan', { plan: opts.plan });
  return `plan set: ${result.plan} (a ceiling for agent grants — never a grant itself)`;
}

export interface PolicySetOptions {
  /** 'true' | 'false' — restrict-only key (roadmap §3). */
  agentGateApprovals?: string;
  /** 'true' | 'false' — restrict-only key (roadmap §3). */
  agentSelfDispatch?: string;
}

function parseBoolFlag(flag: string, value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`invalid ${flag} "${value}" (expected true | false)`);
}

export async function policySetCommand(client: OahsClient, opts: PolicySetOptions): Promise<string> {
  const policy: WorkspacePolicy = {
    ...(opts.agentGateApprovals !== undefined
      ? { agentGateApprovals: parseBoolFlag('--agent-gate-approvals', opts.agentGateApprovals) }
      : {}),
    ...(opts.agentSelfDispatch !== undefined
      ? { agentSelfDispatch: parseBoolFlag('--agent-self-dispatch', opts.agentSelfDispatch) }
      : {}),
  };
  if (Object.keys(policy).length === 0) {
    throw new Error('nothing to set: pass --agent-gate-approvals and/or --agent-self-dispatch');
  }
  const effective = await client.call<WorkspacePolicy>('set_workspace_policy', { policy });
  return [
    'workspace policy (restrict-only — narrows the plan, never widens it):',
    `  agentGateApprovals: ${effective.agentGateApprovals ?? '(unset)'}`,
    `  agentSelfDispatch: ${effective.agentSelfDispatch ?? '(unset)'}`,
  ].join('\n');
}

export interface GatePolicySetOptions {
  gate: string;
  minApprovals?: string;
  requireTypes?: string[];
}

export async function gatePolicySetCommand(
  client: OahsClient,
  opts: GatePolicySetOptions,
): Promise<string> {
  assertGate(opts.gate);
  const minApprovals = opts.minApprovals !== undefined ? Number(opts.minApprovals) : undefined;
  if (minApprovals !== undefined && (!Number.isInteger(minApprovals) || minApprovals < 1)) {
    throw new Error(`invalid --min-approvals "${opts.minApprovals}" (expected a positive integer)`);
  }
  const requireTypes = opts.requireTypes ?? [];
  for (const type of requireTypes) {
    if (type !== 'user' && type !== 'agent' && type !== 'system') {
      throw new Error(`invalid --require-type "${type}" (expected user | agent | system)`);
    }
  }
  if (minApprovals === undefined && requireTypes.length === 0) {
    throw new Error('nothing to set: pass --min-approvals and/or --require-type');
  }
  const result = await client.call<{
    gate: GateCode;
    policy: { minApprovals?: number; requiredActorTypes?: string[] };
  }>('set_gate_policy', {
    gate: opts.gate,
    policy: {
      ...(minApprovals !== undefined ? { minApprovals } : {}),
      ...(requireTypes.length > 0 ? { requiredActorTypes: requireTypes } : {}),
    },
  });
  return [
    `gate policy set on ${result.gate} (gate definitions are data, roadmap §3):`,
    `  minApprovals: ${result.policy.minApprovals ?? 1}`,
    `  requiredActorTypes: ${
      result.policy.requiredActorTypes !== undefined && result.policy.requiredActorTypes.length > 0
        ? result.policy.requiredActorTypes.join(', ')
        : '(none)'
    }`,
  ].join('\n');
}

export interface GovernanceSetOptions {
  actorId: string;
  role: string;
}

export async function governanceSetCommand(
  client: OahsClient,
  opts: GovernanceSetOptions,
): Promise<string> {
  assertGovernanceRole(opts.role);
  await client.call('set_governance_role', { actorId: opts.actorId, role: opts.role });
  return `governance role of ${opts.actorId} set to ${opts.role}`;
}

export interface AuthzOptions {
  actorId: string;
  permission: string;
}

/** Human-readable rendering of the replayable authz_explain trace (roadmap §3). */
export async function authzCommand(client: OahsClient, opts: AuthzOptions): Promise<string> {
  const explanation = await client.call<AuthzExplanation>('authz_explain', {
    actorId: opts.actorId,
    permission: opts.permission,
  });
  return [
    `authz ${explanation.permission} for ${explanation.actorId}: ${
      explanation.allowed ? 'ALLOWED' : 'DENIED'
    }`,
    `  source: ${explanation.source ?? '(no grant — direct or via role)'}`,
    `  governanceRole: ${explanation.governanceRole}`,
    `  plan: ${explanation.plan} (planAllows: ${explanation.planAllows})`,
    `  policyAllows: ${explanation.policyAllows}`,
    `  versions: plan v${explanation.versions.plan}, policy v${explanation.versions.policy}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Phase 4 (roadmap Build phases + §1.4): non-coding teammates on the same
// rails — actors picker data, persona provisioning, direct work-item
// creation with a kind, and the deterministic document lint.
// ---------------------------------------------------------------------------

/** `oahs actors` — everyone on the rails: humans, agents, personas, system. */
export async function actorsCommand(client: OahsClient): Promise<string> {
  const actors = await client.call<Actor[]>('list_actors');
  return renderTable(
    ['id', 'type', 'displayName', 'personaCode'],
    actors.map((actor) => [actor.id, actor.type, actor.displayName, actor.personaCode]),
  );
}

/** `oahs personas provision` — idempotent, engine-governance-gated. */
export async function personasProvisionCommand(client: OahsClient): Promise<string> {
  const personas = await client.call<Actor[]>('provision_personas');
  return [
    `provisioned ${personas.length} personas (idempotent; floor-state roles, zero gate authority):`,
    renderTable(
      ['id', 'displayName', 'personaCode'],
      personas.map((actor) => [actor.id, actor.displayName, actor.personaCode]),
    ),
  ].join('\n');
}

export interface ItemCreateOptions {
  featureId: string;
  externalKey: string;
  title: string;
  /** Work-item kind; default 'code'. Selects evidence guards, never gate authority. */
  kind?: string;
  specCheckpoint?: boolean;
  doneCheckpoint?: boolean;
  invokeDevWith?: string;
  dependsOn?: string[];
}

export async function itemCreateCommand(
  client: OahsClient,
  opts: ItemCreateOptions,
): Promise<string> {
  if (opts.kind !== undefined && !(WORK_ITEM_KINDS as readonly string[]).includes(opts.kind)) {
    throw new Error(`invalid --kind "${opts.kind}" (expected ${WORK_ITEM_KINDS.join(' | ')})`);
  }
  const item = await client.call<WorkItem>('create_work_item', {
    featureId: opts.featureId,
    externalKey: opts.externalKey,
    title: opts.title,
    ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
    ...(opts.specCheckpoint !== undefined ? { specCheckpoint: opts.specCheckpoint } : {}),
    ...(opts.doneCheckpoint !== undefined ? { doneCheckpoint: opts.doneCheckpoint } : {}),
    ...(opts.invokeDevWith !== undefined ? { invokeDevWith: opts.invokeDevWith } : {}),
    ...(opts.dependsOn !== undefined && opts.dependsOn.length > 0
      ? { dependsOn: opts.dependsOn }
      : {}),
  });
  return [
    `created ${item.externalKey} (${item.id})`,
    `kind: ${item.kind}`,
    `state: ${item.state}`,
    `specCheckpoint: ${item.specCheckpoint}`,
  ].join('\n');
}

export interface DoclintOptions {
  /** Path of the document to lint. */
  path: string;
  /** Required `## <name>` sections (repeatable flag). */
  requireSections?: string[];
  /** Submit the result as doc_lint evidence on this work item. */
  workItemId?: string;
  submit?: boolean;
  fencingToken?: number;
}

/**
 * `oahs doclint <file>` — run the deterministic lint (a MEASURING tool, no
 * LLM); with --submit the raw {schemaValid, findings} goes onto the rails as
 * doc_lint evidence and the CORE decides what it gates. Exit 1 on a failing
 * lint so scripts can chain on it.
 */
export async function doclintCommand(
  client: OahsClient | null,
  opts: DoclintOptions,
): Promise<CommandOutput> {
  const content = readFileSync(resolve(opts.path), 'utf8');
  const result = lintDoc(content, {
    ...(opts.requireSections !== undefined ? { requiredSections: opts.requireSections } : {}),
  });
  const lines = [
    `doclint ${opts.path}: ${result.schemaValid ? 'schema-valid' : 'NOT schema-valid'}`,
    ...result.findings.map((finding) => `  - ${finding}`),
  ];
  if (opts.submit === true) {
    if (opts.workItemId === undefined) throw new Error('--submit requires --work-item <id>');
    if (client === null) throw new Error('--submit requires a client (token + url)');
    await client.call('submit_evidence', {
      workItemId: opts.workItemId,
      evidence: {
        kind: 'doc_lint',
        payload: { schemaValid: result.schemaValid, findings: result.findings },
      },
      ...(opts.fencingToken !== undefined ? { fencingToken: opts.fencingToken } : {}),
    });
    lines.push(`submitted doc_lint evidence on ${opts.workItemId}`);
  }
  return { text: lines.join('\n'), exitCode: result.schemaValid ? 0 : 1 };
}

// ---------------------------------------------------------------------------
// output harness (shared by cli.ts and the tests)
// ---------------------------------------------------------------------------

export interface CommandOutput {
  text: string;
  exitCode: number;
}

/**
 * Run one command function to a printable outcome: success → its text with
 * exit 0; failure → `<error.name>: <message>` (OahsRemoteError carries the
 * wire error class name) with exit 1.
 */
export async function runToOutput(fn: () => Promise<string>): Promise<CommandOutput> {
  try {
    return { text: await fn(), exitCode: 0 };
  } catch (error) {
    if (error instanceof Error) {
      return { text: `${error.name}: ${error.message}`, exitCode: 1 };
    }
    return { text: String(error), exitCode: 1 };
  }
}
