/**
 * Phase 3 collaboration commands (roadmap §5) + the advisor bots — pure
 * functions over the typed contracts client, same shape as commands/index.ts.
 *
 * The advisor bots are the "agentify WITHOUT touching the spine" pattern
 * (thesis §5): deterministic read + post, NO LLM, NO lifecycle mutation.
 * They run under whatever token the caller holds and only need the right to
 * post into an open thread — the audit trail shows zero gates, zero
 * transitions from them.
 */
import type { OahsClient } from '@oahs/contracts';
import type {
  AgentJob,
  DivergenceReport,
  Message,
  Mention,
  Notification,
  Thread,
  ThreadKind,
  ThreadVisibility,
  WorkItem,
} from '@oahs/core';

import { renderTable } from '../format.js';

const THREAD_KINDS = ['spec', 'design', 'task', 'general', 'private'] as const;
const VISIBILITIES = ['open', 'private'] as const;
const JOB_STATUSES = ['queued', 'in_progress', 'done', 'blocked'] as const;

function assertThreadKind(kind: string): asserts kind is ThreadKind {
  if (!(THREAD_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`invalid --kind "${kind}" (expected ${THREAD_KINDS.join(' | ')})`);
  }
}

function assertVisibility(visibility: string): asserts visibility is ThreadVisibility {
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw new Error(`invalid --visibility "${visibility}" (expected ${VISIBILITIES.join(' | ')})`);
  }
}

// ---------------------------------------------------------------------------
// thread create / list
// ---------------------------------------------------------------------------

export interface ThreadCreateOptions {
  kind: string;
  featureId?: string;
  workItemId?: string;
  visibility?: string;
}

export async function threadCreateCommand(
  client: OahsClient,
  opts: ThreadCreateOptions,
): Promise<string> {
  assertThreadKind(opts.kind);
  if (opts.visibility !== undefined) assertVisibility(opts.visibility);
  const thread = await client.call<Thread>('create_thread', {
    kind: opts.kind,
    ...(opts.featureId !== undefined ? { featureId: opts.featureId } : {}),
    ...(opts.workItemId !== undefined ? { workItemId: opts.workItemId } : {}),
    ...(opts.visibility !== undefined ? { visibility: opts.visibility } : {}),
  });
  return [
    `threadId: ${thread.id}`,
    `kind: ${thread.kind}`,
    `visibility: ${thread.visibility}`,
    `featureId: ${thread.featureId ?? '-'}`,
    `workItemId: ${thread.workItemId ?? '-'}`,
  ].join('\n');
}

export interface ThreadListOptions {
  featureId?: string;
  workItemId?: string;
}

export async function threadListCommand(
  client: OahsClient,
  opts: ThreadListOptions = {},
): Promise<string> {
  const threads = await client.call<Thread[]>('list_threads', {
    ...(opts.featureId !== undefined ? { featureId: opts.featureId } : {}),
    ...(opts.workItemId !== undefined ? { workItemId: opts.workItemId } : {}),
  });
  return renderTable(
    ['id', 'kind', 'visibility', 'featureId', 'workItemId', 'createdBy'],
    threads.map((t) => [t.id, t.kind, t.visibility, t.featureId, t.workItemId, t.createdBy]),
  );
}

// ---------------------------------------------------------------------------
// post / messages
// ---------------------------------------------------------------------------

export interface PostOptions {
  threadId: string;
  body: string;
  /** STRUCTURED mentions — actor ids, never parsed from the body (§5.2). */
  mentions?: string[];
  replyTo?: string;
}

export async function postCommand(client: OahsClient, opts: PostOptions): Promise<string> {
  const message = await client.call<Message>('post_message', {
    threadId: opts.threadId,
    body: opts.body,
    ...(opts.replyTo !== undefined ? { replyTo: opts.replyTo } : {}),
    ...(opts.mentions !== undefined && opts.mentions.length > 0 ? { mentions: opts.mentions } : {}),
  });
  const lines = [`posted #${message.seq} (${message.id}) to ${message.threadId}`];
  if (opts.mentions !== undefined && opts.mentions.length > 0) {
    const mentions = await client.call<Mention[]>('list_mentions', { messageId: message.id });
    for (const mention of mentions) {
      lines.push(`mention ${mention.mentionedActorId}: ${mention.resolution}`);
    }
  }
  return lines.join('\n');
}

export interface MessagesOptions {
  threadId: string;
  sinceSeq?: number;
}

export async function messagesCommand(client: OahsClient, opts: MessagesOptions): Promise<string> {
  const messages = await client.call<Message[]>('list_messages', {
    threadId: opts.threadId,
    ...(opts.sinceSeq !== undefined ? { sinceSeq: opts.sinceSeq } : {}),
  });
  // authorId is rendered RAW — the CLI has no actor directory and needs none.
  return renderTable(
    ['seq', 'kind', 'authorId', 'body'],
    messages.map((m) => [m.seq, m.kind, m.authorId, m.body]),
  );
}

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export interface NotificationsOptions {
  unreadOnly?: boolean;
}

