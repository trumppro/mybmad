/**
 * §10.2 — the dispatcher: the ONE process that spawns work, built so the thing
 * that RUNS a claim never holds the credentials that decide what runs (D13,
 * §4.3). It polls, claims, mints a job-scoped token and reads the task context
 * on the HOST (static token), then hands a CONTAINER a complete ASSIGNMENT plus
 * the mutation-only scoped token from §10.1. The container runs `oahs work
 * --once` (assigned mode) against the mounted worktree and the spine — and
 * nothing else: no static/admin token, no `OAHS_MODEL_*` from here.
 *
 * Docker is reached through an INJECTABLE spawner so CI drives the whole
 * orchestration with a fake container (no real Docker), the way the supervisor
 * test injects loops.
 */
import { spawn as spawnChild } from 'node:child_process';
import { statSync } from 'node:fs';

import type { OahsClient } from '@oahs/contracts';
import type { Claim, WorkItem, WorkItemState } from '@oahs/core';
import {
  GitHubForge,
  openPrForBranch,
  pushClaimBranch,
  resolvePushAnchor,
  type FetchImpl,
  type PushCredential,
} from '@oahs/runner';

/** Where the host checkout is mounted inside the container. */
export const CONTAINER_MOUNT = '/repo';

/** One container run: the argv passed to `docker` and the env handed to it. */
export interface SpawnRequest {
  argv: string[];
  env: Record<string, string>;
}

export interface SpawnResult {
  /** Container exit code (non-zero → the dispatch failed without self-reporting). */
  code: number;
  /** Tail of the container's combined output — explains a non-zero exit. */
  tail: string;
}

/** Runs one container to completion. Default: real `docker run`; injected in tests. */
export type ContainerSpawner = (req: SpawnRequest) => Promise<SpawnResult>;

/**
 * §10.2: the agent-env handed to a container = explicit `--agent-env` pairs PLUS
 * the model creds (OAHS_MODEL_*) the dispatcher holds, forwarded to the AGENT
 * CHILD (via the inner `oahs work --agent-env`). Explicit pairs win on conflict.
 * These reach only the agent, never the container's scoped-token env, never the
 * spine (§0.1) — buildSpawnRequest puts them on the inner argv, not `req.env`.
 * Pure (source env injected) so it is unit-testable without a real dispatcher.
 */
export function withForwardedModelEnv(
  explicit: Record<string, string>,
  sourceEnv: NodeJS.ProcessEnv,
): Record<string, string> {
  const merged: Record<string, string> = { ...explicit };
  for (const [key, value] of Object.entries(sourceEnv)) {
    if (key.startsWith('OAHS_MODEL_') && value !== undefined && !(key in merged)) {
      merged[key] = value;
    }
  }
  return merged;
}

