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

  // 1 — poll: this agent's queued jobs only; take the first.
  const queued = await client.call<AgentJob[]>('list_agent_jobs', {
    agentActorId,
    status: 'queued',
  });
  const job = queued[0];
  if (job === undefined) return { handled: false };

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

  // 3 — recall (soft): owner-scoped by construction; the engine already
  // filters private-sourced memories to their source thread (§6).
  let memories: AgentMemory[] = [];
  try {
    const recalled = await client.call<AgentMemory[]>('search_agent_memory', {
      contextThreadId: job.threadId,
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
      env: {
        ...process.env,
        ...options.agentEnv,
        OAHS_CONTEXT_FILE: contextFile,
        OAHS_REPLY_FILE: replyFile,
      },
    });

    const reply = existsSync(replyFile) ? readFileSync(replyFile, 'utf8').trim() : '';
    if (reply === '') {
      const note = `agent wrote no reply (exit ${String(invoked.status ?? -1)})`;
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
      });
    } catch {
      /* learning is additive, never load-bearing */
    }

    return { handled: true, jobId: job.id, outcome: 'done' };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run until stopped: poll → runJobsOnce → sleep(pollMs). SIGINT exits cleanly. */
export async function jobsLoop(
  options: JobsRunnerOptions & { pollMs?: number; once?: boolean },
): Promise<void> {
  let stopped = false;
  let wake: (() => void) | undefined;
  const onSigint = (): void => {
    stopped = true;
    wake?.();
  };
  process.once('SIGINT', onSigint);
  try {
    for (;;) {
      const result = await runJobsOnce(options);
      if (options.once === true || stopped) return;
      if (!result.handled) {
        await new Promise<void>((resolveSleep) => {
          wake = resolveSleep;
          setTimeout(resolveSleep, options.pollMs ?? 15_000);
        });
        wake = undefined;
        if (stopped) return;
      }
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}
