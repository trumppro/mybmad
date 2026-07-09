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
  approveCommand,
  eventsCommand,
  featureCreateCommand,
  grantCommand,
  importStoriesCommand,
  inboxCommand,
  rejectCommand,
  runToOutput,
  statusCommand,
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
    .action(async (opts: ClientFlags & { type: string; name: string }) =>
      emit(() => actorCreateCommand(clientFrom(opts), { type: opts.type, name: opts.name })),
    );

  withClientFlags(program.command('grant <actorId> <permission>'))
    .description('grant a permission to an actor (admin only)')
    .action(async (actorId: string, permission: string, opts: ClientFlags) =>
      emit(() => grantCommand(clientFrom(opts), { actorId, permission })),
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
