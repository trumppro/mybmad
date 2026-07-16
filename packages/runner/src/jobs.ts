/**
 * @oahs/runner — teammate JOBS runtime (Phase 5, roadmap §6).
 *
 * The generic learning-teammate loop: a mention materializes a reply-only
 * agent job (§5.4); this runtime lets ANY agent-cmd (claude, hermes, …) serve
 * those jobs THROUGH THE RAILS — read context via list_messages, recall via
 * search_agent_memory, reply via post_message, learn via append_agent_memory.
 *
 * Guardrail by construction (§6 "learning never becomes authority"): this
 * module calls NO lifecycle command — no claim, no advance, no gate. The
 * audit trail of a jobs-mode agent shows messages, job completions, and
 * content-free memory events, nothing else. There is no LLM SDK here; the
 * agent binary is an external command, exactly like the worker loop's.
 *
 * One cycle (runJobsOnce):
 *  1. poll list_agent_jobs(agentActorId, status=queued) → first job
 *  2. read the thread via the rails. A private thread the agent was never
 *     invited into answers 403 — the job completes `blocked` with note
 *     'no thread access' (the rails decide visibility, never the runtime).
 *  3. recall: search_agent_memory(contextThreadId = job.threadId), newest 20
 *     (recall failures are soft — memory makes replies better, never gates them)
 *  4. write {job, messages, memories} JSON to a temp CONTEXT_FILE
 *  5. invoke the agent command template ({CONTEXT_FILE} {REPLY_FILE}
 *     {THREAD_ID} {JOB_ID}; env OAHS_CONTEXT_FILE / OAHS_REPLY_FILE);
 *     the agent writes its reply text to REPLY_FILE
 *  6. post_message(threadId, reply, mentions=[trigger author]) → the reverse
 *     mention notifies the human who asked (§5.4)
 *  7. complete_agent_job(done)
 *  8. append_agent_memory(episodic, 'job <id> in thread <id>: <reply head>',
 *     sourceThreadId = job.threadId) — soft: a learning failure never undoes
 *     the delivered reply.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OahsClient } from '@oahs/contracts';
import type { AgentJob, AgentMemory, Message } from '@oahs/core';

import { announceRunner, buildAgentEnv, defaultRunnerLog } from './index.js';

export interface JobsRunnerOptions {
  client: OahsClient;
  /** The agent actor this runtime serves — its OWN jobs, nobody else's. */
  agentActorId: string;
  /**
   * Agent command template. Placeholders: {CONTEXT_FILE} {REPLY_FILE}
   * {THREAD_ID} {JOB_ID}. Also receives env OAHS_CONTEXT_FILE / OAHS_REPLY_FILE.
   */
  agentCmd: string;
  /** Max wall time for one agent invocation (ms). Default 10 minutes. */
  agentTimeoutMs?: number;
  /** Extra environment variables passed to the agent invocation. */
  agentEnv?: Record<string, string>;
  /** Pass the runner's full process env to the agent child (roadmap §8). Off by default. */
  inheritEnv?: boolean;
  /**
   * Progress sink — handled jobs, outcomes, cycle failures. Default:
   * timestamped lines on stderr (same seam as the coding loop).
   */
  log?: (line: string) => void;
}

export interface JobsOnceResult {
  /** true when a queued job existed and was driven to done/blocked. */
  handled: boolean;
  jobId?: string;
  outcome?: 'done' | 'blocked';
  details?: string;
}

/** Newest memories the context file carries (most recent last, append order). */
const RECALL_LIMIT = 20;

/** Episodic learning note keeps only the head of the reply. */
const MEMORY_REPLY_HEAD = 200;

function isRemoteError(error: unknown, name: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { errorName?: unknown }).errorName === name
  );
}

