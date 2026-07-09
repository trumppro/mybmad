/**
 * Phase 5 commands (roadmap §6): the learning teammate's OWN memory and the
 * review-convergence measuring stick — pure functions over the typed
 * contracts client, same shape as commands/index.ts.
 *
 * `oahs memory` reads only the caller-token's memories: the wire commands
 * carry NO actor parameter (owner-scoped by construction), so the CLI cannot
 * even express "show me another agent's memory".
 *
 * `oahs stats reviews` renders reviewLoopIteration per work item and per
 * kind — the deterministic number behind the §6 exit criterion "review
 * iterations improve week-over-week".
 */
import type { OahsClient } from '@oahs/contracts';
import type { AgentMemory, MemoryKind, WorkItem } from '@oahs/core';

import { renderTable } from '../format.js';

const MEMORY_KINDS = ['episodic', 'procedural', 'entity'] as const;

function assertMemoryKind(kind: string): asserts kind is MemoryKind {
  if (!(MEMORY_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`invalid --kind "${kind}" (expected ${MEMORY_KINDS.join(' | ')})`);
  }
}

// ---------------------------------------------------------------------------
// memory
// ---------------------------------------------------------------------------

export interface MemoryOptions {
  kind?: string;
  query?: string;
  /** Recall context: private-sourced memories surface only in their source thread (§6). */
  contextThreadId?: string;
}

export async function memoryCommand(client: OahsClient, opts: MemoryOptions = {}): Promise<string> {
  if (opts.kind !== undefined) assertMemoryKind(opts.kind);
  const memories = await client.call<AgentMemory[]>('search_agent_memory', {
    ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
    ...(opts.query !== undefined ? { query: opts.query } : {}),
    ...(opts.contextThreadId !== undefined ? { contextThreadId: opts.contextThreadId } : {}),
  });
  return [
    'your memories (owner-scoped — this token’s agent only):',
    renderTable(
      ['seq', 'kind', 'sourceThreadId', 'sourceVisibility', 'content'],
      memories.map((m) => [m.seq, m.kind, m.sourceThreadId, m.sourceVisibility, m.content]),
    ),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// stats reviews
// ---------------------------------------------------------------------------

interface KindStats {
  kind: string;
  done: number;
  totalLoops: number;
  maxLoops: number;
}

/**
 * `oahs stats reviews`: review-loop convergence per kind over done items,
 * plus every item's own loop count — comparable run over run, which is the
 * whole point of the metric.
 */
export async function statsReviewsCommand(client: OahsClient): Promise<string> {
  const items = await client.call<WorkItem[]>('list_work_items');
  const byKind = new Map<string, KindStats>();
  for (const item of items) {
    if (item.state !== 'done') continue;
    const stats = byKind.get(item.kind) ?? { kind: item.kind, done: 0, totalLoops: 0, maxLoops: 0 };
    stats.done += 1;
    stats.totalLoops += item.reviewLoopIteration;
    stats.maxLoops = Math.max(stats.maxLoops, item.reviewLoopIteration);
    byKind.set(item.kind, stats);
  }
  const kinds = [...byKind.values()].sort((a, b) => a.kind.localeCompare(b.kind));
  const sorted = [...items].sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  return [
    'review convergence by kind (done items — lower loops = better):',
    renderTable(
      ['kind', 'done', 'avgLoops', 'maxLoops'],
      kinds.map((s) => [s.kind, s.done, (s.totalLoops / s.done).toFixed(2), s.maxLoops]),
    ),
    '',
    'items:',
    renderTable(
      ['externalKey', 'kind', 'state', 'loops'],
      sorted.map((item) => [item.externalKey, item.kind, item.state, item.reviewLoopIteration]),
    ),
  ].join('\n');
}