export interface DispatchOptions {
  /**
   * Host client on the STATIC token — the ONLY thing that polls, claims, mints,
   * reads context, and (on a container crash) blocks/releases. The container
   * never receives this token.
   */
  client: OahsClient;
  /** Spine base URL THIS process uses to poll/claim/mint. */
  baseUrl: string;
  /**
   * Spine base URL the CONTAINER should use (its `OAHS_URL`). Defaults to
   * `baseUrl`, which is right only when the dispatcher and the container see the
   * spine at the same address — true under compose (both on one network), false
   * whenever the dispatcher runs on the host: its `127.0.0.1` is the container's
   * own loopback. On Docker Desktop that is `http://host.docker.internal:<port>`.
   */
  containerUrl?: string;
  /** Agent-runtime image: coding CLI + git + the oahs bin. */
  image: string;
  /** Host path of the project checkout, bind-mounted into the container. */
  repoPath: string;
  /** Spec folder relative to the repo root. */
  specFolder: string;
  /** Coding-agent command template run inside the container. */
  agentCmd: string;
  /** Restrict dispatch to one project (id or slug). */
  projectId?: string;
  /** Restrict dispatch to one feature. */
  featureId?: string;
  /** Claim lease TTL (ms) — sized to a whole container run. */
  claimTtlMs?: number;
  /** Git remote the claim branch is pushed to. Default 'origin'. */
  remote?: string;
  /**
   * Run each claim's container as this `uid:gid`. Default: whoever owns the
   * checkout. The container writes into a BIND-MOUNTED repo, so its user must own
   * those files — otherwise git refuses outright ("detected dubious ownership")
   * and, if it did not, the writes would fail on permissions anyway. Docker
   * Desktop hides this by remapping ownership at the mount; every Linux host,
   * i.e. every real deployment, does not.
   */
  containerUser?: string;
  /**
   * Docker network to attach each claim's container to — the network on which
   * `baseUrl` resolves. Under compose that is the project network the spine sits
   * on. Absent → the daemon's default bridge, where the spine is unreachable
   * unless `baseUrl` names a routable host.
   */
  network?: string;
  /**
   * §10.3 — the CLAIM-SCOPED push credential. It stays on the HOST: the
   * container is given no push credential at all, and the dispatcher pushes the
   * claim branch on its behalf once it exits. Absent → the operator's ambient
   * credential helper does the push (BYO-shaped hosts).
   */
  pushCredential?: PushCredential;
  /**
   * §9.6 PR-on-dispatch. The dispatcher opens the PR because it is the side that
   * pushed: the container holds no forge token and, since §10.3, cannot push at
   * all. The spine never sees this token (§0.1) — it lives in this process only.
   */
  forge?: { owner: string; repo: string; baseBranch: string; token: string; baseUrl?: string; fetchImpl?: FetchImpl };
  /**
   * Agent env pairs (e.g. model keys) forwarded to the AGENT child INSIDE the
   * container via the inner `oahs work --agent-env`. Deliberately NOT part of
   * the container's process env — the scoped-token env stays free of model keys
   * (§0.1: the dispatcher is not the gateway).
   */
  agentEnv?: Record<string, string>;
  /** Docker spawner. Default: real `docker run`. Injected in tests. */
  spawn?: ContainerSpawner;
  /** Progress sink. Default: timestamped stderr lines. */
  log?: (line: string) => void;
}

export interface DispatchResult {
  dispatched: boolean;
  workItemId?: string;
  claimId?: string;
  /** `container_exited`: the container ran and self-reported. `blocked`: it crashed and the dispatcher blocked it. */
  outcome?: 'container_exited' | 'blocked';
  details?: string;
}

function isConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { errorName?: unknown }).errorName === 'ConflictError'
  );
}

function defaultLog(line: string): void {
  process.stderr.write(`[dispatch] ${line}\n`);
}

/**
 * The real spawner: `docker run …`. The container's ENVIRONMENT holds only the vars
 * named by `-e` flags (OAHS_URL/OAHS_TOKEN/OAHS_ASSIGNMENT), whose values come from
 * `req.env` set on the docker CLI's own env.
 *
 * `OAHS_MODEL_*` is NOT in that env — but do not read that as "the keys stay out of
 * the container". They cannot: the agent runs INSIDE it and needs them. They go on
 * the inner `oahs work --agent-env` ARGV instead, so they are in the container, on
 * PID 1's command line, readable via /proc/1/cmdline and `docker inspect`.
 *
 * Be precise about what keeping them out of the env buys, because it is less than it
 * looks: a child does not INHERIT them (env is inherited automatically, argv is not),
 * but any process in the container can still read them from /proc/1/cmdline — verified
 * by doing it inside this very image. So it narrows ACCIDENTAL exposure (a tool that
 * dumps its environ into a log leaks nothing) and does nothing at all against a process
 * that goes looking. Do not sell it as containment.
 *
 * The boundary that IS real: the keys never reach the SPINE (§0.1), and the container
 * is trusted with them because the agent inside cannot work without them.
 */