export async function runJobsOnce(options: JobsRunnerOptions): Promise<JobsOnceResult> {
  const { client, agentActorId } = options;
  const log = options.log ?? defaultRunnerLog;

  // 1 — poll: this agent's queued jobs only; take the first.
  const queued = await client.call<AgentJob[]>('list_agent_jobs', {
    agentActorId,
    status: 'queued',
  });
  const job = queued[0];
  if (job === undefined) return { handled: false };
  log(`job ${job.id} picked up (thread ${job.threadId})`);

  // 2 — read the thread THROUGH the rails. 403 = the agent may not see this
  // context (private thread, never invited) → blocked, note only. No retry,
  // no privilege: visibility is the engine's call.
  let messages: Message[];
  try {
    messages = await client.call<Message[]>('list_messages', { threadId: job.threadId });
  } catch (error) {
    if (isRemoteError(error, 'PermissionDeniedError')) {
      await client.call('complete_agent_job', {
        jobId: job.id,
        status: 'blocked',
        note: 'no thread access',
      });
      return { handled: true, jobId: job.id, outcome: 'blocked', details: 'no thread access' };
    }
    throw error;
  }

  // 2.5 — resolve the job's PROJECT via thread → feature → project (D-H).
  // Soft: an unbound thread (or any resolution failure) simply means
  // unscoped recall and a global memory.
  let projectId: string | undefined;
  try {
    const visibleThreads = await client.call<Array<{ id: string; featureId: string | null }>>(
      'list_threads',
      {},
    );
    const thread = visibleThreads.find((t) => t.id === job.threadId);
    if (thread?.featureId != null) {
      const feature = await client.call<{ projectId: string }>('get_feature', {
        featureId: thread.featureId,
      });
      projectId = feature.projectId;
    }
  } catch {
    /* project scoping is additive, never load-bearing */
  }

  // 3 — recall (soft): owner-scoped by construction; the engine already
  // filters private-sourced memories to their source thread (§6). Scoped to
  // the job's project + global craft when the thread is project-bound.
  let memories: AgentMemory[] = [];
  try {
    const recalled = await client.call<AgentMemory[]>('search_agent_memory', {
      contextThreadId: job.threadId,
      ...(projectId !== undefined ? { projectId } : {}),
    });
    memories = recalled.slice(-RECALL_LIMIT);
  } catch {
    /* recall never gates a reply */
  }

  // 4/5 — context file in, reply file out.
  const dir = mkdtempSync(join(tmpdir(), 'oahs-job-'));
  try {
    const contextFile = join(dir, 'context.json');
    const replyFile = join(dir, 'reply.txt');
    writeFileSync(contextFile, `${JSON.stringify({ job, messages, memories }, null, 2)}\n`, 'utf8');

    const command = options.agentCmd
      .replaceAll('{CONTEXT_FILE}', contextFile)
      .replaceAll('{REPLY_FILE}', replyFile)
      .replaceAll('{THREAD_ID}', job.threadId)
      .replaceAll('{JOB_ID}', job.id);
    const invoked = spawnSync('bash', ['-lc', command], {
      cwd: dir,
      encoding: 'utf8',
      timeout: options.agentTimeoutMs ?? 10 * 60 * 1000,
      killSignal: 'SIGKILL',
      env: buildAgentEnv({
        agentEnv: options.agentEnv,
        inheritEnv: options.inheritEnv,
        extra: { OAHS_CONTEXT_FILE: contextFile, OAHS_REPLY_FILE: replyFile },
      }),
    });

    const reply = existsSync(replyFile) ? readFileSync(replyFile, 'utf8').trim() : '';
    if (reply === '') {
      const note = `agent wrote no reply (exit ${String(invoked.status ?? -1)})`;
      const stderrHead = (invoked.stderr ?? '').trim().slice(0, 300);
      log(`job ${job.id} → blocked: ${note}${stderrHead !== '' ? ` — stderr: ${stderrHead}` : ''}`);
      await client.call('complete_agent_job', { jobId: job.id, status: 'blocked', note });
      return { handled: true, jobId: job.id, outcome: 'blocked', details: note };
    }

    // 6 — reply with the reverse mention to whoever triggered the job.
    const trigger = messages.find((m) => m.id === job.messageId);
    await client.call<Message>('post_message', {
      threadId: job.threadId,
      body: reply,
      ...(trigger !== undefined ? { mentions: [trigger.authorId] } : {}),
    });

    // 7 — complete: notifies the mentioner; nothing else moves (§5.4).
    await client.call('complete_agent_job', { jobId: job.id, status: 'done' });

    // 8 — learn (soft): episodic note, source-scoped to the job's thread.
    // The agent read the thread above, so participation already holds for a
    // private thread — but a learning failure must never undo the reply.
    try {
      await client.call('append_agent_memory', {
        kind: 'episodic',
        content: `job ${job.id} in thread ${job.threadId}: ${reply.slice(0, MEMORY_REPLY_HEAD)}`,
        sourceThreadId: job.threadId,
        ...(projectId !== undefined ? { projectId } : {}),
      });
    } catch {
      /* learning is additive, never load-bearing */
    }

    log(`job ${job.id} → done (replied in thread ${job.threadId})`);
    return { handled: true, jobId: job.id, outcome: 'done' };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run until stopped: poll → runJobsOnce → sleep(pollMs). SIGINT exits cleanly.
 * A FAILED cycle is logged and backed off, never fatal (same contract as
 * workLoop); `--once` keeps script semantics: the error propagates.
 */
export async function jobsLoop(
  options: JobsRunnerOptions & {
    pollMs?: number;
    /** Base backoff after a failed cycle (ms), doubling, capped 32×. Default 5_000. */
    backoffMs?: number;
    once?: boolean;
    /** TEST ONLY: extra loop-exit condition, checked after every cycle. */
    stopWhen?: () => boolean;
  },
): Promise<void> {
  const log = options.log ?? defaultRunnerLog;
  const opts = { ...options, log };
  const backoffMs = options.backoffMs ?? 5_000;
  const announcer = announceRunner(options.client, { mode: 'jobs', log });
  await announcer.ready;
  let stopped = false;
  let wake: (() => void) | undefined;
  const onSigint = (): void => {
    stopped = true;
    wake?.();
  };
  const sleep = async (ms: number): Promise<void> => {
    await new Promise<void>((resolveSleep) => {
      wake = resolveSleep;
      setTimeout(resolveSleep, ms);
    });
    wake = undefined;
  };
  process.once('SIGINT', onSigint);
  let consecutiveFailures = 0;
  try {
    for (;;) {
      let result;
      try {
        result = await runJobsOnce(opts);
        consecutiveFailures = 0;
      } catch (error) {
        if (options.once === true) throw error;
        consecutiveFailures += 1;
        const err = error instanceof Error ? error : new Error(String(error));
        const delay = Math.min(backoffMs * 2 ** (consecutiveFailures - 1), backoffMs * 32);
        log(
          `cycle failed (${consecutiveFailures} in a row): ${err.name}: ${err.message} — retrying in ${delay}ms`,
        );
        if (stopped || options.stopWhen?.() === true) return;
        await sleep(delay);
        if (stopped) return;
        continue;
      }
      if (options.once === true || stopped || options.stopWhen?.() === true) return;
      if (!result.handled) {
        await sleep(options.pollMs ?? 15_000);
        if (stopped) return;
      }
    }
  } finally {
    announcer.stop();
    process.removeListener('SIGINT', onSigint);
  }
}
