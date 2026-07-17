/**
 * The `oahs` binary — commander wiring ONLY. Every gate-holder command is a
 * pure function in src/commands/ taking (client, opts); serve lives in
 * src/serve.ts; the worker loop lives in @oahs/runner and is imported LAZILY
 * so the rest of the CLI works while the runner is still landing (story 14).
 *
 * Env is read here and only here: OAHS_TOKEN (client auth), OAHS_URL (client
 * base URL), OAHS_ADMIN_TOKEN (serve bootstrap), OAHS_DATA (serve data dir).
 */
import { resolve } from 'node:path';

import { Command } from 'commander';
import { makeClient, type OahsClient } from '@oahs/contracts';
// Type-only (erased): @oahs/runner is imported LAZILY at the call sites below.
import type { RunnerOptions } from '@oahs/runner';

import {
  actorCreateCommand,
  actorsCommand,
  advanceCommand,
  adviseNextTaskCommand,
  adviseReconcileCommand,
  approveCommand,
  intentRebaselineCommand,
  authzCommand,
  claimLsCommand,
  claimReviewCommand,
  claimReleaseCommand,
  doclintCommand,
  eventsCommand,
  projectArchiveCommand,
  projectCreateCommand,
  projectLsCommand,
  projectShowCommand,
  featureCreateCommand,
  featureAdvanceCommand,
  featureApproveCommand,
  featureRejectCommand,
  featureCancelCommand,
  gatePolicySetCommand,
  governanceSetCommand,
  grantCommand,
  importStoriesCommand,
  inboxCommand,
  initCommand,
  itemCreateCommand,
  jobCompleteCommand,
  jobsCommand,
  memoryCommand,
  messagesCommand,
  modelsCommand,
  notificationsCommand,
  pingCommand,
  personasProvisionCommand,
  planSetCommand,
  policySetCommand,
  postCommand,
  rejectCommand,
  roleAssignCommand,
  roleListCommand,
  roleRevokeCommand,
  runToOutput,
  statsReviewsCommand,
  statusCommand,
  threadCreateCommand,
  threadListCommand,
  tokenListCommand,
  tokenReissueCommand,
  whoamiCommand,
} from './commands/index.js';
import { runBrain } from './agent-brain.js';
import {
  defaultUrl,
  loadProfile,
  resolveDataDir,
  resolveIdentity,
  saveIdentity,
  setDefaultIdentity,
  setServerUrl,
} from './cli-config.js';
import { DEFAULT_PORT, startServe } from './serve.js';

interface ClientFlags {
  url: string;
  token?: string;
  as?: string;
}

function clientFrom(flags: ClientFlags): OahsClient {
  const { token } = resolveIdentity({
    ...(flags.token !== undefined ? { token: flags.token } : {}),
    ...(flags.as !== undefined ? { as: flags.as } : {}),
  });
  return makeClient({ baseUrl: flags.url, token });
}

/** Attach the shared client flags to a gate-holder command. */
function withClientFlags(cmd: Command): Command {
  return cmd
    .option('--url <url>', 'spine-api base URL (default: env OAHS_URL, profile, else localhost:4521)', defaultUrl())
    .option('--token <token>', 'bearer token (default: --as identity, env OAHS_TOKEN, profile default)')
    .option('--as <identity>', 'act as a NAMED identity from the profile store (see `oahs login`)');
}

/** Run a command function and translate its outcome to stdout/stderr + exit code. */
async function emit(fn: () => Promise<string>): Promise<void> {
  const { text, exitCode } = await runToOutput(fn);
  if (exitCode === 0) {
    process.stdout.write(`${text}\n`);
  } else {
    process.stderr.write(`${text}\n`);
    process.exitCode = exitCode;
  }
}