function realDockerSpawn(req: SpawnRequest): Promise<SpawnResult> {
  return new Promise((resolvePromise) => {
    const child = spawnChild('docker', req.argv, {
      env: { ...process.env, ...req.env },
    });
    let tail = '';
    const keep = (chunk: Buffer): void => {
      tail = (tail + chunk.toString('utf8')).slice(-8000);
    };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', (error) => resolvePromise({ code: 127, tail: `${tail}\n${error.message}` }));
    child.on('close', (code) => resolvePromise({ code: code ?? -1, tail }));
  });
}

/**
 * `uid:gid` of whoever owns the checkout, or undefined when that cannot be known
 * (Windows, or a dispatcher that cannot see the path — a containerised dispatcher
 * is handed the HOST path, which it may not have mounted). Undefined means "let
 * the image decide", which is right on Docker Desktop and wrong on Linux — hence
 * the explicit --container-user escape hatch.
 */
function repoOwner(repoPath: string): string | undefined {
  if (process.platform === 'win32') return undefined;
  try {
    const st = statSync(repoPath);
    return `${st.uid}:${st.gid}`;
  } catch {
    return undefined;
  }
}

/** Build the `docker run` argv + env for one claim's container. */
function buildSpawnRequest(
  options: DispatchOptions,
  scopedToken: string,
  assignment: { claim: Claim; workItem: WorkItem; entryState: WorkItemState },
): SpawnRequest {
  const containerUser = options.containerUser ?? repoOwner(options.repoPath);
  const agentEnvFlags: string[] = [];
  for (const [key, value] of Object.entries(options.agentEnv ?? {})) {
    agentEnvFlags.push('--agent-env', `${key}=${value}`);
  }
  return {
    argv: [
      'run',
      '--rm',
      // Own the files we are about to write. See DispatchOptions.containerUser.
      ...(containerUser !== undefined ? ['--user', containerUser] : []),
      // The container must be able to REACH the spine. It is a sibling — the
      // dispatcher talks to the docker daemon, so the new container lands on the
      // default bridge and shares no network with us. Without this the container
      // resolves OAHS_URL against ITSELF: a host-run dispatcher's 127.0.0.1 is
      // the container's own loopback (ECONNREFUSED), and under compose the
      // service name simply does not resolve. Verified against a real daemon.
      ...(options.network !== undefined ? ['--network', options.network] : []),
      '-v',
      `${options.repoPath}:${CONTAINER_MOUNT}`,
      // These three are the container's ENVIRONMENT. Model keys are not among them —
      // but they do reach the container, on the inner argv assembled below. See
      // realDockerSpawn's comment for why that is a narrower win than it reads.
      '-e',
      'OAHS_URL',
      '-e',
      'OAHS_TOKEN',
      '-e',
      'OAHS_ASSIGNMENT',
      options.image,
      'oahs',
      'work',
      '--once',
      '--repo',
      CONTAINER_MOUNT,
      '--spec-folder',
      options.specFolder,
      '--agent-cmd',
      options.agentCmd,
      ...agentEnvFlags,
    ],
    env: {
      OAHS_URL: options.containerUrl ?? options.baseUrl,
      // The container's ONLY spine credential — scoped, mutation-only, lease-bound.
      OAHS_TOKEN: scopedToken,
      OAHS_ASSIGNMENT: JSON.stringify(assignment),
    },
  };
}

/**
 * One dispatch cycle: claim a ready item on the host, mint a scoped token, and
 * run it in a container. Returns `{dispatched:false}` when nothing is ready.
 */
