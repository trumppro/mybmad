/**
 * Gate-holder command implementations — pure functions over the typed
 * contracts client: (client, opts) → output text. cli.ts only wires
 * commander onto these; tests call them directly against an in-process
 * spine-api. Every mutation goes through /rpc/<command>, never around it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { OahsClient } from '@oahs/contracts';
import {
  WORK_ITEM_STATES,
  type Actor,
  type Feature,
  type GateCode,
  type SpineEvent,
  type StoriesImportResult,
  type WorkItem,
} from '@oahs/core';

import { renderTable, type Cell } from '../format.js';

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

export async function statusCommand(client: OahsClient): Promise<string> {
  const items = await client.call<WorkItem[]>('list_work_items');
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
}

export async function actorCreateCommand(
  client: OahsClient,
  opts: ActorCreateOptions,
): Promise<string> {
  if (opts.type !== 'user' && opts.type !== 'agent') {
    throw new Error(`invalid --type "${opts.type}" (expected user | agent)`);
  }
  const created = await client.call<{ actor: Actor; token: string }>('create_actor', {
    type: opts.type,
    displayName: opts.name,
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

export async function featureCreateCommand(client: OahsClient): Promise<string> {
  const feature = await client.call<Feature>('create_feature');
  return [`featureId: ${feature.id}`, `state: ${feature.state}`].join('\n');
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
  return renderTable(
    ['seq', 'type', 'stream', 'actor'],
    events.map((event) => [
      event.globalSeq,
      event.type,
      `${event.streamType}/${event.streamId}#${event.streamSeq}`,
      event.actorId,
    ]),
  );
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