const collect = (value: string, previous: string[]): string[] => [...previous, value];

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('oahs')
    .description('oahs — Open Agents Harness System CLI (spine server + gate-holder commands)');

  // -- serve ------------------------------------------------------------------
  program
    .command('serve')
    .description('start the spine-api (HTTP /rpc/* + MCP /mcp; durable by default)')
    .option('--port <port>', 'TCP port', String(DEFAULT_PORT))
    .option('--admin-token <token>', 'bootstrap admin token (default: env OAHS_ADMIN_TOKEN, else generated)')
    .option('--data <dir>', 'persistence directory (default: env OAHS_DATA, else ~/.oahs/data)')
    .option('--ephemeral', 'in-memory engine — ALL state is lost on exit')
    .action(async (opts: { port: string; adminToken?: string; data?: string; ephemeral?: boolean }) => {
      try {
        const adminToken = opts.adminToken ?? process.env['OAHS_ADMIN_TOKEN'];
        const dataDir = resolveDataDir(opts);
        const handle = await startServe({
          port: Number(opts.port),
          ...(adminToken !== undefined && adminToken.length > 0 ? { adminToken } : {}),
          ...(dataDir !== undefined ? { dataDir } : {}),
        });
        process.stdout.write(
          `oahs spine-api listening on :${handle.port} (HTTP /rpc/*, MCP /mcp; engine: ${handle.engineKind}${
            dataDir !== undefined ? `, data: ${dataDir}` : ' — EPHEMERAL, state lost on exit'
          })\n`,
        );
        if (handle.adminTokenGenerated) {
          process.stdout.write(`admin token (generated): ${handle.adminToken}\n`);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`${err.name}: ${err.message}\n`);
        process.exitCode = 1;
      }
    });

  // -- gate-holder ---------------------------------------------------------------
  withClientFlags(program.command('inbox'))
    .description('items awaiting a gate decision (spec approval / review decision)')
    .action(async (opts: ClientFlags) => emit(() => inboxCommand(clientFrom(opts))));

  withClientFlags(program.command('approve <workItemId>'))
    .description('approve a gate (spec_approval pins verification commands + freezes the intent contract)')
    .requiredOption('--gate <gate>', 'spec_approval | review_approval')
    .option('--pin <cmd>', 'pin a verification command (repeatable, spec_approval only)', collect, [])
    .option('--spec-file <path>', 'freeze the spec’s intent contract (spec_approval, §9.3): submits its hash before approving')
    .option('--check-merge', 'measure the PR merge state via the forge and record it before approving (review_approval, §9.6; needs OAHS_GITHUB_TOKEN)')
    .action(async (workItemId: string, opts: ClientFlags & { gate: string; pin: string[]; specFile?: string; checkMerge?: boolean }) =>
      emit(() =>
        approveCommand(clientFrom(opts), {
          workItemId,
          gate: opts.gate,
          pin: opts.pin,
          ...(opts.specFile !== undefined ? { specFile: opts.specFile } : {}),
          ...(opts.checkMerge === true ? { checkMerge: true } : {}),
        }),
      ),
    );

  withClientFlags(program.command('advance <workItemId>'))
    .description('advance a work item through the FSM (planning-zone moves for humans)')
    .requiredOption('--to <state>', 'target state, e.g. draft | ready_for_dev')
    .option('--fencing-token <n>', 'fencing token when acting under a claim', (v: string) => Number(v))
    .action(async (workItemId: string, opts: ClientFlags & { to: string; fencingToken?: number }) =>
      emit(() =>
        advanceCommand(clientFrom(opts), {
          workItemId,
          to: opts.to,
          ...(opts.fencingToken !== undefined ? { fencingToken: opts.fencingToken } : {}),
        }),
      ),
    );

  withClientFlags(program.command('reject <workItemId>'))
    .description('reject a gate (review rejection fires the deterministic loopback)')
    .requiredOption('--gate <gate>', 'spec_approval | review_approval')
    .action(async (workItemId: string, opts: ClientFlags & { gate: string }) =>
      emit(() => rejectCommand(clientFrom(opts), { workItemId, gate: opts.gate })),
    );

  withClientFlags(program.command('status'))
    .description('all work items grouped by state, plus feature dispatch holds')
    .option('--project <projectId>', 'scope to one project (id or slug; default: .oahs.json in cwd)')
    .action(async (opts: ClientFlags & { project?: string }) => {
      const project = opts.project ?? loadProfile().directory?.project;
      return emit(() =>
        statusCommand(clientFrom(opts), project !== undefined ? { project } : {}),
      );
    });

  const actor = program.command('actor').description('actor management (admin)');
  withClientFlags(actor.command('create'))
    .description('create a user or agent actor; prints actorId + token (admin only)')
    .requiredOption('--type <type>', 'user | agent')
    .requiredOption('--name <name>', 'display name')
    .option('--governance-role <role>', 'admin | member | auditor (bootstrap plumbing, admin only)')
    .action(async (opts: ClientFlags & { type: string; name: string; governanceRole?: string }) =>
      emit(() =>
        actorCreateCommand(clientFrom(opts), {
          type: opts.type,
          name: opts.name,
          ...(opts.governanceRole !== undefined ? { governanceRole: opts.governanceRole } : {}),
        }),
      ),
    );

  // -- Phase 4: non-coding teammates on the same rails ---------------------------
  withClientFlags(program.command('actors'))
    .description('list ALL actors — humans, agents, personas, and the system actor')
    .action(async (opts: ClientFlags) => emit(() => actorsCommand(clientFrom(opts))));

  const personas = program.command('personas').description('BMAD persona agent actors (roadmap §3)');
  withClientFlags(personas.command('provision'))
    .description('idempotently provision the six BMAD personas (governance-admin only, engine-gated)')
    .action(async (opts: ClientFlags) => emit(() => personasProvisionCommand(clientFrom(opts))));

  const item = program.command('item').description('single work items (Phase 4: non-code kinds)');
  withClientFlags(item.command('create'))
    .description('create one work item; --kind selects evidence guards, never gate authority')
    .requiredOption('--feature <featureId>', 'feature to create the item in')
    .requiredOption('--key <externalKey>', 'external key (stories.yaml id vocabulary)')
    .requiredOption('--title <title>', 'work item title')
    .option('--kind <kind>', 'code | spec_draft | design_review | qa_report | doc (default code)')
    .option('--spec-checkpoint', 'require spec_approval before ready_for_dev')
    .option('--done-checkpoint', 'hold feature dispatch after this item is done')
    .option('--invoke-dev-with <text>', 'agent invocation hint')
    .option('--depends-on <externalKey>', 'dependency external key (repeatable)', collect, [])
    .action(
      async (
        opts: ClientFlags & {
          feature: string;
          key: string;
          title: string;
          kind?: string;
          specCheckpoint?: boolean;
          doneCheckpoint?: boolean;
          invokeDevWith?: string;
          dependsOn: string[];
        },
      ) =>
        emit(() =>
          itemCreateCommand(clientFrom(opts), {
            featureId: opts.feature,
            externalKey: opts.key,
            title: opts.title,
            ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
            ...(opts.specCheckpoint === true ? { specCheckpoint: true } : {}),
            ...(opts.doneCheckpoint === true ? { doneCheckpoint: true } : {}),
            ...(opts.invokeDevWith !== undefined ? { invokeDevWith: opts.invokeDevWith } : {}),
            ...(opts.dependsOn.length > 0 ? { dependsOn: opts.dependsOn } : {}),
          }),
        ),
    );

  withClientFlags(program.command('doclint <file>'))
    .description('deterministic document lint (no LLM); --submit sends doc_lint evidence; exit 1 when not schema-valid')
    .option('--require-section <name>', 'required ## section (repeatable)', collect, [])
    .option('--work-item <workItemId>', 'work item to submit doc_lint evidence on')
    .option('--submit', 'submit {schemaValid, findings} as doc_lint evidence via the rails')
    .option('--fencing-token <n>', 'fencing token when acting under a claim', (v: string) => Number(v))
    .action(
      async (
        file: string,
        opts: ClientFlags & {
          requireSection: string[];
          workItem?: string;
          submit?: boolean;
          fencingToken?: number;
        },
      ) => {
        try {
          // The lint itself needs no server; a client exists only for --submit.
          const client = opts.submit === true ? clientFrom(opts) : null;
          const { text, exitCode } = await doclintCommand(client, {
            path: file,
            ...(opts.requireSection.length > 0 ? { requireSections: opts.requireSection } : {}),
            ...(opts.workItem !== undefined ? { workItemId: opts.workItem } : {}),
            ...(opts.submit === true ? { submit: true } : {}),
            ...(opts.fencingToken !== undefined ? { fencingToken: opts.fencingToken } : {}),
          });
          process.stdout.write(`${text}\n`);
          process.exitCode = exitCode;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          process.stderr.write(`${err.name}: ${err.message}\n`);
          process.exitCode = 1;
        }
      },
    );

  withClientFlags(program.command('grant <actorId> <permission>'))
    .description('grant a permission to an actor (admin only)')
    .action(async (actorId: string, permission: string, opts: ClientFlags) =>
      emit(() => grantCommand(clientFrom(opts), { actorId, permission })),
    );

  // -- entitlements (Phase 2, roadmap §3) ---------------------------------------
  const role = program.command('role').description('delivery roles — permission bundles (roadmap §3)');
  withClientFlags(role.command('assign <actorId> <roleCode>'))
    .description('assign a delivery role to an actor (governance-admin only, engine-gated)')
    .action(async (actorId: string, roleCode: string, opts: ClientFlags) =>
      emit(() => roleAssignCommand(clientFrom(opts), { actorId, roleCode })),
    );
  withClientFlags(role.command('revoke <actorId> <roleCode>'))
    .description('revoke a delivery role from an actor (governance-admin only, engine-gated)')
    .action(async (actorId: string, roleCode: string, opts: ClientFlags) =>
      emit(() => roleRevokeCommand(clientFrom(opts), { actorId, roleCode })),
    );
  withClientFlags(role.command('list [actorId]'))
    .description('list delivery-role assignments (all, or one actor)')
    .action(async (actorId: string | undefined, opts: ClientFlags) =>
      emit(() => roleListCommand(clientFrom(opts), actorId !== undefined ? { actorId } : {})),
    );

  const plan = program.command('plan').description('workspace plan — a ceiling, never a grant (roadmap §3)');
  withClientFlags(plan.command('set <plan>'))
    .description('set the workspace plan: free | team | enterprise (governance-admin only)')
    .action(async (planCode: string, opts: ClientFlags) =>
      emit(() => planSetCommand(clientFrom(opts), { plan: planCode })),
    );

  const policy = program.command('policy').description('restrict-only workspace policy (roadmap §3)');
  withClientFlags(policy.command('set'))
    .description('set restrict-only policy keys (governance-admin only)')
    .option('--agent-gate-approvals <bool>', 'true | false — may agents exercise gate approvals?')
    .option('--agent-self-dispatch <bool>', 'true | false — may agents claim tasks on their own?')
    .action(async (opts: ClientFlags & { agentGateApprovals?: string; agentSelfDispatch?: string }) =>
      emit(() =>
        policySetCommand(clientFrom(opts), {
          ...(opts.agentGateApprovals !== undefined ? { agentGateApprovals: opts.agentGateApprovals } : {}),
          ...(opts.agentSelfDispatch !== undefined ? { agentSelfDispatch: opts.agentSelfDispatch } : {}),
        }),
      ),
    );

  const gatePolicy = program.command('gate-policy').description('gate definitions as data (roadmap §3)');
  withClientFlags(gatePolicy.command('set <gate>'))
    .description('set quorum/actor-type requirements of a gate (governance-admin only)')
    .option('--min-approvals <n>', 'distinct approvers required per review round')
    .option('--require-type <type>', 'require at least one approver of this type (repeatable)', collect, [])
    .action(async (gate: string, opts: ClientFlags & { minApprovals?: string; requireType: string[] }) =>
      emit(() =>
        gatePolicySetCommand(clientFrom(opts), {
          gate,
          ...(opts.minApprovals !== undefined ? { minApprovals: opts.minApprovals } : {}),
          ...(opts.requireType.length > 0 ? { requireTypes: opts.requireType } : {}),
        }),
      ),
    );

  const governance = program.command('governance').description('governance roles (roadmap §3)');
  withClientFlags(governance.command('set <actorId> <role>'))
    .description('set an actor governance role: admin | member | auditor (governance-admin only)')
    .action(async (actorId: string, roleCode: string, opts: ClientFlags) =>
      emit(() => governanceSetCommand(clientFrom(opts), { actorId, role: roleCode })),
    );

  withClientFlags(program.command('authz <actorId> <permission>'))
    .description('print the replayable authz decision trace for an actor × permission (roadmap §3)')
    .action(async (actorId: string, permission: string, opts: ClientFlags) =>
      emit(() => authzCommand(clientFrom(opts), { actorId, permission })),
    );

  const feature = program.command('feature').description('feature management');
  withClientFlags(feature.command('create'))
    .description('create a feature; prints featureId (attaches to --project, else the default project)')
    .option('--project <projectId>', 'project id or slug')
    .option('--name <name>', 'human name for the feature')
    .action(async (opts: ClientFlags & { project?: string; name?: string }) =>
      emit(() =>
        featureCreateCommand(clientFrom(opts), {
          ...(opts.project !== undefined ? { project: opts.project } : {}),
          ...(opts.name !== undefined ? { name: opts.name } : {}),
        }),
      ),
    );
  withClientFlags(feature.command('advance <featureId>'))
    .description('advance a feature along a non-gated edge (backlog→spec→design, breakdown→executing, executing→handoff)')
    .requiredOption('--to <state>', 'target feature state')
    .action(async (featureId: string, opts: ClientFlags & { to: string }) =>
      emit(() => featureAdvanceCommand(clientFrom(opts), { featureId, to: opts.to })),
    );
  withClientFlags(feature.command('approve <featureId>'))
    .description('approve a feature gate (design_approval fires design→breakdown; handoff_approval fires handoff→done)')
    .requiredOption('--gate <gate>', 'design_approval | handoff_approval')
    .action(async (featureId: string, opts: ClientFlags & { gate: string }) =>
      emit(() => featureApproveCommand(clientFrom(opts), { featureId, gate: opts.gate })),
    );
  withClientFlags(feature.command('reject <featureId>'))
    .description('reject a feature gate (fires the deterministic one-step loopback)')
    .requiredOption('--gate <gate>', 'design_approval | handoff_approval')
    .action(async (featureId: string, opts: ClientFlags & { gate: string }) =>
      emit(() => featureRejectCommand(clientFrom(opts), { featureId, gate: opts.gate })),
    );
  withClientFlags(feature.command('cancel <featureId>'))
    .description('cancel a feature (privileged) — terminal from any non-terminal state')
    .option('--reason <reason>', 'optional cancellation note')
    .action(async (featureId: string, opts: ClientFlags & { reason?: string }) =>
      emit(() =>
        featureCancelCommand(clientFrom(opts), {
          featureId,
          ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
        }),
      ),
    );

  withClientFlags(program.command('import <featureId> <storiesYamlPath>'))
    .description('import a stories.yaml file into a feature (idempotent)')
    .action(async (featureId: string, storiesYamlPath: string, opts: ClientFlags) =>
      emit(() => importStoriesCommand(clientFrom(opts), { featureId, path: storiesYamlPath })),
    );

  const intent = program.command('intent').description('intent contract (frozen-region hash, §9.3)');
  withClientFlags(intent.command('rebaseline <workItemId>'))
    .description('re-pin a work item’s intent hash after a legitimate spec renegotiation (gated on intent.edit)')
    .requiredOption('--spec-file <path>', 'the renegotiated spec file whose intent contract is the new baseline')
    .action(async (workItemId: string, opts: ClientFlags & { specFile: string }) =>
      emit(() => intentRebaselineCommand(clientFrom(opts), { workItemId, specFile: opts.specFile })),
    );

  // -- collaboration (Phase 3, roadmap §5) ---------------------------------------
  const thread = program.command('thread').description('conversation threads (Phase 3, roadmap §5)');
  withClientFlags(thread.command('create'))
    .description('create a thread, optionally bound to a feature/work item')
    .requiredOption('--kind <kind>', 'spec | design | task | general | private')
    .option('--feature <featureId>', 'bind to a feature')
    .option('--work-item <workItemId>', 'bind to a work item (id or externalKey)')
    .option('--visibility <visibility>', 'open | private')
    .action(
      async (
        opts: ClientFlags & { kind: string; feature?: string; workItem?: string; visibility?: string },
      ) =>
        emit(() =>
          threadCreateCommand(clientFrom(opts), {
            kind: opts.kind,
            ...(opts.feature !== undefined ? { featureId: opts.feature } : {}),
            ...(opts.workItem !== undefined ? { workItemId: opts.workItem } : {}),
            ...(opts.visibility !== undefined ? { visibility: opts.visibility } : {}),
          }),
        ),
    );
  withClientFlags(thread.command('list'))
    .description('list threads (private ones only when you participate)')
    .option('--feature <featureId>', 'filter by feature')
    .option('--work-item <workItemId>', 'filter by work item')
    .action(async (opts: ClientFlags & { feature?: string; workItem?: string }) =>
      emit(() =>
        threadListCommand(clientFrom(opts), {
          ...(opts.feature !== undefined ? { featureId: opts.feature } : {}),
          ...(opts.workItem !== undefined ? { workItemId: opts.workItem } : {}),
        }),
      ),
    );

  withClientFlags(program.command('post <threadId> <body>'))
    .description('post a message; --mention takes STRUCTURED actor ids (body text is never parsed)')
    .option('--mention <actorId>', 'mention an actor by id (repeatable)', collect, [])
    .option('--reply-to <messageId>', 'reply to a message')
    .action(
      async (threadId: string, body: string, opts: ClientFlags & { mention: string[]; replyTo?: string }) =>
        emit(() =>
          postCommand(clientFrom(opts), {
            threadId,
            body,
            ...(opts.mention.length > 0 ? { mentions: opts.mention } : {}),
            ...(opts.replyTo !== undefined ? { replyTo: opts.replyTo } : {}),
          }),
        ),
    );

  withClientFlags(program.command('messages <threadId>'))
    .description('list messages of a thread (raw authorId; system narration included)')
    .option('--since <seq>', 'only messages with seq greater than this', (v: string) => Number(v))
    .action(async (threadId: string, opts: ClientFlags & { since?: number }) =>
      emit(() =>
        messagesCommand(clientFrom(opts), {
          threadId,
          ...(opts.since !== undefined ? { sinceSeq: opts.since } : {}),
        }),
      ),
    );

  withClientFlags(program.command('notifications'))
    .description('your own notifications (mentions + agent-job completions)')
    .option('--unread', 'only unread notifications')
    .action(async (opts: ClientFlags & { unread?: boolean }) =>
      emit(() =>
        notificationsCommand(clientFrom(opts), opts.unread === true ? { unreadOnly: true } : {}),
      ),
    );

  const job = program.command('job').description('router-materialized agent jobs (reply-only, §5.4)');
  withClientFlags(program.command('jobs'))
    .description('list agent jobs')
    .option('--agent <actorId>', 'filter by agent actor')
    .option('--status <status>', 'queued | in_progress | done | blocked')
    .action(async (opts: ClientFlags & { agent?: string; status?: string }) =>
      emit(() =>
        jobsCommand(clientFrom(opts), {
          ...(opts.agent !== undefined ? { agentActorId: opts.agent } : {}),
          ...(opts.status !== undefined ? { status: opts.status } : {}),
        }),
      ),
    );
  withClientFlags(job.command('done <jobId>'))
    .description('complete a job as its agent (notifies the mentioner — nothing else moves)')
    .option('--note <note>', 'completion note')
    .action(async (jobId: string, opts: ClientFlags & { note?: string }) =>
      emit(() =>
        jobCompleteCommand(clientFrom(opts), {
          jobId,
          status: 'done',
          ...(opts.note !== undefined ? { note: opts.note } : {}),
        }),
      ),
    );

  // -- advisor bots (read + post only, deterministic, no LLM) --------------------
  const advise = program
    .command('advise')
    .description('deterministic advisor bots — read + post only, never a lifecycle mutation');
  withClientFlags(advise.command('next-task'))
    .description('post the suggested claim order (claimable ready_for_dev) into a thread')
    .requiredOption('--thread <threadId>', 'thread to post the advice into')
    .action(async (opts: ClientFlags & { thread: string }) =>
      emit(() => adviseNextTaskCommand(clientFrom(opts), { threadId: opts.thread })),
    );
  withClientFlags(advise.command('reconcile'))
    .description('post the detect-only file↔DB divergence report into a thread')
    .requiredOption('--thread <threadId>', 'thread to post the advice into')
    .requiredOption('--file <pair>', 'one <workItemId>=<frontmatterStatus> pair (repeatable)', collect, [])
    .action(async (opts: ClientFlags & { thread: string; file: string[] }) =>
      emit(() =>
        adviseReconcileCommand(clientFrom(opts), { threadId: opts.thread, files: opts.file }),
      ),
    );

  // -- Phase 5 (roadmap §6): learning teammates -----------------------------------
  withClientFlags(program.command('memory'))
    .description('your OWN agent memories (owner-scoped by construction — no cross-actor parameter exists)')
    .option('--kind <kind>', 'episodic | procedural | entity')
    .option('--query <text>', 'case-insensitive substring filter')
    .option('--context <threadId>', 'recall context thread (gates private-sourced memories, §6)')
    .action(async (opts: ClientFlags & { kind?: string; query?: string; context?: string }) =>
      emit(() =>
        memoryCommand(clientFrom(opts), {
          ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
          ...(opts.query !== undefined ? { query: opts.query } : {}),
          ...(opts.context !== undefined ? { contextThreadId: opts.context } : {}),
        }),
      ),
    );

  const stats = program.command('stats').description('deterministic delivery metrics (roadmap §6)');
  withClientFlags(stats.command('reviews'))
    .description('review-loop convergence per kind + per item — the improve-week-over-week measuring stick')
    .action(async (opts: ClientFlags) => emit(() => statsReviewsCommand(clientFrom(opts))));

  withClientFlags(program.command('events [streamId]'))
    .description('audit query over the append-only event log')
    .action(async (streamId: string | undefined, opts: ClientFlags) =>
      emit(() =>
        eventsCommand(clientFrom(opts), streamId !== undefined ? { streamId } : {}),
      ),
    );

  // -- projects (Phase 7 Wave 2, D-E): the unit of parallel work ------------------
  const project = program.command('project').description('projects: the unit of parallel work (name + slug + repo binding)');
  withClientFlags(project.command('create <name>'))
    .description('create a project; slug derives from the name')
    .option('--slug <slug>', 'addressable handle (default: derived)')
    .option('--kind <kind>', 'code | doc | mixed (default mixed)')
    .option('--repo <path>', 'local checkout the runner binds to')
    .option('--spec-folder <rel>', 'spec folder relative to the repo root')
    .option('--git-url <url>', 'remote git URL (SSH), e.g. git@github.com:org/repo.git (§9.6)')
    .option('--base-branch <branch>', 'PR/merge target + dispatcher clone source (default main, §9.6)')
    .option('--forge <owner/repo>', 'forge owner/repo for PR integration, e.g. acme/widgets (§9.6)')
    .option('--import <storiesYaml>', 'create a first feature (Sprint 1) and import this backlog')
    .action(async (name: string, opts: ClientFlags & { slug?: string; kind?: string; repo?: string; specFolder?: string; gitUrl?: string; baseBranch?: string; forge?: string; import?: string }) =>
      emit(() =>
        projectCreateCommand(clientFrom(opts), {
          name,
          ...(opts.slug !== undefined ? { slug: opts.slug } : {}),
          ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
          ...(opts.repo !== undefined ? { repoPath: resolve(opts.repo) } : {}),
          ...(opts.specFolder !== undefined ? { specFolder: opts.specFolder } : {}),
          ...(opts.gitUrl !== undefined ? { gitUrl: opts.gitUrl } : {}),
          ...(opts.baseBranch !== undefined ? { baseBranch: opts.baseBranch } : {}),
          ...(opts.forge !== undefined ? { forge: opts.forge } : {}),
          ...(opts.import !== undefined ? { importPath: opts.import } : {}),
        }),
      ),
    );
  withClientFlags(project.command('ls'))
    .description('every project with its rollup: items by state, blocked, live claims, gates waiting')
    .option('--all', 'include archived projects')
    .action(async (opts: ClientFlags & { all?: boolean }) =>
      emit(() => projectLsCommand(clientFrom(opts), opts.all === true ? { all: true } : {})),
    );
  withClientFlags(project.command('show <projectId>'))
    .description('one project by id or slug (repo binding included)')
    .action(async (projectId: string, opts: ClientFlags) =>
      emit(() => projectShowCommand(clientFrom(opts), { projectId })),
    );
  withClientFlags(project.command('archive <projectId>'))
    .description('archive: hidden from ls, refuses new features; history stays readable')
    .action(async (projectId: string, opts: ClientFlags) =>
      emit(() => projectArchiveCommand(clientFrom(opts), { projectId })),
    );

  // -- init (Phase 7 Wave 4): one command replaces the bootstrap ritual ----------
  program
    .command('init <projectName>')
    .description('bootstrap a working workspace: PO + dev agent + grants + personas + first project + profile store (needs the ADMIN token)')
    .option('--url <url>', 'spine-api base URL', defaultUrl())
    .option('--token <token>', 'ADMIN token (default: env OAHS_ADMIN_TOKEN, then OAHS_TOKEN)')
    .option('--repo <path>', 'bind the project to a local checkout')
    .option('--spec-folder <rel>', 'spec folder relative to the repo root')
    .option('--import <storiesYaml>', 'import a stories.yaml into the first feature')
    .action(
      async (
        projectName: string,
        opts: { url: string; token?: string; repo?: string; specFolder?: string; import?: string },
      ) => {
        try {
          const token =
            opts.token ?? process.env['OAHS_ADMIN_TOKEN'] ?? process.env['OAHS_TOKEN'];
          if (token === undefined || token.length === 0) {
            throw new Error('init needs the admin token: --token or OAHS_ADMIN_TOKEN');
          }
          const admin = makeClient({ baseUrl: opts.url, token });
          const { text, exitCode } = await runToOutput(() =>
            initCommand(admin, {
              url: opts.url,
              name: projectName,
              ...(opts.repo !== undefined ? { repoPath: resolve(opts.repo) } : {}),
              ...(opts.specFolder !== undefined ? { specFolder: opts.specFolder } : {}),
              ...(opts.import !== undefined ? { importPath: opts.import } : {}),
            }),
          );
          process[exitCode === 0 ? 'stdout' : 'stderr'].write(`${text}\n`);
          process.exitCode = exitCode;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          process.stderr.write(`init failed — ${err.message}\n`);
          process.exitCode = 1;
        }
      },
    );

  // -- profile store (Phase 7 Wave 4, D-F): named identities, no token juggling --
  program
    .command('login <name>')
    .description('save a NAMED identity into ~/.oahs/config.json (verified against the server)')
    .requiredOption('--token <token>', 'the identity’s bearer token')
    .option('--url <url>', 'server URL to verify against (also saved as the profile server)', defaultUrl())
    .option('--make-default', 'make this the default identity')
    .action(async (name: string, opts: { token: string; url: string; makeDefault?: boolean }) => {
      try {
        const client = makeClient({ baseUrl: opts.url, token: opts.token });
        const who = await client.call<{ actorId: string }>('whoami');
        saveIdentity(name, { token: opts.token, actorId: who.actorId });
        setServerUrl(opts.url);
        if (opts.makeDefault === true) setDefaultIdentity(name);
        process.stdout.write(
          `saved identity "${name}" → ${who.actorId}${opts.makeDefault === true ? ' (default)' : ''}\nserver: ${opts.url}\n`,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`login failed — ${err.message}\n`);
        process.exitCode = 1;
      }
    });

  program
    .command('use <name>')
    .description('make a saved identity the default (used when no --as/--token/OAHS_TOKEN)')
    .action((name: string) => {
      try {
        setDefaultIdentity(name);
        process.stdout.write(`default identity: ${name}\n`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`${err.message}\n`);
        process.exitCode = 1;
      }
    });

  program
    .command('identities')
    .description('list saved identities (names + actor ids — tokens never print)')
    .action(() => {
      const profile = loadProfile();
      const names = Object.keys(profile.identities);
      if (names.length === 0) {
        process.stdout.write('no identities saved — `oahs login <name> --token <token>`\n');
        return;
      }
      for (const name of names) {
        const identity = profile.identities[name]!;
        const isDefault = profile.defaultIdentity === name ? '  (default)' : '';
        process.stdout.write(`${name}: ${identity.actorId}${isDefault}\n`);
      }
    });

  // -- ops (Phase 7 Wave 1): identity, claims view, token recovery ---------------
  withClientFlags(program.command('whoami'))
    .description('which actor is this token (actorId + isAdmin)')
    .action(async (opts: ClientFlags) => emit(() => whoamiCommand(clientFrom(opts))));

  const claim = program.command('claim').description('claims ops: what is being worked on, and freeing stuck leases');
  withClientFlags(claim.command('ls'))
    .description('live claims across ALL work items (story handle, holder, fencing token)')
    .option('--released', 'include released claims (history view)')
    .action(async (opts: ClientFlags & { released?: boolean }) =>
      emit(() =>
        claimLsCommand(clientFrom(opts), opts.released === true ? { released: true } : {}),
      ),
    );
  withClientFlags(claim.command('review <workItemId>'))
    .description('claim an in_review item for review (§9.4); requires a review-gate grant')
    .action(async (workItemId: string, opts: ClientFlags) =>
      emit(() => claimReviewCommand(clientFrom(opts), { workItemId })),
    );
  withClientFlags(claim.command('release <workItemId>'))
    .description('force-release EVERY live claim on a work item (dead-runner recovery)')
    .requiredOption('--force', 'confirm: this frees another actor’s live lease')
    .action(async (workItemId: string, opts: ClientFlags & { force: boolean }) =>
      emit(() => claimReleaseCommand(clientFrom(opts), { workItemId })),
    );

  const token = program.command('token').description('token recovery (admin): inventory + reissue');
  withClientFlags(token.command('list'))
    .description('issued-token inventory — actor ids and counts, never secrets')
    .action(async (opts: ClientFlags) => emit(() => tokenListCommand(clientFrom(opts))));
  withClientFlags(token.command('reissue <actorId>'))
    .description('revoke an actor’s tokens and print ONE fresh token (lost-credential recovery)')
    .action(async (actorId: string, opts: ClientFlags) =>
      emit(() => tokenReissueCommand(clientFrom(opts), { actorId })),
    );

  // -- work (runner handoff; @oahs/runner lands with story 14) -------------------
  withClientFlags(program.command('work'))
    .description('run the BYO worker loop (coding) or --jobs: the teammate jobs loop (reply-only, roadmap §6)')
    .option('--jobs', 'serve reply-only agent jobs for THIS token’s agent (mention-dispatch, zero lifecycle authority)')
    .option('--manifest <runnersYaml>', 'SUPERVISOR: run every loop in runners.yaml from ONE process (identities from the profile store)')
    .option('--repo <path>', 'target project git checkout (coding mode; default: the --project record’s repoPath)')
    .option('--spec-folder <rel>', 'spec folder relative to the repo root (coding mode; default: the --project record’s defaultSpecFolder)')
    .option(
      '--project <projectId>',
      'bind to a project (id or slug): dispatch ONLY its work items, repo + spec folder read from the project record (coding mode)',
    )
    .option(
      '--feature <featureId>',
      'only dispatch this feature’s work items — narrower than --project (coding mode)',
    )
    .option(
      '--agent-cmd <template>',
      'agent command template (coding: {SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE}; jobs: {CONTEXT_FILE} {REPLY_FILE} {THREAD_ID} {JOB_ID}); required unless --manifest',
    )
    .option('--once', 'run at most one dispatch/job cycle, then exit')
    .option('--poll <ms>', 'poll interval in milliseconds')
    .option('--claim-ttl <ms>', 'claim lease TTL (coding mode; default: engine 15 min)')
    .option('--heartbeat <ms>', 'lease heartbeat interval during the agent run (coding mode; default 60s)')
    .option(
      '--agent-env <KEY=VAL>',
      'extra env var passed to the agent child (repeatable); use this for model keys instead of the inherited env',
      collect,
      [],
    )
    .option(
      '--inherit-env',
      'pass the runner’s FULL process env to the agent child (default: a minimal allowlist, no OAHS_TOKEN / OAHS_MODEL_* / SSH_AUTH_SOCK; roadmap §8)',
    )
    .option(
      '--push-user <username>',
      'username presented with $OAHS_PUSH_TOKEN when pushing the claim branch (default: x-access-token; roadmap §10.3)',
    )
    .action(
      async (
        opts: ClientFlags & {
          jobs?: boolean;
          manifest?: string;
          repo?: string;
          specFolder?: string;
          project?: string;
          feature?: string;
          agentCmd?: string;
          once?: boolean;
          poll?: string;
          claimTtl?: string;
          heartbeat?: string;
          agentEnv?: string[];
          inheritEnv?: boolean;
          pushUser?: string;
        },
      ) => {
        try {
          if (opts.manifest !== undefined) {
            const { runSupervisor } = await import('./supervisor.js');
            await runSupervisor({
              manifestPath: opts.manifest,
              url: opts.url,
              ...(opts.once === true ? { once: true } : {}),
            });
            return;
          }
          if (opts.agentCmd === undefined) {
            throw new Error('--agent-cmd is required (or pass --manifest)');
          }
          const client = clientFrom(opts);
          // --agent-env KEY=VAL pairs → the extra env the agent child receives
          // (§8): model keys and the like belong here, not in the inherited env.
          const agentEnv: Record<string, string> = {};
          for (const pair of opts.agentEnv ?? []) {
            const eq = pair.indexOf('=');
            if (eq <= 0) throw new Error(`--agent-env expects KEY=VALUE, got: ${pair}`);
            agentEnv[pair.slice(0, eq)] = pair.slice(eq + 1);
          }
          const envOpts = {
            ...(Object.keys(agentEnv).length > 0 ? { agentEnv } : {}),
            ...(opts.inheritEnv === true ? { inheritEnv: true } : {}),
          };
          // §10.3 (BYO): a claim-scoped push credential, presented for the
          // claim-branch push through a per-dispatch GIT_ASKPASS broker instead of
          // the operator's ambient helper. Never reaches the agent child (§8), and
          // never the jobs loop (reply-only — it touches no git). Unset → ambient
          // credentials, unchanged.
          const workPushToken = process.env['OAHS_PUSH_TOKEN'];
          const pushOpts =
            workPushToken !== undefined && workPushToken !== ''
              ? { pushCredential: { username: opts.pushUser ?? 'x-access-token', password: workPushToken } }
              : {};
          // LAZY import: the runner is a fixed interface that may still be a
          // stub — the rest of the CLI must never pay for (or break on) it.
          const runner = await import('@oahs/runner');
          // §10.2: ASSIGNED mode — this process is a dispatcher's container. The
          // dispatcher pre-claimed on the host and handed us a complete
          // assignment + a scoped OAHS_TOKEN via env; run exactly that one item
          // with no poll/claim/context read. A normal return exits 0 (the run
          // self-reported to the spine); a throw exits non-zero and the
          // dispatcher blocks the item.
          const assignmentRaw = process.env['OAHS_ASSIGNMENT'];
          if (assignmentRaw !== undefined && assignmentRaw !== '') {
            if (opts.repo === undefined || opts.specFolder === undefined) {
              throw new Error('assigned mode (OAHS_ASSIGNMENT) requires --repo and --spec-folder');
            }
            const assignment = JSON.parse(assignmentRaw) as NonNullable<RunnerOptions['assignment']>;
            await runner.runOnce({
              client,
              repoPath: resolve(opts.repo),
              specFolder: opts.specFolder,
              agentCmd: opts.agentCmd,
              assignment,
              ...envOpts,
            });
            return;
          }
          if (opts.jobs === true) {
            // The served agent is ALWAYS the authenticated token's actor —
            // whoami, never a flag (owner-scoping mirrors the memory rails).
            const me = await client.call<{ actorId: string }>('whoami');
            await runner.jobsLoop({
              client,
              agentActorId: me.actorId,
              agentCmd: opts.agentCmd,
              ...envOpts,
              ...(opts.poll !== undefined ? { pollMs: Number(opts.poll) } : {}),
              ...(opts.once === true ? { once: true } : {}),
            });
            return;
          }
          // --project: the Wave-2 binding — repo + spec folder come from the
          // project record; explicit flags still override. A .oahs.json in
          // the cwd supplies the default project (Wave 4).
          const project = opts.project ?? loadProfile().directory?.project;
          let repoPath = opts.repo;
          let specFolder = opts.specFolder;
          // §9.6: forge config for PR-on-dispatch — the project's forge fields +
          // OAHS_GITHUB_TOKEN (the spine never sees the token). Absent → no PRs.
          let forge: { owner: string; repo: string; baseBranch: string; token: string } | undefined;
          if (project !== undefined) {
            const record = await client.call<{
              slug: string;
              repoPath: string | null;
              defaultSpecFolder: string | null;
              baseBranch: string | null;
              forgeOwner: string | null;
              forgeRepo: string | null;
            }>('project_get', { projectId: project });
            repoPath = repoPath ?? record.repoPath ?? undefined;
            specFolder = specFolder ?? record.defaultSpecFolder ?? undefined;
            const token = process.env['OAHS_GITHUB_TOKEN'];
            if (record.forgeOwner !== null && record.forgeRepo !== null && token !== undefined && token !== '') {
              forge = {
                owner: record.forgeOwner,
                repo: record.forgeRepo,
                baseBranch: record.baseBranch ?? 'main',
                token,
              };
            }
          }
          if (repoPath === undefined || specFolder === undefined) {
            throw new Error(
              'coding mode requires --repo and --spec-folder (or a --project whose record binds them, or pass --jobs)',
            );
          }
          await runner.workLoop({
            client,
            repoPath: resolve(repoPath),
            specFolder,
            agentCmd: opts.agentCmd,
            // §10.1: dispatch mutations run under a job-scoped token minted per
            // claim; the static client (above) only polls, claims, heartbeats, mints.
            scopedClientFactory: (token: string) => makeClient({ baseUrl: opts.url, token }),
            ...envOpts,
            ...pushOpts,
            ...(forge !== undefined ? { forge } : {}),
            ...(project !== undefined ? { projectId: project } : {}),
            ...(opts.feature !== undefined ? { featureId: opts.feature } : {}),
            ...(opts.poll !== undefined ? { pollMs: Number(opts.poll) } : {}),
            ...(opts.claimTtl !== undefined ? { claimTtlMs: Number(opts.claimTtl) } : {}),
            ...(opts.heartbeat !== undefined ? { heartbeatMs: Number(opts.heartbeat) } : {}),
            ...(opts.once === true ? { once: true } : {}),
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          process.stderr.write(`oahs work failed — ${err.name}: ${err.message}\n`);
          process.exitCode = 1;
        }
      },
    );

  // -- Phase 10 (roadmap §4.3, §10.2): the container dispatcher ------------------
  // The ONE process that spawns work. It claims + mints + reads context on the
  // HOST (static token) and runs each claim in a container carrying ONLY the
  // scoped token from §10.1 — never the static/admin token, never OAHS_MODEL_*.
  withClientFlags(program.command('dispatch'))
    .description('§10.2 dispatcher: claim ready items on the host and run each in a container (the container gets a job-scoped token, never the static token or model keys)')
    .requiredOption('--image <ref>', 'agent-runtime container image (coding CLI + git + the oahs bin)')
    .option('--repo <path>', 'project git checkout bind-mounted into the container (or the --project record’s repoPath)')
    .option('--spec-folder <rel>', 'spec folder relative to the repo root (or the --project record’s defaultSpecFolder)')
    .option('--project <projectId>', 'bind to a project (id or slug): dispatch ONLY its work items, repo + spec folder from the record')
    .option('--feature <featureId>', 'only dispatch this feature’s work items')
    .option('--agent-cmd <template>', 'agent command template run inside the container (required)')
    .option('--once', 'run at most one dispatch cycle, then exit')
    .option('--poll <ms>', 'poll interval in milliseconds')
    .option('--claim-ttl <ms>', 'claim lease TTL (ms; default: engine 15 min)')
    .option(
      '--agent-env <KEY=VAL>',
      'model/agent env forwarded to the AGENT child INSIDE the container (repeatable); kept out of the container’s scoped-token env',
      collect,
      [],
    )
    .option('--remote <name>', 'git remote the claim branch is pushed to (default: origin)')
    .option(
      '--container-url <url>',
      'spine URL as seen FROM a claim container (default: --url). Needed when the dispatcher runs on the host: its 127.0.0.1 is the container’s own loopback — use http://host.docker.internal:<port>.',
    )
    .option(
      '--network <name>',
      'docker network to attach each claim container to — the network on which --url resolves (compose: the project network). Without it the container lands on the default bridge and cannot reach the spine.',
    )
    .option(
      '--push-user <username>',
      'username presented with $OAHS_PUSH_TOKEN when pushing the claim branch (default: x-access-token)',
    )
    .action(
      async (
        opts: ClientFlags & {
          image: string;
          repo?: string;
          specFolder?: string;
          project?: string;
          feature?: string;
          agentCmd?: string;
          once?: boolean;
          poll?: string;
          claimTtl?: string;
          agentEnv?: string[];
          remote?: string;
          pushUser?: string;
          network?: string;
          containerUrl?: string;
        },
      ) => {
        try {
          if (opts.agentCmd === undefined) throw new Error('--agent-cmd is required');
          // An EMPTY --repo is not "unset": `resolve('')` is the cwd, so the
          // dispatcher would bind-mount whatever directory it happens to run in.
          // docker-compose passes the value through unset-as-empty (it cannot make
          // this required without breaking every compose command), so the check
          // belongs here.
          if (opts.repo !== undefined && opts.repo.trim() === '') {
            throw new Error(
              'dispatch: --repo is empty. Set OAHS_REPO_PATH to the ABSOLUTE HOST path of the checkout ' +
                '(docker-out-of-docker: the container-per-claim bind mount is resolved by the host daemon, not by this process).',
            );
          }
          const client = clientFrom(opts);
          const explicitAgentEnv: Record<string, string> = {};
          for (const pair of opts.agentEnv ?? []) {
            const eq = pair.indexOf('=');
            if (eq <= 0) throw new Error(`--agent-env expects KEY=VALUE, got: ${pair}`);
            explicitAgentEnv[pair.slice(0, eq)] = pair.slice(eq + 1);
          }
          const { withForwardedModelEnv } = await import('./dispatcher.js');
          // §10.2: forward the dispatcher's model creds (OAHS_MODEL_*, compose
          // `runtime` profile) to the AGENT child — this is what makes the compose
          // profile work without hand-listing keys; they never reach the spine or
          // a container's scoped-token env.
          const agentEnv = withForwardedModelEnv(explicitAgentEnv, process.env);
          const project = opts.project ?? loadProfile().directory?.project;
          let repoPath = opts.repo;
          let specFolder = opts.specFolder;
          if (project !== undefined) {
            const record = await client.call<{
              repoPath: string | null;
              defaultSpecFolder: string | null;
              forgeOwner: string | null;
              forgeRepo: string | null;
            }>('project_get', { projectId: project });
            repoPath = repoPath ?? record.repoPath ?? undefined;
            specFolder = specFolder ?? record.defaultSpecFolder ?? undefined;
            // §10.2: PR-on-dispatch (§9.6) is not wired through the container
            // model yet — it moves to the dispatcher-push path (§10.3/§10.4). Warn
            // so a forge project’s missing PR is expected, not a silent surprise.
            if (record.forgeOwner !== null && record.forgeRepo !== null) {
              process.stderr.write(
                `oahs dispatch: project ${project} has a forge (${record.forgeOwner}/${record.forgeRepo}); ` +
                  'container runs push the claim branch and reach in_review WITHOUT opening a PR ' +
                  '(PR-on-dispatch lands with §10.3/§10.4). Use `oahs work` for inline PRs.\n',
              );
            }
          }
          if (repoPath === undefined || specFolder === undefined) {
            throw new Error('dispatch requires --repo and --spec-folder (or a --project whose record binds them)');
          }
          // §10.3: the CLAIM-SCOPED push credential stays on the HOST — the
          // dispatcher pushes the claim branch after the container exits, so the
          // container is never handed a credential at all. Ideally $OAHS_PUSH_TOKEN
          // is short-lived and authorizes only refs/heads/claim/*.
          const pushToken = process.env['OAHS_PUSH_TOKEN'];
          const pushCredential =
            pushToken !== undefined && pushToken !== ''
              ? { username: opts.pushUser ?? 'x-access-token', password: pushToken }
              : undefined;
          const { dispatchLoop } = await import('./dispatcher.js');
          await dispatchLoop({
            client,
            baseUrl: opts.url,
            image: opts.image,
            repoPath: resolve(repoPath),
            specFolder,
            agentCmd: opts.agentCmd,
            ...(pushCredential !== undefined ? { pushCredential } : {}),
            ...(opts.remote !== undefined ? { remote: opts.remote } : {}),
            ...(opts.network !== undefined ? { network: opts.network } : {}),
            ...(opts.containerUrl !== undefined ? { containerUrl: opts.containerUrl } : {}),
            ...(Object.keys(agentEnv).length > 0 ? { agentEnv } : {}),
            ...(project !== undefined ? { projectId: project } : {}),
            ...(opts.feature !== undefined ? { featureId: opts.feature } : {}),
            ...(opts.poll !== undefined ? { pollMs: Number(opts.poll) } : {}),
            ...(opts.claimTtl !== undefined ? { claimTtlMs: Number(opts.claimTtl) } : {}),
            ...(opts.once === true ? { once: true } : {}),
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          process.stderr.write(`oahs dispatch failed — ${err.name}: ${err.message}\n`);
          process.exitCode = 1;
        }
      },
    );

  // -- Phase 6 (roadmap §2.5): model gateway ------------------------------------
  // These commands are gateway clients, NOT spine clients (§0.1). Config comes
  // from env (OAHS_MODEL_BASE_URL / OAHS_MODEL_API_KEY / OAHS_MODEL_DEFAULT).
  program
    .command('models')
    .description('list the models the configured model gateway can reach (roadmap §2.5)')
    .action(async () => emit(() => modelsCommand()));

  program
    .command('ping')
    .description('send one short prompt through the gateway; print reply + token usage')
    .option('--message <text>', 'the prompt to send')
    .option('--route <route>', 'persona route to resolve to a model')
    .option('--model <model>', 'explicit model id (overrides the route)')
    .action(async (opts: { message?: string; route?: string; model?: string }) =>
      emit(() =>
        pingCommand({
          ...(opts.message !== undefined ? { message: opts.message } : {}),
          ...(opts.route !== undefined ? { route: opts.route } : {}),
          ...(opts.model !== undefined ? { model: opts.model } : {}),
        }),
      ),
    );

  program
    .command('brain')
    .description(
      'teammate BRAIN: read OAHS_CONTEXT_FILE (job/messages/memories), ask the gateway, write OAHS_REPLY_FILE (the jobs-runtime agent-cmd; roadmap §2.5/§6)',
    )
    .option('--context-file <path>', 'context JSON (default: env OAHS_CONTEXT_FILE)')
    .option('--reply-file <path>', 'reply text out (default: env OAHS_REPLY_FILE)')
    .option('--route <route>', 'persona route to resolve to a model')
    .action(async (opts: { contextFile?: string; replyFile?: string; route?: string }) => {
      try {
        await runBrain({
          ...(opts.contextFile !== undefined ? { contextFile: opts.contextFile } : {}),
          ...(opts.replyFile !== undefined ? { replyFile: opts.replyFile } : {}),
          ...(opts.route !== undefined ? { route: opts.route } : {}),
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`oahs brain failed — ${err.name}: ${err.message}\n`);
        process.exitCode = 1;
      }
    });

  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  await buildProgram().parseAsync(argv);
}

// Bundled as bin/oahs.mjs — the bundle entrypoint IS the executable.
void main();