export async function dispatchOnce(options: DispatchOptions): Promise<DispatchResult> {
  const log = options.log ?? defaultLog;
  const spawn = options.spawn ?? realDockerSpawn;
  const { client } = options;

  // 1 — poll (static token). Same selection as the runner: ready_for_dev, then a
  //     crashed in_progress; unblocked only; first wins.
  const listUnblocked = async (state: WorkItemState): Promise<WorkItem[]> =>
    (
      await client.call<WorkItem[]>('list_work_items', {
        state,
        claimable: true,
        ...(options.featureId !== undefined ? { featureId: options.featureId } : {}),
        ...(options.projectId !== undefined ? { projectId: options.projectId } : {}),
      })
    ).filter((item) => item.blockedReason === null);
  let candidates = await listUnblocked('ready_for_dev');
  if (candidates.length === 0) candidates = await listUnblocked('in_progress');
  const picked = candidates[0];
  if (picked === undefined) return { dispatched: false };

  // 2 — claim (static token).
  let claim: Claim;
  try {
    claim = await client.call<Claim>('claim_task', {
      workItemId: picked.id,
      ...(options.claimTtlMs !== undefined ? { ttlMs: options.claimTtlMs } : {}),
    });
  } catch (error) {
    if (isConflict(error)) {
      log(`lost the claim race for ${picked.externalKey}`);
      return { dispatched: false };
    }
    throw error;
  }

  // 3 — mint the JOB-SCOPED token. This is the container's ONLY credential.
  const { token: scopedToken } = await client.call<{ token: string; expiresAt: number }>(
    'mint_claim_token',
    { claimId: claim.id },
  );

  // 4 — read the task context on the HOST (the scoped token cannot) and pack a
  //     complete assignment; the container needs no spine read of its own.
  const context = await client.call<{ workItem: WorkItem; entryState: WorkItemState }>(
    'get_task_context',
    { workItemId: claim.workItemId },
  );
  const assignment = { claim, workItem: context.workItem, entryState: context.entryState };

  // 4.5 — §8/§10.3: take the trusted push-guard anchor NOW, on the HOST, before
  //       any agent can touch the bind-mounted repo's config. The dispatcher is
  //       the process that will push, so the anchor must be fingerprinted in the
  //       environment that pushes; the container never records one.
  const remote = options.remote ?? 'origin';
  const trustedPushGuard = await resolvePushAnchor({
    client,
    workItemId: picked.id,
    repoPath: options.repoPath,
    remote,
  });

  // 5 — one container per claim.
  log(`dispatch ${picked.externalKey} (claim ${claim.id}) → container ${options.image}`);
  const result = await spawn(buildSpawnRequest(options, scopedToken, assignment));

  // 6 — the container's `oahs work --once` already advanced (in_review) or
  //     blocked itself; on exit 0 the dispatcher touches nothing. A non-zero
  //     exit is a failure the container could NOT self-report — record the tail
  //     as evidence, block `other`, and release the lease (static token).
  if (result.code === 0) {
    log(`container for ${picked.externalKey} exited 0`);
    // 6.5 — §10.3: the container held no push credential and pushed nothing, so
    //       the claim branch is local in the bind-mounted repo. Push it here, on
    //       the host, under the §8 guard and a claim-scoped credential, and record
    //       the reachable `commit` the done-gate reads.
    //
    //       ONLY for a run that reached in_review. A self-blocked container still
    //       leaves `claim/<id>` behind — runOnce creates the branch with `worktree
    //       add -b` BEFORE the agent runs and `worktree remove` does not delete it
    //       — so "a branch exists" is NOT evidence of success. Pushing on a
    //       blocked item would certify `reachableOnRemote:true` for work its own
    //       HALT rejected, and re-blocking would overwrite the container's real
    //       blockedReason (block_task assigns unconditionally, and downgrading
    //       e.g. review_non_convergence to `other` loses its unblock privilege).
    const after = await client.call<WorkItem>('get_work_item', { workItemId: picked.id });
    if (after.blockedReason !== null || after.state !== 'in_review') {
      log(`container for ${picked.externalKey} self-reported ${after.blockedReason ?? after.state} — no push`);
      return { dispatched: true, workItemId: picked.id, claimId: claim.id, outcome: 'container_exited' };
    }
    const push = await pushClaimBranch({
      client,
      workItemId: picked.id,
      repoPath: options.repoPath,
      remote,
      branch: `claim/${claim.id}`,
      trustedPushGuard,
      ...(options.pushCredential !== undefined ? { credential: options.pushCredential } : {}),
    });
    if (push.pushed) {
      log(`pushed claim/${claim.id} for ${picked.externalKey}`);
      // §9.6: the branch is on the remote, so the PR is openable — and this is the
      // only process that can. Evidence-only and failure-tolerant: a forge hiccup
      // must not undo a good dispatch. Without this the gate policy
      // `requireMergedPr` is unsatisfiable for every containerised run.
      if (options.forge !== undefined) {
        const number = await openPrForBranch({
          client,
          workItemId: picked.id,
          branch: `claim/${claim.id}`,
          forge: {
            client: new GitHubForge({
              owner: options.forge.owner,
              repo: options.forge.repo,
              token: options.forge.token,
              ...(options.forge.baseUrl !== undefined ? { baseUrl: options.forge.baseUrl } : {}),
              ...(options.forge.fetchImpl !== undefined ? { fetchImpl: options.forge.fetchImpl } : {}),
            }),
            baseBranch: options.forge.baseBranch,
            title: `${picked.externalKey}: ${picked.title}`,
          },
          submit: async (kind, payload) => {
            // No fencing token: the container released the claim on its way out,
            // and a stale one would be REJECTED, whereas evidence needs none.
            await client.call('submit_evidence', { workItemId: picked.id, evidence: { kind, payload } });
          },
          log,
        });
        if (number !== null) log(`opened PR #${number} for ${picked.externalKey}`);
      }
    } else if (push.reason !== undefined) {
      // The work exists but must not be certified as reachable: record it (already
      // done as `commit{pushRefused}`) and block for a human.
      log(`push not completed for ${picked.externalKey}: ${push.reason} — blocking (other)`);
      await client.call('block_task', { workItemId: picked.id, reason: 'other' });
      return {
        dispatched: true,
        workItemId: picked.id,
        claimId: claim.id,
        outcome: 'blocked',
        details: push.reason,
      };
    }
    return { dispatched: true, workItemId: picked.id, claimId: claim.id, outcome: 'container_exited' };
  }
  const tail = result.tail.trim().slice(-4000);
  log(`container for ${picked.externalKey} exited ${result.code} — blocking (other)`);
  await client.call('submit_evidence', {
    workItemId: picked.id,
    evidence: {
      kind: 'halt_report',
      payload: {
        status: 'blocked',
        blockingCondition: 'other',
        autoRunResult: tail,
        agentExitCode: result.code,
        source: 'dispatcher',
      },
    },
    fencingToken: claim.fencingToken,
  });
  await client.call('block_task', {
    workItemId: picked.id,
    reason: 'other',
    fencingToken: claim.fencingToken,
  });
  // Release is best-effort: the container may have released the lease itself
  // before dying, so a "no live claim" rejection here is expected, not fatal —
  // the block above already landed.
  await client
    .call('release_claim', {
      claimId: claim.id,
      fencingToken: claim.fencingToken,
      reason: `dispatch container exited ${result.code}`,
    })
    .catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      log(`release after block failed for claim ${claim.id}: ${err.message}`);
    });
  return { dispatched: true, workItemId: picked.id, claimId: claim.id, outcome: 'blocked', details: tail };
}

/**
 * Poll-and-dispatch forever (or one cycle with `once`). Between cycles it sleeps
 * `pollMs`; a failed cycle logs and backs off rather than killing the process.
 */
export async function dispatchLoop(
  options: DispatchOptions & { once?: boolean; pollMs?: number },
): Promise<void> {
  const log = options.log ?? defaultLog;
  const pollMs = options.pollMs ?? 15_000;
  for (;;) {
    let dispatched = false;
    try {
      const result = await dispatchOnce(options);
      dispatched = result.dispatched;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log(`cycle failed — ${err.name}: ${err.message}`);
    }
    if (options.once === true) return;
    // Nothing ready → wait a poll interval; a dispatch just happened → loop
    // straight into the next claim.
    if (!dispatched) await new Promise((r) => setTimeout(r, pollMs));
  }
}