export async function notificationsCommand(
  client: OahsClient,
  opts: NotificationsOptions = {},
): Promise<string> {
  const notifications = await client.call<Notification[]>('list_notifications', {
    ...(opts.unreadOnly === true ? { unreadOnly: true } : {}),
  });
  return renderTable(
    ['id', 'source', 'refId', 'read'],
    notifications.map((n) => [n.id, n.source, n.refId, n.read]),
  );
}

// ---------------------------------------------------------------------------
// agent jobs
// ---------------------------------------------------------------------------

export interface JobsOptions {
  agentActorId?: string;
  status?: string;
}

export async function jobsCommand(client: OahsClient, opts: JobsOptions = {}): Promise<string> {
  if (opts.status !== undefined && !(JOB_STATUSES as readonly string[]).includes(opts.status)) {
    throw new Error(`invalid --status "${opts.status}" (expected ${JOB_STATUSES.join(' | ')})`);
  }
  const jobs = await client.call<AgentJob[]>('list_agent_jobs', {
    ...(opts.agentActorId !== undefined ? { agentActorId: opts.agentActorId } : {}),
    ...(opts.status !== undefined ? { status: opts.status } : {}),
  });
  return renderTable(
    ['id', 'agentActorId', 'status', 'claimedBy', 'reviewRound', 'threadId', 'workItemId', 'depth', 'note'],
    jobs.map((j) => [
      j.id,
      j.agentActorId,
      j.status,
      j.claimedBy,
      j.reviewRound,
      j.threadId,
      j.workItemId,
      j.depth,
      j.note,
    ]),
  );
}

export interface JobCompleteOptions {
  jobId: string;
  status: 'done' | 'blocked';
  note?: string;
}

export async function jobCompleteCommand(
  client: OahsClient,
  opts: JobCompleteOptions,
): Promise<string> {
  const job = await client.call<AgentJob>('complete_agent_job', {
    jobId: opts.jobId,
    status: opts.status,
    ...(opts.note !== undefined ? { note: opts.note } : {}),
  });
  return [`job ${job.id}: ${job.status}`, `note: ${job.note ?? '-'}`].join('\n');
}

// ---------------------------------------------------------------------------
// advisor bots — deterministic read + post, NO LLM, NO lifecycle authority
// ---------------------------------------------------------------------------

export interface AdviseNextTaskOptions {
  threadId: string;
}

/**
 * `oahs advise next-task`: reads the claimable ready_for_dev queue (rails
 * enforce dependency order — an item only ever REACHES ready_for_dev when its
 * predecessors allow it) and posts a deterministic suggestion into the
 * thread. Read + post only.
 */
export async function adviseNextTaskCommand(
  client: OahsClient,
  opts: AdviseNextTaskOptions,
): Promise<string> {
  const items = await client.call<WorkItem[]>('list_work_items', {
    state: 'ready_for_dev',
    claimable: true,
  });
  const ordered = [...items].sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  const body =
    ordered.length === 0
      ? 'advisor(next-task): no claimable ready_for_dev items right now.'
      : [
          'advisor(next-task): suggested claim order (claimable ready_for_dev):',
          ...ordered.map((item, i) => `${i + 1}. ${item.externalKey} — ${item.title} (${item.id})`),
        ].join('\n');
  const message = await client.call<Message>('post_message', {
    threadId: opts.threadId,
    body,
  });
  return [`advised in #${message.seq} (${message.id})`, body].join('\n');
}

export interface AdviseReconcileOptions {
  threadId: string;
  /** Repeated `--file <workItemId>=<frontmatterStatus>` pairs. */
  files: string[];
}

/**
 * `oahs advise reconcile`: runs the DETECT-ONLY reconcile query over the
 * given frontmatter statuses and posts the divergence report into the
 * thread. Never mutates anything (roadmap §1.6 / D6).
 */
export async function adviseReconcileCommand(
  client: OahsClient,
  opts: AdviseReconcileOptions,
): Promise<string> {
  if (opts.files.length === 0) {
    throw new Error('nothing to reconcile: pass at least one --file <workItemId>=<status>');
  }
  const files = opts.files.map((pair) => {
    const eq = pair.indexOf('=');
    if (eq <= 0 || eq === pair.length - 1) {
      throw new Error(`invalid --file "${pair}" (expected <workItemId>=<status>)`);
    }
    return { workItemId: pair.slice(0, eq), frontmatterStatus: pair.slice(eq + 1) };
  });
  const reports = await client.call<DivergenceReport[]>('reconcile', { files });
  const body =
    reports.length === 0
      ? `advisor(reconcile): no divergence across ${files.length} file(s). (detect-only)`
      : [
          `advisor(reconcile): ${reports.length} divergence(s) detected (detect-only, nothing was changed):`,
          ...reports.map(
            (r) => `- ${r.workItemId}: file=${r.fileState} db=${r.dbState} → ${r.kind}`,
          ),
        ].join('\n');
  const message = await client.call<Message>('post_message', {
    threadId: opts.threadId,
    body,
  });
  return [`advised in #${message.seq} (${message.id})`, body].join('\n');
}
