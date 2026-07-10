/**
 * Supervisor (Phase 7 Wave 4): `oahs work --manifest runners.yaml` — ONE
 * process runs N runner loops. Kills the "3 projects × 2 teammates ≈ 8
 * terminals" problem: each manifest entry is a coding or jobs loop with its
 * own identity (from the profile store), its own project binding, and its
 * own log prefix. A crashed loop restarts with backoff instead of taking its
 * siblings down; SIGINT stops everything (each loop already handles it).
 *
 * The manifest is ORCHESTRATION ONLY — every entry still authenticates as a
 * real actor and goes through the same rails as a hand-started runner.
 *
 *   runners:
 *     - name: alpha-dev
 *       identity: dev            # profile store; or token: / tokenEnv:
 *       project: alpha-app       # repo + spec folder from the record
 *       agentCmd: node agent.mjs
 *     - name: hermes
 *       identity: hermes
 *       mode: jobs               # reply-only teammate loop
 *       agentCmd: hermes --print
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { makeClient, type OahsClient } from '@oahs/contracts';
import { defaultRunnerLog, jobsLoop, workLoop } from '@oahs/runner';

import { defaultUrl, resolveIdentity } from './cli-config.js';

interface ManifestEntry {
  name: string;
  agentCmd: string;
  mode?: 'coding' | 'jobs';
  identity?: string;
  token?: string;
  tokenEnv?: string;
  project?: string;
  feature?: string;
  repo?: string;
  specFolder?: string;
  poll?: number;
  claimTtl?: number;
  heartbeat?: number;
  url?: string;
}

export interface SupervisorOptions {
  manifestPath: string;
  /** Server URL override; per-entry `url` wins, then this, then the profile. */
  url?: string;
  /** One cycle per loop, then return (tests, demos). */
  once?: boolean;
  env?: NodeJS.ProcessEnv;
  log?: (line: string) => void;
  /** Delay before restarting a crashed loop. Default 5_000. */
  restartBackoffMs?: number;
}

function entryToken(entry: ManifestEntry, env: NodeJS.ProcessEnv): string {
  if (entry.token !== undefined && entry.token.length > 0) return entry.token;
  if (entry.tokenEnv !== undefined) {
    const fromEnv = env[entry.tokenEnv];
    if (fromEnv === undefined || fromEnv.length === 0) {
      throw new Error(`runner "${entry.name}": env ${entry.tokenEnv} is empty`);
    }
    return fromEnv;
  }
  if (entry.identity !== undefined) {
    try {
      return resolveIdentity({ as: entry.identity }, env).token;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`runner "${entry.name}": ${message}`);
    }
  }
  throw new Error(`runner "${entry.name}": one of identity / token / tokenEnv is required`);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function runSupervisor(options: SupervisorOptions): Promise<void> {
  const env = options.env ?? process.env;
  const log = options.log ?? defaultRunnerLog;
  const backoffMs = options.restartBackoffMs ?? 5_000;

  const raw = parseYaml(readFileSync(resolve(options.manifestPath), 'utf8')) as {
    runners?: ManifestEntry[];
  };
  const entries = raw?.runners ?? [];
  if (entries.length === 0) throw new Error('manifest has no runners');

  // Validate EVERYTHING before starting ANY loop: a typo'd identity must be
  // a clear error, never a silently missing teammate.
  const prepared = entries.map((entry) => {
    if (typeof entry.name !== 'string' || entry.name.length === 0) {
      throw new Error('every manifest runner needs a name');
    }
    if (typeof entry.agentCmd !== 'string' || entry.agentCmd.length === 0) {
      throw new Error(`runner "${entry.name}": agentCmd is required`);
    }
    const token = entryToken(entry, env);
    const url = entry.url ?? options.url ?? defaultUrl(env);
    const client = makeClient({ baseUrl: url, token });
    return { entry, client };
  });

  log(`supervisor: ${String(prepared.length)} runner(s) from ${options.manifestPath}`);

  const runEntry = async ({ entry, client }: { entry: ManifestEntry; client: OahsClient }) => {
    const prefixed = (line: string): void => log(`[${entry.name}] ${line}`);
    for (;;) {
      try {
        if (entry.mode === 'jobs') {
          const me = await client.call<{ actorId: string }>('whoami');
          await jobsLoop({
            client,
            agentActorId: me.actorId,
            agentCmd: entry.agentCmd,
            log: prefixed,
            ...(entry.poll !== undefined ? { pollMs: entry.poll } : {}),
            ...(options.once === true ? { once: true } : {}),
          });
          return;
        }
        // Coding mode: repo + spec folder from the entry, else the project record.
        let repoPath = entry.repo;
        let specFolder = entry.specFolder;
        if (entry.project !== undefined) {
          const record = await client.call<{
            repoPath: string | null;
            defaultSpecFolder: string | null;
          }>('project_get', { projectId: entry.project });
          repoPath = repoPath ?? record.repoPath ?? undefined;
          specFolder = specFolder ?? record.defaultSpecFolder ?? undefined;
        }
        if (repoPath === undefined || specFolder === undefined) {
          throw new Error(
            `runner "${entry.name}": needs repo + specFolder (on the entry or the project record)`,
          );
        }
        await workLoop({
          client,
          repoPath: resolve(repoPath),
          specFolder,
          agentCmd: entry.agentCmd,
          log: prefixed,
          ...(entry.project !== undefined ? { projectId: entry.project } : {}),
          ...(entry.feature !== undefined ? { featureId: entry.feature } : {}),
          ...(entry.poll !== undefined ? { pollMs: entry.poll } : {}),
          ...(entry.claimTtl !== undefined ? { claimTtlMs: entry.claimTtl } : {}),
          ...(entry.heartbeat !== undefined ? { heartbeatMs: entry.heartbeat } : {}),
          ...(options.once === true ? { once: true } : {}),
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (options.once === true) {
          throw new Error(`runner "${entry.name}": ${message}`);
        }
        prefixed(`loop crashed: ${message} — restarting in ${String(backoffMs)}ms`);
        await sleep(backoffMs);
      }
    }
  };

  await Promise.all(prepared.map(runEntry));
}
