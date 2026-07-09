/**
 * The `oahs` binary — commander wiring ONLY. Every gate-holder command is a
 * pure function in src/commands/ taking (client, opts); serve lives in
 * src/serve.ts; the worker loop lives in @oahs/runner and is imported LAZILY
 * so the rest of the CLI works while the runner is still landing (story 14).
 *
 * Env is read here and only here: OAHS_TOKEN (client auth) and
 * OAHS_ADMIN_TOKEN (serve bootstrap).
 */
import { resolve } from 'node:path';

import { Command } from 'commander';
import { makeClient, type OahsClient } from '@oahs/contracts';

import {
  actorCreateCommand,
  advanceCommand,
  adviseNextTaskCommand,
  adviseReconcileCommand,
  approveCommand,
  authzCommand,
  eventsCommand,
  featureCreateCommand,
  gatePolicySetCommand,
  governanceSetCommand,
  grantCommand,
  importStoriesCommand,
  inboxCommand,
  jobCompleteCommand,
  jobsCommand,
  messagesCommand,
  notificationsCommand,
  planSetCommand,
  policySetCommand,
  postCommand,
  rejectCommand,
  roleAssignCommand,
  roleListCommand,
  roleRevokeCommand,
  runToOutput,
  statusCommand,
  threadCreateCommand,
  threadListCommand,
} from './commands/index.js';
import { DEFAULT_PORT, startServe } from './serve.js';

const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;

interface ClientFlags {
  url: string;
  token?: string;
}

function clientFrom(flags: ClientFlags): OahsClient {
  const token = flags.token ?? process.env['OAHS_TOKEN'];
  if (token === undefined || token.length === 0) {
    throw new Error('missing token: pass --token <token> or set OAHS_TOKEN');
  }
  return makeClient({ baseUrl: flags.url, token });
}

/** Attach the shared client flags to a gate-holder command. */
function withClientFlags(cmd: Command): Command {
  return cmd
    .option('--url <url>', 'spine-api base URL', DEFAULT_URL)
    .option('--token <token>', 'bearer token (default: env OAHS_TOKEN)');
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
    .description('start the spine-api (HTTP /rpc/* + MCP /mcp)')
    .option('--port <port>', 'TCP port', String(DEFAULT_PORT))
    .option('--admin-token <token>', 'bootstrap admin token (default: env OAHS_ADMIN_TOKEN, else generated)')
    .option('--data <dir>', 'persistence directory (durable PGlite + token store)')
    .action(async (opts: { port: string; adminToken?: string; data?: string }) => {
      try {
        const adminToken = opts.adminToken ?? process.env['OAHS_ADMIN_TOKEN'];
        const handle = await startServe({
          port: Number(opts.port),
          ...(adminToken !== undefined && adminToken.length > 0 ? { adminToken } : {}),
          ...(opts.data !== undefined ? { dataDir: resolve(opts.data) } : {}),
        });
        process.stdout.write(
          `oahs spine-api listening on :${handle.port} (HTTP /rpc/*, MCP /mcp; engine: ${handle.engineKind}${
            opts.data !== undefined ? `, data: ${resolve(opts.data)}` : ''
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
    .description('approve a gate (spec_approval pins verification commands)')
    .requiredOption('--gate <gate>', 'spec_approval | review_approval')
    .option('--pin <cmd>', 'pin a verification command (repeatable, spec_approval only)', collect, [])
    .action(async (workItemId: string, opts: ClientFlags & { gate: string; pin: string[] }) =>
      emit(() => approveCommand(clientFrom(opts), { workItemId, gate: opts.gate, pin: opts.pin })),
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
    .action(async (opts: ClientFlags) => emit(() => statusCommand(clientFrom(opts))));

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
    .description('create a feature; prints featureId')
    .action(async (opts: ClientFlags) => emit(() => featureCreateCommand(clientFrom(opts))));

  withClientFlags(program.command('import <featureId> <storiesYamlPath>'))
    .description('import a stories.yaml file into a feature (idempotent)')
    .action(async (featureId: string, storiesYamlPath: string, opts: ClientFlags) =>
      emit(() => importStoriesCommand(clientFrom(opts), { featureId, path: storiesYamlPath })),
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
    .option('--status <status>', 'queued | done | blocked')
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

  withClientFlags(program.command('events [streamId]'))
    .description('audit query over the append-only event log')
    .action(async (streamId: string | undefined, opts: ClientFlags) =>
      emit(() =>
        eventsCommand(clientFrom(opts), streamId !== undefined ? { streamId } : {}),
      ),
    );

  // -- work (runner handoff; @oahs/runner lands with story 14) -------------------
  withClientFlags(program.command('work'))
    .description('run the BYO worker loop against this spine (requires @oahs/runner)')
    .requiredOption('--repo <path>', 'target project git checkout')
    .requiredOption('--spec-folder <rel>', 'spec folder relative to the repo root')
    .requiredOption('--agent-cmd <template>', 'coding-agent command template ({SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE})')
    .option('--once', 'dispatch at most one work item, then exit')
    .option('--poll <ms>', 'poll interval in milliseconds')
    .action(
      async (
        opts: ClientFlags & {
          repo: string;
          specFolder: string;
          agentCmd: string;
          once?: boolean;
          poll?: string;
        },
      ) => {
        try {
          const client = clientFrom(opts);
          // LAZY import: the runner is a fixed interface that may still be a
          // stub — the rest of the CLI must never pay for (or break on) it.
          const runner = await import('@oahs/runner');
          await runner.workLoop({
            client,
            repoPath: resolve(opts.repo),
            specFolder: opts.specFolder,
            agentCmd: opts.agentCmd,
            ...(opts.poll !== undefined ? { pollMs: Number(opts.poll) } : {}),
            ...(opts.once === true ? { once: true } : {}),
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          process.stderr.write(`oahs work failed — ${err.name}: ${err.message}\n`);
          process.exitCode = 1;
        }
      },
    );

  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  await buildProgram().parseAsync(argv);
}

// Bundled as bin/oahs.mjs — the bundle entrypoint IS the executable.
void main();
